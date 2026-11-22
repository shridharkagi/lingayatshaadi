"use client";

/**
 * Plan dialogs shared by the Plans page (single + bulk) and the account page.
 * All writes go to /api/superadmin/plans/{actions,payments}; every change
 * needs a reason and is logged server-side.
 */
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";

export type PlanTemplate = {
  id: string;
  code: string;
  name: string;
  price: number;
  duration_days: number;
  total_contact_views: number | null;
  daily_contact_view_limit: number | null;
  is_active: boolean;
  archived_at: string | null;
  sort_order: number;
  activeMembers?: number;
};

/** The member's own plan values (a user_subscriptions row, trimmed). */
export type MemberPlan = {
  id: string;
  name: string;
  status: string;
  startsAt: string;
  expiresAt: string;
  totalLimit: number | null;
  dailyLimit: number | null;
  price: number;
  notes?: string | null;
};

export type PaymentLite = {
  id: string;
  subscription_id: string | null;
  amount: number;
  refunded_amount: number;
  status: string;
  payment_mode: string | null;
  payment_mode_details?: string | null;
  external_txn_id: string | null;
  payer_source: string | null;
  paid_at: string | null;
  notes: string | null;
  provider: string;
};

export const PAYMENT_MODES = [
  { id: "upi", label: "UPI" },
  { id: "phonepe", label: "PhonePe" },
  { id: "gpay", label: "Google Pay" },
  { id: "bank_transfer", label: "Bank transfer" },
  { id: "cash", label: "Cash" },
  { id: "check", label: "Cheque" },
  { id: "other", label: "Other" },
];

export const STATUS_CHIP: Record<string, [string, string]> = {
  active: ["Active", "t-green"],
  expiring: ["Expiring soon", "t-amber"],
  upcoming: ["Starts later", "t-indigo"],
  expired: ["Expired", "t-grey"],
  cancelled: ["Cancelled", "t-rose"],
  refunded: ["Refunded", "t-rose"],
  none: ["No plan", "t-grey"],
};

export function PlanStatusChip({ status }: { status: string }) {
  const [label, cls] = STATUS_CHIP[status] || [status, "t-grey"];
  return <span className={`sa-chip ${cls}`}>{label}</span>;
}

export const inr = (n: unknown) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
export const limitText = (n: number | null | undefined) => (n === null || n === undefined ? "Unlimited" : String(n));
export const fmtDay = (s?: string | null) =>
  s ? new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—";

/** YYYY-MM-DD in IST. */
export const istDate = (d: Date | string = new Date()) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const startOfDayIso = (day: string) => new Date(`${day}T00:00:00+05:30`).toISOString();
const endOfDayIso = (day: string) => new Date(`${day}T23:59:59+05:30`).toISOString();
const addDays = (day: string, n: number) => istDate(new Date(new Date(`${day}T12:00:00+05:30`).getTime() + n * 86_400_000));

export function usePlanTemplates() {
  const [plans, setPlans] = useState<PlanTemplate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let off = false;
    adminFetch("/api/superadmin/plans")
      .then((r) => r.json())
      .then((j) => !off && (j.plans ? setPlans(j.plans) : setError(j.error || "Couldn't load plans")))
      .catch(() => !off && setError("Couldn't load plans"));
    return () => {
      off = true;
    };
  }, [tick]);
  return { plans, error, reload: () => setTick((t) => t + 1) };
}

async function post<T = Record<string, unknown>>(url: string, body: unknown): Promise<T> {
  const res = await adminFetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || "Couldn't save");
  return json;
}

type BulkResult = { succeeded: number; failed: number; results: { accountId: string | null; ok: boolean; error?: string }[] };

