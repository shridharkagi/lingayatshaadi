"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, RefreshCw, Search } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { CsvButton, PageHeader, Pager, ResetButton, downloadCsv, fmtDateTime, phoneFmt, useDebounced } from "@/components/superadmin/ui";
import {
  AssignPlanDialog,
  ChangePlanDialog,
  Dialog,
  PlanStatusChip,
  fmtDay,
  inr,
  limitText,
  usePlanTemplates,
  ACTION_LABEL,
  describeChange,
  type ChangeKind,
  type PlanTemplate,
} from "@/components/superadmin/plans/PlanDialogs";

type Member = {
  accountId: string;
  accountCode: string | null;
  name: string;
  phone: string | null;
  joinedAt: string | null;
  profiles: { id: string; publicId: string | null; name: string | null; status: string }[];
  plansCount: number;
  totalPaid: number;
  plan: {
    id: string;
    planId: string | null;
    code: string | null;
    name: string;
    status: string;
    startsAt: string;
    expiresAt: string;
    totalLimit: number | null;
    dailyLimit: number | null;
    price: number;
    paid: number;
    source: string;
    notes: string | null;
    endReason: string | null;
    used: number;
    usedToday: number;
  } | null;
};

const STATUS_TABS: { id: string; label: string; countKeys: string[] }[] = [
  { id: "all", label: "All accounts", countKeys: ["all"] },
  { id: "active", label: "Active", countKeys: ["active", "expiring"] },
  { id: "expiring", label: "Expiring in 7 days", countKeys: ["expiring"] },
  { id: "expired", label: "Expired", countKeys: ["expired"] },
  { id: "cancelled", label: "Cancelled", countKeys: ["cancelled"] },
  { id: "refunded", label: "Refunded", countKeys: ["refunded"] },
  { id: "none", label: "No plan yet", countKeys: ["none"] },
];
const SORTS = [
  { id: "end_asc", label: "Ending soonest" },
  { id: "end_desc", label: "Ending latest" },
  { id: "newest", label: "Newest accounts" },
  { id: "name", label: "Name A–Z" },
  { id: "paid_desc", label: "Paid most" },
];
const BULK: { kind: ChangeKind | "assign" | "renew_free"; label: string }[] = [
  { kind: "assign", label: "Assign plan" },
  { kind: "renew_free", label: "Renew Free" },
  { kind: "extend", label: "Extend" },
  { kind: "set_end", label: "Set end date" },
  { kind: "set_contacts", label: "Set contacts" },
  { kind: "add_contacts", label: "Add contacts" },
  { kind: "cancel", label: "Cancel plan" },
];

