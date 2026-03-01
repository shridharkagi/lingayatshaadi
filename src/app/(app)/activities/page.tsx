"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, Bookmark, UserX, FileText } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfiles } from "@/contexts/ProfilesContext";
import { mockInterests } from "@/data/mock";
import { getAge } from "@/lib/utils";
import { getProfileSlug } from "@/lib/memberId";

const tabs = [
  { id: "interests", label: "Interests", icon: Heart },
  { id: "views", label: "Profile Views", icon: Eye },
  { id: "shortlist", label: "Shortlist", icon: Bookmark },
  { id: "blocked", label: "Blocked", icon: UserX },
  { id: "notes", label: "My Notes", icon: FileText },
];

export default function ActivitiesPage() {
  const { profiles } = useProfiles();
  const [activeTab, setActiveTab] = useState("interests");

  const receivedInterests = mockInterests
    .filter((i) => i.toId === "current" && i.status === "pending")
    .map((i) => ({ ...i, profile: profiles.find((p) => p.id === i.fromId) }))
    .filter((i) => i.profile);

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)] mb-4">Activities</h1>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                activeTab === id ? "bg-[var(--primary)] text-white" : "bg-gray-100 text-gray-600"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </header>

      <div className="p-4">
        {activeTab === "interests" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-[var(--foreground)]">Received</h3>
            {receivedInterests.length === 0 ? (
              <EmptyState
                icon={Heart}
                title="No interests received yet"
                description="When someone sends you an interest, it will appear here"
              />
            ) : (
              receivedInterests.map(({ profile, message }) => (
                <div
                  key={profile!.id}
                  className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                >
                  <Link href={`/profile/${getProfileSlug(profile!)}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={profile!.profilePhoto || "/placeholder.svg"}
                      alt={profile!.fullName}
                      width={64}
                      height={64}
                      className="object-cover w-full h-full"
                      unoptimized
                    />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <Link href={`/profile/${getProfileSlug(profile!)}`}>
                      <h4 className="font-semibold text-[var(--foreground)]">{profile!.fullName}</h4>
                    </Link>
                    <p className="text-sm text-gray-500">{getAge(profile!.dateOfBirth)} yrs • {profile!.profession}</p>
                    {message && <p className="text-sm text-gray-600 mt-1">&quot;{message}&quot;</p>}
                    <div className="flex gap-2 mt-2">
                      <Link
                        href={`/messages/${profile!.id}`}
                        className="px-4 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-medium"
                      >
                        Accept
                      </Link>
                      <button className="px-4 py-1.5 rounded-lg border border-[var(--border)] text-sm">
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
            <h3 className="font-semibold text-[var(--foreground)] mt-8">Sent</h3>
            <EmptyState
              icon={Heart}
              title="No interests sent yet"
              description="Start connecting with profiles you like"
              action={{
                label: "Browse Profiles",
                href: "/search",
              }}
            />
          </div>
        )}

        {activeTab === "views" && (
          <EmptyState
            icon={Eye}
            title="No profile views yet"
            description="When someone views your profile, you'll see them here"
          />
        )}

        {activeTab === "shortlist" && (
          <EmptyState
            icon={Bookmark}
            title="No shortlisted profiles"
            description="Save profiles you're interested in for quick access later"
            action={{
              label: "Browse Profiles",
              href: "/search",
            }}
          />
        )}

        {activeTab === "blocked" && (
          <EmptyState
            icon={UserX}
            title="No blocked users"
            description="Users you block will appear here"
          />
        )}

        {activeTab === "notes" && (
          <EmptyState
            icon={FileText}
            title="No notes saved"
            description="Add personal notes to profiles to remember important details"
          />
        )}
      </div>
    </div>
  );
}
