import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import {
  PlanError,
  addContacts,
  assignPlan,
  endSubscription,
  extendSubscription,
  getActiveRow,
  getFreePlan,
  getLatestSubscription,
  updateSubscription,
  type ChangeContext,
  type PaymentInput,
  type SubscriptionPatch,
} from "@/lib/server/plans";

type Body = {
  action?: string;
  /** One or many accounts (bulk). */
  accountIds?: string[];
  /** Or one specific plan row (edit from the account page). */
  subscriptionId?: string;
  reason?: string;
  params?: {
    planId?: string;
    startsAt?: string | null;
    expiresAt?: string | null;
    totalContacts?: number | null;
    dailyLimit?: number | null;
    price?: number | null;
    notes?: string | null;
    payment?: PaymentInput | null;
    days?: number;
    delta?: number;
    patch?: SubscriptionPatch;
  };
};

const ACTIONS = new Set(["assign", "renew_free", "extend", "set_end", "set_contacts", "add_contacts", "edit", "cancel"]);
const MAX_BATCH = 500;

/**
 * Change member plans — the same rules for one account or many.
 *   assign        give a plan (ends the current one)   params: planId, startsAt?, expiresAt?, totalContacts?, dailyLimit?, price?, notes?, payment? (single only)
 *   renew_free    give the Free plan again
 *   extend        add days (from end date, or today if ended)   params: days
 *   set_end       set the end date                    params: expiresAt
 *   set_contacts  set total and/or daily contacts      params: totalContacts?, dailyLimit?  (null = unlimited)
 *   add_contacts  add/remove contacts                  params: delta
 *   edit          edit one plan row                     subscriptionId + params.patch
 *   cancel        end the active plan now
 * Every item is logged in subscription_events with the reason (and batch id for bulk).
 */
export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const body = (await req.json().catch(() => ({}))) as Body;
  const action = String(body.action || "");
  if (!ACTIONS.has(action)) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  const accountIds = [...new Set((body.accountIds || []).filter(Boolean))];
  const single = !!body.subscriptionId || accountIds.length === 1;
  if (!body.subscriptionId && accountIds.length === 0) return NextResponse.json({ error: "Choose at least one account" }, { status: 400 });
  if (accountIds.length > MAX_BATCH) return NextResponse.json({ error: `At most ${MAX_BATCH} accounts at a time` }, { status: 400 });

  const reason = (body.reason || "").trim() || (action === "assign" && single ? "Plan assigned" : "");
  if (!reason) return NextResponse.json({ error: "Please add a reason — every plan change is logged" }, { status: 400 });
  const p = body.params || {};
  if (p.payment && !single) return NextResponse.json({ error: "Payments are recorded one account at a time" }, { status: 400 });

  const admin = createSupabaseAdmin();
  const batchId = single ? null : randomUUID();
  const ctx: ChangeContext = { actorId: auth.userId, reason, batchId };

  let planId = p.planId;
  if (action === "renew_free") {
    const free = await getFreePlan(admin);
    if (!free) return NextResponse.json({ error: "No Free plan is set up" }, { status: 400 });
    planId = free.id;
  }
  if ((action === "assign" || action === "renew_free") && !planId) return NextResponse.json({ error: "Choose a plan" }, { status: 400 });

  /** Apply the action to one account (or the given subscription). */
  const run = async (accountId: string | null) => {
    if (action === "assign" || action === "renew_free") {
      const r = await assignPlan(
        admin,
        {
          accountId: accountId!,
          planId: planId!,
          startsAt: p.startsAt,
          expiresAt: p.expiresAt,
          totalContacts: action === "assign" ? p.totalContacts : undefined,
          dailyLimit: action === "assign" ? p.dailyLimit : undefined,
          price: action === "assign" ? p.price : undefined,
          notes: p.notes,
          source: single ? "admin" : "bulk",
          payment: p.payment || null,
        },
        ctx
      );
      return r.subscription.id;
    }
    const sub = body.subscriptionId
      ? { id: body.subscriptionId }
      : action === "cancel"
        ? await getActiveRow(admin, accountId!)
        : await getLatestSubscription(admin, accountId!);
    if (!sub) throw new PlanError(action === "cancel" ? "No active plan to cancel" : "No plan yet — assign one first");
    switch (action) {
      case "extend":
        return (await extendSubscription(admin, sub.id, Number(p.days), ctx)).id;
      case "set_end":
        if (!p.expiresAt) throw new PlanError("Choose the new end date");
        return (await updateSubscription(admin, sub.id, { expiresAt: p.expiresAt }, ctx)).id;
      case "set_contacts": {
        const patch: SubscriptionPatch = {};
        if (p.totalContacts !== undefined) patch.totalContacts = p.totalContacts;
        if (p.dailyLimit !== undefined) patch.dailyLimit = p.dailyLimit;
        if (Object.keys(patch).length === 0) throw new PlanError("Nothing to change");
        return (await updateSubscription(admin, sub.id, patch, ctx)).id;
      }
      case "add_contacts":
        return (await addContacts(admin, sub.id, Number(p.delta), ctx)).id;
      case "edit":
        return (await updateSubscription(admin, sub.id, p.patch || {}, ctx)).id;
      case "cancel":
        return (await endSubscription(admin, sub.id, ctx, "cancelled")).id;
    }
    throw new PlanError("Unknown action");
  };

  const targets: (string | null)[] = body.subscriptionId ? [null] : accountIds;
  const results: { accountId: string | null; ok: boolean; subscriptionId?: string; error?: string }[] = [];
  // Sequential on purpose: each item replaces/updates rows for one account and
  // writes history; order keeps the log readable and avoids lock contention.
  for (const accountId of targets) {
    try {
      const subscriptionId = await run(accountId);
      results.push({ accountId, ok: true, subscriptionId });
    } catch (e) {
      results.push({ accountId, ok: false, error: e instanceof Error ? e.message : "Failed" });
    }
  }
  const succeeded = results.filter((r) => r.ok).length;

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.plan_change",
    entityType: "account",
    entityId: body.subscriptionId || (accountIds.length === 1 ? accountIds[0] : `batch:${batchId}`),
    afterJson: { action, params: { ...p, payment: p.payment ? { amount: p.payment.amount } : undefined }, succeeded, failed: results.length - succeeded },
    meta: { reason, batchId, accounts: accountIds.length },
  });

  if (single) {
    const r = results[0];
    if (!r.ok) return NextResponse.json({ error: r.error, results }, { status: 400 });
  }
  return NextResponse.json({ ok: succeeded > 0, batchId, succeeded, failed: results.length - succeeded, results });
}
