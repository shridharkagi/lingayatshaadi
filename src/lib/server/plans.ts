/**
 * Account plans — the ONE place that reads or changes member plans and
 * payments. Admin screens (single + bulk), profile approval (Free plan),
 * contact reveal and a future payment gateway all call these functions.
 *
 * Model (see supabase/migrations/20261123_08_account_plans.sql):
 *  - user_subscriptions.user_id is the LOGIN ACCOUNT (auth.users id).
 *  - At most one row per account has status 'active' (unique index).
 *  - The *_snapshot columns are the member's own, editable plan values.
 *    Contact limits: null = unlimited, 0 = none.
 *  - "Expired" is derived from expires_at; stored status is only changed
 *    when a plan is ended, replaced, cancelled or refunded.
 *  - Every change writes a subscription_events row (who/when/before/after/
 *    reason/batch). Nothing is hard-deleted.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

type Admin = SupabaseClient;
type Row = Record<string, unknown>;

export const FREE_PLAN_CODE = "free";
const DAY_MS = 86_400_000;
const EXPIRING_SOON_DAYS = 7;

export type SubscriptionRow = {
  id: string;
  user_id: string;
  plan_id: string | null;
  plan_code: string | null;
  plan_name_snapshot: string | null;
  price_snapshot: number | null;
  currency_snapshot: string | null;
  duration_days_snapshot: number | null;
  total_contact_views_snapshot: number | null;
  daily_contact_view_limit_snapshot: number | null;
  starts_at: string;
  expires_at: string;
  status: "active" | "expired" | "cancelled" | "refunded";
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  created_by: string | null;
  ended_at: string | null;
  ended_by: string | null;
  end_reason: string | null;
};

export type PlanTemplate = {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  duration_days: number;
  total_contact_views: number | null;
  daily_contact_view_limit: number | null;
  is_active: boolean;
  archived_at: string | null;
  sort_order: number;
  features: unknown;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider: string;
  external_txn_id: string | null;
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  payment_mode: string | null;
  payment_mode_details: string | null;
  payer_source: string | null;
  refunded_amount: number;
  refunded_at: string | null;
  refund_reason: string | null;
  refund_mode: string | null;
  notes: string | null;
  created_at: string;
};

export type EffectiveStatus = "active" | "expiring" | "upcoming" | "expired" | "cancelled" | "refunded";

/** Who is acting, why, and (for bulk) which batch. */
export type ChangeContext = { actorId: string | null; reason: string; batchId?: string | null };

export class PlanError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

export function effectiveStatus(row: Pick<SubscriptionRow, "status" | "starts_at" | "expires_at">, now = new Date()): EffectiveStatus {
  if (row.status === "cancelled" || row.status === "refunded") return row.status;
  const t = now.getTime();
  const end = new Date(row.expires_at).getTime();
  if (row.status === "expired" || end < t) return "expired";
  if (new Date(row.starts_at).getTime() > t) return "upcoming";
  if (end - t <= EXPIRING_SOON_DAYS * DAY_MS) return "expiring";
  return "active";
}

/** True when the plan currently grants access (active, started, not ended). */
export function isUsable(row: SubscriptionRow | null | undefined, now = new Date()): row is SubscriptionRow {
  if (!row || row.status !== "active") return false;
  const t = now.getTime();
  return new Date(row.starts_at).getTime() <= t && new Date(row.expires_at).getTime() >= t;
}

/** Start of today in IST, as a UTC ISO string (daily limits reset 00:00 IST). */
export function istDayStartUtc(now = new Date()): string {
  const off = 5.5 * 3600 * 1000;
  const ist = new Date(now.getTime() + off);
  return new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()) - off).toISOString();
}

function normLimit(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n) || n < 0) throw new PlanError("Contact limits must be 0 or more (leave empty for unlimited)");
  return n;
}

function money(v: unknown, label = "Amount"): number {
  const n = Math.round(Number(v) * 100) / 100;
  if (!Number.isFinite(n) || n < 0) throw new PlanError(`${label} must be 0 or more`);
  return n;
}

