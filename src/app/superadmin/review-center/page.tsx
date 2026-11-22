"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { MoreHorizontal, Search, UserRound } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";
import {
  CsvButton,
  PageHeader,
  Pager,
  ProfileStatusChip,
  downloadCsv,
  fmtDate,
  initials,
  useDebounced,
} from "@/components/superadmin/ui";

type ProfileRow = {
  id: string;
  publicId: string | null;
  name: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  state: string | null;
  profession: string | null;
  relationship: string | null;
  status: string;
  photo: string | null;
  userId: string | null;
  accountCode: string | null;
  createdAt: string;
  approvedAt: string | null;
  rejectionReason: string | null;
  views: number;
  contactedBy: number;
};

const TABS = [
  { id: "all", label: "All active" },
  { id: "live", label: "Live", key: "approved" },
  { id: "pending", label: "Pending review", key: "pending_review" },
  { id: "draft", label: "Drafts", key: "draft" },
  { id: "rejected", label: "Rejected", key: "rejected" },
  { id: "suspended", label: "Suspended", key: "suspended" },
  { id: "deleted", label: "Deleted", key: "deleted" },
];
const LIMIT = 25;
type Action = "suspend" | "unsuspend" | "to_draft" | "trash" | "restore";
const ACTION_LABEL: Record<Action, string> = {
  suspend: "Suspend (hide from members)",
  unsuspend: "Unsuspend",
  to_draft: "Move back to draft",
  trash: "Move to trash",
  restore: "Restore from trash",
};

