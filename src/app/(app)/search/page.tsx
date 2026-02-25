"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Search, SlidersHorizontal, MapPin, Briefcase, Heart } from "lucide-react";
import { mockProfiles } from "@/data/mock";
import { getAge } from "@/lib/utils";
import { Input } from "@/components/ui/Input";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-4">Search</h1>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search by name, profession..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-2.5 rounded-xl border ${showFilters ? "bg-[var(--primary)] text-white border-[var(--primary)]" : "border-[var(--border)]"}`}
          >
            <SlidersHorizontal size={20} />
          </button>
          <button
            onClick={() => setView(view === "list" ? "grid" : "list")}
            className="p-2.5 rounded-xl border border-[var(--border)]"
          >
            {view === "list" ? "⊞" : "≡"}
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-xl space-y-3">
            <Input label="Age" placeholder="e.g. 25-35" />
            <Input label="Height" placeholder="e.g. 5.5 - 6.0" />
            <Input label="Religion" placeholder="Lingayat" />
            <Input label="Education" placeholder="Any" />
            <Input label="Profession" placeholder="Any" />
            <Input label="City" placeholder="Any" />
          </div>
        )}
      </header>

      <div className="p-4">
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {["All", "Recommended", "New", "Premium", "Nearby"].map((tab) => (
            <button
              key={tab}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                tab === "All" ? "bg-[var(--primary)] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {view === "list" ? (
          <div className="space-y-4">
            {mockProfiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.id}`}
                className="flex gap-4 bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                  <Image
                    src={profile.profilePhoto || "/placeholder.svg"}
                    alt={profile.fullName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {profile.verified && (
                    <span className="absolute bottom-0 left-0 right-0 bg-[var(--success)]/90 text-white text-[10px] text-center py-0.5">
                      ✓
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h3>
                  <p className="text-sm text-gray-500">{getAge(profile.dateOfBirth)} yrs • {profile.height}&quot; • {profile.maritalStatus}</p>
                  {profile.city && (
                    <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                      <MapPin size={12} />
                      {profile.city}
                    </p>
                  )}
                  {profile.profession && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Briefcase size={12} />
                      {profile.profession}
                    </p>
                  )}
                </div>
                <button className="p-2 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] self-center">
                  <Heart size={20} />
                </button>
              </Link>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {mockProfiles.map((profile) => (
              <Link
                key={profile.id}
                href={`/profile/${profile.id}`}
                className="rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="relative aspect-[3/4]">
                  <Image
                    src={profile.profilePhoto || "/placeholder.svg"}
                    alt={profile.fullName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                    <h3 className="font-semibold">{profile.fullName}</h3>
                    <p className="text-xs opacity-90">{getAge(profile.dateOfBirth)} yrs • {profile.city}</p>
                  </div>
                  {profile.verified && (
                    <span className="absolute top-2 right-2 bg-[var(--success)] text-white text-xs px-1.5 py-0.5 rounded-full">
                      ✓
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