function isoDate(v: unknown, label: string): string {
  const d = new Date(String(v));
  if (!v || Number.isNaN(d.getTime())) throw new PlanError(`${label} is not a valid date`);
  return d.toISOString();
}

/** Only the keys whose values changed — keeps history rows readable. */
function diff(before: Row, after: Row): { before: Row; after: Row } {
  const b: Row = {};
  const a: Row = {};
  for (const k of Object.keys(after)) {
    if (JSON.stringify(before[k] ?? null) !== JSON.stringify(after[k] ?? null)) {
      b[k] = before[k] ?? null;
      a[k] = after[k] ?? null;
    }
  }
  return { before: b, after: a };
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function logPlanEvent(
  admin: Admin,
  e: {
    userId?: string | null;
    subscriptionId?: string | null;
    paymentId?: string | null;
    planId?: string | null;
    action: string;
    before?: Row | null;
    after?: Row | null;
  },
  ctx: ChangeContext
) {
  const { error } = await admin.from("subscription_events").insert({
    user_id: e.userId ?? null,
    subscription_id: e.subscriptionId ?? null,
    payment_id: e.paymentId ?? null,
    plan_id: e.planId ?? null,
    action: e.action,
    reason: ctx.reason || null,
    before_json: e.before ?? null,
    after_json: e.after ?? null,
    actor_user_id: ctx.actorId,
    batch_id: ctx.batchId ?? null,
  });
  // History is part of the contract: surface failures instead of hiding them.
  if (error) throw new PlanError(`Change saved but history could not be written: ${error.message}`, 500);
}

export async function getPlanTemplate(admin: Admin, planId: string): Promise<PlanTemplate> {
  const { data, error } = await admin.from("subscription_plans").select("*").eq("id", planId).maybeSingle();
  if (error) throw new PlanError(error.message, 500);
  if (!data) throw new PlanError("Plan not found", 404);
  return data as PlanTemplate;
}

export async function getFreePlan(admin: Admin): Promise<PlanTemplate | null> {
  const { data } = await admin.from("subscription_plans").select("*").eq("code", FREE_PLAN_CODE).maybeSingle();
  return (data as PlanTemplate | null) ?? null;
}

async function getSubscription(admin: Admin, subscriptionId: string): Promise<SubscriptionRow> {
  const { data, error } = await admin.from("user_subscriptions").select("*").eq("id", subscriptionId).maybeSingle();
  if (error) throw new PlanError(error.message, 500);
  if (!data) throw new PlanError("Plan not found", 404);
  return data as SubscriptionRow;
}

/** The account's single 'active' row (may be past its end date until replaced). */
export async function getActiveRow(admin: Admin, accountId: string): Promise<SubscriptionRow | null> {
  const { data, error } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", accountId)
    .eq("status", "active")
    .order("expires_at", { ascending: false })
    .limit(1);
  if (error) throw new PlanError(error.message, 500);
  return ((data || [])[0] as SubscriptionRow | undefined) ?? null;
}

/** Active row if any, otherwise the most recent plan (for edits/extends). */
export async function getLatestSubscription(admin: Admin, accountId: string): Promise<SubscriptionRow | null> {
  const active = await getActiveRow(admin, accountId);
  if (active) return active;
  const { data } = await admin
    .from("user_subscriptions")
    .select("*")
    .eq("user_id", accountId)
    .order("expires_at", { ascending: false })
    .limit(1);
  return ((data || [])[0] as SubscriptionRow | undefined) ?? null;
}

/** All profile ids of an account, including deleted ones (their views still count). */
export async function accountProfileIds(admin: Admin, accountId: string): Promise<string[]> {
  const { data } = await admin.from("profiles").select("id").eq("user_id", accountId).limit(50);
  return ((data || []) as Row[]).map((r) => String(r.id));
}

export type Usage = { totalUsed: number; todayUsed: number };

/** Contacts revealed by any of the account's profiles within the plan period. */
export async function getUsage(
  admin: Admin,
  sub: Pick<SubscriptionRow, "user_id" | "starts_at" | "expires_at">,
  profileIds?: string[],
  now = new Date()
): Promise<Usage> {
  const ids = profileIds ?? (await accountProfileIds(admin, sub.user_id));
  if (ids.length === 0) return { totalUsed: 0, todayUsed: 0 };
  const dayStart = istDayStartUtc(now);
  const todayFrom = dayStart > sub.starts_at ? dayStart : sub.starts_at;
  const [total, today] = await Promise.all([
    admin
      .from("contact_views")
      .select("id", { count: "exact", head: true })
      .in("viewer_id", ids)
      .gte("viewed_at", sub.starts_at)
      .lte("viewed_at", sub.expires_at),
    admin
      .from("contact_views")
      .select("id", { count: "exact", head: true })
      .in("viewer_id", ids)
      .gte("viewed_at", todayFrom)
      .lte("viewed_at", sub.expires_at),
  ]);
  return { totalUsed: total.count || 0, todayUsed: today.count || 0 };
}

export type AccountAccess = {
  subscription: SubscriptionRow | null;
  usable: boolean;
  totalLimit: number | null;
  dailyLimit: number | null;
  usage: Usage;
};

/** What the account may do right now (used by contact reveal + member UI). */
export async function getAccountAccess(admin: Admin, accountId: string, profileIds?: string[]): Promise<AccountAccess> {
  const sub = await getActiveRow(admin, accountId);
  const usable = isUsable(sub);
  if (!usable || !sub) {
    return { subscription: sub, usable: false, totalLimit: null, dailyLimit: null, usage: { totalUsed: 0, todayUsed: 0 } };
  }
  const usage = await getUsage(admin, sub, profileIds);
  return {
    subscription: sub,
    usable: true,
    totalLimit: sub.total_contact_views_snapshot,
    dailyLimit: sub.daily_contact_view_limit_snapshot,
    usage,
  };
}

// ---------------------------------------------------------------------------
// Plan changes
// ---------------------------------------------------------------------------

export type PaymentInput = {
  amount: number;
  mode?: string | null;
  modeDetails?: string | null;
  transactionId?: string | null;
  payerSource?: string | null;
  paidAt?: string | null;
  notes?: string | null;
  provider?: string;
  allowDuplicateTxn?: boolean;
};

export type AssignInput = {
  accountId: string;
  planId: string;
  /** Default: now. May be backdated (offline payment made earlier). Not in the future. */
  startsAt?: string | null;
  /** Default: start + plan duration. */
  expiresAt?: string | null;
  /** undefined = take from the plan; null = unlimited. */
  totalContacts?: number | null;
  dailyLimit?: number | null;
  /** Agreed price for this member; default = plan price. */
  price?: number | null;
  notes?: string | null;
  source?: string;
  payment?: PaymentInput | null;
};

/**
 * Give an account a plan. Any current plan ends now ("replaced"). Optionally
 * records a payment against the new plan. Returns the new row.
 */
export async function assignPlan(admin: Admin, input: AssignInput, ctx: ChangeContext) {
  if (!input.accountId) throw new PlanError("Account is required");
  const plan = await getPlanTemplate(admin, input.planId);
  if (plan.archived_at) throw new PlanError(`${plan.name} is archived — restore it before assigning`);

  const now = new Date();
  const startsAt = input.startsAt ? isoDate(input.startsAt, "Start date") : now.toISOString();
  if (new Date(startsAt).getTime() > now.getTime() + 60_000) {
    throw new PlanError("Start date can't be in the future. To add time after the current plan, use Extend.");
  }
  const expiresAt = input.expiresAt
    ? isoDate(input.expiresAt, "End date")
    : new Date(new Date(startsAt).getTime() + Number(plan.duration_days || 0) * DAY_MS).toISOString();
  if (new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) throw new PlanError("End date must be after the start date");

  const total = input.totalContacts === undefined ? plan.total_contact_views : normLimit(input.totalContacts);
  const daily = input.dailyLimit === undefined ? plan.daily_contact_view_limit : normLimit(input.dailyLimit);
  const price = input.price === undefined || input.price === null ? Number(plan.price || 0) : money(input.price, "Price");

  // End the current plan first (one active row per account).
  const current = await getActiveRow(admin, input.accountId);
  if (current) {
    const endedStatus = new Date(current.expires_at).getTime() < now.getTime() ? "expired" : "cancelled";
    const patch = {
      status: endedStatus,
      ended_at: now.toISOString(),
      ended_by: ctx.actorId,
      end_reason: `Replaced by ${plan.name}`,
      updated_at: now.toISOString(),
    };
    const { error } = await admin.from("user_subscriptions").update(patch).eq("id", current.id).eq("status", "active");
    if (error) throw new PlanError(error.message, 500);
    await logPlanEvent(
      admin,
      { userId: input.accountId, subscriptionId: current.id, planId: current.plan_id, action: "replaced", before: { status: "active" }, after: { status: endedStatus, end_reason: patch.end_reason } },
      ctx
    );
  }

  const row = {
    user_id: input.accountId,
    plan_id: plan.id,
    plan_code: plan.code,
    plan_name_snapshot: plan.name,
    price_snapshot: price,
    currency_snapshot: plan.currency || "INR",
    duration_days_snapshot: Math.max(1, Math.round((new Date(expiresAt).getTime() - new Date(startsAt).getTime()) / DAY_MS)),
    total_contact_views_snapshot: total,
    daily_contact_view_limit_snapshot: daily,
    starts_at: startsAt,
    expires_at: expiresAt,
    status: "active",
    source: input.source || "admin",
    notes: input.notes?.trim() || null,
    created_by: ctx.actorId,
  };
  const { data: created, error: insErr } = await admin.from("user_subscriptions").insert(row).select("*").single();
  if (insErr || !created) {
    if (insErr?.code === "23505") throw new PlanError("This account already has an active plan (changed by someone else just now). Refresh and try again.", 409);
    throw new PlanError(insErr?.message || "Couldn't save the plan", 500);
  }
  const sub = created as SubscriptionRow;
  await logPlanEvent(admin, { userId: input.accountId, subscriptionId: sub.id, planId: plan.id, action: "assigned", after: row }, ctx);

  let payment: PaymentRow | null = null;
  if (input.payment && (Number(input.payment.amount) > 0 || input.payment.transactionId)) {
    payment = await recordPayment(admin, { ...input.payment, accountId: input.accountId, subscriptionId: sub.id }, ctx);
  }

  // A paid plan settles any open upgrade request for this account.
  if (price > 0) {
    await admin
      .from("subscription_upgrade_requests")
      .update({ status: "closed", admin_note: `Plan assigned: ${plan.name}`, updated_at: now.toISOString() })
      .eq("user_id", input.accountId)
      .in("status", ["new", "contacted"]);
  }

  await admin.from("notifications").insert({
    user_id: input.accountId,
    type: "general",
    title: "Plan activated",
    message: `Your ${plan.name} plan is active till ${new Date(expiresAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}.`,
    read: false,
  });

  return { subscription: sub, payment };
}

export type SubscriptionPatch = {
  startsAt?: string;
  expiresAt?: string;
  totalContacts?: number | null;
  dailyLimit?: number | null;
  price?: number;
  notes?: string | null;
};

/**
 * Edit a member's plan values (dates, contacts, price, note). Extending an
 * expired plan into the future makes it active again (if the account has no
 * other active plan).
 */
export async function updateSubscription(admin: Admin, subscriptionId: string, patch: SubscriptionPatch, ctx: ChangeContext) {
  const before = await getSubscription(admin, subscriptionId);
  if (before.status === "cancelled" || before.status === "refunded") {
    throw new PlanError(`This plan was ${before.status}. Assign a new plan instead.`);
  }
  const next: Row = {};
  if (patch.startsAt !== undefined) next.starts_at = isoDate(patch.startsAt, "Start date");
  if (patch.expiresAt !== undefined) next.expires_at = isoDate(patch.expiresAt, "End date");
  if (patch.totalContacts !== undefined) next.total_contact_views_snapshot = normLimit(patch.totalContacts);
  if (patch.dailyLimit !== undefined) next.daily_contact_view_limit_snapshot = normLimit(patch.dailyLimit);
  if (patch.price !== undefined) next.price_snapshot = money(patch.price, "Price");
  if (patch.notes !== undefined) next.notes = patch.notes?.trim() || null;

  const startsAt = String(next.starts_at ?? before.starts_at);
  const expiresAt = String(next.expires_at ?? before.expires_at);
  if (new Date(expiresAt).getTime() <= new Date(startsAt).getTime()) throw new PlanError("End date must be after the start date");
  if (next.starts_at !== undefined || next.expires_at !== undefined) {
    next.duration_days_snapshot = Math.max(1, Math.round((new Date(expiresAt).getTime() - new Date(startsAt).getTime()) / DAY_MS));
  }

  const now = Date.now();
  if (before.status === "expired" && new Date(expiresAt).getTime() > now) {
    const other = await getActiveRow(admin, before.user_id);
    if (other && other.id !== before.id) {
      throw new PlanError(`The account already has an active plan (${other.plan_name_snapshot || "Plan"}). Edit that one instead.`);
    }
    next.status = "active";
    next.ended_at = null;
    next.end_reason = null;
  }

  const { before: b, after: a } = diff(before as unknown as Row, next);
  if (Object.keys(a).length === 0) return before;
  a.updated_at = new Date().toISOString();
  const { data, error } = await admin.from("user_subscriptions").update(a).eq("id", subscriptionId).select("*").single();
  if (error) {
    if (error.code === "23505") throw new PlanError("The account already has an active plan.", 409);
    throw new PlanError(error.message, 500);
  }
  delete a.updated_at;
  await logPlanEvent(
    admin,
    { userId: before.user_id, subscriptionId, planId: before.plan_id, action: a.status === "active" ? "reactivated" : "updated", before: b, after: a },
    ctx
  );
  return data as SubscriptionRow;
}

/** Add days: from the current end date, or from today if it already ended. */
export async function extendSubscription(admin: Admin, subscriptionId: string, days: number, ctx: ChangeContext) {
  const d = Math.floor(Number(days));
  if (!Number.isFinite(d) || d === 0 || Math.abs(d) > 3650) throw new PlanError("Days must be a whole number between -3650 and 3650 (not 0)");
  const sub = await getSubscription(admin, subscriptionId);
  const base = Math.max(new Date(sub.expires_at).getTime(), d > 0 ? Date.now() : 0);
  return updateSubscription(admin, subscriptionId, { expiresAt: new Date(base + d * DAY_MS).toISOString() }, ctx);
}

/** Add (or remove) contacts on top of the current total. Unlimited stays unlimited. */
export async function addContacts(admin: Admin, subscriptionId: string, delta: number, ctx: ChangeContext) {
  const n = Math.floor(Number(delta));
  if (!Number.isFinite(n) || n === 0) throw new PlanError("Enter how many contacts to add (or a negative number to remove)");
  const sub = await getSubscription(admin, subscriptionId);
  if (sub.total_contact_views_snapshot === null) throw new PlanError("This plan already has unlimited contacts");
  return updateSubscription(admin, subscriptionId, { totalContacts: Math.max(0, sub.total_contact_views_snapshot + n) }, ctx);
}

/** End a plan now. status 'refunded' is used when money was returned. */
export async function endSubscription(
  admin: Admin,
  subscriptionId: string,
  ctx: ChangeContext,
  status: "cancelled" | "refunded" = "cancelled"
) {
  const before = await getSubscription(admin, subscriptionId);
  if (before.status === "cancelled" || before.status === "refunded") return before;
  const now = new Date().toISOString();
  const patch = { status, ended_at: now, ended_by: ctx.actorId, end_reason: ctx.reason || status, updated_at: now };
  const { data, error } = await admin.from("user_subscriptions").update(patch).eq("id", subscriptionId).select("*").single();
  if (error) throw new PlanError(error.message, 500);
  await logPlanEvent(
    admin,
    { userId: before.user_id, subscriptionId, planId: before.plan_id, action: status, before: { status: before.status, expires_at: before.expires_at }, after: { status } },
    ctx
  );
  return data as SubscriptionRow;
}

/**
 * Free plan on the account's FIRST approved profile. Once per account ever;
 * skipped while any plan is active. Never throws (approval must not fail).
 */
export async function grantFreeOnApproval(admin: Admin, accountId: string, actorId: string | null) {
  try {
    if (!accountId) return { granted: false, reason: "no account" };
    const { count } = await admin
      .from("user_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", accountId)
      .in("source", ["free_auto", "free_catchup"]);
    if ((count || 0) > 0) return { granted: false, reason: "already had Free" };
    if (await getActiveRow(admin, accountId)) return { granted: false, reason: "has a plan" };
    const free = await getFreePlan(admin);
    if (!free || free.archived_at) return { granted: false, reason: "no Free plan configured" };
    await assignPlan(admin, { accountId, planId: free.id, source: "free_auto" }, { actorId, reason: "First profile approved" });
    return { granted: true };
  } catch (e) {
    console.error("[plans] grantFreeOnApproval failed", e);
    return { granted: false, reason: e instanceof Error ? e.message : "error" };
  }
}

// ---------------------------------------------------------------------------
// Payments (offline today, gateway later — same records)
// ---------------------------------------------------------------------------

export async function recordPayment(
  admin: Admin,
  input: PaymentInput & { accountId: string; subscriptionId?: string | null },
  ctx: ChangeContext
): Promise<PaymentRow> {
  const amount = money(input.amount);
  const provider = input.provider || "manual";
  const txn = input.transactionId?.trim() || null;
  if (txn && !input.allowDuplicateTxn) {
    const { data: dup } = await admin
      .from("payment_transactions")
      .select("id, user_id, amount")
      .eq("external_txn_id", txn)
      .neq("status", "void")
      .limit(1);
    if (dup && dup.length) throw new PlanError(`Transaction ID ${txn} is already recorded (₹${Number((dup[0] as Row).amount || 0)}).`, 409);
  }
  if (input.subscriptionId) {
    const sub = await getSubscription(admin, input.subscriptionId);
    if (sub.user_id !== input.accountId) throw new PlanError("That plan belongs to another account");
  }
  const paidAt = input.paidAt ? isoDate(input.paidAt, "Payment date") : new Date().toISOString();
  const row = {
    user_id: input.accountId,
    subscription_id: input.subscriptionId || null,
    provider,
    external_txn_id: txn,
    amount,
    currency: "INR",
    status: "paid",
    paid_at: paidAt,
    payment_made_at: paidAt,
    payment_mode: input.mode || null,
    payment_mode_details: input.modeDetails?.trim() || null,
    payer_source: input.payerSource?.trim() || null,
    received_by: ctx.actorId,
    created_by: ctx.actorId,
    notes: input.notes?.trim() || null,
  };
  const { data, error } = await admin.from("payment_transactions").insert(row).select("*").single();
  if (error || !data) throw new PlanError(error?.message || "Couldn't record the payment", 500);
  const p = data as PaymentRow;
  await logPlanEvent(admin, { userId: input.accountId, subscriptionId: p.subscription_id, paymentId: p.id, action: "payment_recorded", after: row }, ctx);
  return p;
}

async function getPayment(admin: Admin, paymentId: string): Promise<PaymentRow> {
  const { data, error } = await admin.from("payment_transactions").select("*").eq("id", paymentId).maybeSingle();
  if (error) throw new PlanError(error.message, 500);
  if (!data) throw new PlanError("Payment not found", 404);
  return data as PaymentRow;
}

export type PaymentPatch = {
  amount?: number;
  mode?: string | null;
  modeDetails?: string | null;
  transactionId?: string | null;
  payerSource?: string | null;
  paidAt?: string;
  notes?: string | null;
};

export async function updatePayment(admin: Admin, paymentId: string, patch: PaymentPatch, ctx: ChangeContext) {
  const before = await getPayment(admin, paymentId);
  if (before.provider !== "manual") throw new PlanError("Gateway payments can't be edited by hand");
  if (before.status === "void") throw new PlanError("This payment was removed");
  const next: Row = {};
  if (patch.amount !== undefined) {
    next.amount = money(patch.amount);
    if (Number(next.amount) < Number(before.refunded_amount || 0)) throw new PlanError("Amount can't be less than what was already refunded");
  }
  if (patch.mode !== undefined) next.payment_mode = patch.mode || null;
  if (patch.modeDetails !== undefined) next.payment_mode_details = patch.modeDetails?.trim() || null;
  if (patch.transactionId !== undefined) next.external_txn_id = patch.transactionId?.trim() || null;
  if (patch.payerSource !== undefined) next.payer_source = patch.payerSource?.trim() || null;
  if (patch.paidAt !== undefined) {
    next.paid_at = isoDate(patch.paidAt, "Payment date");
    next.payment_made_at = next.paid_at;
  }
  if (patch.notes !== undefined) next.notes = patch.notes?.trim() || null;
  const { before: b, after: a } = diff(before as unknown as Row, next);
  if (Object.keys(a).length === 0) return before;
  const { data, error } = await admin
    .from("payment_transactions")
    .update({ ...a, updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .select("*")
    .single();
  if (error) throw new PlanError(error.message, 500);
  await logPlanEvent(admin, { userId: before.user_id, subscriptionId: before.subscription_id, paymentId, action: "payment_updated", before: b, after: a }, ctx);
  return data as PaymentRow;
}

/** Mark money returned (full or part). Optionally end the linked plan. */
export async function refundPayment(
  admin: Admin,
  paymentId: string,
  input: { amount?: number; refundedAt?: string; mode?: string | null; endPlan?: boolean },
  ctx: ChangeContext
) {
  if (!ctx.reason?.trim()) throw new PlanError("A reason is required for refunds");
  const before = await getPayment(admin, paymentId);
  if (before.status !== "paid" && before.status !== "refunded") throw new PlanError(`A ${before.status} payment can't be refunded`);
  const remaining = Number(before.amount) - Number(before.refunded_amount || 0);
  if (remaining <= 0) throw new PlanError("This payment is already fully refunded");
  const amount = input.amount === undefined ? remaining : money(input.amount, "Refund amount");
  if (amount <= 0 || amount > remaining + 0.001) throw new PlanError(`Refund must be between ₹1 and ₹${remaining}`);
  const refundedTotal = Math.round((Number(before.refunded_amount || 0) + amount) * 100) / 100;
  const full = refundedTotal >= Number(before.amount) - 0.001;
  const after = {
    refunded_amount: refundedTotal,
    refunded_at: input.refundedAt ? isoDate(input.refundedAt, "Refund date") : new Date().toISOString(),
    refund_reason: ctx.reason.trim(),
    refund_mode: input.mode || before.payment_mode,
    status: full ? "refunded" : "paid",
  };
  const { data, error } = await admin
    .from("payment_transactions")
    .update({ ...after, updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .select("*")
    .single();
  if (error) throw new PlanError(error.message, 500);
  await logPlanEvent(
    admin,
    {
      userId: before.user_id,
      subscriptionId: before.subscription_id,
      paymentId,
      action: "payment_refunded",
      before: { refunded_amount: before.refunded_amount, status: before.status },
      after: { ...after, refund_now: amount },
    },
    ctx
  );
  if (input.endPlan && before.subscription_id) {
    await endSubscription(admin, before.subscription_id, ctx, "refunded");
  }
  return data as PaymentRow;
}

/** Remove a payment entered by mistake (kept as 'void' for the record). */
export async function voidPayment(admin: Admin, paymentId: string, ctx: ChangeContext) {
  if (!ctx.reason?.trim()) throw new PlanError("A reason is required to remove a payment");
  const before = await getPayment(admin, paymentId);
  if (before.provider !== "manual") throw new PlanError("Gateway payments can't be removed by hand");
  if (Number(before.refunded_amount || 0) > 0) throw new PlanError("This payment has refunds recorded; it can't be removed");
  const { data, error } = await admin
    .from("payment_transactions")
    .update({ status: "void", notes: [before.notes, `Removed: ${ctx.reason.trim()}`].filter(Boolean).join(" · "), updated_at: new Date().toISOString() })
    .eq("id", paymentId)
    .select("*")
    .single();
  if (error) throw new PlanError(error.message, 500);
  await logPlanEvent(admin, { userId: before.user_id, subscriptionId: before.subscription_id, paymentId, action: "payment_removed", before: { status: before.status }, after: { status: "void" } }, ctx);
  return data as PaymentRow;
}

/** Net paid per subscription (paid minus refunded; void excluded). */
export function netPaid(payments: Pick<PaymentRow, "amount" | "refunded_amount" | "status">[]): number {
  return payments
    .filter((p) => p.status === "paid" || p.status === "refunded")
    .reduce((s, p) => s + Number(p.amount || 0) - Number(p.refunded_amount || 0), 0);
}

// ---------------------------------------------------------------------------
// Plan templates
// ---------------------------------------------------------------------------

export type TemplateInput = {
  name?: string;
  price?: number;
  durationDays?: number;
  totalContacts?: number | null;
  dailyLimit?: number | null;
  isActive?: boolean;
  sortOrder?: number;
};

function templateRow(input: TemplateInput): Row {
  const out: Row = {};
  if (input.name !== undefined) {
    const n = input.name.trim();
    if (!n) throw new PlanError("Plan name is required");
    out.name = n;
  }
  if (input.price !== undefined) out.price = money(input.price, "Price");
  if (input.durationDays !== undefined) {
    const d = Math.floor(Number(input.durationDays));
    if (!Number.isFinite(d) || d < 1 || d > 3650) throw new PlanError("Validity must be 1–3650 days");
    out.duration_days = d;
  }
  if (input.totalContacts !== undefined) out.total_contact_views = normLimit(input.totalContacts);
  if (input.dailyLimit !== undefined) out.daily_contact_view_limit = normLimit(input.dailyLimit);
  if (input.isActive !== undefined) out.is_active = !!input.isActive;
  if (input.sortOrder !== undefined) out.sort_order = Math.floor(Number(input.sortOrder) || 0);
  return out;
}

export async function createPlanTemplate(admin: Admin, input: TemplateInput & { code?: string }, ctx: ChangeContext) {
  const row = templateRow(input);
  if (!row.name || row.price === undefined || !row.duration_days) throw new PlanError("Name, price and validity are required");
  const code = (input.code || String(row.name)).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 32);
  if (!code) throw new PlanError("Plan code is required");
  const { data, error } = await admin
    .from("subscription_plans")
    .insert({ currency: "INR", features: [], is_active: false, ...row, code })
    .select("*")
    .single();
  if (error) throw new PlanError(error.code === "23505" ? `A plan with code "${code}" already exists` : error.message, error.code === "23505" ? 409 : 500);
  await logPlanEvent(admin, { planId: (data as Row).id as string, action: "template_created", after: { ...row, code } }, ctx);
  return data as PlanTemplate;
}

export async function updatePlanTemplate(admin: Admin, planId: string, input: TemplateInput, ctx: ChangeContext) {
  const before = await getPlanTemplate(admin, planId);
  const { before: b, after: a } = diff(before as unknown as Row, templateRow(input));
  if (Object.keys(a).length === 0) return before;
  const { data, error } = await admin
    .from("subscription_plans")
    .update({ ...a, updated_at: new Date().toISOString() })
    .eq("id", planId)
    .select("*")
    .single();
  if (error) throw new PlanError(error.message, 500);
  await logPlanEvent(admin, { planId, action: "template_updated", before: b, after: a }, ctx);
  return data as PlanTemplate;
}

export async function setPlanArchived(admin: Admin, planId: string, archived: boolean, ctx: ChangeContext) {
  const before = await getPlanTemplate(admin, planId);
  if (archived && before.code === FREE_PLAN_CODE) throw new PlanError("The Free plan can't be archived (new members get it on approval). Hide it from members instead.");
  const patch = archived ? { archived_at: new Date().toISOString(), is_active: false } : { archived_at: null };
  const { data, error } = await admin.from("subscription_plans").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", planId).select("*").single();
  if (error) throw new PlanError(error.message, 500);
  await logPlanEvent(admin, { planId, action: archived ? "template_archived" : "template_restored", before: { archived_at: before.archived_at }, after: patch }, ctx);
  return data as PlanTemplate;
}
