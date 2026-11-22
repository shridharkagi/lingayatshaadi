"use client";

import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, MessageCircle, Plus, RefreshCw, Trash2, UserRound, X } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";
import {
  ACTION_LABEL,
  AssignPlanDialog,
  ChangePlanDialog,
  PaymentDialog,
  PlanStatusChip,
  describeChange,
  limitText,
  type ChangeKind,
  type MemberPlan,
  type PaymentLite,
} from "@/components/superadmin/plans/PlanDialogs";

type Row = Record<string, unknown>;
type Data = {
  account: {
    id: string;
    phone: string | null;
    name: string;
    gender: string | null;
    city: string | null;
    accountCode: string | null;
    createdAt: string;
    lastSignInAt: string | null;
    suspended: boolean;
  };
  profiles: (Row & { engagement: { views: number; interests: number; contactedBy: number } | null })[];
  quota: {
    subscriptionId: string;
    planName: string;
    startsAt: string;
    expiresAt: string;
    totalLimit: number | null;
    dailyLimit: number | null;
    totalUsed: number;
    todayUsed: number;
  } | null;
  subscriptions: Row[];
  planHistory: { id: string; at: string; action: string; reason: string | null; before: Row | null; after: Row | null; batchId: string | null; actor: string }[];
  payments: Row[];
  upgradeRequests: Row[];
  notes: Row[];
  timeline: { at: string; kind: string; text: string; tone: string }[];
};
const STATUS: Record<string, [string, string]> = {
  approved: ["Live", "t-green"],
  pending_review: ["Pending review", "t-amber"],
  draft: ["Draft", "t-grey"],
  rejected: ["Rejected", "t-rose"],
};
const TONE: Record<string, string> = {
  indigo: "#3f46b8", green: "#11734b", rose: "#b42358", amber: "#e67300", teal: "#0e6b73", plum: "#5b3aa8", grey: "#9a9cae",
};

