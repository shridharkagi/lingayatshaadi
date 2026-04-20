"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send, MessageCircle, ArrowLeft } from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { useAuth } from "@/contexts/AuthContext";
import { getMessages, sendMessage, subscribeToNewMessages, getConversationId } from "@/lib/api/messages";
import { getProfileById as fetchProfile } from "@/lib/api/profiles";
import { getProfileSlug } from "@/lib/memberId";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";
import type { Message, Profile } from "@/types";

export default function ChatPage() {
  if (!FEATURE_MESSAGING_ENABLED) {
    return <ComingSoon />;
  }
  return <ChatPageImpl />;
}

function ComingSoon() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-5">
          <MessageCircle size={36} className="text-[var(--primary)]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3">
          Messaging — Coming Soon
        </h1>
        <p className="text-base text-gray-600 mb-8">
          In-app chat is on the way. For now, send an Interest and use the
          contact number on the profile to reach out directly.
        </p>
        <Link
          href="/profiles"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition"
        >
          <ArrowLeft size={18} />
          Back to Profiles
        </Link>
      </div>
    </div>
  );
}

function ChatPageImpl() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { profiles, getProfileById } = useProfiles();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const id = typeof params.id === "string" ? params.id : params.id?.[0];

  const [fetchedProfile, setFetchedProfile] = useState<Profile | null>(null);
  const profile = id
    ? (getProfileById(id) || profiles.find((p) => p.id === id) || fetchedProfile || null)
    : undefined;

  useEffect(() => {
    if (id && !getProfileById(id) && !profiles.find((p) => p.id === id)) {
      fetchProfile(id).then(({ data }) => {
        if (data) setFetchedProfile(data);
      });
    } else {
      setFetchedProfile(null);
    }
  }, [id, profiles, getProfileById]);

  const loadMessages = useCallback(async () => {
    if (!user?.id || !id) return;
    const { data } = await getMessages(user.id, id);
    setMessages(data || []);
  }, [user?.id, id]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && user?.id && id) loadMessages();
  }, [mounted, user?.id, id, loadMessages]);

  // Real-time: subscribe to new messages in this conversation
  useEffect(() => {
    if (!user?.id || !id) return;
    const convId = getConversationId(user.id, id);
    const unsubscribe = subscribeToNewMessages(convId, (newMsg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
    });
    return unsubscribe;
  }, [user?.id, id]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !user?.id || !id || sending) return;
    setSending(true);
    const { data, error } = await sendMessage(user.id, id, text);
    setSending(false);
    if (!error && data) {
      setMessages((prev) => [...prev, data]);
      setMessage("");
    }
  };

  // Don't render until mounted on client side
  if (!mounted || !profile) return null;

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col h-[100dvh] lg:h-[calc(100vh-4rem)]">
      <header className="bg-white border-b border-[var(--border)] px-3 sm:px-4 py-3 flex items-center gap-2 sm:gap-3 sticky top-0 z-10 flex-shrink-0">
        <button 
          onClick={() => router.back()} 
          className="p-2 -ml-2 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors touch-manipulation"
          aria-label="Go back"
        >
          ←
        </button>
        <Link href={`/profile/${getProfileSlug(profile)}`} className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
            <Image
              src={profile.profilePhoto || "/placeholder.svg"}
              alt={profile.fullName}
              width={40}
              height={40}
              className="object-cover w-full h-full"
              unoptimized
            />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold text-sm sm:text-base truncate">{profile.fullName}</h2>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 overscroll-contain">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.senderId === user?.id ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 rounded-2xl break-words ${
                m.senderId === user?.id
                  ? "bg-[var(--primary)] text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 sm:p-4 border-t border-[var(--border)] bg-white sticky bottom-0 flex-shrink-0 safe-area-inset-bottom">
        <div className="flex gap-2 items-end">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-3 sm:px-4 py-2.5 sm:py-3 text-sm sm:text-base rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] min-h-[44px] touch-manipulation"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button 
            className="flex-shrink-0 p-2.5 sm:p-3 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Send message"
            onClick={handleSend}
          >
            <Send size={20} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
