"use client";

import { useMemo, useRef, useState } from "react";
import { X } from "lucide-react";

interface TagPillInputProps {
  label?: string;
  values: string[];
  onChange: (next: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
  helperText?: string;
}

export function TagPillInput({
  label,
  values,
  onChange,
  suggestions = [],
  placeholder = "Type and press Enter",
  maxTags,
  helperText,
}: TagPillInputProps) {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const normalized = values.map((v) => v.trim().toLowerCase());
  const canAddMore = maxTags == null || values.length < maxTags;

  const filtered = useMemo(() => {
    const q = input.trim().toLowerCase();
    return suggestions
      .filter((s) => !normalized.includes(s.trim().toLowerCase()))
      .filter((s) => (q ? s.toLowerCase().includes(q) : true))
      .slice(0, 8);
  }, [suggestions, normalized, input]);

  const addTag = (raw: string) => {
    const next = raw.trim();
    if (!next || !canAddMore) return;
    if (normalized.includes(next.toLowerCase())) return;
    onChange([...values, next]);
    setInput("");
    setOpen(false);
  };

  const removeTag = (target: string) => {
    onChange(values.filter((v) => v !== target));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === "Backspace" && !input && values.length > 0) {
      onChange(values.slice(0, -1));
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>}
      <div className="flex flex-wrap gap-2 mb-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-gray-200 bg-gray-50 text-gray-800 text-sm"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-gray-500 hover:text-gray-700"
              aria-label={`Remove ${tag}`}
            >
              <X size={14} />
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={onKeyDown}
        placeholder={canAddMore ? placeholder : "Limit reached"}
        disabled={!canAddMore}
        className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all disabled:bg-gray-50 disabled:text-gray-500"
      />
      {open && canAddMore && (filtered.length > 0 || input.trim()) && (
        <div className="absolute z-40 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg py-1">
          {filtered.map((s) => (
            <button
              key={s}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
            >
              {s}
            </button>
          ))}
          {input.trim() && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addTag(input)}
              className="w-full text-left px-3 py-2 text-sm text-[var(--primary)] hover:bg-[var(--primary)]/5"
            >
              Add "{input.trim()}"
            </button>
          )}
        </div>
      )}
      {helperText && <p className="text-xs text-gray-500 mt-1">{helperText}</p>}
    </div>
  );
}
