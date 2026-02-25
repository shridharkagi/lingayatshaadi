"use client";

import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Search, Heart, X, MapPin, Briefcase, ChevronRight, Quote } from "lucide-react";
import { mockProfiles } from "@/data/mock";
import { getAge } from "@/lib/utils";

const testimonials = [
  {
    quote: "Found my perfect match within 3 months! LingayatShaadi helped us connect through our shared values.",
    author: "Rajesh & Priya",
    location: "Bangalore",
  },
  {
    quote: "The verification process gave us confidence. We're now happily married for 2 years.",
    author: "Vikram & Sneha",
    location: "Mumbai",
  },
  {
    quote: "As a busy professional, the app made it easy to find compatible matches. Highly recommend!",
    author: "Arjun & Divya",
    location: "Hyderabad",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const matches = mockProfiles.slice(0, 6);

  return (
    <div className="w-full">
      <header className="bg-[var(--primary)] text-white px-4 py-6 lg:py-8 rounded-b-3xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm">Welcome back,</p>
            <h1 className="text-xl lg:text-2xl font-bold">{user?.fullName?.split(" ")[0] || "User"}</h1>
          </div>
          <div className="flex gap-2">
            <Link
              href="/notifications"
              className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition"
            >
              <span className="text-lg">🔔</span>
            </Link>
            <Link
              href="/profile"
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-white hover:ring-2 hover:ring-white/50 transition"
            >
              {user?.profilePhoto ? (
                <Image src={user.profilePhoto} alt="" width={40} height={40} className="object-cover w-10 h-10" unoptimized />
              ) : (
                <div className="w-full h-full bg-white/30 flex items-center justify-center text-lg w-10 h-10">
                  {user?.fullName?.[0] || "?"}
                </div>
              )}
            </Link>
          </div>
        </div>
        <Link
          href="/search"
          className="flex items-center gap-3 bg-white/20 rounded-xl px-4 py-3 hover:bg-white/30 transition"
        >
          <Search size={20} />
          <span className="text-white/90">Search for matches</span>
          <ChevronRight size={20} className="ml-auto" />
        </Link>
      </header>

      <div className="px-0 -mt-2 space-y-8">
        <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6">
          <h2 className="font-semibold text-[var(--foreground)] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/search?tab=recommended" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">Recommended</span>
              <p className="text-xs text-gray-500 mt-1">Based on your preferences</p>
            </Link>
            <Link href="/search?tab=new" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">New Members</span>
              <p className="text-xs text-gray-500 mt-1">Recently joined</p>
            </Link>
            <Link href="/activities" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">Profile Viewers</span>
              <p className="text-xs text-gray-500 mt-1">Who viewed you</p>
            </Link>
            <Link href="/activities?tab=interests" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">Interests</span>
              <p className="text-xs text-gray-500 mt-1">Sent & received</p>
            </Link>
          </div>
        </div>

        <div>
          <h2 className="font-semibold text-[var(--foreground)] mb-3">Suggested Matches</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {matches.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition"
              >
                <div className="relative h-48 bg-gray-200">
                  <Image
                    src={profile.profilePhoto || "/placeholder.svg"}
                    alt={profile.fullName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {profile.verified && (
                    <span className="absolute top-2 right-2 bg-[var(--success)] text-white text-xs px-2 py-0.5 rounded-full">
                      Verified
                    </span>
                  )}
                  <div className="absolute bottom-2 left-2 right-2 flex gap-2">
                    <Link href={`/profile/${profile.id}`} className="flex-1 flex items-center justify-center gap-1 bg-white/90 backdrop-blur py-2 rounded-lg text-[var(--primary)] font-medium text-sm hover:bg-white transition">
                      <Heart size={18} />
                      Connect
                    </Link>
                    <button className="p-2 bg-white/90 backdrop-blur rounded-lg text-gray-600 hover:bg-white transition">
                      <X size={20} />
                    </button>
                  </div>
                </div>
                <Link href={`/profile/${profile.id}`} className="block p-4">
                  <h3 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h3>
                  <p className="text-sm text-gray-500">{getAge(profile.dateOfBirth)} yrs • {profile.height}&quot; • {profile.maritalStatus}</p>
                  {profile.city && (
                    <p className="text-sm text-gray-600 mt-1 flex items-center gap-1">
                      <MapPin size={14} />
                      {profile.city}, {profile.state}
                    </p>
                  )}
                  {profile.profession && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Briefcase size={14} />
                      {profile.profession}
                    </p>
                  )}
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8">
          <h2 className="font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Quote size={24} className="text-[var(--primary)]" />
            Success Stories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <p className="text-gray-700 text-sm italic">&quot;{t.quote}&quot;</p>
                <p className="font-medium text-[var(--primary)] mt-3">{t.author}</p>
                <p className="text-xs text-gray-500">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
