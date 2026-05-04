/** Minimum age for matrimony profile signup / account DOB (years). */
export const MIN_MATRIMONY_AGE_YEARS = 18;

function validateIsoYyyyMmDd(value: string): string {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const yyyy = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  const currentYear = new Date().getFullYear();
  if (yyyy < 1900 || yyyy > currentYear || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return "";
  return value;
}

/** Accepts dd/mm/yyyy or ISO yyyy-mm-dd (API/DB) and returns normalized yyyy-mm-dd. */
export function parseDobDdMmYyyyToIso(raw: string): string {
  const value = String(raw || "").trim();
  const asIso = validateIsoYyyyMmDd(value);
  if (asIso) return asIso;
  const m = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return "";
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  const currentYear = new Date().getFullYear();
  if (yyyy < 1900 || yyyy > currentYear || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
  if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mm - 1 || dt.getUTCDate() !== dd) return "";
  return `${yyyy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
}

export function formatIsoToDobDdMmYyyy(iso: string): string {
  const value = String(iso || "").trim();
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/** Accepts ISO yyyy-mm-dd or dd/mm/yyyy → digit parts (empty strings if unset). */
export function parseDobValueToParts(raw: string): { dd: string; mm: string; yyyy: string } {
  const value = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split("-");
    return { dd: d || "", mm: m || "", yyyy: y || "" };
  }
  const m2 = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m2) {
    return {
      dd: m2[1].padStart(2, "0"),
      mm: m2[2].padStart(2, "0"),
      yyyy: m2[3],
    };
  }
  return { dd: "", mm: "", yyyy: "" };
}

export type DobValidationResult = { ok: true; iso: string } | { ok: false; error: string };

/** Full DOB rules: real calendar date, not future, minimum age. */
export function validateMatrimonyDob(isoOrDdMmYyyy: string): DobValidationResult {
  const iso = parseDobDdMmYyyyToIso(isoOrDdMmYyyy);
  if (!iso) return { ok: false, error: "Enter a valid date." };

  const [y, mo, d] = iso.split("-").map(Number);
  const dob = new Date(y, mo - 1, d);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dob.setHours(0, 0, 0, 0);
  if (dob > today) return { ok: false, error: "Date of birth cannot be in the future." };

  let age = today.getFullYear() - dob.getFullYear();
  const mDiff = today.getMonth() - dob.getMonth();
  if (mDiff < 0 || (mDiff === 0 && today.getDate() < dob.getDate())) age--;
  if (age < MIN_MATRIMONY_AGE_YEARS) {
    return {
      ok: false,
      error: `You must be at least ${MIN_MATRIMONY_AGE_YEARS} years old.`,
    };
  }
  if (age > 120) return { ok: false, error: "Please enter a realistic year of birth." };

  return { ok: true, iso };
}
