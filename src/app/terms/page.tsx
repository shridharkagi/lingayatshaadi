"use client";

import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_DISPLAY } from "@/lib/support";

export default function TermsPage() {
  const year = new Date().getFullYear();
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
            <span className="leading-tight text-[var(--primary)]">
              <span className="block font-bold">LingayatBandhu</span>
              <span className="block text-[10px] font-semibold tracking-[0.14em] uppercase text-[var(--primary)]/85">
                Matrimony
              </span>
            </span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Terms of Use</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Last updated: {new Date().toLocaleDateString()} · © {year} LingayatBandhu
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-[var(--color-text-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">1. Acceptance</h2>
            <p>
              By accessing or using LingayatBandhu you agree to these Terms of Use and our Privacy Policy. If you do
              not agree, do not use the platform. We may update these terms; continued use after changes constitutes
              acceptance of the revised terms where permitted by law.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">2. Eligibility & purpose</h2>
            <p>
              You must be at least 18 and legally able to marry in your jurisdiction. You must register and use the
              service only for genuine Lingayat matrimonial purposes. You represent that the information you provide is
              materially accurate and that you will keep it updated.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">3. User conduct</h2>
            <p>
              You must not harass, defraud, impersonate, or spam other members; scrape or bulk-download data without
              permission; circumvent technical limits; or use member contact information for non-matrimonial
              commercial purposes. We may suspend or terminate accounts that violate these rules or that pose a safety
              risk.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">4. Confidential use of member data</h2>
            <p>
              Where the product displays confidentiality notices, you agree to use other members’ profile and contact
              details only for your personal matrimonial search. Misuse may lead to suspension or termination. Features
              such as profile or contact view logging may be used for safety and investigations.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">5. Content & intellectual property</h2>
            <p>
              You retain rights to content you upload. You grant us a licence to host, display, and process that content
              to operate LingayatBandhu. Our name, logo, and branding are our property.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">6. Disclaimer & limitation of liability</h2>
            <p>
              LingayatBandhu provides a platform to connect members. We do not guarantee matches or marriage
              outcomes. To the maximum extent permitted by law, we are not liable for user-to-user conduct, offline
              meetings, or decisions you make based on information on the site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">7. Contact</h2>
            <p>
              Questions about these terms:{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="text-[var(--primary)] hover:underline">
                {SUPPORT_EMAIL}
              </a>
              , phone / WhatsApp: {SUPPORT_PHONE_DISPLAY} / {SUPPORT_WHATSAPP_DISPLAY}, or our{" "}
              <Link href="/contact" className="text-[var(--primary)] hover:underline">
                Contact Us
              </Link>{" "}
              page.
            </p>
          </section>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
