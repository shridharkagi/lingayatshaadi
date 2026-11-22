"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, CircleAlert, Search, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import { ProfileFormSections } from "@/components/ProfileFormSections";
import { Profile } from "@/types";
import { validateMatrimonyDob } from "@/lib/dateOfBirth";
import { adminFetch } from "@/lib/api/adminClient";
import { PageHeader, phoneFmt, useDebounced } from "@/components/superadmin/ui";

const initialProfile: Partial<Profile> = {
  aboutMe: "",
  aboutMeVisible: true,
  fullName: "",
  maritalStatus: "",
  caste: "Lingayat",
  subCaste: "",
  height: "",
  dateOfBirth: "",
  timeOfBirth: "",
  placeOfBirth: "",
  rashi: "",
  nakshatra: "",
  horoscopeOtherDetails: "",
  qualification: "",
  professionType: "",
  profession: "",
  companyName: "",
  annualIncome: "",
  showAnnualIncome: true,
  fatherName: "",
  fatherOccupation: "",
  motherName: "",
  motherOccupation: "",
  foodHabits: "",
  siblingDetails: "",
  hobbies: [],
  familyOtherDetails: "",
  address: "",
  city: "",
  district: "",
  state: "",
  country: "India",
  contact: "",
  contactType: "Personal",
  email: "",
  memberId: "",
  verified: false,
  trustScore: 0,
};

type P = Partial<Profile>;
/** Sections in form order; ids match ProfileFormSections' `pf-<slug>` anchors. */
/** `track: false` = optional section that can't be judged complete (form defaults / uploads). */
const SECTIONS: { id: string; label: string; done: (p: P) => boolean; required?: boolean; track?: boolean }[] = [
  { id: "basic-details", label: "Basic details", done: (p) => !!(p.fullName?.trim() && p.gender && p.dateOfBirth), required: true },
  { id: "horoscope-details", label: "Horoscope", done: (p) => !!(p.rashi || p.timeOfBirth || p.placeOfBirth) },
  { id: "education-career", label: "Education & career", done: (p) => !!(p.qualification || p.profession) },
  { id: "partner-preferences", label: "Partner preferences", done: () => false, track: false },
  { id: "family-details", label: "Family", done: (p) => !!(p.fatherName || p.motherName) },
  { id: "about-me", label: "About me", done: (p) => !!p.aboutMe?.trim() },
  { id: "location-contact", label: "Location & contact", done: (p) => !!(p.city || p.district) && !!(p.contacts?.length || p.contact) },
  { id: "profile-photos", label: "Photos", done: (p) => !!p.profilePhoto },
  { id: "kyc-documents", label: "KYC documents", done: () => false, track: false },
];

type OwnerHit = { id: string; name: string; phone: string | null; accountCode: string | null; profileCount: number };

