"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send } from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { mockMessages } from "@/data/mock";
import { getProfileSlug } from "@/lib/memberId";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const { profiles } = useProfiles();
  const [message, setMessage] = useState("");
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  const profile = profiles.find((p) => p.id === id);
  const messages = mockMessages.filter(
    (m) =>
      (m.senderId === params.id && m.receiverId === "current") ||
      (m.receiverId === params.id && m.senderId === "current")
  );

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
            className={`flex ${m.senderId === "current" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] px-3 sm:px-4 py-2 rounded-2xl break-words ${
                m.senderId === "current"
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
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                // Handle send message here
              }
            }}
          />
          <button 
            className="flex-shrink-0 p-2.5 sm:p-3 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] active:scale-95 transition min-h-[44px] min-w-[44px] flex items-center justify-center touch-manipulation"
            aria-label="Send message"
            onClick={() => {
              // Handle send message here
            }}
          >
            <Send size={20} className="sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
