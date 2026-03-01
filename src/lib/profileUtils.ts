/**
 * Mask sensitive data for non-logged-in users
 * Shows first char(s) + asterisks for rest
 */
export function maskString(value: string | undefined, visibleChars = 1): string {
  if (!value || value.length <= visibleChars) return value || "—";
  return value.slice(0, visibleChars) + "*".repeat(Math.min(value.length - visibleChars, 6));
}

/**
 * Truncate text to max words (for About Me 100 word limit)
 */
export function truncateToWords(text: string | undefined, maxWords = 100): string {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(" ");
}

export function wordCount(text: string | undefined): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/**
 * Get current photo count for a profile (profilePhoto + photos, deduplicated)
 */
export function getCurrentPhotoCount(profile: { profilePhoto?: string; photos?: string[] }): number {
  const profilePhoto = profile.profilePhoto?.trim();
  const photos = (profile.photos || []).filter((p) => p?.trim());
  const unique = new Set([...(profilePhoto ? [profilePhoto] : []), ...photos]);
  return unique.size;
}

/**
 * Format date to dd/mm/yyyy
 */
export function formatDateDDMMYYYY(dateStr: string | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "—";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}
