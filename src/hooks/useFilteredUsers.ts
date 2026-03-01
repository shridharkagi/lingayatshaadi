import { useMemo } from "react";
import { Profile } from "@/types";
import { getAge } from "@/lib/utils";
import { getMemberIdDisplay } from "@/lib/memberId";
import type { UsersFiltersState } from "@/components/superadmin/UsersFilters";

/** Effective profile status: profileStatus when set, else derived from verified */
function getEffectiveStatus(p: Profile): "verified" | "pending" | "rejected" | "suspended" {
  if (p.profileStatus) return p.profileStatus;
  return p.verified ? "verified" : "pending";
}

/** Effective profile type: profileType when set, else "free" */
function getEffectiveProfileType(p: Profile): "free" | "premium" {
  return p.profileType || "free";
}

function isDateInRange(dateStr: string, from: Date, to: Date): boolean {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d >= from && d <= to;
}

export function useFilteredUsers(profiles: Profile[], filters: UsersFiltersState): Profile[] {
  return useMemo(() => {
    return profiles.filter((p) => {
      // Search (Name / Member ID / Mobile / Email)
      if (filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const memberId = (getMemberIdDisplay(p) || "").toLowerCase();
        const searchable = [
          p.fullName,
          p.email,
          p.contact,
          memberId,
          p.publicId,
          p.memberId,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!searchable.includes(q)) return false;
      }

      // Gender
      if (filters.gender && p.gender !== filters.gender) return false;

      // Age range
      const age = getAge(p.dateOfBirth);
      if (age < filters.ageMin || age > filters.ageMax) return false;

      // Location
      if (filters.state && (p.state || "").toLowerCase() !== filters.state.toLowerCase())
        return false;
      if (filters.city && (p.city || "").toLowerCase() !== filters.city.toLowerCase())
        return false;

      // Profile Status
      const status = getEffectiveStatus(p);
      if (
        filters.profileStatuses.length > 0 &&
        !filters.profileStatuses.includes(status)
      )
        return false;

      // Profile Type
      const pType = getEffectiveProfileType(p);
      if (
        filters.profileTypes.length > 0 &&
        !filters.profileTypes.includes(pType)
      )
        return false;

      // Profile Created
      if (filters.profileCreated && p.createdAt) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const created = new Date(p.createdAt);
        created.setHours(0, 0, 0, 0);

        if (filters.profileCreated === "today") {
          const start = new Date(today);
          start.setHours(0, 0, 0, 0);
          if (created < start) return false;
        } else if (filters.profileCreated === "week") {
          const start = new Date(today);
          start.setDate(start.getDate() - 7);
          start.setHours(0, 0, 0, 0);
          if (created < start) return false;
        } else if (filters.profileCreated === "month") {
          const start = new Date(today);
          start.setMonth(start.getMonth() - 1);
          start.setHours(0, 0, 0, 0);
          if (created < start) return false;
        } else if (filters.profileCreated === "custom" && filters.dateFrom && filters.dateTo) {
          const from = new Date(filters.dateFrom);
          from.setHours(0, 0, 0, 0);
          const to = new Date(filters.dateTo);
          to.setHours(23, 59, 59, 999);
          if (!isDateInRange(p.createdAt, from, to)) return false;
        }
      }

      return true;
    });
  }, [profiles, filters]);
}
