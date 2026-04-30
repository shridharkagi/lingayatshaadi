"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  Menu,
  X,
  Shield,
  CheckCircle2,
  Handshake,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { searchProfiles } from "@/lib/api/profiles";
import { calculateAge } from "@/lib/partnerPreferenceDefaults";
import type { Profile } from "@/types";
import { useAuthModal } from "@/contexts/AuthModalContext";
import { SiteFooter } from "@/components/SiteFooter";
import { getProfileSlug } from "@/lib/memberId";
import { WhatsAppGroupCta } from "@/components/whatsapp/WhatsAppGroupCta";

// Indian traditional couple and matrimony images
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=1920&q=80&fit=crop";
const CEO_IMAGE =
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=600&q=80&fit=crop";
const COUPLE_1 =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80&fit=crop";
const COUPLE_2 =
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80&fit=crop";
const COUPLE_3 =
  "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80&fit=crop";

const EXPERIENCE_IMG_1 =
  "https://images.unsplash.com/photo-1523438885200-e635ba2c371e?w=400&q=80&fit=crop";
const EXPERIENCE_IMG_2 =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80&fit=crop";
const EXPERIENCE_IMG_3 =
  "https://images.unsplash.com/photo-1609151162377-794faf68b02f?w=400&q=80&fit=crop";

const experienceCards = [
  {
    icon: Shield,
    title: "Verified & Authentic Profiles",
    description:
      "Every profile is verified so you connect with genuine Lingayat families. We prioritize trust and transparency in every match.",
    image: EXPERIENCE_IMG_1,
  },
  {
    icon: CheckCircle2,
    title: "Values-Based Matching",
    description:
      "Our matching considers Lingayat traditions, family expectations, and life goals—helping you find partners who share your worldview.",
    image: EXPERIENCE_IMG_2,
  },
  {
    icon: Handshake,
    title: "Family-Involved Matchmaking",
    description:
      "Designed for families who want to be part of the journey. Share profiles, discuss preferences, and make decisions together.",
    image: EXPERIENCE_IMG_3,
  },
];

const LATEST_PROFILE_IMAGES = [
  "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&fit=crop",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&fit=crop",
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&fit=crop",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&fit=crop",
  "https://images.unsplash.com/photo-1544723795-3fb6469f5b39?w=400&q=80&fit=crop",
];

const latestProfiles = [
  { name: "Kavya B.", age: 27, location: "Belgaum", profession: "Engineer", image: LATEST_PROFILE_IMAGES[0] },
  { name: "Suresh G.", age: 31, location: "Hubli", profession: "Entrepreneur", image: LATEST_PROFILE_IMAGES[1] },
  { name: "Anita J.", age: 26, location: "Dharwad", profession: "Teacher", image: LATEST_PROFILE_IMAGES[2] },
  { name: "Mahesh K.", age: 29, location: "Gadag", profession: "Doctor", image: LATEST_PROFILE_IMAGES[3] },
  { name: "Lakshmi P.", age: 28, location: "Bidar", profession: "Architect", image: LATEST_PROFILE_IMAGES[4] },
  { name: "Prasad M.", age: 30, location: "Mysore", profession: "Consultant", image: LATEST_PROFILE_IMAGES[5] },
];

const COMMUNITY_IMG =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80&fit=crop";

const successStories = [
  {
    image: COUPLE_1,
    names: "Ganesh & Meera",
    story: "Both our families wanted a Lingayat match. This platform made it easy to find someone who understood our traditions.",
  },
  {
    image: COUPLE_2,
    names: "Basavaraj & Sunita",
    story: "We met through a mutual community connection here. Our wedding was in Dharwad, surrounded by family.",
  },
  {
    image: COUPLE_3,
    names: "Shankar & Kavitha",
    story: "Shared faith and similar upbringing mattered most. We found that here and married within a year.",
  },
];