function RowMenu({ row, onAction, onTransfer }: { row: ProfileRow; onAction: (a: Action) => void; onTransfer: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const acts: Action[] =
    row.status === "deleted" ? ["restore"] : row.status === "suspended" ? ["unsuspend", "trash"] : ["suspend", "to_draft", "trash"];
  return (
    <div className="ad-menu" ref={ref}>
      <button type="button" className="ad-btn ghost" style={{ minHeight: 32, width: 36, padding: 0 }} aria-label="More actions" onClick={() => setOpen((v) => !v)}>
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="ad-menu-pop" role="menu">
          <Link href={`/superadmin/users/${row.id}/edit`}>Edit profile</Link>
          {row.publicId && row.status !== "deleted" && (
            <a href={`/profile/${row.publicId.toLowerCase()}`} target="_blank" rel="noreferrer">View as member ↗</a>
          )}
          {row.userId && <Link href={`/superadmin/accounts/${row.userId}`}>Open account 360°</Link>}
          {row.status === "pending_review" && <Link href="/superadmin/moderation">Review now</Link>}
          {row.status !== "deleted" && (
            <button type="button" onClick={() => { setOpen(false); onTransfer(); }}>Move to another account</button>
          )}
          {acts.map((a) => (
            <button key={a} type="button" className={a === "trash" || a === "suspend" ? "danger" : ""} onClick={() => { setOpen(false); onAction(a); }}>
              {ACTION_LABEL[a]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ProfilesPage() {
  const [tab, setTab] = useState("all");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [gender, setGender] = useState("");
  const [stateF, setStateF] = useState("");
  const [photo, setPhoto] = useState("");
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<ProfileRow[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const fetchPage = useCallback(
    async (lim: number, off: number) => {
      const qs = new URLSearchParams({ q: dq, status: tab, gender, state: stateF, photo, limit: String(lim), offset: String(off) });
      const res = await adminFetch(`/api/superadmin/profiles?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load profiles");
      return json as { total: number; rows: ProfileRow[]; counts: Record<string, number> };
    },
    [dq, tab, gender, stateF, photo]
  );

  useEffect(() => {
    setOffset(0);
    setSelected(new Set());
  }, [dq, tab, gender, stateF, photo]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    fetchPage(LIMIT, offset)
      .then((json) => {
        if (!alive) return;
        setRows(json.rows);
        setTotal(json.total);
        setCounts(json.counts || {});
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [fetchPage, offset, reload]);

  const runAction = async (ids: string[], action: Action) => {
    let reason: string | undefined;
    if (action === "trash") {
      const r = window.prompt(`Move ${ids.length} profile(s) to trash. Reason (required):`);
      if (!r || !r.trim()) return;
      reason = r.trim();
    } else if (!window.confirm(`${ACTION_LABEL[action]} — ${ids.length} profile(s)?`)) return;
    setBusy(true);
    setError(null);
    let ok = 0;
    for (const id of ids) {
      const res = await adminFetch("/api/superadmin/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId: id, action, reason }),
      });
      if (res.ok) ok += 1;
      else {
        const j = await res.json().catch(() => ({}));
        setError((j as { error?: string }).error || "Some actions failed");
      }
    }
    setBusy(false);
    setSelected(new Set());
    setNotice(`${ACTION_LABEL[action]}: ${ok} of ${ids.length} done.`);
    setTimeout(() => setNotice(null), 4000);
    setReload((n) => n + 1);
  };

  const exportCsv = async () => {
    setExporting(true);
    try {
      const all: ProfileRow[] = [];
      for (let off = 0; off < Math.max(total, 1); off += 500) all.push(...(await fetchPage(500, off)).rows);
      downloadCsv(
        `profiles-${tab}-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Member ID", "Name", "Gender", "Age", "City", "State", "Profession", "For", "Status", "Account code", "Created", "Approved", "Views", "Contacted by"],
        all.map((p) => [p.publicId, p.name, p.gender, p.age, p.city, p.state, p.profession, p.relationship, p.status, p.accountCode, fmtDate(p.createdAt), fmtDate(p.approvedAt), p.views, p.contactedBy])
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const allActive = Object.entries(counts).filter(([k]) => k !== "deleted").reduce((s, [, n]) => s + n, 0);
  const tabCount = (t: (typeof TABS)[number]) => (t.id === "all" ? allActive : counts[t.key || ""] || 0);
  const toggle = (id: string) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const allChecked = rows.length > 0 && rows.every((r) => selected.has(r.id));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader title="Profiles" subtitle="Matrimony profiles created by accounts (for self or family members).">
        <CsvButton onClick={exportCsv} busy={exporting} />
        <Link href="/superadmin/users/create" className="ad-btn pri">Create profile</Link>
      </PageHeader>

      <div className="ad-tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={`ad-tab ${tab === t.id ? "on" : ""}`} onClick={() => setTab(t.id)}>
            {t.label}<span className="cnt">{tabCount(t)}</span>
          </button>
        ))}
      </div>

      <div className="ad-toolbar">
        <label className="ad-search-box" style={{ flex: "1 1 280px", maxWidth: 420, height: 40 }}>
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, LB-ID, U-code, city or phone" aria-label="Search profiles" />
        </label>
        <select className="ad-select" value={gender} onChange={(e) => setGender(e.target.value)} aria-label="Bride or groom">
          <option value="">Brides &amp; grooms</option>
          <option value="female">Brides</option>
          <option value="male">Grooms</option>
        </select>
        <select className="ad-select" value={stateF} onChange={(e) => setStateF(e.target.value)} aria-label="State">
          <option value="">All states</option>
          <option value="Karnataka">Karnataka</option>
          <option value="Maharashtra">Maharashtra</option>
          <option value="Goa">Goa</option>
          <option value="Telangana">Telangana</option>
          <option value="Andhra Pradesh">Andhra Pradesh</option>
          <option value="Tamil Nadu">Tamil Nadu</option>
        </select>
        <select className="ad-select" value={photo} onChange={(e) => setPhoto(e.target.value)} aria-label="Photo">
          <option value="">Any photo</option>
          <option value="with">With photo</option>
          <option value="without">Without photo</option>
        </select>
      </div>

      {selected.size > 0 && (
        <div className="ad-bulk">
          <strong>{selected.size} selected</strong>
          <span style={{ flex: 1 }} />
          {tab === "deleted" ? (
            <button type="button" className="ad-btn ghost" disabled={busy} onClick={() => runAction([...selected], "restore")}>Restore</button>
          ) : (
            <>
              <button type="button" className="ad-btn ghost" disabled={busy} onClick={() => runAction([...selected], "suspend")}>Suspend</button>
              <button type="button" className="ad-btn ghost" disabled={busy} onClick={() => runAction([...selected], "trash")}>Move to trash</button>
            </>
          )}
          <button type="button" className="ad-btn ghost" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      {notice && <div className="m3-ok" role="status">{notice}</div>}
      {error && <div className="m3-error">{error}</div>}

      <div className="ad-card" style={{ padding: 0, overflow: "visible" }}>
        <div className="ad-table-wrap" style={{ overflow: "visible" }}>
          <table className="ad-table">
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" aria-label="Select all on this page" checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(rows.map((r) => r.id)))} />
                </th>
                <th>Profile</th><th>Details</th><th>Status</th><th>Account</th><th>Views</th><th>Created</th><th />
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 &&
                Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8}><div className="ad-skel" style={{ height: 30 }} /></td></tr>)}
              {rows.map((p) => (
                <tr key={p.id}>
                  <td><input type="checkbox" aria-label={`Select ${p.name || "profile"}`} checked={selected.has(p.id)} onChange={() => toggle(p.id)} /></td>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      <span className="ad-av" style={{ background: p.gender === "female" ? "#c2367a" : "#5b3aa8", width: 38, height: 38 }}>
                        {p.photo ? <img src={p.photo} alt="" /> : p.name ? initials(p.name) : <UserRound size={16} />}
                      </span>
                      <div>
                        <Link href={`/superadmin/users/${p.id}/edit`} className="ad-link">{p.name || "Unnamed"}</Link>
                        <div className="ad-muted" style={{ fontSize: 12 }}>{p.publicId || "No ID yet"}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 12 }}>
                    {[p.gender === "female" ? "Bride" : p.gender === "male" ? "Groom" : null, p.age, p.city, p.profession].filter(Boolean).join(" · ") || "—"}
                    {p.relationship && p.relationship !== "self" && <div className="ad-muted">for {p.relationship}</div>}
                  </td>
                  <td>
                    <ProfileStatusChip status={p.status} />
                    {p.status === "rejected" && p.rejectionReason && (
                      <div className="ad-muted" style={{ fontSize: 11, maxWidth: 200, marginTop: 2 }} title={p.rejectionReason}>
                        {p.rejectionReason.slice(0, 50)}{p.rejectionReason.length > 50 ? "…" : ""}
                      </div>
                    )}
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {p.userId ? <Link href={`/superadmin/accounts/${p.userId}`} className="ad-link" style={{ fontWeight: 500 }}>{p.accountCode || "Account"}</Link> : "—"}
                  </td>
                  <td style={{ whiteSpace: "nowrap", fontSize: 12 }}>{p.views} views<div className="ad-muted">{p.contactedBy} contacted</div></td>
                  <td style={{ whiteSpace: "nowrap" }}>{fmtDate(p.createdAt)}</td>
                  <td><RowMenu row={p} onAction={(a) => runAction([p.id], a)} onTransfer={() => setTransferId(p.id)} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && <div className="ad-empty">No profiles match these filters.</div>}
        </div>
      </div>
      <Pager total={total} limit={LIMIT} offset={offset} onChange={setOffset} />

      {transferId && (
        <ProfileTransferModal
          open
          profileId={transferId}
          note="Moved from Profiles list"
          onClose={() => setTransferId(null)}
          onTransferred={() => {
            setTransferId(null);
            setNotice("Profile moved to the other account.");
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
