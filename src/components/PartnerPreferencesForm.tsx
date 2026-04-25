"use client";

/**
 * Modern, mobile-first Partner Preferences form.
 *
 * Replaces the old text-input-heavy layout with:
 *  - Collapsible accordion sections (only first open by default)
 *  - Custom dual-range sliders for Age, Height, Annual Income (no overlap bug)
 *  - Choice-chip groups for marital status, education, food habits
 *  - Searchable single-select for caste, multi-select chips for sub-caste,
 *    profession, preferred state — with custom "Others" support
 *  - Live progress indicator + Reset button
 *
 * The component is fully controlled — `value` is the current `PartnerPreference`
 * object and `onChange` receives the next snapshot. No internal persistence;
 * the host decides when/how to save.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Search,
  Sparkles,
  Heart,
  GraduationCap,
  MapPin,
  Users,
  RotateCcw,
  Check,
  X,
  Plus,
  Eye,
  EyeOff,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import type { PartnerPreference } from "@/types";
import {
  MARITAL_STATUS_OPTIONS,
  PROFESSION_TYPES,
  SUB_CASTE_OPTIONS,
  FOOD_HABITS_OPTIONS,
  INDIAN_STATES,
} from "@/data/constants";
import { DualRangeSlider } from "@/components/ui/RangeSlider";

interface PartnerPreferencesFormProps {
  value: PartnerPreference | undefined;
  onChange: (next: PartnerPreference) => void;
  /** Optional helper text shown below the title */
  description?: string;
  /** Hide the inner header (title + reset). Useful when host already provides one. */
  hideHeader?: boolean;
  /** Visibility flag controlling the "Show on my profile" toggle. */
  showOnProfile?: boolean;
  /** Fired when the user flips the visibility toggle. */
  onShowOnProfileChange?: (next: boolean) => void;
  /**
   * When true, renders a dismissable banner explaining that the form was
   * pre-filled from the user's own profile. Owned by the host so dismissal
   * state can be persisted to localStorage.
   */
  showSmartDefaultsBanner?: boolean;
  /** Called when the user dismisses the smart-defaults banner. */
  onDismissSmartDefaultsBanner?: () => void;
  /**
   * Optional handler for the "Reset to suggestions" affordance. When provided
   * the Reset button uses this; otherwise it falls back to clearing all
   * fields (legacy behavior).
   */
  onResetToSuggested?: () => void;
}

const AGE_MIN = 18;
const AGE_MAX = 60;

/** Height is stored in inches internally for slider math, displayed as 5'2" */
const HEIGHT_INCH_MIN = 48; // 4'0"
const HEIGHT_INCH_MAX = 84; // 7'0"

/** Annual income captured in lakhs (₹L). 0 = Any, 100 = ₹1Cr+ */
const INCOME_MIN_L = 0;
const INCOME_MAX_L = 100;

const CASTE_OPTIONS = [
  "Lingayat",
  "Veerashaiva",
  "Brahmin",
  "Kshatriya",
  "Vaishya",
  "Vokkaliga",
  "Reddy",
  "Maratha",
  "Kuruba",
  "Other",
];

/** Education chips — MBA removed per product feedback. */
const EDUCATION_CHIP_OPTIONS = [
  "Graduate",
  "Post Graduate",
  "Doctorate",
  "Any",
];

type SectionKey = "basic" | "community" | "career" | "lifestyle";

/* ------------------------------ helpers ------------------------------ */

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

function formatLakhs(l: number): string {
  if (l <= 0) return "Any";
  if (l >= INCOME_MAX_L) return "₹1Cr+";
  if (l >= 100) return `₹${(l / 100).toFixed(1)}Cr`;
  return `₹${l}L`;
}

function parseLakhs(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/(\d+(?:\.\d+)?)\s*(L|Cr|cr|l)?/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = (m[2] || "L").toLowerCase();
  return unit === "cr" ? Math.round(n * 100) : Math.round(n);
}

