import { createSupabaseAdmin } from "@/lib/supabase";

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

function isPlanFkError(message: string | undefined): boolean {
  if (!message) return false;
  const m = message.toLowerCase();
  return (
    m.includes("user_subscriptions_plan_id_fkey") ||
    (m.includes("foreign key") && m.includes("user_subscriptions") && m.includes("plan_id"))
  );
}

type SubPlan = {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: number;
  currency: string;
  total_contact_views: number;
  daily_contact_view_limit: number;
};

type LegacyPlan = {
  id: string;
  name?: string | null;
  price?: number | null;
  duration?: number | null;
  is_free?: boolean | null;
};

async function resolveFreePlans(admin: ReturnType<typeof createSupabaseAdmin>) {
  const { data: subRows } = await admin
    .from("subscription_plans")
    .select("id, code, name, duration_days, price, currency, total_contact_views, daily_contact_view_limit, is_active")
    .eq("is_active", true)
    .order("price", { ascending: true })
    .limit(50);

  const subCandidates = ((subRows || []) as Array<SubPlan & { is_active?: boolean }>).filter(
    (p) => String(p.code || "").toLowerCase() === "free" || Number(p.price || 0) <= 0
  );
  const freeSub = subCandidates[0] || null;

  const { data: legacyRows, error: legacyErr } = await admin
    .from("membership_plans")
    .select("id, name, price, duration, is_free")
    .limit(200);

  const legacyList = legacyErr ? [] : ((legacyRows || []) as LegacyPlan[]);
  const freeLegacy =
    legacyList.find((r) => r.is_free === true) ||
    legacyList.find((r) => Number(r.price || 0) <= 0) ||
    null;

  return { freeSub, freeLegacy };
}

export async function ensureFreePlanForUser(
  admin: ReturnType<typeof createSupabaseAdmin>,
  userId: string
): Promise<{ created: boolean; skipped: boolean; error?: string }> {
  const cleanUserId = String(userId || "").trim();
  if (!cleanUserId) return { created: false, skipped: true, error: "Missing user id" };

  const now = new Date();
  const nowIso = now.toISOString();
  const existing = await admin
    .from("user_subscriptions")
    .select("id")
    .eq("user_id", cleanUserId)
    .eq("status", "active")
    .lte("starts_at", nowIso)
    .gte("expires_at", nowIso)
    .limit(1)
    .maybeSingle();
  if (existing.data?.id) return { created: false, skipped: true };

  const { freeSub, freeLegacy } = await resolveFreePlans(admin);
  if (!freeSub && !freeLegacy) {
    return { created: false, skipped: false, error: "No free plan is configured." };
  }

  const durationDays = Math.max(
    1,
    Number(
      freeSub?.duration_days ||
        (freeLegacy?.duration ? Number(freeLegacy.duration) * 30 : 30)
    )
  );
  const startsAt = nowIso;
  const expiresAt = new Date(now.getTime() + durationDays * 86400000).toISOString();
  const planName = String(freeSub?.name || freeLegacy?.name || "Free");
  const planCurrency = String(freeSub?.currency || "INR");
  const totalContacts = Number(freeSub?.total_contact_views || 0);
  const dailyContacts = Number(freeSub?.daily_contact_view_limit || 0);

  const baseFull = {
    user_id: cleanUserId,
    plan_id: String(freeSub?.id || freeLegacy?.id || ""),
    status: "active",
    source: "free_auto",
    starts_at: startsAt,
    expires_at: expiresAt,
    notes: "Auto-assigned free plan at signup.",
    plan_name_snapshot: planName,
    price_snapshot: 0,
    currency_snapshot: planCurrency,
    duration_days_snapshot: durationDays,
    total_contact_views_snapshot: totalContacts,
    daily_contact_view_limit_snapshot: dailyContacts,
    metadata: {
      provisioned_by: "signup_auto",
      plan_code: String(freeSub?.code || "free"),
    },
  };
  const baseMinimal = {
    user_id: cleanUserId,
    plan_id: String(freeSub?.id || freeLegacy?.id || ""),
    status: "active",
    starts_at: startsAt,
    expires_at: expiresAt,
  };

  let inserted = await admin.from("user_subscriptions").insert(baseFull).select("id").single();
  if (inserted.error && isSchemaMismatchError(inserted.error.message)) {
    inserted = await admin.from("user_subscriptions").insert(baseMinimal).select("id").single();
  }

  if (inserted.error && isPlanFkError(inserted.error.message) && freeLegacy?.id) {
    const retryFull = { ...baseFull, plan_id: String(freeLegacy.id) };
    const retryMinimal = { ...baseMinimal, plan_id: String(freeLegacy.id) };
    inserted = await admin.from("user_subscriptions").insert(retryFull).select("id").single();
    if (inserted.error && isSchemaMismatchError(inserted.error.message)) {
      inserted = await admin.from("user_subscriptions").insert(retryMinimal).select("id").single();
    }
  }

  if (inserted.error) {
    return { created: false, skipped: false, error: inserted.error.message };
  }
  return { created: true, skipped: false };
}
