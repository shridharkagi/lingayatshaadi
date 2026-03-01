"use client";

import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Edit2, Shield, Heart, Settings, ChevronRight, Camera, Images, Briefcase, Share2 } from "lucide-react";
import { getAge } from "@/lib/utils";
import { HobbyTag } from "@/components/ui/HobbyTag";
import { LanguageTag } from "@/components/ui/LanguageTag";
import { getMemberIdDisplay, getProfileSlug } from "@/lib/memberId";
import { Profile } from "@/types";

async function handleShareProfile(user: Profile) {
  const url = typeof window !== "undefined" ? `${window.location.origin}/profile/${getProfileSlug(user)}` : "";
  const title = `${user.fullName} - LingayatShaadi Profile`;
  const text = `Check out my profile on LingayatShaadi`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text, url });
    } catch (err) {
      if ((err as Error).name !== "AbortError") copyToClipboard(url);
    }
  } else {
    copyToClipboard(url);
  }
}

function copyToClipboard(text: string) {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    document.body.removeChild(ta);
  } else {
    navigator.clipboard.writeText(text);
  }
}

export default function MyProfilePage() {
  const { user, isLoggedIn, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isLoggedIn) router.replace("/login");
  }, [loading, isLoggedIn, router]);

  if (loading || !user) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto min-h-screen bg-[var(--background)]">
      {/* Orange Header with rounded bottom corners */}
      <header className="bg-[var(--primary)] text-white px-6 py-5 rounded-b-[20px] shadow-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">My Profile</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleShareProfile(user)}
              className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition"
              aria-label="Share my profile"
            >
              <Share2 size={20} />
            </button>
            <Link href="/settings" className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition">
              <Settings size={20} />
            </Link>
          </div>
        </div>
      </header>

      <div className="px-4 mt-4">
        {/* Profile Picture Card */}
        <div className="bg-white rounded-2xl shadow-md overflow-hidden mb-4">
          <div className="relative h-64 bg-gradient-to-br from-gray-100 to-gray-200">
            <Image
              src={user.profilePhoto || "/placeholder.svg"}
              alt={user.fullName}
              fill
              className="object-cover rounded-t-2xl"
              unoptimized
              priority
            />
            {/* Profile Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-black/70 via-black/40 to-transparent">
              <h2 className="text-xl font-bold text-white mb-1">{user.fullName}</h2>
              <p className="text-white/95 text-sm mb-1.5">
                {getAge(user.dateOfBirth)} yrs • {user.height}&quot;
              </p>
              {user.profession && (
                <p className="text-white/95 text-sm flex items-center gap-1.5">
                  <Briefcase size={14} className="flex-shrink-0" />
                  {user.profession}
                </p>
              )}
            </div>
            {/* Verification Badge */}
            {user.verified && (
              <div className="absolute top-3 right-3 bg-[var(--color-accent-gold)] text-[var(--color-secondary-dark)] text-xs px-3 py-1.5 rounded-full flex items-center gap-1 font-semibold shadow-sm">
                <Shield size={14} fill="currentColor" />
                Verified
              </div>
            )}
            {/* Camera Button - Orange Circular */}
            <Link 
              href="/profile/photos" 
              className="absolute bottom-3 right-3 p-3 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition shadow-md"
            >
              <Camera size={20} className="text-white" />
            </Link>
          </div>
        </div>

        {/* Menu Options - Clean White Cards */}
        <div className="space-y-3 mb-4">
          <Link 
            href="/profile/edit" 
            className="flex items-center justify-between p-4 rounded-xl bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                <Edit2 size={20} className="text-[var(--primary)]" />
              </div>
              <span className="font-medium text-[var(--foreground)]">Edit Profile</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>

          <Link 
            href="/profile/preferences" 
            className="flex items-center justify-between p-4 rounded-xl bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                <Heart size={20} className="text-[var(--primary)]" />
              </div>
              <span className="font-medium text-[var(--foreground)]">Match Preferences</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>

          <Link 
            href="/profile/photos" 
            className="flex items-center justify-between p-4 rounded-xl bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                <Images size={20} className="text-[var(--primary)]" />
              </div>
              <span className="font-medium text-[var(--foreground)]">Photo Gallery</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>

          <Link 
            href="/membership" 
            className="flex items-center justify-between p-4 rounded-xl bg-white hover:bg-gray-50 transition shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                <Shield size={20} className="text-[var(--primary)]" />
              </div>
              <span className="font-medium text-[var(--foreground)]">Trust Badge & Membership</span>
            </div>
            <ChevronRight size={20} className="text-gray-400" />
          </Link>
        </div>

        {/* Profile Details Section */}
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
          <h3 className="font-semibold text-lg text-[var(--foreground)] mb-4">Profile Details</h3>
          
          {user.aboutMeVisible && user.aboutMe && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <h4 className="text-sm font-medium text-gray-500 mb-2">About Me</h4>
              <p className="text-sm text-gray-700 leading-relaxed">{user.aboutMe}</p>
            </div>
          )}
          
          {user.hobbies && user.hobbies.length > 0 && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-500">Hobbies and Interests</h4>
                <Link href="/profile/edit" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <Edit2 size={16} />
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {user.hobbies.map((hobby) => (
                  <HobbyTag key={hobby} label={hobby} />
                ))}
              </div>
            </div>
          )}
          
          {((user.languagesKnown && user.languagesKnown.trim()) || user.motherTongue) && (
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-500">Languages</h4>
                <Link href="/profile/edit" className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                  <Edit2 size={16} />
                </Link>
              </div>
              <div className="flex flex-wrap gap-2">
                {(() => {
                  const langs = (user.languagesKnown || "")
                    .split(",")
                    .map((l) => l.trim())
                    .filter(Boolean);
                  const motherTongue = user.motherTongue?.trim();
                  const seen = new Set<string>();
                  const tags: { label: string; isMotherTongue: boolean }[] = [];
                  if (motherTongue && !seen.has(motherTongue)) {
                    tags.push({ label: motherTongue, isMotherTongue: true });
                    seen.add(motherTongue);
                  }
                  langs.forEach((l) => {
                    if (!seen.has(l)) {
                      tags.push({ label: l, isMotherTongue: l === motherTongue });
                      seen.add(l);
                    }
                  });
                  return tags.map((t) => (
                    <LanguageTag
                      key={t.label}
                      label={t.label}
                      isMotherTongue={t.isMotherTongue}
                    />
                  ));
                })()}
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3 text-sm">
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Member ID</span>
              <span className="font-medium text-[var(--foreground)]">{getMemberIdDisplay(user)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Caste</span>
              <span className="font-medium text-[var(--foreground)]">{user.caste} {user.subCaste && `• ${user.subCaste}`}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Education</span>
              <span className="font-medium text-[var(--foreground)]">{user.qualification || "-"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Profession</span>
              <span className="font-medium text-[var(--foreground)]">{user.profession || "-"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Location</span>
              <span className="font-medium text-[var(--foreground)]">{user.city}, {user.state}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Contact</span>
              <span className="font-medium text-[var(--foreground)]">{user.contact || "-"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
