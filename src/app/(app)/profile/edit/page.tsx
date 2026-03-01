"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HobbiesSelector } from "@/components/ui/HobbiesSelector";
import { SubCasteSelector } from "@/components/ui/SubCasteSelector";
import { useAuth } from "@/contexts/AuthContext";
import { PROFESSION_TYPES } from "@/data/constants";
import { sanitizeText } from "@/lib/security";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  if (!user) return null;

  const handleUpdate = (field: string, value: string) => {
    // Sanitize text inputs
    const sanitized = typeof value === "string" ? sanitizeText(value) : value;
    updateProfile({ [field]: sanitized });
  };

  return (
    <div className="max-w-lg mx-auto pb-8">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Edit Profile</h1>
      </header>

      <div className="p-4 space-y-6">
        <Section title="About Me">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={user.aboutMe || ""}
              onChange={(e) => handleUpdate("aboutMe", e.target.value)}
              maxLength={1000}
            />
          </div>
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
            <span className="font-medium">Show About Me to others</span>
            <button
              onClick={() => updateProfile({ aboutMeVisible: !user.aboutMeVisible })}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${user.aboutMeVisible ? "bg-[var(--primary)] text-white" : "bg-gray-200 text-gray-600"}`}
            >
              {user.aboutMeVisible ? "Visible" : "Hidden"}
            </button>
          </div>
          <HobbiesSelector
            value={user.hobbies || []}
            onChange={(hobbies) => updateProfile({ hobbies })}
          />
        </Section>

        <Section title="Basic Details">
          {(user.managedBy === "parent" || user.managedBy === "guardian") && (
            <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 text-sm text-gray-600">
              <p className="font-medium text-[var(--primary)]">Profile managed by {user.accountHolderName || "parent/guardian"}</p>
              <p className="mt-1 text-xs">You are editing the profile on behalf of this person.</p>
            </div>
          )}
          <Input label="Full Name" value={user.fullName} onChange={(e) => handleUpdate("fullName", e.target.value)} maxLength={100} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={user.gender || ""}
              onChange={(e) => updateProfile({ gender: e.target.value as "male" | "female" | "other" })}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
            <select
              value={user.maritalStatus || ""}
              onChange={(e) => updateProfile({ maritalStatus: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
            >
              <option value="">Select marital status</option>
              <option value="Never Married">Never Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Separated">Separated</option>
              <option value="Awaiting Divorce">Awaiting Divorce</option>
            </select>
          </div>
          <Input label="Date of Birth" type="date" value={user.dateOfBirth || ""} onChange={(e) => updateProfile({ dateOfBirth: e.target.value })} />
          <Input label="Height (ft)" placeholder="e.g. 5.8" value={user.height} onChange={(e) => handleUpdate("height", e.target.value)} maxLength={4} />
          <Input label="Languages Known" placeholder="e.g. Kannada, Hindi, English" value={user.languagesKnown || ""} onChange={(e) => handleUpdate("languagesKnown", e.target.value)} maxLength={200} />
          <Input label="Mother Tongue" placeholder="e.g. Kannada" value={user.motherTongue || ""} onChange={(e) => handleUpdate("motherTongue", e.target.value)} maxLength={50} />
          <Input label="Caste" value={user.caste} onChange={(e) => handleUpdate("caste", e.target.value)} maxLength={50} />
          <SubCasteSelector value={user.subCaste || ""} onChange={(v) => updateProfile({ subCaste: v })} />
        </Section>

        <Section title="Horoscope">
          <Input label="Time of Birth" placeholder="e.g. 10:30" value={user.timeOfBirth || ""} onChange={(e) => handleUpdate("timeOfBirth", e.target.value)} maxLength={10} />
          <Input label="Place of Birth" value={user.placeOfBirth || ""} onChange={(e) => handleUpdate("placeOfBirth", e.target.value)} maxLength={100} />
          <Input label="Rashi" placeholder="e.g. Mesha" value={user.rashi || ""} onChange={(e) => handleUpdate("rashi", e.target.value)} maxLength={50} />
          <Input label="Nakshatra" placeholder="e.g. Bharani" value={user.nakshatra || ""} onChange={(e) => handleUpdate("nakshatra", e.target.value)} maxLength={50} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Horoscope Other Details</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={user.horoscopeOtherDetails || ""}
              onChange={(e) => handleUpdate("horoscopeOtherDetails", e.target.value)}
              maxLength={500}
            />
          </div>
        </Section>

        <Section title="Education & Career">
          <Input label="Qualification" placeholder="e.g. B.Tech, M.Sc" value={user.qualification} onChange={(e) => handleUpdate("qualification", e.target.value)} maxLength={100} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profession Type</label>
            <select
              value={user.professionType || ""}
              onChange={(e) => updateProfile({ professionType: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Select profession type</option>
              {PROFESSION_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <Input label="Profession" value={user.profession} onChange={(e) => handleUpdate("profession", e.target.value)} maxLength={100} />
          <Input label="Company Name" value={user.companyName} onChange={(e) => handleUpdate("companyName", e.target.value)} maxLength={100} />
          <Input label="Annual Income" placeholder="e.g. 10-12 Lakhs" value={user.annualIncome} onChange={(e) => handleUpdate("annualIncome", e.target.value)} maxLength={50} />
        </Section>

        <Section title="Family Details">
          <Input label="Father's Name" value={user.fatherName} onChange={(e) => handleUpdate("fatherName", e.target.value)} maxLength={100} />
          <Input label="Father's Occupation" value={user.fatherOccupation} onChange={(e) => handleUpdate("fatherOccupation", e.target.value)} maxLength={100} />
          <Input label="Mother's Name" value={user.motherName} onChange={(e) => handleUpdate("motherName", e.target.value)} maxLength={100} />
          <Input label="Mother's Occupation" value={user.motherOccupation} onChange={(e) => handleUpdate("motherOccupation", e.target.value)} maxLength={100} />
          <Input label="Food Habits" placeholder="e.g. Vegetarian" value={user.foodHabits} onChange={(e) => handleUpdate("foodHabits", e.target.value)} maxLength={50} />
          <Input label="Sibling Details" value={user.siblingDetails} onChange={(e) => handleUpdate("siblingDetails", e.target.value)} maxLength={200} />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Family Other Details</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              value={user.familyOtherDetails || ""}
              onChange={(e) => handleUpdate("familyOtherDetails", e.target.value)}
              maxLength={500}
            />
          </div>
        </Section>

        <Section title="Location & Contact">
          <Input label="Address" value={user.address} onChange={(e) => handleUpdate("address", e.target.value)} maxLength={200} />
          <Input label="City" value={user.city} onChange={(e) => handleUpdate("city", e.target.value)} maxLength={100} />
          <Input label="District" value={user.district} onChange={(e) => handleUpdate("district", e.target.value)} maxLength={100} />
          <Input label="State" value={user.state} onChange={(e) => handleUpdate("state", e.target.value)} maxLength={100} />
          <Input label="Country" value={user.country} onChange={(e) => handleUpdate("country", e.target.value)} maxLength={100} />
          <Input label="Contact" value={user.contact} onChange={(e) => handleUpdate("contact", e.target.value)} maxLength={20} />
          <Input label="Contact Type" placeholder="e.g. Office, Personal" value={user.contactType} onChange={(e) => handleUpdate("contactType", e.target.value)} maxLength={50} />
        </Section>

        <Button fullWidth onClick={() => router.back()}>
          Save Changes
        </Button>
      </div>
    </div>
  );
}