export function Dialog({ title, subtitle, onClose, children, width = 560 }: { title: string; subtitle?: string; onClose: () => void; children: React.ReactNode; width?: number }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="wa-scrim" onClick={onClose}>
      <div className="wa-panel sa-card" style={{ width: `min(${width}px, 100%)`, overflowY: "auto" }} role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="wa-head">
          <div>
            <h2 className="sa-h2" style={{ fontSize: 17, margin: 0 }}>{title}</h2>
            {subtitle && <p className="sa-muted" style={{ fontSize: 12, margin: "4px 0 0" }}>{subtitle}</p>}
          </div>
          <button type="button" className="sa-btn ghost" style={{ width: 36, padding: 0 }} onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Number input with an "Unlimited" switch (null = unlimited). */
function LimitField({ label, value, onChange }: { label: string; value: number | null; onChange: (v: number | null) => void }) {
  const unlimited = value === null;
  return (
    <label>
      <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        {label}
        <span style={{ display: "inline-flex", gap: 4, alignItems: "center", fontSize: 11 }}>
          <input type="checkbox" style={{ height: 14, width: 14 }} checked={unlimited} onChange={(e) => onChange(e.target.checked ? null : 0)} />
          Unlimited
        </span>
      </span>
      <input type="number" min={0} value={unlimited ? "" : value} placeholder={unlimited ? "Unlimited" : "0"} disabled={unlimited}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Math.max(0, Math.floor(Number(e.target.value))))} />
    </label>
  );
}

function ReasonField({ value, onChange, required = true }: { value: string; onChange: (v: string) => void; required?: boolean }) {
  return (
    <label className="full">
      Reason{required ? " *" : ""} <span style={{ fontSize: 11 }}>(saved in the change log)</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="e.g. Paid ₹1999 on PhonePe / goodwill extension" maxLength={300} />
    </label>
  );
}

