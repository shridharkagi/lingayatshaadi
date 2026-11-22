"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, ShieldCheck, UserRound, UsersRound, X } from "lucide-react";
import ProfileEditorLayout, { requiredChecks } from "@/components/superadmin/ProfileEditorLayout";
import { Profile } from "@/types";
import { validateMatrimonyDob } from "@/lib/dateOfBirth";
import { adminFetch } from "@/lib/api/adminClient";
import { phoneFmt, useDebounced } from "@/components/superadmin/ui";

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

  const missing = requiredChecks(profile).filter((r) => !r.ok);
  const toBasics = () => document.getElementById("pf-basic-details")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const handleCreate = useCallback(async () => {
    if (saving) return;
    if (!profile.fullName?.trim()) {
      setError("Full name is required");
      toBasics();
      return;
    }
    if (!profile.gender) {
      setError("Gender is required");
      toBasics();
      return;
    }
    const matDob = validateMatrimonyDob(String(profile.dateOfBirth || ""));
    if (!matDob.ok) {
      setError(matDob.error);
      toBasics();
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
  }, [profile, owner, router, saving]);

  return (
    <ProfileEditorLayout
      title="Create profile"
      subtitle="Only name, gender and date of birth are required. Fill the rest now or later from the edit page."
      profile={profile}
      onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
      formUserId={profile.publicId || profile.memberId || profile.id || "admin-create"}
      sideTop={<OwnerPicker owner={owner} onChange={setOwner} />}
      sideBottom={
        <>
          <label className="pc-toggle">
            <input type="checkbox" checked={!!profile.verified} onChange={(e) => setProfile((p) => ({ ...p, verified: e.target.checked }))} />
            <span>Mark as verified</span>
          </label>
          <p className="pc-hint" style={{ marginTop: 6 }}>New profiles go to the Review queue. Member ID is assigned automatically.</p>
        </>
      }
      barStatus={
        <>
          {missing.length ? `Still needed: ${missing.map((r) => r.label.toLowerCase()).join(", ")}` : "Ready to create"}
          {" · "}{owner ? `for ${owner.name || owner.accountCode}` : "owned by admin"}
        </>
      }
      error={error || null}
      saving={saving}
      saveLabel="Create profile"
      savingLabel="Creating…"
      onSave={() => void handleCreate()}
      cancelHref="/superadmin/review-center"
    />
  );
}
