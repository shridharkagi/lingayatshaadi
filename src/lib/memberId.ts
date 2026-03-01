import { Profile } from "@/types";

/**
 * Public ID format: LS + YY + MM + 0001 (incremental per month)
 * Examples: LS26010001, LS26010002, LS26020003, LS27010004
 * - LS = Static prefix
 * - 26 = Year (2 digits)
 * - 01 = Month (2 digits)
 * - 0001 = Incremental sequence (4 digits, resets each month)
 */
export function generatePublicId(existingProfiles: Profile[]): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const prefix = `LS${yy}${mm}`;

  const sameMonthProfiles = existingProfiles.filter((p) => {
    const pubId = (p.publicId || p.memberId || "").toUpperCase().replace(/-/g, "");
    return pubId.startsWith(prefix) && pubId.length === 10;
  });

  let maxSeq = 0;
  for (const p of sameMonthProfiles) {
    const pubId = (p.publicId || p.memberId || "").toUpperCase().replace(/-/g, "");
    if (pubId.length === 10) {
      const seq = parseInt(pubId.slice(-4), 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }

  const nextSeq = String(maxSeq + 1).padStart(4, "0");
  return `LS${yy}${mm}${nextSeq}`;
}

/**
 * Slugify first name only for URL: lowercase, alphanumeric
 */
function slugifyFirstName(name: string): string {
  const firstName = (name || "profile").trim().split(/\s+/)[0] || "profile";
  return firstName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "profile";
}

/**
 * Get profile URL slug: /profile/ls26010001-rohan (first name only)
 */
export function getProfileSlug(profile: Profile): string {
  const publicId = (profile.publicId || profile.memberId || profile.id).toLowerCase();
  const nameSlug = slugifyFirstName(profile.fullName || "profile");
  return `${publicId}-${nameSlug}`;
}

/** Get the display Member ID (publicId preferred over memberId) */
export function getMemberIdDisplay(profile: Profile | Partial<Profile>): string {
  return profile.publicId || profile.memberId || profile.id || "—";
}

/**
 * Extract publicId from a profile slug (e.g. "ls26010001-proya" -> "LS26010001")
 */
export function parseProfileSlug(slug: string): string | null {
  if (!slug || typeof slug !== "string") return null;
  const trimmed = slug.trim();
  const firstPart = trimmed.split("-")[0];
  if (!firstPart) return null;
  const upper = firstPart.toUpperCase();
  if (/^LS\d{8}$/.test(upper)) return upper;
  return null;
}
