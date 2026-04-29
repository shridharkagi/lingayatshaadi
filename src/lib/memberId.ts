import { Profile } from "@/types";

/**
 * Public ID format (current):
 *   L + [B|G] + YY + MM + NNNNN
 *
 *   - "L"     = Static prefix (LingayatBandhu)
 *   - "B"|"G" = Profile gender flag: B = Bride (female), G = Groom (male)
 *   - "YY"    = 2-digit year of registration  (e.g. "26" for 2026)
 *   - "MM"    = 2-digit month of registration (e.g. "04" for April)
 *   - "NNNNN" = 5-digit zero-padded GLOBAL incremental sequence shared across
 *               BOTH genders and ALL months. Never resets — the next profile
 *               (regardless of gender or registration month) gets the next
 *               number after the highest seen so far.
 *
 * Examples (in registration order):
 *   LB26040 0001  -> 1st profile ever, Bride, registered Apr 2026
 *   LG26040 0002  -> 2nd profile ever, Groom, also Apr 2026
 *   LB26050 0003  -> 3rd profile ever, Bride, registered May 2026
 *
 * Note: 5 digits caps the global counter at 99,999 profiles. If/when you
 * approach that, bump to 6 digits — this is a one-line change here plus a
 * one-time SQL re-pad.
 *
 * Legacy format (still supported for parsing existing rows):
 *   LS + YY + MM + NNNN   (e.g. LS26010003)
 */

const NEW_PUBLIC_ID_RE = /^L[BG]\d{9}$/;
const LEGACY_PUBLIC_ID_RE = /^LS\d{8}$/;

export function genderFlag(gender: Profile["gender"] | string | undefined): "B" | "G" {
  return gender === "female" ? "B" : "G";
}

/**
 * Generate the next public ID for a new profile.
 *
 * The counter is GLOBAL — the next number is `max(seq across all existing
 * public_ids) + 1`, regardless of the new profile's gender or the registration
 * month of the existing rows. Only the YY/MM and B/G prefix are picked from
 * "now" / the new profile's gender.
 *
 * For server-side generation against the live DB, prefer
 * `generatePublicIdFromExistingIds()` below which works on a flat list of
 * public_id strings fetched from Supabase.
 */
export function generatePublicId(
  existingProfiles: Profile[],
  gender: Profile["gender"] | string = "male"
): string {
  const ids = existingProfiles
    .map((p) => (p.publicId || p.memberId || "").toUpperCase().replace(/-/g, ""))
    .filter(Boolean);
  return generatePublicIdFromExistingIds(ids, gender);
}

/**
 * Pure helper: given a flat list of existing public_id strings (any format)
 * and the gender of the NEW profile, return the next public_id.
 *
 * The counter is global — it ignores YY/MM partitioning and gender, just takes
 * the highest numeric suffix seen anywhere and adds 1. This means re-numbering
 * happens automatically: new profiles always continue from the largest known
 * sequence.
 */
export function generatePublicIdFromExistingIds(
  existingIds: string[],
  gender: Profile["gender"] | string = "male"
): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const flag = genderFlag(gender);

  let maxSeq = 0;
  for (const raw of existingIds) {
    const seq = extractGlobalSequence((raw || "").toUpperCase().replace(/-/g, ""));
    if (seq > maxSeq) maxSeq = seq;
  }

  const next = String(maxSeq + 1).padStart(5, "0");
  return `L${flag}${yy}${mm}${next}`;
}

/**
 * Extract the numeric sequence portion from a public_id of either format.
 * Returns 0 if the id is not in a recognised format.
 *
 *   - New:    L[BG]YYMM NNNNN  -> last 5 digits
 *   - Legacy: LS YYMM NNNN     -> last 4 digits
 */
function extractGlobalSequence(id: string): number {
  if (NEW_PUBLIC_ID_RE.test(id)) {
    const n = parseInt(id.slice(6), 10);
    return Number.isNaN(n) ? 0 : n;
  }
  if (LEGACY_PUBLIC_ID_RE.test(id)) {
    const n = parseInt(id.slice(6), 10);
    return Number.isNaN(n) ? 0 : n;
  }
  return 0;
}

