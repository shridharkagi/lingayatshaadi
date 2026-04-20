"use client";

import Link from "next/link";
import { MessageCircle, ArrowRight } from "lucide-react";
import { FEATURE_MESSAGING_ENABLED } from "@/lib/featureFlags";

import LegacyMessagesPage from "./LegacyMessagesPage";

export default function MessagesPage() {
  if (FEATURE_MESSAGING_ENABLED) {
    return <LegacyMessagesPage />;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">
        <div className="w-20 h-20 mx-auto rounded-full bg-[var(--primary)]/10 flex items-center justify-center mb-5">
          <MessageCircle size={36} className="text-[var(--primary)]" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mb-3">
          Messaging — Coming Soon
        </h1>
        <p className="text-base text-gray-600 mb-2">
          In-app chat is on the way. For now, send an Interest and use the contact
          number on the profile to reach out directly.
        </p>
        <p className="text-sm text-gray-500 mb-8">
          We&apos;re building moderated, family-friendly messaging. Stay tuned.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/profiles"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[var(--primary)] text-white font-semibold hover:bg-[var(--primary-hover)] transition"
          >
            Browse Profiles
            <ArrowRight size={18} />
          </Link>
          <Link
            href="/activities"
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-[var(--color-border)] text-[var(--foreground)] font-semibold hover:bg-gray-50 transition"
          >
            View Activities
          </Link>
        </div>
      </div>
    </div>
  );
}
