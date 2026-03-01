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
  gender: "male" | "female" | "other";
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
  managedBy?: "self" | "parent" | "guardian";
  accountHolderName?: string;
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
