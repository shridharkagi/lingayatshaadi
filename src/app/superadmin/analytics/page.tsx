"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { CsvButton, PageHeader, downloadCsv, inr } from "@/components/superadmin/ui";

type KV = { k: string; n: number };
type Top = { id?: string; userId?: string; publicId?: string; accountCode?: string; name: string; gender?: string; n: number };
type Reports = {
  daily: { day: string; signups: number; profiles: number; approvals: number; profileViews: number; contactViews: number; interests: number; leads: number }[];
  revenue: {
    total: number; payments: number; byMonth: { month: string; amount: number; count: number }[];
    byPlan: { plan: string; amount: number; count: number }[]; byMode: Record<string, number>;
    activePlans: Record<string, number>; expiring30d: number;
  };
  engagement: { topViewed: Top[]; topContacted: Top[]; topContactors: Top[]; interestStatus: Record<string, number> };
  members: {
    gender: Record<string, number>; state: Record<string, number>; district: KV[]; marital: Record<string, number>;
    profession: KV[]; subCaste: KV[]; relationship: Record<string, number>; age: Record<string, number>;
  };
  operations: {
    approved: number; rejected: number; avgHoursToApprove: number | null; backlog: number; rejectionReasons: KV[];
    photosRejected: number; deletionRequests: number;
  };
  leads: { total: number; withAccount: number; bySource: KV[]; events: Record<string, number> };
};

const RANGES = [
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "90d", label: "90 days" },
  { id: "365d", label: "12 months" },
  { id: "custom", label: "Custom" },
];
const TABS = ["Growth", "Engagement", "Revenue", "Members", "Operations", "Leads"] as const;
type Tab = (typeof TABS)[number];
const isoDay = (d: Date) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
const sum = (o: Record<string, number>) => Object.values(o || {}).reduce((s, n) => s + n, 0);
const toKV = (o: Record<string, number>) => Object.entries(o || {}).map(([k, n]) => ({ k, n })).sort((a, b) => b.n - a.n);
const tip = { borderRadius: 12, border: "1px solid #ecedf4", boxShadow: "0 12px 28px rgba(30,27,46,.12)" };