const fmtDate = (s?: unknown) =>
  s ? new Date(String(s)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—";
const fmtDateTime = (s?: unknown) =>
  s ? new Date(String(s)).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "—";
const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
function phoneFmt(p: string | null) {
  const d = (p || "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
  return d.length === 10 ? `${d.slice(0, 5)} ${d.slice(5)}` : p || "—";
}
function age(dob: unknown) {
  if (!dob) return null;
  const d = new Date(String(dob));
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((Date.now() - d.getTime()) / (365.25 * 86400000));
}

const toMemberPlan = (s: Row): MemberPlan => ({
  id: String(s.id),
  name: String(s.plan_name_snapshot || "Plan"),
  status: String(s.effective_status || s.status),
  startsAt: String(s.starts_at),
  expiresAt: String(s.expires_at),
  totalLimit: (s.total_contact_views_snapshot as number | null) ?? null,
  dailyLimit: (s.daily_contact_view_limit_snapshot as number | null) ?? null,
  price: Number(s.price_snapshot || 0),
  notes: (s.notes as string | null) ?? null,
});

export default function AccountPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const search = useSearchParams();
  const [assignOpen, setAssignOpen] = useState(search.get("assign") === "1");
  const [change, setChange] = useState<null | { kind: ChangeKind; sub: MemberPlan }>(null);
  const [payDialog, setPayDialog] = useState<null | { mode: "add" | "edit" | "refund" | "remove"; payment?: PaymentLite | null }>(null);
  const [renewFree, setRenewFree] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [noteBusy, setNoteBusy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [showDeleted, setShowDeleted] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/superadmin/accounts/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load account");
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    load();
  }, [load]);

  const accountAction = async (action: "suspend" | "unsuspend" | "delete") => {
    if (!data) return;
    const label = action === "delete" ? "DELETE this account and all its profiles" : action === "suspend" ? "suspend this account (they can't log in)" : "unsuspend this account";
    if (action === "delete") {
      const typed = window.prompt(`This will ${label}. Type DELETE to confirm.`);
      if (typed !== "DELETE") return;
    } else if (!window.confirm(`Are you sure you want to ${label}?`)) return;
    setBusy(true);
    try {
      const res = await adminFetch("/api/superadmin/users/account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: data.account.id, action }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Action failed");
      if (action === "delete") {
        router.push("/superadmin/users");
        return;
      }
      setSaved(action === "suspend" ? "Account suspended." : "Account unsuspended.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!noteText.trim()) return;
    setNoteBusy(true);
    try {
      const res = await adminFetch(`/api/superadmin/accounts/${id}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: noteText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Couldn't save note");
      setData((d) => (d ? { ...d, notes: [json.note, ...d.notes] } : d));
      setNoteText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save note");
    } finally {
      setNoteBusy(false);
    }
  };

  if (loading && !data) {
    return (
      <div style={{ display: "grid", gap: 14 }}>
        <div className="sa-skel" style={{ height: 120 }} />
        <div className="sa-skel" style={{ height: 260 }} />
      </div>
    );
  }
  if (!data) return <div className="sa-card" style={{ color: "#b42358" }}>{error || "Account not found"}</div>;

  const a = data.account;
  const q = data.quota;
  const activeRow = data.subscriptions.find((x) => x.status === "active") || null;
  const activeSub = activeRow ? toMemberPlan(activeRow) : null;
  const lastSub = data.subscriptions[0] || null;
  const planOptions = data.subscriptions.map((x) => ({ id: String(x.id), label: `${String(x.plan_name_snapshot || "Plan")} · ${fmtDate(x.starts_at)} → ${fmtDate(x.expires_at)}` }));
  const afterSave = (msg: string) => {
    setAssignOpen(false);
    setRenewFree(false);
    setChange(null);
    setPayDialog(null);
    setSaved(msg);
    load();
  };
  const liveProfiles = data.profiles.filter((p) => !p.deleted_at);
  const deletedCount = data.profiles.length - liveProfiles.length;
  const shownProfiles = showDeleted ? data.profiles : liveProfiles;
  const waDigits = (a.phone || "").replace(/\D/g, "");
  const pct = (used: number, limit: number | null) => (limit ? Math.min(100, Math.round((used / limit) * 100)) : 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="sa-muted" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
        <Link href="/superadmin/users" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
          <ArrowLeft size={14} /> Accounts
        </Link>
        / {a.accountCode || a.id.slice(0, 8)}
      </div>

      <section className="sa-card m3-head">
        <div className="m3-bigav">{(a.name || "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 240, position: "relative", zIndex: 1 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>{a.name || "Unnamed account"}</h1>
            {q ? <span className="sa-chip m3-gold">{q.planName}</span> : <span className="sa-chip t-grey">No active plan</span>}
            {a.suspended ? <span className="sa-chip t-rose">Suspended</span> : <span className="sa-chip t-green">Active</span>}
          </div>
          <div style={{ opacity: 0.85, marginTop: 6, fontSize: 14 }}>
            {[a.accountCode, phoneFmt(a.phone), a.city, `joined ${fmtDate(a.createdAt)}`, a.lastSignInAt ? `last login ${fmtDateTime(a.lastSignInAt)}` : null]
              .filter(Boolean)
              .join(" · ")}
          </div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, position: "relative", zIndex: 1 }}>
          <button type="button" className="sa-btn pri" onClick={() => { setAssignOpen(true); setSaved(null); }}>Assign / change plan</button>
          <button type="button" className="sa-btn m3-light" onClick={() => { setPayDialog({ mode: "add" }); setSaved(null); }}>Record payment</button>
          {waDigits && (
            <a className="sa-btn m3-light" href={`https://wa.me/${waDigits}`} target="_blank" rel="noreferrer"><MessageCircle size={16} /> WhatsApp</a>
          )}
          <button type="button" className="sa-btn m3-light" disabled={busy} onClick={() => accountAction(a.suspended ? "unsuspend" : "suspend")}>
            {a.suspended ? <CheckCircle2 size={16} /> : <Ban size={16} />} {a.suspended ? "Unsuspend" : "Suspend"}
          </button>
          <button type="button" className="sa-btn m3-light" disabled={busy} onClick={load} aria-label="Refresh"><RefreshCw size={16} /></button>
        </div>
      </section>

      {saved && <div className="m3-ok" role="status"><CheckCircle2 size={18} /> <strong>Saved.</strong> {saved}</div>}
      {error && <div className="m3-error">{error}</div>}

      <div className="m3-cols">
        <div className="m3-left">
          <section className="sa-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              <h2 className="sa-h2">
                Profiles on this account · {liveProfiles.length} active
                {liveProfiles.length <= 3 ? <span className="sa-muted" style={{ fontWeight: 500 }}> (limit 3)</span> : null}
              </h2>
              {deletedCount > 0 && (
                <button type="button" className="sa-btn ghost m3-sm" onClick={() => setShowDeleted((v) => !v)}>
                  {showDeleted ? "Hide" : "Show"} {deletedCount} deleted
                </button>
              )}
            </div>
            {shownProfiles.length === 0 && (
              <p className="sa-muted">{data.profiles.length === 0 ? "This account hasn't created a profile yet." : "No active profiles."}</p>
            )}
            <div className="m3-profiles">
              {shownProfiles.map((p) => {
                const [label, cls] = p.deleted_at ? ["Deleted", "t-rose"] : STATUS[String(p.moderation_status)] || ["—", "t-grey"];
                const e = p.engagement;
                return (
                  <div key={String(p.id)} className="m3-pc">
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="sa-av" style={{ background: p.gender === "female" ? "#c2367a" : "#5b3aa8", width: 42, height: 42 }}>
                        {p.profile_photo ? <img src={String(p.profile_photo)} alt="" /> : <UserRound size={18} />}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong>{String(p.full_name || "Unnamed")}</strong>
                        <div className="sa-muted" style={{ fontSize: 12 }}>
                          {[p.public_id, p.relationship ? `for ${p.relationship}` : null, age(p.date_of_birth), p.city].filter(Boolean).join(" · ")}
                        </div>
                      </div>
                      <span className={`sa-chip ${cls}`}>{label}</span>
                    </div>
                    {e && (
                      <div className="sa-muted" style={{ fontSize: 12 }}>
                        {e.views} views · {e.interests} interests received · contacted by {e.contactedBy}
                      </div>
                    )}
                    {p.moderation_status === "rejected" && p.rejection_reason ? (
                      <div style={{ fontSize: 12, color: "#b42358" }}>Rejected: {String(p.rejection_reason)}</div>
                    ) : null}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <Link className="sa-btn ghost m3-sm" href={`/superadmin/users/${p.id}/edit`}>Edit</Link>
                      {p.public_id && !p.deleted_at ? (
                        <a className="sa-btn ghost m3-sm" href={`/profile/${String(p.public_id).toLowerCase()}`} target="_blank" rel="noreferrer">View</a>
                      ) : null}
                      {p.moderation_status === "pending_review" && !p.deleted_at ? (
                        <Link className="sa-btn ghost m3-sm" href="/superadmin/moderation">Review</Link>
                      ) : null}
                      {!p.deleted_at && (
                        <button type="button" className="sa-btn ghost m3-sm" onClick={() => setTransferId(String(p.id))}>Move to another account</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="sa-card">
            <h2 className="sa-h2" style={{ marginBottom: 6 }}>Activity timeline</h2>
            {data.timeline.map((ev, i) => (
              <div key={i} className="m3-tl">
                <span className="m3-tdot" style={{ background: TONE[ev.tone] || TONE.grey }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>{ev.text}</div>
                  <div className="sa-muted" style={{ fontSize: 12 }}>{fmtDateTime(ev.at)}</div>
                </div>
              </div>
            ))}
          </section>

          <section className="sa-card">
            <h2 className="sa-h2" style={{ marginBottom: 12 }}>Plans</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="m3-table">
                <thead><tr><th>Plan</th><th>Period</th><th>Contacts</th><th>Price · paid</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.subscriptions.length === 0 && <tr><td colSpan={6} className="sa-muted">No plans yet</td></tr>}
                  {data.subscriptions.map((s) => {
                    const st = String(s.effective_status || s.status);
                    const paid = data.payments
                      .filter((p) => p.subscription_id === s.id && (p.status === "paid" || p.status === "refunded"))
                      .reduce((sum, p) => sum + Number(p.amount || 0) - Number(p.refunded_amount || 0), 0);
                    const editable = st !== "cancelled" && st !== "refunded";
                    return (
                      <tr key={String(s.id)}>
                        <td>
                          <strong>{String(s.plan_name_snapshot || "Plan")}</strong>
                          <div className="sa-muted" style={{ fontSize: 11 }}>{String(s.source || "").replace(/_/g, " ")}{s.notes ? ` · ${String(s.notes)}` : ""}</div>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>{fmtDate(s.starts_at)} → {fmtDate(s.expires_at)}</td>
                        <td>{limitText(s.total_contact_views_snapshot as number | null)} · {limitText(s.daily_contact_view_limit_snapshot as number | null)}/day</td>
                        <td>{inr(s.price_snapshot)} · {inr(paid)}</td>
                        <td>
                          <PlanStatusChip status={st} />
                          {s.end_reason && !editable ? <div className="sa-muted" style={{ fontSize: 11 }}>{String(s.end_reason)}</div> : null}
                        </td>
                        <td>{editable && <button type="button" className="sa-btn ghost m3-sm" onClick={() => setChange({ kind: "edit", sub: toMemberPlan(s) })}>Edit</button>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sa-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h2 className="sa-h2" style={{ margin: 0 }}>Payments</h2>
              <button type="button" className="sa-btn ghost m3-sm" onClick={() => setPayDialog({ mode: "add" })}><Plus size={14} /> Record payment</button>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="m3-table">
                <thead><tr><th>Paid on</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Status</th><th /></tr></thead>
                <tbody>
                  {data.payments.length === 0 && <tr><td colSpan={6} className="sa-muted">No payments recorded</td></tr>}
                  {data.payments.map((p) => {
                    const refunded = Number(p.refunded_amount || 0);
                    const isVoid = p.status === "void";
                    const manual = String(p.provider || "manual") === "manual";
                    return (
                      <tr key={String(p.id)} style={isVoid ? { opacity: 0.55 } : undefined}>
                        <td>{fmtDate(p.paid_at || p.created_at)}</td>
                        <td>
                          <strong style={isVoid ? { textDecoration: "line-through" } : undefined}>{inr(p.amount)}</strong>
                          {refunded > 0 && <div style={{ fontSize: 11, color: "#b42358" }}>refunded {inr(refunded)}</div>}
                        </td>
                        <td>{String(p.payment_mode || p.provider || "—").replace(/_/g, " ")}</td>
                        <td className="sa-muted">{String(p.external_txn_id || "—")}</td>
                        <td>
                          <span className={`sa-chip ${isVoid ? "t-grey" : p.status === "paid" ? (refunded > 0 ? "t-amber" : "t-green") : "t-rose"}`}>
                            {isVoid ? "removed" : p.status === "paid" && refunded > 0 ? "part refunded" : String(p.status)}
                          </span>
                        </td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          {!isVoid && manual && p.status === "paid" && (
                            <>
                              <button type="button" className="sa-btn ghost m3-sm" onClick={() => setPayDialog({ mode: "edit", payment: p as unknown as PaymentLite })}>Edit</button>{" "}
                              <button type="button" className="sa-btn ghost m3-sm" onClick={() => setPayDialog({ mode: "refund", payment: p as unknown as PaymentLite })}>Refund</button>{" "}
                              {refunded === 0 && <button type="button" className="sa-btn ghost m3-sm" onClick={() => setPayDialog({ mode: "remove", payment: p as unknown as PaymentLite })}>Remove</button>}
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <section className="sa-card">
            <h2 className="sa-h2" style={{ marginBottom: 6 }}>Plan history</h2>
            {data.planHistory.length === 0 && <p className="sa-muted" style={{ margin: 0 }}>No plan changes recorded yet.</p>}
            {data.planHistory.map((ev) => (
              <div key={ev.id} className="m3-tl">
                <span className="m3-tdot" style={{ background: ev.action.startsWith("payment") ? TONE.green : ev.action === "cancelled" || ev.action === "refunded" ? TONE.rose : TONE.indigo }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14 }}>
                    <strong>{ACTION_LABEL[ev.action] || ev.action}</strong>{ev.batchId ? <span className="sa-chip t-indigo" style={{ marginLeft: 6 }}>bulk</span> : null}
                  </div>
                  <div style={{ fontSize: 12 }}>{describeChange(ev)}</div>
                  <div className="sa-muted" style={{ fontSize: 12 }}>{fmtDateTime(ev.at)} · {ev.actor}{ev.reason ? ` · “${ev.reason}”` : ""}</div>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="m3-right">
          <section className="sa-card">
            <h2 className="sa-h2" style={{ marginBottom: 12 }}>Current plan</h2>
            {q && activeSub ? (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                  <strong style={{ fontSize: 16 }}>{q.planName}</strong> <PlanStatusChip status={activeSub.status} />
                </div>
                <div className="m3-meter-row"><span>Total contacts</span><strong>{q.totalUsed} / {limitText(q.totalLimit)}</strong></div>
                <div className="m3-meter"><span style={{ width: `${pct(q.totalUsed, q.totalLimit)}%` }} /></div>
                <div className="m3-meter-row" style={{ marginTop: 12 }}><span>Today</span><strong>{q.todayUsed} / {limitText(q.dailyLimit)}</strong></div>
                <div className="m3-meter"><span style={{ width: `${pct(q.todayUsed, q.dailyLimit)}%` }} /></div>
                <div className="sa-muted" style={{ fontSize: 12, marginTop: 10 }}>
                  {fmtDate(q.startsAt)} → {fmtDate(q.expiresAt)} · price {inr(activeSub.price)} · daily reset 00:00 IST
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  {(["edit", "extend", "add_contacts", "set_contacts", "cancel"] as ChangeKind[]).map((k) => (
                    <button key={k} type="button" className="sa-btn ghost m3-sm" style={k === "cancel" ? { color: "#b42358" } : undefined}
                      onClick={() => setChange({ kind: k, sub: activeSub })}>
                      {{ edit: "Edit", extend: "Extend", add_contacts: "Add contacts", set_contacts: "Contact limits", cancel: "Cancel", set_end: "End date" }[k]}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <p className="sa-muted" style={{ margin: 0 }}>
                  {lastSub ? `No active plan — last: ${String(lastSub.plan_name_snapshot || "Plan")} (${String(lastSub.effective_status || lastSub.status)}). ` : "No plan yet. "}
                  Contact details are locked for this member.
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12 }}>
                  <button type="button" className="sa-btn pri m3-sm" onClick={() => setAssignOpen(true)}>Assign plan</button>
                  <button type="button" className="sa-btn ghost m3-sm" onClick={() => setRenewFree(true)}>Give Free plan</button>
                  {lastSub && String(lastSub.effective_status) === "expired" && (
                    <button type="button" className="sa-btn ghost m3-sm" onClick={() => setChange({ kind: "extend", sub: toMemberPlan(lastSub) })}>Extend last plan</button>
                  )}
                </div>
              </>
            )}
          </section>

          {data.upgradeRequests.length > 0 && (
            <section className="sa-card">
              <h2 className="sa-h2" style={{ marginBottom: 10 }}>Upgrade requests</h2>
              {data.upgradeRequests.map((r) => (
                <div key={String(r.id)} className="m3-tl">
                  <span className="m3-tdot" style={{ background: r.status === "new" ? TONE.rose : r.status === "contacted" ? TONE.amber : TONE.grey }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14 }}><strong>{String(r.plan_name || r.plan_code || "Plan")}</strong> · {String(r.status)}</div>
                    <div className="sa-muted" style={{ fontSize: 12 }}>
                      {fmtDateTime(r.created_at)} · call {phoneFmt(String(r.callback_number || ""))}{r.note ? ` · “${String(r.note)}”` : ""}
                    </div>
                  </div>
                </div>
              ))}
              <Link href="/superadmin/pipeline" style={{ fontSize: 12 }}>Open Upgrade pipeline</Link>
            </section>
          )}

          <section className="sa-card">
            <h2 className="sa-h2" style={{ marginBottom: 10 }}>Internal notes</h2>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                className="rv-input"
                style={{ marginTop: 0 }}
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNote()}
                placeholder="Only admins see this"
                aria-label="New note"
              />
              <button type="button" className="sa-btn pri" onClick={addNote} disabled={noteBusy || !noteText.trim()} aria-label="Add note"><Plus size={16} /></button>
            </div>
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {data.notes.length === 0 && <p className="sa-muted" style={{ fontSize: 13, margin: 0 }}>No notes yet.</p>}
              {data.notes.map((n) => (
                <div key={String(n.id)} className="m3-note">
                  <div style={{ fontSize: 13, whiteSpace: "pre-wrap" }}>{String(n.body)}</div>
                  <div className="sa-muted" style={{ fontSize: 11, marginTop: 4 }}>{fmtDateTime(n.created_at)}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="sa-card" style={{ borderColor: "#f3c4d4" }}>
            <h2 className="sa-h2" style={{ marginBottom: 6, color: "#b42358" }}>Danger zone</h2>
            <p className="sa-muted" style={{ fontSize: 12, margin: "0 0 10px" }}>Deleting removes the login and moves all profiles to trash.</p>
            <button type="button" className="sa-btn ghost" style={{ color: "#b42358", borderColor: "#f3c4d4" }} disabled={busy} onClick={() => accountAction("delete")}>
              <Trash2 size={16} /> Delete account
            </button>
          </section>
        </div>
      </div>

      {(assignOpen || renewFree) && (
        <AssignPlanDialog
          accountIds={[a.id]}
          freeOnly={renewFree}
          label={`${a.name || "Unnamed"} · ${a.accountCode || ""}`}
          current={activeSub ? { name: activeSub.name, endsAt: activeSub.expiresAt } : null}
          defaultPlanId={search.get("plan")}
          defaultPayer={phoneFmt(a.phone).replace(/\s/g, "")}
          onClose={() => { setAssignOpen(false); setRenewFree(false); }}
          onDone={afterSave}
        />
      )}
      {change && (
        <ChangePlanDialog kind={change.kind} sub={change.sub} label={`${a.name || "Unnamed"} · ${a.accountCode || ""}`} onClose={() => setChange(null)} onDone={afterSave} />
      )}
      {payDialog && (
        <PaymentDialog
          mode={payDialog.mode}
          accountId={a.id}
          payment={payDialog.payment}
          plans={planOptions}
          defaultSubscriptionId={activeSub?.id || null}
          defaultPayer={phoneFmt(a.phone).replace(/\s/g, "")}
          onClose={() => setPayDialog(null)}
          onDone={afterSave}
        />
      )}
      {transferId && (
        <ProfileTransferModal
          open
          profileId={transferId}
          note="Moved from Account 360°"
          onClose={() => setTransferId(null)}
          onTransferred={() => {
            setTransferId(null);
            setSaved("Profile moved to the other account.");
            load();
          }}
        />
      )}
    </div>
  );
}
