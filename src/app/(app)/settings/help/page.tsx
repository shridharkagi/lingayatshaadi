"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Mail, Phone } from "lucide-react";
import { WhatsAppBrandIcon } from "@/components/icons/WhatsAppBrandIcon";
import {
  SUPPORT_EMAIL,
  SUPPORT_PHONE_DISPLAY,
  SUPPORT_WHATSAPP_DISPLAY,
  supportTelHref,
  supportWhatsAppHref,
} from "@/lib/support";

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
            <a href={`mailto:${SUPPORT_EMAIL}`} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Mail size={20} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium">Email</p>
                <p className="text-sm text-gray-500">{SUPPORT_EMAIL}</p>
              </div>
            </a>
            <a href={supportTelHref()} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
              <Phone size={20} className="text-[var(--primary)]" />
              <div>
                <p className="font-medium">Phone</p>
                <p className="text-sm text-gray-500">{SUPPORT_PHONE_DISPLAY}</p>
              </div>
            </a>
            <a
              href={supportWhatsAppHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-xl bg-gray-50"
            >
              <span className="text-[#25D366] flex items-center justify-center">
                <WhatsAppBrandIcon className="w-6 h-6" />
              </span>
              <div>
                <p className="font-medium">WhatsApp</p>
                <p className="text-sm text-gray-500">{SUPPORT_WHATSAPP_DISPLAY}</p>
              </div>
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h3 className="font-semibold text-[var(--foreground)] mb-2">FAQs</h3>
          <div className="divide-y divide-gray-100 -mx-1">
            <details id="sign-in-issues" className="group py-3 px-1">
              <summary className="font-medium text-sm cursor-pointer list-none flex items-center justify-between gap-3">
                <span>I can&apos;t sign in &mdash; &ldquo;verification failed&rdquo; or captcha error</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform" aria-hidden>
                  ▾
                </span>
              </summary>
              <div className="text-sm text-gray-600 space-y-2 pt-3 leading-relaxed">
                <p>
                  Our security check (Cloudflare Turnstile) makes sure sign-in attempts come
                  from real people, not bots. A few things commonly block it from working:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Corporate VPN or web filter (Zscaler, Cisco Umbrella, Palo Alto, Netskope, Symantec).</li>
                  <li>Strict ad-blocker or privacy extension blocking <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">challenges.cloudflare.com</code>.</li>
                  <li>Some corporate Wi-Fi networks that perform SSL inspection.</li>
                </ul>
                <p className="font-medium text-gray-700 mt-2">Try in this order:</p>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Switch off Wi-Fi and try on mobile data.</li>
                  <li>Disable any VPN, proxy, or browser shield for this site, then refresh.</li>
                  <li>Pause ad-blocker / privacy extension for this site and refresh.</li>
                  <li>Try a different browser (Chrome, Safari, Firefox).</li>
                  <li>
                    If you&apos;re on an office network, ask your IT admin to allow{" "}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">challenges.cloudflare.com</code>{" "}
                    and{" "}
                    <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">*.supabase.co</code>.
                  </li>
                </ol>
                <p className="mt-2">
                  If none of these work, contact us using the options above &mdash; we&apos;ll
                  help you sign in another way.
                </p>
              </div>
            </details>

            <details className="group py-3 px-1">
              <summary className="font-medium text-sm cursor-pointer list-none flex items-center justify-between gap-3">
                <span>How do I verify my profile?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform" aria-hidden>
                  ▾
                </span>
              </summary>
              <p className="text-sm text-gray-600 pt-3 leading-relaxed">
                Go to Profile &rarr; Trust Badge and follow the verification steps.
              </p>
            </details>

            <details className="group py-3 px-1">
              <summary className="font-medium text-sm cursor-pointer list-none flex items-center justify-between gap-3">
                <span>How do I upgrade to Premium?</span>
                <span className="text-gray-400 group-open:rotate-180 transition-transform" aria-hidden>
                  ▾
                </span>
              </summary>
              <p className="text-sm text-gray-600 pt-3 leading-relaxed">
                Go to Profile &rarr; Membership and choose a plan.
              </p>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
