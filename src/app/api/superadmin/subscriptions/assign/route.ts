import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { logAdminAudit } from "@/lib/server/adminAudit";
import { listAllAuthUsers } from "@/lib/server/authUsers";

type PaymentMode = "phonepe" | "gpay" | "bank_transfer" | "check" | "other" | "cash" | "free_auto";

/** PostgREST / Supabase errors when the request references columns missing on the live table. */
function isSchemaMismatchError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("schema cache") ||
    (m.includes("could not find") && m.includes("column")) ||
    m.includes("does not exist") ||
    m.includes("unknown column")
  );
}

/** Legacy stacks often use membership_plans(id) while the admin UI reads subscription_plans. */
function isUserSubscriptionsPlanFkError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("user_subscriptions_plan_id_fkey") ||
    (m.includes("foreign key") && m.includes("user_subscriptions") && m.includes("plan_id"))
  );
}

function isUserSubscriptionsUserFkError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("user_subscriptions_user_id_fkey") ||
    (m.includes("foreign key") && m.includes("user_subscriptions") && m.includes("user_id"))
  );
}

function appendReplacementNote(existing: unknown, addedNote: string): string {
  const prev = String(existing || "").trim();
  if (!prev) return addedNote;
  if (prev.includes(addedNote)) return prev;
  return `${prev}\n${addedNote}`;
}

function isUserSubscriptionsNotesColumnError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return m.includes("column") && m.includes("notes") && m.includes("does not exist");
}

function syntheticProfileEmailFromPhone(phone: string): string {
  const digits10 = String(phone || "").replace(/\D/g, "").slice(-10);
  if (digits10.length === 10) return `phone_${digits10}@profile.lingayatbandhu`;
  return `user_${Date.now()}@profile.lingayatbandhu`;
}

type SubscriptionPlanRow = {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: number;
  currency: string;
  total_contact_views: number;
  daily_contact_view_limit: number;
};

function nearlyEqualPrice(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.02;
}

type LegacyPlanResolve = { legacyPlanId: string | null; membershipPlansRowCount: number };

async function resolveMembershipPlanIdForFk(
  admin: ReturnType<typeof createSupabaseAdmin>,
  plan: SubscriptionPlanRow
): Promise<LegacyPlanResolve> {
  const empty = (n: number): LegacyPlanResolve => ({ legacyPlanId: null, membershipPlansRowCount: n });

  const { data: rows, error } = await admin
    .from("membership_plans")
    .select("id, name, price, duration, is_free")
    .limit(300);

  if (error?.message?.match(/does not exist|schema cache|relation/i)) return empty(0);
  if (error) return empty(0);
  if (!rows?.length) return empty(0);

  type Legacy = {
    id: string;
    name?: string | null;
    price?: number | null;
    duration?: number | null;
    is_free?: boolean | null;
  };
  const list = rows as Legacy[];

  const price = Number(plan.price ?? 0);
  const nameCatalog = String(plan.name ?? "").trim().toLowerCase();
  const code = String(plan.code ?? "").toLowerCase();
  const targetDays = Number(plan.duration_days ?? 0);
  const targetMonths = Math.max(1, Math.round(targetDays / 30));

  if (price <= 0 || code === "free") {
    const row = list.find((r) => r.is_free === true || nearlyEqualPrice(Number(r.price ?? 0), 0));
    if (row) return { legacyPlanId: String(row.id), membershipPlansRowCount: list.length };
  }

  const exactPriceDuration = list.find((r) => {
    const d = Number(r.duration ?? 0);
    const p = Number(r.price ?? 0);
    if (!nearlyEqualPrice(p, price)) return false;
    return d === targetMonths || d === targetDays;
  });
  if (exactPriceDuration) return { legacyPlanId: String(exactPriceDuration.id), membershipPlansRowCount: list.length };

  const CODE_ALIASES: Record<string, string[]> = {
    gold: ["gold", "premium", "3m", "3 m"],
    platinum: ["platinum", "6m", "6 m"],
    diamond: ["diamond", "12m", "12 m", "annual", "year"],
    free: ["free"],
  };
  const hints = new Set(
    [code, nameCatalog, ...(CODE_ALIASES[code] ?? [])].filter((h): h is string => Boolean(h && h.length >= 1))
  );

  const scored = list
    .map((r) => {
      const nm = String(r.name ?? "").toLowerCase();
      const p = Number(r.price ?? 0);
      const d = Number(r.duration ?? 0);
      let s = 0;
      if (nearlyEqualPrice(p, price)) s += 100;
      if (d === targetMonths || d === targetDays) s += 80;
      else if (Math.abs(d - targetMonths) <= 1) s += 35;
      for (const h of hints) {
        if (h.length >= 2 && nm.includes(h)) s += 28;
      }
      if (nameCatalog && nm === nameCatalog) s += 85;
      else if (nameCatalog && (nm.includes(nameCatalog) || nameCatalog.includes(nm))) s += 45;
      return { id: r.id, s };
    })
    .sort((a, b) => b.s - a.s);

  const top = scored[0];
  if (top && top.s >= 100) return { legacyPlanId: String(top.id), membershipPlansRowCount: list.length };

  const byPriceOnly = list.filter((r) => nearlyEqualPrice(Number(r.price ?? 0), price));
  if (byPriceOnly.length === 1) {
    return { legacyPlanId: String(byPriceOnly[0].id), membershipPlansRowCount: list.length };
  }

  if (top && top.s >= 55) return { legacyPlanId: String(top.id), membershipPlansRowCount: list.length };

  return { legacyPlanId: null, membershipPlansRowCount: list.length };
}

