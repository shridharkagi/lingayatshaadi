"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/adminClient";

export default function SuperAdminTrashPage() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    const res = await adminFetch("/api/superadmin/trash");
    const json = (await res.json()) as { items?: Array<Record<string, unknown>>; error?: string };
    if (!res.ok) setError(json.error || "Failed to load trash");
    else setItems(json.items || []);
  };

  useEffect(() => {
    void load();
  }, []);

  const restore = async (profileId: string) => {
    const res = await adminFetch("/api/superadmin/lifecycle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action: "restore" }),
    });
    if (!res.ok) {
      const json = (await res.json()) as { error?: string };
      setError(json.error || "Restore failed");
      return;
    }
    await load();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Trash</h1>
      <p className="text-gray-500 mt-1">Deleted profiles with reason notes and restore controls.</p>
      {error && <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      <div className="mt-6 bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Member</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Reason</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Note</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Deleted At</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => (
              <tr key={String(it.id)} className="border-t border-gray-100">
                <td className="px-4 py-3">
                  <div className="font-medium">{String(it.full_name || "Unknown")}</div>
                  <div className="text-xs text-gray-500">{String(it.public_id || "")}</div>
                </td>
                <td className="px-4 py-3 text-sm">{String(it.deleted_reason || "-")}</td>
                <td className="px-4 py-3 text-sm">{String(it.deleted_note || "-")}</td>
                <td className="px-4 py-3 text-sm">{new Date(String(it.deleted_at)).toLocaleString()}</td>
                <td className="px-4 py-3">
                  {!Boolean(it.is_purged) && (
                    <button
                      onClick={() => restore(String(it.profile_id))}
                      className="rounded-md border border-gray-300 px-3 py-1 text-xs font-medium"
                    >
                      Restore
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">Trash is empty</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
