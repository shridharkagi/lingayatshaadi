"use client";

import { Input } from "@/components/ui/Input";
import { HobbiesSelector } from "@/components/ui/HobbiesSelector";
import { PhotoUpload } from "@/components/PhotoUpload";
import { SubCasteSelector } from "@/components/ui/SubCasteSelector";
import { Profile } from "@/types";
import { PROFESSION_TYPES } from "@/data/constants";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

interface ProfileFormSectionsProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  adminMode?: boolean;
  userId?: string;
}

export function ProfileFormSections({
  profile,
  onChange,
  adminMode = false,
  userId,
}: ProfileFormSectionsProps) {
  const update = (key: keyof Profile, value: string | boolean | string[] | number | undefined) => {
    onChange({ [key]: value } as Partial<Profile>);
  };

  return (
    <div className="space-y-6">
      {adminMode && (
        <Section title="Admin">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member ID (Public ID)</label>
            <p className="px-4 py-3 rounded-xl border border-[var(--border)] bg-gray-50 text-gray-600">
              {profile.publicId || profile.memberId || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Auto-generated. Format: LS + YY + MM + sequence</p>
          </div>
          <Input
            label="Email"
            type="email"
            value={profile.email || ""}
            onChange={(e) => update("email", e.target.value)}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Verified</label>
            <select
              value={profile.verified ? "yes" : "no"}
              onChange={(e) => update("verified", e.target.value === "yes")}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
          <Input
            label="Trust Score"
            type="number"
            value={profile.trustScore?.toString() ?? ""}
            onChange={(e) => update("trustScore", e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="0-100"
          />
        </Section>
      )}

      <Section title="About Me">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={profile.aboutMe || ""}
            onChange={(e) => update("aboutMe", e.target.value)}
          />
        </div>
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="font-medium">Show About Me to others</span>
          <button
            onClick={() => update("aboutMeVisible", !profile.aboutMeVisible)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${profile.aboutMeVisible ? "bg-[var(--primary)] text-white" : "bg-gray-200 text-gray-600"}`}
          >
            {profile.aboutMeVisible ? "Visible" : "Hidden"}
          </button>
        </div>
        <HobbiesSelector
          value={profile.hobbies || []}
          onChange={(hobbies) => update("hobbies", hobbies)}
        />
      </Section>

      <Section title="Basic Details">
        {(profile.managedBy === "parent" || profile.managedBy === "guardian") && (
          <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 text-sm text-gray-600">
            <p className="font-medium text-[var(--primary)]">Profile managed by {profile.accountHolderName || "parent/guardian"}</p>
          </div>
        )}
        <Input label="Full Name" value={profile.fullName || ""} onChange={(e) => update("fullName", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <select
            value={profile.gender || ""}
            onChange={(e) => update("gender", e.target.value as "male" | "female")}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
          <select
            value={profile.maritalStatus || ""}
            onChange={(e) => update("maritalStatus", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
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
        <Input label="Height (ft)" placeholder="e.g. 5.8" value={profile.height || ""} onChange={(e) => update("height", e.target.value)} />
        <Input label="Languages Known" placeholder="e.g. Kannada, Hindi, English" value={profile.languagesKnown || ""} onChange={(e) => update("languagesKnown", e.target.value)} />
        <Input label="Mother Tongue" placeholder="e.g. Kannada" value={profile.motherTongue || ""} onChange={(e) => update("motherTongue", e.target.value)} />
        <Input label="Caste" value={profile.caste || ""} onChange={(e) => update("caste", e.target.value)} />
        <SubCasteSelector value={profile.subCaste || ""} onChange={(v) => update("subCaste", v)} />
      </Section>

      <Section title="Horoscope">
        <Input label="Time of Birth" placeholder="e.g. 10:30" value={profile.timeOfBirth || ""} onChange={(e) => update("timeOfBirth", e.target.value)} />
        <Input label="Place of Birth" value={profile.placeOfBirth || ""} onChange={(e) => update("placeOfBirth", e.target.value)} />
        <Input label="Rashi" placeholder="e.g. Mesha" value={profile.rashi || ""} onChange={(e) => update("rashi", e.target.value)} />
        <Input label="Nakshatra" placeholder="e.g. Bharani" value={profile.nakshatra || ""} onChange={(e) => update("nakshatra", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Horoscope Other Details</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={profile.horoscopeOtherDetails || ""}
            onChange={(e) => update("horoscopeOtherDetails", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Education & Career">
        <Input label="Qualification" placeholder="e.g. B.Tech, M.Sc" value={profile.qualification || ""} onChange={(e) => update("qualification", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profession Type</label>
          <select
            value={profile.professionType || ""}
            onChange={(e) => update("professionType", e.target.value)}
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
        <Input label="Profession" placeholder="e.g. Software Engineer, Senior CA" value={profile.profession || ""} onChange={(e) => update("profession", e.target.value)} />
        <Input label="Company Name" value={profile.companyName || ""} onChange={(e) => update("companyName", e.target.value)} />
        <Input label="Annual Income" placeholder="e.g. 10-12 Lakhs" value={profile.annualIncome || ""} onChange={(e) => update("annualIncome", e.target.value)} />
      </Section>

      <Section title="Family Details">
        <Input label="Father's Name" value={profile.fatherName || ""} onChange={(e) => update("fatherName", e.target.value)} />
        <Input label="Father's Occupation" value={profile.fatherOccupation || ""} onChange={(e) => update("fatherOccupation", e.target.value)} />
        <Input label="Mother's Name" value={profile.motherName || ""} onChange={(e) => update("motherName", e.target.value)} />
        <Input label="Mother's Occupation" value={profile.motherOccupation || ""} onChange={(e) => update("motherOccupation", e.target.value)} />
        <Input label="Food Habits" placeholder="e.g. Vegetarian" value={profile.foodHabits || ""} onChange={(e) => update("foodHabits", e.target.value)} />
        <Input label="Sibling Details" value={profile.siblingDetails || ""} onChange={(e) => update("siblingDetails", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Family Other Details</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={profile.familyOtherDetails || ""}
            onChange={(e) => update("familyOtherDetails", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Location & Contact">
        <Input label="Address" value={profile.address || ""} onChange={(e) => update("address", e.target.value)} />
        <Input label="City" value={profile.city || ""} onChange={(e) => update("city", e.target.value)} />
        <Input label="District" value={profile.district || ""} onChange={(e) => update("district", e.target.value)} />
        <Input label="State" value={profile.state || ""} onChange={(e) => update("state", e.target.value)} />
        <Input label="Country" value={profile.country || ""} onChange={(e) => update("country", e.target.value)} />
        <Input label="Contact" value={profile.contact || ""} onChange={(e) => update("contact", e.target.value)} />
        <Input label="Contact Type" placeholder="e.g. Office, Personal" value={profile.contactType || ""} onChange={(e) => update("contactType", e.target.value)} />
      </Section>

      <Section title="Profile Photo">
        {userId ? (
          <>
            <p className="text-sm text-gray-600 mb-2">Up to 5 photos. First photo is your profile photo. Images are compressed and converted to WebP.</p>
            <PhotoUpload
              currentPhotos={[
                ...(profile.profilePhoto ? [profile.profilePhoto] : []),
                ...(profile.photos || []).filter((p) => p !== profile.profilePhoto),
              ]}
              onAdd={(url) => {
                const isFirst = !profile.profilePhoto && (profile.photos?.length ?? 0) === 0;
                if (isFirst) {
                  onChange({ profilePhoto: url, photos: [] });
                } else {
                  onChange({
                    photos: [...(profile.photos || []).filter((p) => p !== profile.profilePhoto), url],
                  });
                }
              }}
              onRemove={(url) => {
                if (url === profile.profilePhoto) {
                  const rest = (profile.photos || []).filter((p) => p !== url);
                  onChange({ profilePhoto: rest[0], photos: rest.slice(1) });
                } else {
                  onChange({ photos: (profile.photos || []).filter((p) => p !== url) });
                }
              }}
              userId={userId}
              profileId={profile.id}
            />
          </>
        ) : (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Profile Photo URL</label>
              <input
                type="url"
                value={profile.profilePhoto || ""}
                onChange={(e) => update("profilePhoto", e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full px-4 py-2 rounded-lg border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Additional Photos (one URL per line)</label>
              <textarea
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                placeholder="One image URL per line"
                value={(profile.photos || []).join("\n")}
                onChange={(e) =>
                  update(
                    "photos",
                    e.target.value
                      .split("\n")
                      .map((u) => u.trim())
                      .filter(Boolean)
                  )
                }
              />
            </div>
          </>
        )}
      </Section>
    </div>
  );
}
