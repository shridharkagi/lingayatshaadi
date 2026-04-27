"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfiles } from "@/contexts/ProfilesContext";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { SearchFilters, defaultFilters, type SearchFiltersState } from "@/components/SearchFilters";
import { useFilteredProfiles } from "@/hooks/useFilteredProfiles";
import { debounce } from "@/lib/security";
import { useAuth } from "@/contexts/AuthContext";
import { ViewerForensicWatermark } from "@/components/ViewerForensicWatermark";
import { adminFetch } from "@/lib/api/adminClient";
import { maskLastName, type AccountAccessState } from "@/lib/accessPolicy";

export default function SearchPage() {
  const { profiles } = useProfiles();
  const { isLoggedIn } = useAuth();
  const [accessState, setAccessState] = useState<AccountAccessState | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("grid");
  const [showFilters, setShowFilters] = useState(false); // Default to collapsed on mobile
  const [filters, setFilters] = useState<SearchFiltersState>(defaultFilters);
  const [isDesktop, setIsDesktop] = useState(false);

  // Debounced search query
  const debouncedSetQuery = useMemo(
    () => debounce((value: string) => setDebouncedQuery(value), 300),
    []
  );

  useEffect(() => {
    debouncedSetQuery(query);
  }, [query, debouncedSetQuery]);

  // Check if desktop on mount
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
      setShowFilters(window.innerWidth >= 1024); // Show filters by default on desktop
    };
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) {
      setAccessState(null);
      return;
    }
    void (async () => {
      const res = await adminFetch("/api/account/access-state");
      const json = (await res.json()) as { access?: AccountAccessState };
      if (!cancelled && res.ok && json.access) setAccessState(json.access);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  // Memoized filtered profiles
  const filteredProfiles = useFilteredProfiles(profiles, filters, debouncedQuery);

  // Count active filters - memoized
  const activeFiltersCount = useMemo(() => {
    return (
      (filters.profileType ? 1 : 0) +
      (filters.ageRange[0] !== 18 || filters.ageRange[1] !== 60 ? 1 : 0) +
      filters.maritalStatuses.length +
      filters.professionTypes.length
    );
  }, [filters]);

  // Memoized clear filters callback
  const handleClearFilters = useCallback(() => {
    setQuery("");
    setDebouncedQuery("");
    setFilters(defaultFilters);
  }, []);
  const canViewSensitiveFields = isLoggedIn && !!accessState?.hasValidSubscription;

  return (
    <div className={`max-w-6xl mx-auto w-full ${isLoggedIn ? "pb-20" : "pb-6"}`}>
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 sticky top-0 z-10">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--foreground)] mb-4">Search</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} aria-hidden />
            <input
              type="text"
              placeholder="Search by name, profession, city..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`relative p-2.5 rounded-xl border flex items-center gap-1 min-w-[44px] transition ${
              showFilters ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"
            }`}
            aria-label={showFilters ? "Hide filters" : "Show filters"}
            aria-expanded={showFilters}
          >
            <SlidersHorizontal size={20} />
            <span className="hidden sm:inline text-sm">Filters</span>
            {!showFilters && activeFiltersCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--primary)] text-white text-xs rounded-full flex items-center justify-center font-bold">
                {activeFiltersCount}
              </span>
            )}
            <span className="hidden lg:inline">
              {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>
          <button
            onClick={() => setView(view === "list" ? "grid" : "list")}
            className="p-2.5 rounded-xl border border-[var(--border)] flex items-center gap-1 min-w-[44px]"
            aria-label={view === "list" ? "Switch to grid view" : "Switch to list view"}
          >
            {view === "list" ? <LayoutGrid size={20} /> : <List size={20} />}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-[var(--color-border)] animate-slideDown">
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              compact
            />
          </div>
        )}
      </header>

      <div className="p-4">
        <p className="text-sm sm:text-base text-[var(--color-text-muted)] mb-4">
          {filteredProfiles.length} profile{filteredProfiles.length !== 1 ? "s" : ""} found
        </p>

        {filteredProfiles.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No profiles found"
            description="Try adjusting your search query or filters to see more results"
            action={{
              label: "Clear Filters",
              onClick: handleClearFilters,
            }}
          />
        ) : view === "list" ? (
          <div className="space-y-4">
            {filteredProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                variant="list"
                displayName={
                  canViewSensitiveFields
                    ? profile.fullName
                    : isLoggedIn
                      ? maskLastName(profile.fullName)
                      : undefined
                }
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredProfiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                displayName={
                  canViewSensitiveFields
                    ? profile.fullName
                    : isLoggedIn
                      ? maskLastName(profile.fullName)
                      : undefined
                }
              />
            ))}
          </div>
        )}
      </div>

      {isLoggedIn && <ViewerForensicWatermark />}
    </div>
  );
}
