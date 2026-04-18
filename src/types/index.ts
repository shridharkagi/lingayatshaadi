// Supabase-ready types for future migration

export interface PartnerPreference {
  ageMin?: number;
  ageMax?: number;
  heightMin?: string;
  heightMax?: string;
  maritalStatus?: string;
  religion?: string;
  caste?: string;
  subCaste?: string;
  education?: string;
  profession?: string;
  incomeMin?: string;
  incomeMax?: string;
  location?: string;
  city?: string;
  state?: string;
  country?: string;
  foodHabits?: string;
}

/** A single contact entry on a profile (primary or alternate). */
export interface ProfileContact {
  /** E.164 / national number entered by the user, e.g. "+91 9876543210" or "9876543210". */
  number: string;
  /**
   * Who this contact belongs to. Suggested values come from
   * `CONTACT_OWNER_RELATIONS` in `data/constants.ts` but free text is allowed
   * (e.g., "Maternal Uncle").
   */
  belongsTo?: string;
  /** When `belongsTo === "Other"`, the free-text label entered by the user. */
  belongsToOther?: string;
  /** Show this number on the public profile. Defaults to true for the primary. */
  showOnProfile?: boolean;
  /** Preferred contact channels (Call / WhatsApp / SMS). */
  methods?: string[];
}

export interface Profile {
  /** Internal ID (database primary key) - never exposed in URLs */
  id: string;
  /** Public ID / Member ID - LS26010001 format, displayed to users */
  publicId?: string;
  /** @deprecated Use publicId. Kept for backward compatibility. */
  memberId?: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female";
  maritalStatus: string;
  caste: string;
  subCaste: string;
  height: string;
  /** Languages known (comma-separated or array) */
  languagesKnown?: string;
  /** Mother tongue */
  motherTongue?: string;
  aboutMe: string;
  aboutMeVisible: boolean;
  hobbies?: string[];
  // Horoscope
  timeOfBirth?: string;
  placeOfBirth?: string;
  rashi?: string;
  nakshatra?: string;
  horoscopeOtherDetails?: string;
  // Education & Occupation
  qualification?: string;
  professionType?: string;
  profession?: string;
  companyName?: string;
  annualIncome?: string;
  // Family
  fatherName?: string;
  fatherOccupation?: string;
  motherName?: string;
  motherOccupation?: string;
  foodHabits?: string;
  siblingDetails?: string;
  familyOtherDetails?: string;
  address?: string;
  city?: string;
  district?: string;
  state?: string;
  country?: string;
  contact?: string;
  contactType?: string;
  /**
   * Structured list of contact numbers with per-entry visibility and preferred
   * channels. The first entry is treated as the primary/default account
   * contact. Stored as JSONB column `contacts` in Supabase. The legacy `contact`
   * field stays in sync with `contacts[0].number` for backwards compatibility.
   */
  contacts?: ProfileContact[];
  // Meta
  profilePhoto?: string;
  photos?: string[];
  verified?: boolean;
  /** Admin profile status - when set, overrides verified for display/filter */
  profileStatus?: "verified" | "pending" | "rejected" | "suspended";
  /** Free or Premium subscription type */
  profileType?: "free" | "premium";
  trustScore?: number;
  // Profile ownership (who manages this profile)
  managedBy?: "self" | "parent" | "guardian" | "admin";
  accountHolderName?: string;
  /** Relationship of this profile to the account holder. */
  relationship?: "self" | "son" | "daughter" | "brother" | "sister" | "other";
  /** Optional short nickname/label for the account holder to identify this profile. */
  nickname?: string;
  // User role (for access control)
  role?: "user" | "superadmin";
  createdAt: string;
  updatedAt: string;
  // Partner preferences (stored with profile)
  partnerPreference?: PartnerPreference;
}

export interface User {
  id: string;
  email: string;
  profile: Profile;
}

/**
 * Minimal account holder details collected at signup.
 * Stored on `auth.users.user_metadata` (not in the profiles table).
 */
export interface AccountMeta {
  firstName: string;
  lastName?: string;
  fullName: string;
  gender: "male" | "female";
  city: string;
  /** ISO date (YYYY-MM-DD); optional because legacy users may not have it */
  dateOfBirth?: string;
}

export interface Interest {
  id: string;
  fromId: string;
  toId: string;
  message?: string;
  status: "pending" | "accepted" | "declined";
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface MembershipPlan {
  id: string;
  name: string;
  duration: number; // months
  price: number;
  features: string[];
  popular?: boolean;
  isFree?: boolean; // true when price === 0
}
