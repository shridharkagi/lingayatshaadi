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
  id: string;
  memberId: string;
  email: string;
  fullName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";
  maritalStatus: string;
  caste: string;
  subCaste: string;
  height: string;
  aboutMe: string;
  aboutMeVisible: boolean;
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
  trustScore?: number;
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
}
