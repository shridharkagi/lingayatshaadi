"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/adminClient";
import { PageHeader, Pager, fmtDateTime } from "@/components/superadmin/ui";

type Log = {
  id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  meta: Record<string, unknown> | null;
  created_at: string;
};
const LIMIT = 50;
const AREA_LABEL: Record<string, string> = {
  profile: "Profiles",
  photo: "Photos",
  subscription: "Subscriptions",
  account: "Accounts",
  profile_deletion_request: "Deletion requests",
  kyc: "KYC",
};
const TONE: Record<string, string> = {
  approve: "t-green", restore: "t-teal", unsuspend: "t-teal", reject: "t-rose", trash: "t-rose", purge: "t-rose", delete: "t-rose",
  suspend: "t-rose", transfer_ownership: "t-indigo", assign_manual: "t-indigo", adjust_manual: "t-amber", plan_update: "t-plum",
};

function changed(before: Record<string, unknown> | null, after: Record<string, unknown> | null) {
  if (!after) return [];
  return Object.keys(after)
    .filter((k) => k !== "updated_at" && JSON.stringify(before?.[k] ?? null) !== JSON.stringify(after[k] ?? null))
    .slice(0, 12)
    .map((k) => ({ k, b: before?.[k], a: after[k] }));
}
const short = (v: unknown) => {
  const s = v === null || v === undefined ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v);
  return s.length > 80 ? s.slice(0, 80) + "…" : s;
};

export default function AuditLogPage() {
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Log[]>([]);
  const [total, setTotal] = useState(0);
  const [areas, setAreas] = useState<Record<string, number>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ area, q, limit: String(LIMIT), offset: String(offset) });
      const res = await adminFetch(`/api/superadmin/audit?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setRows(json.rows || []);
      setTotal(json.total || 0);
      setAreas(json.areas || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [area, q, offset]);
  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setOffset(0), [area, q]);

  const entityLink = (l: Log) => {
    if (!l.entity_id) return null;
    if (l.entity_type === "profile") return `/superadmin/users/${l.entity_id}/edit`;
    if (l.entity_type === "auth_user") return `/superadmin/accounts/${l.entity_id}`;
    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Audit log" subtitle="Every admin action, newest first. Click a row to see what changed." />
      <div className="ad-toolbar">
        <div className="ad-pills">
          <button type="button" className={`ad-pill ${area === "" ? "on" : ""}`} onClick={() => setArea("")}>All</button>
          {Object.entries(areas).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
            <button key={k} type="button" className={`ad-pill ${area === k ? "on" : ""}`} onClick={() => setArea(k)}>
              {AREA_LABEL[k] || k} <span style={{ opacity: 0.6 }}>{n}</span>
            </button>
          ))}
        </div>
        <input className="ad-input" style={{ flex: "1 1 260px", maxWidth: 380 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by profile / account id" aria-label="Entity id" />
      </div>
      {error && <div className="m3-error">{error}</div>}
      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th>When</th><th>Action</th><th>Item</th><th>Details</th></tr></thead>
            <tbody>
              {loading && rows.length === 0 && Array.from({ length: 8 }).map((_, i) => <tr key={i}><td colSpan={4}><div className="ad-skel" style={{ height: 24 }} /></td></tr>)}
              {rows.map((l) => {
                const [ar, verb] = [l.action_type.split(".")[0], l.action_type.split(".").slice(1).join(".")];
                const diff = changed(l.before_json, l.after_json);
                const link = entityLink(l);
                const reason = (l.meta?.reason || l.meta?.delete_reason || l.after_json?.rejection_reason) as string | undefined;
                return (
                  <Fragment key={l.id}>
                    <tr className="clickable" onClick={() => setOpen(open === l.id ? null : l.id)}>
                      <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(l.created_at)}</td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        <span className="ad-muted" style={{ fontSize: 12 }}>{AREA_LABEL[ar] || ar} · </span>
                        <span className={`ad-chip ${TONE[verb] || "t-grey"}`}>{verb.replace(/_/g, " ") || ar}</span>
                      </td>
                      <td style={{ whiteSpace: "nowrap" }}>
                        {link ? <Link className="ad-link" href={link} onClick={(e) => e.stopPropagation()}>{(l.entity_type || "").replace(/_/g, " ")} ↗</Link> : <span className="ad-muted">{(l.entity_type || "—").replace(/_/g, " ")}</span>}
                        <div className="ad-muted" style={{ fontSize: 11 }}>{(l.entity_id || "").slice(0, 8)}</div>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {reason ? <span>Reason: {short(reason)}</span> : diff.length ? <span className="ad-muted">{diff.map((d) => d.k.replace(/_/g, " ")).join(", ")}</span> : <span className="ad-muted">—</span>}
                      </td>
                    </tr>
                    {open === l.id && (
                      <tr>
                        <td colSpan={4} style={{ background: "#fafbfd" }}>
                          {diff.length === 0 && <span className="ad-muted" style={{ fontSize: 12 }}>No field changes recorded.</span>}
                          {diff.map((d) => (
                            <div key={d.k} style={{ fontSize: 12, padding: "3px 0" }}>
                              <strong>{d.k.replace(/_/g, " ")}</strong>: <span className="rv-old">{short(d.b)}</span> → <span className="rv-new">{short(d.a)}</span>
                            </div>
                          ))}
                          {l.meta && Object.keys(l.meta).length > 0 && (
                            <div className="ad-muted" style={{ fontSize: 11, marginTop: 6, wordBreak: "break-all" }}>Extra: {short(l.meta)}</div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="ad-empty">No admin actions recorded.</div>}
        </div>
      </div>
      <Pager total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  );
}
