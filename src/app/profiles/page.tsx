"use client";

import { useState } from "react";
import Image from "next/image";
import { ProfilesPageHeader } from "@/components/ProfilesPageHeader";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { SearchFilters, defaultFilters, type SearchFiltersState } from "@/components/SearchFilters";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useFilteredProfiles } from "@/hooks/useFilteredProfiles";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1920&q=80";

export default function ProfilesPage() {
  const { profiles } = useProfiles();
  const [filters, setFilters] = useState<SearchFiltersState>(defaultFilters);
  const filteredProfiles = useFilteredProfiles(profiles, filters);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-bg-warm)" }}>
      <ProfilesPageHeader />

      {/* Hero with filters */}
      <section className="relative min-h-[75vh] sm:min-h-[80vh] lg:min-h-[85vh] flex flex-col items-center justify-center overflow-hidden pt-16 pb-20">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Misty mountain range with pine trees, symbolizing peace and lasting connections"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4">
          <div className="text-center text-white mb-8">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 drop-shadow-lg">
              Where Lingayat Values Meet Lasting Love
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-6">
              Connect with compatible life partners rooted in shared faith, tradition, and community
            </p>
          </div>

          {/* Filter panel */}
          <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl p-4 sm:p-6">
            <SearchFilters
              filters={filters}
              onChange={setFilters}
              showCta
            />
          </div>
        </div>

        <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs sm:text-sm px-4">
          Built for Lingayat families • Verified profiles • Community-first matchmaking
        </div>
      </section>

      {/* Profile listing */}
      <section className="py-12 md:py-16 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-6 sm:mb-8">
            Similar Profiles
          </h2>
          <p className="text-[var(--color-text-muted)] mb-8 max-w-2xl">
            Browse verified Lingayat profiles. Use the filters above to narrow your search.
          </p>

          {filteredProfiles.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)]">
              <p className="text-lg">No profiles match your filters.</p>
              <p className="text-sm mt-2">Try adjusting your search criteria.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {filteredProfiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  displayName={maskName(profile.fullName)}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/** Mask name for unauthenticated users - show first 2 chars + asterisks */
function maskName(name: string): string {
  if (!name || name.length <= 2) return name || "";
  const parts = name.trim().split(/\s+/);
  return parts
    .map((p) => p.slice(0, 2) + "*".repeat(Math.max(0, p.length - 2)))
    .join(" ");
}
