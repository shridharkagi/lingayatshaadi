"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Heart, ChevronLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HobbiesSelector } from "@/components/ui/HobbiesSelector";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useAuth } from "@/contexts/AuthContext";
import { Profile } from "@/types";
import { PROFESSION_TYPES } from "@/data/constants";
import { SubCasteSelector } from "@/components/ui/SubCasteSelector";

const steps = [
  { id: 1, title: "About Me" },
  { id: 2, title: "Profile Details" },
  { id: 3, title: "Horoscope" },
  { id: 4, title: "Education & Career" },
  { id: 5, title: "Family Details" },
  { id: 6, title: "Profile Photo" },
];

const initialProfile: Partial<Profile> = {
  aboutMe: "",
  aboutMeVisible: true,
  fullName: "",
  maritalStatus: "",
  caste: "Lingayat",
  subCaste: "",
  height: "",
  languagesKnown: "",
  motherTongue: "",
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
};

export default function ProfileCompletePage() {
  const router = useRouter();
  const { user, updateProfile, register } = useAuth();
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile);

  useEffect(() => {
    const signupData = sessionStorage.getItem("lingayat_signup_data");
    const signupEmail = sessionStorage.getItem("lingayat_signup_email");
    if (signupData && signupEmail) {
      try {
        const data = JSON.parse(signupData);
        const profileFor = data.profileFor as "self" | "parent" | undefined;
        if (profileFor === "parent") {
          setProfile((p) => ({
            ...p,
            contact: data.mobile || undefined,
            city: data.city || undefined,
            email: signupEmail,
            managedBy: "parent",
            accountHolderName: data.fullName,
          }));
        } else {
          setProfile((p) => ({
            ...p,
            fullName: data.fullName,
            dateOfBirth: data.dateOfBirth,
            gender: data.gender,
            contact: data.mobile || undefined,
            city: data.city || undefined,
            email: signupEmail,
            managedBy: "self",
          }));
        }
      } catch {
        // ignore
      }
    } else if (user) {
      setProfile((p) => ({ ...p, ...user }));
    }
  }, [user]);

  const update = (key: keyof Profile, value: string | boolean | string[]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const next = () => {
    if (step < 6) setStep(step + 1);
    else {
      const signupEmail = sessionStorage.getItem("lingayat_signup_email");
      if (signupEmail) {
        register({ ...profile, email: signupEmail } as Partial<Profile> & { email: string });
        sessionStorage.removeItem("lingayat_signup_email");
        sessionStorage.removeItem("lingayat_signup_data");
      } else if (user) {
        updateProfile(profile as Partial<Profile>);
      }
      router.push("/home");
    }
  };

  const prev = () => (step > 1 ? setStep(step - 1) : router.back());

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 bg-white border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
        <Link href="/login" className="flex items-center gap-2">
          <ChevronLeft size={24} />
          <span className="font-medium">Back</span>
        </Link>
        <Link href="/" className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-[var(--primary)] fill-[var(--primary)]" />
          <span className="font-bold text-[var(--primary)]">LingayatShaadi</span>
        </Link>
        <div className="w-20" />
      </header>

      <div className="p-4 max-w-lg mx-auto">
        <div className="flex gap-1 mb-8">
          {steps.map((s) => (
            <div
              key={s.id}
              className={`h-1 flex-1 rounded-full ${
                s.id <= step ? "bg-[var(--primary)]" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <h2 className="text-xl font-bold mb-6">{steps[step - 1].title}</h2>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[120px]"
                placeholder="Tell others about yourself..."
                value={profile.aboutMe || ""}
                onChange={(e) => update("aboutMe", e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-[var(--border)]">
              <span className="font-medium">Show About Me to others</span>
              <button
                onClick={() => update("aboutMeVisible", !profile.aboutMeVisible)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                  profile.aboutMeVisible ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-gray-100 text-gray-500"
                }`}
              >
                {profile.aboutMeVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                {profile.aboutMeVisible ? "Visible" : "Hidden"}
              </button>
            </div>
            <HobbiesSelector
              value={profile.hobbies || []}
              onChange={(hobbies) => update("hobbies", hobbies)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <Input label="Full Name" value={profile.fullName || ""} onChange={(e) => update("fullName", e.target.value)} placeholder="Profile holder's name" />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                value={profile.gender || ""}
                onChange={(e) => update("gender", e.target.value as "male" | "female" | "other")}
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
                value={profile.maritalStatus || ""}
                onChange={(e) => update("maritalStatus", e.target.value)}
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
            <Input label="Date of Birth" type="date" value={profile.dateOfBirth || ""} onChange={(e) => update("dateOfBirth", e.target.value)} />
            <Input label="Caste" value={profile.caste || ""} onChange={(e) => update("caste", e.target.value)} />
            <SubCasteSelector value={profile.subCaste || ""} onChange={(v) => update("subCaste", v)} />
            <Input label="Height (ft)" placeholder="e.g. 5.8" value={profile.height || ""} onChange={(e) => update("height", e.target.value)} />
            <Input label="Languages Known" placeholder="e.g. Kannada, Hindi, English" value={profile.languagesKnown || ""} onChange={(e) => update("languagesKnown", e.target.value)} />
            <Input label="Mother Tongue" placeholder="e.g. Kannada" value={profile.motherTongue || ""} onChange={(e) => update("motherTongue", e.target.value)} />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <Input label="Time of Birth" placeholder="e.g. 10:30" value={profile.timeOfBirth || ""} onChange={(e) => update("timeOfBirth", e.target.value)} />
            <Input label="Place of Birth" value={profile.placeOfBirth || ""} onChange={(e) => update("placeOfBirth", e.target.value)} />
            <Input label="Rashi" placeholder="e.g. Mesha" value={profile.rashi || ""} onChange={(e) => update("rashi", e.target.value)} />
            <Input label="Nakshatra" placeholder="e.g. Bharani" value={profile.nakshatra || ""} onChange={(e) => update("nakshatra", e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Horoscope Other Details</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[80px]"
                value={profile.horoscopeOtherDetails || ""}
                onChange={(e) => update("horoscopeOtherDetails", e.target.value)}
              />
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <Input label="Qualification" placeholder="e.g. B.Tech, M.Sc" value={profile.qualification || ""} onChange={(e) => update("qualification", e.target.value)} />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Profession Type</label>
              <select
                value={profile.professionType || ""}
                onChange={(e) => update("professionType", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              >
                <option value="">Select profession type</option>
                {PROFESSION_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <Input label="Profession" placeholder="e.g. Software Engineer, Senior CA" value={profile.profession || ""} onChange={(e) => update("profession", e.target.value)} />
            <Input label="Company Name" value={profile.companyName || ""} onChange={(e) => update("companyName", e.target.value)} />
            <Input label="Annual Income" placeholder="e.g. 10-12 Lakhs" value={profile.annualIncome || ""} onChange={(e) => update("annualIncome", e.target.value)} />
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <Input label="Father's Name" value={profile.fatherName || ""} onChange={(e) => update("fatherName", e.target.value)} />
            <Input label="Father's Occupation" value={profile.fatherOccupation || ""} onChange={(e) => update("fatherOccupation", e.target.value)} />
            <Input label="Mother's Name" value={profile.motherName || ""} onChange={(e) => update("motherName", e.target.value)} />
            <Input label="Mother's Occupation" value={profile.motherOccupation || ""} onChange={(e) => update("motherOccupation", e.target.value)} />
            <Input label="Food Habits" placeholder="e.g. Vegetarian" value={profile.foodHabits || ""} onChange={(e) => update("foodHabits", e.target.value)} />
            <Input label="Sibling Details" value={profile.siblingDetails || ""} onChange={(e) => update("siblingDetails", e.target.value)} />
            <Input label="Address" value={profile.address || ""} onChange={(e) => update("address", e.target.value)} />
            <Input label="City" value={profile.city || ""} onChange={(e) => update("city", e.target.value)} />
            <Input label="District" value={profile.district || ""} onChange={(e) => update("district", e.target.value)} />
            <Input label="State" value={profile.state || ""} onChange={(e) => update("state", e.target.value)} />
            <Input label="Country" value={profile.country || ""} onChange={(e) => update("country", e.target.value)} />
            <Input label="Contact" value={profile.contact || ""} onChange={(e) => update("contact", e.target.value)} />
            <Input label="Contact Type" placeholder="e.g. Office, Personal" value={profile.contactType || ""} onChange={(e) => update("contactType", e.target.value)} />
          </div>
        )}

        {step === 6 && (
          <div className="space-y-4">
            <p className="text-gray-600 text-sm">Add up to 5 photos. First photo will be your profile photo. Images are compressed and converted to WebP.</p>
            <PhotoUpload
              currentPhotos={[
                ...(profile.profilePhoto ? [profile.profilePhoto] : []),
                ...(profile.photos || []).filter((p) => p !== profile.profilePhoto),
              ]}
              onAdd={(url) => {
                const isFirst = !profile.profilePhoto && (profile.photos?.length ?? 0) === 0;
                if (isFirst) {
                  setProfile((prev) => ({ ...prev, profilePhoto: url, photos: [] }));
                } else {
                  setProfile((prev) => ({
                    ...prev,
                    photos: [...(prev.photos || []).filter((p) => p !== prev.profilePhoto), url],
                  }));
                }
              }}
              onRemove={(url) => {
                if (url === profile.profilePhoto) {
                  const rest = (profile.photos || []).filter((p) => p !== url);
                  setProfile((prev) => ({ ...prev, profilePhoto: rest[0], photos: rest.slice(1) }));
                } else {
                  setProfile((prev) => ({ ...prev, photos: (prev.photos || []).filter((p) => p !== url) }));
                }
              }}
              userId={user?.id || user?.memberId || "new-user"}
            />
          </div>
        )}

        <div className="flex gap-3 mt-8">
          <Button variant="outline" onClick={prev} className="flex-1">
            Back
          </Button>
          <Button onClick={next} className="flex-1">
            {step === 6 ? "Complete" : "Continue"}
          </Button>
        </div>
      </div>
    </div>
  );
}
