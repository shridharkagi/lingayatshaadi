"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Ban, CheckCircle2, MessageCircle, Plus, RefreshCw, Trash2, UserRound, X } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";

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
    planName: string;
    startsAt: string;
    expiresAt: string;
    totalLimit: number;
    dailyLimit: number;
    totalUsed: number;
    todayUsed: number;
  } | null;
  subscriptions: Row[];
  payments: Row[];
  upgradeRequests: Row[];
  notes: Row[];
  timeline: { at: string; kind: string; text: string; tone: string }[];
};
type Plan = {
  id: string;
  code: string;
  name: string;
  duration_days: number;
  price: number;
  total_contact_views: number;
  daily_contact_view_limit: number;
  is_active: boolean;
};

const PAYMENT_MODES = [
  { id: "phonepe", label: "PhonePe" },
  { id: "gpay", label: "Google Pay" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "cash", label: "Cash" },
  { id: "check", label: "Cheque" },
  { id: "other", label: "Other" },
];
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
const todayIso = () => new Date(Date.now() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
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

function AssignPlan({ data, onClose, onSaved }: { data: Data; onClose: () => void; onSaved: (msg: string) => void }) {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [planId, setPlanId] = useState("");
  const [mode, setMode] = useState("phonepe");
  const [modeDetails, setModeDetails] = useState("");
  const [amount, setAmount] = useState("");
  const [txn, setTxn] = useState("");
  const [payer, setPayer] = useState(phoneFmt(data.account.phone).replace(/\s/g, ""));
  const [paidOn, setPaidOn] = useState(todayIso());
  const [startOn, setStartOn] = useState(todayIso());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    adminFetch("/api/superadmin/subscriptions/plans")
      .then((r) => r.json())
      .then((j) => {
        const list = ((j.plans || []) as Plan[]).filter((p) => p.is_active !== false).sort((a, b) => Number(a.price) - Number(b.price));
        setPlans(list);
        const firstPaid = list.find((p) => Number(p.price) > 0) || list[0];
        if (firstPaid) {
          setPlanId(firstPaid.id);
          setAmount(String(firstPaid.price ?? 0));
        }
      })
      .catch(() => setError("Couldn't load plans"));
  }, []);

  const plan = plans.find((p) => p.id === planId);
  const isFree = Number(amount || 0) <= 0;
  const endDate = useMemo(() => {
    if (!plan || !startOn) return null;
    const s = new Date(`${startOn}T00:00:00+05:30`);
    return new Date(s.getTime() + Number(plan.duration_days || 0) * 86400000);
  }, [plan, startOn]);

  const save = async () => {
    setError(null);
    if (!plan) return setError("Choose a plan");
    if (!isFree && !txn.trim()) return setError("Transaction ID is required for paid plans");
    if (!isFree && !payer.trim()) return setError("Payer phone / source is required for paid plans");
    if (mode === "other" && !isFree && !modeDetails.trim()) return setError("Describe the payment mode");
    setSaving(true);
    try {
      const startsAt = new Date(`${startOn}T00:00:00+05:30`);
      const startsNow = startOn === todayIso();
      const res = await adminFetch("/api/superadmin/subscriptions/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: data.account.id,
          planId: plan.id,
          startsAt: startsNow ? undefined : startsAt.toISOString(),
          startImmediately: startsNow,
          amount: Number(amount || 0),
          paymentMode: mode,
          paymentModeDetails: modeDetails || undefined,
          transactionId: txn.trim() || undefined,
          payerSource: payer.trim() || undefined,
          paymentMadeAt: new Date(`${paidOn}T12:00:00+05:30`).toISOString(),
          note: note.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Couldn't save the plan");
      onSaved(`${plan.name} is active until ${endDate ? fmtDate(endDate.toISOString()) : "—"}. Member notified.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save the plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="sa-card m3-drawer" aria-label="Assign plan">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 className="sa-h2" style={{ fontSize: 17 }}>Assign plan</h2>
        <button type="button" className="sa-btn ghost" style={{ width: 40, padding: 0 }} onClick={onClose} aria-label="Close">
          <X size={16} />
        </button>
      </div>
      <p className="sa-muted" style={{ fontSize: 12, margin: "4px 0 14px" }}>One form, one save. Nothing changes until you press Save.</p>
      <div className="m3-plans">
        {plans.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`m3-plan ${p.id === planId ? "on" : ""}`}
            onClick={() => {
              setPlanId(p.id);
              setAmount(String(p.price ?? 0));
            }}
          >
            <strong>{p.name}</strong>
            <span className="sa-muted" style={{ display: "block", fontSize: 12 }}>
              {inr(p.price)} · {p.duration_days} days
            </span>
            <span className="sa-muted" style={{ display: "block", fontSize: 12 }}>
              {p.total_contact_views || "∞"} contacts · {p.daily_contact_view_limit || "∞"}/day
            </span>
          </button>
        ))}
      </div>
      <div className="m3-form">
        <label>Amount received (₹)<input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
        <label>
          Payment mode
          <select value={mode} onChange={(e) => setMode(e.target.value)} disabled={isFree}>
            {PAYMENT_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
        </label>
        {mode === "other" && !isFree && (
          <label className="full">Payment details<input value={modeDetails} onChange={(e) => setModeDetails(e.target.value)} placeholder="e.g. Paid at office" /></label>
        )}
        <label>Transaction ID{!isFree && " *"}<input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder={isFree ? "Not needed for free plans" : "UPI / bank reference"} disabled={isFree} /></label>
        <label>Payer phone / source{!isFree && " *"}<input value={payer} onChange={(e) => setPayer(e.target.value)} disabled={isFree} /></label>
        <label>Payment date<input type="date" value={paidOn} max={todayIso()} onChange={(e) => setPaidOn(e.target.value)} disabled={isFree} /></label>
        <label>Plan starts<input type="date" value={startOn} onChange={(e) => setStartOn(e.target.value)} /></label>
        <label className="full">Note (optional)<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Paid by father" /></label>
      </div>
      <div className="m3-summary">
        <strong>What will happen</strong>
        {data.quota ? (
          <span>• Current {data.quota.planName} ends ({data.quota.totalUsed} of {data.quota.totalLimit || "∞"} contacts used)</span>
        ) : (
          <span>• No active plan right now</span>
        )}
        <span>• {plan?.name || "—"} runs {fmtDate(`${startOn}T00:00:00+05:30`)} → {endDate ? fmtDate(endDate.toISOString()) : "—"}</span>
        <span>• Contacts: {plan ? `${plan.total_contact_views || "unlimited"} total · ${plan.daily_contact_view_limit || "unlimited"} per day` : "—"}</span>
        <span>• Payment of {inr(amount)} recorded · member notified · logged in audit</span>
      </div>
      {error && <div className="m3-error">{error}</div>}
      <button type="button" className="sa-btn pri" style={{ width: "100%", marginTop: 14, minHeight: 46 }} onClick={save} disabled={saving || !plan}>
        {saving ? "Saving…" : "Save plan"}
      </button>
    </section>
  );
}

export default function AccountPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [assignOpen, setAssignOpen] = useState(false);
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
  const liveProfiles = data.profiles.filter((p) => !p.deleted_at);
  const deletedCount = data.profiles.length - liveProfiles.length;
  const shownProfiles = showDeleted ? data.profiles : liveProfiles;
  const waDigits = (a.phone || "").replace(/\D/g, "");
  const pct = (used: number, limit: number) => (limit ? Math.min(100, Math.round((used / limit) * 100)) : 0);

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
            <h2 className="sa-h2" style={{ marginBottom: 12 }}>Plans &amp; payments</h2>
            <div style={{ overflowX: "auto" }}>
              <table className="m3-table">
                <thead><tr><th>Plan</th><th>Period</th><th>Contacts</th><th>Status</th></tr></thead>
                <tbody>
                  {data.subscriptions.length === 0 && <tr><td colSpan={4} className="sa-muted">No plans yet</td></tr>}
                  {data.subscriptions.map((s) => (
                    <tr key={String(s.id)}>
                      <td><strong>{String(s.plan_name_snapshot || "Plan")}</strong> <span className="sa-muted">{inr(s.price_snapshot)}</span></td>
                      <td>{fmtDate(s.starts_at)} → {fmtDate(s.expires_at)}</td>
                      <td>{String(s.total_contact_views_snapshot ?? "—")} · {String(s.daily_contact_view_limit_snapshot ?? "—")}/day</td>
                      <td><span className={`sa-chip ${s.status === "active" ? "t-green" : s.status === "refunded" ? "t-rose" : "t-grey"}`}>{String(s.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <table className="m3-table" style={{ marginTop: 16 }}>
                <thead><tr><th>Paid on</th><th>Amount</th><th>Mode</th><th>Reference</th><th>Status</th></tr></thead>
                <tbody>
                  {data.payments.length === 0 && <tr><td colSpan={5} className="sa-muted">No payments recorded</td></tr>}
                  {data.payments.map((p) => (
                    <tr key={String(p.id)}>
                      <td>{fmtDate(p.paid_at || p.created_at)}</td>
                      <td><strong>{inr(p.amount)}</strong></td>
                      <td>{String(p.payment_mode || p.provider || "—").replace(/_/g, " ")}</td>
                      <td className="sa-muted">{String(p.external_txn_id || "—")}</td>
                      <td><span className={`sa-chip ${p.status === "paid" ? "t-green" : "t-rose"}`}>{String(p.status)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div className="m3-right">
          {assignOpen && (
            <AssignPlan
              data={data}
              onClose={() => setAssignOpen(false)}
              onSaved={(msg) => {
                setAssignOpen(false);
                setSaved(msg);
                load();
              }}
            />
          )}
          <section className="sa-card">
            <h2 className="sa-h2" style={{ marginBottom: 12 }}>Contact quota</h2>
            {q ? (
              <>
                <div className="m3-meter-row"><span>Total</span><strong>{q.totalUsed} / {q.totalLimit || "∞"}</strong></div>
                <div className="m3-meter"><span style={{ width: `${pct(q.totalUsed, q.totalLimit)}%` }} /></div>
                <div className="m3-meter-row" style={{ marginTop: 12 }}><span>Today</span><strong>{q.todayUsed} / {q.dailyLimit || "∞"}</strong></div>
                <div className="m3-meter"><span style={{ width: `${pct(q.todayUsed, q.dailyLimit)}%` }} /></div>
                <div className="sa-muted" style={{ fontSize: 12, marginTop: 10 }}>{q.planName} ends {fmtDate(q.expiresAt)} · daily reset 00:00 IST</div>
              </>
            ) : (
              <p className="sa-muted" style={{ margin: 0 }}>No active plan — contact details are locked for this member.</p>
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
              <Link href="/superadmin/subscriptions" style={{ fontSize: 12 }}>Manage in Subscriptions</Link>
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
