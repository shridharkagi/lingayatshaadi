"use client";

import Link from "next/link";
import { ChevronLeft, Heart } from "lucide-react";
import { SiteFooter } from "@/components/SiteFooter";
import { SUPPORT_EMAIL, SUPPORT_PHONE_DISPLAY, SUPPORT_WHATSAPP_DISPLAY } from "@/lib/support";

export default function PrivacyPage() {
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
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Privacy Policy</h1>
        <p className="text-sm text-[var(--color-text-muted)] mb-8">
          Last updated: {new Date().toLocaleDateString()} · © {year} LingayatBandhu
        </p>

        <div className="prose prose-sm max-w-none space-y-6 text-[var(--color-text-muted)]">
          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">1. Who we are</h2>
            <p>
              LingayatBandhu (“we”, “us”) is a matrimonial platform focused on the Lingayat community. This policy
              explains what we collect, why we collect it, and your choices. This is a summary for members; we may
              refine legal wording in a future revision.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">2. Information we collect</h2>
            <p>
              Account and profile data you provide or upload: name, contact details you choose to show, date of birth,
              photos, education, profession, family and partner preferences, and similar fields needed for matrimonial
              matching. We also collect technical and usage data (e.g. device, approximate location from IP, logs) to
              run the service securely and to investigate abuse.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">3. How we use information</h2>
            <p>
              To display profiles to other members according to your settings, to operate search and recommendations,
              to communicate with you about your account, verification, or safety, and to comply with law. We do not
              sell your personal data to third parties for their independent marketing.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">4. Member profiles & safety</h2>
            <p>
              Other members may see information you mark as visible on your profile. Where the product shows
              confidentiality reminders, member details are intended for personal matrimonial use only. We may log
              certain actions (such as profile or contact views where the feature is enabled) to help keep the community
              safe and to investigate misuse reports.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">5. Retention & security</h2>
            <p>
              We retain information while your account is active and as needed for legal, tax, or dispute resolution.
              We use reasonable technical and organisational measures to protect data; no online service can guarantee
              perfect security.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">6. Your rights</h2>
            <p>
              Depending on applicable law, you may request access, correction, or deletion of your personal data. You
              can update much of your profile in-app. For other requests, contact us using the details below.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">7. Contact</h2>
            <p>
              Privacy questions:{" "}
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
