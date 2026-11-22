"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Phone, X } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { CopyButton, ProfileStatusChip, copyTsv, fmtDate, fmtDateTime, initials } from "./ui";

type Row = {
  viewedAt: string;
  profile: {
    id: string; publicId: string | null; name: string | null; gender?: string | null; age?: number | null;
    city?: string | null; profession?: string | null; photo?: string | null; status: string; accountId?: string | null;
  };
  by: { id: string; publicId: string | null; name: string | null; deleted: boolean } | null;
};
type Summary = {
  total: number; today: number; sincePlan: number;
  plan: { name: string; startsAt: string; expiresAt: string; totalLimit: number | null; dailyLimit: number | null } | null;
};

/** Which profiles an account has taken contact details of. */
export default function ContactsTakenModal({ accountId, accountName, onClose }: { accountId: string; accountName: string; onClose: () => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [by, setBy] = useState("");

  useEffect(() => {
    let alive = true;
    adminFetch(`/api/superadmin/accounts/${accountId}/contacts`)
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        if (alive) {
          setRows(j.rows || []);
          setSummary(j.summary || null);
        }
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => alive && setLoading(false));
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      alive = false;
      window.removeEventListener("keydown", esc);
    };
  }, [accountId, onClose]);

  const viewers = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => r.by && m.set(r.by.id, r.by.name || r.by.publicId || "Profile"));
    return [...m.entries()];
  }, [rows]);
  const shown = by ? rows.filter((r) => r.by?.id === by) : rows;
  const plan = summary?.plan;

  return (
    <div className="wa-scrim" onClick={onClose}>
      <div className="wa-panel sa-card" style={{ width: "min(980px, 100%)" }} role="dialog" aria-modal="true" aria-label="Contacts taken" onClick={(e) => e.stopPropagation()}>
        <div className="wa-head">
          <div>
            <h2 className="sa-h2" style={{ margin: 0 }}><Phone size={18} /> Contacts taken by {accountName || "this account"}</h2>
            <p className="sa-muted" style={{ margin: "4px 0 0", fontSize: 12 }}>Every profile whose phone number this account revealed, newest first.</p>
          </div>
          <span style={{ display: "flex", gap: 8 }}>
            {rows.length > 0 && (
              <CopyButton
                onCopy={async () => {
                  await copyTsv(
                    ["Taken on", "Member ID", "Name", "Gender", "Age", "City", "Profession", "Status", "Taken using profile"],
                    shown.map((r) => [fmtDateTime(r.viewedAt), r.profile.publicId, r.profile.name, r.profile.gender, r.profile.age, r.profile.city, r.profile.profession, r.profile.status, r.by?.name || r.by?.publicId])
                  );
                  return shown.length;
                }}
              />
            )}
            <button type="button" className="sa-btn ghost" style={{ width: 36, padding: 0 }} onClick={onClose} aria-label="Close"><X size={16} /></button>
          </span>
        </div>

        {summary && (
          <div className="ct-stats">
            <div><span className="sa-muted">All time</span><strong>{summary.total}</strong></div>
            <div><span className="sa-muted">Today</span><strong>{summary.today}{plan?.dailyLimit ? <small> / {plan.dailyLimit}</small> : null}</strong></div>
            {plan ? (
              <>
                <div><span className="sa-muted">This plan ({plan.name})</span><strong>{summary.sincePlan}{plan.totalLimit ? <small> / {plan.totalLimit}</small> : <small> · unlimited</small>}</strong></div>
                <div><span className="sa-muted">Left on plan</span><strong>{plan.totalLimit ? Math.max(0, plan.totalLimit - summary.sincePlan) : "∞"}</strong></div>
                <div><span className="sa-muted">Plan period</span><strong style={{ fontSize: 13 }}>{fmtDate(plan.startsAt)} – {fmtDate(plan.expiresAt)}</strong></div>
              </>
            ) : (
              <div><span className="sa-muted">Plan</span><strong style={{ fontSize: 13 }}>No active plan</strong></div>
            )}
          </div>
        )}

        {viewers.length > 1 && (
          <div className="sa-pills" style={{ marginBottom: 10, alignSelf: "flex-start" }}>
            <button type="button" className={`sa-pill ${by === "" ? "on" : ""}`} onClick={() => setBy("")}>All profiles</button>
            {viewers.map(([id, name]) => (
              <button key={id} type="button" className={`sa-pill ${by === id ? "on" : ""}`} onClick={() => setBy(id)}>Using {name}</button>
            ))}
          </div>
        )}

        <div style={{ overflowY: "auto", minHeight: 0, border: "1px solid var(--ad-line-2)", borderRadius: 12 }}>
          {error && <div className="m3-error" style={{ margin: 12 }}>{error}</div>}
          {loading && <div style={{ padding: 16 }}>{Array.from({ length: 4 }).map((_, i) => <div key={i} className="sa-skel" style={{ height: 34, marginBottom: 8 }} />)}</div>}
          {!loading && !error && shown.length === 0 && <div className="sa-empty">This account hasn&apos;t taken any contact details yet.</div>}
          {shown.length > 0 && (
            <table className="sa-table">
              <thead><tr><th>Profile</th><th>Details</th><th>Status</th><th>Taken on</th>{viewers.length > 1 && <th>Using</th>}</tr></thead>
              <tbody>
                {shown.map((r, i) => (
                  <tr key={`${r.profile.id}-${i}`}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span className="sa-av" style={{ background: r.profile.gender === "female" ? "#c2367a" : "#5b3aa8", position: "relative" }}>
                          {initials(r.profile.name)}
                          {r.profile.photo && <img src={r.profile.photo} alt="" style={{ position: "absolute", inset: 0 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                        </span>
                        <div>
                          {r.profile.publicId ? (
                            <Link className="sa-link" href={`/superadmin/users/${r.profile.id}/edit`}>{r.profile.name || "Unnamed"}</Link>
                          ) : (
                            <span className="sa-muted">{r.profile.name}</span>
                          )}
                          <div className="sa-muted" style={{ fontSize: 11 }}>{r.profile.publicId || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontSize: 12 }}>
                      {[r.profile.gender === "female" ? "Bride" : r.profile.gender === "male" ? "Groom" : null, r.profile.age, r.profile.city, r.profile.profession].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td><ProfileStatusChip status={r.profile.status} /></td>
                    <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(r.viewedAt)}</td>
                    {viewers.length > 1 && <td style={{ fontSize: 12 }}>{r.by?.name || "—"}{r.by?.deleted ? <span className="sa-muted"> (deleted)</span> : null}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
