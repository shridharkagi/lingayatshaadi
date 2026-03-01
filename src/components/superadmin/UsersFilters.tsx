"use client";

import { useState } from "react";
import { INDIAN_STATES, STATE_CITIES } from "@/data/constants";

export type ProfileStatusFilter = "verified" | "pending" | "rejected" | "suspended";
export type ProfileTypeFilter = "free" | "premium";
export type ProfileCreatedFilter = "" | "today" | "week" | "month" | "custom";

export interface UsersFiltersState {
  search: string;
  gender: "" | "male" | "female" | "other";
  ageMin: number;
  ageMax: number;
  state: string;
  city: string;
  profileStatuses: ProfileStatusFilter[];
  profileTypes: ProfileTypeFilter[];
  profileCreated: ProfileCreatedFilter;
  dateFrom: string;
  dateTo: string;
}

export const defaultUsersFilters: UsersFiltersState = {
  search: "",
  gender: "",
  ageMin: 18,
  ageMax: 60,
  state: "",
  city: "",
  profileStatuses: [],
  profileTypes: [],
  profileCreated: "",
  dateFrom: "",
  dateTo: "",
};

interface UsersFiltersProps {
  filters: UsersFiltersState;
  onChange: (filters: UsersFiltersState) => void;
  onClear: () => void;
}

export function UsersFilters({ filters, onChange, onClear }: UsersFiltersProps) {
  const [expanded, setExpanded] = useState(true);
  const cities = filters.state ? (STATE_CITIES[filters.state] || []) : [];

  const update = (updates: Partial<UsersFiltersState>) => {
    onChange({ ...filters, ...updates });
    if ("state" in updates && updates.state !== filters.state) {
      onChange({ ...filters, ...updates, city: "" });
    }
  };

  const toggleProfileStatus = (status: ProfileStatusFilter) => {
    const next = filters.profileStatuses.includes(status)
      ? filters.profileStatuses.filter((s) => s !== status)
      : [...filters.profileStatuses, status];
    update({ profileStatuses: next });
  };

  const toggleProfileType = (type: ProfileTypeFilter) => {
    const next = filters.profileTypes.includes(type)
      ? filters.profileTypes.filter((t) => t !== type)
      : [...filters.profileTypes, type];
    update({ profileTypes: next });
  };

  return (
    <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition"
      >
        <span className="font-medium text-gray-900">Filters</span>
        <span className="text-gray-500 text-sm">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="px-6 pb-6 pt-0 space-y-5 border-t border-gray-100">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Search (Name / Member ID / Mobile / Email)
            </label>
            <input
              type="text"
              placeholder="Search..."
              value={filters.search}
              onChange={(e) => update({ search: e.target.value })}
              className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Gender</label>
              <select
                value={filters.gender}
                onChange={(e) => update({ gender: e.target.value as UsersFiltersState["gender"] })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Age range */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Age (min)</label>
              <input
                type="number"
                min={18}
                max={100}
                value={filters.ageMin}
                onChange={(e) => update({ ageMin: parseInt(e.target.value, 10) || 18 })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Age (max)</label>
              <input
                type="number"
                min={18}
                max={100}
                value={filters.ageMax}
                onChange={(e) => update({ ageMax: parseInt(e.target.value, 10) || 60 })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
              <select
                value={filters.state}
                onChange={(e) => update({ state: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
              >
                <option value="">All states</option>
                {INDIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
              <select
                value={filters.city}
                onChange={(e) => update({ city: e.target.value })}
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent"
                disabled={!filters.state}
              >
                <option value="">All cities</option>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Profile Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Status</label>
            <div className="flex flex-wrap gap-2">
              {(["verified", "pending", "rejected", "suspended"] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => toggleProfileStatus(status)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                    filters.profileStatuses.includes(status)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Type</label>
            <div className="flex flex-wrap gap-2">
              {(["free", "premium"] as const).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleProfileType(type)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition ${
                    filters.profileTypes.includes(type)
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          {/* Profile Created */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Profile Created</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                { value: "today" as const, label: "Today" },
                { value: "week" as const, label: "This week" },
                { value: "month" as const, label: "This month" },
                { value: "custom" as const, label: "Custom date range" },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update({ profileCreated: value })}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filters.profileCreated === value
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {filters.profileCreated === "custom" && (
              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">From</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => update({ dateFrom: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">To</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => update({ dateTo: e.target.value })}
                    className="px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onClear}
              className="text-sm text-[var(--primary)] font-medium hover:underline"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
