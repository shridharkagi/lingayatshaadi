"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Search } from "lucide-react";
import { SUB_CASTE_OPTIONS } from "@/data/constants";

const OTHERS_VALUE = "Others";

interface SubCasteSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SubCasteSelector({
  value,
  onChange,
  placeholder = "Select sub-caste",
  className = "",
}: SubCasteSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customValue, setCustomValue] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const isInList = SUB_CASTE_OPTIONS.includes(value as (typeof SUB_CASTE_OPTIONS)[number]);
  const isCustomOther = value && !isInList; // User entered custom via Others
  const displayValue = isCustomOther ? value : (isInList ? value : "");
  const showOtherInput = value === OTHERS_VALUE || isCustomOther;

  useEffect(() => {
    if (value && !SUB_CASTE_OPTIONS.includes(value as (typeof SUB_CASTE_OPTIONS)[number])) {
      setCustomValue(value === OTHERS_VALUE ? "" : value);
    }
  }, [value]);

  const filteredOptions = SUB_CASTE_OPTIONS.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase().trim())
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Caste</label>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] hover:border-[var(--color-border)] transition"
        >
          <span className={displayValue ? "text-gray-900" : "text-gray-500"}>
            {displayValue || placeholder}
          </span>
          <ChevronDown
            size={18}
            className={`text-gray-500 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {open && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[var(--color-border)] shadow-lg z-50 max-h-64 overflow-hidden flex flex-col">
            <div className="p-2 border-b border-[var(--color-border)] sticky top-0 bg-white">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden
                />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search sub-caste..."
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  autoFocus
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 py-1">
              {filteredOptions.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => {
                    onChange(opt);
                    setOpen(false);
                    setSearch("");
                    if (opt !== OTHERS_VALUE) setCustomValue("");
                  }}
                  className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 transition ${
                    value === opt ? "bg-[var(--primary)]/10 text-[var(--primary)] font-medium" : ""
                  }`}
                >
                  {opt}
                </button>
              ))}
              {filteredOptions.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-500">No matches. Select &quot;Others&quot; to enter custom.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {showOtherInput && (
        <div className="mt-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Enter your sub-caste
          </label>
          <input
            type="text"
            value={customValue}
            onChange={(e) => {
              const v = e.target.value.trim();
              setCustomValue(e.target.value);
              onChange(v ? v : OTHERS_VALUE);
            }}
            placeholder="Type your sub-caste"
            className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      )}
    </div>
  );
}
