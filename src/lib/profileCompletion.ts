/**
 * Single source of truth for "how complete is this profile?".
 *
 * Used by:
 *  - <ProfileRow> on the Account screen (small chip + slim bar)
 *  - The owner-side Partner Preferences nudge on the public profile page
 *  - "Verified Complete" badge (≥ 80%)
 *
 * Keep the field weighting flat (each check counts equally) so the score
 * is easy to reason about and stays consistent across screens. If we ever
 * want to weight items differently (e.g., photos worth 2 points, etc.) do
 * it here in one place.
 */

import type { Profile } from "@/types";
import { hasMeaningfulPreferences } from "@/lib/partnerPreferenceDefaults";

export const PROFILE_COMPLETE_THRESHOLD = 80;

export interface CompletionResult {
  /** Integer 0–100. */
  percent: number;
  /** Number of checks that passed. */
  filled: number;
  /** Total number of checks. */
  total: number;
  /** True when the profile crosses the "Verified Complete" badge threshold. */
  isComplete: boolean;
  /** Field keys that are still missing — useful for tooltip hints later. */
  missing: string[];
}

interface Check {
  key: string;
  passes: (p: Profile) => boolean;
}

const CHECKS: Check[] = [
  { key: "name",           passes: (p) => !!p.fullName?.trim() },
  { key: "dateOfBirth",    passes: (p) => !!p.dateOfBirth },
  { key: "gender",         passes: (p) => p.gender === "male" || p.gender === "female" },
  { key: "maritalStatus",  passes: (p) => !!p.maritalStatus?.trim() },
  { key: "caste",          passes: (p) => !!p.caste?.trim() },
  { key: "height",         passes: (p) => !!p.height?.trim() },
  { key: "motherTongue",   passes: (p) => !!p.motherTongue?.trim() },
  { key: "aboutMe",        passes: (p) => !!p.aboutMe && p.aboutMe.trim().length >= 30 },
  { key: "qualification",  passes: (p) => !!p.qualification?.trim() },
  { key: "profession",     passes: (p) => !!(p.profession || p.professionType)?.toString().trim() },
  { key: "annualIncome",   passes: (p) => !!p.annualIncome?.trim() },
  { key: "location",       passes: (p) => !!p.city?.trim() && !!p.state?.trim() },
  { key: "profilePhoto",   passes: (p) => !!p.profilePhoto?.trim() },
  { key: "morePhotos",     passes: (p) => Array.isArray(p.photos) && p.photos.length >= 2 },
  { key: "contacts",       passes: (p) => Array.isArray(p.contacts) && p.contacts.length > 0 },
  { key: "partnerPrefs",   passes: (p) => hasMeaningfulPreferences(p) },
];

export function computeProfileCompletion(p: Profile): CompletionResult {
  const passed: string[] = [];
  const missing: string[] = [];
  for (const c of CHECKS) {
    if (c.passes(p)) passed.push(c.key);
    else missing.push(c.key);
  }
  const total = CHECKS.length;
  const filled = passed.length;
  const percent = Math.round((filled / total) * 100);
  return {
    percent,
    filled,
    total,
    isComplete: percent >= PROFILE_COMPLETE_THRESHOLD,
    missing,
  };
}

/** Tone token map for the badge / progress bar based on percent. */
export function completionTone(percent: number): {
  badge: string;
  bar: string;
  label: "Low" | "Medium" | "Strong";
} {
  if (percent >= PROFILE_COMPLETE_THRESHOLD) {
    return {
      badge: "bg-emerald-50 text-emerald-700 border-emerald-200",
      bar: "bg-emerald-500",
      label: "Strong",
    };
  }
  if (percent >= 50) {
    return {
      badge: "bg-amber-50 text-amber-700 border-amber-200",
      bar: "bg-amber-500",
      label: "Medium",
    };
  }
  return {
    badge: "bg-red-50 text-red-700 border-red-200",
    bar: "bg-red-400",
    label: "Low",
  };
}