function OwnerPicker({ owner, onChange }: { owner: OwnerHit | null; onChange: (o: OwnerHit | null) => void }) {
  const [mode, setMode] = useState<"admin" | "member">(owner ? "member" : "admin");
  const [q, setQ] = useState("");
  const dq = useDebounced(q);
  const [hits, setHits] = useState<OwnerHit[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (mode !== "member" || dq.trim().length < 3) {
      setHits([]);
      return;
    }
    let alive = true;
    setBusy(true);
    adminFetch(`/api/superadmin/search?q=${encodeURIComponent(dq.trim())}`)
      .then((r) => (r.ok ? r.json() : { accounts: [] }))
      .then((j) => alive && setHits((j.accounts || []) as OwnerHit[]))
      .catch(() => alive && setHits([]))
      .finally(() => alive && setBusy(false));
    return () => {
      alive = false;
    };
  }, [dq, mode]);

  return (
    <div className="pc-block">
      <div className="pc-label">Who owns this profile?</div>
      <div className="pc-seg" role="radiogroup" aria-label="Profile owner">
        <button type="button" role="radio" aria-checked={mode === "admin"} className={mode === "admin" ? "on" : ""}
          onClick={() => { setMode("admin"); onChange(null); }}>
          <ShieldCheck size={14} /> Admin
        </button>
        <button type="button" role="radio" aria-checked={mode === "member"} className={mode === "member" ? "on" : ""} onClick={() => setMode("member")}>
          <UsersRound size={14} /> Member
        </button>
      </div>
      {mode === "admin" && <p className="pc-hint">Managed by the admin team. You can move it to a member&apos;s account later.</p>}
      {mode === "member" && (
        owner ? (
          <div className="pc-owner">
            <span className="ad-av" style={{ background: "#3f46b8", width: 30, height: 30 }}><UserRound size={14} /></span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 13 }}>{owner.name || "Unnamed account"}</div>
              <div className="ad-muted" style={{ fontSize: 11 }}>{owner.accountCode} · {phoneFmt(owner.phone)} · {owner.profileCount}/3 profiles</div>
            </div>
            <button type="button" className="pc-x" aria-label="Change owner" onClick={() => onChange(null)}><X size={14} /></button>
          </div>
        ) : (
          <>
            <label className="ad-search-box" style={{ height: 36, marginTop: 8 }}>
              <Search size={14} aria-hidden="true" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Phone, U-code or name" aria-label="Find account" autoFocus />
            </label>
            {busy && <p className="pc-hint">Searching…</p>}
            {!busy && dq.trim().length >= 3 && hits.length === 0 && <p className="pc-hint">No account found. The member must sign up first.</p>}
            <div className="pc-hits">
              {hits.map((h) => {
                const full = h.profileCount >= 3;
                return (
                  <button key={h.id} type="button" disabled={full} onClick={() => onChange(h)} title={full ? "Already has 3 profiles" : undefined}>
                    <span style={{ fontWeight: 600 }}>{h.name || "Unnamed"}</span>
                    <span className="ad-muted" style={{ fontSize: 11 }}>{h.accountCode} · {phoneFmt(h.phone)} · {full ? "3/3 full" : `${h.profileCount}/3`}</span>
                  </button>
                );
              })}
            </div>
          </>
        )
      )}
    </div>
  );
}

