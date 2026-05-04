"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import {
  formatIsoToDobDdMmYyyy,
  parseDobDdMmYyyyToIso,
  parseDobValueToParts,
  validateMatrimonyDob,
} from "@/lib/dateOfBirth";

export type DobSplitFieldsProps = {
  id?: string;
  value: string;
  /** Normalized `yyyy-mm-dd` when valid; empty string when cleared or invalid complete entry. */
  onChange: (isoYyyyMmDd: string) => void;
  label?: React.ReactNode;
  compact?: boolean;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  showCalendarHint?: boolean;
  onIsoForPicker?: (iso: string) => void;
};

type Segment = "d" | "m" | "y" | "all" | null;

function onlyDigits(s: string, max: number): string {
  return s.replace(/\D/g, "").slice(0, max);
}

export function DobSplitFields({
  id,
  value,
  onChange,
  label,
  compact,
  error: externalError,
  required,
  disabled,
  className = "",
  showCalendarHint = true,
  onIsoForPicker,
}: DobSplitFieldsProps) {
  const reactId = useId();
  const baseId = id || `dob-${reactId}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const ddRef = useRef<HTMLInputElement>(null);
  const mmRef = useRef<HTMLInputElement>(null);
  const yyyyRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<HTMLInputElement>(null);

  const [dd, setDd] = useState("");
  const [mm, setMm] = useState("");
  const [yyyy, setYyyy] = useState("");
  const [touched, setTouched] = useState(false);
  const [internalError, setInternalError] = useState("");
  const [highlight, setHighlight] = useState<Segment>(null);

  const syncFromValue = useCallback((v: string) => {
    const p = parseDobValueToParts(v);
    if (p.dd && p.mm && p.yyyy) {
      setDd(p.dd.padStart(2, "0"));
      setMm(p.mm.padStart(2, "0"));
      setYyyy(p.yyyy);
    } else {
      setDd(p.dd);
      setMm(p.mm);
      setYyyy(p.yyyy);
    }
  }, []);

  useEffect(() => {
    const focusedInside =
      typeof document !== "undefined" &&
      wrapRef.current?.contains(document.activeElement);
    if (focusedInside) return;
    syncFromValue(value);
  }, [value, syncFromValue]);

  const labelClass = compact
    ? "block text-xs sm:text-sm font-medium text-gray-700 mb-0.5 sm:mb-1"
    : "block text-sm font-medium text-gray-700 mb-1";

  const inputClass = compact
    ? "min-w-0 rounded-xl border bg-white px-2.5 py-2 text-center font-sans text-[16px] tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1] outline-none transition focus:ring-1 focus:ring-[var(--primary)]/30 sm:px-3.5 sm:py-2.5 sm:text-base"
    : "min-w-0 rounded-xl border bg-white px-3 py-3 text-center font-sans text-[16px] tabular-nums [font-feature-settings:'tnum'_1,'lnum'_1] outline-none transition focus:ring-1 focus:ring-[var(--primary)]/30 sm:text-base";

  const msg = externalError || internalError;
  const segBorder = (seg: Segment) => {
    const bad = !!msg && (externalError ? true : highlight === seg || highlight === "all");
    return `${inputClass} ${borderClass(bad)}`;
  };

  const emitIfValid = useCallback(
    (nextDd: string, nextMm: string, nextYyyy: string) => {
      const d = onlyDigits(nextDd, 2);
      const m = onlyDigits(nextMm, 2);
      const y = onlyDigits(nextYyyy, 4);

      if (d.length === 0 && m.length === 0 && y.length === 0) {
        setInternalError("");
        setHighlight(null);
        onChange("");
        if (onIsoForPicker) onIsoForPicker("");
        return;
      }

      if (d.length < 2 || m.length < 2 || y.length < 4) {
        setInternalError("");
        setHighlight(null);
        return;
      }

      const ddP = d.padStart(2, "0");
      const mmP = m.padStart(2, "0");
      const raw = `${ddP}/${mmP}/${y}`;
      const isoTry = parseDobDdMmYyyyToIso(raw);
      if (!isoTry) {
        setInternalError("Enter a valid date.");
        setHighlight(invalidCalendarHighlight(ddP, mmP, y));
        onChange("");
        return;
      }

      const mat = validateMatrimonyDob(isoTry);
      if (!mat.ok) {
        setInternalError(mat.error);
        if (/future/i.test(mat.error) || /at least/i.test(mat.error) || /realistic/i.test(mat.error)) {
          setHighlight("y");
        } else setHighlight("all");
        onChange("");
        return;
      }

      setInternalError("");
      setHighlight(null);
      onChange(mat.iso);
      if (onIsoForPicker) onIsoForPicker(mat.iso);
    },
    [onChange, onIsoForPicker]
  );

  const flushBlurValidation = useCallback(() => {
    const d = onlyDigits(dd, 2);
    const m = onlyDigits(mm, 2);
    const y = onlyDigits(yyyy, 4);
    const any = d.length > 0 || m.length > 0 || y.length > 0;
    const complete = d.length === 2 && m.length === 2 && y.length === 4;
    if (any && !complete) {
      setInternalError("Please enter your full date of birth (DD / MM / YYYY).");
      setHighlight("all");
      onChange("");
      return;
    }
    emitIfValid(dd, mm, yyyy);
  }, [dd, mm, yyyy, emitIfValid, onChange]);

  const combinedError = externalError || internalError;

  return (
    <div className={`w-full min-w-0 ${className}`}>
      {label != null && label !== false && (
        <label className={labelClass} htmlFor={`${baseId}-dd`}>
          {label}
          {required ? <span className="text-red-500"> *</span> : null}
        </label>
      )}

      <div
        ref={wrapRef}
        className="flex flex-wrap items-center gap-2 sm:gap-2.5"
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setTouched(true);
            flushBlurValidation();
          }
        }}
      >
        <input
          ref={ddRef}
          id={`${baseId}-dd`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          lang="en"
          dir="ltr"
          autoComplete="bday-day"
          placeholder="DD"
          maxLength={2}
          disabled={disabled}
          value={dd}
          aria-invalid={!!combinedError}
          aria-describedby={combinedError ? `${baseId}-err` : undefined}
          onChange={(e) => {
            const v = onlyDigits(e.target.value, 2);
            setDd(v);
            setTouched(true);
            setInternalError("");
            setHighlight(null);
            if (v.length === 2) mmRef.current?.focus();
            emitIfValid(v, mm, yyyy);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !dd) mmRef.current?.focus();
          }}
          className={`${segBorder("d")} w-[3.6rem] sm:w-[3.8rem]`}
        />
        <span className="text-gray-400 select-none" aria-hidden>
          /
        </span>
        <input
          ref={mmRef}
          id={`${baseId}-mm`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          lang="en"
          dir="ltr"
          autoComplete="bday-month"
          placeholder="MM"
          maxLength={2}
          disabled={disabled}
          value={mm}
          onChange={(e) => {
            const v = onlyDigits(e.target.value, 2);
            setMm(v);
            setTouched(true);
            setInternalError("");
            setHighlight(null);
            if (v.length === 2) yyyyRef.current?.focus();
            emitIfValid(dd, v, yyyy);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !mm) ddRef.current?.focus();
          }}
          className={`${segBorder("m")} w-[3.6rem] sm:w-[3.8rem]`}
        />
        <span className="text-gray-400 select-none" aria-hidden>
          /
        </span>
        <input
          ref={yyyyRef}
          id={`${baseId}-yyyy`}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          lang="en"
          dir="ltr"
          autoComplete="bday-year"
          placeholder="YYYY"
          maxLength={4}
          disabled={disabled}
          value={yyyy}
          onChange={(e) => {
            const v = onlyDigits(e.target.value, 4);
            setYyyy(v);
            setTouched(true);
            setInternalError("");
            setHighlight(null);
            emitIfValid(dd, mm, v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Backspace" && !yyyy) mmRef.current?.focus();
          }}
          className={`${segBorder("y")} w-[6rem] sm:w-[6.25rem]`}
        />

        {showCalendarHint && (
          <>
            <button
              type="button"
              disabled={disabled}
              onClick={() => pickerRef.current?.showPicker?.()}
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              aria-label="Choose date from calendar"
            >
              <Calendar size={compact ? 15 : 18} />
            </button>
            <input
              ref={pickerRef}
              type="date"
              className="sr-only"
              max={new Date().toISOString().slice(0, 10)}
              disabled={disabled}
              onChange={(e) => {
                const iso = e.target.value;
                if (!iso) return;
                const p = parseDobValueToParts(iso);
                setDd(p.dd.padStart(2, "0"));
                setMm(p.mm.padStart(2, "0"));
                setYyyy(p.yyyy);
                setTouched(true);
                emitIfValid(p.dd.padStart(2, "0"), p.mm.padStart(2, "0"), p.yyyy);
              }}
            />
          </>
        )}
      </div>

      {combinedError ? (
        <p id={`${baseId}-err`} className="mt-1 text-sm text-red-500">
          {combinedError}
        </p>
      ) : null}
    </div>
  );
}

function borderClass(invalid: boolean): string {
  return invalid ? "border-red-500" : "border-[var(--border)] focus:border-[var(--primary)]";
}

function invalidCalendarHighlight(dd: string, mm: string, yyyy: string): Segment {
  const d = Number(dd);
  const m = Number(mm);
  const y = Number(yyyy);
  if (m < 1 || m > 12) return "m";
  if (d < 1 || d > 31) return "d";
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== m - 1 || dt.getDate() !== d) return "d";
  return "all";
}
