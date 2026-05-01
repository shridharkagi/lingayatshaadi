"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Menu, X, ShieldCheck, Users, Lock, Handshake, Heart } from "lucide-react";

const navItems = [
  { label: "Home", href: "#home" },
  { label: "About Us", href: "#about" },
  { label: "Search", href: "#search" },
  { label: "Membership", href: "#membership" },
  { label: "Success Stories", href: "#success-stories" },
  { label: "Contact", href: "#contact" },
];

const trustPillars = [
  { icon: ShieldCheck, title: "100% Verified Profiles" },
  { icon: Users, title: "Trusted by Thousands" },
  { icon: Lock, title: "Privacy Assured" },
  { icon: Handshake, title: "Built on Values, Bound by Trust" },
];

const storyCards = [
  {
    names: "Vikram & Deepa",
    text: "We found a family-first match rooted in shared traditions and values.",
  },
  {
    names: "Pranav & Aishwarya",
    text: "The profile quality and trust flow helped both families move confidently.",
  },
  {
    names: "Shivraj & Nandini",
    text: "Simple process, culturally aligned matches, and complete peace of mind.",
  },
];

export default function Home2Page() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#fff6e9] text-[#2d1a16]">
      <section id="home" className="relative isolate overflow-hidden">
        <div className="absolute inset-0">
          <Image
            src="/home2/hero-bg.png"
            alt="Traditional Lingayat wedding couple"
            fill
            priority
            className="object-cover object-[68%_50%] md:object-center"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,247,230,0.93)_0%,rgba(255,247,230,0.68)_38%,rgba(255,247,230,0.16)_62%,rgba(255,247,230,0.06)_100%)] md:bg-[linear-gradient(90deg,rgba(255,247,230,0.96)_0%,rgba(255,247,230,0.72)_45%,rgba(255,247,230,0.2)_72%,rgba(255,247,230,0.08)_100%)]" />
        </div>

        <header className="relative z-20">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 pt-5 md:px-8 md:pt-6">
            <Link href="#home" className="flex items-center gap-2">
              <Image src="/favicon.png" alt="Lingayat Bandhu logo" width={62} height={62} className="h-11 w-11 md:h-14 md:w-14" />
              <div className="leading-tight">
                <p className="text-xl font-semibold tracking-wide text-[#5c1718] md:text-3xl">LINGAYAT BANDHU</p>
                <p className="text-[10px] font-semibold tracking-[0.45em] text-[#b08a3e] md:text-xs">MATRIMONY</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-8 lg:flex">
              {navItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-[15px] font-semibold uppercase tracking-wide text-[#3f211f] transition hover:text-[#6b1c1d]"
                >
                  {item.label}
                </a>
              ))}
              <Link href="/login" className="rounded-full border border-[#7f2b2c] px-5 py-2 text-sm font-semibold text-[#6b1c1d] hover:bg-[#f6e5cf]">
                Login
              </Link>
              <Link href="/signup" className="rounded-full bg-[#6b1c1d] px-5 py-2 text-sm font-semibold text-[#f6e2aa] hover:bg-[#5a1718]">
                Signup
              </Link>
            </nav>

            <button
              type="button"
              className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#6b1c1d] text-white lg:hidden"
              onClick={() => setMobileOpen((prev) => !prev)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {mobileOpen && (
            <div className="mx-4 mt-3 rounded-2xl border border-[#d8b681] bg-[#fff8ef]/95 p-4 shadow-lg lg:hidden">
              <div className="flex flex-col gap-3">
                {navItems.map((item) => (
                  <a key={item.label} href={item.href} onClick={() => setMobileOpen(false)} className="font-semibold text-[#4c2220]">
                    {item.label}
                  </a>
                ))}
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <Link href="/login" className="rounded-full border border-[#7f2b2c] px-4 py-2 text-center font-semibold text-[#6b1c1d]">
                    Login
                  </Link>
                  <Link href="/signup" className="rounded-full bg-[#6b1c1d] px-4 py-2 text-center font-semibold text-[#f6e2aa]">
                    Signup
                  </Link>
                </div>
              </div>
            </div>
          )}
        </header>

        <div className="relative z-10 mx-auto flex min-h-[690px] w-full max-w-7xl flex-col justify-center px-4 pb-12 pt-10 md:min-h-[760px] md:px-8 md:pt-24">
          <div className="max-w-xl text-[#4a191a]">
            <h1 className="font-serif text-[45px] font-semibold leading-[1.05] tracking-tight md:text-[66px]">
              Together in Tradition,
              <br />
              United for a Lifetime
            </h1>
            <div className="mt-5 h-px w-64 bg-[#c09a5f]/70" />
            <p className="mt-5 text-2xl font-medium leading-tight text-[#2f1d18] md:text-[38px] md:leading-[1.1]">
              Bringing Lingayat hearts together
              <br />
              with trust, values and culture.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#6b1c1d] px-7 py-4 text-lg font-semibold uppercase tracking-wide text-[#f2cd74] shadow-[0_8px_24px_rgba(60,11,12,0.25)] transition hover:bg-[#5a1718]"
            >
              <Heart className="h-5 w-5 fill-[#f2cd74] text-[#f2cd74]" />
              Find Your Life Partner
            </Link>
          </div>
        </div>

        <div className="relative z-20 mx-auto -mt-4 w-full max-w-6xl px-4 pb-10 md:-mt-10 md:px-8 md:pb-14">
          <div className="rounded-[24px] border border-[#d8b681] bg-[#fff8ef]/95 p-4 shadow-[0_14px_40px_rgba(50,15,10,0.18)] backdrop-blur-sm md:p-5">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-4">
              {trustPillars.map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div key={pillar.title} className="rounded-2xl bg-[#fff9f2] px-3 py-4 text-center md:px-4">
                    <Icon className="mx-auto h-8 w-8 text-[#b9934a] md:h-10 md:w-10" />
                    <p className="mt-2 text-lg font-semibold leading-snug text-[#2f1c1a] md:text-[22px]">{pillar.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl space-y-12 px-4 pb-16 md:space-y-14 md:px-8 md:pb-20">
        <section id="about" className="rounded-3xl border border-[#dcc39a] bg-[#fff9f0] p-6 md:p-10">
          <h2 className="text-3xl font-semibold text-[#5d1b1b] md:text-4xl">About Us</h2>
          <p className="mt-4 max-w-4xl text-base leading-relaxed text-[#3f2720] md:text-lg">
            Lingayat Bandhu Matrimony is built for families who want trusted, respectful and culturally aligned matchmaking.
            We blend tradition with a modern, privacy-first experience so families and individuals can search with confidence.
          </p>
        </section>

        <section id="search" className="rounded-3xl border border-[#dcc39a] bg-[#fff9f0] p-6 md:p-10">
          <h2 className="text-3xl font-semibold text-[#5d1b1b] md:text-4xl">Search</h2>
          <p className="mt-4 text-base leading-relaxed text-[#3f2720] md:text-lg">
            Explore verified Lingayat profiles by age, location, education, profession, and family preferences. Refine your
            shortlist and connect only when both sides are ready.
          </p>
          <Link href="/profiles" className="mt-6 inline-flex rounded-full bg-[#6b1c1d] px-6 py-3 font-semibold text-[#f2cd74] hover:bg-[#5a1718]">
            Start Searching
          </Link>
        </section>

        <section id="membership" className="rounded-3xl border border-[#dcc39a] bg-[#fff9f0] p-6 md:p-10">
          <h2 className="text-3xl font-semibold text-[#5d1b1b] md:text-4xl">Membership</h2>
          <p className="mt-4 text-base leading-relaxed text-[#3f2720] md:text-lg">
            Choose flexible membership options to unlock priority visibility, enhanced profile controls, and dedicated support
            for your matchmaking journey.
          </p>
          <Link href="/membership" className="mt-6 inline-flex rounded-full border border-[#7f2b2c] px-6 py-3 font-semibold text-[#6b1c1d] hover:bg-[#f7e7d1]">
            View Membership Plans
          </Link>
        </section>

        <section id="success-stories" className="rounded-3xl border border-[#dcc39a] bg-[#fff9f0] p-6 md:p-10">
          <h2 className="text-3xl font-semibold text-[#5d1b1b] md:text-4xl">Success Stories</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {storyCards.map((story) => (
              <article key={story.names} className="rounded-2xl border border-[#e6d4b6] bg-[#fffdf9] p-5">
                <h3 className="text-xl font-semibold text-[#4f1b1b]">{story.names}</h3>
                <p className="mt-3 leading-relaxed text-[#3f2720]">{story.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="contact" className="rounded-3xl border border-[#dcc39a] bg-[#fff9f0] p-6 md:p-10">
          <h2 className="text-3xl font-semibold text-[#5d1b1b] md:text-4xl">Contact</h2>
          <p className="mt-4 text-base leading-relaxed text-[#3f2720] md:text-lg">
            Need help with profile setup or membership? Reach out to our support team and we will guide you end to end.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/contact" className="rounded-full bg-[#6b1c1d] px-6 py-3 font-semibold text-[#f2cd74] hover:bg-[#5a1718]">
              Contact Support
            </Link>
            <Link href="/signup" className="rounded-full border border-[#7f2b2c] px-6 py-3 font-semibold text-[#6b1c1d] hover:bg-[#f7e7d1]">
              Create Profile
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