function Bars({ items, fmt = (n: number) => String(n) }: { items: KV[]; fmt?: (n: number) => string }) {
  const max = Math.max(1, ...items.map((i) => i.n));
  if (!items.length) return <p className="sa-muted" style={{ margin: 0 }}>No data in this period.</p>;
  return (
    <div className="rp-bars">
      {items.map((i, idx) => (
        <div key={i.k} className="rp-bar-row">
          <span className="rv-ellipsis" title={i.k}>{i.k}</span>
          <span className="rp-bar-track"><span className="rp-bar-fill" style={{ display: "block", width: `${(i.n / max) * 100}%`, animationDelay: `${idx * 0.04}s` }} /></span>
          <strong style={{ textAlign: "right" }}>{fmt(i.n)}</strong>
        </div>
      ))}
    </div>
  );
}
function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="sa-card rp-stat">
      <span className="sa-muted" style={{ fontSize: 13 }}>{label}</span>
      <span className="v">{value}</span>
      {sub && <span className="sa-muted" style={{ fontSize: 12 }}>{sub}</span>}
    </div>
  );
}
function TopList({ title, rows, unit }: { title: string; rows: Top[]; unit: string }) {
  return (
    <div className="sa-card">
      <h2 className="sa-h2" style={{ marginBottom: 10 }}>{title}</h2>
      {rows.length === 0 && <p className="sa-muted" style={{ margin: 0 }}>No data in this period.</p>}
      {rows.map((r, i) => (
        <div key={i} className="sa-row">
          <span className="sa-muted" style={{ width: 18 }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            {r.id ? <Link className="sa-link" href={`/superadmin/users/${r.id}/edit`}>{r.name || "Unnamed"}</Link>
              : r.userId ? <Link className="sa-link" href={`/superadmin/accounts/${r.userId}`}>{r.name || "Account"}</Link>
              : <strong>{r.name}</strong>}
            <span className="sa-muted" style={{ fontSize: 12 }}> · {r.publicId || r.accountCode || ""}</span>
          </div>
          <strong>{r.n}</strong><span className="sa-muted" style={{ fontSize: 12 }}>{unit}</span>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage() {
  const [range, setRange] = useState("30d");
  const [from, setFrom] = useState(() => isoDay(new Date(Date.now() - 29 * 86400000)));
  const [to, setTo] = useState(() => isoDay(new Date()));
  const [tab, setTab] = useState<Tab>("Growth");
  const [data, setData] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (range === "custom" && (!from || !to || from > to)) return;
    setLoading(true);
    setError(null);
    try {
      const qs = range === "custom" ? `range=custom&from=${from}&to=${to}` : `range=${range}`;
      const res = await adminFetch(`/api/superadmin/reports?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load reports");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }, [range, from, to]);
  useEffect(() => {
    load();
  }, [load]);

  const daily = useMemo(
    () => (data?.daily || []).map((d) => ({ ...d, label: new Date(d.day).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) })),
    [data]
  );
  const totals = useMemo(() => {
    const t = { signups: 0, profiles: 0, approvals: 0, profileViews: 0, contactViews: 0, interests: 0, leads: 0 };
    for (const d of data?.daily || []) for (const k of Object.keys(t) as (keyof typeof t)[]) t[k] += d[k] || 0;
    return t;
  }, [data]);

  const exportCsv = () => {
    if (!data) return;
    const stamp = `${range === "custom" ? `${from}_to_${to}` : range}`;
    if (tab === "Growth" || tab === "Engagement") {
      downloadCsv(`report-daily-${stamp}.csv`, ["Day", "Signups", "Profiles created", "Approvals", "Profile views", "Contact views", "Interests", "WhatsApp leads"],
        data.daily.map((d) => [d.day, d.signups, d.profiles, d.approvals, d.profileViews, d.contactViews, d.interests, d.leads]));
    } else if (tab === "Revenue") {
      downloadCsv(`report-revenue-${stamp}.csv`, ["Month", "Amount (INR)", "Paid payments"], data.revenue.byMonth.map((m) => [m.month, m.amount, m.count]));
    } else if (tab === "Members") {
      const m = data.members;
      const rows: (string | number)[][] = [];
      const add = (dim: string, items: KV[]) => items.forEach((i) => rows.push([dim, i.k, i.n]));
      add("Gender", toKV(m.gender)); add("State", toKV(m.state)); add("District", m.district); add("Age", toKV(m.age));
      add("Marital status", toKV(m.marital)); add("Profession", m.profession); add("Sub-caste", m.subCaste); add("Profile for", toKV(m.relationship));
      downloadCsv(`report-members-${stamp}.csv`, ["Dimension", "Value", "Live profiles"], rows);
    } else if (tab === "Operations") {
      const o = data.operations;
      downloadCsv(`report-operations-${stamp}.csv`, ["Metric", "Value"], [
        ["Approved", o.approved], ["Rejected", o.rejected], ["Avg hours to approve", o.avgHoursToApprove ?? ""], ["Pending backlog", o.backlog],
        ["Photos rejected", o.photosRejected], ["Deletion requests", o.deletionRequests], ...o.rejectionReasons.map((r) => [`Rejection: ${r.k}`, r.n]),
      ]);
    } else {
      downloadCsv(`report-leads-${stamp}.csv`, ["Source page", "Leads"], data.leads.bySource.map((s) => [s.k, s.n]));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Reports" subtitle="Exact numbers from the database for the selected period. Member mix reflects live profiles today.">
        <div className="sa-pills">
          {RANGES.map((r) => (
            <button key={r.id} type="button" className={`sa-pill ${range === r.id ? "on" : ""}`} onClick={() => setRange(r.id)}>{r.label}</button>
          ))}
        </div>
        {range === "custom" && (
          <>
            <input type="date" className="sa-date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} aria-label="From" />
            <input type="date" className="sa-date" value={to} min={from} max={isoDay(new Date())} onChange={(e) => setTo(e.target.value)} aria-label="To" />
          </>
        )}
        <CsvButton onClick={exportCsv} busy={!data} />
        <button type="button" className="sa-btn ghost" onClick={load} aria-label="Refresh"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
      </PageHeader>

      <div className="sa-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tab === t} className={`sa-tab ${tab === t ? "on" : ""}`} onClick={() => setTab(t)}>{t}</button>
        ))}
      </div>
      {error && <div className="m3-error">{error}</div>}
      {!data ? (
        <div className="sa-grid-2"><div className="sa-skel" style={{ height: 300 }} /><div className="sa-skel" style={{ height: 300 }} /></div>
      ) : (
        <div key={tab} style={{ display: "flex", flexDirection: "column", gap: 14, opacity: loading ? 0.6 : 1, transition: "opacity .2s" }}>
          {tab === "Growth" && (
            <>
              <div className="sa-grid-kpi">
                <Stat label="New accounts" value={totals.signups} />
                <Stat label="Profiles created" value={totals.profiles} />
                <Stat label="Profiles approved" value={totals.approvals} />
                <Stat label="WhatsApp leads" value={totals.leads} />
              </div>
              <div className="sa-card">
                <h2 className="sa-h2" style={{ marginBottom: 10 }}>Daily growth</h2>
                <div style={{ height: 300 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#eef0f5" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tip} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Area type="monotone" dataKey="signups" name="Accounts" stroke="#e67300" fill="#e67300" fillOpacity={0.12} strokeWidth={2.5} />
                      <Area type="monotone" dataKey="profiles" name="Profiles created" stroke="#5b3aa8" fill="#5b3aa8" fillOpacity={0.08} strokeWidth={2.5} />
                      <Area type="monotone" dataKey="approvals" name="Approved" stroke="#11734b" fill="#11734b" fillOpacity={0.08} strokeWidth={2.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </>
          )}

          {tab === "Engagement" && (
            <>
              <div className="sa-grid-kpi">
                <Stat label="Profile views" value={totals.profileViews.toLocaleString("en-IN")} />
                <Stat label="Contact views" value={totals.contactViews} />
                <Stat label="Interests sent" value={totals.interests} sub={toKV(data.engagement.interestStatus).map((s) => `${s.n} ${s.k}`).join(" · ") || undefined} />
              </div>
              <div className="sa-card">
                <h2 className="sa-h2" style={{ marginBottom: 10 }}>Daily engagement</h2>
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid stroke="#eef0f5" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} />
                      <Tooltip contentStyle={tip} cursor={{ fill: "rgba(230,115,0,.06)" }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="profileViews" name="Profile views" fill="#f2a93b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="contactViews" name="Contact views" fill="#e0457b" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="interests" name="Interests" fill="#5b3aa8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="sa-grid-2">
                <TopList title="Most viewed profiles" rows={data.engagement.topViewed} unit=" views" />
                <TopList title="Most contacted profiles" rows={data.engagement.topContacted} unit=" contacts" />
              </div>
              <TopList title="Accounts viewing the most contacts" rows={data.engagement.topContactors} unit=" contacts" />
            </>
          )}

          {tab === "Revenue" && (
            <>
              <div className="sa-grid-kpi">
                <Stat label="Revenue collected" value={inr(data.revenue.total)} sub={`${data.revenue.payments} paid payments`} />
                <Stat label="Average payment" value={data.revenue.payments ? inr(data.revenue.total / data.revenue.payments) : "—"} />
                <Stat label="Active plans now" value={sum(data.revenue.activePlans)} sub={toKV(data.revenue.activePlans).map((p) => `${p.n} ${p.k}`).join(" · ")} />
                <Stat label="Expiring in 30 days" value={data.revenue.expiring30d} sub={<Link href="/superadmin/pipeline">Plan renewals →</Link>} />
              </div>
              <div className="sa-card">
                <h2 className="sa-h2" style={{ marginBottom: 10 }}>Revenue by month</h2>
                <div style={{ height: 260 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.revenue.byMonth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <defs><linearGradient id="rv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f28c28" /><stop offset="1" stopColor="#e0457b" /></linearGradient></defs>
                      <CartesianGrid stroke="#eef0f5" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: "#5f6275" }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                      <Tooltip contentStyle={tip} formatter={(v) => inr(v)} />
                      <Bar dataKey="amount" name="Revenue" fill="url(#rv)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div className="sa-grid-2">
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Revenue by plan</h2><Bars items={data.revenue.byPlan.map((p) => ({ k: `${p.plan} (${p.count})`, n: Number(p.amount) }))} fmt={inr} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Payments by mode</h2><Bars items={toKV(data.revenue.byMode).map((m) => ({ ...m, k: m.k.replace(/_/g, " ") }))} /></div>
              </div>
            </>
          )}

          {tab === "Members" && (
            <>
              <div className="sa-grid-kpi">
                <Stat label="Live profiles" value={sum(data.members.gender)} />
                <Stat label="Brides" value={data.members.gender.female || 0} />
                <Stat label="Grooms" value={data.members.gender.male || 0} />
                <Stat label="Managed by family" value={sum(data.members.relationship) - (data.members.relationship.self || 0)} sub="profiles for son, daughter, sibling…" />
              </div>
              <div className="sa-grid-2">
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>By state</h2><Bars items={toKV(data.members.state)} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Top districts / cities</h2><Bars items={data.members.district} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Age bands</h2><Bars items={["18-23", "24-28", "29-33", "34-40", "41+"].map((k) => ({ k, n: data.members.age[k] || 0 }))} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Marital status</h2><Bars items={toKV(data.members.marital)} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Profession</h2><Bars items={data.members.profession} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Sub-caste</h2><Bars items={data.members.subCaste} /></div>
              </div>
            </>
          )}

          {tab === "Operations" && (
            <>
              <div className="sa-grid-kpi">
                <Stat label="Profiles approved" value={data.operations.approved} />
                <Stat label="Profiles rejected" value={data.operations.rejected} />
                <Stat label="Avg time to approve" value={data.operations.avgHoursToApprove != null ? `${data.operations.avgHoursToApprove} h` : "—"} />
                <Stat label="Waiting in review now" value={data.operations.backlog} sub={<Link href="/superadmin/moderation">Open review queue →</Link>} />
                <Stat label="Photos rejected" value={data.operations.photosRejected} />
                <Stat label="Deletion requests" value={data.operations.deletionRequests} />
              </div>
              <div className="sa-card">
                <h2 className="sa-h2" style={{ marginBottom: 12 }}>Rejection reasons (currently rejected profiles)</h2>
                <Bars items={data.operations.rejectionReasons.map((r) => ({ ...r, k: r.k.replace(/\s+/g, " ").slice(0, 80) }))} />
              </div>
            </>
          )}

          {tab === "Leads" && (
            <>
              <div className="sa-grid-kpi">
                <Stat label="WhatsApp leads" value={data.leads.total} />
                <Stat label="Leads with an account" value={data.leads.withAccount} sub={data.leads.total ? `${Math.round((data.leads.withAccount / data.leads.total) * 100)}% signed up` : undefined} />
                {toKV(data.leads.events).slice(0, 2).map((e) => <Stat key={e.k} label={e.k.replace(/_/g, " ")} value={e.n} sub="events" />)}
              </div>
              <div className="sa-grid-2">
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>Leads by page</h2><Bars items={data.leads.bySource} /></div>
                <div className="sa-card"><h2 className="sa-h2" style={{ marginBottom: 12 }}>WhatsApp button events</h2><Bars items={toKV(data.leads.events).map((e) => ({ ...e, k: e.k.replace(/_/g, " ") }))} /></div>
              </div>
              <Link href="/superadmin/leads" className="sa-btn ghost" style={{ alignSelf: "flex-start" }}>Open all leads →</Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
