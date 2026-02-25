"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Heart, Eye, Bookmark, UserX, FileText } from "lucide-react";
import { mockProfiles } from "@/data/mock";
import { mockInterests } from "@/data/mock";
import { getAge } from "@/lib/utils";

const tabs = [
  { id: "interests", label: "Interests", icon: Heart },
  { id: "views", label: "Profile Views", icon: Eye },
  { id: "shortlist", label: "Shortlist", icon: Bookmark },
  { id: "blocked", label: "Blocked", icon: UserX },
  { id: "notes", label: "My Notes", icon: FileText },
];

export default function ActivitiesPage() {
  const [activeTab, setActiveTab] = useState("interests");

  const receivedInterests = mockInterests
    .filter((i) => i.toId === "current" && i.status === "pending")
    .map((i) => ({ ...i, profile: mockProfiles.find((p) => p.id === i.fromId) }))
    .filter((i) => i.profile);

  return (
    <div className="max-w-lg mx-auto">
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
              <p className="text-gray-500 py-8 text-center">No interests received yet</p>
            ) : (
              receivedInterests.map(({ profile, message }) => (
                <div
                  key={profile!.id}
                  className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm"
                >
                  <Link href={`/profile/${profile!.id}`} className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
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
                    <Link href={`/profile/${profile!.id}`}>
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
            <p className="text-gray-500 py-4">No interests sent yet</p>
          </div>
        )}

        {activeTab === "views" && (
          <div className="text-center py-16">
            <Eye size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No profile views yet</p>
          </div>
        )}

        {activeTab === "shortlist" && (
          <div className="text-center py-16">
            <Bookmark size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No shortlisted profiles</p>
          </div>
        )}

        {activeTab === "blocked" && (
          <div className="text-center py-16">
            <UserX size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No blocked users</p>
          </div>
        )}

        {activeTab === "notes" && (
          <div className="text-center py-16">
            <FileText size={48} className="mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">No notes saved</p>
          </div>
        )}
      </div>
    </div>
  );
}
