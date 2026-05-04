"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ChevronRight,
  Clock,
  Phone,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { useAuth } from "@/contexts/AuthContext";

type SignupWelcomeModalProps = {
  open: boolean;
  onClose: () => void;
};

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function SignupWelcomeModal({ open, onClose }: SignupWelcomeModalProps) {
  const { config } = useAppConfig();
  const { accountMeta } = useAuth();

  const callDigits = useMemo(
    () => (config.callContactNumber || "6360130905").replace(/\D/g, ""),
    [config.callContactNumber]
  );
  const waDigits = useMemo(
    () => (config.whatsappContactNumber || config.callContactNumber || "6360130905").replace(/\D/g, ""),
    [config.whatsappContactNumber, config.callContactNumber]
  );

  const whatsappHelpHref = useMemo(() => {
    const name = accountMeta?.fullName?.trim();
    const base = config.whatsappDefaultMessage || "I need assistance, my name: ";
    const text = `${base}${name ? ` ${name}` : ""} — I'm new and would like help completing my profile on LingayatBandhu.`;
    return `https://wa.me/91${waDigits}?text=${encodeURIComponent(text)}`;
  }, [accountMeta?.fullName, config.whatsappDefaultMessage, waDigits]);

  const callHref = `tel:${callDigits}`;
  const communityHref =
    config.whatsappGroupUrl?.trim() ||
    "/contact";

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

  const isExternalCommunity = /^https?:\/\//i.test(communityHref);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-black/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="signup-welcome-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl ring-1 ring-black/5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={20} />
        </button>

        <div className="relative px-5 pb-6 pt-8 sm:px-7 sm:pb-7 sm:pt-9">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -left-8 -top-8 h-36 w-36 rounded-full bg-emerald-50 blur-2xl" />
            <div className="absolute -right-10 top-8 h-40 w-40 rounded-full bg-amber-50/80 blur-2xl" />
            <span className="absolute left-10 top-20 text-amber-300">⭐</span>
            <span className="absolute right-14 top-28 text-emerald-300 text-xs">✦</span>
            <span className="absolute left-20 top-14 text-emerald-200 text-xs">+</span>
          </div>

          <div className="relative flex flex-col items-center text-center">
            <div className="relative mb-5">
              <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-gradient-to-b from-emerald-100 to-emerald-50 shadow-[0_12px_32px_rgba(16,185,129,0.2)] ring-2 ring-white">
                <div className="flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-emerald-500 text-white shadow-inner">
                  <UserPlus className="h-8 w-8" strokeWidth={2} aria-hidden />
                </div>
              </div>
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-[11px] font-bold text-white shadow-md ring-2 ring-white">
                +
              </span>
            </div>

            <h2
              id="signup-welcome-title"
              className="text-[1.35rem] font-bold leading-snug text-slate-900 sm:text-2xl"
            >
              Complete Your Profile to Get{" "}
              <span className="text-emerald-600">Matches Faster!</span>{" "}
              <span aria-hidden>🚀</span>
            </h2>

            <p className="mt-3 inline-flex flex-wrap items-center justify-center gap-1.5 text-sm text-emerald-700">
              <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" aria-hidden />
              <span>
                Profiles with complete details get{" "}
                <span className="font-bold text-emerald-600">3x more responses</span>
              </span>
            </p>

            <p className="mt-4 max-w-sm text-sm leading-relaxed text-slate-600">
              Your account is ready! Create your profile now to unlock all features and grow your presence.
            </p>
          </div>

          <div className="relative mt-6 space-y-3">
            <div className="relative">
              <span className="absolute -top-2.5 right-4 z-[1] rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                ⭐ Recommended
              </span>
              <Link
                href="/profile/complete"
                onClick={onClose}
                className="group flex w-full items-center justify-between gap-3 rounded-2xl bg-emerald-600 px-4 py-4 text-left text-white shadow-[0_14px_36px_rgba(5,150,105,0.35)] transition hover:bg-emerald-700"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/15">
                    <UserPlus className="h-6 w-6" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-base font-bold leading-tight">Create Profile for Free</span>
                    <span className="mt-0.5 block text-sm font-normal text-emerald-50/95">
                      It only takes a few minutes
                    </span>
                  </span>
                </span>
                <ChevronRight className="h-6 w-6 shrink-0 opacity-90 transition group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left shadow-sm transition hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600 ring-1 ring-violet-100">
                  <Clock className="h-6 w-6" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-base font-semibold text-slate-800">Create Later</span>
                  <span className="mt-0.5 block text-sm text-slate-500">
                    You can create your profile anytime from your dashboard
                  </span>
                </span>
              </span>
              <ChevronRight className="h-6 w-6 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-600" aria-hidden />
            </button>
          </div>

          <div className="relative my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Need help?</span>
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="relative space-y-2.5">
            <a
              href={whatsappHelpHref}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-emerald-50/90 px-3.5 py-3.5 ring-1 ring-emerald-100/80 transition hover:bg-emerald-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white shadow-sm">
                  <WhatsAppGlyph className="h-5 w-5" />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-semibold text-slate-900">Get Help on WhatsApp</span>
                  <span className="mt-0.5 block text-xs text-slate-600">Quick help to create your profile</span>
                </span>
              </span>
              <span className="hidden shrink-0 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-semibold text-emerald-800 sm:inline">
                We&apos;re here to help
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
            </a>

            <a
              href={callHref}
              className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-sky-50/90 px-3.5 py-3.5 ring-1 ring-sky-100/80 transition hover:bg-sky-50"
            >
              <span className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm">
                  <Phone className="h-5 w-5" strokeWidth={2} aria-hidden />
                </span>
                <span className="min-w-0 text-left">
                  <span className="block text-sm font-semibold text-slate-900">Call Us</span>
                  <span className="mt-0.5 block text-xs text-slate-600">Speak to our support team</span>
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1">
                <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold tabular-nums text-sky-900">
                  {callDigits}
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400" aria-hidden />
              </span>
            </a>

            {isExternalCommunity ? (
              <a
                href={communityHref}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-violet-50/90 px-3.5 py-3.5 ring-1 ring-violet-100/80 transition hover:bg-violet-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                    <Users className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold text-slate-900">Join Our Community Group</span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      Connect with others &amp; get important updates
                    </span>
                  </span>
                </span>
                <span className="hidden shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-900 sm:inline">
                  Stay updated
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              </a>
            ) : (
              <Link
                href={communityHref}
                onClick={onClose}
                className="group flex w-full items-center justify-between gap-2 rounded-2xl bg-violet-50/90 px-3.5 py-3.5 ring-1 ring-violet-100/80 transition hover:bg-violet-50"
              >
                <span className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white shadow-sm">
                    <Users className="h-5 w-5" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="min-w-0 text-left">
                    <span className="block text-sm font-semibold text-slate-900">Join Our Community Group</span>
                    <span className="mt-0.5 block text-xs text-slate-600">
                      Connect with others — get the invite link from contact
                    </span>
                  </span>
                </span>
                <span className="hidden shrink-0 rounded-full bg-violet-100 px-2 py-1 text-[10px] font-semibold text-violet-900 sm:inline">
                  Stay updated
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
              </Link>
            )}
          </div>

          <p className="relative mt-6 flex items-start justify-center gap-2 text-center text-[11px] leading-relaxed text-slate-500">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
            <span>
              Your information is safe with us. We&apos;re here to support you every step of the way.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
