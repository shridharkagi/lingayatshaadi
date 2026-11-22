"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, UserRound } from "lucide-react";
import { getMemberIdDisplay } from "@/lib/memberId";
import { Profile } from "@/types";
import { adminFetch } from "@/lib/api/adminClient";
import { validateMatrimonyDob } from "@/lib/dateOfBirth";
import ProfileEditorLayout from "@/components/superadmin/ProfileEditorLayout";
import { ProfileStatusChip, fmtDateTime, initials } from "@/components/superadmin/ui";

type P = Partial<Profile>;

export default function SuperAdminEditProfilePage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : params.id?.[0] ?? "";
  const [profile, setProfile] = useState<P>({});
  const [saved, setSaved] = useState<string>("{}");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  // Baseline for "unsaved changes" is taken once the form has settled, because
  // some fields fill in defaults on mount (e.g. partner-preference marital status).
  const [baselineReady, setBaselineReady] = useState(false);
  const profileRef = useRef<P>(profile);
  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!id) return;
      setLoading(true);
      setLoadError(null);
      try {
        const res = await adminFetch(`/api/superadmin/users/${encodeURIComponent(id)}`);
        const json = (await res.json()) as { profile?: P; error?: string };
        if (cancelled) return;
        if (!res.ok || !json.profile?.id) {
          setLoadError(json.error || "Profile not found");
        } else {
          setProfile({ ...json.profile });
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (loading || loadError || baselineReady) return;
    const t = setTimeout(() => {
      setSaved(JSON.stringify(profileRef.current));
      setBaselineReady(true);
    }, 600);
    return () => clearTimeout(t);
  }, [loading, loadError, baselineReady]);

  const dirty = useMemo(() => baselineReady && JSON.stringify(profile) !== saved, [profile, saved, baselineReady]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const handleSave = useCallback(async () => {
    if (saving) return;
    setError(null);
    let normalizedDob: string | undefined;
    if (profile.dateOfBirth) {
      const mat = validateMatrimonyDob(String(profile.dateOfBirth));
      if (!mat.ok) {
        setError(mat.error);
        document.getElementById("pf-basic-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      normalizedDob = mat.iso;
    }
    setSaving(true);
    try {
      const res = await adminFetch(`/api/superadmin/users/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: { ...profile, ...(normalizedDob ? { dateOfBirth: normalizedDob } : {}) } }),
      });
      const json = (await res.json()) as { error?: string; profile?: P };
      if (!res.ok) {
        setError(json.error || "Save failed");
        return;
      }
      const next = json.profile?.id ? { ...json.profile } : profile;
      setProfile(next);
      setSaved(JSON.stringify(next));
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, [id, profile, saving]);

  if (!id || loading || loadError) {
    return (
      <div className="pc-root">
        <div className="ad-card" style={{ padding: 24 }}>
          {loading && !loadError ? (
            <>
              <div className="ad-skel" style={{ height: 28, width: 240, marginBottom: 12 }} />
              <div className="ad-skel" style={{ height: 200 }} />
            </>
          ) : (
            <>
              <p className="ad-muted">{!id ? "Invalid profile ID" : loadError}</p>
              <Link href="/superadmin/review-center" className="ad-link">← Back to Profiles</Link>
            </>
          )}
        </div>
      </div>
    );
  }

  const status = profile.moderationStatus || "draft";
  const memberId = getMemberIdDisplay(profile);

  return (
    <ProfileEditorLayout
      title="Edit profile"
      subtitle={<>{memberId} · {profile.fullName || "Unnamed"}</>}
      profile={profile}
      onChange={(u) => setProfile((p) => ({ ...p, ...u }))}
      formUserId={profile.id || profile.publicId || profile.memberId || id}
      sideTop={
        <div className="pc-block">
          <div className="pc-summary">
            <span className="ad-av" style={{ background: profile.gender === "female" ? "#c2367a" : "#5b3aa8", width: 44, height: 44, position: "relative" }}>
              {profile.fullName ? initials(profile.fullName) : <UserRound size={18} />}
              {profile.profilePhoto && (
                <img src={profile.profilePhoto} alt="" style={{ position: "absolute", inset: 0 }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
              )}
            </span>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile.fullName || "Unnamed"}</div>
              <div className="ad-muted" style={{ fontSize: 12 }}>{memberId}</div>
              <div style={{ marginTop: 4 }}><ProfileStatusChip status={status} /></div>
            </div>
          </div>
          {status === "rejected" && profile.rejectionReason && (
            <p className="pc-hint" style={{ color: "#b42358" }}>Rejected: {profile.rejectionReason}</p>
          )}
          <div className="pc-links">
            {profile.userId && <Link href={`/superadmin/accounts/${profile.userId}`}>Account 360°</Link>}
            {profile.publicId && status === "approved" && (
              <a href={`/profile/${profile.publicId.toLowerCase()}`} target="_blank" rel="noreferrer">View as member <ExternalLink size={11} /></a>
            )}
            {status === "pending_review" && <Link href="/superadmin/moderation">Review now</Link>}
          </div>
        </div>
      }
      sideBottom={
        <>
          <label className="pc-toggle">
            <input type="checkbox" checked={!!profile.verified} onChange={(e) => setProfile((p) => ({ ...p, verified: e.target.checked }))} />
            <span>Verified</span>
          </label>
          <label className="pc-trust">
            <span>Trust score</span>
            <input type="number" min={0} max={100} value={profile.trustScore ?? 0}
              onChange={(e) => setProfile((p) => ({ ...p, trustScore: Math.max(0, Math.min(100, Number(e.target.value) || 0)) }))} />
          </label>
        </>
      }
      barStatus={
        dirty ? (
          <span className="pc-dirty">● Unsaved changes</span>
        ) : savedAt ? (
          <span style={{ color: "#0f766e" }}>✓ Saved at {fmtDateTime(savedAt)}</span>
        ) : (
          "No changes yet"
        )
      }
      error={error}
      saving={saving}
      saveLabel="Save changes"
      savingLabel="Saving…"
      onSave={() => void handleSave()}
      cancelHref="/superadmin/review-center"
    />
  );
}
