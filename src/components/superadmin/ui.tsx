"use client";

import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ClipboardCopy, Download, Handshake, RotateCcw, UserRound, Users, UsersRound, type LucideIcon } from "lucide-react";

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

export const PAGE_SIZES = [25, 50, 75, 100];

export function Pager({
  total, limit, offset, onChange, onLimitChange,
}: { total: number; limit: number; offset: number; onChange: (offset: number) => void; onLimitChange?: (limit: number) => void }) {
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + limit, total);
  const n = (x: number) => x.toLocaleString("en-IN");
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, justifyContent: "space-between", flexWrap: "wrap" }}>
      <span style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="ad-muted" style={{ fontSize: 12 }}>
          {total <= limit ? `${n(total)} result${total === 1 ? "" : "s"}` : `${n(from)}–${n(to)} of ${n(total)}`}
        </span>
        {onLimitChange && (
          <label className="ad-muted" style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 6 }}>
            Show
            <select className="ad-select ad-select-sm" value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} aria-label="Rows per page">
              {PAGE_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            per page
          </label>
        )}
      </span>
      {total > limit && (
        <span style={{ display: "flex", gap: 6 }}>
          <button type="button" className="ad-btn ghost" style={{ minHeight: 34 }} disabled={offset === 0} onClick={() => onChange(Math.max(0, offset - limit))} aria-label="Previous page">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="ad-btn ghost" style={{ minHeight: 34 }} disabled={to >= total} onClick={() => onChange(offset + limit)} aria-label="Next page">
            <ChevronRight size={16} />
          </button>
        </span>
      )}
    </div>
  );
}

/* ---------- Date filter (presets + custom range, IST days) ---------- */

export type DateFilterValue = { preset: string; from: string; to: string };
export const NO_DATES: DateFilterValue = { preset: "any", from: "", to: "" };
const DATE_PRESETS = [
  { id: "any", label: "Any time" },
  { id: "today", label: "Today" },
  { id: "7d", label: "Last 7 days" },
  { id: "30d", label: "Last 30 days" },
  { id: "90d", label: "Last 90 days" },
  { id: "this_month", label: "This month" },
  { id: "last_month", label: "Last month" },
  { id: "this_year", label: "This year" },
  { id: "custom", label: "Custom dates…" },
];
/** YYYY-MM-DD for a date in India time. */
export const istDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

function presetDates(id: string): { from: string; to: string } {
  const now = new Date();
  const today = istDay(now);
  const back = (days: number) => istDay(new Date(now.getTime() - days * 86400000));
  const [y, m] = today.split("-").map(Number);
  const pad = (x: number) => String(x).padStart(2, "0");
  switch (id) {
    case "today": return { from: today, to: today };
    case "7d": return { from: back(6), to: today };
    case "30d": return { from: back(29), to: today };
    case "90d": return { from: back(89), to: today };
    case "this_month": return { from: `${y}-${pad(m)}-01`, to: today };
    case "last_month": {
      const py = m === 1 ? y - 1 : y;
      const pm = m === 1 ? 12 : m - 1;
      const last = new Date(Date.UTC(py, pm, 0)).getUTCDate();
      return { from: `${py}-${pad(pm)}-01`, to: `${py}-${pad(pm)}-${pad(last)}` };
    }
    case "this_year": return { from: `${y}-01-01`, to: today };
    default: return { from: "", to: "" };
  }
}

