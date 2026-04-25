"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/api/adminClient";
import { getProfileSlug } from "@/lib/memberId";
import type { Profile } from "@/types";
import { RefreshCw, Check, X as XIcon, ExternalLink } from "lucide-react";

type RequestRow = {
  id: string;
  profile_id: string;
  user_id: string;
  reason: string;
  created_at: string;
  profile_name: string | null;
  profile_public_id: string | null;
};

function displayPublicId(publicId: string | null | undefined): string {
  const raw = (publicId || "").replace(/-/g, "").trim();
  if (!raw) return "";
  return raw.toUpperCase();
}

/** Same path shape as the rest of the app (`/profile/lb260400026-sushma`). Public id required for a reliable link. */
function openProfilePath(r: RequestRow): string | null {
  if (!r.profile_public_id?.trim()) return null;
  const slug = getProfileSlug({
    id: r.profile_id,
    publicId: r.profile_public_id,
    fullName: r.profile_name || "profile",
  } as Profile);
  return `/profile/${slug}`;
}

export default function ProfileDeletionRequestsPage() {
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setWarning(null);
    const res = await adminFetch("/api/superadmin/profile-deletion-requests");
    const json = (await res.json()) as { requests?: RequestRow[]; warning?: string; error?: string };
    if (!res.ok) {
      setError(json.error || "Failed to load");
      return;
    }
    setRequests(json.requests || []);
    if (json.warning) setWarning(json.warning);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const runAction = async (requestId: string, action: "approve" | "reject") => {
    if (action === "approve") {
      if (!window.confirm("Approve and move this profile to trash (same as admin trash)?")) return;
    } else {
      const cancel = !window.confirm("Reject this deletion request? The profile stays active.");
      if (cancel) return;
    }
    let adminNote: string | null = null;
    if (action === "reject") {
      const note = window.prompt("Optional internal note (stored on the request):");
      if (note === null) return;
      adminNote = note.trim() || null;
    }
    setBusyId(requestId);
    setError(null);
    const res = await adminFetch("/api/superadmin/profile-deletion-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action, adminNote }),
    });
    const json = (await res.json()) as { error?: string };
    setBusyId(null);
    if (!res.ok) {
      setError(json.error || "Action failed");
      return;
    }
    await load();
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Profile deletion requests</h1>
          <p className="text-sm text-gray-500 mt-1">
            Members cannot delete profiles themselves. Approve to move to trash, or reject to keep the profile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-50"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {warning && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {warning}
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center text-gray-500 text-sm">
          No pending deletion requests.
        </div>
      ) : (
        <ul className="space-y-3">
          {requests.map((r) => {
            const publicDisplay = displayPublicId(r.profile_public_id);
            const profilePath = openProfilePath(r);
            const bracketId =
              publicDisplay || `UUID ${r.profile_id.slice(0, 8)}…`;
            return (
              <li
                key={r.id}
                className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm flex flex-col gap-3 md:flex-row md:items-start md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-[var(--foreground)]">
                    {r.profile_name || "Profile"}{" "}
                    <span className="text-xs font-normal text-gray-500 font-mono tracking-tight">({bracketId})</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Requested {new Date(r.created_at).toLocaleString("en-IN")} · Auth user {r.user_id.slice(0, 8)}…
                  </p>
                  <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{r.reason}</p>
                  {profilePath ? (
                    <Link
                      href={profilePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--primary)] font-medium mt-2 hover:underline"
                    >
                      Open profile <ExternalLink size={14} />
                    </Link>
                  ) : (
                    <p className="text-xs text-amber-700 mt-2">
                      No public member ID on file — open this profile from Users or Moderation using internal id{" "}
                      <span className="font-mono">{r.profile_id.slice(0, 8)}…</span>
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void runAction(r.id, "approve")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
                  >
                    <Check size={16} />
                    Approve removal
                  </button>
                  <button
                    type="button"
                    disabled={busyId === r.id}
                    onClick={() => void runAction(r.id, "reject")}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
                  >
                    <XIcon size={16} />
                    Reject
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
