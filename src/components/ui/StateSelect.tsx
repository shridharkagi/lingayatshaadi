"use client";

import { useId } from "react";
import { INDIAN_STATES } from "@/data/constants";

interface StateSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  disabled?: boolean;
}

/**
 * Lightweight Indian state autocomplete using a native `<datalist>`.
 * Behaves like a normal text input (free-typed values still allowed) but
 * surfaces the canonical list of Indian states + UTs as suggestions.
 */
export function StateSelect({
  value = "",
  onChange,
  placeholder = "Start typing your state...",
  className,
  id,
  disabled,
}: StateSelectProps) {
  const generatedId = useId();
  const listId = `state-list-${id || generatedId}`;
  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="address-level1"
        className={
          className ||
          "w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all"
        }
      />
      <datalist id={listId}>
        {INDIAN_STATES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  );
}
