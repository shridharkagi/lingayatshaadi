"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { Check, CircleAlert } from "lucide-react";
import { ProfileFormSections } from "@/components/ProfileFormSections";
import type { Profile } from "@/types";
import { validateMatrimonyDob } from "@/lib/dateOfBirth";
import { PageHeader } from "./ui";

type P = Partial<Profile>;

/** Sections in form order; ids match ProfileFormSections' `pf-<slug>` anchors.
 *  `track: false` = optional section that can't be judged complete (form defaults / uploads). */
export const PROFILE_SECTIONS: { id: string; label: string; done: (p: P) => boolean; required?: boolean; track?: boolean }[] = [
  { id: "basic-details", label: "Basic details", done: (p) => !!(p.fullName?.trim() && p.gender && p.dateOfBirth), required: true },
  { id: "horoscope-details", label: "Horoscope", done: (p) => !!(p.rashi || p.timeOfBirth || p.placeOfBirth) },
  { id: "education-career", label: "Education & career", done: (p) => !!(p.qualification || p.profession) },
  { id: "family-details", label: "Family", done: (p) => !!(p.fatherName || p.motherName) },
  { id: "about-me", label: "About me", done: (p) => !!p.aboutMe?.trim() },
  { id: "location-contact", label: "Location & contact", done: (p) => !!(p.city || p.district) && !!(p.contacts?.length || p.contact) },
  { id: "partner-preferences", label: "Partner preferences", done: () => false, track: false },
  { id: "profile-photos", label: "Photos", done: (p) => !!p.profilePhoto },
  { id: "kyc-documents", label: "KYC documents", done: () => false, track: false },
];

export function requiredChecks(p: P) {
  return [
    { label: "Full name", ok: !!p.fullName?.trim() },
    { label: "Gender", ok: !!p.gender },
    { label: "Date of birth", ok: validateMatrimonyDob(String(p.dateOfBirth || "")).ok },
  ];
}

/**
 * Shared admin layout for creating / editing a profile: sticky side panel
 * (custom top block, required checklist, section jump-nav with progress,
 * custom bottom block), compact form, and a sticky save bar.
 */
export default function ProfileEditorLayout({
  title, subtitle, profile, onChange, formUserId, sideTop, sideBottom, barStatus,
  error, saving, saveLabel, savingLabel, onSave, cancelHref, headerExtra,
}: {
  title: string;
  subtitle: ReactNode;
  profile: P;
  onChange: (u: P) => void;
  formUserId: string;
  sideTop?: ReactNode;
  sideBottom?: ReactNode;
  barStatus: ReactNode;
  error: string | null;
  saving: boolean;
  saveLabel: string;
  savingLabel: string;
  onSave: () => void;
  cancelHref: string;
  headerExtra?: ReactNode;
}) {
  const [active, setActive] = useState(PROFILE_SECTIONS[0].id);
  /** True while a jump-scroll runs, so the observer doesn't flicker the highlight. */
  const jumpLock = useRef<ReturnType<typeof setTimeout> | null>(null);
  const required = requiredChecks(profile);
  const tracked = PROFILE_SECTIONS.filter((s) => s.track !== false);
  const doneCount = tracked.filter((s) => s.done(profile)).length;

  // Highlight the section in view.
  useEffect(() => {
    const els = PROFILE_SECTIONS.map((s) => document.getElementById(`pf-${s.id}`)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis && !jumpLock.current) setActive(vis.target.id.replace(/^pf-/, ""));
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // ⌘/Ctrl + Enter saves.
  const saveRef = useRef(onSave);
  useEffect(() => {
    saveRef.current = onSave;
  }, [onSave]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) saveRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving]);

  const jump = (id: string) => {
    const el = document.getElementById(`pf-${id}`);
    if (!el) return;
    setActive(id);
    if (jumpLock.current) clearTimeout(jumpLock.current);
    jumpLock.current = setTimeout(() => {
      jumpLock.current = null;
    }, 900);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  return (
    <div className="pc-root">
      <PageHeader title={title} subtitle={subtitle}>
        {headerExtra}
        <Link href={cancelHref} className="ad-btn ghost">Cancel</Link>
        <button type="button" className="ad-btn pri" onClick={onSave} disabled={saving}>{saving ? savingLabel : saveLabel}</button>
      </PageHeader>

      <div className="pc-layout">
        <aside className="pc-side">
          <div className="ad-card pc-card">
            {sideTop}
            <div className="pc-block">
              <div className="pc-label">Required</div>
              {required.map((r) => (
                <div key={r.label} className={`pc-req ${r.ok ? "ok" : ""}`}>
                  {r.ok ? <Check size={13} /> : <span className="dot" />} {r.label}
                </div>
              ))}
            </div>
            <div className="pc-block">
              <div className="pc-label" style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Sections</span><span className="ad-muted">{doneCount}/{tracked.length}</span>
              </div>
              <div className="pc-progress"><span style={{ width: `${(doneCount / tracked.length) * 100}%` }} /></div>
              <nav className="pc-nav" aria-label="Form sections">
                {PROFILE_SECTIONS.map((s) => (
                  <button key={s.id} type="button" className={`${active === s.id ? "on" : ""} ${s.done(profile) ? "done" : ""}`} onClick={() => jump(s.id)}>
                    <span className="mk">{s.done(profile) ? <Check size={11} /> : null}</span>
                    {s.label}
                    {s.required && <span className="req">required</span>}
                    {s.track === false && <span className="opt">optional</span>}
                  </button>
                ))}
              </nav>
            </div>
            {sideBottom}
          </div>
        </aside>

        <div className="pc-form pf-compact">
          <ProfileFormSections profile={profile} onChange={onChange} adminMode hideAdminControls userId={formUserId} />
        </div>
      </div>

      <div className="pc-bar">
        <div className="pc-bar-in">
          {error ? (
            <span className="pc-err"><CircleAlert size={15} /> {error}</span>
          ) : (
            <span className="ad-muted" style={{ fontSize: 13 }}>
              {barStatus}
              <span className="pc-kbd">⌘ Enter</span>
            </span>
          )}
          <span style={{ flex: 1 }} />
          <Link href={cancelHref} className="ad-btn ghost">Cancel</Link>
          <button type="button" className="ad-btn pri" onClick={onSave} disabled={saving}>{saving ? savingLabel : saveLabel}</button>
        </div>
      </div>
    </div>
  );
}
