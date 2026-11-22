"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BadgeIndianRupee,
  CalendarClock,
  ImageIcon,
  RefreshCw,
  ShieldCheck,
  UserRoundCheck,
  UserRoundX,
  type LucideIcon,
} from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";

type Overview = {
  inbox: Record<string, number | string | null>;
  kpis: Record<string, number>;
  funnel: { accounts: number; withProfile: number; withLiveProfile: number; paid: number };
  series: { day: string; signups: number; approvals: number }[];
  mix: { gender: Record<string, number>; state: Record<string, number>; age: Record<string, number> };
  recent: { action: string; entityType: string; entityId: string; at: string }[];
};

const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "365d", label: "12 months" },
  { id: "custom", label: "Custom" },
];

const isoDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);

const inr = (n: number) => `₹${Math.round(n || 0).toLocaleString("en-IN")}`;
const num = (n: number) => (n || 0).toLocaleString("en-IN");

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  const d = Math.floor(s / 86400);
  return d === 1 ? "yesterday" : `${d} days ago`;
}

function Delta({ cur, prev, suffix = "vs previous period" }: { cur: number; prev: number; suffix?: string }) {
  if (!prev && !cur) return <span className="ad-flat">No activity yet</span>;
  if (!prev) return <span className="ad-up">▲ new · {suffix}</span>;
  const pct = Math.round(((cur - prev) / prev) * 100);
  if (pct === 0) return <span className="ad-flat">● same as previous period</span>;
  return (
    <span className={pct > 0 ? "ad-up" : "ad-down"}>
      {pct > 0 ? "▲" : "▼"} {Math.abs(pct)}% {suffix}
    </span>
  );
}

const ACTION_LABEL: Record<string, [string, string]> = {
  "profile.approve": ["Approved", "t-green"],
  "profile.reject": ["Rejected", "t-rose"],
  "profile.suspend": ["Suspended", "t-rose"],
  "profile.unsuspend": ["Unsuspended", "t-teal"],
  "profile.trash": ["Trashed", "t-rose"],
  "profile.restore": ["Restored", "t-teal"],
  "profile.purge": ["Purged", "t-rose"],
  "profile.transfer": ["Transferred", "t-indigo"],
  "photo.approve": ["Photo OK", "t-green"],
  "photo.reject": ["Photo rejected", "t-rose"],
  "subscription.assign": ["Plan", "t-indigo"],
  "subscription.adjust": ["Quota", "t-amber"],
  "subscription.refund": ["Refund", "t-rose"],
};

function describe(action: string, entityType: string) {
  const [label, cls] = ACTION_LABEL[action] || [action.split(".").pop() || action, "t-grey"];
  return { label, cls, text: `${label} · ${entityType.replace(/_/g, " ")}` };
}

function InboxCard({
  href,
  icon: Icon,
  tone,
  n,
  title,
  meta,
  chip,
  delay,
}: {
  href: string;
  icon: LucideIcon;
  tone: string;
  n: number;
  title: string;
  meta: string;
  chip?: { text: string; cls: string } | null;
  delay: number;
}) {
  return (
    <Link href={href} className={`ad-card hover ad-task ${n === 0 ? "zero" : ""}`} style={{ animationDelay: `${delay}s` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className={`ad-ico ${tone}`}>
          <Icon size={20} />
        </span>
        {chip && n > 0 && <span className={`ad-chip ${chip.cls}`}>{chip.text}</span>}
      </div>
      <div className="n">{num(n)}</div>
      <div style={{ fontWeight: 600 }}>{title}</div>
      <div className="ad-muted" style={{ fontSize: 12 }}>
        {n === 0 ? "All clear" : meta}
      </div>
    </Link>
  );
}

function Skeleton() {
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <div className="ad-grid-inbox">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="ad-skel" style={{ height: 150 }} />
        ))}
      </div>
      <div className="ad-grid-kpi">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="ad-skel" style={{ height: 110 }} />
        ))}
      </div>
      <div className="ad-grid-2">
        <div className="ad-skel" style={{ height: 280 }} />
        <div className="ad-skel" style={{ height: 280 }} />
      </div>
    </div>
  );
}

