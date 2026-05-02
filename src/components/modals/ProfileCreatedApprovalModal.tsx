"use client";

import { useEffect } from "react";
import {
  Award,
  ChevronRight,
  Clock,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
  Lock,
  X,
} from "lucide-react";

interface ProfileCreatedApprovalModalProps {
  open: boolean;
  accountName: string;
  onClose: () => void;
}

const SUPPORT_PHONE = "6360130905";

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      fill="currentColor"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ProfileCreatedApprovalModal({
  open,
  accountName,
  onClose,
}: ProfileCreatedApprovalModalProps) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const safeName = accountName.trim() || "User";
  const message = `My name is ${safeName}, Please approve my profile.`;
  const whatsappHref = `https://wa.me/91${SUPPORT_PHONE}?text=${encodeURIComponent(message)}`;
  const callHref = `tel:${SUPPORT_PHONE}`;

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-created-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5 transition-all duration-200 ease-out"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="relative px-5 pb-5 pt-7 sm:px-7 sm:pb-6 sm:pt-8">
          {/* Decorative sparkles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-emerald-50 blur-2xl" />
            <div className="absolute -right-12 top-10 h-44 w-44 rounded-full bg-amber-50 blur-2xl" />
            <span className="absolute left-8 top-16 text-emerald-300/70">
              <Sparkles size={14} />
            </span>
            <span className="absolute right-16 top-24 text-emerald-300/60">
              <Sparkles size={12} />
            </span>
          </div>

          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-b from-emerald-50 to-white shadow-[0_10px_30px_rgba(16,185,129,0.18)] ring-1 ring-emerald-100">
              <div className="absolute -left-2 -top-1 text-emerald-300/80">+</div>
              <div className="absolute -right-1 top-2 text-emerald-300/70">+</div>
              <div className="absolute -bottom-1 left-3 h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-white shadow-inner">
                <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
                  />
                </svg>
              </div>
            </div>

            <h2
              id="profile-created-title"
              className="text-[1.35rem] font-bold leading-tight text-slate-900 sm:text-2xl"
            >
              Profile Created Successfully!
            </h2>
            <div className="mx-auto mt-3 h-1 w-16 rounded-full bg-emerald-500" />

            <p className="mt-4 text-sm leading-relaxed text-slate-600">
              Your profile has been created and is currently pending approval.
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-600">
              Approval may take up to 24 hours.
            </p>
          </div>

          <div className="relative mt-5 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3.5 py-3 text-left">
            <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-100">
              <Zap size={18} />
            </div>
            <p className="text-sm leading-snug text-emerald-900/90">
              Most profiles get approved faster when you request approval directly.
            </p>
          </div>

          <div className="relative mt-5 grid grid-cols-3 gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-2 py-3 text-center">
            <div className="flex flex-col items-center gap-1 border-r border-slate-200/80 px-1">
              <ShieldCheck className="text-emerald-600" size={18} />
              <span className="text-[11px] font-semibold leading-tight text-slate-800">
                Secure &amp; Verified
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 border-r border-slate-200/80 px-1">
              <Clock className="text-emerald-600" size={18} />
              <span className="text-[11px] font-semibold leading-tight text-slate-800">
                Faster Activation
              </span>
            </div>
            <div className="flex flex-col items-center gap-1 px-1">
              <Award className="text-emerald-600" size={18} />
              <span className="text-[11px] font-semibold leading-tight text-slate-800">
                Trusted Support
              </span>
            </div>
          </div>

          <div className="relative mt-4 flex items-center justify-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900 ring-1 ring-amber-100">
            <Star size={14} className="text-amber-500" fill="currentColor" />
            <span>90% of profiles get approved within a few hours!</span>
          </div>

          <div className="relative mt-5 flex flex-col gap-3">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group inline-flex items-center justify-between gap-3 rounded-2xl bg-[#25D366] px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(37,211,102,0.35)] transition hover:brightness-105"
            >
              <span className="inline-flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <WhatsAppGlyph className="h-5 w-5 text-white" />
                </span>
                <span className="text-left leading-snug">Request Approval on WhatsApp</span>
              </span>
              <ChevronRight
                size={20}
                className="opacity-90 transition group-hover:translate-x-0.5"
              />
            </a>

            <a
              href={callHref}
              className="group inline-flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-slate-50"
            >
              <span className="inline-flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
                  <PhoneCall size={18} />
                </span>
                <span className="text-left leading-snug">
                  Call Support{" "}
                  <span className="font-bold tabular-nums">{SUPPORT_PHONE}</span>
                </span>
              </span>
              <ChevronRight
                size={20}
                className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600"
              />
            </a>
          </div>

          <p className="relative mt-4 flex items-center justify-center gap-2 text-center text-[11px] leading-relaxed text-slate-500">
            <Lock size={12} className="shrink-0 text-slate-400" />
            Our team will review and approve your profile shortly.
          </p>
        </div>
      </div>
    </div>
  );
}
