"use client";

import { Languages } from "lucide-react";

export function LanguageTag({
  label,
  isMotherTongue,
}: {
  label: string;
  isMotherTongue?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${
        isMotherTongue
          ? "border-[var(--primary)]/40 bg-[var(--primary)]/10 text-[var(--primary)]"
          : "border-gray-200 bg-gray-50/80 text-gray-800"
      }`}
    >
      <Languages size={16} className="text-[var(--primary)] flex-shrink-0" />
      {label}
      {isMotherTongue && (
        <span className="text-xs opacity-80">(Mother Tongue)</span>
      )}
    </span>
  );
}
