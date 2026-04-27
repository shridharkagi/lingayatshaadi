"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { adminFetch } from "@/lib/api/adminClient";

type Plan = {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: number;
  currency: string;
  total_contact_views: number;
  daily_contact_view_limit: number;
  is_active: boolean;
  activeSubscribers?: number;
};
type SubscriptionsByPlanRow = {
  planId: string;
  planName: string;
  activeCount: number;
  catalogPlanId: string | null;
};
type RecentSubscriptionRow = {
  id: string;
  planName: string;
  status: string;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  totalContactViews?: number;
  dailyContactViewLimit?: number;
  memberLabel: string;
  userLinkId: string;
  subscriptionUserId?: string;
};
type MemberSummaryRow = {
  ownerAuthUserId: string;
  ownerAccountCode?: string | null;
  ownerLabel: string;
  activePlanName: string;
  activePlanEndsAt: string | null;
  activeSubscriptionId?: string | null;
  activeTotalContactViews?: number;
  activeDailyContactViewLimit?: number;
  previousPlansCount: number;
  totalPlansCount: number;
  totalPaidAmount: number;
};
type UpgradeRequest = {
  id: string;
  user_id: string;
  plan_name: string;
  plan_code?: string;
  plan_price: number;
  callback_number: string;
  note?: string;
  status: "new" | "contacted" | "closed";
  email_notification_status?: string;
  email_notification_error?: string;
  whatsapp_notification_status?: string;
  whatsapp_notification_error?: string;
  created_at: string;
  member_account_code?: string | null;
  member_full_name?: string | null;
};
type UserLookup = {
  userId: string | null;
  profileId: string | null;
  publicId: string | null;
  fullName: string;
  contact: string | null;
  accountCode?: string | null;
};

