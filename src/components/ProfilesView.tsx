"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Image from "@/components/ui/SmartImage";
import Link from "next/link";
import { SlidersHorizontal, X, Search, ShieldCheck, UserPlus } from "lucide-react";
import { ProfilesPageHeader } from "@/components/ProfilesPageHeader";
import { ProfileCard } from "@/components/ui/ProfileCard";
import {
  SearchFilters,
  defaultFilters,
  type SearchFiltersState,
} from "@/components/SearchFilters";
import { useAuth } from "@/contexts/AuthContext";
import { listProfilesByUserId } from "@/lib/api/profiles";
import { BottomNav } from "@/components/ui/BottomNav";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { SiteFooter } from "@/components/SiteFooter";
import { getAccountAccessState } from "@/lib/api/accessState";
import { maskLastNameKeepPrefix, type AccountAccessState } from "@/lib/accessPolicy";
import { searchProfilesCursor } from "@/lib/api/profiles";
import type { Profile } from "@/types";

const AGE_MIN = 18;
const AGE_MAX = 60;

export interface ProfilesViewProps {
  /** Hard-locked gender filter for dedicated /brides and /grooms routes. */
  lockedGender?: "male" | "female";
  /** Hero title text. */
  title: string;
  /** Hero subtitle / tagline. */
  subtitle: string;
  /** Hero background image URL. */
  heroImage?: string;
  /** Singular noun used in result count (e.g. "profiles", "brides", "grooms"). */
  itemNoun?: string;
}

const DEFAULT_HERO_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1600&q=70";
const QUERY_DEBOUNCE_MS = 250;

function getPageSizeForViewport(width: number): number {
  if (width < 640) return 12;
  if (width < 1024) return 18;
  return 24;
}

type QuickFilterKey = "maritalStatuses" | "foodHabits" | "professionTypes";

/** One-tap chips that toggle values in the existing filter state (no new filter logic). */
const QUICK_FILTERS: Array<{ key: QuickFilterKey; value: string }> = [
  { key: "maritalStatuses", value: "Never Married" },
  { key: "foodHabits", value: "Vegetarian" },
  { key: "professionTypes", value: "IT / Software" },
];

function countActiveFilters(
  f: SearchFiltersState,
  lockedGender?: "male" | "female"
): number {
  let n = 0;
  // Don't count profileType when it's locked by the route — that's not
  // a user-applied filter.
  if (f.profileType && !lockedGender) n++;
  if (f.ageRange[0] !== AGE_MIN || f.ageRange[1] !== AGE_MAX) n++;
  n += f.maritalStatuses.length;
  n += f.professionTypes.length;
  n += f.foodHabits.length;
  return n;
}

