"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useAuth } from "@/contexts/AuthContext";
import { adminFetch } from "@/lib/api/adminClient";
import { fillWhatsAppTemplate } from "@/lib/whatsappTemplates";
import {
  CheckCircle2,
  Headset,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  UserRound,
  X,
} from "lucide-react";

type PremiumUnlockModalProps = {
  isOpen: boolean;
  onClose: () => void;
  whatsappNumber?: string;
  callNumber?: string;
};

const GOLD = "#C9A227";

const benefits = [
  "View Phone Number",
  "View Full Biodata",
  "Unlimited Interests",
  "Priority Support",
  "WhatsApp Assistance",
];

function sanitizePhone(input?: string) {
  return (input || "").replace(/\D/g, "");
}

export function PremiumUnlockModal({
  isOpen,
  onClose,
  whatsappNumber,
  callNumber,
}: PremiumUnlockModalProps) {
  const [dragStartY, setDragStartY] = useState<number | null>(null);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [waLoading, setWaLoading] = useState(false);
  const [callLoading, setCallLoading] = useState(false);

  const phoneForWa = useMemo(
    () => sanitizePhone(whatsappNumber) || sanitizePhone(callNumber) || "6360130905",
    [whatsappNumber, callNumber]
  );
  const phoneForCall = useMemo(
    () => sanitizePhone(callNumber) || sanitizePhone(whatsappNumber) || "6360130905",
    [callNumber, whatsappNumber]
  );

  const { config } = useAppConfig();
  const { authUser, accountMeta } = useAuth();
  // The message identifies the member who is upgrading (the logged-in
  // account), not the profile they happen to be viewing.
  const [accountCode, setAccountCode] = useState<string | null>(null);
  useEffect(() => {
    if (!isOpen || !authUser || accountCode) return;
    let cancelled = false;
    adminFetch("/api/account/account-code")
      .then((res) => (res.ok ? res.json() : null))
      .then((json: { accountCode?: string | null } | null) => {
        if (!cancelled && json?.accountCode) setAccountCode(json.accountCode);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [isOpen, authUser, accountCode]);

  const accountName =
    accountMeta?.fullName?.trim() ||
    [accountMeta?.firstName, accountMeta?.lastName].filter(Boolean).join(" ").trim() ||
    "";
  const waMessage = useMemo(
    () =>
      fillWhatsAppTemplate(config.whatsappTemplates.upgradeFromProfile, {
        accountId: accountCode || "N/A",
        name: accountName || "N/A",
      }),
    [config.whatsappTemplates.upgradeFromProfile, accountCode, accountName]
  );

  useEffect(() => {
    if (!isOpen) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const handleBackdropDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) onClose();
  };

  const handleSheetTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setDragStartY(e.touches[0]?.clientY ?? null);
    setDragDeltaY(0);
  };

  const handleSheetTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (dragStartY == null) return;
    const nextDelta = Math.max(0, (e.touches[0]?.clientY ?? dragStartY) - dragStartY);
    setDragDeltaY(nextDelta);
  };

  const handleSheetTouchEnd = () => {
    if (dragDeltaY > 92) {
      onClose();
    }
    setDragStartY(null);
    setDragDeltaY(0);
  };

  const openWhatsApp = () => {
    setWaLoading(true);
    const waUrl = `https://wa.me/${phoneForWa}?text=${encodeURIComponent(waMessage)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    window.setTimeout(() => setWaLoading(false), 650);
  };

  const callSupport = () => {
    setCallLoading(true);
    window.location.href = `tel:${phoneForCall}`;
    window.setTimeout(() => setCallLoading(false), 650);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm flex items-end justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={handleBackdropDown}
          aria-hidden={false}
        >
          <motion.section
            role="dialog"
            aria-modal="true"
            aria-labelledby="premium-unlock-title"
            className="w-full max-w-lg rounded-t-[18px] border-t shadow-[0_-12px_45px_rgba(0,0,0,0.5)]"
            style={{ background: "var(--lb-surface)", color: "var(--lb-text)", borderColor: "var(--lb-line-strong)" }}
            initial={{ y: 480, opacity: 0.85 }}
            animate={{ y: dragDeltaY, opacity: 1 }}
            exit={{ y: 520, opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 330, damping: 34, mass: 0.95 }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-14 rounded-full" style={{ background: "rgba(255,255,255,0.18)" }} />

            <div className="px-4 pt-3 pb-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="premium-unlock-title" className="text-[1.05rem] font-bold tracking-tight" style={{ color: "var(--lb-text)" }}>
                    Unlock Full Profile Access
                  </h2>
                  <p className="mt-1 text-[13px]" style={{ color: "var(--lb-text-2)" }}>
                    Connect directly with this profile and access complete details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="lb-btn-glass flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                  style={{ color: "var(--lb-text-2)" }}
                  aria-label="Close premium unlock modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div
                className="mt-3 rounded-2xl border px-3 py-2.5"
                style={{
                  borderColor: "rgba(235, 201, 131, 0.28)",
                  background: "linear-gradient(135deg, #2A2418 0%, var(--lb-raised) 70%)",
                }}
              >
                <div
                  className="mb-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                  style={{ background: "var(--lb-accent-tint)", color: "var(--lb-accent-text)" }}
                >
                  <Sparkles size={12} />
                  Premium Benefits
                </div>
                <ul className="grid grid-cols-2 gap-1.5">
                  {benefits.map((item, i) => (
                    <li
                      key={item}
                      // Odd count: let the last benefit span both columns.
                      className={`${benefits.length % 2 === 1 && i === benefits.length - 1 ? "col-span-2 " : ""}flex items-center gap-1.5 rounded-lg border px-2 py-2 text-[12px] font-medium leading-tight`}
                      style={{ background: "rgba(255,255,255,0.05)", borderColor: "var(--lb-line)", color: "var(--lb-text)" }}
                    >
                      <CheckCircle2 size={13} className="shrink-0" style={{ color: GOLD }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div
                className="mt-2 rounded-xl border px-3 py-2 text-xs"
                style={{ background: "var(--lb-glass)", borderColor: "var(--lb-line)", color: "var(--lb-text-2)" }}
              >
                <div className="inline-flex items-center gap-1.5 font-semibold" style={{ color: "var(--lb-text)" }}>
                  <ShieldCheck size={13} style={{ color: "var(--lb-verified)" }} />
                  Trusted by Lingayat families across Karnataka.
                </div>
              </div>
            </div>

            <div
              className="sticky bottom-0 border-t px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5"
              style={{ background: "var(--lb-surface)", borderColor: "var(--lb-line)" }}
            >
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={openWhatsApp}
                  disabled={waLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-3 py-3 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-70"
                >
                  {waLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Opening WhatsApp...
                    </span>
                  ) : (
                    <>
                      <MessageIcon />
                      WhatsApp
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={callSupport}
                  disabled={callLoading}
                  className="lb-btn-glass w-full inline-flex items-center justify-center gap-2 rounded-full px-3 py-3 text-sm font-semibold disabled:opacity-70"
                  style={{ color: "var(--lb-accent-text)" }}
                >
                  {callLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Calling...
                    </span>
                  ) : (
                    <>
                      <PhoneCall size={16} />
                      Call
                    </>
                  )}
                </button>
              </div>

              <div className="mt-2 flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--lb-muted)" }}>
                <Headset size={12} />
                Activation support available instantly.
              </div>
              <div className="mt-1 text-center text-[10px]" style={{ color: "var(--lb-subtle)" }}>
                {accountName || accountCode ? (
                  <span className="inline-flex items-center gap-1">
                    <UserRound size={11} />
                    {accountName || "Member"} {accountCode ? `(${accountCode})` : ""}
                  </span>
                ) : null}
              </div>
            </div>
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function MessageIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}
