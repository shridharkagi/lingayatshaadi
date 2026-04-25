"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { SlidersHorizontal, X, Search } from "lucide-react";
import { ProfilesPageHeader } from "@/components/ProfilesPageHeader";
import { ProfileCard } from "@/components/ui/ProfileCard";
import {
  SearchFilters,
  defaultFilters,
  type SearchFiltersState,
} from "@/components/SearchFilters";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useFilteredProfiles } from "@/hooks/useFilteredProfiles";
import { useAuth } from "@/contexts/AuthContext";
import { BottomNav } from "@/components/ui/BottomNav";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { ViewerForensicWatermark } from "@/components/ViewerForensicWatermark";
import { SiteFooter } from "@/components/SiteFooter";

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
  const { profiles, profilesLoading } = useProfiles();
  const { isLoggedIn } = useAuth();
  const { openAuthModal } = useAuthModal();

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
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredProfiles = useFilteredProfiles(profiles, filters, query, lockedGender);
  const activeCount = useMemo(
    () => countActiveFilters(filters, lockedGender),
    [filters, lockedGender]
  );

  useEffect(() => {
    if (filterOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [filterOpen]);

  // Total count reflects only the route's eligible profiles (e.g. only
  // brides on /brides), not the global profile count.
  const totalCount = useMemo(
    () =>
      lockedGender
        ? profiles.filter((p) => p.gender?.toLowerCase() === lockedGender).length
        : profiles.length,
    [profiles, lockedGender]
  );
  const showingFiltered = activeCount > 0 || query.trim().length > 0;

  const resetFilters = () =>
    setFilters({ ...defaultFilters, profileType: lockedProfileType ?? "" });

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <ProfilesPageHeader />

      {/* Compact hero */}
      <section className="relative h-[280px] sm:h-[320px] md:h-[360px] overflow-hidden pt-14 sm:pt-16">
        <div className="absolute inset-0">
          <Image
            src={heroImage}
            alt={title}
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-[var(--color-bg)]" />
        </div>
        <div className="relative z-10 h-full max-w-6xl mx-auto px-4 flex flex-col justify-center text-white">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2 drop-shadow">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-white/90 max-w-2xl">{subtitle}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {isLoggedIn ? (
              <Link
                href="/account"
                className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs sm:text-sm font-medium transition"
              >
                My Account
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("signup")}
                className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs sm:text-sm font-medium transition"
              >
                Create Profile
              </button>
            )}
            {isLoggedIn ? (
              <Link
                href="/search"
                className="px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 text-xs sm:text-sm font-medium transition"
              >
                Advanced Search
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="px-3 py-1.5 rounded-full bg-black/20 hover:bg-black/30 text-xs sm:text-sm font-medium transition"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Sticky search + filter bar */}
      <div className="sticky top-14 sm:top-16 z-30 -mt-7 sm:-mt-9 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/95 backdrop-blur rounded-2xl shadow-lg border border-[var(--color-border)] p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name, city, profession…"
                className="w-full pl-10 pr-3 py-2.5 sm:py-3 rounded-xl bg-[var(--color-bg)] focus:bg-white border border-transparent focus:border-[var(--primary)] focus:outline-none text-sm transition"
              />
            </div>
            <button
              type="button"
              onClick={() => setFilterOpen(true)}
              className="relative flex items-center gap-2 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-[var(--color-border)] bg-white hover:bg-gray-50 text-sm font-medium text-gray-700 transition"
            >
              <SlidersHorizontal size={18} />
              <span className="hidden sm:inline">Filters</span>
              {activeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-[var(--primary)] text-white">
                  {activeCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Listing */}
      <section className="px-4 pt-6 pb-24 lg:pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mr-1">
              {profilesLoading
                ? `Loading ${itemNoun}…`
                : showingFiltered
                ? `${filteredProfiles.length} of ${totalCount} ${itemNoun}`
                : `${totalCount} ${itemNoun}`}
            </h2>
            {!profilesLoading && (
              <span className="text-xs px-2 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] font-medium">
                {showingFiltered ? "Filtered results" : "Latest available"}
              </span>
            )}
            {activeCount > 0 && (
              <button
                onClick={resetFilters}
                className="ml-auto inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[var(--primary)] hover:bg-[var(--primary)]/5 rounded-lg transition"
              >
                <X size={14} />
                Clear filters
              </button>
            )}
          </div>

          {profilesLoading ? (
            <ProfilesGridSkeleton />
          ) : filteredProfiles.length === 0 ? (
            <EmptyResults onReset={resetFilters} />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  displayName={isLoggedIn ? profile.fullName : maskName(profile.fullName)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Filter panel */}
      {filterOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
          onClick={() => setFilterOpen(false)}
          aria-modal="true"
          role="dialog"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-t-none sm:rounded-l-3xl shadow-2xl flex flex-col max-h-[90vh] sm:max-h-none animate-in slide-in-from-bottom sm:slide-in-from-right duration-200"
          >
            <div className="sm:hidden pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1.5 rounded-full bg-gray-300" />
            </div>
            <div className="flex items-center justify-between px-5 pt-3 pb-4 border-b border-[var(--color-border)]">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={20} className="text-[var(--primary)]" />
                <h3 className="text-lg font-semibold">Filters</h3>
                {activeCount > 0 && (
                  <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-[var(--primary)] text-white">
                    {activeCount}
                  </span>
                )}
              </div>
              <button
                onClick={() => setFilterOpen(false)}
                className="p-2 rounded-lg hover:bg-gray-100 transition"
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
            <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center gap-3 bg-white">
              <button
                onClick={resetFilters}
                className="flex-1 py-3 rounded-xl border border-[var(--color-border)] text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Reset
              </button>
              <button
                onClick={() => setFilterOpen(false)}
                className="flex-1 py-3 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] transition"
              >
                Show {filteredProfiles.length} result{filteredProfiles.length === 1 ? "" : "s"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoggedIn && <ViewerForensicWatermark />}

      {/* Bottom nav (logged in) or footer */}
      {isLoggedIn ? <BottomNav /> : <SiteFooter />}
    </div>
  );
}

function maskName(name: string): string {
  if (!name || name.length <= 2) return name || "";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => p.slice(0, 2) + "*".repeat(Math.max(0, p.length - 2)))
    .join(" ");
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
