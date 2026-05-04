"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { adminFetch } from "@/lib/api/adminClient";
import {
  DATA_VISIBILITY_FIELDS,
  DATA_VISIBILITY_FIELD_LABELS,
  DEFAULT_DATA_VISIBILITY_CONFIG,
  normalizeDataVisibilityConfig,
  type DataVisibilityConfig,
  type VisibilityRule,
} from "@/lib/dataVisibility";

const TIERS = [
  { key: "non_logged_in", label: "Non logged-in users" },
  { key: "logged_in_unpaid", label: "Logged-in, unpaid" },
  { key: "logged_in_paid", label: "Logged-in, paid" },
] as const;

export default function SuperAdminDataVisibilityPage() {
  const { updateConfig } = useAppConfig();
  const [config, setConfig] = useState<DataVisibilityConfig>(DEFAULT_DATA_VISIBILITY_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const latestConfigRef = useRef<DataVisibilityConfig>(DEFAULT_DATA_VISIBILITY_CONFIG);

  const readLatestFromServer = async (): Promise<DataVisibilityConfig> => {
    const res = await adminFetch("/api/site-config");
    if (!res.ok) {
      throw new Error(`Failed to read latest settings (HTTP ${res.status})`);
    }
    const data = await res.json().catch(() => ({}));
    return normalizeDataVisibilityConfig(data?.profileFieldVisibility);
  };

  useEffect(() => {
    let cancelled = false;
    readLatestFromServer()
      .then((normalized) => {
        if (cancelled) return;
        latestConfigRef.current = normalized;
        setConfig(normalized);
      })
      .catch((e) => {
        if (!cancelled) alert(e instanceof Error ? e.message : "Failed to load data visibility settings");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const fieldRows = useMemo(
    () => DATA_VISIBILITY_FIELDS.map((f) => ({ id: f, label: DATA_VISIBILITY_FIELD_LABELS[f] })),
    []
  );

  const updateRule = (
    field: keyof DataVisibilityConfig,
    tier: keyof DataVisibilityConfig[typeof field],
    value: VisibilityRule
  ) => {
    const base = latestConfigRef.current;
    const next = {
      ...base,
      [field]: {
        ...base[field],
        [tier]: value,
      },
    };
    latestConfigRef.current = next;
    setConfig(next);
  };

  const save = async () => {
    setSaving(true);
    try {
      const intended = normalizeDataVisibilityConfig(latestConfigRef.current);
      const res = await adminFetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileFieldVisibility: intended }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(typeof body?.error === "string" ? body.error : `Save failed (HTTP ${res.status})`);
      }
      await res.json().catch(() => ({}));

      const persisted = await readLatestFromServer();
      const intendedJson = JSON.stringify(intended);
      const persistedJson = JSON.stringify(persisted);
      if (intendedJson !== persistedJson) {
        latestConfigRef.current = persisted;
        setConfig(persisted);
        updateConfig({ profileFieldVisibility: persisted });
        throw new Error("Changes could not be fully persisted. Page refreshed with latest saved values.");
      }

      latestConfigRef.current = persisted;
      setConfig(persisted);
      updateConfig({ profileFieldVisibility: persisted });
      alert("Data visibility settings saved.");
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">Data Visibility</h1>
      <p className="text-gray-500 mt-1">
        Control field visibility by viewer type: public, logged-in unpaid, and logged-in paid.
      </p>

      <div className="mt-6 bg-white rounded-xl shadow-sm p-4 sm:p-6">
        {loading ? (
          <p className="text-sm text-gray-500">Loading visibility rules…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white z-10 text-left text-xs uppercase tracking-wide text-gray-500 border-b py-2 pr-3">
                    Field
                  </th>
                  {TIERS.map((tier) => (
                    <th key={tier.key} className="text-left text-xs uppercase tracking-wide text-gray-500 border-b py-2 px-2">
                      {tier.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fieldRows.map((row) => (
                  <tr key={row.id}>
                    <td className="sticky left-0 bg-white z-10 border-b py-3 pr-3 text-sm font-medium text-gray-800">
                      {row.label}
                    </td>
                    {TIERS.map((tier) => (
                      <td key={`${row.id}-${tier.key}`} className="border-b py-3 px-2">
                        <select
                          value={config[row.id][tier.key]}
                          onChange={(e) =>
                            updateRule(row.id, tier.key, e.target.value as VisibilityRule)
                          }
                          className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                        >
                          <option value="show">Show</option>
                          <option value="mask">Mask</option>
                          <option value="hide">Hide</option>
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            Mask shows partial value where supported; hide removes the field entirely.
          </p>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Visibility Rules"}
          </button>
        </div>
      </div>
    </div>
  );
}

