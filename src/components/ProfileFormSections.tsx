"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/Input";
import { HobbiesSelector } from "@/components/ui/HobbiesSelector";
import { PhotoUpload } from "@/components/PhotoUpload";
import { KycDocumentsUpload } from "@/components/KycDocumentsUpload";
import { SubCasteSelector } from "@/components/ui/SubCasteSelector";
import { ContactsEditor } from "@/components/ui/ContactsEditor";
import { Profile } from "@/types";
import {
  EDUCATION_SUGGESTIONS,
  INDIAN_STATES,
  PROFESSION_TYPES,
} from "@/data/constants";
import { SingleRangeSlider } from "@/components/ui/RangeSlider";
import {
  BadgeCheck,
  Briefcase,
  Calendar,
  Camera,
  FileCheck2,
  Heart,
  MapPin,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { formatIsoToDobDdMmYyyy, parseDobDdMmYyyyToIso } from "@/lib/dateOfBirth";
import { TagPillInput } from "@/components/ui/TagPillInput";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { getIndiaDistrictsForState } from "@/data/indiaDistricts";

function Section({
  title,
  subtitle,
  icon: Icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-start gap-3">
        {Icon && (
          <div className="w-9 h-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
            <Icon size={18} />
          </div>
        )}
        <div>
          <h3 className="text-base font-semibold text-gray-900">{title}</h3>
          {subtitle ? <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p> : null}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

interface ProfileFormSectionsProps {
  profile: Partial<Profile>;
  onChange: (updates: Partial<Profile>) => void;
  adminMode?: boolean;
  userId?: string;
}

const HEIGHT_INCH_MIN = 48;
const HEIGHT_INCH_MAX = 84;
const ANNUAL_INCOME_MIN_LAKHS = 1;
const ANNUAL_INCOME_MAX_LAKHS = 100;

function inchesToFeetInches(total: number): string {
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}'${inch}"`;
}

function parseHeightToInches(raw: string | undefined): number {
  if (!raw) return 65;
  const m = raw.match(/^(\d+)\s*[.'’ft]+\s*(\d+)?/i);
  if (m) {
    const ft = Number(m[1] || 0);
    const inch = Number(m[2] || 0);
    return Math.min(HEIGHT_INCH_MAX, Math.max(HEIGHT_INCH_MIN, ft * 12 + inch));
  }
  const n = Number(raw);
  if (Number.isFinite(n)) {
    const asInches = n < 12 ? Math.round(n * 12) : Math.round(n);
    return Math.min(HEIGHT_INCH_MAX, Math.max(HEIGHT_INCH_MIN, asInches));
  }
  return 65;
}

function parseAnnualIncomeLakhs(raw: string | undefined): number {
  if (!raw) return 10;
  const m = raw.match(/(\d+(\.\d+)?)/);
  if (!m) return 10;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return 10;
  return Math.min(ANNUAL_INCOME_MAX_LAKHS, Math.max(ANNUAL_INCOME_MIN_LAKHS, Math.round(n)));
}

function formatAnnualIncomeLakhs(value: number): string {
  return `${value} Lakhs`;
}

function DobInputWithPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const pickerRef = useRef<HTMLInputElement | null>(null);
  const [manual, setManual] = useState(String(value || ""));

  useEffect(() => {
    const v = String(value || "");
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      const ddmm = formatIsoToDobDdMmYyyy(v);
      if (ddmm) {
        setManual(ddmm);
        onChange(ddmm);
        return;
      }
    }
    setManual(v);
    // Sync parent when API sends ISO — only `value` in deps (onChange identity changes each render).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
      <div className="relative">
        <input
          type="text"
          value={manual}
          onChange={(e) => {
            const next = e.target.value;
            setManual(next);
            // Keep parent state in sync as user types so submit handlers
            // don't read stale/empty DOB when user clicks save immediately.
            onChange(next);
          }}
          onBlur={() => {
            const iso = parseDobDdMmYyyyToIso(manual);
            if (iso) {
              const normalized = formatIsoToDobDdMmYyyy(iso);
              setManual(normalized);
              onChange(normalized);
            }
          }}
          placeholder="dd/mm/yyyy"
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        />
        <button
          type="button"
          onClick={() => pickerRef.current?.showPicker?.()}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 hover:bg-gray-100"
          aria-label="Open date picker"
        >
          <Calendar size={16} />
        </button>
        <input
          ref={pickerRef}
          type="date"
          className="sr-only"
          onChange={(e) => {
            const ddmmyyyy = formatIsoToDobDdMmYyyy(e.target.value);
            if (!ddmmyyyy) return;
            setManual(ddmmyyyy);
            onChange(ddmmyyyy);
          }}
        />
      </div>
    </div>
  );
}

const LANGUAGE_SUGGESTIONS = [
  "Kannada",
  "English",
  "Hindi",
  "Marathi",
  "Tamil",
  "Telugu",
  "Tulu",
];

const COUNTRY_SUGGESTIONS = [
  "India",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "New Zealand",
  "Singapore",
  "United Arab Emirates",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
];

const RASHI_ZODIAC_OPTIONS = [
  "Mesha / Aries",
  "Vrishabha / Taurus",
  "Mithuna / Gemini",
  "Karka / Cancer",
  "Simha / Leo",
  "Kanya / Virgo",
  "Tula / Libra",
  "Vrischika / Scorpio",
  "Dhanu / Sagittarius",
  "Makara / Capricorn",
  "Kumbha / Aquarius",
  "Meena / Pisces",
] as const;

function splitCommaValues(raw?: string): string[] {
  return (raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinCommaValues(items: string[]): string {
  return items.join(", ");
}

type TimeOfDay = { hour: number; minute: number; period: "AM" | "PM" };
function parseTimeOfBirth(raw: string | undefined): TimeOfDay {
  if (!raw) return { hour: 10, minute: 0, period: "AM" };
  const m = raw.match(/^\s*(\d{1,2})[:.](\d{2})\s*(AM|PM|am|pm)?\s*$/);
  if (!m) return { hour: 10, minute: 0, period: "AM" };
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  let period: "AM" | "PM" = (m[3] || "AM").toUpperCase() as "AM" | "PM";
  if (!m[3]) {
    if (hour === 0) {
      hour = 12;
      period = "AM";
    } else if (hour === 12) {
      period = "PM";
    } else if (hour > 12) {
      hour -= 12;
      period = "PM";
    } else {
      period = "AM";
    }
  }
  if (hour < 1 || hour > 12) hour = 10;
  return { hour, minute: Number.isNaN(minute) ? 0 : minute, period };
}
function formatTimeOfBirth(t: TimeOfDay): string {
  const hh = String(t.hour).padStart(2, "0");
  const mm = String(t.minute).padStart(2, "0");
  return `${hh}:${mm} ${t.period}`;
}
function TimeOfBirthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = parseTimeOfBirth(value);
  const set = (patch: Partial<TimeOfDay>) => onChange(formatTimeOfBirth({ ...t, ...patch }));
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Time of Birth</label>
      <div className="inline-flex items-center gap-1.5">
        <select
          value={t.hour}
          onChange={(e) => set({ hour: Number(e.target.value) })}
          className="w-16 px-2 py-2 rounded-lg border border-[var(--border)] bg-white text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
          aria-label="Hour"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}
            </option>
          ))}
        </select>
        <span className="text-gray-400 font-semibold">:</span>
        <input
          type="number"
          min={0}
          max={59}
          value={String(t.minute).padStart(2, "0")}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isNaN(n)) return;
            set({ minute: Math.max(0, Math.min(59, n)) });
          }}
          className="w-16 px-2 py-2 rounded-lg border border-[var(--border)] bg-white text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
          aria-label="Minute"
        />
        <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden ml-1">
          {(["AM", "PM"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => set({ period: p })}
              className={`px-2.5 py-2 text-xs font-semibold transition ${
                t.period === p ? "bg-[var(--primary)] text-white" : "bg-white text-gray-600 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
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

  const updateContacts = (contacts: NonNullable<Profile["contacts"]>) => {
    const primary = contacts[0];
    onChange({
      contacts,
      contact: primary?.number || "",
      contactType: primary?.belongsTo || "",
    });
  };
  const normalizedCountry = (profile.country || "").trim().toLowerCase();
  const isIndiaSelected = normalizedCountry === "" || normalizedCountry === "india";
  const districtOptions = isIndiaSelected ? getIndiaDistrictsForState(profile.state || "") : [];

  return (
    <div className="space-y-6">
      {adminMode && (
        <Section title="Admin Controls" subtitle="Review controls and identity details" icon={BadgeCheck}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Member ID (Public ID)</label>
            <p className="px-4 py-3 rounded-xl border border-[var(--border)] bg-gray-50 text-gray-600">
              {profile.publicId || profile.memberId || "—"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Auto-generated. Format: LS + YY + MM + sequence</p>
          </div>
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

      <Section title="Basic Details" subtitle="Personal and cultural information" icon={Heart}>
        {(profile.managedBy === "parent" || profile.managedBy === "guardian") && (
          <div className="md:col-span-2 p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 text-sm text-gray-600">
            <p className="font-medium text-[var(--primary)]">Profile managed by {profile.accountHolderName || "parent/guardian"}</p>
          </div>
        )}
        <Input label="Full Name" value={profile.fullName || ""} onChange={(e) => update("fullName", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
          <div className="inline-flex gap-2">
            {[
              { v: "male", label: "Male" },
              { v: "female", label: "Female" },
            ].map((g) => {
              const active = profile.gender === g.v;
              return (
                <button
                  key={g.v}
                  type="button"
                  onClick={() => update("gender", g.v as "male" | "female")}
                  className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                    active
                      ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                      : "bg-white text-gray-700 border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
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
        <DobInputWithPicker
          value={profile.dateOfBirth || ""}
          onChange={(next) => update("dateOfBirth", next)}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Height</label>
          <SingleRangeSlider
            min={HEIGHT_INCH_MIN}
            max={HEIGHT_INCH_MAX}
            value={parseHeightToInches(profile.height)}
            onChange={(v) => update("height", inchesToFeetInches(v))}
            format={inchesToFeetInches}
            ariaLabel="Height"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mother Tongue</label>
          <TagPillInput
            values={profile.motherTongue ? [profile.motherTongue] : []}
            onChange={(next) => update("motherTongue", next[0] || "")}
            suggestions={LANGUAGE_SUGGESTIONS}
            maxTags={1}
            placeholder="Type mother tongue and press Enter"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Languages Known</label>
          <TagPillInput
            values={splitCommaValues(profile.languagesKnown)}
            onChange={(next) => update("languagesKnown", joinCommaValues(next))}
            suggestions={LANGUAGE_SUGGESTIONS}
            placeholder="Type language and press Enter/comma"
          />
        </div>
        <Input label="Caste" value={profile.caste || ""} onChange={(e) => update("caste", e.target.value)} />
        <SubCasteSelector value={profile.subCaste || ""} onChange={(v) => update("subCaste", v)} />
      </Section>

      <Section title="Horoscope Details" subtitle="Birth and astrology information" icon={Sparkles}>
        <TimeOfBirthPicker value={profile.timeOfBirth || ""} onChange={(v) => update("timeOfBirth", v)} />
        <Input label="Place of Birth" value={profile.placeOfBirth || ""} onChange={(e) => update("placeOfBirth", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rashi / Zodiac</label>
          <select
            value={profile.rashi || ""}
            onChange={(e) => update("rashi", e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Select rashi</option>
            {RASHI_ZODIAC_OPTIONS.map((rashi) => (
              <option key={rashi} value={rashi}>
                {rashi}
              </option>
            ))}
          </select>
        </div>
        <Input label="Nakshatra" placeholder="e.g. Bharani" value={profile.nakshatra || ""} onChange={(e) => update("nakshatra", e.target.value)} />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Horoscope Other Details</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={profile.horoscopeOtherDetails || ""}
            onChange={(e) => update("horoscopeOtherDetails", e.target.value)}
          />
        </div>
      </Section>

      <Section title="Education & Career" subtitle="Qualification and profession" icon={Briefcase}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Qualification</label>
          <TagPillInput
            values={splitCommaValues(profile.qualification)}
            onChange={(next) => update("qualification", joinCommaValues(next))}
            suggestions={EDUCATION_SUGGESTIONS}
            placeholder="Add degree and press Enter/comma"
          />
        </div>
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
        {adminMode ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Annual Income</label>
            <SingleRangeSlider
              min={ANNUAL_INCOME_MIN_LAKHS}
              max={ANNUAL_INCOME_MAX_LAKHS}
              value={parseAnnualIncomeLakhs(profile.annualIncome)}
              onChange={(v) => update("annualIncome", formatAnnualIncomeLakhs(v))}
              format={formatAnnualIncomeLakhs}
              ariaLabel="Annual Income"
            />
          </div>
        ) : (
          <Input
            label="Annual Income"
            placeholder="e.g. 10-12 Lakhs"
            value={profile.annualIncome || ""}
            onChange={(e) => update("annualIncome", e.target.value)}
          />
        )}
      </Section>

      <Section title="Family Details" subtitle="Parents, siblings and family context" icon={Users}>
        <Input label="Father's Name" value={profile.fatherName || ""} onChange={(e) => update("fatherName", e.target.value)} />
        <Input label="Father's Occupation" value={profile.fatherOccupation || ""} onChange={(e) => update("fatherOccupation", e.target.value)} />
        <Input label="Mother's Name" value={profile.motherName || ""} onChange={(e) => update("motherName", e.target.value)} />
        <Input label="Mother's Occupation" value={profile.motherOccupation || ""} onChange={(e) => update("motherOccupation", e.target.value)} />
        <Input label="Food Habits" placeholder="e.g. Vegetarian" value={profile.foodHabits || ""} onChange={(e) => update("foodHabits", e.target.value)} />
        <Input label="Sibling Details" value={profile.siblingDetails || ""} onChange={(e) => update("siblingDetails", e.target.value)} />
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">Family Other Details</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={profile.familyOtherDetails || ""}
            onChange={(e) => update("familyOtherDetails", e.target.value)}
          />
        </div>
      </Section>

      <Section title="About Me" subtitle="Self introduction and visibility" icon={UserRound}>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">About Me</label>
          <textarea
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[100px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            value={profile.aboutMe || ""}
            onChange={(e) => update("aboutMe", e.target.value)}
          />
        </div>
        <div className="md:col-span-2 flex items-center justify-between p-4 bg-gray-50 rounded-xl">
          <span className="font-medium">Show About Me to others</span>
          <button
            onClick={() => update("aboutMeVisible", !profile.aboutMeVisible)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${profile.aboutMeVisible ? "bg-[var(--primary)] text-white" : "bg-gray-200 text-gray-600"}`}
          >
            {profile.aboutMeVisible ? "Visible" : "Hidden"}
          </button>
        </div>
        <div className="md:col-span-2">
          <HobbiesSelector
            value={profile.hobbies || []}
            onChange={(hobbies) => update("hobbies", hobbies)}
          />
        </div>
      </Section>

      <Section title="Location & Contact" subtitle="Address and contact preferences" icon={MapPin}>
        <Input label="Address" value={profile.address || ""} onChange={(e) => update("address", e.target.value)} />
        <Input label="City" value={profile.city || ""} onChange={(e) => update("city", e.target.value)} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
          <SearchableSelect
            value={profile.country || ""}
            onChange={(v) => update("country", v)}
            options={COUNTRY_SUGGESTIONS}
            placeholder="Type country name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
          <SearchableSelect
            value={profile.state || ""}
            onChange={(v) => update("state", v)}
            options={isIndiaSelected ? INDIAN_STATES : []}
            placeholder={isIndiaSelected ? "Start typing your state..." : "Enter state / province"}
            emptyMessage={isIndiaSelected ? "No matching state found" : ""}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">District</label>
          <SearchableSelect
            value={profile.district || ""}
            onChange={(v) => update("district", v)}
            options={isIndiaSelected ? districtOptions : []}
            placeholder={isIndiaSelected ? "Start typing your district..." : "Enter district / county / region"}
            emptyMessage={isIndiaSelected ? "No matching district found" : ""}
          />
        </div>
        <div className="pt-1 md:col-span-2">
          <ContactsEditor
            accountPhone={profile.contact || ""}
            value={profile.contacts}
            onChange={updateContacts}
            max={3}
          />
        </div>
      </Section>

      <Section title="Profile Photos" subtitle="Primary and additional profile photos" icon={Camera}>
        {userId ? (
          <div className="md:col-span-2">
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
              primaryUrl={profile.profilePhoto}
              onSetPrimary={(url) => {
                if (url === profile.profilePhoto) return;
                onChange({
                  profilePhoto: url,
                  photos: [
                    ...(profile.profilePhoto ? [profile.profilePhoto] : []),
                    ...(profile.photos || []).filter((p) => p !== url && p !== profile.profilePhoto),
                  ],
                });
              }}
              userId={userId}
              profileId={profile.id}
            />
          </div>
        ) : (
          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
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
          </div>
        )}
      </Section>

      <Section title="KYC Documents" subtitle="Identity verification uploads" icon={FileCheck2}>
        <p className="md:col-span-2 text-sm text-gray-600">
          Upload Aadhar, Voter ID, PAN, or any government-issued ID for verification.
          Admins may use these documents while deciding approval.
        </p>
        {userId ? (
          <div className="md:col-span-2">
            <KycDocumentsUpload
              profileId={profile.id}
              userId={userId}
              adminMode={adminMode}
            />
          </div>
        ) : (
          <p className="md:col-span-2 text-sm text-gray-500">
            Save the profile first to enable document upload.
          </p>
        )}
      </Section>
    </div>
  );
}
