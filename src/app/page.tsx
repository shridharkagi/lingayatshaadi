"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import {
  Heart,
  Menu,
  Shield,
  CheckCircle2,
  Handshake,
  Plus,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/Button";

// Indian traditional couple images from Unsplash
const HERO_IMAGE =
  "https://images.unsplash.com/photo-1605649487212-47bdab064df7?w=1920&q=80";
const CEO_IMAGE =
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&q=80";
const COUPLE_1 =
  "https://images.unsplash.com/photo-1591604466107-ec97de577aff?w=400&q=80";
const COUPLE_2 =
  "https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=400&q=80";
const COUPLE_3 =
  "https://images.unsplash.com/photo-1519741497674-611481863552?w=400&q=80";

const EXPERIENCE_IMG_1 =
  "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=400&q=80";
const EXPERIENCE_IMG_2 =
  "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80";
const EXPERIENCE_IMG_3 =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=400&q=80";

const experienceCards = [
  {
    icon: Shield,
    title: "20 Day Money Back Guarantee",
    description:
      "Not satisfied? Get a full refund within 20 days. We believe in our service and your peace of mind.",
    image: EXPERIENCE_IMG_1,
  },
  {
    icon: CheckCircle2,
    title: "More Matches Guaranteed",
    description:
      "Connect with thousands of verified Lingayat profiles. Find your perfect match from our growing community.",
    image: EXPERIENCE_IMG_2,
  },
  {
    icon: Handshake,
    title: "Most Trusted Lingayat Matrimony",
    description:
      "Trusted by lakhs of families. The leading platform for Lingayat community matchmaking across India.",
    image: EXPERIENCE_IMG_3,
  },
];

const LATEST_PROFILE_IMAGES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80",
  "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80",
];

const latestProfiles = [
  { name: "Priya K.", age: 28, location: "Bangalore", profession: "Software Engineer", image: LATEST_PROFILE_IMAGES[0] },
  { name: "Rahul M.", age: 30, location: "Mumbai", profession: "Chartered Accountant", image: LATEST_PROFILE_IMAGES[1] },
  { name: "Divya S.", age: 27, location: "Hyderabad", profession: "Doctor", image: LATEST_PROFILE_IMAGES[2] },
  { name: "Arjun P.", age: 32, location: "Pune", profession: "Business Analyst", image: LATEST_PROFILE_IMAGES[3] },
  { name: "Sneha R.", age: 29, location: "Chennai", profession: "Architect", image: LATEST_PROFILE_IMAGES[4] },
];

const COMMUNITY_IMG =
  "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=800&q=80";

const successStories = [
  {
    image: COUPLE_1,
    names: "Ravi & Shobha",
    story: "Found each other through LingayatShaadi. Our shared values brought us together.",
  },
  {
    image: COUPLE_2,
    names: "Aditya & Sanjana",
    story: "We connected within a month. The verification process gave our families confidence.",
  },
  {
    image: COUPLE_3,
    names: "Vikram & Priya",
    story: "From first interest to marriage in 8 months. Truly grateful for this platform.",
  },
];

const faqs = [
  {
    q: "Why is LingayatShaadi better compared to other matrimony websites?",
    a: "LingayatShaadi is exclusively built for the Lingayat community, ensuring culturally relevant matches. We offer verified profiles, 20-day money-back guarantee, and a privacy-first approach. Our AI-powered matching considers community values, education, and family preferences.",
  },
  {
    q: "How do I create my profile on LingayatShaadi?",
    a: "Creating a profile is simple. Click Register, fill in your basic details, verify your email and mobile, and complete your profile with photos and preferences. Our team can help you at every step.",
  },
  {
    q: "Is my information safe and private?",
    a: "Yes. We use industry-standard encryption and never share your contact details without your consent. You control who sees your profile and can block or report any user.",
  },
  {
    q: "What is the VIP LingayatShaadi service?",
    a: "VIP LingayatShaadi offers priority support, featured profile placement, personalized matchmaking assistance, and exclusive access to verified high-interest profiles. Contact us to learn more.",
  },
  {
    q: "How can I contact support?",
    a: "You can reach us via the Help section, call our toll-free number, or WhatsApp. Our support team is available 9 AM–9 PM, 7 days a week.",
  },
];