export default function PlansPage() {
  const [tab, setTab] = useState<"members" | "templates" | "log">("members");
  const [notice, setNotice] = useState<string | null>(null);
  const flash = (msg: string) => {
    setNotice(msg);
    window.setTimeout(() => setNotice(null), 6000);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Plans & subscriptions"
        subtitle="Plans belong to the login account (U-code) and are shared by all its profiles. Every change is logged with a reason."
      />
      <div className="sa-tabs" role="tablist">
        {([["members", "Members"], ["templates", "Plan templates"], ["log", "Change log"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`sa-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>
      {notice && <div className="m3-ok" role="status"><CheckCircle2 size={18} /> {notice}</div>}
      {tab === "members" && <MembersTab flash={flash} />}
      {tab === "templates" && <TemplatesTab flash={flash} />}
      {tab === "log" && <LogTab />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

function MembersTab({ flash }: { flash: (m: string) => void }) {
  const router = useRouter();
  const { plans } = usePlanTemplates();
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [status, setStatus] = useState("all");
  const [planF, setPlanF] = useState("");
  const [endFrom, setEndFrom] = useState("");
  const [endTo, setEndTo] = useState("");
  const [sort, setSort] = useState("end_asc");
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Member[]>([]);
  const [allIds, setAllIds] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<null | { kind: ChangeKind | "assign" | "renew_free"; ids: string[]; member?: Member }>(null);
  const [quickAssign, setQuickAssign] = useState(false);
  const [reload, setReload] = useState(0);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ status, sort, limit: String(limit), offset: String(offset) });
    if (dq.trim()) p.set("q", dq.trim());
    if (planF) p.set("plan", planF);
    if (endFrom) p.set("endFrom", endFrom);
    if (endTo) p.set("endTo", endTo);
    return p.toString();
  }, [dq, status, planF, endFrom, endTo, sort, limit, offset]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/superadmin/plans/members?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setRows(json.rows || []);
      setAllIds(json.allIds || []);
      setTotal(json.total || 0);
      setCounts(json.counts || {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [qs]);
  useEffect(() => {
    load();
  }, [load, reload]);
  useEffect(() => setOffset(0), [dq, status, planF, endFrom, endTo, sort, limit]);

  const filtersOn = !!(q || planF || endFrom || endTo || status !== "all" || sort !== "end_asc");
  const pageAll = rows.length > 0 && rows.every((r) => selected.has(r.accountId));
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const done = (msg: string) => {
    setDialog(null);
    setQuickAssign(false);
    setSelected(new Set());
    flash(msg);
    setReload((n) => n + 1);
  };
  const exportCsv = async () => {
    const p = new URLSearchParams(qs);
    p.set("limit", "500");
    p.set("offset", "0");
    const json = await (await adminFetch(`/api/superadmin/plans/members?${p}`)).json();
    const list = (json.rows || []) as Member[];
    downloadCsv(
      `plans-${status}-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Account", "Name", "Phone", "Profiles", "Plan", "Status", "Starts", "Ends", "Contacts used", "Total contacts", "Per day", "Price", "Paid (this plan)", "Paid (all time)"],
      list.map((r) => [
        r.accountCode, r.name, phoneFmt(r.phone), r.profiles.map((p) => p.publicId).join(" "), r.plan?.name, r.plan?.status,
        fmtDay(r.plan?.startsAt), fmtDay(r.plan?.expiresAt), r.plan?.used, limitText(r.plan?.totalLimit), limitText(r.plan?.dailyLimit),
        r.plan?.price, r.plan?.paid, r.totalPaid,
      ])
    );
  };

  const selIds = [...selected];
  return (
    <>
      <div className="sa-tabs" role="tablist" aria-label="Plan status">
        {STATUS_TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={status === t.id} className={`sa-tab ${status === t.id ? "on" : ""}`} onClick={() => setStatus(t.id)}>
            {t.label}<span className="cnt">{t.countKeys.reduce((s, k) => s + (counts[k] || 0), 0)}</span>
          </button>
        ))}
      </div>

      <div className="sa-toolbar">
        <label className="sa-search-box" style={{ flex: "1 1 260px", maxWidth: 380, height: 40 }}>
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search U-code, name, phone or member ID" aria-label="Search accounts" />
        </label>
        <select className={`sa-select ${planF ? "is-set" : ""}`} value={planF} onChange={(e) => setPlanF(e.target.value)} aria-label="Plan">
          <option value="">All plans</option>
          {plans.map((p) => <option key={p.id} value={p.id}>{p.name}{p.archived_at ? " (archived)" : ""}</option>)}
          <option value="none">No plan</option>
        </select>
        <label className="sa-muted" style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
          Ends
          <input type="date" className={`sa-input ${endFrom ? "is-set" : ""}`} style={{ height: 36 }} value={endFrom} onChange={(e) => setEndFrom(e.target.value)} aria-label="Ends from" />
          –
          <input type="date" className={`sa-input ${endTo ? "is-set" : ""}`} style={{ height: 36 }} value={endTo} onChange={(e) => setEndTo(e.target.value)} aria-label="Ends to" />
        </label>
        <select className={`sa-select ${sort !== "end_asc" ? "is-set" : ""}`} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
        <ResetButton show={filtersOn} onClick={() => { setQ(""); setPlanF(""); setEndFrom(""); setEndTo(""); setStatus("all"); setSort("end_asc"); }} />
        <span style={{ flex: 1 }} />
        <CsvButton onClick={exportCsv} />
        <button type="button" className="sa-btn ghost" onClick={() => setReload((n) => n + 1)} aria-label="Refresh"><RefreshCw size={16} /></button>
        <button type="button" className="sa-btn pri" onClick={() => setQuickAssign(true)}><Plus size={16} /> Assign plan</button>
      </div>

      {selected.size > 0 && (
        <div className="sa-bulk">
          <strong>{selected.size} selected</strong>
          {selected.size < total && (
            <button type="button" className="sa-btn ghost" onClick={() => setSelected(new Set(allIds))}>Select all {total} matching</button>
          )}
          <span style={{ flex: 1 }} />
          {BULK.map((b) => (
            <button key={b.kind} type="button" className="sa-btn ghost" onClick={() => setDialog({ kind: b.kind, ids: selIds })}>{b.label}</button>
          ))}
          <button type="button" className="sa-btn ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {error && <div className="m3-error">{error}</div>}
      <div className="sa-card" style={{ padding: 0 }}>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" aria-label="Select page" checked={pageAll}
                    onChange={() => setSelected((s) => {
                      const n = new Set(s);
                      rows.forEach((r) => (pageAll ? n.delete(r.accountId) : n.add(r.accountId)));
                      return n;
                    })} />
                </th>
                <th>Account</th>
                <th>Plan</th>
                <th>Validity</th>
                <th>Contacts used</th>
                <th>Price · paid</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && (
                <tr><td colSpan={7}><div className="sa-skel" style={{ height: 120 }} /></td></tr>
              )}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={7} className="sa-muted" style={{ padding: 24, textAlign: "center" }}>No accounts match these filters.</td></tr>
              )}
              {rows.map((r) => (
                <tr key={r.accountId} className="clickable" onClick={() => router.push(`/superadmin/accounts/${r.accountId}`)}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label={`Select ${r.name || r.accountCode}`} checked={selected.has(r.accountId)} onChange={() => toggle(r.accountId)} />
                  </td>
                  <td>
                    <strong>{r.name || "Unnamed"}</strong>
                    <div className="sa-muted" style={{ fontSize: 12 }}>
                      {[r.accountCode, phoneFmt(r.phone), r.profiles.map((p) => p.publicId).filter(Boolean).join(", ") || "no profile"].filter(Boolean).join(" · ")}
                    </div>
                  </td>
                  <td>
                    {r.plan ? (
                      <>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <strong>{r.plan.name}</strong> <PlanStatusChip status={r.plan.status} />
                        </div>
                        {r.plan.endReason && r.plan.status !== "active" && <div className="sa-muted" style={{ fontSize: 11 }}>{r.plan.endReason}</div>}
                      </>
                    ) : (
                      <PlanStatusChip status="none" />
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{r.plan ? `${fmtDay(r.plan.startsAt)} → ${fmtDay(r.plan.expiresAt)}` : "—"}</td>
                  <td style={{ fontSize: 12 }}>
                    {r.plan ? (
                      <>
                        {r.plan.used} / {limitText(r.plan.totalLimit)}
                        <div className="sa-muted">today {r.plan.usedToday} / {limitText(r.plan.dailyLimit)}</div>
                      </>
                    ) : "—"}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {r.plan ? `${inr(r.plan.price)} · ${inr(r.plan.paid)}` : "—"}
                    {r.totalPaid > 0 && <div className="sa-muted">all time {inr(r.totalPaid)}</div>}
                  </td>
                  <td onClick={(e) => e.stopPropagation()} style={{ whiteSpace: "nowrap" }}>
                    <button type="button" className="sa-btn ghost m3-sm" onClick={() => setDialog({ kind: "assign", ids: [r.accountId] })}>Assign</button>{" "}
                    <Link className="sa-btn ghost m3-sm" href={`/superadmin/accounts/${r.accountId}`}>Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12 }}>
          <Pager total={total} limit={limit} offset={offset} onChange={setOffset} onLimitChange={setLimit} />
        </div>
      </div>

      {quickAssign && <QuickAssign onPick={(m) => { setQuickAssign(false); setDialog({ kind: "assign", ids: [m.accountId], member: m }); }} onClose={() => setQuickAssign(false)} />}

      {dialog && (dialog.kind === "assign" || dialog.kind === "renew_free") && (() => {
        const one = dialog.ids.length === 1 ? dialog.member || rows.find((r) => r.accountId === dialog.ids[0]) || null : null;
        return (
          <AssignPlanDialog
            accountIds={dialog.ids}
            freeOnly={dialog.kind === "renew_free"}
            label={one ? `${one.name || "Unnamed"} · ${one.accountCode || ""}` : `${dialog.ids.length} accounts`}
            current={one?.plan && one.plan.status !== "cancelled" && one.plan.status !== "refunded" && one.plan.status !== "expired" ? { name: one.plan.name, endsAt: one.plan.expiresAt } : null}
            defaultPayer={one?.phone ? phoneFmt(one.phone).replace(/\s/g, "") : null}
            onClose={() => setDialog(null)}
            onDone={done}
          />
        );
      })()}
      {dialog && dialog.kind !== "assign" && dialog.kind !== "renew_free" && (
        <ChangePlanDialog kind={dialog.kind} accountIds={dialog.ids} label={`${dialog.ids.length} account${dialog.ids.length === 1 ? "" : "s"}`} onClose={() => setDialog(null)} onDone={done} />
      )}
    </>
  );
}

function QuickAssign({ onPick, onClose }: { onPick: (member: Member) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [rows, setRows] = useState<Member[]>([]);
  useEffect(() => {
    if (dq.trim().length < 2) {
      setRows([]);
      return;
    }
    let off = false;
    adminFetch(`/api/superadmin/plans/members?q=${encodeURIComponent(dq.trim())}&limit=8&sort=name`)
      .then((r) => r.json())
      .then((j) => !off && setRows(j.rows || []))
      .catch(() => {});
    return () => {
      off = true;
    };
  }, [dq]);
  return (
    <Dialog title="Assign a plan" subtitle="Find the member's account (U-code, name, phone or member ID)." onClose={onClose}>
      <label className="sa-search-box" style={{ height: 42 }}>
        <Search size={16} aria-hidden="true" />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. U2611102, Shridhar, 98444…, LG2610…" aria-label="Find account" />
      </label>
      <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
        {rows.map((r) => (
          <button key={r.accountId} type="button" className="m3-plan" onClick={() => onPick(r)}>
            <strong>{r.name || "Unnamed"}</strong> <span className="sa-muted">{r.accountCode}</span>
            <span className="sa-muted" style={{ display: "block", fontSize: 12 }}>
              {phoneFmt(r.phone)} · {r.plan ? `${r.plan.name} (${r.plan.status}) until ${fmtDay(r.plan.expiresAt)}` : "no plan"}
            </span>
          </button>
        ))}
        {dq.trim().length >= 2 && rows.length === 0 && <p className="sa-muted" style={{ fontSize: 13 }}>No account found.</p>}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Plan templates
// ---------------------------------------------------------------------------

type Draft = { name: string; price: string; days: string; total: number | null; daily: number | null; isActive: boolean; sortOrder: string };
const toDraft = (p: PlanTemplate): Draft => ({
  name: p.name, price: String(p.price), days: String(p.duration_days), total: p.total_contact_views, daily: p.daily_contact_view_limit,
  isActive: p.is_active, sortOrder: String(p.sort_order ?? 0),
});

function TemplatesTab({ flash }: { flash: (m: string) => void }) {
  const { plans, error, reload } = usePlanTemplates();
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  useEffect(() => setDrafts(Object.fromEntries(plans.map((p) => [p.id, toDraft(p)]))), [plans]);

  const send = async (body: Record<string, unknown>, okMsg: string, key: string) => {
    const reason = window.prompt(`${okMsg} — reason for the change log:`);
    if (!reason || !reason.trim()) return;
    setBusy(key);
    setErr(null);
    try {
      const res = await adminFetch("/api/superadmin/plans/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, reason: reason.trim() }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error || "Couldn't save");
      flash(okMsg);
      setCreating(false);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setBusy(null);
    }
  };
  const payload = (d: Draft) => ({
    name: d.name, price: Number(d.price || 0), durationDays: Number(d.days || 0), totalContacts: d.total, dailyLimit: d.daily,
    isActive: d.isActive, sortOrder: Number(d.sortOrder || 0),
  });
  const shown = plans.filter((p) => showArchived || !p.archived_at);
  const archivedCount = plans.filter((p) => p.archived_at).length;

  return (
    <>
      <div className="sa-card" style={{ fontSize: 13 }}>
        Templates set the <strong>default</strong> price, validity and contacts when you assign a plan. Editing a template never changes plans members
        already have — change those per member from Members or the account page. “Visible to members” controls the Membership page; hidden plans
        can still be assigned by you. Archived plans can’t be assigned.
      </div>
      {(error || err) && <div className="m3-error">{error || err}</div>}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        {archivedCount > 0 && (
          <button type="button" className="sa-btn ghost" onClick={() => setShowArchived((v) => !v)}>{showArchived ? "Hide" : "Show"} {archivedCount} archived</button>
        )}
        <button type="button" className="sa-btn pri" onClick={() => setCreating(true)}><Plus size={16} /> New plan</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
        {creating && (
          <TemplateCard
            title="New plan"
            draft={drafts.__new || { name: "", price: "0", days: "30", total: 0, daily: 0, isActive: false, sortOrder: "0" }}
            onChange={(d) => setDrafts((s) => ({ ...s, __new: d }))}
            footer={
              <div style={{ display: "flex", gap: 8 }}>
                <button type="button" className="sa-btn ghost" onClick={() => setCreating(false)}>Cancel</button>
                <button type="button" className="sa-btn pri" style={{ flex: 1 }} disabled={busy === "__new"}
                  onClick={() => send({ action: "create", ...payload(drafts.__new || { name: "", price: "0", days: "30", total: 0, daily: 0, isActive: false, sortOrder: "0" }) }, "Plan created", "__new")}>
                  Create
                </button>
              </div>
            }
          />
        )}
        {shown.map((p) => {
          const d = drafts[p.id];
          if (!d) return null;
          const dirty = JSON.stringify(d) !== JSON.stringify(toDraft(p));
          return (
            <TemplateCard
              key={p.id}
              title={p.name}
              meta={`code ${p.code} · ${p.activeMembers ?? 0} active member${p.activeMembers === 1 ? "" : "s"}`}
              archived={!!p.archived_at}
              draft={d}
              onChange={(nd) => setDrafts((s) => ({ ...s, [p.id]: nd }))}
              footer={
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {p.archived_at ? (
                    <button type="button" className="sa-btn ghost" style={{ flex: 1 }} disabled={busy === p.id} onClick={() => send({ action: "restore", planId: p.id }, `${p.name} restored`, p.id)}>Restore</button>
                  ) : (
                    <>
                      <button type="button" className="sa-btn pri" style={{ flex: 1 }} disabled={!dirty || busy === p.id}
                        onClick={() => send({ action: "update", planId: p.id, ...payload(d) }, `${d.name} saved`, p.id)}>
                        {busy === p.id ? "Saving…" : "Save changes"}
                      </button>
                      {dirty && <button type="button" className="sa-btn ghost" onClick={() => setDrafts((s) => ({ ...s, [p.id]: toDraft(p) }))}>Undo</button>}
                      {p.code !== "free" && (
                        <button type="button" className="sa-btn ghost" disabled={busy === p.id} onClick={() => send({ action: "archive", planId: p.id }, `${p.name} archived`, p.id)}>Archive</button>
                      )}
                    </>
                  )}
                </div>
              }
            />
          );
        })}
      </div>
    </>
  );
}

function TemplateCard({ title, meta, archived, draft, onChange, footer }: { title: string; meta?: string; archived?: boolean; draft: Draft; onChange: (d: Draft) => void; footer: React.ReactNode }) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const disabled = !!archived;
  return (
    <section className="sa-card" style={{ opacity: archived ? 0.7 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "baseline" }}>
        <h2 className="sa-h2" style={{ fontSize: 16, margin: 0 }}>{title}</h2>
        {archived ? <span className="sa-chip t-grey">Archived</span> : draft.isActive ? <span className="sa-chip t-green">Visible</span> : <span className="sa-chip t-grey">Hidden</span>}
      </div>
      {meta && <div className="sa-muted" style={{ fontSize: 12, marginTop: 4 }}>{meta}</div>}
      <div className="m3-form">
        <label className="full">Name<input value={draft.name} disabled={disabled} onChange={(e) => set({ name: e.target.value })} /></label>
        <label>Price (₹)<input type="number" min={0} value={draft.price} disabled={disabled} onChange={(e) => set({ price: e.target.value })} /></label>
        <label>Validity (days)<input type="number" min={1} value={draft.days} disabled={disabled} onChange={(e) => set({ days: e.target.value })} /></label>
        <TemplateLimit label="Total contacts" value={draft.total} disabled={disabled} onChange={(v) => set({ total: v })} />
        <TemplateLimit label="Per day" value={draft.daily} disabled={disabled} onChange={(v) => set({ daily: v })} />
        <label>Order on page<input type="number" value={draft.sortOrder} disabled={disabled} onChange={(e) => set({ sortOrder: e.target.value })} /></label>
        <label style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "end" }}>
          <input type="checkbox" style={{ height: 14 }} checked={draft.isActive} disabled={disabled} onChange={(e) => set({ isActive: e.target.checked })} /> Visible to members
        </label>
      </div>
      <div style={{ marginTop: 14 }}>{footer}</div>
    </section>
  );
}

function TemplateLimit({ label, value, disabled, onChange }: { label: string; value: number | null; disabled?: boolean; onChange: (v: number | null) => void }) {
  return (
    <label>
      <span style={{ display: "flex", justifyContent: "space-between" }}>
        {label}
        <span style={{ fontSize: 11, display: "inline-flex", gap: 4, alignItems: "center" }}>
          <input type="checkbox" style={{ height: 13, width: 13 }} checked={value === null} disabled={disabled} onChange={(e) => onChange(e.target.checked ? null : 0)} /> ∞
        </span>
      </span>
      <input type="number" min={0} value={value === null ? "" : value} placeholder={value === null ? "Unlimited" : ""} disabled={disabled || value === null}
        onChange={(e) => onChange(Math.max(0, Math.floor(Number(e.target.value || 0))))} />
    </label>
  );
}

// ---------------------------------------------------------------------------
// Change log
// ---------------------------------------------------------------------------

type LogEvent = {
  id: string;
  at: string;
  action: string;
  reason: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  batchId: string | null;
  planName: string | null;
  account: { id: string; code: string | null; name: string | null } | null;
  actor: string;
};

function LogTab() {
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [batchId, setBatchId] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => setOffset(0), [action, from, to, batchId, limit]);
  useEffect(() => {
    const p = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (action) p.set("action", action);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (batchId) p.set("batchId", batchId);
    let off = false;
    setLoading(true);
    adminFetch(`/api/superadmin/plans/log?${p}`)
      .then((r) => r.json())
      .then((j) => {
        if (off) return;
        if (j.error) setError(j.error);
        else {
          setEvents(j.events || []);
          setTotal(j.total || 0);
          setError(null);
        }
      })
      .catch(() => !off && setError("Couldn't load the log"))
      .finally(() => !off && setLoading(false));
    return () => {
      off = true;
    };
  }, [action, from, to, batchId, offset, limit]);

  return (
    <>
      <div className="sa-toolbar">
        <select className={`sa-select ${action ? "is-set" : ""}`} value={action} onChange={(e) => setAction(e.target.value)} aria-label="Action">
          <option value="">All changes</option>
          <option value="assigned">Plans assigned</option>
          <option value="updated">Plans edited</option>
          <option value="cancelled">Plans cancelled</option>
          <option value="replaced">Plans replaced</option>
          <option value="payments">Payments & refunds</option>
          <option value="templates">Template changes</option>
        </select>
        <label className="sa-muted" style={{ fontSize: 12, display: "inline-flex", gap: 6, alignItems: "center" }}>
          From <input type="date" className="sa-input" style={{ height: 36 }} value={from} onChange={(e) => setFrom(e.target.value)} />
          To <input type="date" className="sa-input" style={{ height: 36 }} value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {batchId && <button type="button" className="sa-btn ghost" onClick={() => setBatchId("")}>Showing one bulk change ✕</button>}
        <ResetButton show={!!(action || from || to || batchId)} onClick={() => { setAction(""); setFrom(""); setTo(""); setBatchId(""); }} />
      </div>
      {error && <div className="m3-error">{error}</div>}
      <div className="sa-card" style={{ padding: 0 }}>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead><tr><th>When</th><th>Account</th><th>Change</th><th>Details</th><th>Reason</th><th>By</th></tr></thead>
            <tbody>
              {loading && events.length === 0 && <tr><td colSpan={6}><div className="sa-skel" style={{ height: 100 }} /></td></tr>}
              {!loading && events.length === 0 && <tr><td colSpan={6} className="sa-muted" style={{ padding: 24, textAlign: "center" }}>No changes logged yet.</td></tr>}
              {events.map((e) => (
                <tr key={e.id}>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{fmtDateTime(e.at)}</td>
                  <td style={{ fontSize: 12 }}>
                    {e.account ? <Link href={`/superadmin/accounts/${e.account.id}`}>{e.account.name || "—"} <span className="sa-muted">{e.account.code}</span></Link> : <span className="sa-muted">{e.planName || "—"}</span>}
                  </td>
                  <td style={{ fontSize: 12 }}>
                    <strong>{ACTION_LABEL[e.action] || e.action}</strong>
                    {e.batchId && (
                      <button type="button" className="sa-chip t-indigo" style={{ marginLeft: 6, border: 0, cursor: "pointer" }} onClick={() => setBatchId(e.batchId!)}>bulk</button>
                    )}
                  </td>
                  <td style={{ fontSize: 12, maxWidth: 360 }}>{describeChange(e)}</td>
                  <td style={{ fontSize: 12, maxWidth: 240 }}>{e.reason || "—"}</td>
                  <td style={{ fontSize: 12 }}>{e.actor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12 }}><Pager total={total} limit={limit} offset={offset} onChange={setOffset} onLimitChange={setLimit} /></div>
      </div>
    </>
  );
}
