"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";

type Tab = "published" | "pending" | "draft" | "rejected" | "suspended" | "trash" | "plan_over";
type DateFilter = "all" | "today" | "last7" | "last30" | "this_month";

function toProfileSlug(publicId: string, fullName: string, fallbackId: string) {
  const base = (publicId || fallbackId || "").toLowerCase();
  const first = (fullName || "profile").trim().split(/\s+/)[0] || "profile";
  const name = first
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "profile";
  return `${base}-${name}`;
}

export default function SuperAdminReviewCenterPage() {
  const [tab, setTab] = useState<Tab>("published");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [genderFilter, setGenderFilter] = useState<"all" | "male" | "female">("all");
  const [rows, setRows] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [transferProfileId, setTransferProfileId] = useState<string | null>(null);

  const load = async (nextTab: Tab) => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({
      tab: nextTab,
      dateFilter,
      gender: genderFilter,
    });
    const res = await adminFetch(`/api/superadmin/review-center?${qs.toString()}`);
    const json = (await res.json()) as { items?: Array<Record<string, unknown>>; error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to load");
      setRows([]);
    } else {
      setRows(json.items || []);
    }
    setSelected(new Set());
    setLoading(false);
  };

  useEffect(() => {
    void load(tab);
  }, [tab, dateFilter, genderFilter]);

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectableIds = rows
    .map((r) => String(r.profile_id || r.id || ""))
    .filter(Boolean);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selected.has(id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableIds));
  };

  const runBulk = async (action: "suspend" | "unsuspend" | "restore" | "purge") => {
    if (selected.size === 0) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    let ok = 0;
    let fail = 0;
    for (const profileId of selected) {
      const res = await adminFetch("/api/superadmin/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action }),
      });
      if (res.ok) ok += 1;
      else fail += 1;
    }
    setBusy(false);
    setSuccess(`${ok} updated${fail ? `, ${fail} failed` : ""}.`);
    await load(tab);
  };

  const runSingleLifecycle = async (
    profileId: string,
    action: "suspend" | "to_draft",
    reason?: string
  ) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await adminFetch("/api/superadmin/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action, reason: reason || null }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Action failed");
      return;
    }
    setSuccess("Profile updated.");
    await load(tab);
  };

  const runReject = async (profileId: string) => {
    const reason = window.prompt("Reason for rejection (required):", "Needs correction");
    if (!reason || !reason.trim()) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await adminFetch("/api/superadmin/moderation/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action: "reject", reason: reason.trim() }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Reject failed");
      return;
    }
    setSuccess("Profile rejected.");
    await load(tab);
  };

  const runApprove = async (profileId: string) => {
    if (!window.confirm("Approve this profile and publish the current data as the approved snapshot?")) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await adminFetch("/api/superadmin/moderation/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action: "approve" }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Approve failed");
      return;
    }
    setSuccess("Profile approved.");
    await load(tab);
  };

  const runTrash = async (profileId: string) => {
    const reason = window.prompt("Trash reason (required). Example: Married / Engaged / Spam", "");
    if (!reason || !reason.trim()) return;
    const note = window.prompt("Optional note for trash:", "") || "";
    setBusy(true);
    setError(null);
    setSuccess(null);
    const res = await adminFetch("/api/superadmin/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        action: "trash",
        reason: reason.trim(),
        note: note.trim() || null,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Trash failed");
      return;
    }
    setSuccess("Profile moved to trash.");
    await load(tab);
  };

  const formatDate = (value: unknown) => {
    if (!value || typeof value !== "string") return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Review Center</h1>
      <p className="text-gray-500 mt-1">Single place for lifecycle review, moderation, and plan-expiry tracking.</p>
      <div className="mt-5 flex gap-2 border-b border-gray-200">
        {(["published", "pending", "draft", "rejected", "suspended", "trash", "plan_over"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium capitalize ${
              tab === t ? "border-[var(--primary)] text-[var(--primary)]" : "border-transparent text-gray-500"
            }`}
          >
            {t === "plan_over" ? "Plan over" : t}
          </button>
        ))}
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          onClick={toggleAll}
          disabled={loading || busy || selectableIds.length === 0}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
        >
          {allSelected ? "Unselect all" : "Select all"}
        </button>
        {(tab === "published" || tab === "pending" || tab === "draft" || tab === "rejected") && (
          <button
            onClick={() => runBulk("suspend")}
            disabled={busy || selected.size === 0}
            className="rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700 disabled:opacity-50"
          >
            Bulk Suspend
          </button>
        )}
        {tab === "suspended" && (
          <button
            onClick={() => runBulk("unsuspend")}
            disabled={busy || selected.size === 0}
            className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-50"
          >
            Bulk Unsuspend
          </button>
        )}
        {tab === "trash" && (
          <>
            <button
              onClick={() => runBulk("restore")}
              disabled={busy || selected.size === 0}
              className="rounded-md border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 disabled:opacity-50"
            >
              Bulk Restore
            </button>
            <button
              onClick={() => runBulk("purge")}
              disabled={busy || selected.size === 0}
              className="rounded-md border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 disabled:opacity-50"
            >
              Bulk Purge
            </button>
          </>
        )}
        <span className="text-xs text-gray-500">{selected.size} selected</span>
      </div>
      <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 uppercase">Date</span>
          {([
            { key: "today", label: "Today" },
            { key: "last7", label: "Last week" },
            { key: "last30", label: "Last 30 days" },
            { key: "this_month", label: "This month" },
            { key: "all", label: "All" },
          ] as Array<{ key: DateFilter; label: string }>).map((item) => (
            <button
              key={item.key}
              onClick={() => setDateFilter(item.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                dateFilter === item.key
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
          <span className="ml-2 text-xs font-semibold text-gray-500 uppercase">Profile</span>
          {([
            { key: "all", label: "All" },
            { key: "female", label: "Bride" },
            { key: "male", label: "Groom" },
          ] as const).map((item) => (
            <button
              key={item.key}
              onClick={() => setGenderFilter(item.key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium ${
                genderFilter === item.key
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-3 text-xs text-gray-500">
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Member</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Account Owner</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Location</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Note</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Published Date</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Plan</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Validity</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Status</th>
              <th className="text-left px-5 py-3 text-xs text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-500">Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={10} className="px-5 py-10 text-center text-gray-500">No items found</td></tr>
            ) : (
              rows.map((r) => {
                const id = String(r.profile_id || r.id || "");
                const publicId = String(r.public_id || "");
                const fullName = String(r.full_name || "Unknown");
                const viewHref = toProfileSlug(publicId, fullName, id);
                const status =
                  tab === "trash"
                    ? "trashed"
                    : tab === "rejected"
                      ? String(
                          r.moderation_status ||
                            r.profile_status ||
                            (Boolean(r.verified) ? "verified" : "rejected")
                        )
                      : String(
                          r.profile_status || r.moderation_status || (Boolean(r.verified) ? "verified" : "pending")
                        );
                return (
                  <tr key={String(r.id)} className="border-t border-gray-100">
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(id)}
                        onChange={() => toggleOne(id)}
                        disabled={!id || busy}
                      />
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-medium text-sm">{fullName}</div>
                      <div className="text-xs text-gray-500">{publicId}</div>
                    </td>
                    <td className="px-5 py-3 text-sm">
                      <div className="font-medium">{String(r.account_owner_name || "-")}</div>
                      <div className="text-xs text-gray-500">{String(r.account_owner_number || "-")}</div>
                    </td>
                    <td className="px-5 py-3 text-sm">{tab === "trash" ? String(r.city || "-") : String(r.city || "-")}</td>
                    <td className="px-5 py-3 text-sm">
                      {tab === "trash"
                        ? `${String(r.deleted_reason || "-")}${r.deleted_note ? ` - ${String(r.deleted_note)}` : ""}`
                        : "-"}
                    </td>
                    <td className="px-5 py-3 text-sm">{formatDate(r.published_at)}</td>
                    <td className="px-5 py-3 text-sm capitalize">{String(r.plan_name || "Free")}</td>
                    <td className="px-5 py-3 text-sm">
                      {formatDate(r.plan_starts_at)} - {formatDate(r.plan_expires_at)}
                    </td>
                    <td className="px-5 py-3 text-sm capitalize">{status}</td>
                    <td className="px-5 py-3 text-sm">
                      {id ? (
                        <div className="flex flex-wrap gap-2">
                          <Link href={`/profile/${viewHref}?preview=admin`} className="text-[var(--primary)] hover:underline">
                            View
                          </Link>
                          <Link href={`/superadmin/users/${id}/edit`} className="text-[var(--primary)] hover:underline">
                            Edit
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTransferProfileId(id)}
                            disabled={busy}
                            className="text-indigo-700 hover:underline disabled:opacity-50"
                          >
                            Transfer
                          </button>
                          {(tab === "rejected" || tab === "draft" || tab === "pending") && (
                            <button
                              type="button"
                              onClick={() => void runApprove(id)}
                              disabled={busy}
                              className="text-emerald-700 hover:underline disabled:opacity-50 font-medium"
                            >
                              Approve
                            </button>
                          )}
                          {tab === "published" && (
                            <>
                              <button
                                onClick={() => void runSingleLifecycle(id, "to_draft")}
                                disabled={busy}
                                className="text-amber-700 hover:underline disabled:opacity-50"
                              >
                                Draft
                              </button>
                              <button
                                onClick={() => void runSingleLifecycle(id, "suspend")}
                                disabled={busy}
                                className="text-amber-700 hover:underline disabled:opacity-50"
                              >
                                Suspend
                              </button>
                              <button
                                onClick={() => void runReject(id)}
                                disabled={busy}
                                className="text-red-700 hover:underline disabled:opacity-50"
                              >
                                Reject
                              </button>
                              <button
                                onClick={() => void runTrash(id)}
                                disabled={busy}
                                className="text-red-700 hover:underline disabled:opacity-50"
                              >
                                Trash
                              </button>
                            </>
                          )}
                          {tab === "trash" && (
                            <span className="text-xs text-gray-500">
                              Trashed: {formatDate(r.deleted_at)}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <ProfileTransferModal
        open={!!transferProfileId}
        profileId={transferProfileId || ""}
        note="Transferred from review center"
        onClose={() => setTransferProfileId(null)}
        onTransferred={() => {
          setSuccess("Profile transferred.");
          void load(tab);
        }}
      />
    </div>
  );
}
