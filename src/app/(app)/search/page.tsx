"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Search, SlidersHorizontal, LayoutGrid, List, ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { SearchFilters, defaultFilters, type SearchFiltersState } from "@/components/SearchFilters";
import { debounce } from "@/lib/security";
import { useAuth } from "@/contexts/AuthContext";
import { ViewerForensicWatermark } from "@/components/ViewerForensicWatermark";
import { getAccountAccessState } from "@/lib/api/accessState";
import { maskLastNameKeepPrefix, type AccountAccessState } from "@/lib/accessPolicy";
import { WhatsAppGroupCta } from "@/components/whatsapp/WhatsAppGroupCta";
import { searchProfilesCursor } from "@/lib/api/profiles";
import type { Profile } from "@/types";

function getPageSizeForViewport(width: number): number {
  if (width < 640) return 12;
  if (width < 1024) return 18;
  return 24;
}

export default function SearchPage() {
  const { isLoggedIn } = useAuth();
  const [accessState, setAccessState] = useState<AccountAccessState | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("grid");
  const [showFilters, setShowFilters] = useState(false); // Default to collapsed on mobile
  const [filters, setFilters] = useState<SearchFiltersState>(defaultFilters);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(24);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

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
    const syncPageSize = () => {
      setPageSize(getPageSizeForViewport(window.innerWidth));
    };
    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  useEffect(() => {
    const checkDesktop = () => {
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
      const access = await getAccountAccessState();
      if (!cancelled) setAccessState(access);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  const fetchProfiles = useCallback(async () => {
    setLoading(true);
    const res = await searchProfilesCursor(
      {
        profileType: filters.profileType,
        ageRange: filters.ageRange,
        maritalStatuses: filters.maritalStatuses,
        professionTypes: filters.professionTypes,
        query: debouncedQuery,
      },
      { cursor: 0, pageSize }
    );
    if (!res.error) {
      setProfiles(res.data);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    } else {
      setProfiles([]);
      setCursor(null);
      setHasMore(false);
    }
    setLoading(false);
  }, [debouncedQuery, filters, pageSize]);

  const loadMoreProfiles = useCallback(async () => {
    if (cursor == null || loadingMore || !hasMore) return;
    setLoadingMore(true);
    const res = await searchProfilesCursor(
      {
        profileType: filters.profileType,
        ageRange: filters.ageRange,
        maritalStatuses: filters.maritalStatuses,
        professionTypes: filters.professionTypes,
        query: debouncedQuery,
      },
      { cursor, pageSize }
    );
    if (!res.error) {
      setProfiles((prev) => [...prev, ...res.data]);
      setCursor(res.nextCursor);
      setHasMore(res.hasMore);
    }
    setLoadingMore(false);
  }, [cursor, debouncedQuery, filters, hasMore, loadingMore, pageSize]);

  useEffect(() => {
    void fetchProfiles();
  }, [fetchProfiles]);

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!target || loading || loadingMore || !hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          void loadMoreProfiles();
        }
      },
      { rootMargin: "240px 0px" }
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMore, loadMoreProfiles, loading, loadingMore]);

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
        <div className="mb-4">
          <WhatsAppGroupCta sourcePage="search" />
        </div>
        <p className="text-sm sm:text-base text-[var(--color-text-muted)] mb-4">
          {profiles.length} profile{profiles.length !== 1 ? "s" : ""} found
        </p>

        {!loading && profiles.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No profiles found"
            description="Try adjusting your search query or filters to see more results"
            action={{
              label: "Clear Filters",
              onClick: handleClearFilters,
            }}
          />
        ) : loading ? (
          <div className="py-8 text-center text-gray-500">Loading profiles...</div>
        ) : view === "list" ? (
          <div className="space-y-4">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                variant="list"
                displayName={
                  canViewSensitiveFields
                    ? profile.fullName
                    : maskLastNameKeepPrefix(profile.fullName)
                }
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {profiles.map((profile) => (
              <ProfileCard
                key={profile.id}
                profile={profile}
                displayName={
                  canViewSensitiveFields
                    ? profile.fullName
                    : maskLastNameKeepPrefix(profile.fullName)
                }
              />
            ))}
          </div>
        )}

        {!loading && hasMore && (
          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={() => {
                void loadMoreProfiles();
              }}
              disabled={loadingMore}
              className="rounded-xl border border-[var(--border)] bg-white px-5 py-2.5 text-sm font-medium text-[var(--foreground)] hover:bg-gray-50 disabled:opacity-60"
            >
              {loadingMore ? "Loading..." : "Load More Profiles"}
            </button>
          </div>
        )}
        {!loading && hasMore && <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />}
        {loadingMore && (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div
                key={idx}
                className="rounded-2xl bg-white border border-[var(--color-border)] overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/5] bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {isLoggedIn && <ViewerForensicWatermark />}
    </div>
  );
}
