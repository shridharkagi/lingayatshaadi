import { useMemo } from "react";
import { Profile } from "@/types";
import { getAge } from "@/lib/utils";
import { profileMatchesProfessionFilter } from "@/lib/professionFilter";
import type { SearchFiltersState } from "@/components/SearchFilters";

export function useFilteredProfiles(
  profiles: Profile[],
  filters: SearchFiltersState,
  query?: string,
  /**
   * Hard-coded gender filter that is applied in addition to (and cannot be
   * overridden by) the user's own filter selections. Used by the dedicated
   * /brides and /grooms routes.
   */
  forceGender?: "male" | "female"
): Profile[] {
  return useMemo(() => {
    return profiles.filter((profile) => {
      const gender = profile.gender?.toLowerCase();
      if (forceGender && gender !== forceGender) return false;
      if (filters.profileType) {
        if (filters.profileType === "bride" && gender !== "female") return false;
        if (filters.profileType === "groom" && gender !== "male") return false;
      }

      const age = getAge(profile.dateOfBirth);
      if (age < filters.ageRange[0] || age > filters.ageRange[1]) return false;

      if (
        filters.maritalStatuses.length > 0 &&
        !filters.maritalStatuses.includes(profile.maritalStatus || "")
      ) {
        return false;
      }

      if (!profileMatchesProfessionFilter(profile, filters.professionTypes))
        return false;

      if (query?.trim()) {
        const q = query.toLowerCase().trim();
        const searchable =
          `${profile.fullName} ${profile.profession} ${profile.professionType} ${profile.city} ${profile.state}`.toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      return true;
    });
  }, [profiles, filters, query, forceGender]);
}
