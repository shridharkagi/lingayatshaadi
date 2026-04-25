"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { adminFetch } from "@/lib/api/adminClient";

export default function SuperAdminVerificationsPage() {
  const [pending, setPending] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    const res = await adminFetch("/api/superadmin/verifications");
    const json = (await res.json()) as { error?: string; profiles?: Array<Record<string, unknown>> };
    if (!res.ok) {
      setError(json.error || "Failed to load pending verifications");
      setPending([]);
    } else {
      setPending(json.profiles || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    void refresh();
  }, []);

  const act = async (profileId: string, action: "approve" | "reject" | "suspend") => {
    setBusyProfileId(profileId);
    setError(null);
    setSuccess(null);
    if (action === "approve" || action === "reject") {
      const res = await adminFetch("/api/superadmin/moderation/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profileId,
          action,
          reason: action === "reject" ? "Verification rejected by admin." : undefined,
        }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error || "Failed action");
      } else {
        setSuccess(`Profile ${action}d successfully.`);
      }
    } else {
      const res = await adminFetch("/api/superadmin/lifecycle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId, action: "suspend" }),
      });
      if (!res.ok) {
        const json = (await res.json()) as { error?: string };
        setError(json.error || "Failed action");
      } else {
        setSuccess("Profile suspended successfully.");
      }
    }
    await refresh();
    setBusyProfileId(null);
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Verifications</h1>
      <p className="text-gray-500 mt-1">Review pending profile verification and moderation status</p>
      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}
      <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Member</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Location</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">State</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Loading…</td>
              </tr>
            ) : pending.length > 0 ? (
              pending.map((p) => (
                <tr key={String(p.id)} className="border-t border-gray-100">
                  <td className="px-6 py-4">
                    <p className="font-medium">{String(p.full_name || "Unknown")}</p>
                    <p className="text-xs text-gray-500">{String(p.public_id || "")}</p>
                  </td>
                  <td className="px-6 py-4 text-sm">{String(p.city || "-")}</td>
                  <td className="px-6 py-4 text-sm">{String(p.state || "-")}</td>
                  <td className="px-6 py-4 text-sm">
                    <StatusBadge
                      verified={Boolean(p.verified)}
                      profileStatus={String(p.profile_status || "")}
                      moderationStatus={String(p.moderation_status || "")}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => act(String(p.id), "approve")}
                      disabled={busyProfileId === String(p.id)}
                      className="text-green-600 text-sm font-medium mr-2"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => act(String(p.id), "reject")}
                      disabled={busyProfileId === String(p.id)}
                      className="text-red-600 text-sm font-medium mr-2"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => act(String(p.id), "suspend")}
                      disabled={busyProfileId === String(p.id)}
                      className="text-amber-600 text-sm font-medium"
                    >
                      Suspend
                    </button>
                    <Link
                      href={`/superadmin/verifications/${String(p.id)}`}
                      className="text-[var(--primary)] text-sm font-medium ml-2"
                    >
                      KYC
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No pending verifications</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatusBadge({
  verified,
  profileStatus,
  moderationStatus,
}: {
  verified: boolean;
  profileStatus: string;
  moderationStatus: string;
}) {
  if (profileStatus === "suspended") {
    return (
      <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-700">
        Suspended
      </span>
    );
  }
  if (moderationStatus === "rejected") {
    return (
      <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
        Rejected
      </span>
    );
  }
  if (verified || profileStatus === "verified" || moderationStatus === "approved") {
    return (
      <span className="inline-flex rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
        Verified
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
      Pending
    </span>
  );
}
