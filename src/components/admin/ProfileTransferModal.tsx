"use client";

import { useEffect, useState } from "react";
import { adminFetch } from "@/lib/api/adminClient";

type Candidate = {
  userId: string;
  accountCode: string;
  name: string;
  email: string | null;
  phone: string | null;
};

export function ProfileTransferModal({
  open,
  profileId,
  note,
  onClose,
  onTransferred,
}: {
  open: boolean;
  profileId: string;
  note: string;
  onClose: () => void;
  onTransferred: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Candidate[]>([]);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setResults([]);
    setSelected(null);
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = window.setTimeout(async () => {
      const res = await adminFetch(`/api/superadmin/accounts/lookup?q=${encodeURIComponent(q)}`);
      const json = (await res.json()) as { items?: Candidate[]; error?: string };
      if (cancelled) return;
      if (!res.ok) {
        setError(json.error || "Could not search accounts");
        setResults([]);
      } else {
        setError(null);
        setResults(json.items || []);
      }
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [query, open]);

  const submitTransfer = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    const res = await adminFetch("/api/superadmin/profiles/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        profileId,
        target: selected.accountCode || selected.userId,
        note,
      }),
    });
    const json = (await res.json()) as { error?: string };
    setBusy(false);
    if (!res.ok) {
      setError(json.error || "Transfer failed");
      return;
    }
    onTransferred();
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] bg-black/40 p-4 flex items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl bg-white border border-gray-200 shadow-xl p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-gray-900">Transfer Profile Ownership</h3>
        <p className="text-sm text-gray-600 mt-1">
          Search by account code, name, email, phone, or auth user ID.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. U26041 / Ganesh / 98444..."
          className="mt-3 w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
        />
        <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-gray-100">
          {loading ? (
            <p className="px-3 py-3 text-sm text-gray-500">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-3 text-sm text-gray-500">Type at least 2 characters to search.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {results.map((r) => {
                const active = selected?.userId === r.userId;
                return (
                  <button
                    key={r.userId}
                    type="button"
                    onClick={() => setSelected(r)}
                    className={`w-full text-left px-3 py-2.5 hover:bg-gray-50 ${active ? "bg-[var(--primary)]/10" : ""}`}
                  >
                    <p className="text-sm font-medium text-gray-900">{r.name || "User"}</p>
                    <p className="text-xs text-gray-500">
                      {r.accountCode} · {r.phone || "—"} · {r.email || "—"}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-700"
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submitTransfer}
            disabled={busy || !selected}
            className="px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold disabled:opacity-50"
          >
            {busy ? "Transferring..." : "Transfer"}
          </button>
        </div>
      </div>
    </div>
  );
}

