"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/adminClient";

export default function SuperAdminAdminLogsPage() {
  const [actions, setActions] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await adminFetch("/api/superadmin/analytics");
      const json = (await res.json()) as { recentAdminActions?: Array<Record<string, unknown>>; error?: string };
      if (!res.ok) setError(json.error || "Failed to load logs");
      else setActions(json.recentAdminActions || []);
    };
    void load();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Admin Logs</h1>
      <p className="text-gray-500 mt-1">Immutable activity log for operational transparency.</p>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 rounded-xl border bg-white">
        {actions.map((a, idx) => (
          <div key={idx} className="border-b border-gray-100 px-4 py-3 text-sm">
            <p>
              <span className="font-semibold">{String(a.action_type || "")}</span> on{" "}
              <span className="font-medium">{String(a.entity_type || "")}</span> ({String(a.entity_id || "")})
            </p>
            <p className="text-xs text-gray-500 mt-1">{new Date(String(a.created_at || "")).toLocaleString()}</p>
          </div>
        ))}
        {actions.length === 0 && <div className="px-4 py-8 text-center text-gray-500">No logs found.</div>}
      </div>
    </div>
  );
}
