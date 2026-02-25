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
} from "lucide-react";
import { mockProfiles } from "@/data/mock";
import { mockInterests } from "@/data/mock";
import { getAge } from "@/lib/utils";
import {
  maskString,
  truncateToWords,
  wordCount,
  formatDateDDMMYYYY,
} from "@/lib/profileUtils";
import { useAuth } from "@/contexts/AuthContext";
import { useAppConfig } from "@/contexts/AppConfigContext";
import { HobbyTag } from "@/components/ui/HobbyTag";
import { ProfileCard } from "@/components/ui/ProfileCard";

function canMessage(profileId: string): boolean {
  return mockInterests.some(
    (i) =>
      i.status === "accepted" &&
      ((i.fromId === "current" && i.toId === profileId) ||
        (i.toId === "current" && i.fromId === profileId))
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
        <p className="text-sm text-gray-500 mb-1">{heading}</p>
        <div className="text-[var(--foreground)] space-y-0.5">{children}</div>
      </div>
    </div>
  );
}

export default function OtherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { isLoggedIn } = useAuth();
  const { config } = useAppConfig();
  const [showContact, setShowContact] = useState(false);

  const idFromParams = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [displayedId, setDisplayedId] = useState(idFromParams);

  useEffect(() => {
    setDisplayedId(idFromParams);
  }, [idFromParams]);

  const currentIdx = mockProfiles.findIndex((p) => p.id === displayedId);
  const profile = mockProfiles.find((p) => p.id === displayedId);
  const [animClass, setAnimClass] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  const goPrev = useCallback(() => {
    if (currentIdx <= 0 || isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass("opacity-0 translate-x-4");
    const prevId = mockProfiles[currentIdx - 1].id;
    setTimeout(() => {
      setDisplayedId(prevId);
      router.replace(`/profile/${prevId}`);
      setAnimClass("opacity-0 -translate-x-4");
      setTimeout(() => {
        setAnimClass("opacity-100 translate-x-0");
        setIsTransitioning(false);
      }, 50);
    }, 180);
  }, [currentIdx, router, isTransitioning]);

  const goNext = useCallback(() => {
    if (currentIdx < 0 || currentIdx >= mockProfiles.length - 1 || isTransitioning) return;
    setIsTransitioning(true);
    setAnimClass("opacity-0 -translate-x-4");
    const nextId = mockProfiles[currentIdx + 1].id;
    setTimeout(() => {
      setDisplayedId(nextId);
      router.replace(`/profile/${nextId}`);
      setAnimClass("opacity-0 translate-x-4");
      setTimeout(() => {
        setAnimClass("opacity-100 translate-x-0");
        setIsTransitioning(false);
      }, 50);
    }, 180);
  }, [currentIdx, router, isTransitioning]);

  const interestAccepted = profile ? canMessage(profile.id) : false;
  const whatsappUrl = config.whatsappGroupUrl?.trim() || "";

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

  return (
    <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 px-3 py-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors font-medium text-[var(--foreground)]"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
          <span className="hidden sm:inline">Back</span>
        </button>
        <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <Share2 size={20} />
        </button>
      </header>

      <div
        key={profile.id}
        className={`relative transition-all duration-200 ease-out ${
          animClass || "opacity-100 translate-x-0"
        }`}
      >
        <div className="relative aspect-[4/5] lg:aspect-[16/9] max-h-[500px] bg-gray-200 overflow-hidden rounded-[10px]">
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={profile.fullName}
            fill
            className="object-cover rounded-[10px]"
            unoptimized
            priority
          />
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
              disabled={currentIdx >= mockProfiles.length - 1}
              className="p-2.5 rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg pointer-events-auto"
              aria-label="Next profile"
            >
              <ChevronRight size={24} className="text-white" strokeWidth={2.5} />
            </button>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white rounded-b-[10px]">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-white/90">
            {getAge(profile.dateOfBirth)} yrs • {profile.height}&quot; • {profile.maritalStatus}
            {profile.district && <span> • {profile.district}</span>}
          </p>
          {profile.verified && (
            <span className="inline-block mt-2 px-2.5 py-1 text-xs font-medium text-[var(--color-secondary-dark)] bg-[var(--color-accent-gold)] rounded-[8px]">
              Verified
            </span>
          )}
        </div>
      </div>

      {/* Instagram-style compact action buttons */}
      <div className="p-4">
        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
          <button className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
            <Heart size={20} className="flex-shrink-0" />
            <span className="text-xs sm:text-sm">Send Interest</span>
          </button>
          {interestAccepted ? (
            <Link href={`/messages/${profile.id}`}>
              <button className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
                <MessageCircle size={20} className="flex-shrink-0" />
                <span className="text-xs sm:text-sm">Message</span>
              </button>
            </Link>
          ) : (
            <button
              disabled
              title="Accept interest request first to message"
              className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-3 py-2 rounded-lg opacity-60 cursor-not-allowed"
            >
              <MessageCircle size={20} className="flex-shrink-0" />
              <span className="text-xs sm:text-sm">Message</span>
            </button>
          )}
          <button
            onClick={() => setShowContact(!showContact)}
            className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition"
          >
            <Phone size={20} className="flex-shrink-0" />
            <span className="text-xs sm:text-sm">View Contact</span>
          </button>
          {whatsappUrl && (
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col sm:flex-row items-center gap-0.5 sm:gap-1.5 px-3 py-2 rounded-lg hover:bg-gray-100 transition text-[#25D366]"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="text-xs sm:text-sm">Join WhatsApp Group</span>
            </a>
          )}
          <button className="p-2 rounded-lg hover:bg-gray-100 transition ml-auto">
            <Bookmark size={20} />
          </button>
        </div>

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

      <div className="px-0 space-y-4">
        {profile.aboutMeVisible && profile.aboutMe && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">About Me</h3>
            <p className="text-gray-600">{aboutMeTruncated}</p>
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
            <h3 className="font-semibold text-[var(--foreground)] mb-3 pb-2 border-b border-gray-200">
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
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Profile Details</h3>
          <div className="divide-y divide-gray-100">
            <DetailSection icon={User} heading="Basic Info">
              <p>Member ID: {profile.memberId}</p>
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

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Contact Information</h3>
          <DetailSection icon={MapPin} heading="Address">
            <p>City: {profile.city || "—"}</p>
            <p>District: {profile.district || "—"}</p>
            <p>State: {profile.state || "—"}</p>
            <p>Country: {profile.country || "—"}</p>
            <button
              onClick={() => setShowContact(!showContact)}
              className="text-[var(--primary)] font-medium mt-1 hover:underline"
            >
              Contact Number: [View]
            </button>
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

        <div className="flex gap-2 pt-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-600 border border-[var(--border)] rounded-xl hover:bg-gray-50 transition-colors">
            <Flag size={18} className="text-gray-500" />
            Report
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-600 border border-[var(--border)] rounded-xl hover:bg-gray-50 transition-colors">
            <Ban size={18} className="text-gray-500" />
            Block
          </button>
        </div>

        {/* Similar Profiles */}
        <div className="pt-6">
          <h3 className="font-semibold text-[var(--foreground)] mb-3 text-[22px] text-center">Similar Profiles</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {mockProfiles
              .filter((p) => p.id !== profile.id)
              .slice(0, 10)
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

      <div className="fixed bottom-20 left-4 right-4 flex justify-between pointer-events-none sm:hidden z-20">
        <button
          onClick={goPrev}
          disabled={currentIdx <= 0}
          className="p-3 rounded-full bg-white/90 shadow-lg pointer-events-auto disabled:opacity-30"
          aria-label="Previous"
        >
          <ChevronLeft size={24} />
        </button>
        <button
          onClick={goNext}
          disabled={currentIdx >= mockProfiles.length - 1}
          className="p-3 rounded-full bg-white/90 shadow-lg pointer-events-auto disabled:opacity-30"
          aria-label="Next"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
}
