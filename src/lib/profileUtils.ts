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