function addDays(yyyyMmDd: string, days: number): string {
  const base = new Date(`${yyyyMmDd}T00:00:00Z`);
  if (Number.isNaN(base.getTime())) return "";
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

export default function SuperAdminSubscriptionsPage() {
  const searchParams = useSearchParams();
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [upgradeRequests, setUpgradeRequests] = useState<UpgradeRequest[]>([]);
  const [busyPlanCode, setBusyPlanCode] = useState<string | null>(null);
  const [resolvingUser, setResolvingUser] = useState(false);
  const [resolvedUser, setResolvedUser] = useState<UserLookup | null>(null);
  const [userCandidates, setUserCandidates] = useState<UserLookup[]>([]);
  const [expiresEdited, setExpiresEdited] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [editingSub, setEditingSub] = useState<RecentSubscriptionRow | null>(null);
  const [savingSubEdit, setSavingSubEdit] = useState(false);
  const [memberSearch, setMemberSearch] = useState("");
  const [memberPlanFilter, setMemberPlanFilter] = useState("all");
  const [memberExpiryFilter, setMemberExpiryFilter] = useState<
    "all" | "expiring_7" | "expiring_30" | "expired" | "no_active"
  >("all");
  const [subEditForm, setSubEditForm] = useState({
    expiresAt: "",
    totalContactViews: "",
    dailyContactViewLimit: "",
    reason: "",
  });
  const [form, setForm] = useState({
    userQuery: "",
    userId: "",
    profileId: "",
    planId: "",
    paymentMode: "other",
    paymentModeDetails: "",
    payerSource: "",
    paymentMadeAt: new Date().toISOString().slice(0, 10),
    startImmediately: true,
    startsAt: new Date().toISOString().slice(0, 10),
    expiresAt: "",
    amount: "",
    transactionId: "",
    receiptRef: "",
    note: "",
    overrideTotalContactViews: "",
    overrideDailyContactViewLimit: "",
  });

  const load = async () => {
    setError(null);
    const [ovRes, planRes, reqRes] = await Promise.all([
      adminFetch("/api/superadmin/subscriptions/overview"),
      adminFetch("/api/superadmin/subscriptions/plans"),
      adminFetch("/api/superadmin/subscriptions/upgrade-requests"),
    ]);
    const safeJson = async <T,>(res: Response, fallback: T): Promise<T> => {
      try {
        return (await res.json()) as T;
      } catch {
        return fallback;
      }
    };
    const ovJson = await safeJson<Record<string, unknown>>(ovRes, {});
    const planJson = await safeJson<{ plans?: Plan[]; error?: string }>(planRes, {});
    const reqJson = await safeJson<{ requests?: UpgradeRequest[]; error?: string }>(reqRes, {});
    if (!ovRes.ok) setError(String(ovJson.error || `Failed to load overview (${ovRes.status})`));
    if (!planRes.ok) setError(planJson.error || `Failed to load plans (${planRes.status})`);
    if (!reqRes.ok) setError(reqJson.error || `Failed to load upgrade requests (${reqRes.status})`);
    setOverview(ovRes.ok ? ovJson : null);
    const basePlans = planJson.plans || [];
    if (ovRes.ok && Array.isArray(ovJson.plans)) {
      const countById = new Map(
        (ovJson.plans as Array<{ id?: string; activeSubscribers?: number }>).map((p) => [
          String(p.id || ""),
          Number(p.activeSubscribers || 0),
        ])
      );
      setPlans(basePlans.map((p) => ({ ...p, activeSubscribers: countById.get(p.id) ?? 0 })));
    } else {
      setPlans(basePlans);
    }
    setUpgradeRequests(reqJson?.requests || []);
  };

  useEffect(() => {
    void load();
  }, []);

  useEffect(() => {
    const userQuery = (searchParams.get("user") || "").trim();
    if (!userQuery) return;
    setForm((prev) => ({ ...prev, userQuery }));
    void resolveUser(userQuery);
  }, [searchParams]);

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === form.planId),
    [plans, form.planId]
  );

  useEffect(() => {
    if (!selectedPlan) return;
    const startDate = form.startImmediately ? new Date().toISOString().slice(0, 10) : form.startsAt;
    const amount = Number(selectedPlan.price || 0);
    const isFree = amount <= 0;
    setForm((prev) => ({
      ...prev,
      amount: String(amount),
      startsAt: prev.startsAt || startDate,
      expiresAt: expiresEdited ? prev.expiresAt : addDays(prev.startsAt || startDate, Number(selectedPlan.duration_days || 0)),
      paymentMode: isFree ? "free_auto" : prev.paymentMode === "free_auto" ? "other" : prev.paymentMode,
      transactionId:
        isFree && !prev.transactionId
          ? `FREE-${prev.userId || "user"}-${Date.now().toString(36).toUpperCase()}`
          : prev.transactionId,
      overrideTotalContactViews: prev.overrideTotalContactViews || String(selectedPlan.total_contact_views || 0),
      overrideDailyContactViewLimit:
        prev.overrideDailyContactViewLimit || String(selectedPlan.daily_contact_view_limit || 0),
    }));
  }, [selectedPlan, form.startImmediately, expiresEdited]);

  useEffect(() => {
    if (!selectedPlan) return;
    if (expiresEdited) return;
    setForm((prev) => ({
      ...prev,
      expiresAt: addDays(prev.startsAt, Number(selectedPlan.duration_days || 0)),
    }));
  }, [form.startsAt, selectedPlan, expiresEdited]);

  /** Returns the chosen profile row, or null. Updates UI state like before. */
  const resolveUser = async (queryRaw: string): Promise<UserLookup | null> => {
    const query = queryRaw.trim();
    if (!query) {
      setResolvedUser(null);
      setUserCandidates([]);
      return null;
    }
    setResolvingUser(true);
    try {
      const res = await adminFetch(`/api/superadmin/subscriptions/user-lookup?q=${encodeURIComponent(query)}`);
      let json: { users?: UserLookup[]; error?: string };
      try {
        json = (await res.json()) as { users?: UserLookup[]; error?: string };
      } catch {
        setError("Invalid response from user lookup.");
        setResolvedUser(null);
        setUserCandidates([]);
        return null;
      }
      if (!res.ok) {
        setError(json.error || "Failed to resolve user");
        setResolvedUser(null);
        setUserCandidates([]);
        return null;
      }
      const users = json.users || [];
      setUserCandidates(users);
      const exact = users.find(
        (u) =>
          (u.publicId || "").toLowerCase() === query.toLowerCase() ||
          (u.userId || "").toLowerCase() === query.toLowerCase()
      );
      const chosen = exact || users[0] || null;
      setResolvedUser(chosen);
      setForm((prev) => ({
        ...prev,
        userId: chosen?.userId || "",
        profileId: chosen?.profileId || prev.profileId,
        payerSource: prev.payerSource || chosen?.contact || "",
      }));
      return chosen;
    } finally {
      setResolvingUser(false);
    }
  };

  const assignManual = async () => {
    setError(null);
    setAssigning(true);
    try {
      let userId = form.userId.trim();
      let profileId = form.profileId.trim();
      if (!userId && form.userQuery.trim()) {
        const chosen = await resolveUser(form.userQuery);
        userId = (chosen?.userId || "").trim();
        profileId = (chosen?.profileId || profileId).trim();
      }
      if (!userId) {
        setError("Please enter a valid Member/User ID. Tab out of the field or wait for the name to appear, then try again.");
        return;
      }
      if (!form.planId) {
        setError("Please select a plan.");
        return;
      }
      const res = await adminFetch("/api/superadmin/subscriptions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          profileId: profileId || undefined,
          planId: form.planId,
          paymentMode: form.paymentMode || undefined,
          paymentModeDetails: form.paymentModeDetails || undefined,
          payerSource: form.payerSource || undefined,
          paymentMadeAt: form.paymentMadeAt ? `${form.paymentMadeAt}T00:00:00.000Z` : undefined,
          startsAt: form.startsAt ? `${form.startsAt}T00:00:00.000Z` : undefined,
          expiresAt: form.expiresAt ? `${form.expiresAt}T00:00:00.000Z` : undefined,
          startImmediately: form.startImmediately,
          amount: Number(form.amount || 0),
          transactionId: form.transactionId || undefined,
          receiptRef: form.receiptRef || undefined,
          note: form.note || undefined,
          overrideTotalContactViews: Number(form.overrideTotalContactViews || 0),
          overrideDailyContactViewLimit: Number(form.overrideDailyContactViewLimit || 0),
        }),
      });
      let json: { error?: string };
      try {
        json = (await res.json()) as { error?: string };
      } catch {
        setError(`Assignment failed (${res.status}). The server did not return JSON.`);
        return;
      }
      if (!res.ok) {
        setError(json.error || "Failed to assign subscription");
        return;
      }
      setForm({
        userQuery: "",
        userId: "",
        profileId: "",
        planId: "",
        paymentMode: "other",
        paymentModeDetails: "",
        payerSource: "",
        paymentMadeAt: new Date().toISOString().slice(0, 10),
        startImmediately: true,
        startsAt: new Date().toISOString().slice(0, 10),
        expiresAt: "",
        amount: "",
        transactionId: "",
        receiptRef: "",
        note: "",
        overrideTotalContactViews: "",
        overrideDailyContactViewLimit: "",
      });
      setResolvedUser(null);
      setUserCandidates([]);
      setExpiresEdited(false);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Assignment request failed");
    } finally {
      setAssigning(false);
    }
  };

  const savePlan = async (plan: Plan) => {
    setBusyPlanCode(plan.code);
    const res = await adminFetch("/api/superadmin/subscriptions/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: plan.id,
        code: plan.code,
        name: plan.name,
        durationDays: Number(plan.duration_days || 0),
        price: Number(plan.price || 0),
        currency: plan.currency || "INR",
        totalContactViews: Number(plan.total_contact_views || 0),
        dailyContactViewLimit: Number(plan.daily_contact_view_limit || 0),
        isActive: plan.is_active,
        features: [],
      }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) setError(json.error || `Failed to update ${plan.name}`);
    await load();
    setBusyPlanCode(null);
  };

  const totals = useMemo(
    () =>
      (overview?.totals as { activeSubscriptions?: number; expiringIn7Days?: number; totalCollected?: number } | undefined) ||
      {},
    [overview]
  );
  const subscriptionsByPlan = useMemo(
    () => (overview?.subscriptionsByPlan as SubscriptionsByPlanRow[] | undefined) || [],
    [overview]
  );
  const recentSubscriptions = useMemo(
    () => (overview?.recentSubscriptions as RecentSubscriptionRow[] | undefined) || [],
    [overview]
  );
  const memberSummaries = useMemo(
    () => (overview?.memberSummaries as MemberSummaryRow[] | undefined) || [],
    [overview]
  );
  const memberPlanOptions = useMemo(() => {
    const set = new Set<string>();
    memberSummaries.forEach((m) => {
      const name = String(m.activePlanName || "—").trim();
      if (!name || name === "—") return;
      set.add(name);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [memberSummaries]);
  const filteredMemberSummaries = useMemo(() => {
    const now = Date.now();
    const dayMs = 86400000;
    const q = memberSearch.trim().toLowerCase();
    return memberSummaries.filter((m) => {
      if (q) {
        const hay = `${m.ownerAccountCode || ""} ${m.ownerLabel || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (memberPlanFilter !== "all" && m.activePlanName !== memberPlanFilter) return false;
      const endsAtMs = m.activePlanEndsAt ? new Date(m.activePlanEndsAt).getTime() : NaN;
      const hasActive = !!m.activeSubscriptionId && !!m.activePlanEndsAt && Number.isFinite(endsAtMs) && endsAtMs >= now;
      if (memberExpiryFilter === "no_active") return !hasActive;
      if (memberExpiryFilter === "expired") return !!m.activePlanEndsAt && Number.isFinite(endsAtMs) && endsAtMs < now;
      if (memberExpiryFilter === "expiring_7")
        return hasActive && endsAtMs <= now + 7 * dayMs;
      if (memberExpiryFilter === "expiring_30")
        return hasActive && endsAtMs <= now + 30 * dayMs;
      return true;
    });
  }, [memberSummaries, memberSearch, memberPlanFilter, memberExpiryFilter]);
  const fmtIn = (iso?: string | null) =>
    iso ? new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
  const toDateInput = (iso?: string | null) => (iso ? new Date(iso).toISOString().slice(0, 10) : "");

  const openEditSubscription = (sub: RecentSubscriptionRow) => {
    setEditingSub(sub);
    setSubEditForm({
      expiresAt: toDateInput(sub.expiresAt),
      totalContactViews: String(sub.totalContactViews || 0),
      dailyContactViewLimit: String(sub.dailyContactViewLimit || 0),
      reason: "",
    });
  };
  const openEditFromSummary = (m: MemberSummaryRow) => {
    if (!m.activeSubscriptionId) {
      setError("No active subscription found to edit for this member.");
      return;
    }
    openEditSubscription({
      id: m.activeSubscriptionId,
      planName: m.activePlanName || "Plan",
      status: "active",
      startsAt: null,
      expiresAt: m.activePlanEndsAt || null,
      createdAt: null,
      totalContactViews: Number(m.activeTotalContactViews || 0),
      dailyContactViewLimit: Number(m.activeDailyContactViewLimit || 0),
      memberLabel: m.ownerLabel || m.ownerAccountCode || "Member",
      userLinkId: m.ownerAuthUserId,
      subscriptionUserId: m.ownerAuthUserId,
    });
  };

  const saveSubscriptionEdit = async () => {
    if (!editingSub) return;
    if (!subEditForm.reason.trim()) {
      setError("Reason is required to edit a user subscription.");
      return;
    }
    setSavingSubEdit(true);
    setError(null);
    const res = await adminFetch("/api/superadmin/subscriptions/adjust", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscriptionId: editingSub.id,
        expiresAt: subEditForm.expiresAt ? `${subEditForm.expiresAt}T00:00:00.000Z` : undefined,
        totalContactViews: Number(subEditForm.totalContactViews || 0),
        dailyContactViewLimit: Number(subEditForm.dailyContactViewLimit || 0),
        reason: subEditForm.reason.trim(),
      }),
    });
    const json = (await res.json()) as { error?: string };
    setSavingSubEdit(false);
    if (!res.ok) {
      setError(json.error || "Failed to update subscription");
      return;
    }
    setEditingSub(null);
    setSubEditForm({ expiresAt: "", totalContactViews: "", dailyContactViewLimit: "", reason: "" });
    await load();
  };

  const updateUpgradeStatus = async (id: string, status: UpgradeRequest["status"]) => {
    const res = await adminFetch("/api/superadmin/subscriptions/upgrade-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    const json = (await res.json()) as { error?: string };
    if (!res.ok) setError(json.error || "Failed to update request");
    else await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
      <p className="text-gray-500 mt-1">Manual subscription assignment and plan controls</p>
      <p className="text-sm text-gray-600 mt-2">
        To see which accounts have a plan and how much they have paid in total, open{" "}
        <Link href="/superadmin/users" className="text-[var(--primary)] font-medium underline">
          Users (Account Owners)
        </Link>
        — columns <span className="font-medium">Current plan</span> and <span className="font-medium">Total paid</span>.
      </p>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Active subscriptions</p>
          <p className="text-2xl font-bold">{totals.activeSubscriptions || 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Expiring in 7 days</p>
          <p className="text-2xl font-bold">{totals.expiringIn7Days || 0}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-xs text-gray-500">Collected payments</p>
          <p className="text-2xl font-bold">Rs {Number(totals.totalCollected || 0).toLocaleString()}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Active members by plan</h2>
          <p className="text-xs text-gray-500 mt-1">
            Counts from <code className="text-[11px]">user_subscriptions</code> (raw plan ids). Legacy membership plan ids are
            shown separately when they differ from catalog UUIDs.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-2">Plan</th>
                  <th className="py-2 pr-2">Active</th>
                  <th className="py-2">Catalog link</th>
                </tr>
              </thead>
              <tbody>
                {subscriptionsByPlan.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-gray-500">
                      No active subscriptions.
                    </td>
                  </tr>
                ) : (
                  subscriptionsByPlan.map((row) => (
                    <tr key={row.planId} className="border-b border-gray-100">
                      <td className="py-2 pr-2 font-medium text-gray-900">{row.planName}</td>
                      <td className="py-2 pr-2">{row.activeCount}</td>
                      <td className="py-2 text-gray-500">
                        {row.catalogPlanId ? (
                          <span className="text-emerald-700">Maps to catalog</span>
                        ) : (
                          <span>Legacy / other id</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
        <div className="rounded-xl border bg-white p-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent subscriptions</h2>
          <p className="text-xs text-gray-500 mt-1">Latest rows by created time (up to 25).</p>
          <div className="mt-3 overflow-x-auto max-h-[320px] overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b text-left text-gray-500">
                <tr>
                  <th className="py-2 pr-2">Member</th>
                  <th className="py-2 pr-2">Plan</th>
                  <th className="py-2 pr-2">Status</th>
                  <th className="py-2 pr-2">Ends</th>
                  <th className="py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentSubscriptions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-gray-500">
                      No subscription rows yet.
                    </td>
                  </tr>
                ) : (
                  recentSubscriptions.map((r) => (
                    <tr key={r.id} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-2">
                        <span className="text-gray-900">{r.memberLabel}</span>
                      </td>
                      <td className="py-2 pr-2">{r.planName}</td>
                      <td className="py-2 pr-2 capitalize">{r.status}</td>
                      <td className="py-2 pr-2 whitespace-nowrap">{fmtIn(r.expiresAt)}</td>
                      <td className="py-2">
                        <button
                          type="button"
                          onClick={() => openEditSubscription(r)}
                          className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium hover:bg-gray-50"
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border bg-white p-5">
        <h2 className="text-lg font-semibold text-gray-900">Subscribed members dashboard</h2>
        <p className="text-xs text-gray-500 mt-1">
          Account-level details of active subscribers, previous plans and total paid amount.
        </p>
        <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            placeholder="Search by Account ID or name"
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
          />
          <select
            value={memberPlanFilter}
            onChange={(e) => setMemberPlanFilter(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="all">All plans</option>
            {memberPlanOptions.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <select
            value={memberExpiryFilter}
            onChange={(e) => setMemberExpiryFilter(e.target.value as typeof memberExpiryFilter)}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs"
          >
            <option value="all">All expiry states</option>
            <option value="expiring_7">Expiring in 7 days</option>
            <option value="expiring_30">Expiring in 30 days</option>
            <option value="expired">Expired</option>
            <option value="no_active">No active plan</option>
          </select>
          <button
            type="button"
            onClick={() => {
              setMemberSearch("");
              setMemberPlanFilter("all");
              setMemberExpiryFilter("all");
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium hover:bg-gray-50"
          >
            Reset filters
          </button>
        </div>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-gray-500">
                <th className="py-2 pr-3">Account ID</th>
                <th className="py-2 pr-3">Member</th>
                <th className="py-2 pr-3">Current plan</th>
                <th className="py-2 pr-3">Expires</th>
                <th className="py-2 pr-3">Previous plans</th>
                <th className="py-2 pr-3">Total plans</th>
                <th className="py-2 pr-3">Total paid</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredMemberSummaries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-4 text-gray-500">
                    No subscribed member summary available yet.
                  </td>
                </tr>
              ) : (
                filteredMemberSummaries.map((m) => (
                  <tr key={m.ownerAuthUserId} className="border-b border-gray-100">
                    <td className="py-2 pr-3 font-medium text-gray-900">{m.ownerAccountCode || "—"}</td>
                    <td className="py-2 pr-3 font-medium text-gray-900">{m.ownerLabel}</td>
                    <td className="py-2 pr-3">{m.activePlanName}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{fmtIn(m.activePlanEndsAt)}</td>
                    <td className="py-2 pr-3">{m.previousPlansCount}</td>
                    <td className="py-2 pr-3">{m.totalPlansCount}</td>
                    <td className="py-2 pr-3">₹{Number(m.totalPaidAmount || 0).toLocaleString("en-IN")}</td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() => openEditFromSummary(m)}
                        disabled={!m.activeSubscriptionId}
                        className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        title={m.activeSubscriptionId ? "Edit active subscription" : "No active subscription"}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan) => {
          return (
            <div key={String(plan.id)} className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <input
                value={plan.name}
                onChange={(e) =>
                  setPlans((prev) =>
                    prev.map((p) => (p.id === plan.id ? { ...p, name: e.target.value } : p))
                  )
                }
                className="w-full rounded-lg border border-gray-200 px-3 py-2 font-semibold text-gray-900"
              />
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <label className="text-gray-600">
                  Price
                  <input
                    type="number"
                    value={plan.price}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev.map((p) => (p.id === plan.id ? { ...p, price: Number(e.target.value || 0) } : p))
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                </label>
                <label className="text-gray-600">
                  Days
                  <input
                    type="number"
                    value={plan.duration_days}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev.map((p) =>
                          p.id === plan.id ? { ...p, duration_days: Number(e.target.value || 0) } : p
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                </label>
                <label className="text-gray-600">
                  Total views
                  <input
                    type="number"
                    value={plan.total_contact_views}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev.map((p) =>
                          p.id === plan.id ? { ...p, total_contact_views: Number(e.target.value || 0) } : p
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                </label>
                <label className="text-gray-600">
                  Daily limit
                  <input
                    type="number"
                    value={plan.daily_contact_view_limit}
                    onChange={(e) =>
                      setPlans((prev) =>
                        prev.map((p) =>
                          p.id === plan.id
                            ? { ...p, daily_contact_view_limit: Number(e.target.value || 0) }
                            : p
                        )
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-200 px-2 py-1.5"
                  />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={plan.is_active}
                  onChange={(e) =>
                    setPlans((prev) =>
                      prev.map((p) => (p.id === plan.id ? { ...p, is_active: e.target.checked } : p))
                    )
                  }
                />
                Visible for new users
              </label>
              <p className="mt-2 text-xs text-gray-600">
                <span className="font-semibold text-gray-800">Active members (catalog):</span>{" "}
                {Number(plan.activeSubscribers ?? 0)}
              </p>
              <button
                onClick={() => savePlan(plan)}
                className="mt-4 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
              >
                {busyPlanCode === plan.code ? "Saving..." : "Save Plan"}
              </button>
            </div>
          );
        })}
      </div>
      <div className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Manual assignment (offline payments)</h2>
        <p className="text-sm text-gray-500 mt-1">Collect payment offline and activate plan with transaction details.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={form.userQuery}
              placeholder="Member/User ID (ex: U26045 / LS...)"
              onChange={(e) => setForm((s) => ({ ...s, userQuery: e.target.value }))}
              onBlur={() => {
                void resolveUser(form.userQuery);
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
            />
            <input
              value={resolvedUser ? `${resolvedUser.fullName}${resolvedUser.publicId ? ` (${resolvedUser.publicId})` : ""}` : resolvingUser ? "Resolving..." : ""}
              placeholder="Name auto-populates"
              readOnly
              className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm"
            />
            {resolvedUser && (
              <p className="text-xs text-gray-500 md:col-span-2">
                Resolved user: {resolvedUser.fullName}
                {resolvedUser.accountCode ? ` | ${resolvedUser.accountCode}` : ""}
                {resolvedUser.publicId ? ` | ${resolvedUser.publicId}` : ""}
              </p>
            )}
            {userCandidates.length > 1 && (
              <select
                value={resolvedUser?.profileId || ""}
                onChange={(e) => {
                  const chosen = userCandidates.find((u) => u.profileId === e.target.value) || null;
                  setResolvedUser(chosen);
                  setForm((s) => ({
                    ...s,
                    userId: chosen?.userId || "",
                    profileId: chosen?.profileId || "",
                  }));
                }}
                className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2"
              >
                {userCandidates.map((u) => (
                  <option key={String(u.profileId)} value={String(u.profileId || "")}>
                    {u.fullName} {u.publicId ? `(${u.publicId})` : ""}
                  </option>
                ))}
              </select>
            )}
          </div>
          <select value={form.planId} onChange={(e) => setForm((s) => ({ ...s, planId: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="">Select plan</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <select value={form.paymentMode} onChange={(e) => setForm((s) => ({ ...s, paymentMode: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
            <option value="phonepe">PhonePe</option>
            <option value="gpay">G-Pay</option>
            <option value="bank_transfer">Bank transfer</option>
            <option value="check">Check</option>
            <option value="cash">Cash</option>
            <option value="other">Other</option>
            <option value="free_auto">Free Auto</option>
          </select>
          <input value={form.paymentModeDetails} placeholder="other payment details" onChange={(e) => setForm((s) => ({ ...s, paymentModeDetails: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={form.payerSource} placeholder="payment made from number/account" onChange={(e) => setForm((s) => ({ ...s, payerSource: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input type="date" value={form.paymentMadeAt} onChange={(e) => setForm((s) => ({ ...s, paymentMadeAt: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input type="checkbox" checked={form.startImmediately} onChange={(e) => setForm((s) => ({ ...s, startImmediately: e.target.checked }))} />
            Start immediately
          </label>
          <input
            type="date"
            value={form.startsAt}
            onChange={(e) => setForm((s) => ({ ...s, startsAt: e.target.value }))}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input
            type="date"
            value={form.expiresAt}
            onChange={(e) => {
              setExpiresEdited(true);
              setForm((s) => ({ ...s, expiresAt: e.target.value }));
            }}
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
          <input value={form.amount} placeholder="amount" onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={form.transactionId} placeholder="transactionId" onChange={(e) => setForm((s) => ({ ...s, transactionId: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={form.receiptRef} placeholder="receiptRef" onChange={(e) => setForm((s) => ({ ...s, receiptRef: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={form.overrideTotalContactViews} placeholder="allowed total contacts" onChange={(e) => setForm((s) => ({ ...s, overrideTotalContactViews: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={form.overrideDailyContactViewLimit} placeholder="allowed daily contacts" onChange={(e) => setForm((s) => ({ ...s, overrideDailyContactViewLimit: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm" />
          <input value={form.note} placeholder="note" onChange={(e) => setForm((s) => ({ ...s, note: e.target.value }))} className="rounded-lg border border-gray-200 px-3 py-2 text-sm md:col-span-2" />
        </div>
        <button
          type="button"
          onClick={() => void assignManual()}
          disabled={assigning || resolvingUser}
          className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-white text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {assigning ? "Assigning…" : "Assign subscription"}
        </button>
      </div>

      {editingSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-lg rounded-xl border bg-white p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Edit user subscription</h3>
            <p className="text-xs text-gray-500 mt-1">
              {editingSub.memberLabel} — {editingSub.planName}
            </p>
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="text-sm text-gray-600">
                Expiry date
                <input
                  type="date"
                  value={subEditForm.expiresAt}
                  onChange={(e) => setSubEditForm((s) => ({ ...s, expiresAt: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-600">
                Total contact limit
                <input
                  type="number"
                  value={subEditForm.totalContactViews}
                  onChange={(e) => setSubEditForm((s) => ({ ...s, totalContactViews: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-600">
                Daily contact limit
                <input
                  type="number"
                  value={subEditForm.dailyContactViewLimit}
                  onChange={(e) => setSubEditForm((s) => ({ ...s, dailyContactViewLimit: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="text-sm text-gray-600 sm:col-span-2">
                Reason (required)
                <input
                  value={subEditForm.reason}
                  onChange={(e) => setSubEditForm((s) => ({ ...s, reason: e.target.value }))}
                  placeholder="Reason for this change"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              To switch the member to another plan, use Manual assignment and assign a new plan row.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingSub(null)}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void saveSubscriptionEdit()}
                disabled={savingSubEdit}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              >
                {savingSubEdit ? "Saving..." : "Save changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 rounded-xl border bg-white p-6">
        <h2 className="text-lg font-semibold">Upgrade Requests</h2>
        <p className="text-sm text-gray-500 mt-1">Requests submitted from membership page.</p>
        <div className="mt-4 space-y-3">
          {upgradeRequests.length === 0 ? (
            <p className="text-sm text-gray-500">No upgrade requests yet.</p>
          ) : (
            upgradeRequests.map((r) => (
              <div key={r.id} className="rounded-lg border border-gray-200 p-3">
                <p className="text-sm font-semibold text-gray-900">
                  {r.plan_name} (₹{Number(r.plan_price || 0)})
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  User: {r.member_account_code || r.user_id.slice(0, 8) + "…"} | {r.member_full_name || "—"} |
                  Callback: {r.callback_number}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Requested: {new Date(r.created_at).toLocaleString("en-IN")}
                </p>
                {r.note && <p className="text-xs text-gray-600 mt-1">Note: {r.note}</p>}
                <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                  <span className={`rounded-full px-2 py-0.5 ${
                    r.email_notification_status === "sent" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    Email: {r.email_notification_status || "pending"}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 ${
                    r.whatsapp_notification_status === "sent" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    WhatsApp: {r.whatsapp_notification_status || "pending"}
                  </span>
                </div>
                {r.email_notification_error && (
                  <p className="text-[11px] text-amber-700 mt-1">Email error: {r.email_notification_error}</p>
                )}
                {r.whatsapp_notification_error && (
                  <p className="text-[11px] text-amber-700 mt-1">WhatsApp error: {r.whatsapp_notification_error}</p>
                )}
                <div className="mt-2 flex gap-2">
                  {(["new", "contacted", "closed"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => updateUpgradeStatus(r.id, s)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium border ${
                        r.status === s
                          ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                          : "bg-white text-gray-600 border-gray-200"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