const communityLinks = [
  "Lingayat Matrimony",
  "Kannada Matrimony",
  "Karnataka Matrimony",
  "Telugu Matrimony",
  "Marwari Matrimony",
  "Brahmin Matrimony",
  "Jain Matrimony",
];

export default function LandingPage() {
  const router = useRouter();
  const { isLoggedIn, profileComplete, loading } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (isLoggedIn && profileComplete) {
      router.replace("/home");
    }
  }, [loading, isLoggedIn, profileComplete, router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-[var(--color-border)] shadow-[var(--shadow-soft)]">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 sm:h-16">
          <Link href="/" className="flex items-center gap-2">
            <Heart className="w-8 h-8 text-[var(--primary)] fill-[var(--primary)]" />
            <span className="text-xl font-bold text-[var(--primary)]">
              LingayatShaadi
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/login#help"
              className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
            >
              Help
            </Link>
            <Link
              href="/login"
              className="text-[var(--color-text-muted)] hover:text-[var(--primary)] transition"
            >
              Sign In
            </Link>
            <Link href="/signup">
              <Button size="sm">Register</Button>
            </Link>
          </nav>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setMobileMenuOpen((prev) => !prev);
            }}
            className="md:hidden p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-1 rounded-lg hover:bg-[var(--color-border)]/50 active:bg-[var(--color-border)] transition-colors touch-manipulation"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileMenuOpen}
          >
            <Menu size={24} strokeWidth={2} />
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[var(--color-border)] bg-white p-4 flex flex-col gap-2 shadow-lg relative z-[60]">
            <Link href="/login#help" onClick={() => setMobileMenuOpen(false)}>
              Help
            </Link>
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
              Sign In
            </Link>
            <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
              <Button fullWidth>Register</Button>
            </Link>
          </div>
        )}
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
            Find your forever ❤️
          </h1>
          <p className="text-lg sm:text-xl md:text-2xl text-white/95 mb-6 sm:mb-8">
            Discover your #AlwaysTogether story in the Lingayat community
          </p>
          <Link href="/signup">
            <Button
              size="lg"
              className="bg-[var(--primary)] hover:bg-[var(--primary-light)] border-0 text-white text-lg px-10 py-4 rounded-full shadow-lg"
            >
              Join LingayatShaadi
            </Button>
          </Link>
        </div>
        <div className="absolute bottom-4 left-0 right-0 text-center text-white/80 text-xs sm:text-sm px-4">
          Trust of millions • ★★★★★ 4.8 • 5 lakh+ success stories
        </div>
      </section>

      {/* The LingayatShaadi Experience */}
      <section className="py-12 sm:py-16 md:py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] mb-8 sm:mb-12 text-center">
            The LingayatShaadi Experience
          </h2>
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
            New members joining every day. Be the first to connect with these verified profiles.
          </p>
          <div className="overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:overflow-visible">
            <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-5 min-w-max sm:min-w-0">
              {latestProfiles.map((profile, i) => (
                <Link
                  key={i}
                  href="/signup"
                  className="flex-shrink-0 w-[260px] sm:w-auto bg-[var(--color-bg)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-card)] transition-all border border-[var(--color-border)]/50 group"
                >
                  <div className="relative aspect-[3/4]">
                    <Image
                      src={profile.image}
                      alt={profile.name}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 260px, (max-width: 1024px) 50vw, 20vw"
                      unoptimized
                    />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-[var(--color-text-primary)] truncate">
                      {profile.name}
                    </h3>
                    <p className="text-sm text-[var(--color-text-muted)] mt-0.5">
                      {profile.age} yrs • {profile.profession}
                    </p>
                    <p className="text-xs text-[var(--color-text-muted)] mt-1 truncate">
                      {profile.location}
                    </p>
                    <span className="inline-block mt-3 text-sm font-medium text-[var(--primary)] group-hover:underline">
                      View Profile →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          <div className="text-center mt-8">
            <Link href="/signup">
              <Button variant="outline" className="rounded-full">
                View All Profiles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* VIP Banner */}
      <section className="px-4 py-10 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-5 sm:p-6 md:p-8 shadow-[var(--shadow-card)] flex flex-col md:flex-row items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center">
                <span className="text-2xl">💎</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">VIP LingayatShaadi</h3>
                <p className="text-white/90 text-sm mt-1 max-w-md">
                  Experience our best service & get personal matchmaking without
                  compromising your privacy.
                </p>
              </div>
            </div>
            <Link href="/login">
              <button className="bg-[var(--color-secondary-dark)] text-white px-6 py-3 rounded-full font-medium hover:bg-black transition shadow-lg whitespace-nowrap">
                Know More
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
                At LingayatShaadi, it is our mission to use technology for good
                and bring back deep, meaningful relationships within our
                community.
              </p>
              <p className="text-[var(--color-text-muted)]">— LingayatShaadi Team</p>
            </div>
            <div className="lg:w-1/2 relative aspect-[4/3] min-h-[300px]">
              <Image
                src={CEO_IMAGE}
                alt="LingayatShaadi team"
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
                Real Stories, True Connections
              </h2>
              <p className="text-[var(--color-text-muted)] mb-6">
                Thousands of couples have found their life partners through
                LingayatShaadi. Read how our platform helped create meaningful
                connections.
              </p>
              <Link href="/login">
                <Button variant="outline" className="rounded-full">
                  VIEW ALL
                </Button>
              </Link>
            </div>
            <div className="lg:w-2/3 overflow-x-auto pb-4 -mx-4 px-4 sm:overflow-visible sm:mx-0 sm:px-0">
              <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 min-w-max sm:min-w-0">
                {successStories.map((story, i) => (
                  <div
                    key={i}
                    className="w-72 sm:w-auto flex-shrink-0 bg-[var(--color-bg)] rounded-2xl overflow-hidden shadow-[var(--shadow-soft)] border border-[var(--color-border)]/50"
                  >
                    <div className="relative aspect-[4/3]">
                      <Image
                        src={story.image}
                        alt={story.names}
                        fill
                        className="object-cover"
                        sizes="(max-width: 1024px) 288px, 33vw"
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
          <div className="bg-white rounded-2xl shadow-[var(--shadow-card)] overflow-hidden border border-[var(--color-border)]/50">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border-b border-[var(--color-border)] last:border-0"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full px-6 py-5 flex items-start justify-between gap-4 text-left hover:bg-[var(--color-bg)]/50 transition"
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
              Community Matrimony Services
            </h2>
            <p className="text-[var(--color-text-muted)] mb-6 text-sm sm:text-base">
              We specialize in community-specific matchmaking. Explore our
              services for{" "}
              {communityLinks.slice(0, 3).map((c, i) => (
                <span key={c}>
                  <Link href="/signup" className="text-[var(--primary)] hover:underline">
                    {c}
                  </Link>
                  {i < 2 && ", "}
                </span>
              ))}{" "}
              and many more communities across India.
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

      {/* Footer */}
      <footer className="bg-[var(--color-secondary-dark)] text-white py-10 sm:py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Link href="/" className="flex items-center gap-2">
              <Heart className="w-6 h-6 text-[var(--primary)] fill-[var(--primary)]" />
              <span className="font-bold text-lg">LingayatShaadi</span>
            </Link>
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-sm">
              <Link href="/login#help" className="hover:text-[var(--primary)] transition">
                Contact Us
              </Link>
              <Link href="/login#privacy" className="hover:text-[var(--primary)] transition">
                Privacy Policy
              </Link>
              <Link href="/login#terms" className="hover:text-[var(--primary)] transition">
                Terms of Use
              </Link>
            </div>
          </div>
          <p className="text-center text-sm text-white/70">
            © {new Date().getFullYear()} LingayatShaadi. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