async function ensureShadowProfileForLegacySubscriptionFk(
  admin: ReturnType<typeof createSupabaseAdmin>,
  authUserId: string
): Promise<string | null> {
  const userId = String(authUserId || "").trim();
  if (!userId) return null;

  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const existingId = String((existing as { id?: string } | null)?.id || "").trim();
  if (existingId) return existingId;

  let fullName = "Account Holder";
  let email = "";
  let contact = "";
  try {
    const { data: authLookup } = await admin.auth.admin.getUserById(userId);
    const u = authLookup?.user;
    fullName =
      String((u?.user_metadata?.full_name as string) || "").trim() ||
      [
        String((u?.user_metadata?.first_name as string) || "").trim(),
        String((u?.user_metadata?.last_name as string) || "").trim(),
      ]
        .filter(Boolean)
        .join(" ")
        .trim() ||
      "Account Holder";
    email =
      String(u?.email || "").trim() ||
      syntheticProfileEmailFromPhone(String(u?.phone || ""));
    contact = String(u?.phone || "").trim();
  } catch {
    email = syntheticProfileEmailFromPhone("");
  }

  const nowIso = new Date().toISOString();
  const payloadWithSoftDelete = {
    user_id: userId,
    email,
    full_name: fullName,
    date_of_birth: "1990-01-01",
    gender: "other",
    managed_by: "self",
    role: "user",
    profile_status: "pending",
    profile_type: "free",
    country: "India",
    contact: contact || null,
    account_holder_name: fullName,
    about_me_visible: false,
    deleted_at: nowIso,
    deleted_reason: "auto_shadow_for_subscription_fk",
    moderation_status: "draft",
    updated_at: nowIso,
  };
  const payloadMinimal = {
    user_id: userId,
    email,
    full_name: fullName,
    date_of_birth: "1990-01-01",
    gender: "other",
    managed_by: "self",
    role: "user",
    country: "India",
    contact: contact || null,
    account_holder_name: fullName,
    about_me_visible: false,
    updated_at: nowIso,
  };

  let ins = await admin.from("profiles").insert(payloadWithSoftDelete).select("id").single();
  if (ins.error && isSchemaMismatchError(ins.error.message)) {
    ins = await admin.from("profiles").insert(payloadMinimal).select("id").single();
  }
  if (ins.error) return null;
  return String((ins.data as { id?: string } | null)?.id || "").trim() || null;
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = (await req.json()) as {
    userId?: string;
    profileId?: string;
    planId?: string;
    startsAt?: string;
    expiresAt?: string;
    amount?: number;
    paymentMode?: PaymentMode;
    paymentModeDetails?: string;
    transactionId?: string;
    payerSource?: string;
    paymentMadeAt?: string;
    receiptRef?: string;
    note?: string;
    startImmediately?: boolean;
    overrideTotalContactViews?: number;
    overrideDailyContactViewLimit?: number;
  };
  if (!body.userId || !body.planId) {
    return NextResponse.json(
      { error: "userId and planId are required" },
      { status: 400 }
    );
  }

  const admin = createSupabaseAdmin();
  let normalizedUserId = String(body.userId || "").trim();
  const accountCodeCandidate = normalizedUserId.toUpperCase();
  if (/^U\d{4,}$/.test(accountCodeCandidate)) {
    const { data: codeRow } = await admin
      .from("user_account_codes")
      .select("user_id")
      .eq("account_code", accountCodeCandidate)
      .maybeSingle();
    const mappedUserId = String((codeRow as { user_id?: string } | null)?.user_id || "").trim();
    if (mappedUserId) normalizedUserId = mappedUserId;
    if (!mappedUserId) {
      const { data: codeRows } = await admin
        .from("user_account_codes")
        .select("user_id, account_code")
        .ilike("account_code", `${accountCodeCandidate}%`)
        .limit(3);
      const uniqueUsers = Array.from(
        new Set(
          (codeRows || [])
            .map((r) => String((r as { user_id?: string }).user_id || "").trim())
            .filter(Boolean)
        )
      );
      if (uniqueUsers.length === 1) normalizedUserId = uniqueUsers[0];
    }
  }
  if (body.profileId) {
    const { data: ownerRow } = await admin
      .from("profiles")
      .select("user_id")
      .eq("id", String(body.profileId || ""))
      .maybeSingle();
    const ownerUserId = String((ownerRow as { user_id?: string } | null)?.user_id || "").trim();
    if (ownerUserId) normalizedUserId = ownerUserId;
  } else if (normalizedUserId) {
    const { data: ownerRow } = await admin
      .from("profiles")
      .select("user_id")
      .eq("id", normalizedUserId)
      .maybeSingle();
    const ownerUserId = String((ownerRow as { user_id?: string } | null)?.user_id || "").trim();
    if (ownerUserId) normalizedUserId = ownerUserId;
  }
  if (!normalizedUserId) {
    return NextResponse.json({ error: "Could not resolve a valid account owner for this assignment." }, { status: 400 });
  }
  try {
    const { data: authLookup, error: authLookupErr } = await admin.auth.admin.getUserById(normalizedUserId);
    if (authLookupErr || !authLookup?.user?.id) {
      const allUsers = await listAllAuthUsers(admin);
      const exists = allUsers.some((u) => u.id === normalizedUserId);
      if (!exists) {
        return NextResponse.json(
          { error: "Could not map this input to a valid account owner. Please search and select the member again." },
          { status: 400 }
        );
      }
    }
  } catch {
    const allUsers = await listAllAuthUsers(admin);
    const exists = allUsers.some((u) => u.id === normalizedUserId);
    if (!exists) {
      return NextResponse.json(
        { error: "Could not map this input to a valid account owner. Please search and select the member again." },
        { status: 400 }
      );
    }
  }
  const now = new Date().toISOString();
  const startImmediately = body.startImmediately ?? true;

  const { data: plan, error: planError } = await admin
    .from("subscription_plans")
    .select("id, code, name, duration_days, price, currency, total_contact_views, daily_contact_view_limit")
    .eq("id", body.planId)
    .single();
  if (planError || !plan) {
    return NextResponse.json({ error: planError?.message || "Invalid plan" }, { status: 400 });
  }
  const planRow = plan as SubscriptionPlanRow;

  let startsAt = body.startsAt ? new Date(body.startsAt) : new Date(body.paymentMadeAt || now);
  if (Number.isNaN(startsAt.getTime())) startsAt = new Date(now);
  if (startImmediately && !body.startsAt) startsAt = new Date(now);

  let expiresAt = body.expiresAt
    ? new Date(body.expiresAt)
    : new Date(startsAt.getTime() + Number(planRow.duration_days || 0) * 86400000);
  if (Number.isNaN(expiresAt.getTime())) {
    expiresAt = new Date(startsAt.getTime() + Number(planRow.duration_days || 0) * 86400000);
  }
  if (expiresAt <= startsAt) {
    return NextResponse.json({ error: "expiresAt must be after startsAt" }, { status: 400 });
  }

  const amount = Number(body.amount ?? planRow.price ?? 0);
  const isFreePlan = amount <= 0;
  const paymentMode: PaymentMode = isFreePlan ? "free_auto" : body.paymentMode || "other";
  if (!isFreePlan && !body.transactionId) {
    return NextResponse.json({ error: "transactionId is required for paid plans" }, { status: 400 });
  }
  if (!isFreePlan && !body.payerSource) {
    return NextResponse.json({ error: "payerSource is required for paid plans" }, { status: 400 });
  }
  if (paymentMode === "other" && !body.paymentModeDetails?.trim()) {
    return NextResponse.json({ error: "paymentModeDetails is required when paymentMode is other" }, { status: 400 });
  }

  const transactionId =
    body.transactionId ||
    (isFreePlan ? `FREE-${normalizedUserId}-${Date.now().toString(36).toUpperCase()}` : null);
  const paymentMadeAt = body.paymentMadeAt || now;
  const totalContactViewsSnapshot =
    body.overrideTotalContactViews != null
      ? Math.max(0, Math.trunc(Number(body.overrideTotalContactViews)))
      : Number(planRow.total_contact_views || 0);
  const dailyContactLimitSnapshot =
    body.overrideDailyContactViewLimit != null
      ? Math.max(0, Math.trunc(Number(body.overrideDailyContactViewLimit)))
      : Number(planRow.daily_contact_view_limit || 0);

  let effectivePlanId = planRow.id;

  // Keep compatibility with older production schemas by retrying with a smaller payload.
  const fullSubscriptionBase: Record<string, unknown> = {
    profile_id: body.profileId || null,
    status: "active",
    source: "manual",
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
    assigned_by: auth.userId,
    notes: body.note || null,
    plan_name_snapshot: planRow.name,
    price_snapshot: Number(planRow.price || 0),
    currency_snapshot: planRow.currency || "INR",
    duration_days_snapshot: Number(planRow.duration_days || 0),
    total_contact_views_snapshot: totalContactViewsSnapshot,
    daily_contact_view_limit_snapshot: dailyContactLimitSnapshot,
    metadata: {
      start_immediately: startImmediately,
    },
  };
  // Oldest schemas: no profile_id, source, assigned_by, snapshots, metadata, notes.
  const fallbackSubscriptionBase: Record<string, unknown> = {
    status: "active",
    starts_at: startsAt.toISOString(),
    expires_at: expiresAt.toISOString(),
  };

  const insertSubscriptionRow = async (forUserId: string, planIdForRow: string) => {
    const fullPayload = { ...fullSubscriptionBase, user_id: forUserId, plan_id: planIdForRow };
    let r = await admin.from("user_subscriptions").insert(fullPayload).select("*").single();
    if (!r.error) {
      return { data: r.data as Record<string, unknown> | null, error: null as { message: string } | null };
    }
    if (isSchemaMismatchError(r.error.message)) {
      const minPayload = { ...fallbackSubscriptionBase, user_id: forUserId, plan_id: planIdForRow };
      r = await admin.from("user_subscriptions").insert(minPayload).select("*").single();
      return { data: r.data as Record<string, unknown> | null, error: r.error };
    }
    return { data: null as Record<string, unknown> | null, error: r.error };
  };

  const { data: ownedProfiles } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", normalizedUserId)
    .is("deleted_at", null)
    .limit(500);
  const ownedProfileIds = (ownedProfiles || [])
    .map((r) => String((r as { id?: string }).id || ""))
    .filter(Boolean);
  const legacyLookupUserIds = Array.from(new Set([normalizedUserId, ...ownedProfileIds]));

  // Enforce account-level single active plan:
  // expire existing active rows for this account before creating a new one.
  const existingSubsRes = await admin
    .from("user_subscriptions")
    .select("id, user_id, status, starts_at, expires_at, notes")
    .in("user_id", legacyLookupUserIds)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(100);
  let existingSubs: Array<{
    id?: string;
    user_id?: string;
    status?: string;
    starts_at?: string | null;
    expires_at?: string | null;
    notes?: string | null;
  }> =
    !existingSubsRes.error && existingSubsRes.data
      ? existingSubsRes.data
      : [];
  if (existingSubsRes.error && isUserSubscriptionsNotesColumnError(existingSubsRes.error.message)) {
    const fallbackRes = await admin
      .from("user_subscriptions")
      .select("id, user_id, status, starts_at, expires_at")
      .in("user_id", legacyLookupUserIds)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(100);
    existingSubs = fallbackRes.data || [];
  }
  const nowIso = now;
  const replacementNote = `Expired automatically: replaced by newly assigned plan ${planRow.name} on ${new Date(nowIso).toLocaleString("en-IN")}.`;
  for (const row of existingSubs || []) {
    const sid = String(row.id || "");
    if (!sid) continue;
    const startsAtOld = String(row.starts_at || "");
    const alreadyFuture = startsAtOld && startsAtOld > nowIso;
    const targetExpiresAt = alreadyFuture ? startsAtOld : nowIso;
    const noteValue = appendReplacementNote(row.notes, replacementNote);
    let upd = await admin
      .from("user_subscriptions")
      .update({
        status: "expired",
        expires_at: targetExpiresAt,
        notes: noteValue,
      })
      .eq("id", sid);
    if (
      upd.error &&
      (isSchemaMismatchError(upd.error.message) || isUserSubscriptionsNotesColumnError(upd.error.message))
    ) {
      upd = await admin
        .from("user_subscriptions")
        .update({
          status: "expired",
          expires_at: targetExpiresAt,
        })
        .eq("id", sid);
    }
  }

  const subscriptionUserIdCandidates = Array.from(new Set([normalizedUserId, ...ownedProfileIds]));
  let subscriptionRowUserId = subscriptionUserIdCandidates[0] || normalizedUserId;
  let subscription: Record<string, unknown> | null = null;
  let subError: { message: string } | null = null;
  let sawPlanFkError = false;
  const tryInsertForPlanId = async (planIdForInsert: string) => {
    for (const uid of subscriptionUserIdCandidates) {
      const attempted = await insertSubscriptionRow(uid, planIdForInsert);
      if (!attempted.error && attempted.data) {
        subscriptionRowUserId = uid;
        subscription = attempted.data;
        subError = null;
        return true;
      }
      subError = attempted.error;
      if (attempted.error && isUserSubscriptionsPlanFkError(attempted.error.message)) {
        sawPlanFkError = true;
      }
    }
    return false;
  };

  let inserted = await tryInsertForPlanId(effectivePlanId);
  const subErrorMessage = String((subError as { message?: string } | null)?.message || "");
  if (!inserted && subErrorMessage && isUserSubscriptionsUserFkError(subErrorMessage) && ownedProfileIds.length === 0) {
    const shadowProfileId = await ensureShadowProfileForLegacySubscriptionFk(admin, normalizedUserId);
    if (shadowProfileId) {
      subscriptionUserIdCandidates.unshift(shadowProfileId);
      inserted = await tryInsertForPlanId(effectivePlanId);
    }
  }
  if (!inserted && sawPlanFkError) {
    const { legacyPlanId, membershipPlansRowCount } = await resolveMembershipPlanIdForFk(admin, planRow);
    if (!legacyPlanId) {
      const emptyTable =
        membershipPlansRowCount === 0
          ? "membership_plans currently has zero rows. Your FK user_subscriptions.plan_id → membership_plans(id) requires at least one plan row there."
          : `membership_plans has ${membershipPlansRowCount} row(s), but none matched this catalog plan (code=${planRow.code}, price=${planRow.price}, duration_days=${planRow.duration_days}).`;
      return NextResponse.json(
        {
          error: `${emptyTable} Seed membership_plans (name, duration in months, price, features, is_free) to mirror subscription_plans, or migrate the FK to subscription_plans. See supabase-superadmin-control-center.sql optional section "Legacy membership_plans seed".`,
        },
        { status: 400 }
      );
    }
    effectivePlanId = legacyPlanId;
    inserted = await tryInsertForPlanId(effectivePlanId);
  }
  if (subError || !subscription) {
    return NextResponse.json(
      { error: String((subError as { message?: string } | null)?.message || "Failed to create subscription") },
      { status: 500 }
    );
  }
  const createdSubscription = subscription as Record<string, unknown>;
  const createdSubscriptionId = String(createdSubscription.id || "");

  const transactionUserIdCandidates = Array.from(
    new Set([normalizedUserId, subscriptionRowUserId, ...ownedProfileIds].filter(Boolean))
  );
  let txn: Record<string, unknown> | null = null;
  let txnError: { message: string } | null = null;
  for (const txnUserId of transactionUserIdCandidates) {
    const fullTxnPayload: Record<string, unknown> = {
      user_id: txnUserId,
      subscription_id: createdSubscriptionId,
      provider: "manual",
      external_txn_id: transactionId,
      amount,
      currency: planRow.currency || "INR",
      status: "paid",
      paid_at: paymentMadeAt,
      received_by: auth.userId,
      payment_mode: paymentMode,
      payer_source: body.payerSource || null,
      payment_made_at: paymentMadeAt,
      payment_mode_details: body.paymentModeDetails || null,
      metadata: {
        note: body.note || null,
        receipt_ref: body.receiptRef || null,
      },
    };
    const firstTry = await admin.from("payment_transactions").insert(fullTxnPayload).select("*").single();
    txn = firstTry.data as Record<string, unknown> | null;
    txnError = firstTry.error;
    if (!txnError && txn) break;
    if (txnError && isSchemaMismatchError(txnError.message)) {
      const fallbackTxnPayload: Record<string, unknown> = {
        user_id: txnUserId,
        subscription_id: createdSubscriptionId,
        provider: "manual",
        external_txn_id: transactionId,
        amount,
        currency: planRow.currency || "INR",
        status: "paid",
        paid_at: paymentMadeAt,
      };
      const secondTry = await admin
        .from("payment_transactions")
        .insert(fallbackTxnPayload)
        .select("*")
        .single();
      txn = secondTry.data as Record<string, unknown> | null;
      txnError = secondTry.error;
      if (!txnError && txn) break;
    }
  }
  if (txnError || !txn) return NextResponse.json({ error: txnError?.message || "Failed to create transaction" }, { status: 500 });

  if (body.receiptRef) {
    await admin.from("manual_payment_receipts").insert({
      transaction_id: txn.id as string,
      receipt_ref: body.receiptRef,
      collected_by: auth.userId,
      note: body.note || null,
    });
  }

  if (body.profileId) {
    await admin
      .from("profiles")
      .update({ profile_type: "premium", updated_at: now })
      .eq("id", body.profileId);
  }

  await logAdminAudit({
    actorUserId: auth.userId,
    action: "subscription.assign_manual",
    entityType: "user_subscription",
    entityId: createdSubscriptionId,
    afterJson: {
      auth_user_id: normalizedUserId,
      subscription_user_id: subscriptionRowUserId,
      subscription_plans_id: planRow.id,
      user_subscriptions_plan_id: effectivePlanId,
      starts_at: startsAt.toISOString(),
      expires_at: expiresAt.toISOString(),
      transaction_id: transactionId,
      payment_mode: paymentMode,
      payment_made_at: paymentMadeAt,
      total_contact_views_snapshot: totalContactViewsSnapshot,
      daily_contact_view_limit_snapshot: dailyContactLimitSnapshot,
    },
  });

  await admin.from("notifications").insert({
    user_id: normalizedUserId,
    type: "general",
    title: "Subscription activated",
    message: `Your ${String(planRow.name)} plan is active till ${expiresAt.toLocaleDateString("en-IN")}.`,
    read: false,
  });

  return NextResponse.json({ subscription: createdSubscription, transaction: txn });
}
