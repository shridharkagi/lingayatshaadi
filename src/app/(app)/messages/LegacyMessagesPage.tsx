"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useAuth } from "@/contexts/AuthContext";
import { getConversations } from "@/lib/api/messages";
import { getProfileById as fetchProfile } from "@/lib/api/profiles";
import { useState, useEffect, useCallback } from "react";

export default function LegacyMessagesPage() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { profiles, getProfileById } = useProfiles();
  const [conversations, setConversations] = useState<
    Array<{ profile: { id: string; fullName: string; profilePhoto?: string }; lastMessage: { content: string; createdAt: string }; unread: number }>
  >([]);
  const [loading, setLoading] = useState(true);

  const loadConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([]);
      setLoading(false);
      return;
    }
    const { data, error } = await getConversations(user.id);
    if (error || !data.length) {
      setConversations([]);
    } else {
      const list = await Promise.all(
        data.map(async (c) => {
          let profile = getProfileById(c.otherProfileId) || profiles.find((p) => p.id === c.otherProfileId);
          if (!profile) {
            const { data: p } = await fetchProfile(c.otherProfileId);
            profile = p || undefined;
          }
          return {
            profile: profile
              ? { id: profile.id, fullName: profile.fullName, profilePhoto: profile.profilePhoto }
              : { id: c.otherProfileId, fullName: "Unknown", profilePhoto: undefined },
            lastMessage: c.lastMessage,
            unread: c.unreadCount,
          };
        })
      );
      setConversations(list);
    }
    setLoading(false);
  }, [user?.id, getProfileById, profiles]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user) loadConversations();
    else if (!user) setLoading(false);
  }, [mounted, user, loadConversations]);

  if (!mounted) return null;

  return (
    <div className="max-w-lg mx-auto pb-6">
      <header className="bg-white border-b border-[var(--border)] px-4 py-4">
        <h1 className="text-xl font-bold text-[var(--foreground)]">Messages</h1>
      </header>

      <div className="p-4">
        {loading ? (
          <div className="py-8 text-center text-gray-500">Loading...</div>
        ) : conversations.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No messages yet"
            description="Start connecting with matches to begin conversations"
            action={{
              label: "Find Matches",
              href: "/search",
            }}
          />
        ) : (
          <div className="space-y-2">
            {conversations.map(({ profile, lastMessage, unread }) => (
              <Link
                key={profile.id}
                href={`/messages/${profile.id}`}
                className="flex gap-4 p-4 bg-white rounded-2xl shadow-sm hover:bg-gray-50"
              >
                <div className="relative w-14 h-14 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={profile.profilePhoto || "/placeholder.svg"}
                    alt={profile.fullName}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  {unread > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-[var(--accent)] text-white text-xs rounded-full flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[var(--foreground)]">{profile.fullName}</h3>
                  <p className={`text-sm truncate ${unread ? "text-[var(--foreground)] font-medium" : "text-gray-500"}`}>
                    {lastMessage.content}
                  </p>
                </div>
                <div className="text-xs text-gray-400 flex-shrink-0">
                  {new Date(lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
