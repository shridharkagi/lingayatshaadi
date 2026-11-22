import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { listAllAuthUsers } from "@/lib/server/authUsers";
import { getPersistedAccountCodeMap } from "@/lib/server/accountCodes";
import { effectiveStatus, istDayStartUtc, isUsable, type PaymentRow, type SubscriptionRow } from "@/lib/server/plans";

type Row = Record<string, unknown>;

/**
 * Every account with its current (or most recent) plan, usage and money.
 * GET ?q=&status=all|active|expiring|expired|cancelled|refunded|none|upcoming
 *     &plan=<planId>|none&endFrom=YYYY-MM-DD&endTo=YYYY-MM-DD
 *     &sort=end_asc|end_desc|newest|name|paid_desc&limit=&offset=
 * Volumes are small (hundreds of accounts); built in memory for flexibility.
 */
export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const sp = req.nextUrl.searchParams;
  const admin = createSupabaseAdmin();

  const users = await listAllAuthUsers(admin);
  const ids = users.map((u) => u.id);
  const [codes, profRes, subRes, payRes] = await Promise.all([
    getPersistedAccountCodeMap(admin, ids),
    admin.from("profiles").select("id, user_id, public_id, full_name, deleted_at, moderation_status").limit(20000),
    admin.from("user_subscriptions").select("*").order("expires_at", { ascending: false }).limit(20000),
    admin.from("payment_transactions").select("id, user_id, subscription_id, amount, refunded_amount, status").neq("status", "void").limit(20000),
  ]);
  if (subRes.error) return NextResponse.json({ error: subRes.error.message }, { status: 500 });

  const profiles = (profRes.data || []) as Row[];
  const profilesByAccount = new Map<string, Row[]>();
  const accountOfProfile = new Map<string, string>();
  for (const p of profiles) {
    const uid = String(p.user_id || "");
    if (!uid) continue;
    accountOfProfile.set(String(p.id), uid);
    if (!profilesByAccount.has(uid)) profilesByAccount.set(uid, []);
    profilesByAccount.get(uid)!.push(p);
  }

  // Current plan = the 'active' row; otherwise the most recent one.
  const subs = (subRes.data || []) as SubscriptionRow[];
  const current = new Map<string, SubscriptionRow>();
  const planCount = new Map<string, number>();
  for (const s of subs) {
    planCount.set(s.user_id, (planCount.get(s.user_id) || 0) + 1);
    const prev = current.get(s.user_id);
    if (!prev || (s.status === "active" && prev.status !== "active")) current.set(s.user_id, s);
  }

  const paidBySub = new Map<string, number>();
  const paidByAccount = new Map<string, number>();
  for (const p of (payRes.data || []) as PaymentRow[]) {
    if (p.status !== "paid" && p.status !== "refunded") continue;
    const net = Number(p.amount || 0) - Number(p.refunded_amount || 0);
    paidByAccount.set(p.user_id, (paidByAccount.get(p.user_id) || 0) + net);
    if (p.subscription_id) paidBySub.set(p.subscription_id, (paidBySub.get(p.subscription_id) || 0) + net);
  }

  // Usage for usable plans, from one contact_views query.
  const usable = [...current.values()].filter((s) => isUsable(s));
  const usage = new Map<string, { total: number; today: number }>();
  if (usable.length) {
    const from = usable.reduce((m, s) => (s.starts_at < m ? s.starts_at : m), usable[0].starts_at);
    const { data: views } = await admin.from("contact_views").select("viewer_id, viewed_at").gte("viewed_at", from).limit(50000);
    const dayStart = istDayStartUtc();
    for (const v of (views || []) as Row[]) {
      const uid = accountOfProfile.get(String(v.viewer_id));
      const s = uid ? current.get(uid) : undefined;
      if (!uid || !s || !isUsable(s)) continue;
      const at = String(v.viewed_at);
      if (at < s.starts_at || at > s.expires_at) continue;
      const u = usage.get(uid) || { total: 0, today: 0 };
      u.total += 1;
      if (at >= dayStart) u.today += 1;
      usage.set(uid, u);
    }
  }

  let rows = users.map((u) => {
    const s = current.get(u.id) || null;
    const live = (profilesByAccount.get(u.id) || []).filter((p) => !p.deleted_at);
    const meta = (u.user_metadata || {}) as Row;
    return {
      accountId: u.id,
      accountCode: codes.get(u.id) || null,
      name: String(meta.full_name || ""),
      phone: u.phone || null,
      joinedAt: u.created_at || null,
      profiles: live.map((p) => ({ id: p.id, publicId: p.public_id, name: p.full_name, status: p.moderation_status })),
      plansCount: planCount.get(u.id) || 0,
      totalPaid: Math.round((paidByAccount.get(u.id) || 0) * 100) / 100,
      plan: s
        ? {
            id: s.id,
            planId: s.plan_id,
            code: s.plan_code,
            name: s.plan_name_snapshot || "Plan",
            status: effectiveStatus(s),
            startsAt: s.starts_at,
            expiresAt: s.expires_at,
            totalLimit: s.total_contact_views_snapshot,
            dailyLimit: s.daily_contact_view_limit_snapshot,
            price: Number(s.price_snapshot || 0),
            paid: Math.round((paidBySub.get(s.id) || 0) * 100) / 100,
            source: s.source,
            notes: s.notes,
            endReason: s.end_reason,
            used: usage.get(u.id)?.total ?? 0,
            usedToday: usage.get(u.id)?.today ?? 0,
          }
        : null,
    };
  });

  // Counts per status (before the status filter) for the tabs.
  const counts: Record<string, number> = { all: rows.length, none: 0 };
  for (const r of rows) {
    const k = r.plan ? r.plan.status : "none";
    counts[k] = (counts[k] || 0) + 1;
  }

  const q = (sp.get("q") || "").trim().toLowerCase();
  if (q) {
    const digits = q.replace(/\D/g, "");
    rows = rows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        (r.accountCode || "").toLowerCase().includes(q) ||
        (digits.length >= 4 && (r.phone || "").includes(digits)) ||
        r.profiles.some((p) => String(p.publicId || "").toLowerCase().includes(q) || String(p.name || "").toLowerCase().includes(q))
    );
  }
  const status = sp.get("status") || "all";
  if (status === "none") rows = rows.filter((r) => !r.plan);
  else if (status === "active") rows = rows.filter((r) => r.plan && (r.plan.status === "active" || r.plan.status === "expiring"));
  else if (status !== "all") rows = rows.filter((r) => r.plan?.status === status);
  const plan = sp.get("plan");
  if (plan === "none") rows = rows.filter((r) => !r.plan);
  else if (plan) rows = rows.filter((r) => r.plan?.planId === plan);
  const endFrom = sp.get("endFrom");
  const endTo = sp.get("endTo");
  if (endFrom) rows = rows.filter((r) => r.plan && r.plan.expiresAt >= new Date(`${endFrom}T00:00:00+05:30`).toISOString());
  if (endTo) rows = rows.filter((r) => r.plan && r.plan.expiresAt < new Date(new Date(`${endTo}T00:00:00+05:30`).getTime() + 86_400_000).toISOString());

  const sort = sp.get("sort") || "end_asc";
  const end = (r: (typeof rows)[number]) => r.plan?.expiresAt || "";
  rows.sort((a, b) => {
    if (sort === "name") return (a.name || "~").localeCompare(b.name || "~");
    if (sort === "newest") return String(b.joinedAt || "").localeCompare(String(a.joinedAt || ""));
    if (sort === "paid_desc") return b.totalPaid - a.totalPaid;
    if (sort === "end_desc") return end(b).localeCompare(end(a));
    // end_asc: soonest ending first; accounts without a plan last
    if (!a.plan !== !b.plan) return a.plan ? -1 : 1;
    return end(a).localeCompare(end(b));
  });

  const total = rows.length;
  const limit = Math.min(Math.max(Number(sp.get("limit") || 50), 1), 500);
  const offset = Math.max(Number(sp.get("offset") || 0), 0);
  return NextResponse.json({ total, counts, rows: rows.slice(offset, offset + limit), allIds: rows.map((r) => r.accountId) });
}
