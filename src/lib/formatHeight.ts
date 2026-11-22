/**
 * Height is stored in several shapes: `5'2"`, `5'2""`, `5.4`, `5.10`, `5 ft 4 in`, `160 cm`.
 * Render feet/inches consistently as 5′4″ and never duplicate inch marks.
 */
export function formatHeightShort(height: string | undefined | null): string | null {
  if (height == null) return null;
  const raw = String(height).trim();
  if (!raw) return null;

  if (/cm\s*$/i.test(raw)) return raw.replace(/\s*cm\s*$/i, " cm");

  const ftIn = raw.match(/^(\d)\s*(?:'|′|ft|feet|\.|-|\s)\s*(\d{1,2})?/i);
  if (ftIn) {
    const feet = Number(ftIn[1]);
    const inches = ftIn[2] != null ? Number(ftIn[2]) : 0;
    if (feet >= 3 && feet <= 8 && inches >= 0 && inches < 12) return `${feet}′${inches}″`;
  }

  const cleaned = raw.replace(/\s*["″']+\s*$/g, "").trim();
  return cleaned || null;
}

export function formatHeightForDisplay(height: string | undefined | null): string {
  return formatHeightShort(height) ?? "—";
}