const faqs = [
  {
    q: "What makes LingayatBandhu different for Lingayat matrimony?",
    a: "We focus solely on the Lingayat community. Our platform understands Lingayat traditions, sub-castes, and family expectations. Profiles are verified, and matching prioritizes shared values, education, and lifestyle—so you meet people who truly align with your background.",
  },
  {
    q: "How do I register and create my profile?",
    a: "Click Register, enter your basic details, and verify your email and phone. Then complete your profile with photos, education, profession, and preferences. You can add family details and what you're looking for in a partner. Our team is available if you need help.",
  },
  {
    q: "How is my privacy protected?",
    a: "Your contact details are never shared without your permission. You decide who can view your profile and contact you. We use encryption and follow strict data practices. You can block or report anyone at any time.",
  },
  {
    q: "What does Premium Matchmaking include?",
    a: "Premium members get dedicated support, featured placement in search results, personalized match suggestions, and priority access to new profiles. Ideal for families who want extra assistance in finding the right match.",
  },
  {
    q: "How can I get in touch with support?",
    a: "Use the Help section, call our support line, or message us on WhatsApp. We're available 9 AM–9 PM, seven days a week, to assist with registration, matching, or any questions.",
  },
];

const communityLinks = [
  "Lingayat Brides",
  "Lingayat Grooms",
  "Karnataka Lingayat",
  "Lingayat Professionals",
  "Lingayat NRIs",
  "Lingayat Sub-castes",
  "Lingayat Families",
];