export default function AdminOverviewPage() {
  const [range, setRange] = useState("30d");
  const [customFrom, setCustomFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86400000)));
  const [customTo, setCustomTo] = useState(() => isoDay(new Date()));
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  const load = useCallback(async (r: string, from?: string, to?: string) => {
    setLoading(true);
    setError(null);
    try {
      const qs = r === "custom" ? `range=custom&from=${from}&to=${to}` : `range=${r}`;
      const res = await adminFetch(`/api/superadmin/overview?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load overview");
      setData(json);
      setUpdatedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (range === "custom") {
      if (customFrom && customTo && customFrom <= customTo) load(range, customFrom, customTo);
      return;
    }
    load(range);
  }, [range, customFrom, customTo, load]);

  const inbox = data?.inbox || {};
  const k = data?.kpis || ({} as Record<string, number>);
  const n = (key: string) => Number(inbox[key] || 0);
  const totalTasks =
    n("pendingProfiles") + n("pendingPhotos") + n("pendingKyc") + n("upgradeOpen") + n("deletionRequests");
  const fmtDay = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  const periodText =
    range === "custom" ? `${fmtDay(customFrom)} – ${fmtDay(customTo)}` : `the last ${(RANGES.find((r) => r.id === range)?.label || "").toLowerCase()}`;

  const series = useMemo(
    () =>
      (data?.series || []).map((d) => ({
        ...d,
        label: new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      })),
    [data]
  );

  const gender = data?.mix.gender || {};
  const genderTotal = (gender.female || 0) + (gender.male || 0) || 1;
  const states = Object.entries(data?.mix.state || {}).sort((a, b) => b[1] - a[1]);
  const stateTotal = states.reduce((s, [, v]) => s + v, 0) || 1;
  const stateColors = ["#e67300", "#f2a93b", "#5b3aa8", "#0e6b73", "#c9cbd8"];
  const ageOrder = ["18-23", "24-28", "29-33", "34-40", "41+"];
  const ages = ageOrder.map((a) => ({ band: a, n: data?.mix.age?.[a] || 0 }));

  const f = data?.funnel;
  const funnel = f
    ? [
        { label: "Accounts", n: f.accounts, grad: "linear-gradient(90deg,#3f46b8,#6b5bd6)" },
        { label: "Created a profile", n: f.withProfile, grad: "linear-gradient(90deg,#5b3aa8,#9a4fc4)" },
        { label: "Profile live", n: f.withLiveProfile, grad: "linear-gradient(90deg,#c2367a,#e0457b)" },
        { label: "Paid", n: f.paid, grad: "linear-gradient(90deg,#e67300,#f2a93b)" },
      ]
    : [];
  const funnelMax = Math.max(f?.accounts || 1, 1);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
        <div>
          <h1 className="ad-h1">{greeting}</h1>
          <p className="ad-muted" style={{ margin: "4px 0 0" }}>
            {loading && !data
              ? "Loading your dashboard…"
              : totalTasks > 0
                ? `${num(totalTasks)} items need your attention.`
                : "You're all caught up."}{" "}
            Numbers below cover {periodText}.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <div className="ad-pills" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <button
                key={r.id}
                type="button"
                className={`ad-pill ${range === r.id ? "on" : ""}`}
                onClick={() => setRange(r.id)}
                aria-pressed={range === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <label className="ad-muted" style={{ fontSize: 12 }}>
                From{" "}
                <input type="date" className="ad-date" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
              </label>
              <label className="ad-muted" style={{ fontSize: 12 }}>
                To{" "}
                <input type="date" className="ad-date" value={customTo} min={customFrom} max={isoDay(new Date())} onChange={(e) => setCustomTo(e.target.value)} />
              </label>
            </div>
          )}
          <button type="button" className="ad-btn ghost" onClick={() => (range === "custom" ? load(range, customFrom, customTo) : load(range))} aria-label="Refresh" title={updatedAt ? `Updated ${updatedAt.toLocaleTimeString("en-IN")}` : "Refresh"}>
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {error && (
        <div className="ad-card" style={{ borderColor: "#f3c4d4", color: "#b42358" }}>
          Couldn&apos;t load the dashboard: {error}{" "}
          <button type="button" className="ad-btn ghost" style={{ marginLeft: 8 }} onClick={() => (range === "custom" ? load(range, customFrom, customTo) : load(range))}>
            Try again
          </button>
        </div>
      )}

      {!data && loading ? (
        <Skeleton />
      ) : data ? (
        <>
          <section aria-label="Action inbox" className="ad-grid-inbox">
            <InboxCard
              href="/superadmin/moderation"
              icon={UserRoundCheck}
              tone="t-amber"
              n={n("pendingProfiles")}
              title="Profiles to review"
              meta={`${n("pendingNew")} new · ${n("pendingEdits")} edits after approval`}
              chip={inbox.oldestPendingAt ? { text: `Oldest ${timeAgo(String(inbox.oldestPendingAt))}`, cls: "t-amber" } : null}
              delay={0.02}
            />
            <InboxCard
              href="/superadmin/moderation"
              icon={ImageIcon}
              tone="t-plum"
              n={n("pendingPhotos")}
              title="Photos to approve"
              meta={`across ${n("pendingPhotoProfiles")} profiles`}
              delay={0.06}
            />
            <InboxCard
              href="/superadmin/verifications"
              icon={ShieldCheck}
              tone="t-indigo"
              n={n("pendingKyc")}
              title="KYC documents"
              meta="waiting for verification"
              delay={0.1}
            />
            <InboxCard
              href="/superadmin/subscriptions"
              icon={BadgeIndianRupee}
              tone="t-green"
              n={n("upgradeOpen")}
              title="Upgrade requests"
              meta={`${n("upgradeNew")} not yet contacted`}
              chip={n("upgradeNew") > 0 ? { text: `${n("upgradeNew")} new`, cls: "t-rose" } : null}
              delay={0.14}
            />
            <InboxCard
              href="/superadmin/subscriptions"
              icon={CalendarClock}
              tone="t-teal"
              n={n("plansExpiring7d")}
              title="Plans expiring"
              meta="in the next 7 days"
              delay={0.18}
            />
            <InboxCard
              href="/superadmin/deletion-requests"
              icon={UserRoundX}
              tone="t-rose"
              n={n("deletionRequests")}
              title="Deletion requests"
              meta="waiting for a decision"
              delay={0.22}
            />
          </section>

          <section aria-label="Key numbers" className="ad-grid-kpi">
            <div className="ad-card ad-kpi">
              <div className="ad-muted" style={{ fontSize: 13 }}>Accounts (logins)</div>
              <div className="v">{num(k.accountsTotal)}</div>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                +{num(k.accountsNew)} new · <Delta cur={k.accountsNew} prev={k.accountsNewPrev} suffix="" />
              </span>
            </div>
            <div className="ad-card ad-kpi">
              <div className="ad-muted" style={{ fontSize: 13 }}>Live profiles</div>
              <div className="v">{num(k.liveProfiles)}</div>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                of {num(k.profilesTotal)} profiles · {num(k.approvedInRange)} approved
              </span>
            </div>
            <div className="ad-card ad-kpi">
              <div className="ad-muted" style={{ fontSize: 13 }}>Paid members (active)</div>
              <div className="v">{num(k.paidMembers)}</div>
              <span className="ad-muted" style={{ fontSize: 12 }}>
                {k.accountsTotal ? Math.round((k.paidMembers / k.accountsTotal) * 100) : 0}% of accounts
              </span>
            </div>
            <div className="ad-card ad-kpi">
              <div className="ad-muted" style={{ fontSize: 13 }}>Revenue collected</div>
              <div className="v">{inr(k.revenue)}</div>
              <Delta cur={k.revenue} prev={k.revenuePrev} />
            </div>
            <div className="ad-card ad-kpi">
              <div className="ad-muted" style={{ fontSize: 13 }}>Contact views</div>
              <div className="v">{num(k.contactViews)}</div>
              <Delta cur={k.contactViews} prev={k.contactViewsPrev} />
            </div>
            <div className="ad-card ad-kpi">
              <div className="ad-muted" style={{ fontSize: 13 }}>Profile views</div>
              <div className="v">{num(k.profileViews)}</div>
              <Delta cur={k.profileViews} prev={k.profileViewsPrev} />
            </div>
          </section>

          <section className="ad-grid-2">
            <div className="ad-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 className="ad-h2">Growth funnel</h2>
                <span className="ad-muted" style={{ fontSize: 12 }}>All time · by account</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {funnel.map((s, i) => {
                  const prev = i > 0 ? funnel[i - 1].n : 0;
                  const conv = i > 0 && prev ? ` · ${Math.round((s.n / prev) * 100)}%` : "";
                  return (
                    <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div className="ad-muted" style={{ width: 130, fontSize: 12, flex: "none" }}>{s.label}</div>
                      <div style={{ flex: 1 }}>
                        <div
                          className="ad-funnel-bar"
                          style={{ width: `${Math.max((s.n / funnelMax) * 100, 6)}%`, background: s.grad, animationDelay: `${i * 0.08}s` }}
                        >
                          {num(s.n)}
                          {conv}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p className="ad-muted" style={{ fontSize: 12, margin: "14px 0 0" }}>
                Percentages show how many moved on from the step before.
              </p>
            </div>

            <div className="ad-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
                <h2 className="ad-h2">Signups &amp; approvals</h2>
                <div className="ad-muted" style={{ fontSize: 12, display: "flex", gap: 14 }}>
                  <span><span className="ad-dot" style={{ background: "#e67300" }} />Signups</span>
                  <span><span className="ad-dot" style={{ background: "#3f46b8" }} />Approvals</span>
                </div>
              </div>
              <div style={{ height: 230 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gSign" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#e67300" stopOpacity={0.28} />
                        <stop offset="1" stopColor="#e67300" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="gAppr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0" stopColor="#3f46b8" stopOpacity={0.18} />
                        <stop offset="1" stopColor="#3f46b8" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#eef0f5" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} minTickGap={24} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #ecedf4", boxShadow: "0 12px 28px rgba(30,27,46,.12)" }} />
                    <Area type="monotone" dataKey="signups" name="Signups" stroke="#e67300" strokeWidth={2.5} fill="url(#gSign)" />
                    <Area type="monotone" dataKey="approvals" name="Approvals" stroke="#3f46b8" strokeWidth={2.5} fill="url(#gAppr)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className="ad-grid-2">
            <div className="ad-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                <h2 className="ad-h2">Live profile mix</h2>
                <Link href="/superadmin/analytics" style={{ fontSize: 12 }}>Open reports</Link>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span>Brides {Math.round(((gender.female || 0) / genderTotal) * 100)}% · {gender.female || 0}</span>
                    <span>Grooms {Math.round(((gender.male || 0) / genderTotal) * 100)}% · {gender.male || 0}</span>
                  </div>
                  <div className="ad-mix" style={{ marginTop: 6 }}>
                    <div style={{ width: `${((gender.female || 0) / genderTotal) * 100}%`, background: "#e0457b" }} />
                    <div style={{ width: `${((gender.male || 0) / genderTotal) * 100}%`, background: "#3f46b8" }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12 }}>
                    {states.slice(0, 5).map(([s, v], i) => (
                      <span key={s}>
                        <span className="ad-dot" style={{ background: stateColors[i] }} />
                        {s} {Math.round((v / stateTotal) * 100)}%
                      </span>
                    ))}
                  </div>
                  <div className="ad-mix" style={{ marginTop: 6 }}>
                    {states.slice(0, 5).map(([s, v], i) => (
                      <div key={s} style={{ width: `${(v / stateTotal) * 100}%`, background: stateColors[i] }} />
                    ))}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>Age bands</div>
                  <div style={{ height: 130 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={ages} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                        <XAxis dataKey="band" tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} />
                        <Tooltip cursor={{ fill: "rgba(91,58,168,.06)" }} contentStyle={{ borderRadius: 12, border: "1px solid #ecedf4" }} />
                        <Bar dataKey="n" name="Profiles" radius={[8, 8, 0, 0]}>
                          {ages.map((a, i) => (
                            <Cell key={a.band} fill={i === 1 || i === 2 ? "#5b3aa8" : "#b9a6e6"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <div className="ad-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <h2 className="ad-h2">Recent admin activity</h2>
                <Link href="/superadmin/admin-logs" style={{ fontSize: 12 }}>Full audit log</Link>
              </div>
              {(data.recent || []).length === 0 && <p className="ad-muted">No admin actions recorded yet.</p>}
              {(data.recent || []).map((r, i) => {
                const d = describe(r.action, r.entityType || "");
                return (
                  <div key={i} className="ad-row">
                    <span className={`ad-chip ${d.cls}`} style={{ minWidth: 92, justifyContent: "center" }}>{d.label}</span>
                    <div style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                      {r.entityType?.replace(/_/g, " ") || "item"}
                      <span className="ad-muted" style={{ fontSize: 12 }}> · {String(r.entityId || "").slice(0, 8)}</span>
                    </div>
                    <span className="ad-muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{timeAgo(r.at)}</span>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, padding: 12, borderRadius: 12, background: "var(--ad-grad-soft)", fontSize: 13 }}>
                <strong>Engagement</strong> in {periodText}: {num(k.profileViews)} profile views,{" "}
                {num(k.contactViews)} contact views, {num(k.interests)} interests sent.
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