export default function SuperAdminCreateProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<P>(initialProfile);
  const [owner, setOwner] = useState<OwnerHit | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState(SECTIONS[0].id);
  /** While a jump-scroll is running, ignore the observer so the highlight doesn't flicker. */
  const jumpLock = useRef<number>(0);

  const required = [
    { label: "Full name", ok: !!profile.fullName?.trim() },
    { label: "Gender", ok: !!profile.gender },
    { label: "Date of birth", ok: validateMatrimonyDob(String(profile.dateOfBirth || "")).ok },
  ];
  const TRACKED = SECTIONS.filter((s) => s.track !== false);
  const doneCount = TRACKED.filter((s) => s.done(profile)).length;
  const ready = required.every((r) => r.ok);

  // Highlight the section in view.
  useEffect(() => {
    const els = SECTIONS.map((s) => document.getElementById(`pf-${s.id}`)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (vis && Date.now() > jumpLock.current) setActive(vis.target.id.replace(/^pf-/, ""));
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  const jump = (id: string) => {
    const el = document.getElementById(`pf-${id}`);
    if (!el) return;
    setActive(id);
    jumpLock.current = Date.now() + 900;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };

  const handleCreate = useCallback(async () => {
    if (!profile.fullName?.trim()) {
      setError("Full name is required");
      jump("basic-details");
      return;
    }
    if (!profile.gender) {
      setError("Gender is required");
      jump("basic-details");
      return;
    }
    const matDob = validateMatrimonyDob(String(profile.dateOfBirth || ""));
    if (!matDob.ok) {
      setError(matDob.error);
      jump("basic-details");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const res = await adminFetch("/api/superadmin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerAccountId: owner?.id || undefined,
          profile: {
            ...profile,
            fullName: profile.fullName!,
            gender: profile.gender as "male" | "female",
            dateOfBirth: matDob.iso,
            maritalStatus: profile.maritalStatus || "",
            caste: profile.caste || "Lingayat",
            subCaste: profile.subCaste || "",
            height: profile.height || "",
            aboutMe: profile.aboutMe || "",
            aboutMeVisible: profile.aboutMeVisible ?? true,
            verified: profile.verified ?? false,
            trustScore: profile.trustScore ?? 0,
          },
        }),
      });
      const json = (await res.json()) as { error?: string; profileId?: string };
      if (!res.ok || !json.profileId) {
        setError(json.error || "Failed to create profile");
        return;
      }
      router.push(`/superadmin/users/${json.profileId}/edit`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create profile");
    } finally {
      setSaving(false);
    }
  }, [profile, owner, router]);

  // ⌘/Ctrl + Enter saves.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !saving) void handleCreate();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCreate, saving]);

  return (
    <div className="pc-root">
      <PageHeader
        title="Create profile"
        subtitle="Only name, gender and date of birth are required. Fill the rest now or later from the edit page."
      >
        <Link href="/superadmin/review-center" className="ad-btn ghost">Cancel</Link>
        <button type="button" className="ad-btn pri" onClick={() => void handleCreate()} disabled={saving}>
          {saving ? "Creating…" : "Create profile"}
        </button>
      </PageHeader>

      <div className="pc-layout">
        <aside className="pc-side">
          <div className="ad-card pc-card">
            <OwnerPicker owner={owner} onChange={setOwner} />

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
                <span>Sections</span><span className="ad-muted">{doneCount}/{TRACKED.length}</span>
              </div>
              <div className="pc-progress"><span style={{ width: `${(doneCount / TRACKED.length) * 100}%` }} /></div>
              <nav className="pc-nav" aria-label="Form sections">
                {SECTIONS.map((s) => (
                  <button key={s.id} type="button" className={`${active === s.id ? "on" : ""} ${s.done(profile) ? "done" : ""}`} onClick={() => jump(s.id)}>
                    <span className="mk">{s.done(profile) ? <Check size={11} /> : null}</span>
                    {s.label}
                    {s.required && <span className="req">required</span>}
                    {s.track === false && <span className="opt">optional</span>}
                  </button>
                ))}
              </nav>
            </div>

            <label className="pc-toggle">
              <input type="checkbox" checked={!!profile.verified} onChange={(e) => setProfile((p) => ({ ...p, verified: e.target.checked }))} />
              <span>Mark as verified</span>
            </label>
            <p className="pc-hint" style={{ marginTop: 6 }}>New profiles go to the Review queue. Member ID is assigned automatically.</p>
          </div>
        </aside>

        <div className="pc-form pf-compact">
          <ProfileFormSections
            profile={profile}
            onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
            adminMode
            hideAdminControls
            userId={profile.publicId || profile.memberId || profile.id || "admin-create"}
          />
        </div>
      </div>

      <div className="pc-bar">
        <div className="pc-bar-in">
          {error ? (
            <span className="pc-err"><CircleAlert size={15} /> {error}</span>
          ) : (
            <span className="ad-muted" style={{ fontSize: 13 }}>
              {ready ? "Ready to create" : `Still needed: ${required.filter((r) => !r.ok).map((r) => r.label.toLowerCase()).join(", ")}`}
              {" · "}{owner ? `for ${owner.name || owner.accountCode}` : "owned by admin"}
              <span className="pc-kbd">⌘ Enter</span>
            </span>
          )}
          <span style={{ flex: 1 }} />
          <Link href="/superadmin/review-center" className="ad-btn ghost">Cancel</Link>
          <button type="button" className="ad-btn pri" onClick={() => void handleCreate()} disabled={saving}>
            {saving ? "Creating…" : "Create profile"}
          </button>
        </div>
      </div>
    </div>
  );
}
