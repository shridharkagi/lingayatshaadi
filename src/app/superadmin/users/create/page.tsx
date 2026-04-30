"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileFormSections } from "@/components/ProfileFormSections";
import { useProfiles } from "@/contexts/ProfilesContext";
import { Profile } from "@/types";
import { parseDobDdMmYyyyToIso } from "@/lib/dateOfBirth";

const initialProfile: Partial<Profile> = {
  aboutMe: "",
  aboutMeVisible: true,
  fullName: "",
  maritalStatus: "",
  caste: "Lingayat",
  subCaste: "",
  height: "",
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  rashi: "",
  nakshatra: "",
  horoscopeOtherDetails: "",
  qualification: "",
  professionType: "",
  profession: "",
  companyName: "",
  annualIncome: "",
  fatherName: "",
  fatherOccupation: "",
  motherName: "",
  motherOccupation: "",
  foodHabits: "",
  siblingDetails: "",
  hobbies: [],
  familyOtherDetails: "",
  address: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  contact: "",
  contactType: "Personal",
  email: "",
  memberId: "",
  verified: false,
  trustScore: 0,
};

export default function SuperAdminCreateProfilePage() {
  const router = useRouter();
  const { addProfile } = useProfiles();
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile);
  const [error, setError] = useState("");

  const handleCreate = () => {
    const normalizedDob = parseDobDdMmYyyyToIso(profile.dateOfBirth || "");
    if (!profile.email?.trim()) {
      setError("Email is required");
      return;
    }
    if (!profile.fullName?.trim()) {
      setError("Full name is required");
      return;
    }
    if (!profile.gender) {
      setError("Gender is required");
      return;
    }
    if (!normalizedDob) {
      setError("Date of birth is required in dd/mm/yyyy format");
      return;
    }
    setError("");

    const newProfile = addProfile({
      ...profile,
      email: profile.email!,
      fullName: profile.fullName!,
      gender: profile.gender as "male" | "female",
      dateOfBirth: normalizedDob,
      maritalStatus: profile.maritalStatus || "",
      caste: profile.caste || "Lingayat",
      subCaste: profile.subCaste || "",
      height: profile.height || "",
      aboutMe: profile.aboutMe || "",
      aboutMeVisible: profile.aboutMeVisible ?? true,
      verified: profile.verified ?? false,
      trustScore: profile.trustScore ?? 0,
    });
    router.push(`/superadmin/users/${newProfile.id}/edit`);
  };

  return (
    <div className="max-w-6xl mx-auto pb-8">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <Link href="/superadmin/users" className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          <ChevronLeft size={24} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Create Profile</h1>
          <p className="text-sm text-gray-500">Add a new profile on behalf of a user</p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_300px] gap-6 items-start">
      <div className="p-4 sm:p-6 bg-white rounded-xl shadow-sm">
        <div className="mb-5 rounded-xl border border-[var(--primary)]/25 bg-[var(--primary)]/5 px-4 py-3">
          <p className="text-sm font-semibold text-[var(--primary)]">Single-page profile creation</p>
          <p className="text-xs text-gray-600 mt-1">
            Same flow style as member profile creation, but all sections are visible on one page for faster admin entry.
          </p>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-lg text-sm">{error}</div>
        )}
        <ProfileFormSections
          profile={profile}
          onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
          adminMode
          userId={profile.publicId || profile.memberId || profile.id || "admin-create"}
        />
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push("/superadmin/users")} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleCreate} className="flex-1">
            Create Profile
          </Button>
        </div>
      </div>
      <aside className="hidden 2xl:block 2xl:sticky 2xl:top-4 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-900">Quick checklist</h2>
        <ul className="mt-3 space-y-2 text-xs text-gray-600">
          <li>Email, Full name, Gender, DOB are mandatory.</li>
          <li>DOB accepts only `dd/mm/yyyy` format.</li>
          <li>Height now uses slider for faster mobile entry.</li>
          <li>Gender uses quick radio-style chips.</li>
        </ul>
      </aside>
      </div>
    </div>
  );
}
