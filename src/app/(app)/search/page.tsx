"use client";

import { useState } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { mockProfiles } from "@/data/mock";
import { Input } from "@/components/ui/Input";
import { ProfileCard } from "@/components/ui/ProfileCard";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"list" | "grid">("list");
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="max-w-6xl mx-auto w-full">
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
              <ProfileCard key={profile.id} profile={profile} variant="list" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {mockProfiles.map((profile) => (
              <ProfileCard key={profile.id} profile={profile} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
