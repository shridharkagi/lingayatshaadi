/**
 * Maps between app Profile (camelCase) and Supabase profiles table (snake_case).
 */

import type { Profile } from "@/types";

export type ProfileRow = Record<string, unknown>;

/** Convert Profile to DB row (snake_case) for insert/update */
export function toProfileRow(p: Partial<Profile>): ProfileRow {
  const row: ProfileRow = {};
  if (p.email != null) row.email = p.email;
  if (p.fullName != null) row.full_name = p.fullName;
  if (p.dateOfBirth != null) row.date_of_birth = p.dateOfBirth;
  if (p.gender != null) row.gender = p.gender;
  if (p.maritalStatus != null) row.marital_status = p.maritalStatus;
  if (p.caste != null) row.caste = p.caste;
  if (p.subCaste != null) row.sub_caste = p.subCaste;
  if (p.height != null) row.height = p.height;
  if (p.languagesKnown != null) row.languages_known = p.languagesKnown;
  if (p.motherTongue != null) row.mother_tongue = p.motherTongue;
  if (p.aboutMe != null) row.about_me = p.aboutMe;
  if (p.aboutMeVisible != null) row.about_me_visible = p.aboutMeVisible;
  if (p.hobbies != null) row.hobbies = p.hobbies;
  if (p.timeOfBirth != null) row.time_of_birth = p.timeOfBirth;
  if (p.placeOfBirth != null) row.place_of_birth = p.placeOfBirth;
  if (p.rashi != null) row.rashi = p.rashi;
  if (p.nakshatra != null) row.nakshatra = p.nakshatra;
  if (p.horoscopeOtherDetails != null) row.horoscope_other_details = p.horoscopeOtherDetails;
  if (p.qualification != null) row.qualification = p.qualification;
  if (p.professionType != null) row.profession_type = p.professionType;
  if (p.profession != null) row.profession = p.profession;
  if (p.companyName != null) row.company_name = p.companyName;
  if (p.annualIncome != null) row.annual_income = p.annualIncome;
  if (p.fatherName != null) row.father_name = p.fatherName;
  if (p.fatherOccupation != null) row.father_occupation = p.fatherOccupation;
  if (p.motherName != null) row.mother_name = p.motherName;
  if (p.motherOccupation != null) row.mother_occupation = p.motherOccupation;
  if (p.foodHabits != null) row.food_habits = p.foodHabits;
  if (p.siblingDetails != null) row.sibling_details = p.siblingDetails;
  if (p.familyOtherDetails != null) row.family_other_details = p.familyOtherDetails;
  if (p.address != null) row.address = p.address;
  if (p.city != null) row.city = p.city;
  if (p.district != null) row.district = p.district;
  if (p.state != null) row.state = p.state;
  if (p.country != null) row.country = p.country;
  if (p.contact != null) row.contact = p.contact;
  if (p.contactType != null) row.contact_type = p.contactType;
  if (p.contacts != null) {
    row.contacts = p.contacts;
    // Keep the legacy single `contact` column in sync with the primary entry
    // so older code paths and SQL queries keep working.
    const primary = p.contacts[0];
    if (primary?.number && row.contact == null) {
      row.contact = primary.number;
    }
  }
  if (p.profilePhoto != null) row.profile_photo = p.profilePhoto;
  if (p.photos != null) row.photos = p.photos;
  if (p.verified != null) row.verified = p.verified;
  if (p.profileStatus != null) row.profile_status = p.profileStatus;
  if (p.profileType != null) row.profile_type = p.profileType;
  if (p.trustScore != null) row.trust_score = p.trustScore;
  if (p.managedBy != null) row.managed_by = p.managedBy;
  if (p.accountHolderName != null) row.account_holder_name = p.accountHolderName;
  if (p.relationship != null) row.relationship = p.relationship;
  if (p.nickname != null) row.nickname = p.nickname;
  if (p.role != null) row.role = p.role;
  if (p.partnerPreference != null) row.partner_preference = p.partnerPreference;
  // Display-only privacy flag — never gate the matching algorithm on this.
  if (p.showPartnerPreferences != null) row.show_partner_preferences = p.showPartnerPreferences;
  if (p.preferencesUpdatedAt != null) row.preferences_updated_at = p.preferencesUpdatedAt;
  // Moderation (Batch 5). Note that `profileStatus` (legacy verified/pending
  // admin flag) already maps to `profile_status`, so we keep them separate.
  if (p.moderationStatus != null) row.moderation_status = p.moderationStatus;
  if (p.approvedSnapshot != null) row.approved_snapshot = p.approvedSnapshot;
  if (p.approvedAt != null) row.approved_at = p.approvedAt;
  if (p.lastSubmittedAt != null) row.last_submitted_at = p.lastSubmittedAt;
  if (p.rejectionReason != null) row.rejection_reason = p.rejectionReason;
  if (p.reviewedBy != null) row.reviewed_by = p.reviewedBy;
  if (p.draftCurrentStep != null) row.draft_current_step = p.draftCurrentStep;
  if (p.publicId != null) row.public_id = p.publicId;
  if (p.memberId != null) row.public_id = p.memberId || p.publicId;
  return row;
}