/** Slugify first name only for URL: lowercase, alphanumeric. */
function slugifyFirstName(name: string): string {
  const firstName = (name || "profile").trim().split(/\s+/)[0] || "profile";
  return (
    firstName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "profile"
  );
}

/**
 * Build the public profile URL slug, e.g. /profile/lb260400004-ananya
 * (lowercased public_id + "-" + slugified first name).
 */
export function getProfileSlug(profile: Profile): string {
  const publicId = (profile.publicId || profile.memberId || profile.id).toLowerCase();
  const nameSlug = slugifyFirstName(profile.fullName || "profile");
  return `${publicId}-${nameSlug}`;
}

/**
 * Build a short public path segment for sharing.
 * Uses the same canonical segment as profile URLs: "lb260400004-ananya".
 */
export function getShortProfileSlug(profile: Profile): string {
  return getProfileSlug(profile);
}

/**
 * Same URL segment as {@link getProfileSlug} for surfaces that only have DB fields.
 * Uses `publicId` + first-name slug when `publicId` parses as a member id; otherwise raw `profileId` (UUID).
 */
export function profilePathSegmentFromPublicInfo(params: {
  profileId: string;
  publicId: string | null;
  fullName: string;
}): string {
  const raw = (params.publicId || "").trim();
  const canonical = raw ? parseProfileSlug(raw) : null;
  if (canonical) {
    const base = raw.toLowerCase();
    const nameSlug = slugifyFirstName(params.fullName || "profile");
    return `${base}-${nameSlug}`;
  }
  return params.profileId;
}

/** Get the display Member ID (publicId preferred over memberId). */
export function getMemberIdDisplay(profile: Profile | Partial<Profile>): string {
  return profile.publicId || profile.memberId || profile.id || "—";
}

/**
 * Extract the canonical UPPERCASE publicId from a URL slug.
 *
 * Accepts both formats:
 *   "lb260400004-ananya" -> "LB260400004"  (new)
 *   "ls26010004-ananya"  -> "LS26010004"   (legacy)
 *
 * Returns null if the first segment is not a valid public id in either format.
 */
export function parseProfileSlug(slug: string): string | null {
  if (!slug || typeof slug !== "string") return null;
  const firstPart = slug.trim().split("-")[0];
  if (!firstPart) return null;
  const upper = firstPart.toUpperCase();
  if (NEW_PUBLIC_ID_RE.test(upper)) return upper;
  if (LEGACY_PUBLIC_ID_RE.test(upper)) return upper;
  return null;
}

/**
 * Extract canonical publicId from short slug forms:
 *   "lb260400004-ananya" -> "LB260400004"
 *   "ananya-lb260400004" -> "LB260400004" (legacy support)
 *   "lb260400004"        -> "LB260400004"
 */
export function parseShortProfileSlug(slug: string): string | null {
  if (!slug || typeof slug !== "string") return null;
  const cleaned = slug.trim().toLowerCase();
  if (!cleaned) return null;

  // Preferred "<id>-<name>" is handled directly.
  const direct = parseProfileSlug(cleaned);
  if (direct) return direct;

  // Legacy "<name>-<id>" and "<id>".
  const parts = cleaned.split("-").filter(Boolean);
  const candidate = parts.length > 1 ? parts[parts.length - 1] : cleaned;
  return parseProfileSlug(candidate);
}

/** True if `publicId` or `memberId` matches the canonical id from {@link parseProfileSlug} (ignores hyphens / case). */
export function profileMatchesCanonicalPublicId(
  profile: Pick<Profile, "publicId" | "memberId">,
  canonicalPublicId: string | null
): boolean {
  if (!canonicalPublicId) return false;
  const needle = canonicalPublicId.replace(/-/g, "").toUpperCase();
  const a = (profile.publicId || "").toUpperCase().replace(/-/g, "");
  const b = (profile.memberId || "").toUpperCase().replace(/-/g, "");
  return a === needle || b === needle;
}

/** Public regex predicates, exposed for tests / mappers. */
export function isNewPublicId(id: string | undefined | null): boolean {
  return !!id && NEW_PUBLIC_ID_RE.test(id.toUpperCase());
}

export function isLegacyPublicId(id: string | undefined | null): boolean {
  return !!id && LEGACY_PUBLIC_ID_RE.test(id.toUpperCase());
}
