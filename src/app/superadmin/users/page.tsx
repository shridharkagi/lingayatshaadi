"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { MessageCircle, Search } from "lucide-react";
import WhatsAppBulk from "@/components/superadmin/WhatsAppBulk";
import ContactsTakenModal from "@/components/superadmin/ContactsTakenModal";
import { adminFetch } from "@/lib/api/adminClient";
import {
  CopyButton,
  CsvButton,
  DateFilter,
  copyTsv,
  NO_DATES,
  PageHeader,
  Pager,
  ResetButton,
  type DateFilterValue,
  downloadCsv,
  fmtDate,
  fmtDateTime,
  inr,
  initials,
  phoneFmt,
  useDebounced,
} from "@/components/superadmin/ui";

type Account = {
  id: string;
  name: string;
  phone: string | null;
  accountCode: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  suspended: boolean;
  profiles: number;
  liveProfiles: number;
  pendingProfiles: number;
  plan: { name: string; price: number; expiresAt: string; startsAt?: string; totalLimit: number | null; dailyLimit: number | null } | null;
  contactViews: number;
  contactViewsToday: number;
};
type Deleted = { id: string; entity_id: string; created_at: string; meta: Record<string, unknown> | null };

const TABS = [
  { id: "all", label: "All accounts" },
  { id: "paid", label: "Paid plan" },
  { id: "no_plan", label: "No plan" },
  { id: "expiring", label: "Plan ending soon" },
  { id: "inactive", label: "Inactive 30d+" },
  { id: "no_profile", label: "No profile" },
  { id: "pending", label: "Pending review" },
  { id: "suspended", label: "Suspended" },
  { id: "deleted", label: "Deleted" },
];
const SORTS = [
  { id: "newest", label: "Joined: newest first" },
  { id: "oldest", label: "Joined: oldest first" },
  { id: "name_asc", label: "Name: A → Z" },
  { id: "name_desc", label: "Name: Z → A" },
  { id: "views_desc", label: "Contact views: most first" },
  { id: "views_asc", label: "Contact views: fewest first" },
  { id: "login_desc", label: "Last login: most recent" },
  { id: "login_asc", label: "Last login: longest ago" },
  { id: "quota_left", label: "Contacts left: fewest first" },
];
const PLAN_OPTIONS = ["Gold", "Platinum", "Diamond"];
/** Which WhatsApp template fits the tab you're on. */
const TAB_TEMPLATE: Record<string, string> = { no_profile: "no_profile", pending: "pending", inactive: "inactive", expiring: "expiring" };
/** Sortable columns: [first click, second click]. */
const COL_SORT: Record<string, [string, string]> = {
  name: ["name_asc", "name_desc"],
  views: ["views_desc", "views_asc"],
  joined: ["newest", "oldest"],
  login: ["login_desc", "login_asc"],
};
const DATE_FIELDS = [
  { id: "joined", label: "Joined" },
  { id: "last_login", label: "Last login" },
];
const LIMIT_KEY = "ad.accounts.limit";
const readLimit = () => {
  try {
    const n = Number(localStorage.getItem(LIMIT_KEY));
    return [25, 50, 75, 100].includes(n) ? n : 25;
  } catch {
    return 25;
  }
};

