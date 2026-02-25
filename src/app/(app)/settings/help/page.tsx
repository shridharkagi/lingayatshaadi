"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone } from "lucide-react";

export default function HelpPage() {
  const router = useRouter();

  return (
    <div className="max-w-lg mx-auto">
      <header className="bg-white border-b border-[var(--border)] px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-lg">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-lg font-semibold">Help & Support</h1>
      </header>

      <div className="p-4 space-y-6">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-2">Contact Us</h3>
          <div className="space-y-3">
            <a href="mailto:support@lingayatshaadi.com" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Mail size={20} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-gray-500">support@lingayatshaadi.com</p>
              </div>
            </a>
            <a href="tel:+919876543210" className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Phone size={20} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-sm text-gray-500">+91 98765 43210</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-2">FAQs</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>How do I verify my profile?</strong></p>
            <p>Go to Profile → Trust Badge and follow the verification steps.</p>
            <p className="mt-2"><strong>How do I upgrade to Premium?</strong></p>
            <p>Go to Profile → Membership and choose a plan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