export default function LandingPage() {
  const { isLoggedIn, profileComplete, loading } = useAuth();
  const { openAuthModal } = useAuthModal();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [livePreviewProfiles, setLivePreviewProfiles] = useState<Profile[] | null>(null);

  const primaryCta = useMemo(() => {
    if (!loading && isLoggedIn) {
      if (profileComplete) return { href: "/profiles", label: "Explore Profiles" };
      return { href: "/profile/complete", label: "Complete Profile" };
    }
    return { href: "/signup", label: "Create Free Profile" };
  }, [loading, isLoggedIn, profileComplete]);

  // Load a small batch of real, recently-created profiles so the landing
  // page showcases actual members (and cards can deep-link to their
  // profile pages). Silently falls back to the curated mock list below
  // when Supabase isn't configured or the query fails.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await searchProfiles({}, 6);
        if (cancelled) return;
        if (error || !data || data.length === 0) {
          setLivePreviewProfiles([]);
          return;
        }
        setLivePreviewProfiles(data);
      } catch {
        if (!cancelled) setLivePreviewProfiles([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Build a uniform card list from either live data or the mock fallback,
  // preserving the existing design. When live data is available we route
  // each card to the specific profile detail page (publicId preferred, id
  // fallback). Mock rows keep a safe fallback link to the generic listing.
  const previewCards = useMemo(() => {
    const hasLive = livePreviewProfiles && livePreviewProfiles.length > 0;
    if (hasLive) {
      return livePreviewProfiles!.slice(0, 6).map((p, i) => {
        const age = calculateAge(p.dateOfBirth);
        const image = p.profilePhoto || p.photos?.[0] || LATEST_PROFILE_IMAGES[i % LATEST_PROFILE_IMAGES.length];
        const slug = getProfileSlug(p);
        return {
          href: slug ? `/profile/${slug}` : "/profiles",
          name: p.fullName?.split(" ")[0] || "Member",
          age: age ?? undefined,
          profession: p.profession || p.qualification || "",
          location: [p.city, p.district].filter(Boolean).join(", ") || p.state || "",
          image,
        };
      });
    }
    return latestProfiles.map((p) => ({
      href: "/profiles",
      name: p.name,
      age: p.age as number | undefined,
      profession: p.profession,
      location: p.location,
      image: p.image,
    }));
  }, [livePreviewProfiles]);

  // Native DOM event delegation - works around Turbopack breaking React onClick in dev
  useEffect(() => {
    const handleClick = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("#mobile-menu-btn")) {
        e.preventDefault();
        setMobileMenuOpen((prev) => !prev);
        return;
      }

      // Close the mobile menu when clicking anywhere outside menu panel.
      if (mobileMenuOpen && !target.closest("#mobile-menu-panel")) {
        setMobileMenuOpen(false);
      }

      const faqBtn = target.closest("[data-faq-index]");
      if (faqBtn) {
        e.preventDefault();
        const i = parseInt(faqBtn.getAttribute("data-faq-index") ?? "-1", 10);
        setOpenFaq((prev) => (prev === i ? null : i));
      }
    };
    document.addEventListener("click", handleClick, true);
    return () => document.removeEventListener("click", handleClick, true);
  }, [mobileMenuOpen]);

  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-bg-warm)" }}>
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--color-border)] shadow-[var(--shadow-soft)]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-[var(--primary)] fill-[var(--primary)]" />
            <span className="leading-tight text-[var(--primary)]">
              <span className="block text-xl font-bold">LingayatBandhu</span>
              <span className="block text-[11px] sm:text-xs font-semibold tracking-[0.14em] uppercase text-[var(--primary)]/85">
                Matrimony
              </span>
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/profiles"
              className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
            >
              Profiles
            </Link>
            <Link
              href="/contact"
              className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
            >
              Help
            </Link>
            {!loading && isLoggedIn ? (
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
          {/* Mobile sticky primary CTA near the hamburger. */}
          <div className="md:hidden flex items-center gap-1">
            {!loading && !isLoggedIn && (
              <Button
                size="sm"
                className="px-3 py-1.5 text-sm rounded-full shadow-sm"
                onClick={() => openAuthModal("signup")}
              >
                Register
              </Button>
            )}
            {/*
              Hamburger toggle.
              NOTE: toggle is handled exclusively by the document-level
              click delegate in useEffect below (capture phase) — we do NOT
              attach a React onClick here. Having both caused a
              double-toggle race (capture handler runs first and flips the
              state, then the React bubble-phase handler flips it back),
              which is why the menu appeared broken on mobile.
            */}
            <button
              type="button"
              id="mobile-menu-btn"
              className="p-2 min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-[var(--color-border)]/50 active:bg-[var(--color-border)] transition-colors touch-manipulation"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
            </button>
          </div>
        </div>
        <div
          id="mobile-menu-panel"
          className={`md:hidden bg-white shadow-lg relative z-[60] overflow-hidden grid transition-all duration-200 ease-out origin-top ${
            mobileMenuOpen
              ? "grid-rows-[1fr] opacity-100 translate-y-0 pointer-events-auto border-t border-[var(--color-border)]"
              : "grid-rows-[0fr] opacity-0 -translate-y-2 pointer-events-none border-t-0"
          }`}
        >
          <div className={`overflow-hidden flex flex-col gap-2 ${mobileMenuOpen ? "px-4 pb-4 pt-0" : "px-0 pb-0 pt-0"}`}>
            <Link href="/profiles" onClick={() => setMobileMenuOpen(false)}>
              Profiles
            </Link>
            <Link href="/contact" onClick={() => setMobileMenuOpen(false)}>
              Help
            </Link>
            {!loading && isLoggedIn ? (
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

      {/* Hero */}
      <section className="relative min-h-[75vh] sm:min-h-[80vh] lg:min-h-[85vh] flex items-center justify-center overflow-hidden pt-16 pb-20">
        <div className="absolute inset-0">
          <Image
            src={HERO_IMAGE}
            alt="Indian couple in traditional attire"
            fill
            className="object-cover"
            priority
            sizes="100vw"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-2xl mx-auto">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 drop-shadow-lg">
            Where Lingayat Values Meet Lasting Love
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-6 sm:mb-8">
            Connect with compatible life partners rooted in shared faith, tradition, and community
          </p>
          {!loading && isLoggedIn ? (
            <Link href={primaryCta.href}>
              <Button
                size="lg"
                className="border-0 text-white text-lg px-10 py-4 rounded-full shadow-lg hover:opacity-95 transition-opacity"
                style={{ background: "var(--gradient-primary)" }}
              >
                {primaryCta.label}
              </Button>
            </Link>
          ) : (
            <Button
              size="lg"
              onClick={() => openAuthModal("signup")}
              className="border-0 text-white text-lg px-10 py-4 rounded-full shadow-lg hover:opacity-95 transition-opacity"
              style={{ background: "var(--gradient-primary)" }}
            >
              {primaryCta.label}
            </Button>
          )}
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs sm:text-sm px-4">
          Built for Lingayat families • Verified profiles • Community-first matchmaking
        </div>
      </section>

      <section className="px-4 py-5">
        <div className="max-w-6xl mx-auto">
          <WhatsAppGroupCta sourcePage="home" />
        </div>
      </section>

      {/* The LingayatBandhu Experience */}
      <section className="py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8 sm:mb-12 text-center">
            <div className="inline-block h-1 w-24 rounded-full mb-4" style={{ background: "var(--gradient-primary)" }} />
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text-primary)]">
              Why Families Choose Us
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {experienceCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.title}
                  className="bg-white rounded-2xl overflow-hidden shadow-[var(--shadow-card)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.12)] transition-shadow border border-[var(--color-border)]/50"
                >
                  <div className="relative aspect-[16/10] w-full min-h-[140px] sm:min-h-[160px]">
                    <Image
                      src={card.image}
                      alt={card.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      unoptimized
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                    <div className="absolute top-3 left-3 w-12 h-12 rounded-xl bg-white/90 flex items-center justify-center shadow-md">
                      <Icon className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                  </div>
                  <div className="p-4 sm:p-6 lg:p-6">
                    <h3 className="text-base sm:text-lg font-bold text-[var(--color-text-primary)] mb-2">
                      {card.title}
                    </h3>
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Latest Profiles */}
      <section className="py-12 md:py-16 lg:py-20 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[var(--color-text-primary)] mb-6 sm:mb-8 text-center">
            Latest Profiles
          </h2>
          <p className="text-[var(--color-text-muted)] text-center max-w-2xl mx-auto mb-8 sm:mb-10">
            New Lingayat members register daily. Browse verified profiles from across Karnataka and beyond.
          </p>
          <div className="mx-auto w-full max-w-5xl">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              {previewCards.map((profile, i) => (
                <Link
                  key={`${profile.href}-${i}`}
                  href={profile.href}
                  className="bg-[var(--color-bg)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-all border border-[var(--color-border)]/50 group flex h-full"
                >
                  <div className="relative w-[42%] min-w-[42%] max-w-[220px] aspect-[3/4] bg-gray-200 flex-shrink-0 overflow-hidden">
                    <Image
                      src={profile.image}
                      alt={profile.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 42vw, (max-width: 1024px) 36vw, 220px"
                      unoptimized
                    />
                  </div>
                  <div className="p-4 sm:p-5 flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-semibold text-[var(--color-text-primary)] text-lg sm:text-xl truncate">
                      {profile.name}
                    </h3>
                    <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1">
                      {profile.age ? `${profile.age} yrs` : "—"}{" • "}{profile.profession || "—"}
                    </p>
                    <p className="text-sm sm:text-base text-[var(--color-text-muted)] mt-1 truncate">
                      {profile.location || "Location not available"}
                    </p>
                    <span className="inline-flex mt-4 w-fit px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold group-hover:bg-[var(--color-primary-hover)] transition-colors">
                      View Profile
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <Link href="/profiles">
              <Button variant="outline" className="rounded-full">
                Explore All Profiles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Premium Banner */}
      <section className="px-4 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="rounded-2xl p-5 sm:p-6 md:p-8 shadow-[var(--shadow-card)] flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6" style={{ background: "var(--gradient-premium)" }}>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Premium Matchmaking</h3>
                <p className="text-white/90 text-sm mt-1 max-w-md">
                  Get dedicated support, priority profile visibility, and personalized introductions—all while keeping your data secure.
                </p>
              </div>
            </div>
            <Link href="/contact">
              <button className="bg-[var(--color-secondary-dark)] text-white px-6 py-3 rounded-full font-medium hover:bg-black transition shadow-lg whitespace-nowrap">
                Learn More
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* About / Mission */}
      <section className="py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden flex flex-col lg:flex-row">
            <div className="lg:w-1/2 p-6 sm:p-8 lg:p-12 flex flex-col justify-center">
              <span className="text-6xl text-[var(--primary)]/30 font-serif leading-none">
                &ldquo;
              </span>
              <p className="text-xl md:text-2xl font-semibold text-[var(--color-text-primary)] -mt-4 mb-4">
                We believe every Lingayat family deserves a dignified, respectful way to find compatible life partners—honoring our heritage while embracing modern matchmaking.
              </p>
              <p className="text-[var(--color-text-muted)]">— The LingayatBandhu Team</p>
            </div>
            <div className="lg:w-1/2 relative aspect-[4/3] min-h-[300px]">
              <Image
                src={CEO_IMAGE}
                alt="LingayatBandhu team"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
                unoptimized
              />
            </div>
          </div>
        </div>
      </section>

      {/* Real Stories */}
      <section className="py-12 sm:py-16 md:py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 items-start">
            <div className="lg:w-1/3">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-3 sm:mb-4">
                Couples Who Found Love Here
              </h2>
              <p className="text-[var(--color-text-muted)] mb-6">
                Lingayat families across Karnataka and India have found compatible partners through our platform. Here are a few of their journeys.
              </p>
              {!loading && isLoggedIn ? (
                <Link href="/home">
                  <Button variant="outline" className="rounded-full">Go to Dashboard</Button>
                </Link>
              ) : (
                <Button variant="outline" className="rounded-full" onClick={() => openAuthModal("signup")}>
                  Read More Stories
                </Button>
              )}
            </div>
            <div className="lg:w-2/3 overflow-x-auto pb-4 -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0">
              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {successStories.map((story, i) => (
                  <div
                    key={i}
                    className="w-[280px] sm:w-auto flex-shrink-0 bg-[var(--color-bg)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] border border-[var(--color-border)]/50"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={story.image}
                        alt={story.names}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 280px, 33vw"
                        unoptimized
                      />
                    </div>
                    <div className="p-4">
                      <h4 className="font-bold text-[var(--color-text-primary)]">
                        {story.names}
                      </h4>
                      <p className="text-sm text-[var(--color-text-muted)] mt-1">
                        {story.story}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-8 sm:mb-10 text-center">
            Frequently Asked Questions
          </h2>
          <div id="faq-accordion" className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-border)]/50">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <button
                  type="button"
                  data-faq-index={i}
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left hover:bg-[var(--color-bg)]/50 transition cursor-pointer"
                >
                  <span className="text-[var(--color-text-muted)] font-medium mr-2">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span className="font-medium text-[var(--color-text-primary)] flex-1">
                    {faq.q}
                  </span>
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    {openFaq === i ? (
                      <Minus size={16} className="text-[var(--primary)]" />
                    ) : (
                      <Plus size={16} className="text-[var(--primary)]" />
                    )}
                  </span>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-5 pl-14">
                    <p className="text-[var(--color-text-muted)] text-sm leading-relaxed">
                      {faq.a}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Matrimony */}
      <section className="py-12 md:py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-border)]/50 flex flex-col lg:flex-row">
            <div className="lg:w-2/5 relative aspect-[16/9] lg:aspect-auto lg:min-h-[280px] flex-shrink-0">
              <Image
                src={COMMUNITY_IMG}
                alt="Community celebration"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 40vw"
                unoptimized
              />
            </div>
            <div className="p-6 md:p-8 flex-1">
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)] mb-4">
              Serving the Lingayat Community
            </h2>
            <p className="text-[var(--color-text-muted)] mb-6 text-sm sm:text-base">
              We connect Lingayat brides and grooms across Karnataka, India, and the diaspora. Whether you're looking for{" "}
              {communityLinks.slice(0, 3).map((c, i) => (
                <span key={c}>
                  <Link href="/signup" className="text-[var(--primary)] hover:underline">
                    {c}
                  </Link>
                  {i < 2 && ", "}
                </span>
              ))}{" "}
              —we're here to help you find the right match.
            </p>
            <div className="flex flex-wrap gap-2">
              {communityLinks.map((c) => (
                <Link
                  key={c}
                  href="/signup"
                  className="text-[var(--primary)] hover:underline text-sm font-medium"
                >
                  {c} →
                </Link>
              ))}
            </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
