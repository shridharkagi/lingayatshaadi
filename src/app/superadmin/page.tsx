"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  UserPlus,
  Heart,
  ShieldCheck,
  Clock,
  Ban,
  XCircle,
  Crown,
  Sparkles,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { createSupabaseClientSafe } from "@/lib/supabase";
import {
  DateRangeFilter,
  rangeFromPreset,
  type DateRange,
} from "@/components/superadmin/DateRangeFilter";

interface StatsResponse {
  range: { from?: string; to?: string };
  signups: number;
  profiles: number;
  brides: number;
  grooms: number;
  status: { verified: number; pending: number; rejected: number; suspended: number };
  type: { premium: number; free: number };
  relationship: Record<string, number>;
  recent: Array<{
    id: string;
    publicId: string | null;
    fullName: string;
    gender: string | null;
    profilePhoto: string | null;
    createdAt: string;
  }>;
}

const RELATIONSHIP_LABELS: Record<string, string> = {
  self: "Self",
  son: "Son",
  daughter: "Daughter",
  brother: "Brother",
  sister: "Sister",
  other: "Other Dependent",
};

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const today = new Date();
  const sameDay =
    d.getUTCFullYear() === today.getUTCFullYear() &&
    d.getUTCMonth() === today.getUTCMonth() &&
    d.getUTCDate() === today.getUTCDate();
  if (sameDay) return `Today, ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  return d.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

interface KpiProps {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone: "primary" | "blue" | "rose" | "violet" | "amber" | "green" | "red" | "gray";
  hint?: string;
}

const TONE_STYLES: Record<KpiProps["tone"], { bg: string; text: string }> = {
  primary: { bg: "bg-[var(--primary)]", text: "text-[var(--primary)]" },
  blue: { bg: "bg-blue-500", text: "text-blue-600" },
  rose: { bg: "bg-rose-500", text: "text-rose-600" },
  violet: { bg: "bg-violet-500", text: "text-violet-600" },
  amber: { bg: "bg-amber-500", text: "text-amber-600" },
  green: { bg: "bg-emerald-500", text: "text-emerald-600" },
  red: { bg: "bg-red-500", text: "text-red-600" },
  gray: { bg: "bg-gray-500", text: "text-gray-600" },
};

function KpiCard({ label, value, icon: Icon, tone, hint }: KpiProps) {
  const t = TONE_STYLES[tone];
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
        <p className="text-2xl font-bold text-gray-900 mt-1 truncate">{value}</p>
        {hint && <p className={`text-xs mt-1 ${t.text}`}>{hint}</p>}
      </div>
      <div className={`w-11 h-11 rounded-xl ${t.bg} flex items-center justify-center text-white shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
    </div>
  );
}

