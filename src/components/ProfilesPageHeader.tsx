"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, Menu, Search, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthModal } from "@/contexts/AuthModalContext";

export function ProfilesPageHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { isLoggedIn, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const showAuthReady = !loading;

  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("#profiles-menu-btn")) return;
      if (mobileMenuOpen && !target.closest("#profiles-menu-panel")) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [mobileMenuOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0B0B12]/85 backdrop-blur-xl border-b border-[var(--lb-line)]">
      <div className="max-w-6xl mx-auto px-2.5 sm:px-4 flex items-center justify-between h-14 sm:h-16 gap-1.5 sm:gap-2 min-w-0">
        <Link href="/" className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 pr-1">
          <Heart className="w-7 h-7 sm:w-8 sm:h-8 shrink-0 text-[var(--lb-accent)] fill-[var(--lb-accent)]" aria-hidden />
          <span className="leading-tight text-[var(--primary)] min-w-0">
            <span className="block text-[0.95rem] sm:text-xl font-bold truncate max-w-[56vw] sm:max-w-none lb-wordmark">
              LingayatBandhu
            </span>
            <span className="block text-[9px] sm:text-xs font-semibold tracking-[0.12em] sm:tracking-[0.14em] uppercase text-[var(--lb-subtle)] truncate">
              Matrimony
            </span>
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
            className="text-[var(--color-text-muted)] hover:text-[var(--lb-accent-text)] transition"
          >
            Help
          </Link>
          {showAuthReady && isLoggedIn ? (
            <>
              <Link
                href="/home"
                className="text-[var(--color-text-muted)] hover:text-[var(--lb-accent-text)] transition"
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
                className="text-[var(--color-text-muted)] hover:text-[var(--lb-accent-text)] transition"
              >
                Sign In
              </button>
              <Button size="sm" onClick={() => openAuthModal("signup")}>Register</Button>
            </>
          )}
        </nav>
        <div className="md:hidden flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/search"
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
            aria-label="Open search"
          >
            <Search size={22} strokeWidth={2} aria-hidden />
          </Link>
          <button
            type="button"
            id="profiles-menu-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/5 active:bg-white/10 transition-colors touch-manipulation"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={24} strokeWidth={2} aria-hidden /> : <Menu size={24} strokeWidth={2} aria-hidden />}
          </button>
        </div>
      </div>
      <div
        id="profiles-menu-panel"
        className={`md:hidden bg-[var(--lb-surface)] border-b border-[var(--lb-line)] shadow-lg relative z-[60] overflow-hidden grid transition-all duration-200 ease-out origin-top ${
          mobileMenuOpen
            ? "grid-rows-[1fr] opacity-100 translate-y-0 pointer-events-auto border-t border-[var(--color-border)]"
            : "grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none border-t-0"
        }`}
      >
        <div className={`overflow-hidden flex flex-col gap-2 ${mobileMenuOpen ? "p-4" : "p-0"}`}>
          <Link href="/profiles" onClick={() => setMobileMenuOpen(false)}>
            Profiles
          </Link>
          <Link href="/search" onClick={() => setMobileMenuOpen(false)}>
            Search
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
      </div>
    </header>
  );
}
