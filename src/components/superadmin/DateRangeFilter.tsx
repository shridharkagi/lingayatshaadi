"use client";

import { useMemo } from "react";
import { Calendar } from "lucide-react";

export interface DateRange {
  from?: string; // YYYY-MM-DD inclusive
  to?: string;   // YYYY-MM-DD inclusive
  preset: "today" | "week" | "month" | "all" | "custom";
}

const PRESETS: Array<{ id: DateRange["preset"]; label: string }> = [
  { id: "today", label: "Today" },
  { id: "week", label: "Last 7 days" },
  { id: "month", label: "This month" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom" },
];

function isoDay(d: Date): string {
  // Use UTC YYYY-MM-DD so the API filter doesn't drift across timezones.
  return d.toISOString().slice(0, 10);
}

/**
 * Compute `from`/`to` for a given preset. Returns undefined fields for "all"
 * and an empty range for "custom" (caller fills in via the date inputs).
 */
export function rangeFromPreset(preset: DateRange["preset"]): DateRange {
  const now = new Date();
  const today = isoDay(now);

  if (preset === "today") return { preset, from: today, to: today };

  if (preset === "week") {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - 6);
    return { preset, from: isoDay(d), to: today };
  }

  if (preset === "month") {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    return { preset, from: isoDay(d), to: today };
  }

  if (preset === "all") return { preset };

  return { preset: "custom" };
}

interface Props {
  value: DateRange;
  onChange: (next: DateRange) => void;
}

export function DateRangeFilter({ value, onChange }: Props) {
  // Custom-mode inputs read directly from `value` — no local mirror state, so
  // the parent always wins and the React `set-state-in-effect` lint stays happy.
  const customFrom = value.from || "";
  const customTo = value.to || "";

  const summary = useMemo(() => {
    if (value.preset === "all") return "All time";
    if (!value.from && !value.to) return "—";
    if (value.from && value.to && value.from === value.to) return value.from;
    return `${value.from || "…"}  →  ${value.to || "…"}`;
  }, [value]);

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Calendar size={16} />
        <span>Date range</span>
        <span className="ml-auto font-medium text-gray-800">{summary}</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = value.preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(rangeFromPreset(p.id))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                active
                  ? "bg-[var(--primary)] text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {value.preset === "custom" && (
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) =>
              onChange({
                preset: "custom",
                from: e.target.value || undefined,
                to: customTo || undefined,
              })
            }
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            aria-label="From date"
          />
          <span className="text-gray-400 self-center hidden sm:block">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) =>
              onChange({
                preset: "custom",
                from: customFrom || undefined,
                to: e.target.value || undefined,
              })
            }
            className="flex-1 px-3 py-2 rounded-lg border border-gray-200 text-sm"
            aria-label="To date"
          />
        </div>
      )}
    </div>
  );
}
