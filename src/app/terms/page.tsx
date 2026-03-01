"use client";

import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";

export default function TermsPage() {
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
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Terms of Use</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">Last updated: {new Date().toLocaleDateString()}</p>

        <div className="prose prose-sm max-w-none space-y-6 text-[var(--color-text-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">1. Acceptance of Terms</h2>
            <p>By accessing or using LingayatShaadi, you agree to these Terms of Use. If you do not agree, please do not use our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">2. Eligibility</h2>
            <p>You must be at least 18 years old and legally eligible to marry to use LingayatShaadi. You represent that all information you provide is accurate and that you are using the service for genuine matrimonial purposes.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">3. User Conduct</h2>
            <p>You agree not to misuse the platform, harass other users, post false information, or violate any applicable laws. We reserve the right to suspend or terminate accounts that violate these terms.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">4. Content & Intellectual Property</h2>
            <p>You retain ownership of content you post. By posting, you grant LingayatShaadi a license to display and use your content for the operation of the service. Our trademarks and branding remain our property.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">5. Limitation of Liability</h2>
            <p>LingayatShaadi is a platform for connecting users. We do not guarantee matches or outcomes. We are not liable for user conduct, communications, or decisions made outside our platform.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">6. Contact</h2>
            <p>For questions about these terms, contact us at support@lingayatshaadi.com or through our <Link href="/contact" className="text-[var(--primary)] hover:underline">Contact Us</Link> page.</p>
          </section>
        </div>
      </main>
    </div>
  );
}
