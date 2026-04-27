"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";

type Range = "all" | "today" | "last7" | "last30" | "this_month";
type AccountRow = {
  id: string;
  accountCode?: string;
  accountHolderName?: string | null;
  email?: string | null;
  phone?: string | null;
  createdAt?: string | null;
  lastActivityAt?: string | null;
  contactViewsCount?: number;
  savedProfilesCount?: number;
  sentInterestsCount?: number;
  profileCount: number;
  publishedCount: number;
  pendingCount: number;
  currentPlanSummary?: string | null;
  currentPlanName?: string | null;
  currentPlanExpiresAt?: string | null;
  currentPlanStatus?: string | null;
  totalPaidInr?: number;
  profiles: Array<Record<string, unknown>>;
  activity?: {
    profileViews: Array<Record<string, unknown>>;
    contactViews: Array<Record<string, unknown>>;
    savedProfiles: Array<Record<string, unknown>>;
    sentInterests: Array<Record<string, unknown>>;
  };
};

export default function SuperAdminUsersPage() {
  const [rows, setRows] = useState<AccountRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [signupRange, setSignupRange] = useState<Range>("all");
  const [activityRange, setActivityRange] = useState<Range>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [activityUserId, setActivityUserId] = useState<string | null>(null);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityData, setActivityData] = useState<AccountRow | null>(null);
  const [activitySection, setActivitySection] = useState<"all" | "contact" | "saved" | "sent">("all");
  const [transferProfileId, setTransferProfileId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      signupRange,
      activityRange,
      ...(customFrom ? { customFrom } : {}),
      ...(customTo ? { customTo } : {}),
    });
    const res = await adminFetch(`/api/superadmin/users?${qs.toString()}`);
    const json = (await res.json()) as { users?: AccountRow[]; error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to load users");
      setRows([]);
    } else {
      setRows(json.users || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [signupRange, activityRange, customFrom, customTo]);

  const fmt = (dt?: string | null) => (dt ? new Date(dt).toLocaleDateString() : "-");
  const toSlug = (publicId: string, fullName: string, fallbackId: string) => {
    const base = (publicId || fallbackId).toLowerCase();
    const first = (fullName || "profile").trim().split(/\s+/)[0] || "profile";
    const name = first.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "profile";
    return `${base}-${name}`;
  };
  const profileStatus = (p: Record<string, unknown>) =>
    String(p.profile_status || p.moderation_status || (Boolean(p.verified) ? "verified" : "pending"));
  const openActivity = async (uid: string, section: "all" | "contact" | "saved" | "sent" = "all") => {
    setActivitySection(section);
    setActivityUserId(uid);
    setActivityLoading(true);
    const res = await adminFetch(`/api/superadmin/users?userId=${uid}`);
    const json = (await res.json()) as { user?: AccountRow; error?: string };
    setActivityLoading(false);
    if (!res.ok || !json.user) {
      setError(json.error || "Failed to load activity");
      return;
    }
    setActivityData(json.user);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users (Account Owners)</h1>
          <p className="text-gray-500 mt-1">
            Auth users who created accounts, with their profile counts. Active plan and total paid (paid transactions
            only) are evaluated strictly at account level.
          </p>
        </div>
        <Link
          href="/superadmin/users/create"
          className="px-4 py-2 bg-[var(--primary)] text-white rounded-lg font-medium hover:bg-[var(--primary)]/90 transition"
        >
          Add Profile
        </Link>
      </div>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      <div className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2">
        <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Signups</span>
        {([
          { key: "today", label: "Today" },
          { key: "last7", label: "Last 7 days" },
          { key: "last30", label: "Last 30 days" },
          { key: "this_month", label: "This month" },
          { key: "all", label: "Custom/All" },
        ] as Array<{ key: Range; label: string }>).map((r) => (
          <button
            key={r.key}
            onClick={() => setSignupRange(r.key)}
            className={`rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${
              signupRange === r.key ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10" : "border-gray-300 text-gray-600"
            }`}
          >
            {r.label}
          </button>
        ))}
        <span className="ml-2 text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Last activity</span>
        {([
          { key: "today", label: "Today" },
          { key: "last7", label: "Last 7 days" },
          { key: "last30", label: "Last 30 days" },
          { key: "this_month", label: "This month" },
          { key: "all", label: "Custom/All" },
        ] as Array<{ key: Range; label: string }>).map((r) => (
          <button
            key={r.key}
            onClick={() => setActivityRange(r.key)}
            className={`rounded-full border px-2 py-0.5 text-[11px] whitespace-nowrap ${
              activityRange === r.key ? "border-[var(--primary)] text-[var(--primary)] bg-[var(--primary)]/10" : "border-gray-300 text-gray-600"
            }`}
          >
            {r.label}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <input
            type="date"
            value={customFrom}
            onChange={(e) => setCustomFrom(e.target.value)}
            className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px]"
          />
          <span className="text-[11px] text-gray-400">to</span>
          <input
            type="date"
            value={customTo}
            onChange={(e) => setCustomTo(e.target.value)}
            className="rounded border border-gray-300 px-1.5 py-0.5 text-[11px]"
          />
        </div>
        </div>
      </div>

      <div className="mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 text-xs text-gray-600">
          Showing {rows.length} account users
        </div>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[1480px] text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Account ID</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Account Holder</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Current plan</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Total paid (₹)</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Contact No</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Last Activity</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Contact Views</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Saved</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Sent</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Profiles</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Pub / Pen</th>
              <th className="text-left px-3 py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={14} className="px-6 py-10 text-center text-gray-500">Loading users…</td>
              </tr>
            ) : rows.map((u) => (
              <Fragment key={u.id}>
                <tr key={u.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-2.5 py-2.5 text-xs font-semibold text-[var(--primary)] whitespace-nowrap">{u.accountCode || "-"}</td>
                  <td className="px-2.5 py-2.5 text-xs">{u.accountHolderName || "-"}</td>
                  <td className="px-2.5 py-2.5 text-xs max-w-[220px]" title={u.currentPlanSummary || ""}>
                    {u.currentPlanSummary ? (
                      <span className="text-gray-800">{u.currentPlanSummary}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap font-medium text-gray-800">
                    ₹{Number(u.totalPaidInr ?? 0).toLocaleString("en-IN")}
                  </td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">{u.phone || "-"}</td>
                  <td className="px-2.5 py-2.5 text-xs max-w-[180px] truncate" title={u.email || "-"}>
                    {u.email || "-"}
                  </td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">{fmt(u.createdAt)}</td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">{fmt(u.lastActivityAt)}</td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">
                    <button onClick={() => void openActivity(u.id, "contact")} className="text-[var(--primary)] hover:underline">
                      {u.contactViewsCount || 0}
                    </button>
                  </td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">
                    <button onClick={() => void openActivity(u.id, "saved")} className="text-[var(--primary)] hover:underline">
                      {u.savedProfilesCount || 0}
                    </button>
                  </td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">
                    <button onClick={() => void openActivity(u.id, "sent")} className="text-[var(--primary)] hover:underline">
                      {u.sentInterestsCount || 0}
                    </button>
                  </td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">{u.profileCount}</td>
                  <td className="px-2.5 py-2.5 text-xs whitespace-nowrap">{u.publishedCount} / {u.pendingCount}</td>
                  <td className="px-2.5 py-2.5 flex gap-2 whitespace-nowrap">
                    <button
                      onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                      className="text-[var(--primary)] text-sm font-medium hover:underline"
                    >
                      {expandedUserId === u.id ? "Hide Profiles" : "View Profiles"}
                    </button>
                    <button onClick={() => void openActivity(u.id)} className="text-[var(--primary)] text-sm font-medium hover:underline">
                      Activity
                    </button>
                    <Link
                      href={`/superadmin/subscriptions?user=${encodeURIComponent(u.accountCode || u.id)}&openEditCurrent=1`}
                      className="text-[var(--primary)] text-sm font-medium hover:underline"
                    >
                      Edit Plan
                    </Link>
                  </td>
                </tr>
                {expandedUserId === u.id && (
                  <tr className="bg-gray-50 border-t border-gray-100">
                    <td colSpan={14} className="px-6 py-4">
                      <p className="text-xs text-gray-500 mb-2">Profiles under this account</p>
                      <div className="space-y-2">
                        {u.profiles.length === 0 ? (
                          <p className="text-sm text-gray-500">No profiles created yet.</p>
                        ) : (
                          u.profiles.map((p) => (
                            <div key={String(p.id)} className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
                              <div>
                                <p className="text-sm font-medium">{String(p.full_name || "Unknown")}</p>
                                <p className="text-xs text-gray-500">{String(p.public_id || p.id)}</p>
                                <p className="text-xs text-gray-500 capitalize">Status: {profileStatus(p)}</p>
                              </div>
                              <div className="flex gap-3">
                                <Link
                                  href={`/profile/${toSlug(String(p.public_id || ""), String(p.full_name || ""), String(p.id || ""))}?preview=admin`}
                                  className="text-[var(--primary)] text-sm font-medium hover:underline"
                                >
                                  View
                                </Link>
                                <Link href={`/superadmin/users/${String(p.id)}/edit`} className="text-[var(--primary)] text-sm font-medium hover:underline">
                                  Edit
                                </Link>
                                <Link href="/superadmin/review-center" className="text-[var(--primary)] text-sm font-medium hover:underline">
                                  Review Center
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => setTransferProfileId(String(p.id || ""))}
                                  className="text-indigo-700 text-sm font-medium hover:underline"
                                >
                                  Transfer
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
      </div>
      {activityUserId && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white p-5 max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">User Activity</h3>
              <button onClick={() => { setActivityUserId(null); setActivityData(null); }} className="text-sm text-gray-500 hover:text-gray-700">Close</button>
            </div>
            {activityLoading || !activityData ? (
              <p className="text-sm text-gray-500">Loading activity…</p>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-200 p-3 text-sm">
                  <p><span className="font-medium">Account ID:</span> {activityData.accountCode || "-"}</p>
                  <p><span className="font-medium">Account:</span> {activityData.accountHolderName || "-"}</p>
                  <p><span className="font-medium">Contact views:</span> {activityData.contactViewsCount || 0}</p>
                  <p><span className="font-medium">Saved profiles:</span> {activityData.savedProfilesCount || 0}</p>
                  <p><span className="font-medium">Sent interests:</span> {activityData.sentInterestsCount || 0}</p>
                  <p><span className="font-medium">Last activity:</span> {fmt(activityData.lastActivityAt)}</p>
                  <p>
                    <span className="font-medium">Current plan:</span>{" "}
                    {activityData.currentPlanSummary || "— (no active subscription)"}
                  </p>
                  <p>
                    <span className="font-medium">Total paid (paid txns):</span> ₹
                    {Number(activityData.totalPaidInr ?? 0).toLocaleString("en-IN")}
                  </p>
                </div>
                {(activitySection === "all" || activitySection === "contact") && (
                <div>
                  <p className="text-sm font-semibold mb-2">Contacts viewed</p>
                  <div className="space-y-2">
                    {(activityData.activity?.contactViews || []).slice(0, 25).map((e, i) => (
                      <div key={`cv-${i}`} className="rounded border border-gray-200 p-2 text-xs">
                        {String(e.viewed_name || "Unknown")} ({String(e.viewed_public_id || "-")}) - {fmt(String(e.viewed_at || ""))}
                      </div>
                    ))}
                    {(activityData.activity?.contactViews || []).length === 0 && <p className="text-xs text-gray-500">No contact-view activity.</p>}
                  </div>
                </div>
                )}
                {(activitySection === "all" || activitySection === "saved") && (
                <div>
                  <p className="text-sm font-semibold mb-2">Saved profiles</p>
                  <div className="space-y-2">
                    {(activityData.activity?.savedProfiles || []).slice(0, 25).map((e, i) => (
                      <div key={`sv-${i}`} className="rounded border border-gray-200 p-2 text-xs">
                        {String(e.viewed_name || "Unknown")} ({String(e.viewed_public_id || "-")}) - {fmt(String(e.created_at || ""))}
                      </div>
                    ))}
                    {(activityData.activity?.savedProfiles || []).length === 0 && <p className="text-xs text-gray-500">No saved-profile activity.</p>}
                  </div>
                </div>
                )}
                {(activitySection === "all" || activitySection === "sent") && (
                <div>
                  <p className="text-sm font-semibold mb-2">Sent interests</p>
                  <div className="space-y-2">
                    {(activityData.activity?.sentInterests || []).slice(0, 25).map((e, i) => (
                      <div key={`si-${i}`} className="rounded border border-gray-200 p-2 text-xs">
                        {String(e.to_name || "Unknown")} ({String(e.to_public_id || "-")}) - {String(e.status || "pending")} - {fmt(String(e.created_at || ""))}
                      </div>
                    ))}
                    {(activityData.activity?.sentInterests || []).length === 0 && <p className="text-xs text-gray-500">No sent-interest activity.</p>}
                  </div>
                </div>
                )}
                {(activitySection === "all") && (
                <div>
                  <p className="text-sm font-semibold mb-2">Profiles viewed</p>
                  <div className="space-y-2">
                    {(activityData.activity?.profileViews || []).slice(0, 25).map((e, i) => (
                      <div key={`pv-${i}`} className="rounded border border-gray-200 p-2 text-xs">
                        {String(e.viewed_name || "Unknown")} ({String(e.viewed_public_id || "-")}) - {fmt(String(e.viewed_at || ""))}
                      </div>
                    ))}
                    {(activityData.activity?.profileViews || []).length === 0 && <p className="text-xs text-gray-500">No profile-view activity.</p>}
                  </div>
                </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
      <ProfileTransferModal
        open={!!transferProfileId}
        profileId={transferProfileId || ""}
        note="Transferred from users screen"
        onClose={() => setTransferProfileId(null)}
        onTransferred={() => {
          void load();
        }}
      />
    </div>
  );
}
