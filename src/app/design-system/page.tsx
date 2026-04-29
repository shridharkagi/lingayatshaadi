"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, Check, AlertCircle, Info, AlertTriangle, Briefcase, MapPin } from "lucide-react";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-16 scroll-mt-24">
      <h2 className="text-2xl font-bold text-[var(--color-secondary-dark)] mb-6 pb-2 border-b-2 border-[var(--color-primary)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorSwatch({ name, value, className }: { name: string; value: string; className: string }) {
  return (
    <div className="flex flex-col">
      <div className={`w-full h-20 rounded-[10px] mb-2 ${className} border border-[var(--color-border)]`} />
      <p className="font-medium text-sm text-[var(--color-text-primary)]">{name}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{value}</p>
    </div>
  );
}

function GradientSwatch({ name, value, style }: { name: string; value: string; style: React.CSSProperties }) {
  return (
    <div className="flex flex-col">
      <div className="w-full h-20 rounded-[10px] mb-2 border border-[var(--color-border)]" style={style} />
      <p className="font-medium text-sm text-[var(--color-text-primary)]">{name}</p>
      <p className="text-xs text-[var(--color-text-muted)]">{value}</p>
    </div>
  );
}

export default function DesignSystemPage() {
  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [radioValue, setRadioValue] = useState("option1");

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-[var(--color-white)] border-b border-[var(--color-border)] shadow-[var(--shadow-soft)]">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors"
          >
            <ChevronLeft size={24} />
            <span>Back</span>
          </Link>
          <h1 className="text-xl font-bold text-[var(--color-secondary-dark)]">LingayatBandhu</h1>
          <span className="text-sm font-medium text-[var(--color-primary)] px-4 py-2 bg-[var(--color-primary)]/10 rounded-[10px]">
            Design System
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12 pb-24">
        {/* Hero */}
        <div className="mb-16 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-secondary-dark)] mb-4">
            Design System Guide
          </h1>
          <p className="text-lg text-[var(--color-text-muted)] max-w-2xl mx-auto">
            A complete UI kit for LingayatBandhu — premium, trustworthy, and modern Indian. Built on simplicity and discipline.
          </p>
        </div>

        {/* 1. Typography */}
        <Section title="1. Typography">
          <div className="space-y-6 bg-[var(--color-bg-card)] rounded-[10px] p-8 shadow-[var(--shadow-card)]">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">H1 — 2.25rem / Bold</p>
              <h1 className="text-4xl font-bold text-[var(--color-secondary-dark)]">Headline One</h1>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">H2 — 1.875rem / Bold</p>
              <h2 className="text-3xl font-bold text-[var(--color-secondary-dark)]">Headline Two</h2>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">H3 — 1.5rem / SemiBold</p>
              <h3 className="text-2xl font-semibold text-[var(--color-secondary-dark)]">Headline Three</h3>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">Body — 1rem / Regular</p>
              <p className="text-base text-[var(--color-text-primary)]">
                Body text for paragraphs and general content. Use for readable blocks of text.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">Small — 0.875rem</p>
              <p className="text-sm text-[var(--color-text-primary)]">Small text for captions and labels</p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-1">Muted — 1rem</p>
              <p className="text-base text-[var(--color-text-muted)]">Muted text for secondary information</p>
            </div>
          </div>
        </Section>

        {/* 2. Color Palette */}
        <Section title="2. Color Palette">
          <p className="text-sm text-[var(--color-text-muted)] mb-4">Solid colors for typography, forms, and semantic UI.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 mb-10">
            <ColorSwatch name="Primary" value="#E67300" className="bg-[var(--color-primary)]" />
            <ColorSwatch name="Primary Hover" value="#CC6600" className="bg-[var(--color-primary-hover)]" />
            <ColorSwatch name="Gold Accent" value="#D4AF37" className="bg-[var(--color-accent-gold)]" />
            <ColorSwatch name="Background" value="#FFF8F2" className="bg-[var(--color-bg)]" />
            <ColorSwatch name="Border" value="#F1E5DA" className="bg-[var(--color-border)]" />
            <ColorSwatch name="Text Muted" value="#6B6B6B" className="bg-[var(--color-text-muted)]" />
            <ColorSwatch name="Charcoal" value="#1C1C1C" className="bg-[var(--color-secondary-dark)]" />
            <ColorSwatch name="White" value="#FFFFFF" className="bg-[var(--color-white)]" />
          </div>
          <p className="text-sm text-[var(--color-text-muted)] mb-4">Gradients for hero CTAs, premium sections, and visual depth.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            <GradientSwatch name="Primary (Saffron → Gold)" value="135deg" style={{ background: "var(--gradient-primary)" }} />
            <GradientSwatch name="Primary Hover" value="135deg, darker" style={{ background: "var(--gradient-primary-hover)" }} />
            <GradientSwatch name="Premium (Gold → Saffron)" value="135deg" style={{ background: "var(--gradient-premium)" }} />
            <GradientSwatch name="Warm Background" value="180deg, subtle" style={{ background: "var(--gradient-bg-warm)" }} />
          </div>
        </Section>

        {/* 3. Buttons */}
        <Section title="3. Buttons">
          <div className="space-y-6 bg-[var(--color-bg-card)] rounded-[10px] p-8 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap gap-4 items-center">
              <button className="px-6 py-3 rounded-[10px] font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors shadow-[var(--shadow-soft)]">
                Primary (Solid)
              </button>
              <button className="px-6 py-3 rounded-[10px] font-medium text-white shadow-[var(--shadow-soft)] transition-all hover:opacity-95" style={{ background: "var(--gradient-primary)" }}>
                Primary (Gradient)
              </button>
              <button className="px-6 py-3 rounded-[10px] font-medium bg-[var(--color-primary-hover)] text-white shadow-[var(--shadow-soft)]">
                Primary Hover
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button className="px-6 py-3 rounded-[10px] font-medium border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors">
                Secondary (Outline)
              </button>
              <button className="px-6 py-3 rounded-[10px] font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10 transition-colors">
                Ghost
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button disabled className="px-6 py-3 rounded-[10px] font-medium bg-[var(--color-primary)]/50 text-white cursor-not-allowed opacity-60">
                Disabled
              </button>
              <button className="px-6 py-3 rounded-[10px] font-medium text-[var(--color-secondary-dark)] hover:opacity-95 transition-opacity shadow-[var(--shadow-soft)]" style={{ background: "var(--gradient-premium)" }}>
                Premium (Gradient)
              </button>
            </div>
            <div className="flex flex-wrap gap-4 items-center">
              <button className="px-4 py-2 rounded-[10px] font-medium text-sm bg-[var(--color-primary)] text-white">
                Small
              </button>
              <button className="px-6 py-3 rounded-[10px] font-medium bg-[var(--color-primary)] text-white">
                Medium
              </button>
              <button className="px-8 py-4 rounded-[10px] font-medium text-lg bg-[var(--color-primary)] text-white">
                Large
              </button>
            </div>
          </div>
        </Section>

        {/* 4. Form Components */}
        <Section title="4. Form Components">
          <div className="space-y-8 bg-[var(--color-bg-card)] rounded-[10px] p-8 shadow-[var(--shadow-card)] max-w-xl">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Input</label>
              <input
                type="text"
                placeholder="Enter text..."
                className="w-full px-4 py-3 rounded-[10px] border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Input (Focus)</label>
              <input
                type="text"
                placeholder="Focused state..."
                className="w-full px-4 py-3 rounded-[10px] border-2 border-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 bg-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Textarea</label>
              <textarea
                placeholder="Multi-line input..."
                rows={3}
                className="w-full px-4 py-3 rounded-[10px] border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Select</label>
              <select className="w-full px-4 py-3 rounded-[10px] border border-[var(--color-border)] bg-white focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236B6B6B%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[right_0.75rem_center] bg-no-repeat pr-10">
                <option>Select an option</option>
                <option>Option 1</option>
                <option>Option 2</option>
              </select>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setCheckboxChecked(!checkboxChecked)}
                className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                  checkboxChecked ? "bg-[var(--color-primary)] border-[var(--color-primary)]" : "border-[var(--color-border)]"
                }`}
              >
                {checkboxChecked && <Check size={16} className="text-white" />}
              </button>
              <span className="text-[var(--color-text-primary)]">Checkbox</span>
            </div>
            <div className="flex gap-6">
              <button
                onClick={() => setRadioValue("option1")}
                className="flex items-center gap-3"
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  radioValue === "option1" ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
                }`}>
                  {radioValue === "option1" && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />}
                </div>
                <span className="text-[var(--color-text-primary)]">Option 1</span>
              </button>
              <button
                onClick={() => setRadioValue("option2")}
                className="flex items-center gap-3"
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  radioValue === "option2" ? "border-[var(--color-primary)]" : "border-[var(--color-border)]"
                }`}>
                  {radioValue === "option2" && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]" />}
                </div>
                <span className="text-[var(--color-text-primary)]">Option 2</span>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">Error State</label>
              <input
                type="text"
                placeholder="Invalid input"
                className="w-full px-4 py-3 rounded-[10px] border-2 border-[var(--color-error)] bg-[var(--color-error-bg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-error)]/30"
              />
              <p className="mt-1 text-sm text-[var(--color-error)]">Please enter a valid value</p>
            </div>
          </div>
        </Section>

        {/* 5. Cards */}
        <Section title="5. Cards">
          <div className="grid md:grid-cols-3 gap-6">
            {/* Profile Card (Matrimony Style) */}
            <div className="bg-[var(--color-bg-card)] rounded-[10px] overflow-hidden shadow-[var(--shadow-card)] border border-[var(--color-border)]">
              <div className="relative aspect-[3/4] bg-[var(--color-border)]">
                <div className="absolute inset-0 flex items-center justify-center text-4xl">👤</div>
                <span className="absolute top-2 right-2 px-2.5 py-1 text-xs font-medium text-[var(--color-secondary-dark)] bg-[var(--color-accent-gold)] rounded-[8px] shadow-[var(--shadow-soft)]">
                  Verified
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-[var(--color-secondary-dark)]">Rajesh K.</h3>
                <p className="text-sm text-[var(--color-text-muted)] mt-0.5">28 yrs • 5.8"</p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                  <Briefcase size={12} className="flex-shrink-0" />
                  Software Engineer
                </p>
                <p className="text-sm text-[var(--color-text-muted)] mt-1 flex items-center gap-1">
                  <MapPin size={12} className="flex-shrink-0" />
                  Bangalore, Karnataka
                </p>
                <button className="mt-4 w-full py-2.5 rounded-[10px] font-medium text-sm bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors">
                  View Profile
                </button>
              </div>
            </div>

            {/* Simple Info Card */}
            <div className="bg-[var(--color-bg-card)] rounded-[10px] p-6 shadow-[var(--shadow-card)] border border-[var(--color-border)]">
              <h3 className="font-semibold text-lg text-[var(--color-secondary-dark)] mb-2">Simple Info Card</h3>
              <p className="text-[var(--color-text-muted)] text-sm mb-4">
                Use for displaying concise information blocks.
              </p>
              <button className="text-[var(--color-primary)] font-medium text-sm hover:underline">Learn more</button>
            </div>

            {/* Premium Card */}
            <div className="bg-[var(--color-bg-card)] rounded-[10px] p-6 shadow-[var(--shadow-card)] border-2 border-[var(--color-accent-gold)] relative overflow-hidden">
              <div className="absolute top-0 right-0 px-4 py-1 rounded-bl-[10px] text-[var(--color-secondary-dark)] text-xs font-bold" style={{ background: "var(--gradient-premium)" }}>
                PREMIUM
              </div>
              <h3 className="font-semibold text-lg text-[var(--color-secondary-dark)] mb-2 pt-4">Premium Card</h3>
              <p className="text-[var(--color-text-muted)] text-sm">
                Highlighted for premium features. Gold border and badge.
              </p>
            </div>
          </div>
        </Section>

        {/* 6. Badges */}
        <Section title="6. Badges">
          <div className="flex flex-wrap gap-4 bg-[var(--color-bg-card)] rounded-[10px] p-8 shadow-[var(--shadow-card)]">
            <span className="px-2.5 py-1 rounded-[8px] text-xs font-medium text-[var(--color-secondary-dark)] bg-[var(--color-accent-gold)]">
              Verified
            </span>
            <span className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[var(--color-primary)]/15 text-[var(--color-primary)]">
              New
            </span>
            <span className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[var(--color-accent-gold)]/20 text-[var(--color-secondary-dark)] border border-[var(--color-accent-gold)]">
              Premium
            </span>
            <span className="px-4 py-2 rounded-[10px] text-sm font-medium bg-[var(--color-success-bg)] text-[var(--color-success)]">
              Active
            </span>
          </div>
        </Section>

        {/* 7. Alerts */}
        <Section title="7. Alerts">
          <div className="space-y-4 max-w-xl">
            <div className="flex items-start gap-4 p-4 rounded-[10px] bg-[var(--color-success-bg)] border border-[var(--color-success)]/30">
              <Check className="w-5 h-5 text-[var(--color-success)] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[var(--color-success)]">Success</p>
                <p className="text-sm text-[var(--color-text-muted)]">Your profile has been updated successfully.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-[10px] bg-[var(--color-error-bg)] border border-[var(--color-error)]/30">
              <AlertCircle className="w-5 h-5 text-[var(--color-error)] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[var(--color-error)]">Error</p>
                <p className="text-sm text-[var(--color-text-muted)]">Something went wrong. Please try again.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-[10px] bg-[var(--color-warning-bg)] border border-[var(--color-warning)]/30">
              <AlertTriangle className="w-5 h-5 text-[var(--color-warning)] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[var(--color-warning)]">Warning</p>
                <p className="text-sm text-[var(--color-text-muted)]">Your session will expire in 5 minutes.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-[10px] bg-[var(--color-info-bg)] border border-[var(--color-info)]/30">
              <Info className="w-5 h-5 text-[var(--color-info)] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[var(--color-info)]">Info</p>
                <p className="text-sm text-[var(--color-text-muted)]">New matches are available. Check your inbox.</p>
              </div>
            </div>
          </div>
        </Section>

        {/* 8. Navigation Components */}
        <Section title="8. Navigation Components">
          <div className="space-y-8">
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Navbar</p>
              <nav className="bg-[var(--color-white)] rounded-[10px] border border-[var(--color-border)] shadow-[var(--shadow-soft)] px-6 py-4 flex items-center justify-between">
                <span className="font-bold text-[var(--color-primary)]">LingayatBandhu</span>
                <div className="flex gap-4">
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-sm">Home</a>
                  <a href="#" className="text-[var(--color-text-muted)] hover:text-[var(--color-primary)] text-sm">Search</a>
                  <a href="#" className="text-[var(--color-primary)] font-medium text-sm">Profile</a>
                </div>
              </nav>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--color-text-muted)] mb-2">Footer</p>
              <footer className="bg-[var(--color-secondary-dark)] rounded-[10px] px-6 py-8 text-center">
                <p className="text-white font-medium mb-2">LingayatBandhu</p>
                <p className="text-[var(--color-text-muted)] text-sm mb-4">Premium matrimonial platform for the Lingayat community</p>
                <div className="flex justify-center gap-6 text-sm">
                  <a href="#" className="text-white/80 hover:text-white">Privacy</a>
                  <a href="#" className="text-white/80 hover:text-white">Terms</a>
                  <a href="#" className="text-white/80 hover:text-white">Contact</a>
                </div>
              </footer>
            </div>
          </div>
        </Section>

        {/* 9. Modal */}
        <Section title="9. Modal">
          <div className="flex flex-wrap gap-4">
            <button
              onClick={() => setModalOpen("login")}
              className="px-6 py-3 rounded-[10px] font-medium bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] transition-colors"
            >
              Open Login Modal
            </button>
            <button
              onClick={() => setModalOpen("confirm")}
              className="px-6 py-3 rounded-[10px] font-medium border-2 border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white transition-colors"
            >
              Open Confirmation Modal
            </button>
          </div>

          {/* Login Modal */}
          {modalOpen === "login" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(null)}>
              <div className="bg-[var(--color-bg-card)] rounded-[10px] p-8 max-w-md w-full shadow-[var(--shadow-card)]" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-xl font-bold text-[var(--color-secondary-dark)] mb-6">Login</h3>
                <div className="space-y-4">
                  <input
                    type="email"
                    placeholder="Email"
                    className="w-full px-4 py-3 rounded-[10px] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    className="w-full px-4 py-3 rounded-[10px] border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setModalOpen(null)}
                    className="flex-1 px-4 py-3 rounded-[10px] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 px-4 py-3 rounded-[10px] bg-[var(--color-primary)] text-white font-medium">
                    Login
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Confirmation Modal */}
          {modalOpen === "confirm" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={() => setModalOpen(null)}>
              <div className="bg-[var(--color-bg-card)] rounded-[10px] p-8 max-w-md w-full shadow-[var(--shadow-card)] text-center" onClick={(e) => e.stopPropagation()}>
                <div className="w-16 h-16 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-[var(--color-primary)]" />
                </div>
                <h3 className="text-xl font-bold text-[var(--color-secondary-dark)] mb-2">Confirm Action</h3>
                <p className="text-[var(--color-text-muted)] mb-6">Are you sure you want to proceed? This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setModalOpen(null)}
                    className="flex-1 px-4 py-3 rounded-[10px] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setModalOpen(null)}
                    className="flex-1 px-4 py-3 rounded-[10px] bg-[var(--color-primary)] text-white font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}
        </Section>

        {/* 10. Spacing & Border Radius */}
        <Section title="10. Spacing & Border Radius">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-[var(--color-bg-card)] rounded-[10px] p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-semibold text-[var(--color-secondary-dark)] mb-4">Spacing Scale (8px base)</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>--space-1</span><span>4px</span></div>
                <div className="flex justify-between"><span>--space-2</span><span>8px</span></div>
                <div className="flex justify-between"><span>--space-3</span><span>12px</span></div>
                <div className="flex justify-between"><span>--space-4</span><span>16px</span></div>
                <div className="flex justify-between"><span>--space-6</span><span>24px</span></div>
                <div className="flex justify-between"><span>--space-8</span><span>32px</span></div>
                <div className="flex justify-between"><span>--space-12</span><span>48px</span></div>
                <div className="flex justify-between"><span>--space-16</span><span>64px</span></div>
              </div>
            </div>
            <div className="bg-[var(--color-bg-card)] rounded-[10px] p-6 shadow-[var(--shadow-card)]">
              <h3 className="font-semibold text-[var(--color-secondary-dark)] mb-4">Border Radius</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg bg-[var(--color-primary)]/20" />
                  <span>--radius-sm: 8px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[10px] bg-[var(--color-primary)]/20" />
                  <span>--radius-md: 12px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[10px] bg-[var(--color-primary)]/20" />
                  <span>--radius-lg: 16px</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-[10px] bg-[var(--color-primary)]/20" />
                  <span>--radius-xl: 10px</span>
                </div>
              </div>
            </div>
          </div>
        </Section>

        {/* Design Rules Reference */}
        <Section title="Design Rules">
          <div className="bg-[var(--color-bg-card)] rounded-[10px] p-8 shadow-[var(--shadow-card)] border-l-4 border-[var(--color-primary)]">
            <ul className="space-y-2 text-[var(--color-text-primary)]">
              <li>• Use rounded corners (10px minimum)</li>
              <li>• Soft shadow only — avoid harsh shadows</li>
              <li>• No harsh black backgrounds — use charcoal sparingly</li>
              <li>• Background should remain warm white (#FFF8F2)</li>
              <li>• Gradients: hero CTAs, premium badges, VIP banners — keep forms and alerts solid</li>
              <li>• Gold must be used sparingly for premium/verified</li>
              <li>• Primary saffron is main action color</li>
              <li>• Maintain strong hierarchy and clean spacing</li>
              <li>• No clutter — simplicity reflects Lingayat values</li>
            </ul>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border)] bg-[var(--color-white)] py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-[var(--color-text-muted)] text-sm">
          LingayatBandhu Design System • Built for trust, simplicity, and tradition with modern thinking
        </div>
      </footer>
    </div>
  );
}