function splitCsv(v: string | undefined): string[] {
  return (v || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function joinCsv(arr: string[]): string {
  return arr.filter(Boolean).join(", ");
}

/* ------------------------------ atoms ------------------------------ */

function Section({
  id,
  icon: Icon,
  title,
  subtitle,
  open,
  onToggle,
  filledCount,
  children,
}: {
  id: SectionKey;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  open: boolean;
  onToggle: (id: SectionKey) => void;
  filledCount: number;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => onToggle(id)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left hover:bg-gray-50 transition"
      >
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center shrink-0">
          <Icon size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm sm:text-base">
              {title}
            </h3>
            {filledCount > 0 && (
              <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                {filledCount} set
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
        </div>
        <ChevronDown
          size={20}
          className={`text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-4 sm:px-5 pb-5 pt-1 border-t border-[var(--border)]">
          <div className="space-y-5">{children}</div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium text-gray-800">{label}</label>
        {hint && <span className="text-xs text-gray-500">{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ChipGroup({
  options,
  selected,
  onToggle,
  multiple = false,
}: {
  options: readonly string[] | string[];
  selected: string[];
  onToggle: (next: string[]) => void;
  multiple?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isOn = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => {
              if (!multiple) {
                onToggle(isOn ? [] : [opt]);
                return;
              }
              onToggle(
                isOn ? selected.filter((s) => s !== opt) : [...selected, opt]
              );
            }}
            className={`px-3 py-2 rounded-full text-sm font-medium border transition-all ${
              isOn
                ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                : "bg-white text-gray-700 border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/5"
            }`}
          >
            {isOn && <Check size={14} className="inline -mt-0.5 mr-1" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

/** Searchable single-select dropdown with optional clear. */
function SearchSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return (options as string[]).filter((o) => o.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={`w-full min-h-[48px] px-4 py-3 rounded-xl border text-left flex items-center justify-between gap-2 transition ${
          disabled
            ? "bg-gray-50 border-[var(--border)] text-gray-400 cursor-not-allowed"
            : "bg-white border-[var(--border)] hover:border-[var(--primary)]/40 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
        }`}
      >
        <span className={value ? "text-gray-900" : "text-gray-500"}>
          {value || placeholder}
        </span>
        <ChevronDown
          size={18}
          className={`text-gray-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-30 mt-2 left-0 right-0 bg-white border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
          <div className="p-2 border-b border-[var(--border)] bg-white sticky top-0">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
              />
            </div>
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  setQuery("");
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50"
              >
                Clear selection
              </button>
            )}
            {(filtered as string[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                  setQuery("");
                }}
                className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between ${
                  value === opt
                    ? "bg-[var(--primary)]/5 text-[var(--primary)] font-medium"
                    : "text-gray-700"
                }`}
              >
                <span>{opt}</span>
                {value === opt && <Check size={16} />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-3 text-sm text-gray-500">No matches.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Multi-select chip picker with a searchable dropdown.
 *
 *  - Selected entries render as removable pills above the input.
 *  - Built-in `Others` workflow lets the user type any custom value;
 *    on Enter / "Add" it's appended to the list.
 *  - Free-typed values that don't match an option are also addable.
 */
function MultiChipPicker({
  value,
  onChange,
  options,
  placeholder = "Add...",
  disabled = false,
  allowCustom = true,
  emptyHint,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  options: readonly string[] | string[];
  placeholder?: string;
  disabled?: boolean;
  allowCustom?: boolean;
  emptyHint?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const lowerSelected = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (options as string[]).filter(
      (o) => o.toLowerCase().includes(q) && !lowerSelected.has(o.toLowerCase())
    );
  }, [options, query, lowerSelected]);

  const addItem = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    if (lowerSelected.has(v.toLowerCase())) return;
    onChange([...value, v]);
    setQuery("");
  };

  const removeItem = (item: string) => {
    onChange(value.filter((v) => v !== item));
  };

  const exactMatchExists = (options as string[]).some(
    (o) => o.toLowerCase() === query.trim().toLowerCase()
  );
  const canAddCustom =
    allowCustom &&
    !!query.trim() &&
    !exactMatchExists &&
    !lowerSelected.has(query.trim().toLowerCase());

  return (
    <div ref={ref} className="relative">
      <div
        className={`min-h-[48px] px-2 py-2 rounded-xl border bg-white flex flex-wrap items-center gap-1.5 ${
          disabled ? "opacity-50" : ""
        } border-[var(--border)] focus-within:border-[var(--primary)]/40 focus-within:ring-2 focus-within:ring-[var(--primary)]/20`}
      >
        {value.map((item) => (
          <span
            key={item}
            className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] text-xs font-medium"
          >
            {item}
            <button
              type="button"
              onClick={() => removeItem(item)}
              aria-label={`Remove ${item}`}
              className="w-5 h-5 rounded-full inline-flex items-center justify-center hover:bg-[var(--primary)]/20"
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={query}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (canAddCustom) addItem(query);
            } else if (e.key === "Backspace" && !query && value.length) {
              removeItem(value[value.length - 1]);
            }
          }}
          placeholder={value.length ? "" : placeholder}
          disabled={disabled}
          className="flex-1 min-w-[120px] px-2 py-1 outline-none text-sm bg-transparent"
        />
      </div>

      {open && !disabled && (
        <div className="absolute z-30 mt-2 left-0 right-0 bg-white border border-[var(--border)] rounded-xl shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto py-1">
            {(filtered as string[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => addItem(opt)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 text-gray-700 flex items-center justify-between"
              >
                <span>{opt}</span>
                <Plus size={14} className="text-gray-400" />
              </button>
            ))}
            {canAddCustom && (
              <button
                type="button"
                onClick={() => addItem(query)}
                className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center justify-between text-[var(--primary)] font-medium"
              >
                <span>Add &ldquo;{query.trim()}&rdquo;</span>
                <Plus size={14} />
              </button>
            )}
            {filtered.length === 0 && !canAddCustom && (
              <p className="px-4 py-3 text-sm text-gray-500">
                {emptyHint || "No more options."}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ main ------------------------------ */

export function PartnerPreferencesForm({
  value,
  onChange,
  description = "All fields are optional — set only what matters most. You can update these any time.",
  hideHeader = false,
  showOnProfile,
  onShowOnProfileChange,
  showSmartDefaultsBanner = false,
  onDismissSmartDefaultsBanner,
  onResetToSuggested,
}: PartnerPreferencesFormProps) {
  const pref = value || {};
  const [openSection, setOpenSection] = useState<SectionKey | null>("basic");

  const set = (patch: Partial<PartnerPreference>) =>
    onChange({ ...pref, ...patch });

  // Ensure marital status defaults to "Never Married" when the host opens
  // the form with no value set yet. We only seed once and never override
  // an explicit user choice.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (value === undefined) return; // wait until host gives us at least {}
    if (!pref.maritalStatus) {
      seededRef.current = true;
      onChange({ ...pref, maritalStatus: "Never Married" });
    } else {
      seededRef.current = true;
    }
  }, [value]);

  /* derived slider values */
  const ageLo = pref.ageMin ?? AGE_MIN + 4; // 22
  const ageHi = pref.ageMax ?? AGE_MIN + 14; // 32

  const heightLoIn = parseHeightToInches(pref.heightMin) ?? 60; // 5'0"
  const heightHiIn = parseHeightToInches(pref.heightMax) ?? 70; // 5'10"

  const incomeLoL = parseLakhs(pref.incomeMin) ?? 0;
  const incomeHiL = parseLakhs(pref.incomeMax) ?? 20;

  /* selections */
  const selectedMarital = splitCsv(pref.maritalStatus);
  const selectedEducation = splitCsv(pref.education);
  const selectedFood = splitCsv(pref.foodHabits);
  const selectedProfession = splitCsv(pref.profession);
  const selectedSubCaste = splitCsv(pref.subCaste);
  const selectedStates = splitCsv(pref.state);

  /* fill counts per section */
  const filled = {
    basic:
      (pref.ageMin || pref.ageMax ? 1 : 0) +
      (pref.heightMin || pref.heightMax ? 1 : 0) +
      (selectedMarital.length ? 1 : 0),
    community: (pref.caste ? 1 : 0) + (selectedSubCaste.length ? 1 : 0),
    career:
      (selectedEducation.length ? 1 : 0) +
      (selectedProfession.length ? 1 : 0) +
      (pref.incomeMin || pref.incomeMax ? 1 : 0),
    lifestyle:
      (pref.city ? 1 : 0) +
      (selectedStates.length ? 1 : 0) +
      (selectedFood.length ? 1 : 0),
  };
  const totalFields = 11;
  const filledTotal =
    filled.basic + filled.community + filled.career + filled.lifestyle;
  const completion = Math.round((filledTotal / totalFields) * 100);

  const toggle = (id: SectionKey) =>
    setOpenSection((cur) => (cur === id ? null : id));

  const reset = () => {
    seededRef.current = false;
    if (onResetToSuggested) {
      onResetToSuggested();
    } else {
      onChange({});
    }
  };

  const visibilityToggleAvailable =
    typeof showOnProfile === "boolean" && typeof onShowOnProfileChange === "function";

  return (
    <div className="space-y-4">
      {!hideHeader && (
        <div className="rounded-2xl bg-gradient-to-br from-[var(--primary)]/5 to-[var(--primary)]/10 border border-[var(--primary)]/15 p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white text-[var(--primary)] flex items-center justify-center shrink-0 shadow-sm">
              <Heart size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900">
                Partner Preferences
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                {description}
              </p>
            </div>
            <button
              type="button"
              onClick={reset}
              className="hidden sm:inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 px-3 py-1.5 rounded-lg hover:bg-white/60 transition"
            >
              <RotateCcw size={13} />
              Reset
            </button>
          </div>
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
              <span className="font-medium">Profile match strength</span>
              <span className="font-semibold text-[var(--primary)]">
                {completion}%
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/70 overflow-hidden">
              <div
                className="h-full bg-[var(--primary)] transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          {visibilityToggleAvailable && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-white/80 px-3 py-2.5 border border-white/60">
              <div className="min-w-0 flex items-start gap-2.5">
                <div
                  className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    showOnProfile
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {showOnProfile ? <Eye size={14} /> : <EyeOff size={14} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 leading-tight">
                    Show on my profile
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
                    {showOnProfile
                      ? "Other members will see your preferences when viewing your profile."
                      : "Your preferences are private. Only you can see them."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={!!showOnProfile}
                onClick={() => onShowOnProfileChange?.(!showOnProfile)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40 focus:ring-offset-2 ${
                  showOnProfile ? "bg-[var(--primary)]" : "bg-gray-300"
                }`}
                aria-label="Show partner preferences on my profile"
              >
                <span
                  aria-hidden
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition ${
                    showOnProfile ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      )}

      {showSmartDefaultsBanner && (
        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary)]/5 px-4 py-3 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-white text-[var(--primary)] flex items-center justify-center shrink-0 shadow-sm">
            <Wand2 size={15} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">
              We pre-filled suggestions based on your profile
            </p>
            <p className="text-xs text-gray-600 mt-0.5">
              Edit anything you&apos;d like, or hit{" "}
              <span className="font-medium text-gray-800">Reset</span> to start
              from these suggestions again. Caste is left as <em>Any</em> by default.
            </p>
          </div>
          {onDismissSmartDefaultsBanner && (
            <button
              type="button"
              onClick={onDismissSmartDefaultsBanner}
              className="p-1.5 -mr-1 -mt-0.5 rounded-md text-gray-400 hover:text-gray-700 hover:bg-white/60 transition shrink-0"
              aria-label="Dismiss suggestion banner"
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      <Section
        id="basic"
        icon={Sparkles}
        title="Basic Preferences"
        subtitle="Age, height & marital status"
        open={openSection === "basic"}
        onToggle={toggle}
        filledCount={filled.basic}
      >
        <Field label="Age range" hint={`${AGE_MIN}–${AGE_MAX} yrs`}>
          <DualRangeSlider
            min={AGE_MIN}
            max={AGE_MAX}
            valueMin={ageLo}
            valueMax={ageHi}
            onChange={(lo, hi) => set({ ageMin: lo, ageMax: hi })}
            format={(n) => `${n} yrs`}
            ariaLabelMin="Minimum age"
            ariaLabelMax="Maximum age"
          />
        </Field>

        <Field label="Height range" hint={`4'0" – 7'0"`}>
          <DualRangeSlider
            min={HEIGHT_INCH_MIN}
            max={HEIGHT_INCH_MAX}
            valueMin={heightLoIn}
            valueMax={heightHiIn}
            onChange={(lo, hi) =>
              set({
                heightMin: inchesToFeetInches(lo),
                heightMax: inchesToFeetInches(hi),
              })
            }
            format={inchesToFeetInches}
            ariaLabelMin="Minimum height"
            ariaLabelMax="Maximum height"
          />
        </Field>

        <Field label="Marital status" hint="Choose any">
          <ChipGroup
            options={MARITAL_STATUS_OPTIONS}
            selected={selectedMarital}
            onToggle={(next) => set({ maritalStatus: joinCsv(next) })}
            multiple
          />
        </Field>
      </Section>

      <Section
        id="community"
        icon={Users}
        title="Community Preferences"
        subtitle="Caste & sub-caste"
        open={openSection === "community"}
        onToggle={toggle}
        filledCount={filled.community}
      >
        <Field label="Caste">
          <SearchSelect
            value={pref.caste || ""}
            onChange={(next) =>
              set({ caste: next, subCaste: next ? pref.subCaste : "" })
            }
            options={CASTE_OPTIONS}
            placeholder="Any caste"
          />
        </Field>

        <Field
          label="Sub-caste"
          hint={pref.caste ? "Pick any number" : "Pick a caste first"}
        >
          <MultiChipPicker
            value={selectedSubCaste}
            onChange={(next) => set({ subCaste: joinCsv(next) })}
            options={SUB_CASTE_OPTIONS}
            placeholder="Search or add custom sub-caste"
            disabled={!pref.caste}
            allowCustom
            emptyHint="No matches. Type a custom value and press Enter."
          />
        </Field>
      </Section>

      <Section
        id="career"
        icon={GraduationCap}
        title="Education & Career"
        subtitle="Studies, profession & income"
        open={openSection === "career"}
        onToggle={toggle}
        filledCount={filled.career}
      >
        <Field label="Education" hint="Choose any">
          <ChipGroup
            options={EDUCATION_CHIP_OPTIONS}
            selected={selectedEducation}
            onToggle={(next) => set({ education: joinCsv(next) })}
            multiple
          />
        </Field>

        <Field label="Profession" hint="Choose any">
          <ChipGroup
            options={PROFESSION_TYPES}
            selected={selectedProfession}
            onToggle={(next) => set({ profession: joinCsv(next) })}
            multiple
          />
        </Field>

        <Field label="Annual income" hint="In ₹ Lakhs / Cr">
          <DualRangeSlider
            min={INCOME_MIN_L}
            max={INCOME_MAX_L}
            step={1}
            valueMin={incomeLoL}
            valueMax={incomeHiL}
            onChange={(lo, hi) =>
              set({
                incomeMin: lo > 0 ? `${lo}L` : "",
                incomeMax: hi < INCOME_MAX_L ? `${hi}L` : `${INCOME_MAX_L}L`,
              })
            }
            format={formatLakhs}
            ariaLabelMin="Minimum annual income"
            ariaLabelMax="Maximum annual income"
          />
        </Field>
      </Section>

      <Section
        id="lifestyle"
        icon={MapPin}
        title="Lifestyle & Location"
        subtitle="City, state & food habits"
        open={openSection === "lifestyle"}
        onToggle={toggle}
        filledCount={filled.lifestyle}
      >
        <Field label="Preferred city">
          <input
            type="text"
            value={pref.city || ""}
            onChange={(e) => set({ city: e.target.value })}
            placeholder="Any city (you can list multiple, comma separated)"
            className="w-full min-h-[48px] px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
          />
        </Field>

        <Field label="Preferred states" hint="Add as many as you'd like">
          <MultiChipPicker
            value={selectedStates}
            onChange={(next) => set({ state: joinCsv(next) })}
            options={INDIAN_STATES}
            placeholder="Search or add a state"
            allowCustom
            emptyHint="No matches. Type any custom region and press Enter."
          />
        </Field>

        <Field label="Food habits" hint="Choose any">
          <ChipGroup
            options={FOOD_HABITS_OPTIONS}
            selected={selectedFood}
            onToggle={(next) => set({ foodHabits: joinCsv(next) })}
            multiple
          />
        </Field>
      </Section>

      {!hideHeader && (
        <button
          type="button"
          onClick={reset}
          className="sm:hidden w-full inline-flex items-center justify-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-800 px-3 py-2.5 rounded-xl border border-[var(--border)] hover:bg-gray-50 transition"
        >
          <RotateCcw size={14} />
          Reset preferences
        </button>
      )}
      <p className="text-[11px] text-gray-400 text-center pt-1">
        Tip: leave a section empty to keep options open.
      </p>
    </div>
  );
}

export default PartnerPreferencesForm;
