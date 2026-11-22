/**
 * Plan & revenue numbers for the admin Overview and the Plans page.
 * Revenue is NET: money received in the period minus refunds given in the
 * period (void payments never count). Plans are per account.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { isUsable, type SubscriptionRow } from "@/lib/server/plans";

type Row = Record<string, unknown>;
const DAY = 86_400_000;

export type PlanStats = {
  byPlan: { planId: string | null; name: string; code: string | null; active: number; paid: boolean }[];
  activePaid: number;
  activeFree: number;
  expiring7: number;
  expiring30: number;
  /** Paid plans that ended in the last 30 days and were not renewed (win-back list). */
  lapsedPaid30: number;
  /** Accounts with a live profile but no usable plan (cannot see contacts). */
  liveNoPlan: number;
  revenue: number;
  revenuePrev: number;
  revenueAllTime: number;
  refunds: number;
  newPaidPlans: number;
  newPaidPlansPrev: number;
};

export async function getPlanStats(admin: SupabaseClient, from: Date, to: Date): Promise<PlanStats> {
  const prevFrom = new Date(from.getTime() - (to.getTime() - from.getTime()));
  const [subsRes, payRes, liveRes] = await Promise.all([
    admin.from("user_subscriptions").select("id, user_id, plan_id, plan_code, plan_name_snapshot, price_snapshot, status, starts_at, expires_at, ended_at, created_at, source").limit(50000),
    admin.from("payment_transactions").select("amount, refunded_amount, status, paid_at, created_at, refunded_at").in("status", ["paid", "refunded"]).limit(50000),
    admin.from("public_profiles").select("user_id").limit(50000),
  ]);
  const subs = (subsRes.data || []) as (SubscriptionRow & { ended_at: string | null })[];
  const now = Date.now();

  const usableByAccount = new Map<string, SubscriptionRow>();
  for (const s of subs) if (isUsable(s)) usableByAccount.set(s.user_id, s);

  const byPlanMap = new Map<string, PlanStats["byPlan"][number]>();
  let activePaid = 0;
  let activeFree = 0;
  let expiring7 = 0;
  let expiring30 = 0;
  for (const s of usableByAccount.values()) {
    const paid = Number(s.price_snapshot || 0) > 0;
    if (paid) activePaid += 1;
    else activeFree += 1;
    const left = new Date(s.expires_at).getTime() - now;
    if (left <= 7 * DAY) expiring7 += 1;
    if (left <= 30 * DAY) expiring30 += 1;
    const key = s.plan_id || s.plan_name_snapshot || "plan";
    const cur = byPlanMap.get(key) || { planId: s.plan_id, name: s.plan_name_snapshot || "Plan", code: s.plan_code, active: 0, paid };
    cur.active += 1;
    byPlanMap.set(key, cur);
  }

  // Paid plans that ended in the last 30 days, for accounts without a plan now.
  const lapsed = new Set<string>();
  for (const s of subs) {
    if (Number(s.price_snapshot || 0) <= 0 || usableByAccount.has(s.user_id)) continue;
    const endedAt = new Date(s.ended_at && s.ended_at < s.expires_at ? s.ended_at : s.expires_at).getTime();
    if (endedAt <= now && endedAt >= now - 30 * DAY && s.status !== "refunded") lapsed.add(s.user_id);
  }

  const liveAccounts = new Set(((liveRes.data || []) as Row[]).map((r) => String(r.user_id || "")).filter(Boolean));
  let liveNoPlan = 0;
  for (const a of liveAccounts) if (!usableByAccount.has(a)) liveNoPlan += 1;

  // Net revenue: received in window minus refunds given in window.
  const inWin = (iso: unknown, a: Date, b: Date) => {
    const t = new Date(String(iso || "")).getTime();
    return Number.isFinite(t) && t >= a.getTime() && t < b.getTime();
  };
  let revenue = 0;
  let revenuePrev = 0;
  let revenueAllTime = 0;
  let refunds = 0;
  for (const p of (payRes.data || []) as Row[]) {
    const amt = Number(p.amount || 0);
    const ref = Number(p.refunded_amount || 0);
    const paidAt = p.paid_at || p.created_at;
    revenueAllTime += amt - ref;
    if (inWin(paidAt, from, to)) revenue += amt;
    if (inWin(paidAt, prevFrom, from)) revenuePrev += amt;
    if (ref > 0) {
      if (inWin(p.refunded_at, from, to)) {
        revenue -= ref;
        refunds += ref;
      }
      if (inWin(p.refunded_at, prevFrom, from)) revenuePrev -= ref;
    }
  }

  const newPaid = (a: Date, b: Date) =>
    subs.filter((s) => Number(s.price_snapshot || 0) > 0 && s.source !== "legacy" && inWin(s.created_at, a, b)).length;

  return {
    byPlan: [...byPlanMap.values()].sort((a, b) => b.active - a.active),
    activePaid,
    activeFree,
    expiring7,
    expiring30,
    lapsedPaid30: lapsed.size,
    liveNoPlan,
    revenue: Math.round(revenue * 100) / 100,
    revenuePrev: Math.round(revenuePrev * 100) / 100,
    revenueAllTime: Math.round(revenueAllTime * 100) / 100,
    refunds: Math.round(refunds * 100) / 100,
    newPaidPlans: newPaid(from, to),
    newPaidPlansPrev: newPaid(prevFrom, from),
  };
}
