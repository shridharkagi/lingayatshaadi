import Link from "next/link";
import { Heart } from "lucide-react";

/**
 * Marketing / legal footer: reuse on landing, directory views, and static pages.
 */
export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="bg-[var(--color-secondary-dark)] text-white py-10 sm:py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-6 h-6 text-[var(--primary)] fill-[var(--primary)]" />
            <span className="font-bold text-lg">LingayatBandhu</span>
          </Link>
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
            <Link href="/contact" className="hover:text-[var(--primary)] transition">
              Contact Us
            </Link>
            <Link href="/privacy" className="hover:text-[var(--primary)] transition">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-[var(--primary)] transition">
              Terms of Use
            </Link>
          </div>
        </div>
        <p className="text-center text-sm text-white/70">
          © {year} LingayatBandhu. All rights reserved.
        </p>
        <p className="text-center text-xs text-white/55 mt-3">
          A product of{" "}
          <a
            href="https://www.zivantatech.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-[var(--primary)] transition"
          >
            Zivanta Technologies
          </a>
        </p>
      </div>
    </footer>
  );
}