/** Convert DB row to Profile (camelCase) */
export function fromProfileRow(row: ProfileRow): Profile {
  const formatDate = (v: unknown) => {
    if (typeof v === "string") return v;
    if (v instanceof Date) return v.toISOString().slice(0, 10);
    return "";
  };
  return {
    id: String(row.id ?? ""),
    publicId: row.public_id as string | undefined,
    memberId: (row.public_id ?? row.member_id) as string | undefined,
    userId: row.user_id as string | undefined,
    email: String(row.email ?? ""),
    fullName: String(row.full_name ?? ""),
    dateOfBirth: formatDate(row.date_of_birth),
    gender: (row.gender === "female" ? "female" : "male"),
    maritalStatus: String(row.marital_status ?? ""),
    caste: String(row.caste ?? "Lingayat"),
    subCaste: String(row.sub_caste ?? ""),
    height: String(row.height ?? ""),
    languagesKnown: row.languages_known as string | undefined,
    motherTongue: row.mother_tongue as string | undefined,
    aboutMe: String(row.about_me ?? ""),
    aboutMeVisible: Boolean(row.about_me_visible ?? true),
    hobbies: (row.hobbies as string[] | undefined) ?? [],
    timeOfBirth: row.time_of_birth as string | undefined,
    placeOfBirth: row.place_of_birth as string | undefined,
    rashi: row.rashi as string | undefined,
    nakshatra: row.nakshatra as string | undefined,
    horoscopeOtherDetails: row.horoscope_other_details as string | undefined,
    qualification: row.qualification as string | undefined,
    professionType: row.profession_type as string | undefined,
    profession: row.profession as string | undefined,
    companyName: row.company_name as string | undefined,
    annualIncome: row.annual_income as string | undefined,
    fatherName: row.father_name as string | undefined,
    fatherOccupation: row.father_occupation as string | undefined,
    motherName: row.mother_name as string | undefined,
    motherOccupation: row.mother_occupation as string | undefined,
    foodHabits: row.food_habits as string | undefined,
    siblingDetails: row.sibling_details as string | undefined,
    familyOtherDetails: row.family_other_details as string | undefined,
    address: row.address as string | undefined,
    city: row.city as string | undefined,
    district: row.district as string | undefined,
    state: row.state as string | undefined,
    country: (row.country as string) || "India",
    contact: row.contact as string | undefined,
    contactType: row.contact_type as string | undefined,
    contacts: Array.isArray(row.contacts)
      ? (row.contacts as Profile["contacts"])
      : undefined,
    profilePhoto: row.profile_photo as string | undefined,
    photos: (row.photos as string[] | undefined) ?? [],
    verified: Boolean(row.verified ?? false),
    profileStatus: row.profile_status as Profile["profileStatus"],
    profileType: row.profile_type as "free" | "premium" | undefined,
    trustScore: Number(row.trust_score ?? 0),
    managedBy: row.managed_by as Profile["managedBy"],
    accountHolderName: row.account_holder_name as string | undefined,
    relationship: row.relationship as Profile["relationship"],
    nickname: row.nickname as string | undefined,
    role: (row.role as Profile["role"]) ?? "user",
    partnerPreference: row.partner_preference as Profile["partnerPreference"],
    // Default to true so legacy rows (column added later, value never set)
    // continue to display preferences exactly as they did before the toggle
    // was introduced.
    showPartnerPreferences: row.show_partner_preferences == null
      ? true
      : Boolean(row.show_partner_preferences),
    preferencesUpdatedAt: row.preferences_updated_at
      ? new Date(row.preferences_updated_at as string).toISOString()
      : undefined,
    // Moderation (Batch 5). Default legacy rows to 'approved' so the
    // migration period doesn't accidentally hide already-live profiles.
    // The SQL back-fill also sets this to 'approved' for non-empty rows,
    // but a JS default is a safety net for untouched rows.
    moderationStatus: (row.moderation_status as Profile["moderationStatus"]) ?? "approved",
    approvedSnapshot: row.approved_snapshot as Profile["approvedSnapshot"],
    approvedAt: row.approved_at
      ? new Date(row.approved_at as string).toISOString()
      : undefined,
    lastSubmittedAt: row.last_submitted_at
      ? new Date(row.last_submitted_at as string).toISOString()
      : undefined,
    rejectionReason: row.rejection_reason as string | undefined,
    reviewedBy: row.reviewed_by as string | undefined,
    draftCurrentStep:
      typeof row.draft_current_step === "number"
        ? (row.draft_current_step as number)
        : undefined,
    deletedAt: row.deleted_at
      ? new Date(row.deleted_at as string).toISOString()
      : null,
    deletedReason: (row.deleted_reason as string | undefined) ?? null,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString().slice(0, 10) : "",
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString().slice(0, 10) : "",
  };
}
