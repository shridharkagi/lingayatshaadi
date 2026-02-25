"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Heart, MessageCircle, Share2, Flag, Bookmark, MoreVertical, MapPin, Briefcase, GraduationCap, Phone } from "lucide-react";
import { mockProfiles } from "@/data/mock";
import { getAge } from "@/lib/utils";
import { Button } from "@/components/ui/Button";

export default function OtherProfilePage() {
  const params = useParams();
  const router = useRouter();
  const [showContact, setShowContact] = useState(false);
  const profile = mockProfiles.find((p) => p.id === params.id);

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profile not found</p>
        <Link href="/home" className="text-[var(--primary)] ml-2">Go home</Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-24 lg:pb-8">
      <header className="sticky top-0 bg-white/95 backdrop-blur border-b border-[var(--border)] px-4 py-3 flex items-center justify-between z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg hover:bg-gray-100">
          ←
        </button>
        <div className="flex gap-2">
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <Share2 size={20} />
          </button>
          <button className="p-2 rounded-lg hover:bg-gray-100">
            <MoreVertical size={20} />
          </button>
        </div>
      </header>

      <div className="relative">
        <div className="relative aspect-[4/5] lg:aspect-[16/9] max-h-[500px] bg-gray-200">
          <Image
            src={profile.profilePhoto || "/placeholder.svg"}
            alt={profile.fullName}
            fill
            className="object-cover"
            unoptimized
            priority
          />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent text-white">
          <h1 className="text-2xl font-bold">{profile.fullName}</h1>
          <p className="text-white/90">{getAge(profile.dateOfBirth)} yrs • {profile.height}&quot; • {profile.maritalStatus}</p>
          {profile.verified && (
            <span className="inline-block mt-2 bg-[var(--success)] text-white text-xs px-2 py-0.5 rounded-full">
              Verified
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button className="flex-1 min-w-[120px] flex items-center justify-center gap-2">
            <Heart size={20} />
            Send Interest
          </Button>
          <Link href={`/messages/${profile.id}`}>
            <Button variant="outline" className="flex items-center justify-center gap-2 px-6">
              <MessageCircle size={20} />
              Message
            </Button>
          </Link>
          <Button
            variant="outline"
            className="flex items-center justify-center gap-2"
            onClick={() => setShowContact(!showContact)}
          >
            <Phone size={20} />
            View Contact
          </Button>
          <button className="p-3 rounded-xl border border-[var(--border)] hover:bg-gray-50">
            <Bookmark size={20} />
          </button>
        </div>

        {showContact && (
          <div className="bg-[var(--primary)]/5 rounded-2xl p-4 border border-[var(--primary)]/20">
            <h4 className="font-semibold text-[var(--foreground)] mb-3">Contact Details</h4>
            <div className="space-y-2">
              {profile.contact && (
                <a href={`tel:${profile.contact}`} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/50">
                  <Phone size={18} className="text-[var(--primary)]" />
                  <span>{profile.contact}</span>
                  {profile.contactType && <span className="text-xs text-gray-500">({profile.contactType})</span>}
                </a>
              )}
              {profile.address && (
                <p className="flex items-center gap-3 p-2">
                  <MapPin size={18} className="text-[var(--primary)]" />
                  {profile.address}, {profile.city}, {profile.state}
                </p>
              )}
            </div>
          </div>
        )}

        {profile.aboutMeVisible && profile.aboutMe && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">About Me</h3>
            <p className="text-gray-600">{profile.aboutMe}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-3">Profile Details</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Location</p>
                <p className="text-gray-800">{profile.city}, {profile.district}, {profile.state}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <GraduationCap size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Education & Career</p>
                <p className="text-gray-800">{profile.qualification}</p>
                <p className="text-gray-800">{profile.profession} at {profile.companyName || "—"}</p>
                {profile.annualIncome && <p className="text-sm text-gray-600">{profile.annualIncome}</p>}
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Briefcase size={18} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Family</p>
                <p className="text-gray-800">Father: {profile.fatherOccupation}</p>
                <p className="text-gray-800">Mother: {profile.motherOccupation}</p>
                <p className="text-gray-800">Food: {profile.foodHabits}</p>
              </div>
            </div>
          </div>
        </div>

        {profile.partnerPreference && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">Partner Preferences</h3>
            <p className="text-gray-600 text-sm">
              Age: {profile.partnerPreference.ageMin}-{profile.partnerPreference.ageMax} yrs
              {profile.partnerPreference.profession && ` • Profession: ${profile.partnerPreference.profession}`}
              {profile.partnerPreference.education && ` • Education: ${profile.partnerPreference.education}`}
            </p>
          </div>
        )}

        {profile.rashi && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <h3 className="font-semibold text-[var(--foreground)] mb-2">Horoscope</h3>
            <p className="text-gray-600">Rashi: {profile.rashi} • Nakshatra: {profile.nakshatra}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4">
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-600 border border-[var(--border)] rounded-xl hover:bg-gray-50">
            <Flag size={18} />
            Report
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-3 text-gray-600 border border-[var(--border)] rounded-xl hover:bg-gray-50">
            Block
          </button>
        </div>
      </div>
    </div>
  );
}
