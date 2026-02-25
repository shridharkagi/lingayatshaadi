"use client";

import Link from "next/link";
import Image from "next/image";
import { MapPin, Briefcase, BadgeCheck } from "lucide-react";
import { Profile } from "@/types";
import { getAge } from "@/lib/utils";

interface ProfileCardProps {
  profile: Profile;
  /** For profile detail page - mask name when not logged in */
  displayName?: string;
  /** "card" = responsive (horizontal on mobile, vertical on desktop). "list" = always horizontal */
  variant?: "card" | "list";
}

export function ProfileCard({ profile, displayName, variant = "card" }: ProfileCardProps) {
  const name = displayName ?? profile.fullName;

  return (
    <div className="bg-white rounded-[10px] overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-shadow border border-[var(--color-border)]">
      {/* Mobile / List: horizontal layout - image left, details right */}
      <div className={`flex flex-row ${variant === "list" ? "" : "lg:hidden"}`}>
        <div className="relative w-28 min-w-[9rem] aspect-[3/4] bg-gray-200 flex-shrink-0 overflow-hidden">
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={profile.fullName}
            fill
            className="object-cover"
            unoptimized
          />
          {profile.verified && (
            <div className="absolute bottom-2 left-2 w-7 h-7 flex items-center justify-center bg-[var(--color-accent-gold)] rounded-[8px] shadow-[var(--shadow-soft)]" title="Verified">
              <BadgeCheck size={16} className="text-[var(--color-secondary-dark)]" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 p-4 flex flex-col justify-between overflow-hidden">
          <div className="min-w-0">
            <h3 className="font-semibold text-[var(--color-secondary-dark)] truncate">{name}</h3>
            <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
              {getAge(profile.dateOfBirth)} yrs • {profile.height}" • {profile.maritalStatus}
            </p>
            {profile.city && (
              <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1 truncate">
                <MapPin size={12} className="flex-shrink-0" />
                {profile.city}
                {profile.state && `, ${profile.state}`}
              </p>
            )}
            {profile.profession && (
              <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1 truncate">
                <Briefcase size={12} className="flex-shrink-0" />
                {profile.profession}
              </p>
            )}
          </div>
          <Link
            href={`/profile/${profile.id}`}
            className="mt-3 inline-flex w-fit py-2 px-4 rounded-[10px] font-medium text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>

      {/* Desktop card: vertical - image top, details below */}
      <div className={variant === "list" ? "hidden" : "hidden lg:block"}>
        <div className="relative aspect-[3/4] bg-gray-200">
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={profile.fullName}
            fill
            className="object-cover"
            unoptimized
          />
          {profile.verified && (
            <div className="absolute bottom-2 left-2 w-7 h-7 flex items-center justify-center bg-[var(--color-accent-gold)] rounded-[8px] shadow-[var(--shadow-soft)]" title="Verified">
              <BadgeCheck size={16} className="text-[var(--color-secondary-dark)]" strokeWidth={2.5} />
            </div>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-semibold text-[var(--color-secondary-dark)] truncate">{name}</h3>
          <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
            {getAge(profile.dateOfBirth)} yrs • {profile.height}" • {profile.maritalStatus}
          </p>
          {profile.city && (
            <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
              <MapPin size={12} className="flex-shrink-0" />
              {profile.city}
              {profile.state && `, ${profile.state}`}
            </p>
          )}
          {profile.profession && (
            <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1">
              <Briefcase size={12} className="flex-shrink-0" />
              {profile.profession}
            </p>
          )}
          <Link
            href={`/profile/${profile.id}`}
            className="mt-4 inline-flex w-fit py-2.5 px-4 rounded-[10px] font-medium text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
          >
            View Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
