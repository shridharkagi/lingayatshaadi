"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

export function ProfilesPageHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const showAuthReady = !loading;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--color-border)] shadow-[var(--shadow-soft)]">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 sm:h-16">
        <Link href="/" className="flex items-center gap-2">
          <Heart className="w-8 h-8 text-[var(--primary)] fill-[var(--primary)]" aria-hidden />
          <span className="text-xl font-bold text-[var(--primary)]">
            LingayatShaadi
          </span>
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/profiles"
            className="text-[var(--primary)] font-medium"
          >
            Profiles
          </Link>
          <Link
            href="/contact"
            className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
          >
            Help
          </Link>
          {showAuthReady && isLoggedIn ? (
            <>
              <Link
                href="/home"
                className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
              >
                Home
              </Link>
              <Link href="/account">
                <Button size="sm">My Account</Button>
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
              >
                Sign In
              </button>
              <Button size="sm" onClick={() => openAuthModal("signup")}>Register</Button>
            </>
          )}
        </nav>
        <button
          type="button"
          id="profiles-menu-btn"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg hover:bg-[var(--color-border)]/50 active:bg-[var(--color-border)] transition-colors touch-manipulation"
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
        >
          <Menu size={24} strokeWidth={2} aria-hidden />
        </button>
      </div>
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[var(--color-border)] bg-white p-4 flex flex-col gap-2 shadow-lg relative z-[60]">
          <Link href="/profiles" onClick={() => setMobileMenuOpen(false)}>
            Profiles
          </Link>
          <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
            Help
          </Link>
          {showAuthReady && isLoggedIn ? (
            <>
              <Link href="/home" onClick={() => setMobileMenuOpen(false)}>
                Home
              </Link>
              <Link href="/account" onClick={() => setMobileMenuOpen(false)}>
                <Button fullWidth>My Account</Button>
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal("login");
                }}
                className="text-left"
              >
                Sign In
              </button>
              <Button
                fullWidth
                onClick={() => {
                  setMobileMenuOpen(false);
                  openAuthModal("signup");
                }}
              >
                Register
              </Button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
