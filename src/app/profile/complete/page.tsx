"use client";

import { Suspense, useEffect, useMemo, useState, ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Heart,
  ChevronLeft,
  Eye,
  EyeOff,
  User as UserIcon,
  IdCard,
  Sparkles,
  GraduationCap,
  Users,
  Camera,
  Check,
  Calendar,
  MapPin,
  Phone,
  Briefcase,
  Building2,
  Languages,
  Ruler,
  Utensils,
  Star,
  Clock,
  AlertCircle,
  HeartHandshake,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { HobbiesSelector } from "@/components/ui/HobbiesSelector";
import { PhotoUpload } from "@/components/PhotoUpload";
import { useAuth } from "@/contexts/AuthContext";
import { Profile, ProfileContact } from "@/types";
import {
  PROFESSION_TYPES,
  FOOD_HABITS_OPTIONS,
} from "@/data/constants";
import { SubCasteSelector } from "@/components/ui/SubCasteSelector";
import { StateSelect } from "@/components/ui/StateSelect";
import { ContactsEditor } from "@/components/ui/ContactsEditor";
import { PartnerPreferencesForm } from "@/components/PartnerPreferencesForm";
import {
  DualRangeSlider,
  SingleRangeSlider,
} from "@/components/ui/RangeSlider";
import { syntheticEmailForPhone } from "@/lib/phoneAuth";
import {
  createProfile,
  updateProfileById,
  getProfileById,
} from "@/lib/api/profiles";

interface StepDef {
  id: number;
  title: string;
  subtitle: string;
  icon: LucideIcon;
}

const steps: StepDef[] = [
  { id: 1, title: "About", subtitle: "A short intro & interests", icon: UserIcon },
  { id: 2, title: "Profile Details", subtitle: "Personal & cultural info", icon: IdCard },
  { id: 3, title: "Horoscope", subtitle: "Birth chart details", icon: Sparkles },
  { id: 4, title: "Education & Career", subtitle: "Studies and work", icon: GraduationCap },
  { id: 5, title: "Family", subtitle: "Family background & contact", icon: Users },
  { id: 6, title: "Partner Preferences", subtitle: "What you're looking for", icon: HeartHandshake },
  { id: 7, title: "Photos", subtitle: "Add up to 5 photos", icon: Camera },
];

type Relationship = NonNullable<Profile["relationship"]>;
const VALID_RELATIONSHIPS: Relationship[] = [
  "self",
  "son",
  "daughter",
  "brother",
  "sister",
  "other",
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

/** Required-field label (red asterisk) */
function RequiredLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1">
      {children}
      <span className="text-red-500" aria-label="required">*</span>
    </span>
  );
}

/** Reusable card for grouping a section of fields */
function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white p-5 sm:p-6 shadow-sm">
      <div className="flex items-start gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
          <Icon size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

/** Field with leading icon for plain inputs (used when we want an icon prefix) */
function IconField({
  icon: Icon,
  label,
  required,
  children,
}: {
  icon: LucideIcon;
  label: ReactNode;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        <span className="inline-flex items-center gap-1.5">
          <Icon size={14} className="text-gray-400" />
          {label}
          {required && <span className="text-red-500">*</span>}
        </span>
      </label>
      {children}
    </div>
  );
}

const selectClass =
  "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all";

/* ----------------------------- helpers ----------------------------- */

const HEIGHT_INCH_MIN = 48; // 4'0"
const HEIGHT_INCH_MAX = 84; // 7'0"
const INCOME_MIN_L = 0;
const INCOME_MAX_L = 100;

function inchesToFeetInches(total: number): string {
  const ft = Math.floor(total / 12);
  const inch = total % 12;
  return `${ft}'${inch}"`;
}

