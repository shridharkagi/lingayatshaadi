"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
  memberId?: string;
  name?: string;
  whatsappNumber?: string;
  callNumber?: string;
};

const GOLD = "#C9A227";

const benefits = [
  "View Phone Number",
  "View Full Biodata",
  "Send Unlimited Interests",
  "Access Family Details",
  "Priority Support",
  "WhatsApp Assistance",
];

function sanitizePhone(input?: string) {
  return (input || "").replace(/\D/g, "");
}

export function PremiumUnlockModal({
  isOpen,
  onClose,
  memberId,
  name,
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

  const waMessage = useMemo(() => {
    const resolvedMemberId = (memberId || "N/A").trim();
    const resolvedName = (name || "N/A").trim();
    return `Hi, My member ID is: ${resolvedMemberId} and my name is ${resolvedName}, I would like to upgrade my Lingayat Bandhu membership plan. Please share details.`;
  }, [memberId, name]);

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
          className="fixed inset-0 z-[90] bg-black/45 backdrop-blur-[2px] flex items-end justify-center"
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
            className="w-full max-w-lg rounded-t-[28px] bg-white text-slate-900 shadow-[0_-12px_45px_rgba(0,0,0,0.22)] dark:bg-zinc-900 dark:text-zinc-100"
            initial={{ y: 480, opacity: 0.85 }}
            animate={{ y: dragDeltaY, opacity: 1 }}
            exit={{ y: 520, opacity: 0.9 }}
            transition={{ type: "spring", stiffness: 330, damping: 34, mass: 0.95 }}
            onTouchStart={handleSheetTouchStart}
            onTouchMove={handleSheetTouchMove}
            onTouchEnd={handleSheetTouchEnd}
          >
            <div className="mx-auto mt-2.5 h-1.5 w-14 rounded-full bg-slate-300/85 dark:bg-zinc-700" />

            <div className="px-5 pt-4 pb-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 id="premium-unlock-title" className="text-[1.15rem] font-bold tracking-tight">
                    Unlock Full Profile Access
                  </h2>
                  <p className="mt-1.5 text-sm text-slate-600 dark:text-zinc-300">
                    Connect directly with this profile and access complete details.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 active:scale-95 transition dark:hover:bg-zinc-800 dark:text-zinc-400"
                  aria-label="Close premium unlock modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-[#f2e5bf] bg-gradient-to-br from-[#fffdf5] to-[#fff6dc] px-4 py-3 dark:border-zinc-700 dark:from-zinc-900 dark:to-zinc-900">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-[#fff2c6] px-2.5 py-1 text-[11px] font-semibold text-[#7a5b06] dark:bg-zinc-800 dark:text-zinc-200">
                  <Sparkles size={12} />
                  Premium Benefits
                </div>
                <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {benefits.map((item) => (
                    <li
                      key={item}
                      className="inline-flex items-center gap-2 rounded-xl bg-white/85 px-2.5 py-2 text-[13px] font-medium text-slate-700 shadow-sm dark:bg-zinc-800 dark:text-zinc-200"
                    >
                      <CheckCircle2 size={14} style={{ color: GOLD }} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                <div className="inline-flex items-center gap-1.5 font-semibold text-slate-700 dark:text-zinc-200">
                  <ShieldCheck size={13} />
                  Trusted by Lingayat families across Karnataka.
                </div>
                <p className="mt-1 text-[11.5px] opacity-90">
                  Most members upgrade to connect faster.
                </p>
              </div>
            </div>

            <div className="sticky bottom-0 rounded-t-2xl border-t border-slate-200 bg-white/95 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-zinc-700 dark:bg-zinc-900/95">
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={openWhatsApp}
                  disabled={waLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3.5 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(37,211,102,0.35)] transition hover:brightness-95 active:scale-[0.99] disabled:opacity-70"
                >
                  {waLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
                      Opening WhatsApp...
                    </span>
                  ) : (
                    <>
                      <MessageIcon />
                      Upgrade via WhatsApp
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={callSupport}
                  disabled={callLoading}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.99] disabled:opacity-70 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                >
                  {callLoading ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-400/70 border-t-slate-700 dark:border-zinc-500 dark:border-t-zinc-100" />
                      Calling...
                    </span>
                  ) : (
                    <>
                      <PhoneCall size={16} />
                      Call Support
                    </>
                  )}
                </button>
              </div>

              <div className="mt-2.5 flex items-center justify-center gap-1.5 text-[11px] text-slate-500 dark:text-zinc-400">
                <Headset size={12} />
                Activation support available instantly.
              </div>
              <div className="mt-1 text-center text-[10px] text-slate-400 dark:text-zinc-500">
                {memberId || name ? (
                  <span className="inline-flex items-center gap-1">
                    <UserRound size={11} />
                    {name || "Member"} {memberId ? `(${memberId})` : ""}
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
