export type ViewerTier = "non_logged_in" | "logged_in_unpaid" | "logged_in_paid";
export type VisibilityRule = "show" | "mask" | "hide";

export const DATA_VISIBILITY_FIELDS = [
  "fullName",
  "dateOfBirth",
  "subCaste",
  "fatherName",
  "motherName",
  "siblingDetails",
  "timeOfBirth",
  "companyName",
  "annualIncome",
  "familyDetails",
  "horoscopeDetails",
  "contactDetails",
] as const;

export type DataVisibilityField = (typeof DATA_VISIBILITY_FIELDS)[number];

export type DataVisibilityConfig = Record<
  DataVisibilityField,
  Record<ViewerTier, VisibilityRule>
>;

export const DATA_VISIBILITY_FIELD_LABELS: Record<DataVisibilityField, string> = {
  fullName: "Full Name",
  dateOfBirth: "Date of Birth",
  subCaste: "Sub-Caste",
  fatherName: "Father Name",
  motherName: "Mother Name",
  siblingDetails: "Sibling Details",
  timeOfBirth: "Time of Birth",
  companyName: "Company Name",
  annualIncome: "Annual Income",
  familyDetails: "Family Section",
  horoscopeDetails: "Horoscope Section",
  contactDetails: "Phone/WhatsApp Contact",
};

export const DEFAULT_DATA_VISIBILITY_CONFIG: DataVisibilityConfig = {
  fullName: { non_logged_in: "mask", logged_in_unpaid: "mask", logged_in_paid: "show" },
  dateOfBirth: { non_logged_in: "mask", logged_in_unpaid: "mask", logged_in_paid: "show" },
  subCaste: { non_logged_in: "mask", logged_in_unpaid: "mask", logged_in_paid: "show" },
  fatherName: { non_logged_in: "mask", logged_in_unpaid: "mask", logged_in_paid: "show" },
  motherName: { non_logged_in: "mask", logged_in_unpaid: "mask", logged_in_paid: "show" },
  siblingDetails: { non_logged_in: "mask", logged_in_unpaid: "mask", logged_in_paid: "show" },
  timeOfBirth: { non_logged_in: "hide", logged_in_unpaid: "mask", logged_in_paid: "show" },
  companyName: { non_logged_in: "hide", logged_in_unpaid: "mask", logged_in_paid: "show" },
  annualIncome: { non_logged_in: "hide", logged_in_unpaid: "hide", logged_in_paid: "show" },
  familyDetails: { non_logged_in: "show", logged_in_unpaid: "show", logged_in_paid: "show" },
  horoscopeDetails: { non_logged_in: "show", logged_in_unpaid: "show", logged_in_paid: "show" },
  contactDetails: { non_logged_in: "hide", logged_in_unpaid: "hide", logged_in_paid: "show" },
};

export function resolveViewerTier(
  isLoggedIn: boolean,
  hasValidSubscription: boolean
): ViewerTier {
  if (!isLoggedIn) return "non_logged_in";
  return hasValidSubscription ? "logged_in_paid" : "logged_in_unpaid";
}

export function normalizeDataVisibilityConfig(raw: unknown): DataVisibilityConfig {
  const input =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const next: DataVisibilityConfig = {
    fullName: { ...DEFAULT_DATA_VISIBILITY_CONFIG.fullName },
    dateOfBirth: { ...DEFAULT_DATA_VISIBILITY_CONFIG.dateOfBirth },
    subCaste: { ...DEFAULT_DATA_VISIBILITY_CONFIG.subCaste },
    fatherName: { ...DEFAULT_DATA_VISIBILITY_CONFIG.fatherName },
    motherName: { ...DEFAULT_DATA_VISIBILITY_CONFIG.motherName },
    siblingDetails: { ...DEFAULT_DATA_VISIBILITY_CONFIG.siblingDetails },
    timeOfBirth: { ...DEFAULT_DATA_VISIBILITY_CONFIG.timeOfBirth },
    companyName: { ...DEFAULT_DATA_VISIBILITY_CONFIG.companyName },
    annualIncome: { ...DEFAULT_DATA_VISIBILITY_CONFIG.annualIncome },
    familyDetails: { ...DEFAULT_DATA_VISIBILITY_CONFIG.familyDetails },
    horoscopeDetails: { ...DEFAULT_DATA_VISIBILITY_CONFIG.horoscopeDetails },
    contactDetails: { ...DEFAULT_DATA_VISIBILITY_CONFIG.contactDetails },
  };

  for (const field of DATA_VISIBILITY_FIELDS) {
    const rowRaw = input[field];
    if (!rowRaw || typeof rowRaw !== "object" || Array.isArray(rowRaw)) continue;
    const row = rowRaw as Record<string, unknown>;
    for (const tier of ["non_logged_in", "logged_in_unpaid", "logged_in_paid"] as const) {
      const v = row[tier];
      if (v === "show" || v === "mask" || v === "hide") {
        next[field][tier] = v;
      }
    }
  }
  return next;
}

