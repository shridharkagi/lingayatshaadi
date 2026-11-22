"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, Plus, RefreshCw, Search, UserRound } from "lucide-react";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";
import { PageHeader, Pager, ResetButton, fmtDate, phoneFmt, useDebounced } from "@/components/superadmin/ui";

type Item = {
  id: string;
  publicId: string | null;
  name: string | null;
  gender: string | null;
  age: number | null;
  city: string | null;
  profession: string | null;
  relationship: string | null;
  photo: string | null;
  status: "live" | "pending" | "draft" | "rejected" | "deleted";
  createdAt: string | null;
  approvedAt: string | null;
  heldByAdmin: boolean;
  owner: { id: string; code: string | null; name: string; phone: string | null } | null;
};

const TABS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "pending", label: "Pending review" },
  { id: "draft", label: "Draft" },
  { id: "rejected", label: "Rejected" },
  { id: "deleted", label: "Deleted" },
];
const CHIP: Record<Item["status"], [string, string]> = {
  live: ["Live", "t-green"],
  pending: ["Pending review", "t-amber"],
  draft: ["Draft", "t-grey"],
  rejected: ["Rejected", "t-rose"],
  deleted: ["Deleted", "t-rose"],
};

export default function AdminProfilesPage() {
  const [status, setStatus] = useState("all");
  const [held, setHeld] = useState("all");
  const [q, setQ] = useState("");
  const dq = useDebounced(q, 250);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ status, held, limit: String(limit), offset: String(offset) });
    if (dq.trim()) p.set("q", dq.trim());
    return p.toString();
  }, [status, held, dq, limit, offset]);
  useEffect(() => setOffset(0), [status, held, dq, limit]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch(`/api/superadmin/admin-profiles?${qs}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load");
      setRows(json.rows || []);
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Created by admin"
        subtitle="Profiles your team created — kept on the admin account, or created for / moved to a member's account."
      >
        <button type="button" className="sa-btn ghost" onClick={() => setReload((n) => n + 1)} aria-label="Refresh"><RefreshCw size={16} /></button>
        <Link className="sa-btn pri" href="/superadmin/users/create"><Plus size={16} /> Create profile</Link>
      </PageHeader>

      <div className="sa-tabs" role="tablist" aria-label="Profile status">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={status === t.id} className={`sa-tab ${status === t.id ? "on" : ""}`} onClick={() => setStatus(t.id)}>
            {t.label}<span className="cnt">{counts[t.id] || 0}</span>
          </button>
        ))}
      </div>

      <div className="sa-toolbar">
        <label className="sa-search-box" style={{ flex: "1 1 260px", maxWidth: 380, height: 40 }}>
          <Search size={16} aria-hidden="true" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, member ID, city or owner" aria-label="Search profiles" />
        </label>
        <select className={`sa-select ${held !== "all" ? "is-set" : ""}`} value={held} onChange={(e) => setHeld(e.target.value)} aria-label="Held by">
          <option value="all">Admin & member accounts</option>
          <option value="admin">Still on admin account ({counts.admin || 0})</option>
          <option value="member">On a member&apos;s account ({counts.member || 0})</option>
        </select>
        <ResetButton show={!!(q || held !== "all" || status !== "all")} onClick={() => { setQ(""); setHeld("all"); setStatus("all"); }} />
      </div>

      {notice && <div className="m3-ok" role="status"><CheckCircle2 size={18} /> {notice}</div>}
      {error && <div className="m3-error">{error}</div>}

      <div className="sa-card" style={{ padding: 0 }}>
        <div className="sa-table-wrap">
          <table className="sa-table">
            <thead>
              <tr><th>Profile</th><th>Status</th><th>Account</th><th>Created</th><th aria-label="Actions" /></tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 && <tr><td colSpan={5}><div className="sa-skel" style={{ height: 120 }} /></td></tr>}
              {!loading && rows.length === 0 && (
                <tr><td colSpan={5} className="sa-muted" style={{ padding: 24, textAlign: "center" }}>No profiles here yet.</td></tr>
              )}
              {rows.map((r) => {
                const [label, cls] = CHIP[r.status];
                return (
                  <tr key={r.id}>
                    <td>
                      <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <span className="sa-av" style={{ background: r.gender === "female" ? "#c2367a" : "#5b3aa8", width: 38, height: 38 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          {r.photo ? <img src={r.photo} alt="" /> : <UserRound size={16} />}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <strong>{r.name || "Unnamed"}</strong>
                          <div className="sa-muted" style={{ fontSize: 12 }}>
                            {[r.publicId, r.gender === "female" ? "Bride" : r.gender === "male" ? "Groom" : null, r.age ? `${r.age} yrs` : null, r.city, r.profession].filter(Boolean).join(" · ")}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td><span className={`sa-chip ${cls}`}>{label}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {r.heldByAdmin ? (
                        <span className="sa-chip t-indigo">Admin account</span>
                      ) : r.owner ? (
                        <Link href={`/superadmin/accounts/${r.owner.id}`}>
                          {r.owner.name || "Member"} <span className="sa-muted">{r.owner.code}</span>
                          <div className="sa-muted">{phoneFmt(r.owner.phone)}</div>
                        </Link>
                      ) : "—"}
                    </td>
                    <td style={{ fontSize: 12, whiteSpace: "nowrap" }}>
                      {fmtDate(r.createdAt)}
                      {r.approvedAt && <div className="sa-muted">live {fmtDate(r.approvedAt)}</div>}
                    </td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <Link className="sa-btn ghost m3-sm" href={`/superadmin/users/${r.id}/edit`}>Edit</Link>{" "}
                      {r.publicId && r.status === "live" && (
                        <a className="sa-btn ghost m3-sm" href={`/profile/${String(r.publicId).toLowerCase()}`} target="_blank" rel="noreferrer">View</a>
                      )}{" "}
                      {r.status === "pending" && <Link className="sa-btn ghost m3-sm" href="/superadmin/moderation">Review</Link>}{" "}
                      {r.status !== "deleted" && (
                        <button type="button" className="sa-btn ghost m3-sm" onClick={() => setTransferId(r.id)}>
                          {r.heldByAdmin ? "Give to member" : "Move"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: 12 }}><Pager total={total} limit={limit} offset={offset} onChange={setOffset} onLimitChange={setLimit} /></div>
      </div>

      {transferId && (
        <ProfileTransferModal
          open
          profileId={transferId}
          note="Moved from Created by admin"
          onClose={() => setTransferId(null)}
          onTransferred={() => {
            setTransferId(null);
            setNotice("Profile moved to the member's account. It stays listed here.");
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
