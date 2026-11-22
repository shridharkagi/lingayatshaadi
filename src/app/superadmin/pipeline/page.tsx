"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageCircle, Phone, RefreshCw } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { PageHeader, fmtDate, fmtDateTime, inr, phoneDigits, phoneFmt } from "@/components/superadmin/ui";

type Req = {
  id: string;
  userId: string;
  accountCode: string | null;
  name: string;
  planCode: string | null;
  planName: string | null;
  planPrice: number | null;
  callbackNumber: string | null;
  note: string | null;
  status: "new" | "contacted" | "closed";
  followUpAt: string | null;
  adminNote: string | null;
  createdAt: string;
  currentPlan: { name: string; price: number; expiresAt: string } | null;
};

const COLS: { id: Req["status"]; title: string; hint: string; dot: string }[] = [
  { id: "new", title: "New", hint: "Not contacted yet", dot: "#e0457b" },
  { id: "contacted", title: "Contacted", hint: "Waiting on payment / decision", dot: "#e67300" },
  { id: "closed", title: "Closed", hint: "Paid or not interested", dot: "#9a9cae" },
];
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10) : "");
const startOfTomorrow = () => {
  const d = new Date();
  d.setHours(24, 0, 0, 0);
  return d;
};

function Card({ r, onPatch }: { r: Req; onPatch: (id: string, patch: Partial<{ status: string; followUpAt: string | null; adminNote: string | null }>) => Promise<void> }) {
  const [note, setNote] = useState(r.adminNote || "");
  const [saving, setSaving] = useState(false);
  const due = r.status !== "closed" && r.followUpAt && new Date(r.followUpAt) < startOfTomorrow();
  const wa = phoneDigits(r.callbackNumber);
  const message = encodeURIComponent(
    `Namaskara${r.name ? " " + r.name.split(" ")[0] : ""}, this is LingayatBandhu. You requested the ${r.planName || "premium"} plan${r.planPrice ? ` (${inr(r.planPrice)})` : ""}. Shall I share the payment details?`
  );
  const patch = async (p: Parameters<typeof onPatch>[1]) => {
    setSaving(true);
    try {
      await onPatch(r.id, p);
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className={`pl-card ${due ? "due" : ""}`}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <Link href={`/superadmin/accounts/${r.userId}`} className="sa-link">{r.name || "Member"}</Link>
          <div className="sa-muted" style={{ fontSize: 12 }}>{r.accountCode || "—"} · asked {fmtDateTime(r.createdAt)}</div>
        </div>
        <span className="sa-chip t-green" style={{ height: "fit-content" }}>{r.planName || r.planCode || "Plan"}{r.planPrice ? ` · ${inr(r.planPrice)}` : ""}</span>
      </div>
      <div style={{ fontSize: 13 }}>
        Call back: <strong>{phoneFmt(r.callbackNumber)}</strong>
        {r.currentPlan && <span className="sa-muted"> · now on {r.currentPlan.name} until {fmtDate(r.currentPlan.expiresAt)}</span>}
      </div>
      {r.note && <div style={{ fontSize: 12, background: "#f8f9fc", borderRadius: 8, padding: "6px 8px" }}>“{r.note}”</div>}
      <div className="pl-actions">
        {wa && <a className="sa-btn ghost" href={`https://wa.me/${wa}?text=${message}`} target="_blank" rel="noreferrer"><MessageCircle size={14} /> WhatsApp</a>}
        {wa && <a className="sa-btn ghost" href={`tel:+${wa}`}><Phone size={14} /> Call</a>}
        <Link className="sa-btn pri" href={`/superadmin/accounts/${r.userId}`}>Assign plan</Link>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
        <label className="sa-muted" style={{ fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
          Follow up
          <input type="date" className="sa-date" value={toLocalInput(r.followUpAt)} disabled={saving}
            onChange={(e) => patch({ followUpAt: e.target.value ? new Date(`${e.target.value}T10:00:00+05:30`).toISOString() : null })} />
        </label>
        {due && <span className="sa-chip t-rose">Due</span>}
      </div>
      <input className="sa-input" style={{ height: 36, fontSize: 13 }} value={note} placeholder="Add a note, e.g. call after 6 pm"
        onChange={(e) => setNote(e.target.value)} onBlur={() => note !== (r.adminNote || "") && patch({ adminNote: note })} aria-label="Admin note" />
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {COLS.filter((c) => c.id !== r.status).map((c) => (
          <button key={c.id} type="button" className="sa-btn ghost" style={{ minHeight: 30, fontSize: 12, padding: "0 10px" }} disabled={saving}
            onClick={() => patch({ status: c.id })}>
            Move to {c.title}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [rows, setRows] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [onlyDue, setOnlyDue] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/superadmin/pipeline");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setRows(json.requests || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const onPatch = async (id: string, patch: Partial<{ status: string; followUpAt: string | null; adminNote: string | null }>) => {
    const res = await adminFetch("/api/superadmin/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...patch }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError((json as { error?: string }).error || "Update failed");
      return;
    }
    setRows((list) =>
      list.map((r) =>
        r.id === id
          ? {
              ...r,
              ...(patch.status ? { status: patch.status as Req["status"] } : {}),
              ...(patch.followUpAt !== undefined ? { followUpAt: patch.followUpAt } : {}),
              ...(patch.adminNote !== undefined ? { adminNote: patch.adminNote } : {}),
            }
          : r
      )
    );
  };

  const dueCount = useMemo(() => rows.filter((r) => r.status !== "closed" && r.followUpAt && new Date(r.followUpAt) < startOfTomorrow()).length, [rows]);
  const shown = onlyDue ? rows.filter((r) => r.status !== "closed" && r.followUpAt && new Date(r.followUpAt) < startOfTomorrow()) : rows;
  const sortFor = (list: Req[]) =>
    [...list].sort((a, b) => {
      if (a.followUpAt && b.followUpAt) return a.followUpAt.localeCompare(b.followUpAt);
      if (a.followUpAt) return -1;
      if (b.followUpAt) return 1;
      return b.createdAt.localeCompare(a.createdAt);
    });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Upgrade pipeline"
        subtitle="Members who asked to upgrade. Follow up on WhatsApp or phone, then assign the plan from their account."
      >
        <button type="button" className={`sa-btn ${onlyDue ? "pri" : "ghost"}`} onClick={() => setOnlyDue((v) => !v)}>
          Due today{dueCount ? ` · ${dueCount}` : ""}
        </button>
        <button type="button" className="sa-btn ghost" onClick={load} aria-label="Refresh"><RefreshCw size={16} className={loading ? "animate-spin" : ""} /></button>
      </PageHeader>
      {error && <div className="m3-error">{error}</div>}
      <div className="pl-board">
        {COLS.map((c) => {
          const list = sortFor(shown.filter((r) => r.status === c.id));
          return (
            <section key={c.id} className="pl-col" aria-label={c.title}>
              <div className="pl-col-h">
                <span><span className="sa-dot" style={{ background: c.dot, borderRadius: 999 }} />{c.title} <span className="sa-muted" style={{ fontWeight: 500 }}>· {list.length}</span></span>
                <span className="sa-muted" style={{ fontWeight: 500, fontSize: 11 }}>{c.hint}</span>
              </div>
              {loading && rows.length === 0 && <div className="sa-skel" style={{ height: 140 }} />}
              {!loading && list.length === 0 && <div className="sa-muted" style={{ fontSize: 13, padding: 12, textAlign: "center" }}>Nothing here</div>}
              {list.map((r) => <Card key={r.id} r={r} onPatch={onPatch} />)}
            </section>
          );
        })}
      </div>
    </div>
  );
}
