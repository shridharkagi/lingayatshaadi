"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { adminFetch } from "@/lib/api/adminClient";
import { profilePathSegmentFromPublicInfo } from "@/lib/memberId";

interface AnalyticsProfileSummary {
  profileId: string;
  publicId: string | null;
  fullName: string;
  city: string;
  education: string;
  count: number;
}

interface ViewerContactProfile {
  profileId: string;
  publicId: string | null;
  fullName: string;
}

interface TopContactViewer {
  userId: string;
  userPublicId: string | null;
  userName: string;
  count: number;
  profiles: ViewerContactProfile[];
}

interface AdminAction {
  id?: string;
  action_type: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
}

interface AnalyticsResponse {
  topViewedProfiles?: AnalyticsProfileSummary[];
  topContactedProfiles?: AnalyticsProfileSummary[];
  topContactViewers?: TopContactViewer[];
  recentAdminActions?: AdminAction[];
  kpis?: {
    brides?: number;
    grooms?: number;
    activeSubscriptions?: number;
    expiredSubscriptions?: number;
    pendingSubscriptions?: number;
    totalPaymentsCollected?: number;
  };
  error?: string;
}

export default function SuperAdminAnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedViewer, setSelectedViewer] = useState<TopContactViewer | null>(null);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/superadmin/analytics", { signal });
      const json = (await res.json()) as AnalyticsResponse;
      if (!res.ok) {
        setError(String(json.error || "Failed to load analytics"));
        setData(null);
      } else {
        setData(json);
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load analytics");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, []);

  const topViewed = data?.topViewedProfiles || [];
  const topContacted = data?.topContactedProfiles || [];
  const topViewers = data?.topContactViewers || [];
  const actions = (data?.recentAdminActions || []).slice(0, 10);
  const kpis = data?.kpis || {};
  const maxViewed = useMemo(() => Math.max(...topViewed.map((x) => x.count), 1), [topViewed]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
      <p className="text-gray-500 mt-1">One-stop operational dashboard: users, subscriptions, revenue, moderation activity</p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            className="px-2.5 py-1 rounded-md border border-red-300 bg-white hover:bg-red-50 text-xs font-medium"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Kpi label="Brides" value={kpis.brides || 0} />
        <Kpi label="Grooms" value={kpis.grooms || 0} />
        <Kpi label="Active Subs" value={kpis.activeSubscriptions || 0} />
        <Kpi label="Pending Subs" value={kpis.pendingSubscriptions || 0} />
        <Kpi label="Expired Subs" value={kpis.expiredSubscriptions || 0} />
        <Kpi label="Payments (Rs)" value={Number(kpis.totalPaymentsCollected || 0).toLocaleString()} />
      </div>

      {loading && !data ? (
        <div className="mt-6 rounded-xl border bg-white p-6 text-sm text-gray-500">Loading analytics...</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Top Viewed Profiles</h3>
            <div className="space-y-2 text-sm">
              {topViewed.map((r) => {
                const profileSlug = profilePathSegmentFromPublicInfo({
                  profileId: r.profileId,
                  publicId: r.publicId,
                  fullName: r.fullName,
                });
                return (
                  <Link
                    key={r.profileId}
                    href={`/profile/${profileSlug}`}
                    target="_blank"
                    className="block border-b border-gray-100 py-2 hover:bg-gray-50 rounded px-1"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-800 truncate">
                        <span className="font-semibold">{r.fullName}</span> | {r.city || "N/A"} | {r.education || "N/A"}
                      </span>
                      <span className="font-semibold whitespace-nowrap">{r.count} views</span>
                    </div>
                    <div className="h-1.5 mt-1 rounded bg-gray-100">
                      <div
                        className="h-full rounded bg-[var(--primary)]"
                        style={{ width: `${Math.max(4, (r.count / maxViewed) * 100)}%` }}
                      />
                    </div>
                  </Link>
                );
              })}
              {topViewed.length === 0 && <p className="text-gray-500">No data yet</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Top Contacted Profiles</h3>
            <div className="space-y-2 text-sm">
              {topContacted.map((r) => {
                const profileSlug = profilePathSegmentFromPublicInfo({
                  profileId: r.profileId,
                  publicId: r.publicId,
                  fullName: r.fullName,
                });
                return (
                  <Link
                    key={r.profileId}
                    href={`/profile/${profileSlug}`}
                    target="_blank"
                    className="flex items-center justify-between border-b border-gray-100 py-2 hover:bg-gray-50 rounded px-1"
                  >
                    <span className="text-gray-800 truncate">
                      <span className="font-semibold">{r.fullName}</span>
                    </span>
                    <span className="font-semibold whitespace-nowrap">{r.count} contact views</span>
                  </Link>
                );
              })}
              {topContacted.length === 0 && <p className="text-gray-500">No data yet</p>}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6 lg:col-span-2">
            <h3 className="font-semibold text-gray-900 mb-4">Top Contact Viewers and Recent Admin Logs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-gray-100 p-3">
                <h4 className="font-medium mb-2">Users taking most contacts</h4>
                {topViewers.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between text-sm py-1.5 gap-3 border-b border-gray-50">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{r.userName}</p>
                      <p className="text-xs text-gray-500">{r.userPublicId || r.userId}</p>
                    </div>
                    <button
                      type="button"
                      className="text-[var(--primary)] font-semibold hover:underline whitespace-nowrap"
                      onClick={() => setSelectedViewer(r)}
                    >
                      {r.count} profiles viewed
                    </button>
                  </div>
                ))}
                {topViewers.length === 0 && <p className="text-gray-500 text-sm">No data yet</p>}
              </div>

              <div className="rounded-lg border border-gray-100 p-3">
                <h4 className="font-medium mb-2">Recent admin actions (last 10)</h4>
                {actions.map((a) => (
                  <div key={a.id || `${a.entity_id}-${a.created_at}-${a.action_type}`} className="text-xs text-gray-700 py-1 border-b border-gray-100">
                    <span className="font-semibold">{a.action_type}</span> on {a.entity_type} {a.entity_id}
                    <div className="text-gray-500">{new Date(a.created_at).toLocaleString()}</div>
                  </div>
                ))}
                {actions.length === 0 && <p className="text-gray-500 text-sm">No admin logs yet</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedViewer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={() => setSelectedViewer(null)}>
          <div
            className="w-full max-w-xl bg-white rounded-xl shadow-xl border border-gray-100 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Contacted Profiles</h4>
                <p className="text-sm text-gray-500">
                  {selectedViewer.userName} ({selectedViewer.userPublicId || selectedViewer.userId})
                </p>
              </div>
              <button
                type="button"
                className="px-2.5 py-1 rounded-md border border-gray-300 text-sm hover:bg-gray-50"
                onClick={() => setSelectedViewer(null)}
              >
                Close
              </button>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-1">
              {selectedViewer.profiles.map((profile) => {
                const profileSlug = profilePathSegmentFromPublicInfo({
                  profileId: profile.profileId,
                  publicId: profile.publicId,
                  fullName: profile.fullName,
                });
                return (
                  <Link
                    key={profile.profileId}
                    href={`/profile/${profileSlug}`}
                    target="_blank"
                    className="block rounded-lg border border-gray-100 px-3 py-2 hover:bg-gray-50"
                  >
                    <p className="font-medium text-sm text-gray-900">{profile.fullName || "Unknown member"}</p>
                    <p className="text-xs text-gray-500">{profile.publicId || profile.profileId}</p>
                  </Link>
                );
              })}
              {selectedViewer.profiles.length === 0 && (
                <p className="text-sm text-gray-500">No contacted profiles found for this member.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
