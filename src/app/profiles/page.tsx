"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Heart, SlidersHorizontal, X, Search } from "lucide-react";
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

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1600&q=70";
const AGE_MIN = 18;
const AGE_MAX = 60;

function countActiveFilters(f: SearchFiltersState): number {
  let n = 0;
  if (f.profileType) n++;
  if (f.ageRange[0] !== AGE_MIN || f.ageRange[1] !== AGE_MAX) n++;
  n += f.maritalStatuses.length;
  n += f.professionTypes.length;
  n += f.foodHabits.length;
  return n;
}

export default function ProfilesPage() {
  const { profiles, profilesLoading } = useProfiles();
  const { isLoggedIn } = useAuth();
  const [filters, setFilters] = useState<SearchFiltersState>(defaultFilters);
  const [query, setQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);

  const filteredProfiles = useFilteredProfiles(profiles, filters, query);
  const activeCount = useMemo(() => countActiveFilters(filters), [filters]);

  useEffect(() => {
    if (filterOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [filterOpen]);

  const totalCount = profiles.length;
  const showingFiltered = activeCount > 0 || query.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <ProfilesPageHeader />

      {/* Compact hero */}
      <section className="relative h-[280px] sm:h-[320px] md:h-[360px] overflow-hidden pt-14 sm:pt-16">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Lingayat couples — building lasting connections"
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
            Find Your Lingayat Life Partner
          </h1>
          <p className="text-sm sm:text-base text-white/90 max-w-2xl">
            Verified profiles • Community-first matchmaking • Built for Lingayat families
          </p>
        </div>
      </section>

      {/* Sticky search + filter bar */}
      <div className="sticky top-14 sm:top-16 z-30 -mt-7 sm:-mt-9 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg border border-[var(--color-border)] p-3 sm:p-4 flex items-center gap-2 sm:gap-3">
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
          {/* Active chips + result count */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <h2 className="text-lg sm:text-xl font-bold text-[var(--color-text-primary)] mr-1">
              {profilesLoading
                ? "Loading profiles…"
                : showingFiltered
                ? `${filteredProfiles.length} of ${totalCount} profiles`
                : `${totalCount} profiles`}
            </h2>
            {activeCount > 0 && (
              <button
                onClick={() => setFilters(defaultFilters)}
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
            <EmptyResults onReset={() => setFilters(defaultFilters)} />
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

      {/* Filter panel: bottom sheet on mobile, side drawer on desktop */}
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
            {/* Handle (mobile only) */}
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
              <SearchFilters filters={filters} onChange={setFilters} />
            </div>
            <div className="border-t border-[var(--color-border)] px-5 py-3 flex items-center gap-3 bg-white">
              <button
                onClick={() => setFilters(defaultFilters)}
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

      {/* Bottom nav (logged in) or footer */}
      {isLoggedIn ? (
        <BottomNav />
      ) : (
        <footer className="bg-[var(--color-secondary-dark)] text-white py-10 sm:py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
              <Link href="/" className="flex items-center gap-2">
                <Heart className="w-6 h-6 text-[var(--primary)] fill-[var(--primary)]" />
                <span className="font-bold text-lg">LingayatShaadi</span>
              </Link>
              <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
                <Link href="/contact" className="hover:text-[var(--primary)] transition">
                  Contact Us
                </Link>
                <Link href="/privacy" className="hover:text-[var(--primary)] transition">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-[var(--primary)] transition">
                  Terms of Use
                </Link>
              </div>
            </div>
            <p className="text-center text-sm text-white/70">
              © {new Date().getFullYear()} LingayatShaadi. All rights reserved.
            </p>
          </div>
        </footer>
      )}
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
