"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import {
  PROFESSION_TYPES,
  MARITAL_STATUS_OPTIONS,
  FOOD_HABITS_OPTIONS,
} from "@/data/constants";

const AGE_MIN = 18;
const AGE_MAX = 60;

export interface SearchFiltersState {
  profileType: "bride" | "groom" | "";
  ageRange: [number, number];
  maritalStatuses: string[];
  professionTypes: string[];
  foodHabits: string[];
}

export const defaultFilters: SearchFiltersState = {
  profileType: "",
  ageRange: [AGE_MIN, AGE_MAX],
  maritalStatuses: [],
  professionTypes: [],
  foodHabits: [],
};

// Helper to count active filters
function countActiveFilters(filters: SearchFiltersState): number {
  let count = 0;
  if (filters.profileType) count++;
  if (filters.ageRange[0] !== AGE_MIN || filters.ageRange[1] !== AGE_MAX) count++;
  count += filters.maritalStatuses.length;
  count += filters.professionTypes.length;
  count += filters.foodHabits.length;
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
  /** Make filters collapsible */
  collapsible?: boolean;
  /**
   * When set, hides the Bride/Groom toggle entirely and forces the
   * filter to always reflect the locked value. Used by the dedicated
   * /brides and /grooms routes where the gender is implicit in the URL.
   */
  lockedProfileType?: "bride" | "groom";
}

export function SearchFilters({
  filters,
  onChange,
  compact = false,
  showCta = false,
  showClearAll = true,
  collapsible = false,
  lockedProfileType,
}: SearchFiltersProps) {
  const { profileType, ageRange, maritalStatuses, professionTypes, foodHabits } = filters;
  const [mounted, setMounted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!collapsible);

  // Load saved filters on mount (skip merging storage on /brides and /grooms so a
  // desktop-saved narrow search cannot make the dedicated listing look "blank"
  // on mobile the first time the filter sheet opens).
  useEffect(() => {
    setMounted(true);
    if (lockedProfileType) {
      onChange({ ...defaultFilters, profileType: lockedProfileType });
      return;
    }
    const saved = loadFilters();
    if (saved) {
      onChange({
        ...saved,
        foodHabits: saved.foodHabits || [],
        profileType: saved.profileType,
      });
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

  const toggleFoodHabit = (habit: string) => {
    const next = foodHabits.includes(habit)
      ? foodHabits.filter((h) => h !== habit)
      : [...foodHabits, habit];
    onChange({ ...filters, foodHabits: next });
  };

  const clearAllFilters = () => {
    onChange({
      ...defaultFilters,
      profileType: lockedProfileType ?? "",
    });
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return (
    <div className="space-y-4">
      {/* Collapsible header */}
      {collapsible && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--color-border)] hover:bg-gray-50 transition"
        >
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[var(--color-text-primary)]">Filters</span>
            {hasActiveFilters && (
              <span className="px-2 py-1 text-xs font-medium bg-[var(--primary)] text-white rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>
      )}

      {/* Filters content */}
      {isExpanded && (
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

          <div className={`grid grid-cols-1 ${lockedProfileType ? "" : "sm:grid-cols-2"} gap-4`}>
            {/* Profile Type — hidden on dedicated bride/groom routes */}
            {!lockedProfileType && (
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
            )}

            {/* Age filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
                Age range: {ageRange[0]} - {ageRange[1]} yrs
              </label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-12">Min</span>
                  <div className="flex-1 relative">
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
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right, var(--primary) 0%, var(--primary) ${((ageRange[0] - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100}%, #e5e7eb ${((ageRange[0] - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100}%, #e5e7eb 100%)`
                      }}
                      aria-label="Minimum age"
                    />
                  </div>
                  <div className="w-14 px-2 py-1.5 text-sm font-semibold text-center text-[var(--primary)] bg-white border border-[var(--color-border)] rounded-lg">
                    {ageRange[0]}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700 w-12">Max</span>
                  <div className="flex-1 relative">
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
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider-thumb"
                      style={{
                        background: `linear-gradient(to right, #e5e7eb 0%, #e5e7eb ${((ageRange[1] - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100}%, var(--primary) ${((ageRange[1] - AGE_MIN) / (AGE_MAX - AGE_MIN)) * 100}%, var(--primary) 100%)`
                      }}
                      aria-label="Maximum age"
                    />
                  </div>
                  <div className="w-14 px-2 py-1.5 text-sm font-semibold text-center text-[var(--primary)] bg-white border border-[var(--color-border)] rounded-lg">
                    {ageRange[1]}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Marital Status - Tag Style */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Marital Status {maritalStatuses.length > 0 && `(${maritalStatuses.length})`}
            </label>
            <div className="flex flex-wrap gap-2">
              {MARITAL_STATUS_OPTIONS.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleMaritalStatus(status)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    maritalStatuses.includes(status)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-[var(--color-border)]"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Profession - Tag Style */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Profession {professionTypes.length > 0 && `(${professionTypes.length})`}
            </label>
            <div className="flex flex-wrap gap-2">
              {PROFESSION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleProfessionType(type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition whitespace-nowrap ${
                    professionTypes.includes(type)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-[var(--color-border)]"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Food Habits - Tag Style */}
          <div>
            <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
              Food Habits {foodHabits.length > 0 && `(${foodHabits.length})`}
            </label>
            <div className="flex flex-wrap gap-2">
              {FOOD_HABITS_OPTIONS.map((habit) => (
                <button
                  key={habit}
                  type="button"
                  onClick={() => toggleFoodHabit(habit)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                    foodHabits.includes(habit)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-[var(--color-border)]"
                  }`}
                >
                  {habit}
                </button>
              ))}
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
      )}
    </div>
  );
}
