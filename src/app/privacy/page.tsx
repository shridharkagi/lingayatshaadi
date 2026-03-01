"use client";

import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg)] flex flex-col">
      <header className="sticky top-0 z-50 bg-white border-b border-[var(--color-border)] shadow-[var(--shadow-soft)]">
        <div className="flex items-center justify-between px-4 h-14 max-w-4xl mx-auto">
          <Link href="/" className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--primary)] transition">
            <ChevronLeft size={24} />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[var(--primary)] fill-[var(--primary)]" />
            <span className="font-bold text-[var(--primary)]">LingayatShaadi</span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-[var(--color-text-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">1. Information We Collect</h2>
            <p>We collect information you provide when registering, such as name, email, phone number, date of birth, photos, education, profession, and preferences. We also collect usage data to improve our services.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">2. How We Use Your Information</h2>
            <p>Your information is used to create and display your profile, facilitate matches, communicate with you, and improve our platform. Your contact details are never shared without your permission.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">3. Profile Visibility & Control</h2>
            <p>You decide who can view your profile and contact you. You can block or report anyone at any time. We use encryption and follow strict data practices to protect your information.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">4. Data Security</h2>
            <p>We use industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use strong passwords and keep your account secure.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">5. Contact Us</h2>
            <p>For privacy-related questions, contact us at support@lingayatshaadi.com or through our <Link href="/contact" className="text-[var(--primary)] hover:underline">Contact Us</Link> page.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
