import { PROFESSION_TYPES } from "@/data/constants";
import { Profile } from "@/types";

/**
 * Maps profile professionType/profession to our filter categories.
 * Used when profile has free-text professionType that may not exactly match filter options.
 */
const PROFESSION_CATEGORY_KEYWORDS: Record<string, string[]> = {
  "IT / Software": ["it", "software", "developer", "data scientist", "product manager", "cloud architect", "tech"],
  "Government Job": ["government", "govt", "psu", "public sector", "rtd.", "retired", "railway"],
  "Business": ["business", "entrepreneur", "owner", "founder", "manufacturing", "construction"],
  "Doctor": ["doctor", "physician", "cardiologist", "dentist", "surgeon", "mbbs", "md", "bds", "mds"],
  "Engineer": ["engineer", "architect", "civil", "mechanical", "electrical", "b.e", "b.tech", "b.arch"],
  "Teacher": ["teacher", "professor", "lecturer", "educator"],
  "Private Job": ["private", "corporate", "manager", "analyst", "executive", "relationship manager", "hr", "marketing", "finance", "lawyer", "pharmacist", "banking", "ca", "chartered accountant", "journalist", "designer"],
  "Self Employed": ["self employed", "self-employed", "consultant", "freelance"],
  "Not Working": ["not working", "homemaker", "home maker"],
};

export function getProfessionKeywords(selectedProfessions: string[]): string[] {
  const keywords = new Set<string>();
  selectedProfessions.forEach((selected) => {
    (PROFESSION_CATEGORY_KEYWORDS[selected] || []).forEach((kw) => keywords.add(kw));
  });
  return Array.from(keywords);
}

/**
 * Check if a profile's profession matches any of the selected filter categories.
 */
export function profileMatchesProfessionFilter(
  profile: Profile,
  selectedProfessions: string[]
): boolean {
  if (selectedProfessions.length === 0) return true;

  const pt = (profile.professionType || "").toLowerCase();
  const p = (profile.profession || "").toLowerCase();
  const combined = `${pt} ${p}`;

  for (const selected of selectedProfessions) {
    const keywords = PROFESSION_CATEGORY_KEYWORDS[selected];
    if (keywords) {
      for (const kw of keywords) {
        if (combined.includes(kw)) return true;
      }
    }
    // Exact match for professionType
    if (pt && selected.toLowerCase().includes(pt)) return true;
    if (pt === selected.toLowerCase()) return true;
  }
  return false;
}

export type ProfessionTypeOption = (typeof PROFESSION_TYPES)[number];
