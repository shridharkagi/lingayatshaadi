"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, useCallback, useEffect } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  Flag,
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Users,
  Calendar,
  GraduationCap,
  User,
  Ban,
  Briefcase,
  Images,
  X,
  Copy,
  Check,
} from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { hasAcceptedInterest, hasSentInterest, sendInterest } from "@/lib/api/interests";
import { recordProfileView } from "@/lib/api/profileViews";
import { addToShortlist, removeFromShortlist, isShortlisted } from "@/lib/api/shortlist";
import { blockUser } from "@/lib/api/blocked";
import { getNote, saveNote } from "@/lib/api/notes";
import { reportProfile } from "@/lib/api/reports";
import { getAge } from "@/lib/utils";
import {
  maskString,
  truncateToWords,
  wordCount,
  formatDateDDMMYYYY,
} from "@/lib/profileUtils";
import { getProfileSlug, parseProfileSlug, getMemberIdDisplay } from "@/lib/memberId";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { HobbyTag } from "@/components/ui/HobbyTag";
import { LanguageTag } from "@/components/ui/LanguageTag";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { Profile } from "@/types";
import { trackContactView } from "@/lib/contactViewHistory";

function ShareProfileButton({ profile }: { profile: Profile }) {
  const handleShare = async () => {
    const url = typeof window !== "undefined" ? `${window.location.origin}/profile/${getProfileSlug(profile)}` : "";
    const title = `${profile.fullName} - LingayatShaadi Profile`;
    const text = `Check out ${profile.fullName}'s profile on LingayatShaadi`;

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") copyToClipboard(url);
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
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
  };

  return (
    <button
      onClick={handleShare}
      className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
      aria-label="Share profile"
    >
      <Share2 size={20} />
    </button>
  );
}


