"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { CsvButton, PageHeader, Pager, downloadCsv, fmtDate, fmtDateTime, phoneDigits, phoneFmt, useDebounced } from "@/components/superadmin/ui";

type Lead = {
  id: string;
  account_id: string | null;
  name: string | null;
  contact_no: string | null;
  city: string | null;
  source_page: string | null;
  status: string | null;
  date_of_joining: string | null;
  created_at: string;
};
const LIMIT = 50;

export default function LeadsPage() {
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [source, setSource] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const fetchPage = useCallback(
    async (lim: number, off: number) => {
      const qs = new URLSearchParams({ q: dq, source, limit: String(lim), offset: String(off) });
      const res = await adminFetch(`/api/superadmin/leads?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load leads");
      return json as { total: number; rows: Lead[]; sources: Record<string, number> };
    },
    [dq, source]
  );
  useEffect(() => setOffset(0), [dq, source]);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    fetchPage(LIMIT, offset)
      .then((j) => {
        if (!alive) return;
        setRows(j.rows);
        setTotal(j.total);
        setSources(j.sources || {});
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchPage, offset]);

  const allTotal = Object.values(sources).reduce((s, n) => s + n, 0);
  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: Lead[] = [];
      for (let off = 0; off < Math.max(total, 1); off += 500) all.push(...(await fetchPage(500, off)).rows);
      downloadCsv(
        `whatsapp-leads-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Name", "Phone", "City", "Source page", "Status", "Joined group on", "Submitted", "Has account"],
        all.map((l) => [l.name, phoneFmt(l.contact_no), l.city, l.source_page, l.status, fmtDate(l.date_of_joining), fmtDateTime(l.created_at), l.account_id ? "yes" : "no"])
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="WhatsApp leads" subtitle="People who filled the “Join our WhatsApp group” form.">
        <CsvButton onClick={exportCsv} busy={exporting} />
      </PageHeader>

      <div className="ad-grid-kpi">
        <div className="ad-card rp-stat"><span className="ad-muted" style={{ fontSize: 13 }}>Total leads</span><span className="v">{allTotal}</span></div>
        {Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, n]) => (
          <button key={k} type="button" className="ad-card hover rp-stat" style={{ textAlign: "left", cursor: "pointer", border: source === k ? "1.5px solid #e67300" : undefined, font: "inherit" }}
            onClick={() => setSource(source === k ? "" : k)}>
            <span className="ad-muted" style={{ fontSize: 13 }}>From {k === "unknown" ? "unknown page" : k}</span>
            <span className="v">{n}</span>
          </button>
        ))}
      </div>

      <div className="ad-toolbar">
        <label className="ad-search-box" style={{ flex: "1 1 280px", maxWidth: 420, height: 40 }}>
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or city" aria-label="Search leads" />
        </label>
        {source && <button type="button" className="ad-btn ghost" onClick={() => setSource("")}>Source: {source} ✕</button>}
      </div>
      {error && <div className="m3-error">{error}</div>}

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead><tr><th>Name</th><th>Phone</th><th>City</th><th>Source</th><th>Submitted</th><th>Account</th><th /></tr></thead>
            <tbody>
              {loading && rows.length === 0 && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={7}><div className="ad-skel" style={{ height: 26 }} /></td></tr>)}
              {rows.map((l) => (
                <tr key={l.id}>
                  <td><strong>{l.name || "—"}</strong></td>
                  <td style={{ whiteSpace: "nowrap" }}>{phoneFmt(l.contact_no)}</td>
                  <td>{l.city || "—"}</td>
                  <td><span className="ad-chip t-indigo">{l.source_page || "unknown"}</span></td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDateTime(l.created_at)}</td>
                  <td>{l.account_id ? <Link className="ad-link" href={`/superadmin/accounts/${l.account_id}`}>Open 360°</Link> : <span className="ad-muted">Not signed up</span>}</td>
                  <td>
                    {l.contact_no && (
                      <a className="ad-btn ghost" style={{ minHeight: 30, fontSize: 12 }} target="_blank" rel="noreferrer"
                        href={`https://wa.me/${phoneDigits(l.contact_no)}?text=${encodeURIComponent(`Namaskara${l.name ? " " + l.name.split(" ")[0] : ""}, thank you for joining the LingayatBandhu WhatsApp group. Create your free profile at https://www.lingayatbandhu.com`)}`}>
                        <MessageCircle size={14} /> WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="ad-empty">No leads match.</div>}
        </div>
      </div>
      <Pager total={total} limit={LIMIT} offset={offset} onChange={setOffset} />
    </div>
  );
}
