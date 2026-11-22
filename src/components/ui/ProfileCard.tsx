"use client";

import { memo } from "react";
import Link from "next/link";
import Image from "@/components/ui/SmartImage";
import { MapPin, Briefcase, Check, ArrowRight } from "lucide-react";
import { Profile } from "@/types";
import { getAge } from "@/lib/utils";
import { getProfileSlug } from "@/lib/memberId";
import { formatHeightShort } from "@/lib/formatHeight";

interface ProfileCardProps {
  profile: Profile;
  /** For profile detail page - mask name when not logged in */
  displayName?: string;
  /** "card" = responsive (horizontal on mobile, vertical on desktop). "list" = always horizontal */
  variant?: "card" | "list";
}

function ageHeightLine(profile: Profile): string {
  const age = getAge(profile.dateOfBirth);
  const height = formatHeightShort(profile.height);
  return [age ? `${age} yrs` : null, height].filter(Boolean).join(" · ");
}

function VerifiedPill({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`lb-verified absolute left-2 bottom-2 inline-flex items-center gap-1 rounded-full font-bold shadow-[0_2px_8px_rgba(0,0,0,0.35)] ${
        compact ? "h-[22px] px-2 text-[10.5px]" : "h-6 px-2.5 text-[11px]"
      }`}
      title="Verified profile"
    >
      <Check size={compact ? 11 : 12} strokeWidth={3.2} aria-hidden />
      Verified
    </span>
  );
}

function ProfileCardComponent({ profile, displayName, variant = "card" }: ProfileCardProps) {
  const name = displayName ?? profile.fullName;
  const profileHref = `/profile/${getProfileSlug(profile)}`;
  const meta = ageHeightLine(profile);
  const place = [profile.city, profile.state].filter(Boolean).join(", ");

  return (
    <Link
      href={profileHref}
      className="group block h-full rounded-[14px] border border-[var(--lb-line)] bg-[var(--lb-surface)] shadow-[0_10px_28px_rgba(0,0,0,0.35)] transition-all duration-200 hover:border-[var(--lb-line-strong)] lg:hover:-translate-y-0.5 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lb-accent)]/50"
      aria-label={`Open profile of ${name || "member"}`}
    >
      {/* Mobile / list: inset photo left, details right */}
      <div className={`flex flex-row gap-3.5 p-2 ${variant === "list" ? "" : "lg:hidden"}`}>
        <div className="relative w-[38%] min-w-[118px] max-w-[176px] aspect-[3/4] flex-shrink-0 overflow-hidden rounded-2xl bg-[var(--lb-raised)]">
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={`Profile photo of ${name || "member"}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 640px) 40vw, 176px"
            loading="lazy"
            quality={85}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/60 to-transparent" />
          {profile.verified && <VerifiedPill compact />}
        </div>
        <div className="flex min-w-0 flex-1 flex-col py-1.5 pr-1">
          <h3 className="truncate text-[15.5px] font-semibold leading-snug text-[var(--lb-text)]">{name}</h3>
          {meta && <p className="mt-0.5 text-[13px] font-medium text-[var(--lb-accent-text)]">{meta}</p>}
          <div className="mt-2.5 space-y-1.5">
            {profile.profession && (
              <p className="flex items-center gap-1.5 truncate text-[13px] text-[var(--lb-muted)]">
                <Briefcase size={13} className="flex-shrink-0 text-[var(--lb-subtle)]" aria-hidden />
                <span className="truncate">{profile.profession}</span>
              </p>
            )}
            {place && (
              <p className="flex items-center gap-1.5 truncate text-[13px] text-[var(--lb-muted)]">
                <MapPin size={13} className="flex-shrink-0 text-[var(--lb-subtle)]" aria-hidden />
                <span className="truncate">{place}</span>
              </p>
            )}
          </div>
          <span
            className="lb-btn-glass mt-auto flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[13.5px] font-semibold text-[var(--lb-accent-text)] group-hover:bg-white/10"
            aria-hidden
          >
            View profile
            <ArrowRight size={15} strokeWidth={2.2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>

      {/* Desktop card: photo on top, details below */}
      <div className={variant === "list" ? "hidden" : "hidden lg:block p-2"}>
        <div className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-[var(--lb-raised)]">
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={`Profile photo of ${name || "member"}`}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            sizes="(max-width: 1024px) 50vw, (max-width: 1280px) 25vw, 18vw"
            loading="lazy"
            quality={85}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
          {profile.verified && <VerifiedPill />}
        </div>
        <div className="flex min-h-[156px] flex-col px-2 pb-2 pt-3">
          <h3 className="truncate text-[16px] font-semibold leading-tight text-[var(--lb-text)]">{name}</h3>
          {meta && <p className="mt-1 text-[13px] font-medium text-[var(--lb-accent-text)]">{meta}</p>}
          <div className="mt-2 flex-1 space-y-1.5">
            {profile.profession && (
              <p className="flex items-center gap-1.5 truncate text-[13px] text-[var(--lb-muted)]">
                <Briefcase size={13} className="flex-shrink-0 text-[var(--lb-subtle)]" aria-hidden />
                <span className="truncate">{profile.profession}</span>
              </p>
            )}
            {place && (
              <p className="flex items-center gap-1.5 truncate text-[13px] text-[var(--lb-muted)]">
                <MapPin size={13} className="flex-shrink-0 text-[var(--lb-subtle)]" aria-hidden />
                <span className="truncate">{place}</span>
              </p>
            )}
          </div>
          <span
            className="lb-btn-glass mt-3 flex h-10 items-center justify-center gap-1.5 rounded-[10px] text-[13.5px] font-semibold text-[var(--lb-accent-text)] group-hover:bg-white/10"
            aria-hidden
          >
            View profile
            <ArrowRight size={15} strokeWidth={2.2} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

// Memoize the component to prevent unnecessary re-renders
export const ProfileCard = memo(ProfileCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.profile.id === nextProps.profile.id &&
    prevProps.profile.profilePhoto === nextProps.profile.profilePhoto &&
    prevProps.profile.verified === nextProps.profile.verified &&
    prevProps.profile.height === nextProps.profile.height &&
    prevProps.displayName === nextProps.displayName &&
    prevProps.variant === nextProps.variant
  );
});
