"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import {
  CsvButton,
  DateFilter,
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
  plan: { name: string; price: number; expiresAt: string } | null;
  contactViews: number;
};
type Deleted = { id: string; entity_id: string; created_at: string; meta: Record<string, unknown> | null };

const TABS = [
  { id: "all", label: "All accounts" },
  { id: "paid", label: "Paid plan" },
  { id: "no_plan", label: "No plan" },
  { id: "expiring", label: "Plan ending soon" },
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
];
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
      const qs = new URLSearchParams({ q: dq, filter: tab, sort, from: fromQ, to: toQ, dateOn, limit: String(lim), offset: String(off) });
      const res = await adminFetch(`/api/superadmin/accounts?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load accounts");
      return json as { total: number; rows: Account[]; counts?: Record<string, number> };
    },
    [dq, tab, sort, fromQ, toQ, dateOn]
  );

  useEffect(() => setOffset(0), [dq, tab, sort, fromQ, toQ, dateOn]);

  const filtersOn = q !== "" || sort !== "newest" || dates.preset !== "any" || dateOn !== "joined" || tab !== "all";
  const resetFilters = () => {
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

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: Account[] = [];
      for (let off = 0; off < Math.max(total, 1); off += 500) all.push(...(await fetchPage(500, off)).rows);
      downloadCsv(
        `accounts-${tab}-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Account code", "Name", "Phone", "Joined", "Last login", "Active profiles", "Live", "Pending", "Plan", "Plan price", "Plan ends", "Contact views", "Suspended"],
        all.map((a) => [
          a.accountCode, a.name, phoneFmt(a.phone), fmtDate(a.createdAt), fmtDateTime(a.lastSignInAt), a.profiles, a.liveProfiles,
          a.pendingProfiles, a.plan?.name || "", a.plan?.price ?? "", a.plan ? fmtDate(a.plan.expiresAt) : "", a.contactViews, a.suspended ? "yes" : "no",
        ])
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Accounts" subtitle="People who log in with a mobile number. Each account can manage up to 3 profiles and holds the plan.">
        {tab !== "deleted" && <CsvButton onClick={exportCsv} busy={exporting} />}
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
          <select className="ad-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
            {SORTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <ResetButton show={filtersOn} onClick={resetFilters} />
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
                <tr>{sortTh("name", "Account")}<th>Phone</th><th>Profiles</th><th>Plan</th>{sortTh("views", "Contact views")}{sortTh("joined", "Joined")}{sortTh("login", "Last login")}<th /></tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 &&
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}><td colSpan={8}><div className="ad-skel" style={{ height: 28 }} /></td></tr>
                  ))}
                {rows.map((a) => (
                  <tr key={a.id} className="clickable" onClick={() => router.push(`/superadmin/accounts/${a.id}`)}>
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
                    <td>{a.contactViews}</td>
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
      {tab !== "deleted" && <Pager total={total} limit={limit} offset={offset} onChange={setOffset} onLimitChange={changeLimit} />}
    </div>
  );
}