/* Card section matching the reference design: icon + gray heading + black details */
function DetailSection({
  icon: Icon,
  heading,
  children,
}: {
  icon: React.ElementType;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 py-4 border-b border-gray-100 last:border-0 last:pb-0 first:pt-0">
      <Icon size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 mb-1">{heading}</p>
        <div className="text-sm sm:text-base text-[var(--foreground)] space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

export default function OtherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();
  const { config } = useAppConfig();
  const { profiles } = useProfiles();
  const [showContact, setShowContact] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [hasShownInterest, setHasShownInterest] = useState(false);
  const [interestAccepted, setInterestAccepted] = useState(false);
  const [sendingInterest, setSendingInterest] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingShortlist, setSavingShortlist] = useState(false);
  const [myNote, setMyNote] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportMessage, setReportMessage] = useState("");
  const [reporting, setReporting] = useState(false);
  const [copiedMemberId, setCopiedMemberId] = useState(false);

  const slugFromParams = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [displayedSlug, setDisplayedSlug] = useState(slugFromParams);

  useEffect(() => {
    setDisplayedSlug(slugFromParams);
  }, [slugFromParams]);

  const profile = (() => {
    const publicId = parseProfileSlug(slugFromParams);
    if (publicId) {
      return profiles.find(
        (p) =>
          (p.publicId || p.memberId || "").toUpperCase().replace(/-/g, "") === publicId.replace(/-/g, "")
      );
    }
    return profiles.find((p) => p.id === slugFromParams);
  })();

  const currentIdx = profile ? profiles.findIndex((p) => p.id === profile.id) : -1;
  const displayedId = profile?.id ?? displayedSlug;
  const [animClass, setAnimClass] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Reset showContact when profile changes
  useEffect(() => {
    setShowContact(false);
  }, [profile?.id]);

  // Record profile view when logged-in user views another profile
  useEffect(() => {
    if (user?.id && profile?.id && user.id !== profile.id) {
      recordProfileView(user.id, profile.id);
    }
  }, [user?.id, profile?.id]);

  // Fetch interest status and shortlist when profile or user changes
  useEffect(() => {
    if (!profile?.id || !user?.id) {
      setInterestAccepted(false);
      setHasShownInterest(false);
      setIsSaved(false);
      return;
    }
    hasAcceptedInterest(user.id, profile.id).then(({ data }) => setInterestAccepted(!!data));
    hasSentInterest(user.id, profile.id).then(({ data }) => setHasShownInterest(!!data));
    isShortlisted(user.id, profile.id).then(({ data }) => setIsSaved(!!data));
    getNote(user.id, profile.id).then(({ data }) => setMyNote(data || ""));
  }, [profile?.id, user?.id]);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0 || isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass("opacity-0 scale-95");
    const prevProfile = profiles[currentIdx - 1];
    const prevSlug = getProfileSlug(prevProfile);
    setTimeout(() => {
      setDisplayedSlug(prevSlug);
      router.replace(`/profile/${prevSlug}`, { scroll: false });
      requestAnimationFrame(() => {
        setAnimClass("opacity-0 scale-105");
        requestAnimationFrame(() => {
          setAnimClass("opacity-100 scale-100");
          setTimeout(() => setIsTransitioning(false), 300);
        });
      });
    }, 200);
  }, [currentIdx, router, isTransitioning, profiles]);

  const goNext = useCallback(() => {
    if (currentIdx < 0 || currentIdx >= profiles.length - 1 || isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass("opacity-0 scale-95");
    const nextProfile = profiles[currentIdx + 1];
    const nextSlug = getProfileSlug(nextProfile);
    setTimeout(() => {
      setDisplayedSlug(nextSlug);
      router.replace(`/profile/${nextSlug}`, { scroll: false });
      requestAnimationFrame(() => {
        setAnimClass("opacity-0 scale-105");
        requestAnimationFrame(() => {
          setAnimClass("opacity-100 scale-100");
          setTimeout(() => setIsTransitioning(false), 300);
        });
      });
    }, 200);
  }, [currentIdx, router, isTransitioning, profiles]);

  /* Swipe support for mobile */
  const touchStart = useCallback((e: React.TouchEvent) => {
    (e.currentTarget as HTMLElement).dataset.touchX = String(e.touches[0].clientX);
  }, []);
  const touchEnd = useCallback(
    (e: React.TouchEvent) => {
      const el = e.currentTarget as HTMLElement;
      const startX = parseFloat(el.dataset.touchX || "0");
      const endX = e.changedTouches[0].clientX;
      const diff = startX - endX;
      if (Math.abs(diff) > 50) {
        if (diff > 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goPrev, goNext]);

  const whatsappUrl = config.whatsappGroupUrl?.trim() || "";

  const handleCopyMemberId = async () => {
    if (!profile) return;
    const memberId = getMemberIdDisplay(profile);
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(memberId);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = memberId;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
      }
      setCopiedMemberId(true);
      setTimeout(() => setCopiedMemberId(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profile not found</p>
        <Link href="/home" className="text-[var(--primary)] ml-2">
          Go home
        </Link>
      </div>
    );
  }

  const displayName = isLoggedIn ? profile.fullName : maskString(profile.fullName, 5);
  const displaySubCaste = isLoggedIn ? profile.subCaste : maskString(profile.subCaste, 3);
  const displayFatherName = isLoggedIn ? profile.fatherName : maskString(profile.fatherName, 2);
  const displayMotherName = isLoggedIn ? profile.motherName : maskString(profile.motherName, 2);
  const displaySibling = isLoggedIn ? profile.siblingDetails : maskString(profile.siblingDetails, 2);
  const displayDateOfBirth = isLoggedIn
    ? formatDateDDMMYYYY(profile.dateOfBirth)
    : "**/**/****";

  const aboutMeTruncated = truncateToWords(profile.aboutMe, 100);
  const aboutMeWords = wordCount(profile.aboutMe);

  const allPhotos = [
    ...(profile.profilePhoto ? [profile.profilePhoto] : []),
    ...(profile.photos || []).filter((p) => p !== profile.profilePhoto),
  ];
  const hasMultiplePhotos = allPhotos.length > 1;

  return (
    <div className="max-w-2xl mx-auto pb-6">
      {showGallery && hasMultiplePhotos && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
        >
          <button
            onClick={() => setShowGallery(false)}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
            aria-label="Close gallery"
          >
            <X size={24} />
          </button>
          
          {/* Image counter */}
          <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/50 text-white text-sm font-medium">
            {currentImageIndex + 1} / {allPhotos.length}
          </div>
          
          {/* Main image display */}
          <div className="flex-1 flex items-center justify-center relative">
            {/* Previous button */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1))}
              className="absolute left-4 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              aria-label="Previous image"
            >
              <ChevronLeft size={28} strokeWidth={2.5} />
            </button>
            
            {/* Current image */}
            <div 
              className="relative w-full h-full flex items-center justify-center px-16"
              onTouchStart={(e) => {
                const touch = e.touches[0];
                (e.currentTarget as HTMLElement).dataset.touchStartX = String(touch.clientX);
              }}
              onTouchEnd={(e) => {
                const startX = parseFloat((e.currentTarget as HTMLElement).dataset.touchStartX || "0");
                const endX = e.changedTouches[0].clientX;
                const diff = startX - endX;
                if (Math.abs(diff) > 50) {
                  if (diff > 0) {
                    // Swipe left - next image
                    setCurrentImageIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0));
                  } else {
                    // Swipe right - previous image
                    setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allPhotos.length - 1));
                  }
                }
              }}
            >
              <div className="relative max-w-4xl max-h-[80vh] w-full h-full">
                <Image
                  src={allPhotos[currentImageIndex]}
                  alt={`${profile.fullName} photo ${currentImageIndex + 1}`}
                  fill
                  className={`object-contain ${!isLoggedIn ? "select-none pointer-events-none" : ""}`}
                  style={!isLoggedIn ? { filter: "blur(var(--blur-md))" } : undefined}
                  unoptimized
                  sizes="100vw"
                />
              </div>
            </div>
            
            {/* Next button */}
            <button
              onClick={() => setCurrentImageIndex((prev) => (prev < allPhotos.length - 1 ? prev + 1 : 0))}
              className="absolute right-4 z-10 p-3 rounded-full bg-white/20 hover:bg-white/30 text-white transition"
              aria-label="Next image"
            >
              <ChevronRight size={28} strokeWidth={2.5} />
            </button>
          </div>
          
          {/* Thumbnail strip at bottom */}
          <div className="p-4 bg-black/50 backdrop-blur-sm">
            <div className="flex gap-2 justify-center overflow-x-auto max-w-4xl mx-auto">
              {allPhotos.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentImageIndex(i)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden transition ${
                    i === currentImageIndex ? "ring-2 ring-white scale-110" : "opacity-60 hover:opacity-100"
                  }`}
                >
                  <Image
                    src={src}
                    alt={`Thumbnail ${i + 1}`}
                    fill
                    className="object-cover"
                    unoptimized
                    sizes="64px"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors font-medium text-[var(--foreground)]"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
          <span className="hidden sm:inline">Back</span>
        </button>
        
        {/* Profile navigation indicator */}
        {currentIdx >= 0 && profiles.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {currentIdx + 1} of {profiles.length}
            </span>
            <div className="flex gap-1">
              {profiles.slice(Math.max(0, currentIdx - 2), Math.min(profiles.length, currentIdx + 3)).map((_, i) => {
                const actualIndex = Math.max(0, currentIdx - 2) + i;
                return (
                  <div
                    key={actualIndex}
                    className={`h-1.5 rounded-full transition-all ${
                      actualIndex === currentIdx
                        ? "w-8 bg-[var(--primary)]"
                        : "w-1.5 bg-gray-300"
                    }`}
                  />
                );
              })}
            </div>
          </div>
        )}
        
        <ShareProfileButton profile={profile} />
      </header>

      <div
        key={profile.id}
        className={`relative transition-all duration-300 ease-in-out ${
          animClass || "opacity-100 scale-100"
        }`}
      >
        <div
          className="relative aspect-[4/5] lg:aspect-[16/9] max-h-[500px] bg-gray-200 overflow-hidden rounded-[10px] touch-pan-y"
          onTouchStart={touchStart}
          onTouchEnd={touchEnd}
        >
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={profile.fullName}
            fill
            className="object-cover rounded-[10px]"
            unoptimized
            priority
          />
          {hasMultiplePhotos && (
            <button
              onClick={() => setShowGallery(true)}
              className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white transition z-10 flex items-center gap-1.5 text-sm font-medium"
              aria-label="View gallery"
            >
              <Images size={18} />
              <span>{allPhotos.length}</span>
            </button>
          )}
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 pointer-events-none sm:pointer-events-auto">
            <button
              onClick={goPrev}
              disabled={currentIdx <= 0}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg pointer-events-auto"
              aria-label="Previous profile"
            >
              <ChevronLeft size={24} className="text-white" strokeWidth={2.5} />
            </button>
            <button
              onClick={goNext}
              disabled={currentIdx >= profiles.length - 1}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg pointer-events-auto"
              aria-label="Next profile"
            >
              <ChevronRight size={24} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white rounded-b-[10px]">
          <h1 className="text-xl sm:text-2xl font-bold">{displayName}</h1>
          <p className="text-white/90">
            {getAge(profile.dateOfBirth)} yrs • {profile.height}&quot;
            {profile.district && <span> • {profile.district}</span>}
          </p>
          {profile.profession && (
            <p className="text-white/90 text-sm mt-1 flex items-center gap-1.5">
              <Briefcase size={14} className="flex-shrink-0" />
              {profile.profession}
            </p>
          )}
          {profile.verified && (
            <span className="inline-block mt-2 px-2.5 py-1 text-xs font-medium text-[var(--color-secondary-dark)] bg-[var(--color-accent-gold)] rounded-[8px]">
              Verified
            </span>
          )}
          <span className="inline-block mt-2 ml-2 px-2.5 py-1 text-xs font-medium text-white bg-white/20 rounded-[8px]">
            {getMemberIdDisplay(profile)}
          </span>
        </div>
      </div>

      {/* Action buttons - improved mobile responsiveness */}
      <div className="px-3 py-2">
        <div className="grid grid-cols-4 gap-1 sm:gap-1.5">
          <button
            onClick={async () => {
              if (!user?.id || !profile || hasShownInterest || sendingInterest) return;
              setSendingInterest(true);
              const { error } = await sendInterest(user.id, profile.id, undefined, user.fullName);
              setSendingInterest(false);
              if (!error) setHasShownInterest(true);
            }}
            disabled={hasShownInterest || sendingInterest}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-2.5 rounded-xl transition min-h-[44px] border ${
              hasShownInterest
                ? "bg-red-50 border-red-200 text-red-600"
                : "hover:bg-gray-100 active:bg-gray-200 border-transparent hover:border-gray-200"
            } ${sendingInterest ? "opacity-70" : ""}`}
          >
            <Heart size={20} className={`flex-shrink-0 ${hasShownInterest ? 'fill-red-600' : ''}`} />
            <span className="text-xs font-medium truncate">Interest</span>
          </button>
          {interestAccepted ? (
            <Link href={`/messages/${profile.id}`} className="min-h-[44px]">
              <button className="w-full h-full flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition border border-transparent hover:border-gray-200">
                <MessageCircle size={20} className="flex-shrink-0" />
                <span className="text-xs font-medium truncate">Message</span>
              </button>
            </Link>
          ) : (
            <button
              disabled
              title="Accept interest request first to message"
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-2.5 rounded-xl opacity-50 cursor-not-allowed min-h-[44px] border border-gray-200"
            >
              <MessageCircle size={20} className="flex-shrink-0" />
              <span className="text-xs font-medium truncate">Message</span>
            </button>
          )}
          {!isLoggedIn ? (
            <a
              href={`tel:${(config.callContactNumber || "6360130905").replace(/\D/g, "")}`}
              className="flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-2.5 rounded-xl hover:bg-gray-100 active:bg-gray-200 transition min-h-[44px] border border-transparent hover:border-gray-200"
            >
              <Phone size={20} className="flex-shrink-0" />
              <span className="text-xs font-medium truncate">Contact</span>
            </a>
          ) : (
            <button
              onClick={() => {
                const newShowContact = !showContact;
                setShowContact(newShowContact);
                if (newShowContact && profile) {
                  trackContactView(profile, user?.id);
                }
              }}
              className={`flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-2.5 rounded-xl transition min-h-[44px] border ${
                showContact 
                  ? 'bg-blue-50 border-blue-200 text-blue-600' 
                  : 'hover:bg-gray-100 active:bg-gray-200 border-transparent hover:border-gray-200'
              }`}
            >
              <Phone size={20} className="flex-shrink-0" />
              <span className="text-xs font-medium truncate">Contact</span>
            </button>
          )}
          <button
            onClick={async () => {
              if (!user?.id || !profile || savingShortlist) return;
              setSavingShortlist(true);
              const { error } = isSaved
                ? await removeFromShortlist(user.id, profile.id)
                : await addToShortlist(user.id, profile.id);
              setSavingShortlist(false);
              if (!error) setIsSaved(!isSaved);
            }}
            disabled={savingShortlist}
            className={`flex flex-col items-center justify-center gap-1 px-2 py-3 sm:py-2.5 rounded-xl transition min-h-[44px] border ${
              isSaved
                ? "bg-yellow-50 border-yellow-200 text-yellow-700"
                : "hover:bg-gray-100 active:bg-gray-200 border-transparent hover:border-gray-200"
            }`}
            aria-label="Save to shortlist"
          >
            <Bookmark size={20} className={`flex-shrink-0 ${isSaved ? 'fill-yellow-700' : ''}`} />
            <span className="text-xs font-medium truncate">Save</span>
          </button>
        </div>
        
        {whatsappUrl && (
          <div className="mt-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-row items-center justify-center gap-2 px-4 py-3 rounded-xl hover:bg-green-50 active:bg-green-100 transition text-[#25D366] min-h-[44px] border border-transparent hover:border-green-200 w-full font-medium"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-sm font-medium">Join WhatsApp Group</span>
            </a>
          </div>
        )}

        {showContact && (
          <div className="mt-4 p-4 rounded-2xl bg-[var(--primary)]/5 border border-[var(--primary)]/20">
            <h4 className="font-semibold text-[var(--foreground)] mb-3">Contact Details</h4>
            <div className="space-y-2">
              {profile.contact && (
                <a
                  href={`tel:${profile.contact.replace(/\D/g, "")}`}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-white/90 transition text-[var(--primary)] font-medium"
                >
                  <Phone size={18} />
                  <span>{profile.contact}</span>
                  <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/20 rounded">Call</span>
                </a>
              )}
              {profile.address && (
                <p className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                  <MapPin size={18} className="text-gray-500" />
                  <span>{profile.address}, {profile.city}, {profile.state}</span>
                </p>
              )}
              {!profile.contact && !profile.address && (
                <p className="text-gray-500 text-sm">No contact details available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {profile.aboutMeVisible && profile.aboutMe && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-2">About Me</h3>
            <p className="text-sm sm:text-base text-gray-600">{aboutMeTruncated}</p>
            {aboutMeWords > 100 && (
              <p className="text-xs text-gray-400 mt-2">
                (Limited to 100 words. {aboutMeWords} words in original.)
              </p>
            )}
          </div>
        )}

        {/* Hobbies and Interests - after About Me (Screen 1 design) */}
        {profile.hobbies && profile.hobbies.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-3 pb-2 border-b border-gray-200">
              Hobbies and Interests
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.hobbies.map((hobby) => (
                <HobbyTag key={hobby} label={hobby} />
              ))}
            </div>
          </div>
        )}

        {/* Profile Details - reference design (Location, Education & Career, Family) */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-3">Profile Details</h3>
          <div className="divide-y divide-gray-100">
            <DetailSection icon={User} heading="Basic Info">
              {(profile.managedBy === "parent" || profile.managedBy === "guardian") && (
                <p className="text-[var(--primary)] font-medium">This profile is managed by a parent/guardian{profile.accountHolderName ? ` (${profile.accountHolderName})` : ""}</p>
              )}
              <p className="flex items-center gap-2">
                <span>Member ID:</span>
                <button
                  onClick={handleCopyMemberId}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors cursor-pointer font-medium"
                  title="Click to copy"
                >
                  <span>{getMemberIdDisplay(profile)}</span>
                  {copiedMemberId ? (
                    <Check size={14} className="text-green-600" />
                  ) : (
                    <Copy size={14} className="text-gray-500" />
                  )}
                </button>
              </p>
              <p>Full Name: {displayName}</p>
              <p>Birth Date: {displayDateOfBirth}</p>
              <p>Marital Status: {profile.maritalStatus}</p>
              <p>Caste: {profile.caste}</p>
              <p>Sub-Caste: {displaySubCaste || "—"}</p>
              <p>Height: {profile.height}&quot;</p>
            </DetailSection>
            <DetailSection icon={MapPin} heading="Location">
              <p>{profile.city}, {profile.district}, {profile.state}</p>
            </DetailSection>
            <DetailSection icon={GraduationCap} heading="Education & Career">
              <p>{profile.qualification || "—"}</p>
              <p>{profile.profession || "—"}{profile.companyName ? ` at ${profile.companyName}` : ""}</p>
              {profile.annualIncome && <p>{profile.annualIncome}</p>}
            </DetailSection>
            <DetailSection icon={Users} heading="Family">
              <p>Father: {displayFatherName || "—"} ({profile.fatherOccupation || "—"})</p>
              <p>Mother: {displayMotherName || "—"} ({profile.motherOccupation || "—"})</p>
              <p>Food: {profile.foodHabits || "—"}</p>
              {displaySibling && <p>Sibling: {displaySibling}</p>}
            </DetailSection>
          </div>
        </div>

        {(profile.rashi || profile.nakshatra || profile.timeOfBirth || profile.placeOfBirth) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Horoscope Details</h3>
            <DetailSection icon={Calendar} heading="Birth & Astrology">
              {profile.timeOfBirth && <p>Time of Birth: {profile.timeOfBirth}</p>}
              {profile.placeOfBirth && <p>Place of Birth: {profile.placeOfBirth}</p>}
              {profile.rashi && <p>Zodiac Sign: {profile.rashi}</p>}
              {profile.nakshatra && <p>Nakshatra: {profile.nakshatra}</p>}
            </DetailSection>
          </div>
        )}

        {/* Languages - tag-style display */}
        {((profile.languagesKnown && profile.languagesKnown.trim()) || profile.motherTongue) && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-3 pb-2 border-b border-gray-200">
              Languages
            </h3>
            <div className="flex flex-wrap gap-2 pt-1">
              {(() => {
                const langs = (profile.languagesKnown || "")
                  .split(",")
                  .map((l) => l.trim())
                  .filter(Boolean);
                const motherTongue = profile.motherTongue?.trim();
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

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Contact Information</h3>
          <DetailSection icon={MapPin} heading="Address">
            <p>City: {profile.city || "—"}</p>
            <p>District: {profile.district || "—"}</p>
            <p>State: {profile.state || "—"}</p>
            <p>Country: {profile.country || "—"}</p>
          </DetailSection>
          <DetailSection icon={Phone} heading="Contact">
            {!isLoggedIn ? (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20">
                  <p className="text-sm text-gray-600 mb-3">Login to view contact details</p>
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-[var(--primary)] text-white font-medium hover:bg-[var(--primary)]/90 transition"
                  >
                    Login to View Contact
                  </Link>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <p className="text-xs text-gray-500 mb-3">Need help? Contact our support</p>
                  <div className="space-y-2">
                    <a
                      href={`tel:${(config.callContactNumber || "6360130905").replace(/\D/g, "")}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 transition text-[var(--primary)] font-medium"
                    >
                      <Phone size={18} />
                      <span>{config.callContactNumber || "6360130905"}</span>
                      <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/20 rounded ml-auto">Call Support</span>
                    </a>
                    <a
                      href={`https://wa.me/${(config.whatsappContactNumber || config.callContactNumber || "6360130905").replace(/\D/g, "")}?text=${encodeURIComponent("I need assistance with profile contact details")}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-gray-50 transition text-[#25D366] font-medium"
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0">
                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                      </svg>
                      <span>{config.whatsappContactNumber || config.callContactNumber || "6360130905"}</span>
                      <span className="text-xs px-2 py-0.5 bg-[#25D366]/20 rounded ml-auto">WhatsApp Support</span>
                    </a>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    const newShowContact = !showContact;
                    setShowContact(newShowContact);
                    if (newShowContact && profile) {
                      trackContactView(profile, user?.id);
                    }
                  }}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors text-[var(--primary)] font-medium"
                >
                  <Phone size={18} />
                  {showContact ? "Hide Contact" : "View Contact"}
                </button>
                {showContact && (
                  <div className="mt-3 p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/20 space-y-2">
                    {profile.contact ? (
                      <a
                        href={`tel:${profile.contact.replace(/\D/g, "")}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white hover:bg-white/90 transition text-[var(--primary)] font-medium"
                      >
                        <Phone size={18} />
                        <span>{profile.contact}</span>
                        <span className="text-xs px-2 py-0.5 bg-[var(--primary)]/20 rounded">Call</span>
                      </a>
                    ) : null}
                    {profile.address && (
                      <p className="flex items-center gap-3 p-3 rounded-xl bg-white/60">
                        <MapPin size={18} className="text-gray-500" />
                        <span>{profile.address}, {profile.city}, {profile.state}</span>
                      </p>
                    )}
                    {!profile.contact && !profile.address && (
                      <p className="text-gray-500 text-sm">No contact details available.</p>
                    )}
                  </div>
                )}
              </>
            )}
          </DetailSection>
        </div>

        {profile.partnerPreference && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-1">Partner Preferences</h3>
            <DetailSection icon={Heart} heading="Preferred">
              {profile.partnerPreference.ageMin != null && profile.partnerPreference.ageMax != null && (
                <p>Age: {profile.partnerPreference.ageMin}–{profile.partnerPreference.ageMax} yrs</p>
              )}
              {profile.partnerPreference.profession && (
                <p>Profession: {profile.partnerPreference.profession}</p>
              )}
              {profile.partnerPreference.education && (
                <p>Education: {profile.partnerPreference.education}</p>
              )}
            </DetailSection>
          </div>
        )}

        {hasMultiplePhotos && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-3">More Photos</h3>
            {!isLoggedIn ? (
              <div className="relative">
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {allPhotos.slice(0, 4).map((src, i) => (
                    <div
                      key={i}
                      className="relative aspect-square rounded-lg overflow-hidden bg-gray-200"
                    >
                      <Image
                        src={src}
                        alt={`${profile.fullName} photo ${i + 1}`}
                        fill
                        className="object-cover"
                        style={{ filter: "blur(var(--blur-md))" }}
                        unoptimized
                        sizes="(max-width: 640px) 33vw, 25vw"
                      />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-lg backdrop-blur-sm">
                  <Link
                    href="/login"
                    className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition shadow-lg"
                  >
                    Login to View Photos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {allPhotos.map((src, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setCurrentImageIndex(i);
                      setShowGallery(true);
                    }}
                    className="relative aspect-square rounded-lg overflow-hidden bg-gray-200 hover:opacity-90 transition"
                  >
                    <Image
                      src={src}
                      alt={`${profile.fullName} photo ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 640px) 33vw, 25vw"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {isLoggedIn && user?.id && profile && user.id !== profile.id && (
          <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-100">
            <h4 className="font-semibold text-[var(--foreground)] mb-2">My note</h4>
            <textarea
              value={myNote}
              onChange={(e) => setMyNote(e.target.value)}
              placeholder="Add a private note about this profile..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-[var(--border)] min-h-[80px] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            <button
              onClick={async () => {
                if (!user?.id || !profile || savingNote) return;
                setSavingNote(true);
                await saveNote(user.id, profile.id, myNote);
                setSavingNote(false);
              }}
              disabled={savingNote}
              className="mt-2 px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
            >
              {savingNote ? "Saving..." : "Save note"}
            </button>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button
            onClick={() => setShowReportModal(true)}
            className="flex-1 flex items-center justify-center gap-2 py-3 text-sm sm:text-base text-gray-600 border border-[var(--border)] rounded-xl hover:bg-gray-50 transition-colors"
          >
            <Flag size={18} className="text-gray-500" />
            Report
          </button>
          {isLoggedIn && user?.id && profile && user.id !== profile.id && (
            <button
              onClick={async () => {
                if (!user?.id || !profile) return;
                if (confirm("Block this user? They won't see your profile and you won't see theirs.")) {
                  await blockUser(user.id, profile.id);
                  router.push("/search");
                }
              }}
              className="flex-1 flex items-center justify-center gap-2 py-3 text-sm sm:text-base text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-colors"
            >
              <Ban size={18} />
              Block
            </button>
          )}
        </div>

        {showReportModal && isLoggedIn && user?.id && profile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold mb-4">Report Profile</h3>
              <p className="text-sm text-gray-600 mb-4">Help us keep the community safe. Select a reason and add details if needed.</p>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] mb-3"
              >
                <option value="">Select reason</option>
                <option value="Fake profile">Fake profile</option>
                <option value="Inappropriate content">Inappropriate content</option>
                <option value="Harassment">Harassment</option>
                <option value="Spam">Spam</option>
                <option value="Wrong information">Wrong information</option>
                <option value="Other">Other</option>
              </select>
              <textarea
                value={reportMessage}
                onChange={(e) => setReportMessage(e.target.value)}
                placeholder="Additional details (optional)"
                className="w-full px-4 py-3 rounded-xl border border-[var(--border)] min-h-[80px] mb-4"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowReportModal(false);
                    setReportReason("");
                    setReportMessage("");
                  }}
                  className="flex-1 py-3 rounded-xl border border-[var(--border)]"
                >
                  Cancel
                </button>
                <button
                  disabled={!reportReason.trim() || reporting}
                  onClick={async () => {
                    if (!reportReason.trim() || !user?.id || !profile) return;
                    setReporting(true);
                    const { error } = await reportProfile(user.id, profile.id, reportReason.trim(), reportMessage.trim());
                    setReporting(false);
                    if (!error) {
                      setShowReportModal(false);
                      setReportReason("");
                      setReportMessage("");
                    }
                  }}
                  className="flex-1 py-3 rounded-xl bg-red-600 text-white disabled:opacity-50"
                >
                  {reporting ? "Submitting..." : "Submit Report"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Results */}
        <div className="pt-6">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-lg sm:text-xl text-center">Results</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {profiles
              .filter((p) => p.id !== profile.id)
              .slice(0, 6)
              .map((similar) => (
                <ProfileCard
                  key={similar.id}
                  profile={similar}
                  displayName={isLoggedIn ? similar.fullName : maskString(similar.fullName, 5)}
                />
              ))}
          </div>
        </div>
      </div>

    </div>
  );
}
