"use client";

import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Send } from "lucide-react";
import { useProfiles } from "@/contexts/ProfilesContext";
import { mockMessages } from "@/data/mock";
import { getProfileSlug } from "@/lib/memberId";

export default function ChatPage() {
  const params = useParams();
  const router = useRouter();
  const { profiles } = useProfiles();
  const [message, setMessage] = useState("");
  const id = typeof params.id === "string" ? params.id : params.id?.[0];
  const profile = profiles.find((p) => p.id === id);
  const messages = mockMessages.filter(
    (m) =>
      (m.senderId === params.id && m.receiverId === "current") ||
      (m.receiverId === params.id && m.senderId === "current")
  );

  if (!profile) return null;

  return (
    <div className="max-w-lg mx-auto flex flex-col h-[calc(100vh-4rem)]">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg">
          ←
        </button>
        <Link href={`/profile/${getProfileSlug(profile)}`} className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 rounded-full overflow-hidden">
            <Image
              src={profile.profilePhoto || "/placeholder.svg"}
              alt={profile.fullName}
              width={40}
              height={40}
              className="object-cover"
              unoptimized
            />
          </div>
          <div>
            <h2 className="font-semibold">{profile.fullName}</h2>
            <p className="text-xs text-gray-500">Online</p>
          </div>
        </Link>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.senderId === "current" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                m.senderId === "current"
                  ? "bg-[var(--primary)] text-white rounded-br-md"
                  : "bg-gray-100 text-gray-800 rounded-bl-md"
              }`}
            >
              <p className="text-sm">{m.content}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-[var(--border)] bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button className="p-3 rounded-xl bg-[var(--primary)] text-white">
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}
