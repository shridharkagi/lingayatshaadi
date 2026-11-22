"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Check, PhoneCall, X } from "lucide-react";
import { useAppConfig } from "@/contexts/AppConfigContext";

export type ProfileApprovalModalVariant = "created" | "updated";

interface ProfileCreatedApprovalModalProps {
  open: boolean;
  accountName: string;
  onClose: () => void;
  /** First-time submit vs edit of an existing profile — copy and WhatsApp preset differ. */
  variant?: ProfileApprovalModalVariant;
  /** Gender of the profile just submitted; "Explore" opens the opposite list. */
  profileGender?: "male" | "female" | null;
}

function WhatsAppGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

const STEPS = ["Submitted", "Under review", "Live"] as const;

export function ProfileCreatedApprovalModal({
  open,
  accountName,
  onClose,
  variant = "created",
  profileGender = null,
}: ProfileCreatedApprovalModalProps) {
  const { config } = useAppConfig();

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

  const isUpdate = variant === "updated";
  const safeName = accountName.trim() || "User";
  const message = isUpdate
    ? `My name is ${safeName}. I have updated my profile — please review it for approval.`
    : `My name is ${safeName}, Please approve my profile.`;
  const callDigits = (config.callContactNumber || "6360130905").replace(/\D/g, "");
  let waDigits = (config.whatsappContactNumber || config.callContactNumber || "6360130905").replace(/\D/g, "");
  if (waDigits.length === 10) waDigits = `91${waDigits}`;
  const whatsappHref = `https://wa.me/${waDigits}?text=${encodeURIComponent(message)}`;

  // A bride's family looks for grooms and vice versa.
  const explore =
    profileGender === "female"
      ? { href: "/grooms", label: "Explore Groom profiles" }
      : profileGender === "male"
        ? { href: "/brides", label: "Explore Bride profiles" }
        : { href: "/profiles", label: "Explore profiles" };

  const titleId = isUpdate ? "profile-updated-title" : "profile-created-title";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={onClose}
    >
      <div
        className="lb-card relative my-auto w-full max-w-[400px] overflow-hidden shadow-2xl"
        style={{ animation: "lb-pop-in .28s ease-out both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* soft gold glow behind the badge */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40"
          style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--lb-accent-tint), transparent 70%)" }}
        />

        <button
          type="button"
          onClick={onClose}
          className="lb-btn-glass absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full"
          style={{ color: "var(--lb-text-2)" }}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <div className="relative max-h-[90dvh] overflow-y-auto px-5 pb-5 pt-7 sm:px-6">
          <div className="flex flex-col items-center text-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ backgroundImage: "var(--lb-accent-grad)", boxShadow: "0 10px 30px var(--lb-accent-glow)" }}
            >
              <Check size={30} strokeWidth={3} style={{ color: "var(--lb-on-accent)" }} />
            </div>
            <h2 id={titleId} className="mt-4 text-xl font-bold leading-tight" style={{ color: "var(--lb-text)" }}>
              {isUpdate ? "Profile updated" : "Profile created"}
            </h2>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--lb-text-2)" }}>
              {isUpdate
                ? "Your changes are with our team for a quick review."
                : "It’s with our team for review. Approval usually takes a few hours, at most 24."}
            </p>
          </div>

          {/* Progress: Submitted → Under review → Live */}
          <ol className="mt-5 flex items-start" aria-label="Approval progress">
            {STEPS.map((step, i) => {
              const done = i === 0;
              const current = i === 1;
              return (
                <li key={step} className="flex flex-1 flex-col items-center text-center">
                  <div className="flex w-full items-center">
                    <span
                      className="h-px flex-1"
                      style={{ background: i === 0 ? "transparent" : i === 1 ? "var(--lb-accent)" : "var(--lb-line-strong)" }}
                    />
                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                      style={
                        done
                          ? { backgroundImage: "var(--lb-accent-grad)", color: "var(--lb-on-accent)" }
                          : current
                            ? { border: "2px solid var(--lb-accent)", color: "var(--lb-accent-text)" }
                            : { border: "1px solid var(--lb-line-strong)", color: "var(--lb-subtle)" }
                      }
                    >
                      {done ? <Check size={13} strokeWidth={3} /> : i + 1}
                    </span>
                    <span
                      className="h-px flex-1"
                      style={{ background: i === 2 ? "transparent" : i === 0 ? "var(--lb-accent)" : "var(--lb-line-strong)" }}
                    />
                  </div>
                  <span
                    className="mt-1.5 text-[11px] font-medium"
                    style={{ color: current ? "var(--lb-accent-text)" : done ? "var(--lb-text-2)" : "var(--lb-subtle)" }}
                  >
                    {step}
                  </span>
                </li>
              );
            })}
          </ol>

          <Link
            href={explore.href}
            onClick={onClose}
            className="lb-btn-primary mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-semibold"
          >
            {explore.label}
            <ArrowRight size={18} />
          </Link>

          <p className="mt-5 text-center text-xs" style={{ color: "var(--lb-muted)" }}>
            Want it approved faster? Ask us directly.
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="lb-btn-glass flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
              style={{ color: "#86EFAC" }}
            >
              <WhatsAppGlyph className="h-4 w-4" />
              WhatsApp
            </a>
            <a
              href={`tel:${callDigits}`}
              className="lb-btn-glass flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold"
              style={{ color: "var(--lb-accent-text)" }}
            >
              <PhoneCall size={16} />
              Call us
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
