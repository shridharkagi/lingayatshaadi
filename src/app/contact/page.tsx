"use client";

import Link from "next/link";
import { ChevronLeft, Mail, Phone, Heart } from "lucide-react";
import { WhatsAppBrandIcon } from "@/components/icons/WhatsAppBrandIcon";
import { SiteFooter } from "@/components/SiteFooter";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_WHATSAPP_DISPLAY,
  supportTelHref,
  supportWhatsAppHref,
} from "@/lib/support";

export default function ContactPage() {
  const whatsappUrl = supportWhatsAppHref("Hello, I need help with LingayatBandhu.");

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
            <span className="font-bold text-[var(--primary)]">LingayatBandhu</span>
          </Link>
          <div className="w-16" />
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">Contact Us</h1>
        <p className="text-[var(--color-text-muted)] mb-8">
          We&apos;re here to help with accounts, profiles, membership, and safety. Typical response hours: 9 AM–9 PM
          (IST), seven days a week.
        </p>

        <div className="space-y-4">
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--primary)]/30 transition-colors"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
              <Mail size={22} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">Email</p>
              <p className="text-sm text-[var(--color-text-muted)]">{SUPPORT_EMAIL}</p>
            </div>
          </a>

          <a
            href={supportTelHref()}
            className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-[var(--primary)]/30 transition-colors"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
              <Phone size={22} className="text-[var(--primary)]" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">Phone</p>
              <p className="text-sm text-[var(--color-text-muted)]">{SUPPORT_PHONE_DISPLAY}</p>
            </div>
          </a>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-4 p-4 rounded-xl bg-white border border-[var(--color-border)] hover:border-[#25D366]/30 transition-colors"
          >
            <div className="flex-shrink-0 w-12 h-12 rounded-full bg-[#25D366]/10 flex items-center justify-center text-[#25D366]">
              <WhatsAppBrandIcon className="w-7 h-7" />
            </div>
            <div>
              <p className="font-semibold text-[var(--color-text-primary)]">WhatsApp</p>
              <p className="text-sm text-[var(--color-text-muted)]">{SUPPORT_WHATSAPP_DISPLAY}</p>
            </div>
          </a>
        </div>

        <div className="mt-8 p-4 rounded-xl bg-white border border-[var(--color-border)]">
          <h3 className="font-semibold text-[var(--color-text-primary)] mb-2">FAQs</h3>
          <div className="space-y-3 text-sm text-[var(--color-text-muted)]">
            <p>
              <strong className="text-[var(--color-text-primary)]">How do I verify my profile?</strong>
              <br />
              Go to Profile → Trust Badge and follow the verification steps.
            </p>
            <p>
              <strong className="text-[var(--color-text-primary)]">How do I upgrade to Premium?</strong>
              <br />
              Go to Account → Membership and choose a plan.
            </p>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
