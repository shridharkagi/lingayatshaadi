"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import {
  PROFESSION_TYPES,
  MARITAL_STATUS_OPTIONS,
} from "@/data/constants";

const AGE_MIN = 18;
const AGE_MAX = 60;

export interface SearchFiltersState {
  profileType: "bride" | "groom" | "";
  ageRange: [number, number];
  maritalStatuses: string[];
  professionTypes: string[];
}

export const defaultFilters: SearchFiltersState = {
  profileType: "",
  ageRange: [AGE_MIN, AGE_MAX],
  maritalStatuses: [],
  professionTypes: [],
};

// Helper to count active filters
function countActiveFilters(filters: SearchFiltersState): number {
  let count = 0;
  if (filters.profileType) count++;
  if (filters.ageRange[0] !== AGE_MIN || filters.ageRange[1] !== AGE_MAX) count++;
  count += filters.maritalStatuses.length;
  count += filters.professionTypes.length;
  return count;
}

// Save and load filters from localStorage
const STORAGE_KEY = "lingayat_search_filters";

function saveFilters(filters: SearchFiltersState) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  }
}

function loadFilters(): SearchFiltersState | null {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    }
  }
  return null;
}

interface SearchFiltersProps {
  filters: SearchFiltersState;
  onChange: (filters: SearchFiltersState) => void;
  /** Compact layout for inline use (e.g. search page) */
  compact?: boolean;
  /** Show Create Free Profile button */
  showCta?: boolean;
  /** Show clear all filters button */
  showClearAll?: boolean;
}

export function SearchFilters({
  filters,
  onChange,
  compact = false,
  showCta = false,
  showClearAll = true,
}: SearchFiltersProps) {
  const { profileType, ageRange, maritalStatuses, professionTypes } = filters;
  const [mounted, setMounted] = useState(false);

  // Load saved filters on mount
  useEffect(() => {
    setMounted(true);
    const saved = loadFilters();
    if (saved) {
      onChange(saved);
    }
  }, []);

  // Save filters when they change
  useEffect(() => {
    if (mounted) {
      saveFilters(filters);
    }
  }, [filters, mounted]);

  const activeFiltersCount = countActiveFilters(filters);
  const hasActiveFilters = activeFiltersCount > 0;

  const toggleMaritalStatus = (status: string) => {
    const next = maritalStatuses.includes(status)
      ? maritalStatuses.filter((s) => s !== status)
      : [...maritalStatuses, status];
    onChange({ ...filters, maritalStatuses: next });
  };

  const toggleProfessionType = (type: string) => {
    const next = professionTypes.includes(type)
      ? professionTypes.filter((t) => t !== type)
      : [...professionTypes, type];
    onChange({ ...filters, professionTypes: next });
  };

  const clearAllFilters = () => {
    onChange(defaultFilters);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const gridClass = compact
    ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6";

  return (
    <div className="space-y-4">
      {/* Clear All Button */}
      {showClearAll && hasActiveFilters && (
        <div className="flex items-center justify-between pb-2 border-b border-[var(--color-border)]">
          <span className="text-sm text-[var(--color-text-muted)]">
            {activeFiltersCount} filter{activeFiltersCount !== 1 ? "s" : ""} applied
          </span>
          <button
            onClick={clearAllFilters}
            className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition"
          >
            <X size={16} />
            Clear All
          </button>
        </div>
      )}

      <div className={gridClass}>
        {/* Profile Type */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Profile Type
          </label>
          <div className="flex gap-2">
            {(["bride", "groom"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() =>
                  onChange({
                    ...filters,
                    profileType: profileType === type ? "" : type,
                  })
                }
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium capitalize transition ${
                  profileType === type
                    ? "bg-[var(--primary)] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {type === "bride" ? "Bride" : "Groom"}
              </button>
            ))}
          </div>
        </div>

        {/* Age filter - improved for mobile */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Age range
          </label>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--color-text-muted)] w-10">Min</span>
              <input
                type="range"
                min={AGE_MIN}
                max={AGE_MAX}
                value={ageRange[0]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    ageRange: [
                      Math.min(parseInt(e.target.value, 10), ageRange[1] - 1),
                      ageRange[1],
                    ],
                  })
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--primary)] touch-manipulation"
                style={{ minHeight: "44px" }}
                aria-label="Minimum age"
              />
              <input
                type="number"
                min={AGE_MIN}
                max={ageRange[1] - 1}
                value={ageRange[0]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    ageRange: [
                      Math.min(parseInt(e.target.value, 10) || AGE_MIN, ageRange[1] - 1),
                      ageRange[1],
                    ],
                  })
                }
                className="w-16 px-2 py-1 text-sm font-semibold text-center text-[var(--primary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-[var(--color-text-muted)] w-10">Max</span>
              <input
                type="range"
                min={AGE_MIN}
                max={AGE_MAX}
                value={ageRange[1]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    ageRange: [
                      ageRange[0],
                      Math.max(parseInt(e.target.value, 10), ageRange[0] + 1),
                    ],
                  })
                }
                className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[var(--primary)] touch-manipulation"
                style={{ minHeight: "44px" }}
                aria-label="Maximum age"
              />
              <input
                type="number"
                min={ageRange[0] + 1}
                max={AGE_MAX}
                value={ageRange[1]}
                onChange={(e) =>
                  onChange({
                    ...filters,
                    ageRange: [
                      ageRange[0],
                      Math.max(parseInt(e.target.value, 10) || AGE_MAX, ageRange[0] + 1),
                    ],
                  })
                }
                className="w-16 px-2 py-1 text-sm font-semibold text-center text-[var(--primary)] border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>

        {/* Marital Status - vertical list */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Marital Status {maritalStatuses.length > 0 && `(${maritalStatuses.length})`}
          </label>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2 bg-gray-50/50">
            {MARITAL_STATUS_OPTIONS.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => toggleMaritalStatus(status)}
                className={`px-3 py-2 rounded-lg text-left text-sm font-medium transition min-h-[44px] ${
                  maritalStatuses.includes(status)
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-[var(--color-border)]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Profession - vertical list with scroll */}
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Profession {professionTypes.length > 0 && `(${professionTypes.length})`}
          </label>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto rounded-lg border border-[var(--color-border)] p-2 bg-gray-50/50">
            {PROFESSION_TYPES.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => toggleProfessionType(type)}
                className={`px-3 py-2 rounded-lg text-left text-sm font-medium transition whitespace-nowrap min-h-[44px] ${
                  professionTypes.includes(type)
                    ? "bg-[var(--primary)] text-white"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-[var(--color-border)]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {showCta && (
        <div className="flex justify-center pt-2">
          <Link
            href="/signup"
            className="inline-block px-8 py-3 rounded-full font-medium text-white shadow-lg hover:opacity-95 transition-opacity"
            style={{ background: "var(--gradient-primary)" }}
          >
            Create Free Profile
          </Link>
        </div>
      )}
    </div>
  );
}