export default function AccountsPage() {
  const router = useRouter();
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [sort, setSort] = useState("newest");
  const [dates, setDates] = useState<DateFilterValue>(NO_DATES);
  const [dateOn, setDateOn] = useState("joined");
  const [limit, setLimit] = useState(25);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [plan, setPlan] = useState("");
  const [planCounts, setPlanCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Map<string, Account>>(new Map());
  const [waOpen, setWaOpen] = useState(false);
  const [contactsFor, setContactsFor] = useState<{ id: string; name: string } | null>(null);
  const [selectingAll, setSelectingAll] = useState(false);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Account[]>([]);
  const [deleted, setDeleted] = useState<Deleted[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => setLimit(readLimit()), []);
  const changeLimit = (n: number) => {
    setLimit(n);
    setOffset(0);
    try {
      localStorage.setItem(LIMIT_KEY, String(n));
    } catch {
      /* ignore */
    }
  };

  // A custom range only applies once both ends are valid.
  const dateOk = dates.preset === "any" || (dates.from && dates.to && dates.from <= dates.to);
  const fromQ = dateOk ? dates.from : "";
  const toQ = dateOk ? dates.to : "";

  const fetchPage = useCallback(
    async (lim: number, off: number) => {
      const qs = new URLSearchParams({ q: dq, filter: tab, sort, from: fromQ, to: toQ, dateOn, plan, limit: String(lim), offset: String(off) });
      const res = await adminFetch(`/api/superadmin/accounts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load accounts");
      return json as { total: number; rows: Account[]; counts?: Record<string, number>; plans?: Record<string, number> };
    },
    [dq, tab, sort, fromQ, toQ, dateOn, plan]
  );

  useEffect(() => {
    setOffset(0);
    setSelected(new Map());
  }, [dq, tab, sort, fromQ, toQ, dateOn, plan]);

  const filtersOn = q !== "" || sort !== "newest" || dates.preset !== "any" || dateOn !== "joined" || tab !== "all" || plan !== "";
  const resetFilters = () => {
    setPlan("");
    setQ("");
    setSort("newest");
    setDates(NO_DATES);
    setDateOn("joined");
    setTab("all");
  };
  const colSort = (col: string) => {
    const [a, b] = COL_SORT[col];
    setSort(sort === a ? b : a);
  };
  const sortTh = (col: string, children: string) => {
    const [a, b] = COL_SORT[col];
    const on = sort === a || sort === b;
    const up = sort === "name_asc" || sort === "views_asc" || sort === "oldest" || sort === "login_asc";
    return (
      <th key={col} className={`sortable ${on ? "on" : ""}`} onClick={() => colSort(col)} aria-sort={on ? (up ? "ascending" : "descending") : "none"}>
        {children}<span className="arr">{on ? (up ? "▲" : "▼") : "↕"}</span>
      </th>
    );
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        if (tab === "deleted") {
          const res = await adminFetch(`/api/superadmin/audit?area=account&limit=200`);
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Failed to load");
          const list = ((json.rows || []) as (Deleted & { action_type: string })[]).filter((r) => r.action_type === "account.delete");
          if (alive) {
            setDeleted(list);
            setTotal(list.length);
          }
        } else {
          const json = await fetchPage(limit, offset);
          if (alive) {
            setRows(json.rows);
            setTotal(json.total);
            setCounts(json.counts || {});
            setPlanCounts(json.plans || {});
          }
        }
      } catch (e) {
        if (alive) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, offset, limit, fetchPage]);

  const tableData = async (): Promise<[string[], (string | number | null | undefined)[][]]> => {
    const all: Account[] = [];
    for (let off = 0; off < Math.max(total, 1); off += 500) all.push(...(await fetchPage(500, off)).rows);
    return [
      ["Account code", "Name", "Phone", "Joined", "Last login", "Active profiles", "Live", "Pending", "Plan", "Plan price", "Plan ends", "Contact views", "Contact limit", "Today", "Daily limit", "Suspended"],
      all.map((a) => [
        a.accountCode, a.name, phoneFmt(a.phone), fmtDate(a.createdAt), fmtDateTime(a.lastSignInAt), a.profiles, a.liveProfiles,
        a.pendingProfiles, a.plan?.name || "", a.plan?.price ?? "", a.plan ? fmtDate(a.plan.expiresAt) : "", a.contactViews,
        a.plan ? a.plan.totalLimit ?? "unlimited" : "", a.contactViewsToday, a.plan ? a.plan.dailyLimit ?? "unlimited" : "", a.suspended ? "yes" : "no",
      ]),
    ];
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const [h, r] = await tableData();
      downloadCsv(`accounts-${tab}-${new Date().toISOString().slice(0, 10)}.csv`, h, r);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };


  const toggle = (a: Account) =>
    setSelected((m) => {
      const n = new Map(m);
      if (n.has(a.id)) n.delete(a.id);
      else n.set(a.id, a);
      return n;
    });
  const pageChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));
  const togglePage = () =>
    setSelected((m) => {
      const n = new Map(m);
      rows.forEach((r) => (pageChecked ? n.delete(r.id) : n.set(r.id, r)));
      return n;
    });
  async function selectAllMatching() {
    setSelectingAll(true);
    try {
      const n = new Map<string, Account>();
      for (let off = 0; off < Math.min(total, 2000); off += 500) (await fetchPage(500, off)).rows.forEach((r) => n.set(r.id, r));
      setSelected(n);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't select all");
    } finally {
      setSelectingAll(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Accounts" subtitle="People who log in with a mobile number. Each account can manage up to 3 profiles and holds the plan.">
        {tab !== "deleted" && (
          <>
            <CopyButton onCopy={async () => { const [h, r] = await tableData(); await copyTsv(h, r); return r.length; }} />
            <CsvButton onClick={exportCsv} busy={exporting} />
          </>
        )}
      </PageHeader>

      <div className="ad-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`ad-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.id === "deleted" ? (tab === t.id && !loading && <span className="cnt">{total}</span>) : counts[t.id] !== undefined && <span className="cnt">{counts[t.id]}</span>}
          </button>
        ))}
      </div>

      {tab !== "deleted" && (
        <div className="ad-toolbar">
          <label className="ad-search-box" style={{ flex: "1 1 280px", maxWidth: 420, height: 40 }}>
            <Search size={16} aria-hidden="true" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, phone or U-code" aria-label="Search accounts" />
          </label>
          <DateFilter value={dates} onChange={setDates} fields={DATE_FIELDS} field={dateOn} onFieldChange={setDateOn} />
          <select className={`ad-select ${plan ? "is-set" : ""}`} value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">
            <option value="">Any plan</option>
            <option value="paid">Any paid plan ({Object.entries(planCounts).filter(([k]) => k !== "none").reduce((n, [, v]) => n + v, 0)})</option>
            {[...new Set([...PLAN_OPTIONS, ...Object.keys(planCounts).filter((k) => k !== "none")])].map((p) => (
              <option key={p} value={p}>{p} ({planCounts[p] || 0})</option>
            ))}
            <option value="none">No plan ({planCounts.none || 0})</option>
          </select>
          <select className="ad-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <ResetButton show={filtersOn} onClick={resetFilters} />
        </div>
      )}

      {selected.size > 0 && tab !== "deleted" && (
        <div className="ad-bulk">
          <strong>{selected.size} selected</strong>
          {selected.size < total && rows.every((r) => selected.has(r.id)) && (
            <button type="button" className="ad-link" style={{ border: 0, background: "none", cursor: "pointer", fontSize: 13 }} disabled={selectingAll} onClick={selectAllMatching}>
              {selectingAll ? "Selecting…" : `Select all ${total} matching`}
            </button>
          )}
          <span style={{ flex: 1 }} />
          <button type="button" className="ad-btn pri" onClick={() => setWaOpen(true)}>
            <MessageCircle size={16} /> WhatsApp {selected.size}
          </button>
          <button type="button" className="ad-btn ghost" onClick={() => setSelected(new Map())}>Clear</button>
        </div>
      )}
      {error && <div className="ad-card" style={{ color: "#b42358" }}>{error}</div>}

      <div className="ad-card" style={{ padding: 0, overflow: "hidden" }}>
        <div className="ad-table-wrap">
          {tab === "deleted" ? (
            <table className="ad-table">
              <thead><tr><th>Deleted on</th><th>Phone</th><th>Account id</th><th>Reason</th></tr></thead>
              <tbody>
                {deleted.map((d) => (
                  <tr key={d.id}>
                    <td>{fmtDateTime(d.created_at)}</td>
                    <td>{phoneFmt(String(d.meta?.phone_snapshot || ""))}</td>
                    <td className="ad-muted">{d.entity_id}</td>
                    <td>{String(d.meta?.delete_reason || "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="ad-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }} onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" aria-label="Select all on this page" checked={pageChecked} onChange={togglePage} />
                  </th>
                  {sortTh("name", "Account")}<th>Phone</th><th>Profiles</th><th>Plan</th>{sortTh("views", "Contacts used")}{sortTh("joined", "Joined")}{sortTh("login", "Last login")}<th /></tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={9}><div className="ad-skel" style={{ height: 28 }} /></td></tr>
                  ))}
                {rows.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => router.push(`/superadmin/accounts/${a.id}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" aria-label={`Select ${a.name || "account"}`} checked={selected.has(a.id)} onChange={() => toggle(a)} />
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span className="ad-av" style={{ background: "#3f46b8" }}>{initials(a.name)}</span>
                        <div>
                          <Link href={`/superadmin/accounts/${a.id}`} className="ad-link" onClick={(e) => e.stopPropagation()}>{a.name || "Unnamed"}</Link>
                          <div className="ad-muted" style={{ fontSize: 12 }}>
                            {a.accountCode || "—"} {a.suspended && <span className="ad-chip t-rose" style={{ marginLeft: 4 }}>Suspended</span>}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{phoneFmt(a.phone)}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {a.profiles === 0 ? (
                        <span className="ad-muted">None yet</span>
                      ) : (
                        <>
                          <strong>{a.profiles}</strong>
                          <span className="ad-muted"> · {a.liveProfiles} live</span>
                          {a.pendingProfiles > 0 && <span className="ad-chip t-amber" style={{ marginLeft: 6 }}>{a.pendingProfiles} pending</span>}
                        </>
                      )}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {a.plan ? (
                        <>
                          <span className={`ad-chip ${a.plan.price > 0 ? "t-green" : "t-grey"}`}>{a.plan.name}</span>
                          <div className="ad-muted" style={{ fontSize: 11, marginTop: 2 }}>
                            {a.plan.price > 0 ? inr(a.plan.price) + " · " : ""}ends {fmtDate(a.plan.expiresAt)}
                          </div>
                        </>
                      ) : (
                        <span className="ad-muted">No plan</span>
                      )}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <button type="button" className="ct-open" disabled={a.contactViews === 0} style={a.contactViews === 0 ? { cursor: "default" } : undefined}
                        onClick={() => a.contactViews > 0 && setContactsFor({ id: a.id, name: a.name })} title={a.contactViews > 0 ? "See which profiles' contacts were taken" : undefined}>
                      {a.plan ? (
                        <div className="ad-quota" title={`Today: ${a.contactViewsToday}${a.plan.dailyLimit ? ` of ${a.plan.dailyLimit}` : ""}`}>
                          <span><strong>{a.contactViews}</strong>{a.plan.totalLimit ? <span className="ad-muted"> / {a.plan.totalLimit}</span> : <span className="ad-muted"> · unlimited</span>}</span>
                          {a.plan.totalLimit ? (
                            <span className="bar"><span className={a.contactViews / a.plan.totalLimit >= 0.8 ? "hot" : ""} style={{ width: `${Math.min(100, (a.contactViews / a.plan.totalLimit) * 100)}%` }} /></span>
                          ) : null}
                          <span className="ad-muted" style={{ fontSize: 11 }}>today {a.contactViewsToday}{a.plan.dailyLimit ? ` / ${a.plan.dailyLimit}` : ""}</span>
                        </div>
                      ) : (
                        <span>{a.contactViews}</span>
                      )}
                      {a.contactViews > 0 && <div className="lnk">View list →</div>}
                      </button>
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>{fmtDate(a.createdAt)}</td>
                    <td style={{ whiteSpace: "nowrap" }} className="ad-muted">{a.lastSignInAt ? fmtDateTime(a.lastSignInAt) : "Never"}</td>
                    <td>
                      <Link href={`/superadmin/accounts/${a.id}`} className="ad-btn ghost" style={{ minHeight: 32, fontSize: 12 }} onClick={(e) => e.stopPropagation()}>
                        Open 360°
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {!loading && (tab === "deleted" ? deleted.length === 0 : rows.length === 0) && (
            <div className="ad-empty">
              No accounts match.{" "}
              {filtersOn && <button type="button" className="ad-link" style={{ border: 0, background: "none", cursor: "pointer" }} onClick={resetFilters}>Reset filters</button>}
            </div>
          )}
        </div>
      </div>
      {contactsFor && <ContactsTakenModal accountId={contactsFor.id} accountName={contactsFor.name} onClose={() => setContactsFor(null)} />}
      {waOpen && (
        <WhatsAppBulk
          recipients={[...selected.values()].map((a) => ({ id: a.id, name: a.name, phone: a.phone, planEnds: a.plan?.expiresAt }))}
          suggested={TAB_TEMPLATE[tab]}
          onClose={() => setWaOpen(false)}
        />
      )}
      {tab !== "deleted" && <Pager total={total} limit={limit} offset={offset} onChange={setOffset} onLimitChange={changeLimit} />}
    </div>
  );
}