function BulkSummary({ result, onDone }: { result: BulkResult; onDone: () => void }) {
  const failed = result.results.filter((r) => !r.ok);
  return (
    <div>
      <div className={result.failed ? "m3-error" : "m3-ok"} role="status">
        <strong>{result.succeeded} updated</strong>
        {result.failed ? ` · ${result.failed} not changed` : ""}
      </div>
      {failed.length > 0 && (
        <ul className="sa-muted" style={{ fontSize: 12, maxHeight: 180, overflow: "auto", paddingLeft: 18 }}>
          {failed.map((f, i) => <li key={i}>{f.accountId?.slice(0, 8)}… — {f.error}</li>)}
        </ul>
      )}
      <button type="button" className="sa-btn pri" style={{ width: "100%", marginTop: 12 }} onClick={onDone}>Done</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Assign (single or bulk)
// ---------------------------------------------------------------------------

export function AssignPlanDialog({
  accountIds,
  label,
  current,
  defaultPlanId,
  defaultPayer,
  freeOnly = false,
  onClose,
  onDone,
}: {
  accountIds: string[];
  label: string;
  current?: { name: string; endsAt: string } | null;
  defaultPlanId?: string | null;
  defaultPayer?: string | null;
  freeOnly?: boolean;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const single = accountIds.length === 1;
  const { plans, error: plansErr } = usePlanTemplates();
  const usable = useMemo(
    () => plans.filter((p) => !p.archived_at && (!freeOnly || p.code === "free")).sort((a, b) => a.sort_order - b.sort_order || a.price - b.price),
    [plans, freeOnly]
  );
  const [planId, setPlanId] = useState("");
  const plan = usable.find((p) => p.id === planId) || null;

  const today = istDate();
  const [startDay, setStartDay] = useState(today);
  const [endDay, setEndDay] = useState("");
  const [endTouched, setEndTouched] = useState(false);
  const [total, setTotal] = useState<number | null>(0);
  const [daily, setDaily] = useState<number | null>(0);
  const [price, setPrice] = useState("0");
  const [notes, setNotes] = useState("");
  const [withPayment, setWithPayment] = useState(false);
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("upi");
  const [modeDetails, setModeDetails] = useState("");
  const [txn, setTxn] = useState("");
  const [payer, setPayer] = useState(defaultPayer || "");
  const [paidDay, setPaidDay] = useState(today);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  const choose = (p: PlanTemplate) => {
    setPlanId(p.id);
    setTotal(p.total_contact_views);
    setDaily(p.daily_contact_view_limit);
    setPrice(String(p.price ?? 0));
    setAmount(String(p.price ?? 0));
    setWithPayment(single && Number(p.price) > 0);
    setReason(Number(p.price) > 0 ? "Payment received" : p.code === "free" ? "Free plan" : "Plan assigned");
    if (!endTouched) setEndDay(addDays(startDay, p.duration_days));
  };
  useEffect(() => {
    if (planId || usable.length === 0) return;
    const pick = usable.find((p) => p.id === defaultPlanId) || (freeOnly ? usable[0] : usable.find((p) => p.price > 0) || usable[0]);
    if (pick) choose(pick);
  }, [usable, defaultPlanId]);
  useEffect(() => {
    if (plan && !endTouched) setEndDay(addDays(startDay, plan.duration_days));
  }, [startDay, plan, endTouched]);

  const save = async () => {
    setError(null);
    if (!plan) return setError("Choose a plan");
    if (!endDay || endDay <= startDay) return setError("End date must be after the start date");
    if (!single && !reason.trim()) return setError("Add a reason for this bulk change");
    if (withPayment) {
      if (!(Number(amount) > 0)) return setError("Enter the amount received");
      if (!txn.trim() && mode !== "cash") return setError("Transaction / reference ID is required (except cash)");
      if (mode === "other" && !modeDetails.trim()) return setError("Describe the payment mode");
    }
    setSaving(true);
    try {
      const json = await post<BulkResult>("/api/superadmin/plans/actions", {
        action: "assign",
        accountIds,
        reason: reason.trim(),
        params: {
          planId: plan.id,
          startsAt: startDay === today ? null : startOfDayIso(startDay),
          expiresAt: endTouched ? endOfDayIso(endDay) : null,
          totalContacts: total,
          dailyLimit: daily,
          price: Number(price || 0),
          notes: notes.trim() || null,
          payment: single && withPayment
            ? { amount: Number(amount), mode, modeDetails: modeDetails || null, transactionId: txn.trim() || null, payerSource: payer.trim() || null, paidAt: new Date(`${paidDay}T12:00:00+05:30`).toISOString() }
            : null,
        },
      });
      if (single) onDone(`${plan.name} assigned — active until ${fmtDay(endTouched ? endOfDayIso(endDay) : addDaysIso(startDay === today ? new Date().toISOString() : startOfDayIso(startDay), plan.duration_days))}.`);
      else setResult(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Dialog title={`${plan?.name || "Plan"} assigned`} onClose={() => onDone(`${result.succeeded} account(s) updated.`)}>
        <BulkSummary result={result} onDone={() => onDone(`${plan?.name}: ${result.succeeded} account(s) updated${result.failed ? `, ${result.failed} skipped` : ""}.`)} />
      </Dialog>
    );
  }

  return (
    <Dialog title={freeOnly ? "Renew Free plan" : "Assign plan"} subtitle={`${label}. Any current plan ends now and is kept in history.`} onClose={onClose} width={620}>
      {plansErr && <div className="m3-error">{plansErr}</div>}
      <div className="m3-plans">
        {usable.map((p) => (
          <button key={p.id} type="button" className={`m3-plan ${p.id === planId ? "on" : ""}`} onClick={() => choose(p)}>
            <strong>{p.name}</strong> {!p.is_active && <span className="sa-chip t-grey" style={{ fontSize: 10 }}>Hidden</span>}
            <span className="sa-muted" style={{ display: "block", fontSize: 12 }}>{inr(p.price)} · {p.duration_days} days</span>
            <span className="sa-muted" style={{ display: "block", fontSize: 12 }}>{limitText(p.total_contact_views)} contacts · {limitText(p.daily_contact_view_limit)}/day</span>
          </button>
        ))}
      </div>

      <h3 className="sa-h2" style={{ fontSize: 14, margin: "16px 0 0" }}>This member&apos;s plan {single ? "" : "(same for all selected)"}</h3>
      <div className="m3-form">
        <label>Starts<input type="date" value={startDay} max={today} onChange={(e) => setStartDay(e.target.value)} /></label>
        <label>Ends<input type="date" value={endDay} min={addDays(startDay, 1)} onChange={(e) => { setEndTouched(true); setEndDay(e.target.value); }} /></label>
        <LimitField label="Total contacts" value={total} onChange={setTotal} />
        <LimitField label="Contacts per day" value={daily} onChange={setDaily} />
        <label>Plan price for this member (₹)<input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
        <label>Note (optional)<input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Diwali offer" /></label>
      </div>

      {single && (
        <>
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 14, fontSize: 13 }}>
            <input type="checkbox" checked={withPayment} onChange={(e) => setWithPayment(e.target.checked)} /> Record a payment now
          </label>
          {withPayment && (
            <div className="m3-form">
              <label>Amount received (₹) *<input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
              <label>Mode<select value={mode} onChange={(e) => setMode(e.target.value)}>{PAYMENT_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
              {mode === "other" && <label className="full">Payment details *<input value={modeDetails} onChange={(e) => setModeDetails(e.target.value)} /></label>}
              <label>Transaction / reference ID{mode !== "cash" ? " *" : ""}<input value={txn} onChange={(e) => setTxn(e.target.value)} placeholder="UPI / bank reference" /></label>
              <label>Paid from (phone / account)<input value={payer} onChange={(e) => setPayer(e.target.value)} /></label>
              <label>Payment date<input type="date" value={paidDay} max={today} onChange={(e) => setPaidDay(e.target.value)} /></label>
            </div>
          )}
        </>
      )}

      <div className="m3-form"><ReasonField value={reason} onChange={setReason} required={!single} /></div>

      <div className="m3-summary">
        <strong>What will happen</strong>
        {single && current ? <span>• Current {current.name} plan ends now (kept in history)</span> : null}
        {!single && <span>• {accountIds.length} accounts: any current plan ends now</span>}
        <span>• {plan?.name || "—"}: {fmtDay(startOfDayIso(startDay))} → {endDay ? fmtDay(endOfDayIso(endDay)) : "—"}</span>
        <span>• Contacts: {limitText(total)} total · {limitText(daily)} per day</span>
        {single && withPayment && <span>• Payment of {inr(amount)} recorded</span>}
        <span>• Member notified · change logged{reason.trim() ? ` (“${reason.trim()}”)` : ""}</span>
      </div>
      {error && <div className="m3-error">{error}</div>}
      <button type="button" className="sa-btn pri" style={{ width: "100%", marginTop: 14, minHeight: 46 }} onClick={save} disabled={saving || !plan}>
        {saving ? "Saving…" : single ? "Save plan" : `Assign to ${accountIds.length} accounts`}
      </button>
    </Dialog>
  );
}
const addDaysIso = (iso: string, n: number) => new Date(new Date(iso).getTime() + n * 86_400_000).toISOString();

// ---------------------------------------------------------------------------
// Change an existing plan (single subscription or bulk by account)
// ---------------------------------------------------------------------------

export type ChangeKind = "extend" | "set_end" | "set_contacts" | "add_contacts" | "edit" | "cancel";

const KIND_TITLE: Record<ChangeKind, string> = {
  extend: "Extend validity",
  set_end: "Set end date",
  set_contacts: "Set contact limits",
  add_contacts: "Add contacts",
  edit: "Edit plan",
  cancel: "Cancel plan",
};

export function ChangePlanDialog({
  kind,
  accountIds,
  sub,
  label,
  onClose,
  onDone,
}: {
  kind: ChangeKind;
  /** Bulk/account target (uses each account's current or latest plan). */
  accountIds?: string[];
  /** Single plan row (account page). */
  sub?: MemberPlan | null;
  label: string;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const bulk = !sub && (accountIds?.length || 0) > 1;
  const [days, setDays] = useState("30");
  const [endDay, setEndDay] = useState(sub ? istDate(sub.expiresAt) : istDate());
  const [startDay, setStartDay] = useState(sub ? istDate(sub.startsAt) : istDate());
  const [setTotalOn, setSetTotalOn] = useState(true);
  const [setDailyOn, setSetDailyOn] = useState(kind === "edit");
  const [total, setTotal] = useState<number | null>(sub ? sub.totalLimit : 0);
  const [daily, setDaily] = useState<number | null>(sub ? sub.dailyLimit : 0);
  const [delta, setDelta] = useState("10");
  const [price, setPrice] = useState(sub ? String(sub.price) : "0");
  const [notes, setNotes] = useState(sub?.notes || "");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BulkResult | null>(null);

  const save = async () => {
    setError(null);
    if (!reason.trim()) return setError("Add a reason — every change is logged");
    const params: Record<string, unknown> = {};
    if (kind === "extend") {
      const d = Math.floor(Number(days));
      if (!d) return setError("Enter the number of days");
      params.days = d;
    } else if (kind === "set_end") params.expiresAt = endOfDayIso(endDay);
    else if (kind === "set_contacts") {
      if (!setTotalOn && !setDailyOn) return setError("Choose what to change");
      if (setTotalOn) params.totalContacts = total;
      if (setDailyOn) params.dailyLimit = daily;
    } else if (kind === "add_contacts") {
      const d = Math.floor(Number(delta));
      if (!d) return setError("Enter how many contacts to add");
      params.delta = d;
    } else if (kind === "edit") {
      if (endDay <= startDay) return setError("End date must be after the start date");
      params.patch = {
        startsAt: sub && istDate(sub.startsAt) === startDay ? undefined : startOfDayIso(startDay),
        expiresAt: sub && istDate(sub.expiresAt) === endDay ? undefined : endOfDayIso(endDay),
        totalContacts: total,
        dailyLimit: daily,
        price: Number(price || 0),
        notes: notes,
      };
    }
    setSaving(true);
    try {
      const json = await post<BulkResult>("/api/superadmin/plans/actions", {
        action: kind,
        ...(sub ? { subscriptionId: sub.id } : { accountIds }),
        reason: reason.trim(),
        params,
      });
      if (bulk) setResult(json);
      else onDone(`${KIND_TITLE[kind]}: saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  if (result) {
    return (
      <Dialog title={KIND_TITLE[kind]} onClose={() => onDone(`${result.succeeded} account(s) updated.`)}>
        <BulkSummary result={result} onDone={() => onDone(`${KIND_TITLE[kind]}: ${result.succeeded} account(s) updated${result.failed ? `, ${result.failed} skipped` : ""}.`)} />
      </Dialog>
    );
  }

  return (
    <Dialog title={KIND_TITLE[kind]} subtitle={label} onClose={onClose}>
      {sub && (
        <div className="m3-summary" style={{ marginTop: 0 }}>
          <span><strong>{sub.name}</strong> · {fmtDay(sub.startsAt)} → {fmtDay(sub.expiresAt)}</span>
          <span>{limitText(sub.totalLimit)} contacts · {limitText(sub.dailyLimit)}/day · price {inr(sub.price)}</span>
        </div>
      )}
      {bulk && kind !== "cancel" && (
        <p className="sa-muted" style={{ fontSize: 12 }}>Applies to each account&apos;s current plan (or its most recent one if it has ended).</p>
      )}
      <div className="m3-form">
        {kind === "extend" && (
          <label className="full">
            Add days (from the end date, or from today if it already ended)
            <input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
            <span style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {[7, 15, 30, 90, 180].map((d) => (
                <button key={d} type="button" className="sa-btn ghost m3-sm" onClick={() => setDays(String(d))}>+{d}</button>
              ))}
            </span>
          </label>
        )}
        {kind === "set_end" && <label className="full">New end date<input type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)} /></label>}
        {kind === "set_contacts" && (
          <>
            <div>
              <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" style={{ height: 14 }} checked={setTotalOn} onChange={(e) => setSetTotalOn(e.target.checked)} /> Change total</label>
              {setTotalOn && <LimitField label="Total contacts" value={total} onChange={setTotal} />}
            </div>
            <div>
              <label style={{ flexDirection: "row", alignItems: "center", gap: 6 }}><input type="checkbox" style={{ height: 14 }} checked={setDailyOn} onChange={(e) => setSetDailyOn(e.target.checked)} /> Change per day</label>
              {setDailyOn && <LimitField label="Contacts per day" value={daily} onChange={setDaily} />}
            </div>
          </>
        )}
        {kind === "add_contacts" && (
          <label className="full">Contacts to add (use a negative number to remove)<input type="number" value={delta} onChange={(e) => setDelta(e.target.value)} /></label>
        )}
        {kind === "edit" && (
          <>
            <label>Starts<input type="date" value={startDay} onChange={(e) => setStartDay(e.target.value)} /></label>
            <label>Ends<input type="date" value={endDay} onChange={(e) => setEndDay(e.target.value)} /></label>
            <LimitField label="Total contacts" value={total} onChange={setTotal} />
            <LimitField label="Contacts per day" value={daily} onChange={setDaily} />
            <label>Plan price for this member (₹)<input type="number" min={0} value={price} onChange={(e) => setPrice(e.target.value)} /></label>
            <label>Note<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </>
        )}
        {kind === "cancel" && (
          <p className="full" style={{ fontSize: 13, margin: 0 }}>
            The plan ends now; contact details lock for {bulk ? "these members" : "this member"}. The plan and its payments stay in history.
            To return money, use <strong>Refund</strong> on the payment instead.
          </p>
        )}
        <ReasonField value={reason} onChange={setReason} />
      </div>
      {error && <div className="m3-error">{error}</div>}
      <button
        type="button"
        className="sa-btn pri"
        style={{ width: "100%", marginTop: 14, minHeight: 46, ...(kind === "cancel" ? { background: "#b42358" } : {}) }}
        onClick={save}
        disabled={saving}
      >
        {saving ? "Saving…" : bulk ? `${KIND_TITLE[kind]} for ${accountIds?.length} accounts` : kind === "cancel" ? "Cancel plan" : "Save"}
      </button>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------

export function PaymentDialog({
  mode,
  accountId,
  payment,
  plans,
  defaultSubscriptionId,
  defaultPayer,
  onClose,
  onDone,
}: {
  mode: "add" | "edit" | "refund" | "remove";
  accountId: string;
  payment?: PaymentLite | null;
  /** The account's plans, to link a payment to one. */
  plans: { id: string; label: string }[];
  defaultSubscriptionId?: string | null;
  defaultPayer?: string | null;
  onClose: () => void;
  onDone: (msg: string) => void;
}) {
  const today = istDate();
  const p = payment;
  const remaining = p ? Number(p.amount) - Number(p.refunded_amount || 0) : 0;
  const [subscriptionId, setSubscriptionId] = useState(p?.subscription_id || defaultSubscriptionId || "");
  const [amount, setAmount] = useState(mode === "refund" ? String(remaining) : p ? String(p.amount) : "");
  const [payMode, setPayMode] = useState(p?.payment_mode || "upi");
  const [modeDetails, setModeDetails] = useState(p?.payment_mode_details || "");
  const [txn, setTxn] = useState(p?.external_txn_id || "");
  const [payer, setPayer] = useState(p?.payer_source || defaultPayer || "");
  const [day, setDay] = useState(p?.paid_at && mode !== "refund" ? istDate(p.paid_at) : today);
  const [notes, setNotes] = useState(p?.notes || "");
  const [endPlan, setEndPlan] = useState(true);
  const [reason, setReason] = useState(mode === "add" ? "Payment received" : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const title = { add: "Record payment", edit: "Edit payment", refund: "Refund payment", remove: "Remove payment" }[mode];
  const isFullRefund = mode === "refund" && Number(amount) >= remaining;

  const save = async () => {
    setError(null);
    if (!reason.trim()) return setError("Add a reason — every payment change is logged");
    if ((mode === "add" || mode === "edit" || mode === "refund") && !(Number(amount) > 0)) return setError("Enter an amount");
    if ((mode === "add" || mode === "edit") && !txn.trim() && payMode !== "cash") return setError("Transaction / reference ID is required (except cash)");
    setSaving(true);
    try {
      const at = new Date(`${day}T12:00:00+05:30`).toISOString();
      if (mode === "add") {
        await post("/api/superadmin/plans/payments", {
          action: "add",
          accountId,
          subscriptionId: subscriptionId || null,
          reason: reason.trim(),
          payment: { amount: Number(amount), mode: payMode, modeDetails: modeDetails || null, transactionId: txn.trim() || null, payerSource: payer.trim() || null, paidAt: at, notes: notes.trim() || null },
        });
      } else if (mode === "edit") {
        await post("/api/superadmin/plans/payments", {
          action: "update",
          paymentId: p!.id,
          reason: reason.trim(),
          patch: { amount: Number(amount), mode: payMode, modeDetails: modeDetails || null, transactionId: txn.trim() || null, payerSource: payer.trim() || null, paidAt: at, notes: notes.trim() || null },
        });
      } else if (mode === "refund") {
        await post("/api/superadmin/plans/payments", {
          action: "refund",
          paymentId: p!.id,
          reason: reason.trim(),
          refund: { amount: Number(amount), refundedAt: at, mode: payMode, endPlan: !!p!.subscription_id && endPlan },
        });
      } else {
        await post("/api/superadmin/plans/payments", { action: "remove", paymentId: p!.id, reason: reason.trim() });
      }
      onDone(`${title}: saved.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog title={title} subtitle={p ? `${inr(p.amount)} · ${String(p.payment_mode || "").replace(/_/g, " ")} · ${p.external_txn_id || "no reference"}` : "Offline payment (UPI, bank, cash…)"} onClose={onClose}>
      <div className="m3-form">
        {(mode === "add" || mode === "edit") && (
          <>
            <label>Amount (₹) *<input type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label>Mode<select value={payMode} onChange={(e) => setPayMode(e.target.value)}>{PAYMENT_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            {payMode === "other" && <label className="full">Payment details<input value={modeDetails} onChange={(e) => setModeDetails(e.target.value)} /></label>}
            <label>Transaction / reference ID{payMode !== "cash" ? " *" : ""}<input value={txn} onChange={(e) => setTxn(e.target.value)} /></label>
            <label>Paid from (phone / account)<input value={payer} onChange={(e) => setPayer(e.target.value)} /></label>
            <label>Payment date<input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} /></label>
            {mode === "add" && (
              <label>
                For plan
                <select value={subscriptionId} onChange={(e) => setSubscriptionId(e.target.value)}>
                  <option value="">Not linked to a plan</option>
                  {plans.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              </label>
            )}
            <label className="full">Note<input value={notes} onChange={(e) => setNotes(e.target.value)} /></label>
          </>
        )}
        {mode === "refund" && (
          <>
            <label>Refund amount (₹) — up to {inr(remaining)}<input type="number" min={1} max={remaining} value={amount} onChange={(e) => setAmount(e.target.value)} /></label>
            <label>Refunded via<select value={payMode} onChange={(e) => setPayMode(e.target.value)}>{PAYMENT_MODES.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
            <label>Refund date<input type="date" value={day} max={today} onChange={(e) => setDay(e.target.value)} /></label>
            {p?.subscription_id && (
              <label style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "end" }}>
                <input type="checkbox" style={{ height: 14 }} checked={endPlan} onChange={(e) => setEndPlan(e.target.checked)} />
                End the plan now{isFullRefund ? " (recommended)" : ""}
              </label>
            )}
          </>
        )}
        {mode === "remove" && (
          <p className="full" style={{ fontSize: 13, margin: 0 }}>
            Use this only for a payment entered by mistake. It is kept as “removed” in history and no longer counts in totals. To return money, use Refund.
          </p>
        )}
        <ReasonField value={reason} onChange={setReason} />
      </div>
      {error && <div className="m3-error">{error}</div>}
      <button type="button" className="sa-btn pri" style={{ width: "100%", marginTop: 14, minHeight: 46 }} onClick={save} disabled={saving}>
        {saving ? "Saving…" : title}
      </button>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Change log helpers
// ---------------------------------------------------------------------------

export const ACTION_LABEL: Record<string, string> = {
  assigned: "Plan assigned",
  replaced: "Plan replaced",
  updated: "Plan edited",
  reactivated: "Plan reactivated",
  cancelled: "Plan cancelled",
  refunded: "Plan ended (refund)",
  payment_recorded: "Payment recorded",
  payment_updated: "Payment edited",
  payment_refunded: "Payment refunded",
  payment_removed: "Payment removed",
  template_created: "Template created",
  template_updated: "Template edited",
  template_archived: "Template archived",
  template_restored: "Template restored",
};

const FIELD_LABEL: Record<string, string> = {
  expires_at: "ends", starts_at: "starts", total_contact_views_snapshot: "total contacts", daily_contact_view_limit_snapshot: "per day",
  price_snapshot: "price", notes: "note", status: "status", amount: "amount", refunded_amount: "refunded", external_txn_id: "txn",
  payment_mode: "mode", paid_at: "paid on", price: "price", duration_days: "days", total_contact_views: "total contacts",
  daily_contact_view_limit: "per day", is_active: "visible", name: "name", archived_at: "archived", refund_now: "refund",
};

/** Short human summary of what changed. */
export function describeChange(e: { action: string; before: Record<string, unknown> | null; after: Record<string, unknown> | null; planName?: string | null }) {
  const fmt = (k: string, v: unknown) => {
    if (v === null || v === undefined) return k.includes("contact") || k.includes("limit") ? "unlimited" : "—";
    if (k.endsWith("_at") && typeof v === "string") return fmtDay(v);
    if (["price", "price_snapshot", "amount", "refunded_amount", "refund_now"].includes(k)) return inr(v);
    return String(v);
  };
  const a = e.after || {};
  const b = e.before || {};
  if (e.action === "assigned") {
    return `${String(a.plan_name_snapshot || e.planName || "Plan")} · ${fmtDay(String(a.starts_at || ""))} → ${fmtDay(String(a.expires_at || ""))} · ${fmt("c", a.total_contact_views_snapshot)} contacts · ${inr(a.price_snapshot)}`;
  }
  if (e.action === "payment_recorded") return `${inr(a.amount)} · ${String(a.payment_mode || "").replace(/_/g, " ")} · ${String(a.external_txn_id || "no ref")}`;
  const keys = Object.keys(a).filter((k) => FIELD_LABEL[k] && !["refund_reason", "updated_at"].includes(k));
  return keys.map((k) => (k in b ? `${FIELD_LABEL[k]}: ${fmt(k, b[k])} → ${fmt(k, a[k])}` : `${FIELD_LABEL[k]}: ${fmt(k, a[k])}`)).join(" · ") || (e.planName ?? "");
}

