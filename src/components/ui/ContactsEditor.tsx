"use client";

import { useEffect, useMemo } from "react";
import {
  Phone,
  Plus,
  Trash2,
  MessageCircle,
  Smartphone,
  Eye,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import { CONTACT_OWNER_RELATIONS, CONTACT_METHODS, type ContactMethod } from "@/data/constants";
import type { ProfileContact } from "@/types";

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all";

const selectClass =
  "w-full px-3 py-2.5 rounded-lg border border-[var(--border)] bg-white text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)] transition-all";

interface ContactsEditorProps {
  /** Default contact number for the account holder (used to prefill entry #1). */
  accountPhone?: string;
  value?: ProfileContact[];
  onChange: (next: ProfileContact[]) => void;
  /** Maximum total entries (primary + alternates). Default 3. */
  max?: number;
}

/** Returns `true` if the entry has at least a number filled in. */
function isFilled(c?: ProfileContact): boolean {
  return !!c && !!c.number && c.number.trim().length > 0;
}

const METHOD_ICONS: Record<ContactMethod, LucideIcon> = {
  Call: Phone,
  WhatsApp: MessageCircle,
  SMS: Smartphone,
};

export function ContactsEditor({
  accountPhone,
  value,
  onChange,
  max = 3,
}: ContactsEditorProps) {
  // Always keep at least the primary slot visible. We materialise an array of
  // length === max so the UI is stable even when the parent passes [].
  const entries = useMemo<ProfileContact[]>(() => {
    const base: ProfileContact[] = [...(value || [])];
    if (base.length === 0) {
      base.push({
        number: accountPhone || "",
        belongsTo: "Self",
        showOnProfile: true,
        methods: ["Call"],
      });
    } else if (!base[0].number && accountPhone) {
      base[0] = { ...base[0], number: accountPhone };
    }
    return base;
  }, [value, accountPhone]);

  // If parent gave us nothing, push the prefilled primary back upstream so the
  // form state matches what the user sees.
  useEffect(() => {
    if (!value || value.length === 0) {
      onChange(entries);
    }
  }, []);

  const update = (idx: number, patch: Partial<ProfileContact>) => {
    const next = entries.map((c, i) => (i === idx ? { ...c, ...patch } : c));
    onChange(next);
  };

  const addAlternate = () => {
    if (entries.length >= max) return;
    onChange([
      ...entries,
      {
        number: "",
        belongsTo: "",
        showOnProfile: true,
        methods: ["Call"],
      },
    ]);
  };

  const remove = (idx: number) => {
    if (idx === 0) return; // can't delete primary
    onChange(entries.filter((_, i) => i !== idx));
  };

  const toggleMethod = (idx: number, method: ContactMethod) => {
    const current = new Set(entries[idx].methods || []);
    if (current.has(method)) current.delete(method);
    else current.add(method);
    update(idx, { methods: Array.from(current) });
  };

  return (
    <div className="space-y-4">
      {entries.map((c, idx) => {
        const isPrimary = idx === 0;
        const isOther = c.belongsTo === "Other";
        return (
          <div
            key={idx}
            className={`rounded-xl border p-4 ${
              isPrimary
                ? "border-[var(--primary)]/30 bg-[var(--primary)]/5"
                : "border-[var(--border)] bg-white"
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    isPrimary
                      ? "bg-[var(--primary)] text-white"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  <Phone size={16} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    {isPrimary ? "Account Contact" : `Alternate Contact ${idx}`}
                  </p>
                  <p className="text-xs text-gray-500">
                    {isPrimary
                      ? "Primary number for this profile"
                      : "Optional — friend or family member"}
                  </p>
                </div>
              </div>
              {!isPrimary && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="p-2 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 transition"
                  aria-label="Remove contact"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Phone Number{isPrimary && <span className="text-red-500"> *</span>}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  placeholder="+91 9XXXXXXXXX"
                  value={c.number || ""}
                  onChange={(e) => update(idx, { number: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Whom does this belong to?
                </label>
                <select
                  value={c.belongsTo || ""}
                  onChange={(e) =>
                    update(idx, {
                      belongsTo: e.target.value,
                      ...(e.target.value !== "Other" ? { belongsToOther: "" } : {}),
                      ...(e.target.value === "LingayatBandhu Matrimony"
                        ? {
                            number: "6360130905",
                            methods: ["Call", "WhatsApp", "SMS"] as ContactMethod[],
                          }
                        : {}),
                    })
                  }
                  className={selectClass}
                >
                  <option value="">Select relation</option>
                  {CONTACT_OWNER_RELATIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
              {isOther && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Specify relationship
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Maternal Uncle"
                    value={c.belongsToOther || ""}
                    onChange={(e) => update(idx, { belongsToOther: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Preferred contact channels */}
            <div className="mt-3">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Preferred contact channels
              </label>
              <div className="flex flex-wrap gap-2">
                {CONTACT_METHODS.map((m) => {
                  const Icon = METHOD_ICONS[m];
                  const active = (c.methods || []).includes(m);
                  return (
                    <button
                      type="button"
                      key={m}
                      onClick={() => toggleMethod(idx, m)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        active
                          ? "bg-[var(--primary)] text-white border-[var(--primary)] shadow-sm"
                          : "bg-white text-gray-600 border-gray-200 hover:border-[var(--primary)]/40 hover:text-[var(--primary)]"
                      }`}
                    >
                      <Icon size={13} />
                      {m}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Show on profile toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={!!c.showOnProfile}
              onClick={() => update(idx, { showOnProfile: !c.showOnProfile })}
              className="mt-3 w-full flex items-center justify-between gap-3 p-3 rounded-lg bg-white/60 border border-[var(--border)] hover:border-[var(--primary)]/30 transition text-left"
            >
              <span className="flex items-start gap-2 min-w-0 flex-1">
                {c.showOnProfile ? (
                  <Eye size={16} className="text-[var(--primary)] shrink-0 mt-0.5" />
                ) : (
                  <EyeOff size={16} className="text-gray-400 shrink-0 mt-0.5" />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block text-xs sm:text-sm font-medium text-gray-800 leading-tight">
                    Show on public profile
                  </span>
                  <span className="block text-[11px] text-gray-500 mt-0.5 leading-tight">
                    {c.showOnProfile
                      ? "Visible to other members"
                      : "Hidden — only you can see it"}
                  </span>
                </span>
              </span>
              <span
                aria-hidden
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
                  c.showOnProfile ? "bg-[var(--primary)]" : "bg-gray-300"
                }`}
              >
                <span
                  className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                  style={{
                    transform: c.showOnProfile
                      ? "translateX(18px)"
                      : "translateX(2px)",
                  }}
                />
              </span>
            </button>
          </div>
        );
      })}

      {entries.length < max && (
        <button
          type="button"
          onClick={addAlternate}
          disabled={!isFilled(entries[entries.length - 1])}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-2 border-dashed border-[var(--primary)]/30 text-[var(--primary)] text-sm font-medium hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/60 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <Plus size={16} />
          Add Alternate Contact {entries.length}
        </button>
      )}
    </div>
  );
}