function parseHeightToInches(raw: string | undefined): number | null {
  if (!raw) return null;
  const m1 = raw.match(/^(\d+)\s*[.'’ft]+\s*(\d+)?/i);
  if (m1) {
    const ft = Number(m1[1] || 0);
    const inch = Number(m1[2] || 0);
    return ft * 12 + inch;
  }
  const n = Number(raw);
  if (!isNaN(n)) {
    if (n < 12) return Math.round(n * 12);
    return Math.round(n);
  }
  return null;
}

function formatLakhsLabel(l: number): string {
  if (l <= 0) return "Open";
  if (l >= INCOME_MAX_L) return "₹1Cr+";
  if (l >= 100) return `₹${(l / 100).toFixed(1)}Cr`;
  return `₹${l}L`;
}

function parseIncomeRange(raw: string | undefined): { lo: number; hi: number } {
  // Stored as e.g. "5-15 Lakhs" or "10L-25L". Best effort parse with sane defaults.
  if (!raw) return { lo: 5, hi: 15 };
  const matches = raw.match(/(\d+(?:\.\d+)?)/g);
  if (!matches || matches.length === 0) return { lo: 5, hi: 15 };
  const lo = Math.round(Number(matches[0]));
  const hi = Math.round(Number(matches[1] || matches[0]));
  return {
    lo: Math.max(0, Math.min(INCOME_MAX_L, lo)),
    hi: Math.max(0, Math.min(INCOME_MAX_L, Math.max(lo, hi))),
  };
}

function formatIncomeRange(lo: number, hi: number): string {
  if (lo <= 0 && hi >= INCOME_MAX_L) return "Open";
  const a = formatLakhsLabel(lo).replace("Open", "0L");
  const b = formatLakhsLabel(hi);
  return `${a} – ${b}`;
}

/** "10:30 AM" <-> { hour: 10, minute: 30, period: "AM" } */
type TimeOfDay = { hour: number; minute: number; period: "AM" | "PM" };
function parseTimeOfBirth(raw: string | undefined): TimeOfDay {
  if (!raw) return { hour: 10, minute: 0, period: "AM" };
  const m = raw.match(/^\s*(\d{1,2})[:.](\d{2})\s*(AM|PM|am|pm)?\s*$/);
  if (!m) return { hour: 10, minute: 0, period: "AM" };
  let hour = Number(m[1]);
  const minute = Number(m[2]);
  let period: "AM" | "PM" = (m[3] || "AM").toUpperCase() as "AM" | "PM";
  if (!m[3]) {
    // 24-hour input — convert
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
  return { hour, minute: isNaN(minute) ? 0 : minute, period };
}

function formatTimeOfBirth(t: TimeOfDay): string {
  const hh = String(t.hour).padStart(2, "0");
  const mm = String(t.minute).padStart(2, "0");
  return `${hh}:${mm} ${t.period}`;
}

/** Inline chip-group for single-select / multi-select choices. */
function ChipChoice({
  options,
  value,
  onChange,
  multiple = false,
}: {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  multiple?: boolean;
}) {
  const sel = multiple
    ? (value || "").split(",").map((s) => s.trim()).filter(Boolean)
    : value
    ? [value]
    : [];
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = sel.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (!multiple) {
                onChange(isOn ? "" : opt);
                return;
              }
              const next = isOn
                ? sel.filter((s) => s !== opt)
                : [...sel, opt];
              onChange(next.join(", "));
            }}
            className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
              isOn
                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                : "bg-white text-gray-700 border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
            }`}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Time picker — hour (1-12), minute (0-59 step 5), AM/PM. */
function TimeOfBirthPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (next: string) => void;
}) {
  const t = parseTimeOfBirth(value);
  const set = (patch: Partial<TimeOfDay>) =>
    onChange(formatTimeOfBirth({ ...t, ...patch }));
  return (
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
      <select
        value={t.minute}
        onChange={(e) => set({ minute: Number(e.target.value) })}
        className="w-16 px-2 py-2 rounded-lg border border-[var(--border)] bg-white text-sm tabular-nums focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
        aria-label="Minute"
      >
        {Array.from({ length: 12 }, (_, i) => i * 5).map((m) => (
          <option key={m} value={m}>
            {String(m).padStart(2, "0")}
          </option>
        ))}
      </select>
      <div className="inline-flex rounded-lg border border-[var(--border)] overflow-hidden ml-1">
        {(["AM", "PM"] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set({ period: p })}
            className={`px-2.5 py-2 text-xs font-semibold transition ${
              t.period === p
                ? "bg-[var(--primary)] text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function ProfileCompleteInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { authUser, accountMeta, isLoggedIn, loading: authLoading } = useAuth();

  const profileIdParam = searchParams.get("profileId") || "";
  const relationshipParam = (searchParams.get("relationship") || "").toLowerCase();
  const relationshipFromUrl: Relationship | undefined = VALID_RELATIONSHIPS.includes(
    relationshipParam as Relationship
  )
    ? (relationshipParam as Relationship)
    : undefined;

  const isEditMode = !!profileIdParam;
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<Profile>>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hydrating, setHydrating] = useState(isEditMode);

  const { title, subtitle, badgeLabel } = useMemo(() => {
    if (isEditMode) {
      return {
        title: "Edit Profile",
        subtitle: "Update profile details",
        badgeLabel: "Editing",
      };
    }
    if (relationshipFromUrl) {
      const map: Record<Relationship, { title: string; badge: string }> = {
        self: { title: "Create Your Profile", badge: "Self" },
        son: { title: "Create Son's Profile", badge: "Son" },
        daughter: { title: "Create Daughter's Profile", badge: "Daughter" },
        brother: { title: "Create Brother's Profile", badge: "Brother" },
        sister: { title: "Create Sister's Profile", badge: "Sister" },
        other: { title: "Create Dependent Profile", badge: "Dependent" },
      };
      const item = map[relationshipFromUrl];
      return {
        title: item.title,
        subtitle: "Tell us a few details — you can edit anything later",
        badgeLabel: item.badge,
      };
    }
    return {
      title: "Create Profile",
      subtitle: "Tell us a few details — you can edit anything later",
      badgeLabel: "New",
    };
  }, [isEditMode, relationshipFromUrl]);

  useEffect(() => {
    if (!authLoading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [authLoading, isLoggedIn, router]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      if (isEditMode) {
        setHydrating(true);
        const { data, error: fetchErr } = await getProfileById(profileIdParam);
        if (cancelled) return;
        if (fetchErr || !data) {
          setError(fetchErr || "Profile not found");
          setHydrating(false);
          return;
        }
        setProfile({ ...initialProfile, ...data });
        setHydrating(false);
        return;
      }

      const base: Partial<Profile> = { ...initialProfile };
      if (relationshipFromUrl) base.relationship = relationshipFromUrl;

      if (accountMeta) {
        if (!base.contact && accountMeta.phone) base.contact = accountMeta.phone;
        if (!base.email && authUser?.email) base.email = authUser.email;
      }
      if (relationshipFromUrl === "self" && accountMeta) {
        if (accountMeta.fullName) base.fullName = accountMeta.fullName;
        if (accountMeta.gender) base.gender = accountMeta.gender;
        if (accountMeta.city) base.city = accountMeta.city;
        if (accountMeta.dateOfBirth) base.dateOfBirth = accountMeta.dateOfBirth;
        base.managedBy = "self";
      } else if (relationshipFromUrl) {
        base.managedBy = relationshipFromUrl === "other" ? "guardian" : "parent";
        if (accountMeta?.fullName) base.accountHolderName = accountMeta.fullName;
      }

      setProfile(base);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, profileIdParam, relationshipFromUrl, accountMeta, authUser]);

  const update = (key: keyof Profile, value: string | boolean | string[]) => {
    setProfile((p) => ({ ...p, [key]: value }));
  };

  const updateContacts = (next: ProfileContact[]) => {
    setProfile((p) => ({
      ...p,
      contacts: next,
      // Keep legacy `contact` / `contactType` columns in sync with the primary
      // contact entry so older read paths and search filters keep working.
      contact: next[0]?.number ?? p.contact ?? "",
      contactType:
        next[0]?.belongsTo === "Other"
          ? next[0]?.belongsToOther || "Other"
          : next[0]?.belongsTo ?? p.contactType ?? "Personal",
    }));
  };

  const goToStep = (n: number) => {
    if (n >= 1 && n <= steps.length) setStep(n);
  };

  const next = async () => {
    setError("");
    if (step < steps.length) {
      setStep(step + 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    const fullName = (profile.fullName || "").trim();
    const dateOfBirth = profile.dateOfBirth || "";
    const gender = profile.gender;

    if (!fullName || !dateOfBirth || !gender) {
      setError("Full Name, Date of Birth, and Gender are required.");
      setStep(2);
      return;
    }

    if (!authUser) {
      setError("Session expired. Please log in again.");
      return;
    }

    const email =
      profile.email ||
      (accountMeta?.phone
        ? syntheticEmailForPhone(accountMeta.phone.replace(/\D/g, "").slice(-10))
        : authUser.email || `user_${authUser.id}@profile.lingayatshaadi`);

    setSaving(true);
    const payload: Partial<Profile> = {
      ...profile,
      email,
      fullName,
      dateOfBirth,
      gender: gender as Profile["gender"],
    };
    if (!payload.relationship && relationshipFromUrl) {
      payload.relationship = relationshipFromUrl;
    }

    // try/finally guarantees the button never stays stuck on "Saving..."
    // even if the underlying API helper throws or the network drops.
    let saved: Profile | null = null;
    let saveErr: string | null = null;
    try {
      const res = isEditMode
        ? await updateProfileById(profileIdParam, payload)
        : await createProfile(authUser.id, payload);
      saved = res.data;
      saveErr = res.error;
    } catch (err) {
      saveErr = err instanceof Error ? err.message : "Failed to save profile";
    } finally {
      setSaving(false);
    }

    if (saveErr || !saved) {
      setError(saveErr || "Failed to save profile");
      return;
    }

    router.push("/account");
  };

  const prev = () => {
    if (step > 1) {
      setStep(step - 1);
      if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push("/account");
    }
  };

  if (authLoading || hydrating) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const currentStep = steps[step - 1];
  const StepIcon = currentStep.icon;
  const progressPct = (step / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[var(--background)] via-white to-[var(--background)]">
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-20">
        <button
          onClick={prev}
          className="flex items-center gap-2 text-gray-700 hover:text-[var(--primary)] transition-colors"
        >
          <ChevronLeft size={22} />
          <span className="font-medium hidden sm:inline">Back</span>
        </button>
        <Link href="/" className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-[var(--primary)] fill-[var(--primary)]" />
          <span className="font-bold text-[var(--primary)]">LingayatShaadi</span>
        </Link>
        <div className="w-16 sm:w-20 text-right text-xs text-gray-500">
          {Math.round(progressPct)}%
        </div>
      </header>

      <div className="px-4 sm:px-6 py-6 max-w-3xl mx-auto">
        {/* Hero */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-semibold">
              <Heart size={12} className="fill-[var(--primary)]" />
              {badgeLabel}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
              Step {step} of {steps.length}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          {/* Compact (mobile) progress bar */}
          <div className="sm:hidden">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)] text-white flex items-center justify-center shrink-0">
                <StepIcon size={20} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 truncate">{currentStep.title}</p>
                <p className="text-xs text-gray-500 truncate">{currentStep.subtitle}</p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-light)] transition-all duration-500"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Full stepper (desktop / tablet) — compact, no wrapping */}
          <div className="hidden sm:block">
            <ol className="flex items-center w-full">
              {steps.map((s, idx) => {
                const isDone = s.id < step;
                const isActive = s.id === step;
                const Icon = s.icon;
                return (
                  <li
                    key={s.id}
                    className={`flex items-center ${
                      idx < steps.length - 1 ? "flex-1" : ""
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => isDone && goToStep(s.id)}
                      disabled={!isDone}
                      className="group disabled:cursor-default shrink-0"
                      title={s.title}
                      aria-label={`Step ${s.id}: ${s.title}`}
                      aria-current={isActive ? "step" : undefined}
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                          isActive
                            ? "bg-[var(--primary)] border-[var(--primary)] text-white shadow-md shadow-[var(--primary)]/30"
                            : isDone
                            ? "bg-[var(--primary)]/10 border-[var(--primary)] text-[var(--primary)] group-hover:bg-[var(--primary)]/20"
                            : "bg-white border-gray-300 text-gray-400"
                        }`}
                      >
                        {isDone ? <Check size={16} /> : <Icon size={16} />}
                      </div>
                    </button>
                    {idx < steps.length - 1 && (
                      <div
                        className={`flex-1 h-[3px] mx-1.5 rounded-full transition-colors ${
                          s.id < step
                            ? "bg-[var(--primary)]"
                            : "bg-gray-200"
                        }`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
            <div className="mt-3 text-center">
              <p className="text-sm font-semibold text-gray-900">
                {currentStep.title}
              </p>
              <p className="text-xs text-gray-500">{currentStep.subtitle}</p>
            </div>
          </div>
        </div>

        {/* Step body */}
        <div className="space-y-5">
          {step === 1 && (
            <SectionCard
              icon={UserIcon}
              title="Tell us about yourself"
              description="A great intro helps you stand out"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">About Me</label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all min-h-[140px] resize-y"
                  placeholder="Share your personality, values, and what you're looking for..."
                  value={profile.aboutMe || ""}
                  onChange={(e) => update("aboutMe", e.target.value)}
                  maxLength={1000}
                />
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">Tip: Keep it warm and authentic</span>
                  <span className="text-xs text-gray-400">{(profile.aboutMe || "").length}/1000</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[var(--primary)]/5 to-transparent rounded-xl border border-[var(--border)]">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center text-[var(--primary)] shrink-0">
                    {profile.aboutMeVisible ? <Eye size={18} /> : <EyeOff size={18} />}
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">Show &ldquo;About Me&rdquo; to others</p>
                    <p className="text-xs text-gray-500">Toggle visibility on your public profile</p>
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={!!profile.aboutMeVisible}
                  onClick={() => update("aboutMeVisible", !profile.aboutMeVisible)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    profile.aboutMeVisible ? "bg-[var(--primary)]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                      profile.aboutMeVisible ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <span className="inline-flex items-center gap-1.5">
                    <Star size={14} className="text-gray-400" />
                    Hobbies and Interests
                  </span>
                </label>
                <HobbiesSelector
                  value={profile.hobbies || []}
                  onChange={(hobbies) => update("hobbies", hobbies)}
                />
              </div>
            </SectionCard>
          )}

          {step === 2 && (
            <SectionCard
              icon={IdCard}
              title="Profile Details"
              description="Personal & cultural background"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label={<RequiredLabel>Full Name</RequiredLabel>}
                  value={profile.fullName || ""}
                  onChange={(e) => update("fullName", e.target.value)}
                  placeholder="Profile holder's name"
                />
                <IconField icon={UserIcon} label="Gender" required>
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
                          onClick={() =>
                            update("gender", g.v as "male" | "female")
                          }
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
                </IconField>
                <IconField icon={Calendar} label="Date of Birth" required>
                  <input
                    type="date"
                    value={profile.dateOfBirth || ""}
                    onChange={(e) => update("dateOfBirth", e.target.value)}
                    className={selectClass}
                  />
                </IconField>
                <IconField icon={Heart} label="Marital Status">
                  <select
                    value={profile.maritalStatus || ""}
                    onChange={(e) => update("maritalStatus", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select marital status</option>
                    <option value="Never Married">Never Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                    <option value="Separated">Separated</option>
                    <option value="Awaiting Divorce">Awaiting Divorce</option>
                  </select>
                </IconField>
                <Input
                  label="Caste"
                  value={profile.caste || ""}
                  onChange={(e) => update("caste", e.target.value)}
                />
                <SubCasteSelector
                  value={profile.subCaste || ""}
                  onChange={(v) => update("subCaste", v)}
                />
                <IconField icon={Ruler} label="Height">
                  <SingleRangeSlider
                    min={HEIGHT_INCH_MIN}
                    max={HEIGHT_INCH_MAX}
                    value={
                      parseHeightToInches(profile.height) ?? 65 /* 5'5" */
                    }
                    onChange={(v) =>
                      update("height", inchesToFeetInches(v))
                    }
                    format={inchesToFeetInches}
                    ariaLabel="Height"
                    className="px-1"
                  />
                </IconField>
                <IconField icon={Languages} label="Mother Tongue">
                  <input
                    placeholder="e.g. Kannada"
                    value={profile.motherTongue || ""}
                    onChange={(e) => update("motherTongue", e.target.value)}
                    className={selectClass}
                  />
                </IconField>
                <div className="sm:col-span-2">
                  <IconField icon={Languages} label="Languages Known">
                    <input
                      placeholder="e.g. Kannada, Hindi, English"
                      value={profile.languagesKnown || ""}
                      onChange={(e) => update("languagesKnown", e.target.value)}
                      className={selectClass}
                    />
                  </IconField>
                </div>
              </div>
            </SectionCard>
          )}

          {step === 3 && (
            <SectionCard
              icon={Sparkles}
              title="Horoscope"
              description="Optional — fill what you know"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IconField icon={Clock} label="Time of Birth">
                  <TimeOfBirthPicker
                    value={profile.timeOfBirth || ""}
                    onChange={(v) => update("timeOfBirth", v)}
                  />
                </IconField>
                <IconField icon={MapPin} label="Place of Birth">
                  <input
                    placeholder="City, State"
                    value={profile.placeOfBirth || ""}
                    onChange={(e) => update("placeOfBirth", e.target.value)}
                    className={selectClass}
                  />
                </IconField>
                <Input
                  label="Rashi"
                  placeholder="e.g. Mesha"
                  value={profile.rashi || ""}
                  onChange={(e) => update("rashi", e.target.value)}
                />
                <Input
                  label="Nakshatra"
                  placeholder="e.g. Bharani"
                  value={profile.nakshatra || ""}
                  onChange={(e) => update("nakshatra", e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Horoscope Other Details
                </label>
                <textarea
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all min-h-[100px] resize-y"
                  placeholder="Manglik, charana, gana, etc."
                  value={profile.horoscopeOtherDetails || ""}
                  onChange={(e) => update("horoscopeOtherDetails", e.target.value)}
                />
              </div>
            </SectionCard>
          )}

          {step === 4 && (
            <SectionCard
              icon={GraduationCap}
              title="Education & Career"
              description="Studies, profession and earnings"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <IconField icon={GraduationCap} label="Qualification">
                  <input
                    placeholder="e.g. B.Tech, M.Sc"
                    value={profile.qualification || ""}
                    onChange={(e) => update("qualification", e.target.value)}
                    className={selectClass}
                  />
                </IconField>
                <IconField icon={Briefcase} label="Profession Type">
                  <select
                    value={profile.professionType || ""}
                    onChange={(e) => update("professionType", e.target.value)}
                    className={selectClass}
                  >
                    <option value="">Select profession type</option>
                    {PROFESSION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </IconField>
                <Input
                  label="Profession"
                  placeholder="e.g. Software Engineer"
                  value={profile.profession || ""}
                  onChange={(e) => update("profession", e.target.value)}
                />
                <IconField icon={Building2} label="Company Name">
                  <input
                    placeholder="e.g. Acme Corp"
                    value={profile.companyName || ""}
                    onChange={(e) => update("companyName", e.target.value)}
                    className={selectClass}
                  />
                </IconField>
                <div className="sm:col-span-2">
                  <IconField icon={Briefcase} label="Annual Income">
                    {(() => {
                      const { lo, hi } = parseIncomeRange(profile.annualIncome);
                      return (
                        <DualRangeSlider
                          min={INCOME_MIN_L}
                          max={INCOME_MAX_L}
                          step={1}
                          valueMin={lo}
                          valueMax={hi}
                          onChange={(a, b) =>
                            update("annualIncome", formatIncomeRange(a, b))
                          }
                          format={formatLakhsLabel}
                          ariaLabelMin="Minimum income"
                          ariaLabelMax="Maximum income"
                          className="px-1"
                        />
                      );
                    })()}
                    <p className="mt-0.5 text-[11px] text-gray-500">
                      Drag both ends. ₹0L means open to any.
                    </p>
                  </IconField>
                </div>
              </div>
            </SectionCard>
          )}

          {step === 5 && (
            <>
              <SectionCard icon={Users} title="Family" description="Parents and siblings">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Father's Name"
                    value={profile.fatherName || ""}
                    onChange={(e) => update("fatherName", e.target.value)}
                  />
                  <Input
                    label="Father's Occupation"
                    value={profile.fatherOccupation || ""}
                    onChange={(e) => update("fatherOccupation", e.target.value)}
                  />
                  <Input
                    label="Mother's Name"
                    value={profile.motherName || ""}
                    onChange={(e) => update("motherName", e.target.value)}
                  />
                  <Input
                    label="Mother's Occupation"
                    value={profile.motherOccupation || ""}
                    onChange={(e) => update("motherOccupation", e.target.value)}
                  />
                  <div className="sm:col-span-2">
                    <IconField icon={Utensils} label="Food Habits">
                      <ChipChoice
                        options={FOOD_HABITS_OPTIONS}
                        value={profile.foodHabits || ""}
                        onChange={(v) => update("foodHabits", v)}
                      />
                    </IconField>
                  </div>
                  <Input
                    label="Sibling Details"
                    placeholder="e.g. 1 elder brother (married)"
                    value={profile.siblingDetails || ""}
                    onChange={(e) => update("siblingDetails", e.target.value)}
                  />
                </div>
              </SectionCard>

              <SectionCard icon={MapPin} title="Address" description="Where this profile is based">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <Input
                      label="Address"
                      value={profile.address || ""}
                      onChange={(e) => update("address", e.target.value)}
                    />
                  </div>
                  <Input
                    label="City"
                    value={profile.city || ""}
                    onChange={(e) => update("city", e.target.value)}
                  />
                  <Input
                    label="District"
                    value={profile.district || ""}
                    onChange={(e) => update("district", e.target.value)}
                  />
                  <IconField icon={MapPin} label="State">
                    <StateSelect
                      value={profile.state || ""}
                      onChange={(v) => update("state", v)}
                    />
                  </IconField>
                  <Input
                    label="Country"
                    value={profile.country || ""}
                    onChange={(e) => update("country", e.target.value)}
                  />
                </div>
              </SectionCard>

              <SectionCard
                icon={Phone}
                title="Contact Details"
                description="Account contact + up to 2 alternate numbers. Choose what's visible on the public profile."
              >
                <ContactsEditor
                  accountPhone={accountMeta?.phone || profile.contact || ""}
                  value={profile.contacts}
                  onChange={updateContacts}
                  max={3}
                />
                <p className="text-xs text-gray-500 leading-relaxed">
                  Tip: Toggle the eye icon to keep a number private. Use the
                  <span className="font-medium"> Call / WhatsApp / SMS </span>
                  tags to tell others how you prefer to be reached.
                </p>
              </SectionCard>
            </>
          )}

          {step === 6 && (
            <PartnerPreferencesForm
              value={profile.partnerPreference}
              onChange={(next) =>
                setProfile((p) => ({ ...p, partnerPreference: next }))
              }
            />
          )}

          {step === 7 && (
            <SectionCard
              icon={Camera}
              title="Profile Photos"
              description="Add up to 5 photos. The first photo is your primary."
            >
              <div className="rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 p-3 text-xs text-gray-700 mb-3 flex gap-2">
                <Camera size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
                <span>
                  Images are auto-compressed and converted to <strong>WebP</strong> for fast loading. Use clear, well-lit photos for best results.
                </span>
              </div>
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
                userId={authUser?.id || profileIdParam || "new-user"}
              />
            </SectionCard>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Sticky footer nav */}
        <div className="sticky bottom-0 mt-8 -mx-4 sm:-mx-6 px-4 sm:px-6 py-4 bg-white/95 backdrop-blur border-t border-[var(--border)]">
          <div className="max-w-3xl mx-auto flex items-center gap-3">
            <Button
              variant="outline"
              onClick={prev}
              className="flex-1 sm:flex-none sm:px-8"
              disabled={saving}
            >
              {step === 1 ? "Cancel" : "Back"}
            </Button>
            <div className="flex-1 hidden sm:block text-center text-xs text-gray-500">
              {currentStep.title} • {currentStep.subtitle}
            </div>
            <Button
              onClick={next}
              className="flex-1 sm:flex-none sm:px-8"
              disabled={saving}
            >
              {step === steps.length
                ? saving
                  ? "Saving..."
                  : isEditMode
                  ? "Save Changes"
                  : "Create Profile"
                : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProfileCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[400px] flex items-center justify-center">
          <div className="animate-pulse text-gray-500">Loading...</div>
        </div>
      }
    >
      <ProfileCompleteInner />
    </Suspense>
  );
}
