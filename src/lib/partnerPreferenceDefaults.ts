/**
 * Smart defaults for the Partner Preferences form.
 *
 * When a user opens the preferences screen for the very first time we
 * pre-fill a sensible starting point derived from their *own* profile so
 * they aren't staring at an empty form. The rules are intentionally
 * conservative — they cover only universally-uncontroversial axes
 * (age range, height range, marital status, location, food habits, education
 * floor) and explicitly leave caste / sub-caste unset so the form renders as
 * "Any caste" by default. This avoids a category of complaints around
 * "auto-restricting" matches.
 *
 * The matching/search algorithm is independent of these defaults — they
 * exist solely to seed the form UI.
 */

import type { PartnerPreference, Profile } from "@/types";

/* ----------------------------- shared parsers ----------------------------- */

const AGE_MIN = 18;
const AGE_MAX = 60;
const HEIGHT_INCH_MIN = 48; // 4'0"
const HEIGHT_INCH_MAX = 84; // 7'0"

export function calculateAge(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

/** "5'8\"" / "5.8" / "68" → 68 inches. */
export function parseHeightToInches(raw: string | undefined | null): number | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const m1 = s.match(/^(\d+)\s*[.'’ft]+\s*(\d+)?/i);
  if (m1) {
    const ft = Number(m1[1] || 0);
    const inch = Number(m1[2] || 0);
    return ft * 12 + inch;
  }
  const n = Number(s);
  if (!Number.isNaN(n)) {
    if (n < 12) return Math.round(n * 12);
    return Math.round(n);
  }
  return null;
}

export function inchesToFeetInches(total: number): string {
  const clamped = Math.max(HEIGHT_INCH_MIN, Math.min(HEIGHT_INCH_MAX, Math.round(total)));
  const ft = Math.floor(clamped / 12);
  const inch = clamped % 12;
  return `${ft}'${inch}"`;
}

/* --------------------------- education ladder --------------------------- */

/**
 * Maps the user's own qualification to the lowest education chip value we
 * should suggest as a partner preference floor. The form's education chips
 * are: Graduate / Post Graduate / Doctorate / Any.
 *
 * Heuristic: bride-or-groom usually wants someone "at-or-above" their own
 * level, so we map up the ladder. Returns undefined if we can't tell — the
 * form will render the chips unselected, which the user reads as "Any".
 */
export function deriveEducationFloor(qualification?: string): string | undefined {
  if (!qualification) return undefined;
  const q = qualification.toLowerCase();
  if (/(phd|ph\.d|doctor|md\b|dm\b)/.test(q)) return "Doctorate";
  if (/(mba|m\.tech|mtech|m\.sc|msc|m\.com|mcom|m\.a|ma\b|post.?grad|pg\b|master)/.test(q)) {
    return "Post Graduate";
  }
  if (/(b\.tech|btech|b\.sc|bsc|b\.com|bcom|b\.a|ba\b|b\.e|be\b|grad|degree|bachelor)/.test(q)) {
    return "Graduate";
  }
  return undefined;
}

/* ----------------------------- main entry ----------------------------- */

/**
 * Build a suggested PartnerPreference object from the viewer's own profile.
 *
 * Rules:
 *  - Age range: bride profiles → [self − 1, self + 5];
 *               groom profiles → [self − 5, self + 1].
 *  - Height range: bride profiles → [self + 4", self + 12"];
 *                  groom profiles → [self − 12", self − 2"].
 *  - Marital status: "Never Married" (most common starting point).
 *  - Caste / sub-caste: deliberately unset (renders as "Any caste").
 *  - Education: derived floor (see deriveEducationFloor).
 *  - State: pre-filled from self.state (city left empty for flexibility).
 *  - Food habits: mirror self.foodHabits when set.
 */
export function suggestPartnerPreference(p: Profile): PartnerPreference {
  const age = calculateAge(p.dateOfBirth);
  const heightIn = parseHeightToInches(p.height);
  const isFemale = p.gender === "female";

  const result: PartnerPreference = {
    maritalStatus: "Never Married",
    // caste / subCaste intentionally undefined → "Any caste" in the UI.
  };

  if (age != null) {
    result.ageMin = Math.max(AGE_MIN, age + (isFemale ? -1 : -5));
    result.ageMax = Math.min(AGE_MAX, age + (isFemale ? 5 : 1));
  }

  if (heightIn != null) {
    const lo = heightIn + (isFemale ? 4 : -12);
    const hi = heightIn + (isFemale ? 12 : -2);
    result.heightMin = inchesToFeetInches(lo);
    result.heightMax = inchesToFeetInches(hi);
  }

  const eduFloor = deriveEducationFloor(p.qualification);
  if (eduFloor) result.education = eduFloor;

  if (p.state) result.state = p.state;
  if (p.foodHabits) result.foodHabits = p.foodHabits;

  return result;
}

/**
 * Has the user actually saved their partner preferences (vs. just having
 * the auto-defaulted JSONB shape from the seed migration)?
 *
 * We use two signals — `preferencesUpdatedAt` is the source of truth (set by
 * the save handler), but for older rows that pre-date that column we fall
 * back to a structural check: "are there any non-trivial fields set?".
 */
export function hasMeaningfulPreferences(profile: {
  partnerPreference?: PartnerPreference;
  preferencesUpdatedAt?: string;
}): boolean {
  if (profile.preferencesUpdatedAt) return true;
  const p = profile.partnerPreference;
  if (!p) return false;
  const meaningfulFields: Array<keyof PartnerPreference> = [
    "ageMin", "ageMax", "heightMin", "heightMax", "maritalStatus",
    "religion", "caste", "subCaste", "education", "profession",
    "incomeMin", "incomeMax", "city", "state", "foodHabits",
  ];
  return meaningfulFields.some((k) => {
    const v = p[k];
    if (v == null) return false;
    if (typeof v === "string") return v.trim().length > 0;
    if (typeof v === "number") return true;
    return false;
  });
}
