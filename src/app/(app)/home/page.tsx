"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";
import { Search, ChevronRight, Quote } from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { ProfileCard } from "@/components/ui/ProfileCard";

const testimonials = [
  {
    quote: "Both our families wanted a Lingayat match. This platform made it easy to find someone who understood our traditions.",
    author: "Ganesh & Meera",
    location: "Belgaum",
  },
  {
    quote: "We met through a mutual community connection here. Our wedding was in Dharwad, surrounded by family.",
    author: "Basavaraj & Sunita",
    location: "Dharwad",
  },
  {
    quote: "Shared faith and similar upbringing mattered most. We found that here and married within a year.",
    author: "Shankar & Kavitha",
    location: "Hubli",
  },
];

export default function HomePage() {
  const router = useRouter();
  const { user, isLoggedIn, profileComplete, loading } = useAuth();
  const { profiles } = useProfiles();

  useEffect(() => {
    if (loading) return;
    if (!isLoggedIn) {
      router.replace("/login");
      return;
    }
    if (!profileComplete) {
      router.replace("/profile/complete");
    }
  }, [loading, isLoggedIn, profileComplete, router]);
  const matches = profiles.slice(0, 6);
  const firstName = user?.fullName?.split(" ")[0] || "User";

  return (
    <div className="w-full pb-8 space-y-5">
      <header className="bg-[var(--primary)] text-white px-4 py-6 lg:py-8 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-white/80 text-sm sm:text-base">Welcome back,</p>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold">{firstName}</h1>
            <p className="text-white/75 text-xs sm:text-sm mt-1">
              Explore compatible profiles and keep your account active.
            </p>
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
                <Image src={user.profilePhoto} alt={`Profile photo of ${user?.fullName || "user"}`} width={40} height={40} className="object-cover w-10 h-10" unoptimized />
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

      <div className="px-0 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm p-4 lg:p-6">
          <h2 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Link href="/search?tab=recommended" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">Recommended</span>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Based on your preferences</p>
            </Link>
            <Link href="/search?tab=new" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">New Members</span>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Recently joined</p>
            </Link>
            <Link href="/activities" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">Profile Viewers</span>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Who viewed you</p>
            </Link>
            <Link href="/activities?tab=interests" className="p-3 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 hover:bg-[var(--primary)]/10 transition">
              <span className="text-sm font-medium">Interests</span>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">Sent & received</p>
            </Link>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-base sm:text-lg text-[var(--foreground)]">Suggested Matches</h2>
            <Link href="/profiles" className="text-sm font-medium text-[var(--primary)] hover:underline">
              View all
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {matches.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 lg:p-8">
          <h2 className="font-semibold text-base sm:text-lg text-[var(--foreground)] mb-4 flex items-center gap-2">
            <Quote size={24} className="text-[var(--primary)]" />
            Success Stories
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="p-4 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10">
                <p className="text-gray-700 text-sm sm:text-base italic">&quot;{t.quote}&quot;</p>
                <p className="font-medium text-sm sm:text-base text-[var(--primary)] mt-3">{t.author}</p>
                <p className="text-xs sm:text-sm text-gray-500">{t.location}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
