"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

/** Debounce a changing value (e.g. a search box). */
export function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "flex-end", gap: 12 }}>
      <div>
        <h1 className="ad-h1">{title}</h1>
        {subtitle && <p className="ad-muted" style={{ margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>{children}</div>}
    </div>
  );
}

export function Pager({ total, limit, offset, onChange }: { total: number; limit: number; offset: number; onChange: (offset: number) => void }) {
  if (total <= limit) return <div className="ad-muted" style={{ fontSize: 12 }}>{total.toLocaleString("en-IN")} result{total === 1 ? "" : "s"}</div>;
  const from = offset + 1;
  const to = Math.min(offset + limit, total);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
      <span className="ad-muted" style={{ fontSize: 12 }}>
        {from.toLocaleString("en-IN")}–{to.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")}
      </span>
      <span style={{ display: "flex", gap: 6 }}>
        <button type="button" className="ad-btn ghost" style={{ minHeight: 34 }} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))} aria-label="Previous page">
          <ChevronLeft size={16} />
        </button>
        <button type="button" className="ad-btn ghost" style={{ minHeight: 34 }} disabled={to >= total} onClick={() => onChange(offset + limit)} aria-label="Next page">
          <ChevronRight size={16} />
        </button>
      </span>
    </div>
  );
}

/** Download rows as a CSV file (Excel-friendly, UTF-8 BOM). */
export function downloadCsv(filename: string, headers: string[], rows: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [headers, ...rows].map((r) => r.map(esc).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function CsvButton({ onClick, busy }: { onClick: () => void; busy?: boolean }) {
  return (
    <button type="button" className="ad-btn ghost" onClick={onClick} disabled={busy}>
      <Download size={16} /> {busy ? "Exporting…" : "Export CSV"}
    </button>
  );
}

const PROFILE_STATUS: Record<string, [string, string]> = {
  approved: ["Live", "t-green"],
  pending_review: ["Pending", "t-amber"],
  draft: ["Draft", "t-grey"],
  rejected: ["Rejected", "t-rose"],
  suspended: ["Suspended", "t-rose"],
  blocked: ["Blocked", "t-rose"],
  deleted: ["Deleted", "t-grey"],
};
export function ProfileStatusChip({ status }: { status: string }) {
  const [label, cls] = PROFILE_STATUS[status] || [status, "t-grey"];
  return <span className={`ad-chip ${cls}`}>{label}</span>;
}

export const fmtDate = (s?: unknown) =>
  s ? new Date(String(s)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
export const fmtDateTime = (s?: unknown) =>
  s ? new Date(String(s)).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" }) : "—";
export const inr = (n: unknown) => `₹${Math.round(Number(n || 0)).toLocaleString("en-IN")}`;
export function phoneFmt(p: string | null | undefined) {
  const d = (p || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p || "—";
}
export function phoneDigits(p: string | null | undefined) {
  const d = (p || "").replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
}
export function initials(name: string | null | undefined) {
  return (name || "?").trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase() || "?";
}
