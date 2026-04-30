import { NextRequest, NextResponse } from "next/server";
import { createSupabaseAdmin } from "@/lib/supabase";
import { requireSuperAdmin } from "@/lib/server/requireSuperAdmin";
import { resolveAccountCodeMap } from "@/lib/server/accountCodes";
import { listAllAuthUsers } from "@/lib/server/authUsers";

const isMissingRelation = (msg?: string) =>
  !!msg && (msg.includes("does not exist") || msg.includes("schema cache"));

function nearlyEqPrice(a: number, b: number): boolean {
  return Math.abs(a - b) < 0.02;
}

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = createSupabaseAdmin();
  const now = new Date().toISOString();
  const weekAhead = new Date(Date.now() + 7 * 86400000).toISOString();

  const [plansRes, memRes, activeRes, expiringRes, txRes, recentRes, historyRes] = await Promise.all([
    admin.from("subscription_plans").select("id, name, code, price, duration_days, is_active"),
    admin.from("membership_plans").select("id, name, price, duration").limit(200),
    admin
      .from("user_subscriptions")
      .select("id, user_id, plan_id, status, starts_at, expires_at, created_at")
      .eq("status", "active")
      .gte("expires_at", now),
    admin
      .from("user_subscriptions")
      .select("id")
      .eq("status", "active")
      .gte("expires_at", now)
      .lte("expires_at", weekAhead),
    admin
      .from("payment_transactions")
      .select("id, user_id, subscription_id, amount, status, paid_at, created_at")
      .eq("status", "paid")
      .order("created_at", { ascending: false })
      .limit(2000),
    admin
      .from("user_subscriptions")
      .select("id, user_id, plan_id, status, starts_at, expires_at, created_at, total_contact_views_snapshot, daily_contact_view_limit_snapshot")
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("user_subscriptions")
      .select("id, user_id, plan_id, status, starts_at, expires_at, created_at, total_contact_views_snapshot, daily_contact_view_limit_snapshot")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const criticalErrors = [plansRes.error, activeRes.error, expiringRes.error, txRes.error].filter(
    (e) => e && !isMissingRelation(e.message)
  );
  if (criticalErrors.length) {
    return NextResponse.json({ error: criticalErrors[0]?.message || "Failed to load subscriptions" }, { status: 500 });
  }

  const catalogPlans = (plansRes.data || []) as Array<{
    id: string;
    name: string;
    code: string;
    price: number;
    duration_days: number;
    is_active: boolean;
  }>;
  const membershipPlans = !memRes.error ? ((memRes.data || []) as Array<{ id: string; name: string; price: number; duration: number }>) : [];

  const memIdToCatalogId = new Map<string, string>();
  for (const m of membershipPlans) {
    const months = Number(m.duration || 0);
    const price = Number(m.price || 0);
    const match = catalogPlans.find(
      (c) =>
        nearlyEqPrice(Number(c.price || 0), price) &&
        Math.max(1, Math.round(Number(c.duration_days || 0) / 30)) === months
    );
    if (match) memIdToCatalogId.set(m.id, match.id);
  }

  const activeRows = (activeRes.data || []) as Array<{
    id: string;
    user_id: string;
    plan_id?: string;
    status?: string;
    starts_at?: string;
    expires_at?: string;
    created_at?: string;
  }>;

  const activeByRawPlanId = new Map<string, number>();
  const activeByCatalogPlan = new Map<string, number>();
  const catalogIdSet = new Set(catalogPlans.map((c) => c.id));

  for (const row of activeRows) {
    const pid = String(row.plan_id || "");
    if (!pid) continue;
    activeByRawPlanId.set(pid, (activeByRawPlanId.get(pid) || 0) + 1);
    let catalogKey: string | null = null;
    if (catalogIdSet.has(pid)) catalogKey = pid;
    else catalogKey = memIdToCatalogId.get(pid) || null;
    if (catalogKey) {
      activeByCatalogPlan.set(catalogKey, (activeByCatalogPlan.get(catalogKey) || 0) + 1);
    }
  }

  const planNameById = new Map<string, string>();
  for (const c of catalogPlans) planNameById.set(c.id, c.name);
  for (const m of membershipPlans) planNameById.set(m.id, m.name);

  const subscriptionsByPlan = [...activeByRawPlanId.entries()]
    .map(([planId, activeCount]) => ({
      planId,
      planName: planNameById.get(planId) || "Unknown plan",
      activeCount,
      catalogPlanId: catalogIdSet.has(planId) ? planId : memIdToCatalogId.get(planId) || null,
    }))
    .sort((a, b) => b.activeCount - a.activeCount);

  const plans = catalogPlans.map((p) => ({
    ...p,
    activeSubscribers: activeByCatalogPlan.get(p.id) ?? activeByRawPlanId.get(p.id) ?? 0,
  }));

  const collected = (txRes.data || []).reduce(
    (sum, t) => sum + Number((t as { amount?: number }).amount || 0),
    0
  );

  const recentRows = !recentRes.error ? ((recentRes.data || []) as typeof activeRows) : [];
  const recentUserIds = [...new Set(recentRows.map((r) => r.user_id).filter(Boolean))];
  const setupWarning =
    plansRes.error || activeRes.error || expiringRes.error || txRes.error || recentRes.error
      ? "Some subscription tables may be missing or incomplete."
      : null;
  let recentSubscriptions: Array<{
    id: string;
    planName: string;
    status: string;
    startsAt: string | null;
    expiresAt: string | null;
    createdAt: string | null;
    totalContactViews: number;
    dailyContactViewLimit: number;
    notes: string | null;
    memberLabel: string;
    userLinkId: string;
    subscriptionUserId: string;
  }> = [];

  if (recentUserIds.length > 0) {
    const [{ data: profById }, { data: profByUser }] = await Promise.all([
      admin.from("profiles").select("id, user_id, public_id, full_name").in("id", recentUserIds),
      admin.from("profiles").select("id, user_id, public_id, full_name").in("user_id", recentUserIds),
    ]);
    const byProfileId = new Map<string, { user_id: string | null; public_id: string | null; full_name: string | null }>();
    const byAuthId = new Map<string, { user_id: string | null; public_id: string | null; full_name: string | null }>();
    for (const p of [...(profById || []), ...(profByUser || [])]) {
      const row = p as { id?: string; user_id?: string; public_id?: string | null; full_name?: string | null };
      if (row.id) {
        byProfileId.set(row.id, {
          user_id: row.user_id || null,
          public_id: row.public_id || null,
          full_name: row.full_name || null,
        });
      }
      if (row.user_id)
        byAuthId.set(row.user_id, { user_id: row.user_id, public_id: row.public_id || null, full_name: row.full_name || null });
    }
    const memberLabel = (uid: string) => {
      const a = byProfileId.get(uid);
      if (a?.public_id || a?.full_name) {
        return `${a.full_name || "Member"} (${a.public_id || `${uid.slice(0, 8)}…`})`;
      }
      const b = byAuthId.get(uid);
      if (b?.public_id || b?.full_name) {
        return `${b.full_name || "Member"} (${b.public_id || `${uid.slice(0, 8)}…`})`;
      }
      return `User ${uid.slice(0, 8)}…`;
    };

    recentSubscriptions = recentRows.map((r) => ({
      id: r.id,
      planName: planNameById.get(String(r.plan_id || "")) || "Plan",
      status: String(r.status || ""),
      startsAt: r.starts_at || null,
      expiresAt: r.expires_at || null,
      createdAt: r.created_at || null,
      totalContactViews: Number((r as { total_contact_views_snapshot?: number }).total_contact_views_snapshot || 0),
      dailyContactViewLimit: Number((r as { daily_contact_view_limit_snapshot?: number }).daily_contact_view_limit_snapshot || 0),
      notes: null,
      memberLabel: memberLabel(r.user_id),
      userLinkId: r.user_id,
      subscriptionUserId: r.user_id,
    }));

    const historyRows = !historyRes.error
      ? ((historyRes.data || []) as Array<{
          id: string;
          user_id: string;
          plan_id?: string;
          status?: string;
          starts_at?: string;
          expires_at?: string;
          created_at?: string;
          total_contact_views_snapshot?: number;
          daily_contact_view_limit_snapshot?: number;
        }>)
      : [];
    const resolveOwnerAuthId = (uid: string) => byProfileId.get(uid)?.user_id || uid;
    const summaryMap = new Map<
      string,
      {
        ownerAuthUserId: string;
        ownerAccountCode: string | null;
        accountName: string;
        activePlanName: string;
        activePlanEndsAt: string | null;
        activeSubscriptionId: string | null;
        activeTotalContactViews: number;
        activeDailyContactViewLimit: number;
        activeNotes: string | null;
        previousPlansCount: number;
        totalPlansCount: number;
        totalPaidAmount: number;
        activeProfiles: Array<{
          profileId: string;
          profilePublicId: string | null;
          profileName: string;
        }>;
        history: Array<{
          subscriptionId: string;
          planName: string;
          status: string;
          startsAt: string | null;
          expiresAt: string | null;
          contactsAllowed: number;
          contactsTaken: number;
          amountPaid: number;
        }>;
      }
    >();
    const paidByOwner = new Map<string, number>();
    const paidBySubscription = new Map<string, number>();
    for (const t of txRes.data || []) {
      const tx = t as { user_id?: string; subscription_id?: string; amount?: number };
      if (!tx.user_id) continue;
      const owner = resolveOwnerAuthId(tx.user_id);
      paidByOwner.set(owner, (paidByOwner.get(owner) || 0) + Number(tx.amount || 0));
      const sid = String(tx.subscription_id || "").trim();
      if (sid) paidBySubscription.set(sid, (paidBySubscription.get(sid) || 0) + Number(tx.amount || 0));
    }

    const ownerAuthIds = Array.from(new Set(historyRows.map((h) => resolveOwnerAuthId(String(h.user_id || ""))).filter(Boolean)));
    const accountNameByUser = new Map<string, string>();
    let authUsersForCodes: Array<{ id: string; created_at?: string | null; user_metadata?: Record<string, unknown> | null }> = [];
    try {
      const authUsers = await listAllAuthUsers(admin);
      authUsersForCodes = authUsers.map((u) => ({ id: u.id, created_at: u.created_at, user_metadata: u.user_metadata || null }));
      for (const u of authUsers) {
        const fullName =
          String((u.user_metadata?.full_name as string) || "").trim() ||
          [
            String((u.user_metadata?.first_name as string) || "").trim(),
            String((u.user_metadata?.last_name as string) || "").trim(),
          ]
            .filter(Boolean)
            .join(" ")
            .trim();
        if (fullName) accountNameByUser.set(u.id, fullName);
      }
    } catch {
      authUsersForCodes = [];
    }

    let activeProfilesByOwner = new Map<
      string,
      Array<{ profileId: string; profilePublicId: string | null; profileName: string }>
    >();
    if (ownerAuthIds.length > 0) {
      const profRes = await admin
        .from("profiles")
        .select("id, user_id, public_id, full_name")
        .in("user_id", ownerAuthIds)
        .is("deleted_at", null);
      const rows = (profRes.data || []) as Array<{ id?: string; user_id?: string; public_id?: string | null; full_name?: string }>;
      for (const p of rows) {
        const uid = String(p.user_id || "");
        const pid = String(p.id || "");
        if (!uid || !pid) continue;
        const next = activeProfilesByOwner.get(uid) || [];
        next.push({
          profileId: pid,
          profilePublicId: String(p.public_id || "").trim() || null,
          profileName: String(p.full_name || "Profile"),
        });
        activeProfilesByOwner.set(uid, next);
      }
    }

    const allOwnerProfileIds = Array.from(
      new Set(
        [...activeProfilesByOwner.values()]
          .flat()
          .map((p) => p.profileId)
          .filter(Boolean)
      )
    );
    const minStart = historyRows
      .map((h) => new Date(String(h.starts_at || "")).getTime())
      .filter((n) => Number.isFinite(n));
    const maxEnd = historyRows
      .map((h) => new Date(String(h.expires_at || "")).getTime())
      .filter((n) => Number.isFinite(n));
    const viewsByOwnerAndSub = new Map<string, number>();
    if (allOwnerProfileIds.length > 0 && minStart.length > 0 && maxEnd.length > 0) {
      const profileToOwner = new Map<string, string>();
      for (const [owner, profiles] of activeProfilesByOwner.entries()) {
        for (const p of profiles) profileToOwner.set(p.profileId, owner);
      }
      const { data: viewRows } = await admin
        .from("contact_views")
        .select("viewer_id, viewed_at")
        .in("viewer_id", allOwnerProfileIds)
        .gte("viewed_at", new Date(Math.min(...minStart)).toISOString())
        .lte("viewed_at", new Date(Math.max(...maxEnd)).toISOString())
        .limit(20000);
      const rows = (viewRows || []) as Array<{ viewer_id?: string; viewed_at?: string }>;
      for (const v of rows) {
        const pid = String(v.viewer_id || "");
        const owner = profileToOwner.get(pid);
        const viewedTs = new Date(String(v.viewed_at || "")).getTime();
        if (!owner || !Number.isFinite(viewedTs)) continue;
        for (const h of historyRows) {
          const hOwner = resolveOwnerAuthId(String(h.user_id || ""));
          if (hOwner !== owner) continue;
          const s = new Date(String(h.starts_at || "")).getTime();
          const e = new Date(String(h.expires_at || "")).getTime();
          if (!Number.isFinite(s) || !Number.isFinite(e)) continue;
          if (viewedTs < s || viewedTs > e) continue;
          const key = `${owner}:${String(h.id || "")}`;
          viewsByOwnerAndSub.set(key, (viewsByOwnerAndSub.get(key) || 0) + 1);
        }
      }
    }
    for (const h of historyRows) {
      const owner = resolveOwnerAuthId(String(h.user_id || ""));
      if (!owner) continue;
      const existing = summaryMap.get(owner) || {
        ownerAuthUserId: owner,
        ownerAccountCode: null,
        accountName: accountNameByUser.get(owner) || "User",
        activePlanName: "—",
        activePlanEndsAt: null,
        activeSubscriptionId: null,
        activeTotalContactViews: 0,
        activeDailyContactViewLimit: 0,
        activeNotes: null,
        previousPlansCount: 0,
        totalPlansCount: 0,
        totalPaidAmount: 0,
        activeProfiles: activeProfilesByOwner.get(owner) || [],
        history: [],
      };
      existing.totalPlansCount += 1;
      const starts = h.starts_at || "";
      const ends = h.expires_at || "";
      const isActiveNow =
        String(h.status || "") === "active" &&
        (!starts || starts <= now) &&
        (!ends || ends >= now);
      if (isActiveNow) {
        const nextEndsAt = ends || null;
        if (!existing.activePlanEndsAt || (nextEndsAt && nextEndsAt > existing.activePlanEndsAt)) {
          existing.activePlanName = planNameById.get(String(h.plan_id || "")) || "Plan";
          existing.activePlanEndsAt = nextEndsAt;
          existing.activeSubscriptionId = String((h as { id?: string }).id || "") || null;
          existing.activeTotalContactViews = Number((h as { total_contact_views_snapshot?: number }).total_contact_views_snapshot || 0);
          existing.activeDailyContactViewLimit = Number(
            (h as { daily_contact_view_limit_snapshot?: number }).daily_contact_view_limit_snapshot || 0
          );
          existing.activeNotes = null;
        }
      }
      const sid = String(h.id || "");
      existing.history.push({
        subscriptionId: sid,
        planName: planNameById.get(String(h.plan_id || "")) || "Plan",
        status: String(h.status || ""),
        startsAt: h.starts_at || null,
        expiresAt: h.expires_at || null,
        contactsAllowed: Number(h.total_contact_views_snapshot || 0),
        contactsTaken: viewsByOwnerAndSub.get(`${owner}:${sid}`) || 0,
        amountPaid: paidBySubscription.get(sid) || 0,
      });
      summaryMap.set(owner, existing);
    }
    let codeByUser = new Map<string, string>();
    try {
      codeByUser = await resolveAccountCodeMap(
        admin,
        authUsersForCodes.map((u) => ({ id: u.id, created_at: u.created_at }))
      );
    } catch {
      codeByUser = new Map<string, string>();
    }
    const memberSummaries = Array.from(summaryMap.values()).map((s) => {
      const totalPaidAmount = Number(paidByOwner.get(s.ownerAuthUserId) || 0);
      const previousPlansCount = Math.max(0, s.totalPlansCount - (s.activePlanName !== "—" ? 1 : 0));
      return {
        ...s,
        ownerAccountCode: codeByUser.get(s.ownerAuthUserId) || null,
        previousPlansCount,
        totalPaidAmount,
        ownerLabel:
          `${s.accountName}${(codeByUser.get(s.ownerAuthUserId) || "").trim() ? ` (${codeByUser.get(s.ownerAuthUserId)})` : ""}`,
      };
    });
    memberSummaries.sort((a, b) => {
      if (a.activePlanName !== "—" && b.activePlanName === "—") return -1;
      if (a.activePlanName === "—" && b.activePlanName !== "—") return 1;
      return b.totalPaidAmount - a.totalPaidAmount;
    });
    return NextResponse.json({
      plans,
      subscriptionsByPlan,
      recentSubscriptions,
      memberSummaries,
      totals: {
        activeSubscriptions: activeRows.length,
        expiringIn7Days: (expiringRes.data || []).length,
        totalCollected: collected,
      },
      setupWarning,
    });
  }

  return NextResponse.json({
    plans,
    subscriptionsByPlan,
    recentSubscriptions,
    memberSummaries: [],
    totals: {
      activeSubscriptions: activeRows.length,
      expiringIn7Days: (expiringRes.data || []).length,
      totalCollected: collected,
    },
    setupWarning,
  });
}