export function DateFilter({
  value, onChange, fields, field, onFieldChange,
}: {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
  /** Optional choice of which date the filter applies to, e.g. Joined / Last login. */
  fields?: { id: string; label: string }[];
  field?: string;
  onFieldChange?: (f: string) => void;
}) {
  const today = istDay(new Date());
  return (
    <div className="ad-datefilter">
      {fields && onFieldChange && (
        <select className="ad-select" value={field} onChange={(e) => onFieldChange(e.target.value)} aria-label="Date applies to">
          {fields.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
      )}
      <select
        className={`ad-select ${value.preset !== "any" ? "is-set" : ""}`}
        value={value.preset}
        aria-label="Date range"
        onChange={(e) => {
          const preset = e.target.value;
          if (preset === "custom") onChange({ preset, from: value.from || presetDates("30d").from, to: value.to || today });
          else onChange({ preset, ...presetDates(preset) });
        }}
      >
        {DATE_PRESETS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
      </select>
      {value.preset === "custom" && (
        <span className="ad-daterange">
          <input type="date" className="ad-date" value={value.from} max={value.to || today} aria-label="From date"
            onChange={(e) => onChange({ ...value, from: e.target.value })} />
          <span className="ad-muted">to</span>
          <input type="date" className="ad-date" value={value.to} min={value.from} max={today} aria-label="To date"
            onChange={(e) => onChange({ ...value, to: e.target.value })} />
        </span>
      )}
    </div>
  );
}

export function ResetButton({ show, onClick }: { show: boolean; onClick: () => void }) {
  if (!show) return null;
  return (
    <button type="button" className="ad-btn ghost ad-reset" onClick={onClick}>
      <RotateCcw size={14} /> Reset filters
    </button>
  );
}

/* ---------- "Profile for" chip ---------- */

const REL: Record<string, { label: string; cls: string; icon: LucideIcon }> = {
  self: { label: "Self", cls: "rel-self", icon: UserRound },
  son: { label: "Son", cls: "rel-parent", icon: Users },
  daughter: { label: "Daughter", cls: "rel-parent", icon: Users },
  brother: { label: "Brother", cls: "rel-sibling", icon: UsersRound },
  sister: { label: "Sister", cls: "rel-sibling", icon: UsersRound },
  other: { label: "Relative", cls: "rel-other", icon: Handshake },
};
export const REL_OPTIONS = [
  { id: "", label: "Created for: anyone" },
  { id: "self", label: "Self" },
  { id: "family", label: "Family-managed (all)" },
  { id: "parent", label: "By parent (son / daughter)" },
  { id: "son", label: "— Son" },
  { id: "daughter", label: "— Daughter" },
  { id: "sibling", label: "By sibling (brother / sister)" },
  { id: "brother", label: "— Brother" },
  { id: "sister", label: "— Sister" },
  { id: "other", label: "Other relative" },
];
export function RelChip({ rel }: { rel: string | null | undefined }) {
  const r = REL[rel || "self"] || { label: rel || "Self", cls: "rel-other", icon: Handshake };
  const Icon = r.icon;
  return (
    <span className={`ad-rel ${r.cls}`} title={r.label === "Self" ? "Created by the person themselves" : `Created by family — for their ${r.label.toLowerCase()}`}>
      <Icon size={13} aria-hidden="true" /> {r.label === "Self" ? "Self" : `For ${r.label.toLowerCase()}`}
    </span>
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

/** Copy rows as tab-separated text — pastes straight into Google Sheets / Excel as cells. */
export async function copyTsv(headers: string[], rows: (string | number | null | undefined)[][]) {
  const cell = (v: string | number | null | undefined) => (v === null || v === undefined ? "" : String(v).replace(/[\t\r\n]+/g, " "));
  const text = [headers, ...rows].map((r) => r.map(cell).join("\t")).join("\n");
  await navigator.clipboard.writeText(text);
}

export function CopyButton({ onCopy, label = "Copy for Sheets" }: { onCopy: () => Promise<number>; label?: string }) {
  const [state, setState] = useState<"idle" | "busy" | "done" | "fail">("idle");
  const [n, setN] = useState(0);
  return (
    <button
      type="button"
      className="ad-btn ghost"
      disabled={state === "busy"}
      title="Copies every matching row (all pages). Paste into Google Sheets with Ctrl/⌘+V."
      onClick={async () => {
        setState("busy");
        try {
          setN(await onCopy());
          setState("done");
        } catch {
          setState("fail");
        }
        setTimeout(() => setState("idle"), 2500);
      }}
    >
      {state === "done" ? <Check size={16} /> : <ClipboardCopy size={16} />}
      {state === "busy" ? "Copying…" : state === "done" ? `Copied ${n} rows` : state === "fail" ? "Copy blocked" : label}
    </button>
  );
}