function ProgressBar({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export default function SuperAdminDashboard() {
  const [range, setRange] = useState<DateRange>(() => rangeFromPreset("all"));
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useMemo(
    () => async (r: DateRange) => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createSupabaseClientSafe();
        if (!supabase) {
          throw new Error("Supabase not configured");
        }
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) {
          throw new Error("Not signed in");
        }
        const params = new URLSearchParams();
        if (r.from) params.set("from", r.from);
        if (r.to) params.set("to", r.to);
        const res = await fetch(`/api/superadmin/stats?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || `Request failed (${res.status})`);
        }
        setStats(json as StatsResponse);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load stats");
        setStats(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchStats(range);
  }, [range, fetchStats]);

  const totalProfiles = stats?.profiles || 0;
  const conversion =
    stats && stats.signups > 0 ? Math.round((stats.profiles / stats.signups) * 100) : null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time platform metrics</p>
        </div>
        <button
          type="button"
          onClick={() => fetchStats(range)}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <DateRangeFilter value={range} onChange={setRange} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 text-sm">
          {error}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Signups"
          value={stats?.signups ?? "—"}
          icon={UserPlus}
          tone="blue"
          hint={range.preset === "all" ? "Auth users (all time)" : "Auth users in range"}
        />
        <KpiCard
          label="Full Profiles"
          value={stats?.profiles ?? "—"}
          icon={Users}
          tone="primary"
          hint={
            conversion != null
              ? `${conversion}% of signups completed a profile`
              : "Profiles created in range"
          }
        />
        <KpiCard
          label="Brides"
          value={stats?.brides ?? "—"}
          icon={Heart}
          tone="rose"
          hint={totalProfiles ? `${Math.round(((stats?.brides || 0) / totalProfiles) * 100)}% of profiles` : undefined}
        />
        <KpiCard
          label="Grooms"
          value={stats?.grooms ?? "—"}
          icon={Heart}
          tone="violet"
          hint={totalProfiles ? `${Math.round(((stats?.grooms || 0) / totalProfiles) * 100)}% of profiles` : undefined}
        />
      </div>

      {/* Status + Subscription */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Profile Status</h2>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard label="Verified" value={stats?.status.verified ?? "—"} icon={ShieldCheck} tone="green" />
            <KpiCard label="Pending" value={stats?.status.pending ?? "—"} icon={Clock} tone="amber" />
            <KpiCard label="Rejected" value={stats?.status.rejected ?? "—"} icon={XCircle} tone="red" />
            <KpiCard label="Suspended" value={stats?.status.suspended ?? "—"} icon={Ban} tone="gray" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Subscription Mix</h2>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <KpiCard label="Premium" value={stats?.type.premium ?? "—"} icon={Crown} tone="amber" />
            <KpiCard label="Free" value={stats?.type.free ?? "—"} icon={Sparkles} tone="gray" />
          </div>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Brides vs Grooms</span>
                <span>
                  {stats?.brides ?? 0} / {stats?.grooms ?? 0}
                </span>
              </div>
              <div className="flex gap-1 h-2">
                <div
                  className="bg-rose-500 rounded-l-full transition-all"
                  style={{
                    width: `${
                      totalProfiles
                        ? Math.round(((stats?.brides || 0) / totalProfiles) * 100)
                        : 0
                    }%`,
                  }}
                />
                <div
                  className="bg-violet-500 rounded-r-full transition-all"
                  style={{
                    width: `${
                      totalProfiles
                        ? Math.round(((stats?.grooms || 0) / totalProfiles) * 100)
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Premium share</span>
                <span>
                  {stats && stats.profiles > 0
                    ? `${Math.round((stats.type.premium / stats.profiles) * 100)}%`
                    : "—"}
                </span>
              </div>
              <ProgressBar
                value={stats?.type.premium || 0}
                total={stats?.profiles || 0}
                color="bg-amber-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Relationship breakdown + recent registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Profiles by Relationship</h2>
          {stats && Object.keys(stats.relationship).length === 0 && (
            <p className="text-sm text-gray-500">No profiles in selected range.</p>
          )}
          <div className="space-y-3">
            {stats &&
              Object.entries(stats.relationship)
                .sort((a, b) => b[1] - a[1])
                .map(([rel, count]) => (
                  <div key={rel}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">
                        {RELATIONSHIP_LABELS[rel] || rel}
                      </span>
                      <span className="text-gray-500">{count}</span>
                    </div>
                    <ProgressBar value={count} total={totalProfiles} color="bg-[var(--primary)]" />
                  </div>
                ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Recent Registrations</h2>
            <Link
              href="/superadmin/users"
              className="text-sm text-[var(--primary)] font-medium hover:underline"
            >
              View all
            </Link>
          </div>
          {stats?.recent.length === 0 && (
            <p className="text-sm text-gray-500">No profiles in selected range.</p>
          )}
          <div className="space-y-2">
            {stats?.recent.map((p) => (
              <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                  {p.profilePhoto ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.profilePhoto}
                      alt={p.fullName}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                      {p.fullName?.charAt(0) || "?"}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{p.fullName || "—"}</p>
                  <p className="text-xs text-gray-500">
                    {p.publicId || "—"}
                    {p.gender ? ` · ${p.gender === "female" ? "Bride" : "Groom"}` : ""}
                  </p>
                </div>
                <span className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDate(p.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