export function ProfilesView({
  lockedGender,
  title,
  subtitle,
  heroImage = DEFAULT_HERO_IMAGE,
  itemNoun = "profiles",
}: ProfilesViewProps) {
  const { isLoggedIn, authUser } = useAuth();
  const [accessState, setAccessState] = useState<AccountAccessState | null>(null);
  const { openAuthModal } = useAuthModal();
  const [ownedProfilesLoaded, setOwnedProfilesLoaded] = useState(false);
  const [hasAnyOwnedProfile, setHasAnyOwnedProfile] = useState(false);

  const lockedProfileType = lockedGender
    ? lockedGender === "female"
      ? "bride"
      : "groom"
    : undefined;

  const [filters, setFilters] = useState<SearchFiltersState>(() => ({
    ...defaultFilters,
    profileType: lockedProfileType ?? "",
  }));
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [cursor, setCursor] = useState<number | null>(0);
  const [hasMore, setHasMore] = useState(false);
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pageSize, setPageSize] = useState(24);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const activeCount = useMemo(
    () => countActiveFilters(filters, lockedGender),
    [filters, lockedGender]
  );

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

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn || !authUser?.id) {
      setOwnedProfilesLoaded(true);
      setHasAnyOwnedProfile(false);
      return;
    }
    setOwnedProfilesLoaded(false);
    void listProfilesByUserId(authUser.id).then(({ data }) => {
      if (cancelled) return;
      const rows = data || [];
      const hasLive = rows.some((p) => !p.deletedAt);
      setHasAnyOwnedProfile(hasLive);
      setOwnedProfilesLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, authUser?.id]);

  const toggleQuickFilter = useCallback(
    (key: QuickFilterKey, value: string) => {
      setFilters((prev) => {
        const current = prev[key] as string[];
        const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const showCreateProfileStrip =
    !isLoggedIn || (ownedProfilesLoaded && !hasAnyOwnedProfile);

  useEffect(() => {
    if (filterOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [filterOpen]);

  useEffect(() => {
    const syncPageSize = () => {
      setPageSize(getPageSizeForViewport(window.innerWidth));
    };
    syncPageSize();
    window.addEventListener("resize", syncPageSize);
    return () => window.removeEventListener("resize", syncPageSize);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), QUERY_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  const fetchProfiles = useCallback(async () => {
    setProfilesLoading(true);
    const res = await searchProfilesCursor(
      {
        profileType: filters.profileType,
        ageRange: filters.ageRange,
        maritalStatuses: filters.maritalStatuses,
        professionTypes: filters.professionTypes,
        foodHabits: filters.foodHabits,
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
    setProfilesLoading(false);
  }, [debouncedQuery, filters, pageSize]);

  const loadMoreProfiles = useCallback(async () => {
    if (cursor == null || !hasMore || loadingMore) return;
    setLoadingMore(true);
    const res = await searchProfilesCursor(
      {
        profileType: filters.profileType,
        ageRange: filters.ageRange,
        maritalStatuses: filters.maritalStatuses,
        professionTypes: filters.professionTypes,
        foodHabits: filters.foodHabits,
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
    if (!target || profilesLoading || loadingMore || !hasMore) return;
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
  }, [hasMore, loadMoreProfiles, loadingMore, profilesLoading]);

  const showingFiltered = activeCount > 0 || debouncedQuery.trim().length > 0;

  const resetFilters = () =>
    setFilters({ ...defaultFilters, profileType: lockedProfileType ?? "" });
  const canViewSensitiveFields = isLoggedIn && !!accessState?.hasValidSubscription;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <ProfilesPageHeader />

      {/* Hero — z-[22] above forensic watermark (fixed z-[21]) */}
      <section
        className={`relative overflow-hidden ${
          isLoggedIn ? "pt-[4.25rem] sm:pt-[4.5rem]" : "pt-[4.25rem] sm:pt-[4.5rem]"
        }`}
      >
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt=""
            fill
            className="object-cover saturate-[0.85]"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B12]/30 via-[#0B0B12]/65 to-[#0B0B12]" />
          <div className="absolute inset-0 bg-[radial-gradient(70%_60%_at_90%_10%,rgba(235,201,131,0.16)_0%,transparent_70%),radial-gradient(60%_50%_at_0%_85%,rgba(211,155,98,0.14)_0%,transparent_70%)]" />
          <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(255,255,255,0.10)_1px,transparent_1.4px)] [background-size:16px_16px]" />
        </div>
        <div className="relative z-[22] isolate max-w-6xl mx-auto px-5 sm:px-6 pt-7 pb-14 sm:pt-10 sm:pb-20">
          <span className="lb-glass inline-flex h-7 items-center gap-1.5 rounded-full px-3 text-[12px] font-medium text-[var(--lb-text-2)]">
            <ShieldCheck size={13} className="text-[var(--lb-accent-text)]" aria-hidden />
            Verified Lingayat profiles
          </span>
          <h1 className="mt-3.5 text-[34px] sm:text-[44px] font-bold leading-[1.05] tracking-[-0.02em] text-[var(--lb-text)]">
            {title}
          </h1>
          <p className="mt-2 max-w-md text-[15px] sm:text-base leading-relaxed text-[var(--lb-text-2)]">{subtitle}</p>
          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {isLoggedIn ? (
              <>
                <Link
                  href="/search"
                  className="lb-btn-primary inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-semibold"
                >
                  <Search size={16} strokeWidth={2.2} aria-hidden />
                  Advanced search
                </Link>
                <Link
                  href="/account"
                  className="lb-btn-glass inline-flex h-11 items-center rounded-xl px-5 text-[14px] font-medium"
                >
                  My account
                </Link>
              </>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="lb-btn-primary inline-flex h-11 items-center rounded-xl px-6 text-[15px] font-semibold"
              >
                Log in
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sticky search + filter bar */}
      <div className="sticky top-14 sm:top-16 z-30 -mt-10 px-3.5 sm:px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-stretch gap-2 rounded-[14px] border border-[var(--lb-line)] bg-[#1A1824]/95 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <label className="relative flex flex-1 min-w-0 items-center">
              <span className="sr-only">Search {itemNoun}</span>
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--lb-subtle)] pointer-events-none"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name, city or profession"
                className="h-[50px] w-full min-w-0 rounded-2xl border border-[var(--lb-line)] bg-[var(--lb-field)] pl-11 pr-3 text-[14px] text-[var(--lb-text)] transition focus:border-[var(--lb-accent)]/60 focus:outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              aria-label={activeCount > 0 ? `Filters, ${activeCount} active` : "Filters"}
              className="lb-btn-glass relative flex h-[50px] min-w-[54px] shrink-0 items-center justify-center gap-2 rounded-2xl px-3 sm:px-4 text-sm font-medium"
            >
              <SlidersHorizontal size={19} className="shrink-0 text-[var(--lb-accent-text)]" />
              <span className="hidden sm:inline">Filters</span>
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[image:var(--lb-accent-grad)] px-1.5 text-[11px] font-bold text-[var(--lb-on-accent)] ring-2 ring-[#1A1824]">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {showCreateProfileStrip && (
        <div className="px-3.5 sm:px-4 mt-4">
          <div className="max-w-6xl mx-auto lb-ring rounded-[14px]">
            <div className="flex items-center gap-3 rounded-[13px] bg-gradient-to-br from-[#1A1824] to-[#15131E] p-3.5">
              <div className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] bg-[var(--lb-accent-tint)]">
                <UserPlus size={20} className="text-[var(--lb-accent-text)]" aria-hidden />
              </div>
              <p className="min-w-0 flex-1 text-[12.5px] leading-snug text-[var(--lb-muted)]">
                <strong className="block text-[13.5px] font-semibold text-[var(--lb-text)]">List your profile</strong>
                Quick setup, family-friendly privacy.
              </p>
              {isLoggedIn ? (
                <Link
                  href="/account?createProfile=1"
                  className="lb-btn-primary inline-flex h-10 shrink-0 items-center rounded-xl px-4 text-[13px] font-semibold"
                >
                  Create
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("signup")}
                  className="lb-btn-primary inline-flex h-10 shrink-0 items-center rounded-xl px-4 text-[13px] font-semibold"
                >
                  Create
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Listing */}
      <section className="px-3.5 sm:px-4 pt-5 pb-28 lg:pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="-mx-3.5 mb-5 flex gap-2 overflow-x-auto px-3.5 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Quick filters">
            <button
              type="button"
              onClick={resetFilters}
              aria-pressed={activeCount === 0}
              className={`h-9 shrink-0 rounded-full px-4 text-[13px] transition active:scale-95 ${
                activeCount === 0 ? "lb-btn-primary font-semibold" : "lb-btn-glass font-medium"
              }`}
            >
              All {itemNoun}
            </button>
            {QUICK_FILTERS.map((chip) => {
              const on = (filters[chip.key] as string[]).includes(chip.value);
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => toggleQuickFilter(chip.key, chip.value)}
                  aria-pressed={on}
                  className={`h-9 shrink-0 rounded-full px-4 text-[13px] transition active:scale-95 ${
                    on ? "lb-btn-primary font-semibold" : "lb-btn-glass font-medium"
                  }`}
                >
                  {chip.value}
                </button>
              );
            })}
          </div>

          <div className="mb-4 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-[19px] font-semibold text-[var(--lb-text)]">
                {profilesLoading
                  ? `Loading ${itemNoun}…`
                  : showingFiltered
                  ? `${profiles.length}${hasMore ? "+" : ""} ${itemNoun} found`
                  : `Latest ${itemNoun}`}
              </h2>
              {!profilesLoading && (
                <p className="mt-0.5 text-[12.5px] text-[var(--lb-subtle)]">
                  {showingFiltered ? "Matching your filters" : "Newest profiles first"}
                </p>
              )}
            </div>
            {activeCount > 0 && (
              <button
                onClick={resetFilters}
                className="lb-btn-glass inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-[13px] font-medium"
              >
                <X size={14} />
                Clear
              </button>
            )}
          </div>

          {profilesLoading ? (
            <ProfilesGridSkeleton />
          ) : profiles.length === 0 ? (
            <EmptyResults onReset={resetFilters} />
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
          {!profilesLoading && hasMore && profiles.length > 0 && (
            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  void loadMoreProfiles();
                }}
                disabled={loadingMore}
                className="lb-btn-glass h-11 rounded-xl px-6 text-sm font-semibold text-[var(--lb-accent-text)] disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : `Load More ${itemNoun}`}
              </button>
            </div>
          )}
          {!profilesLoading && hasMore && <div ref={loadMoreRef} className="h-1 w-full" aria-hidden />}
          {loadingMore && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex gap-3.5 rounded-[14px] bg-[var(--lb-surface)] border border-[var(--lb-line)] p-2 animate-pulse"
                >
                  <div className="aspect-[3/4] w-[38%] rounded-2xl bg-gray-200" />
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
      </section>

      {/* Filter panel */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
          onClick={() => setFilterOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md bg-[var(--lb-surface)] border-t border-[var(--lb-line)] sm:border-t-0 sm:border-l rounded-t-[18px] sm:rounded-t-none sm:rounded-l-[18px] shadow-[0_-20px_60px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh] sm:max-h-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
          >
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-[var(--lb-accent-text)]" />
                <h3 className="text-lg font-semibold">Filters</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[image:var(--lb-accent-grad)] text-[var(--lb-on-accent)]">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="lb-btn-glass flex h-11 w-11 items-center justify-center rounded-full"
                aria-label="Close filters"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              <SearchFilters
                filters={filters}
                onChange={setFilters}
                lockedProfileType={lockedProfileType}
              />
            </div>
            <div className="border-t border-[var(--lb-line)] px-5 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] flex items-center gap-3 bg-[var(--lb-surface)]">
              <button
                onClick={resetFilters}
                className="inline-flex items-center justify-center lb-btn-glass flex-1 h-[52px] rounded-xl text-sm font-semibold"
              >
                Reset
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="lb-btn-primary flex-[2] h-[52px] rounded-xl text-[15px] font-semibold"
              >
                Show {profiles.length} result{profiles.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* Keep footer for guests, but always show mobile bottom nav on listing routes. */}
      <BottomNav />
      {!isLoggedIn && <SiteFooter />}
    </div>
  );
}

function ProfilesGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
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
  );
}

function EmptyResults({ onReset }: { onReset: () => void }) {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-3">
        <Search size={28} className="text-[var(--primary)]" />
      </div>
      <h3 className="text-lg font-semibold text-gray-900">No matches found</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
        Try widening your filters or clearing the search to see all profiles.
      </p>
      <button
        onClick={onReset}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition"
      >
        <X size={16} />
        Clear all filters
      </button>
    </div>
  );
}
