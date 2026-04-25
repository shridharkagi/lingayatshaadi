"use client";

import { Phone, MessageCircle, Smartphone, type LucideIcon } from "lucide-react";
import type { ProfileContact } from "@/types";
import { maskPhoneForDisplay } from "@/lib/profileUtils";

const METHOD_META: Record<string, { Icon: LucideIcon; color: string }> = {
  Call: { Icon: Phone, color: "bg-[var(--primary)]/10 text-[var(--primary)]" },
  WhatsApp: { Icon: MessageCircle, color: "bg-green-100 text-green-700" },
  SMS: { Icon: Smartphone, color: "bg-blue-100 text-blue-700" },
};

interface ContactsListProps {
  /** Structured contacts (preferred). */
  contacts?: ProfileContact[];
  /** Legacy single contact fallback (for older profiles). */
  fallbackNumber?: string;
  /** Legacy contact-type label paired with the fallback number. */
  fallbackBelongsTo?: string;
}

function ownerLabel(c: ProfileContact): string {
  if (c.belongsTo === "Other" && c.belongsToOther) return c.belongsToOther;
  return c.belongsTo || "";
}

export function ContactsList({ contacts, fallbackNumber, fallbackBelongsTo }: ContactsListProps) {
  const visible = (contacts || []).filter((c) => c.number && c.showOnProfile !== false);

  // Legacy fallback: surface the old single column when no structured list exists
  if (visible.length === 0 && fallbackNumber) {
    visible.push({
      number: fallbackNumber,
      belongsTo: fallbackBelongsTo || "Self",
      showOnProfile: true,
      methods: ["Call"],
    });
  }

  if (visible.length === 0) {
    return <p className="text-gray-500 text-sm">No contact numbers shared on this profile.</p>;
  }

  return (
    <div className="space-y-2">
      {visible.map((c, idx) => {
        const isPrimary = idx === 0;
        const owner = ownerLabel(c);
        const sanitized = c.number.replace(/\D/g, "");
        const displayDigits = maskPhoneForDisplay(c.number, 5);
        return (
          <div
            key={`${c.number}-${idx}`}
            className={`p-3 rounded-xl border ${
              isPrimary ? "bg-white border-[var(--primary)]/20" : "bg-white/70 border-gray-200"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <a
                    href={`tel:${sanitized}`}
                    className="text-[var(--primary)] font-semibold text-sm hover:underline"
                  >
                    {displayDigits}
                  </a>
                  {isPrimary && (
                    <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
                      Primary
                    </span>
                  )}
                </div>
                {owner && (
                  <p className="text-xs text-gray-500 mt-0.5">Belongs to: {owner}</p>
                )}
              </div>
              <div className="flex items-center gap-1 flex-wrap justify-end">
                {(c.methods || []).map((m) => {
                  const meta = METHOD_META[m];
                  if (!meta) return null;
                  const { Icon, color } = meta;
                  const href =
                    m === "WhatsApp"
                      ? `https://wa.me/${sanitized}`
                      : m === "SMS"
                      ? `sms:${sanitized}`
                      : `tel:${sanitized}`;
                  return (
                    <a
                      key={m}
                      href={href}
                      target={m === "WhatsApp" ? "_blank" : undefined}
                      rel={m === "WhatsApp" ? "noopener noreferrer" : undefined}
                      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium ${color} hover:opacity-90 transition`}
                      title={m}
                    >
                      <Icon size={11} />
                      <span>{m}</span>
                    </a>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
