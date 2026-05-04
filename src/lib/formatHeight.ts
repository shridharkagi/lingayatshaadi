/**
 * Height is stored in various forms (e.g. 5'2", 5'2""). Avoid duplicated inch marks in UI.
 */
export function formatHeightForDisplay(height: string | undefined | null): string {
  if (height == null || String(height).trim() === "") return "—";
  let h = String(height).trim();
  h = h.replace(/\s*["″"]+\s*$/g, "").trim();
  if (!h) return "—";
  return `${h}"`;
}
