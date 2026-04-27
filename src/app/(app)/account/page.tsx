"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Pencil,
  Plus,
  ChevronRight,
  Trash2,
  LogOut,
  Settings as SettingsIcon,
  User as UserIcon,
  Check,
  X as XIcon,
  UserPlus,
  Heart,
  MapPin,
  Briefcase,
  Cake,
  BadgeCheck,
  Users,
  Clock,
  Bell,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input";
import { isSyntheticAuthEmail } from "@/lib/phoneAuth";
import { adminFetch } from "@/lib/api/adminClient";
import type { User } from "@supabase/supabase-js";
import { listProfilesByUserId, updateProfileById } from "@/lib/api/profiles";
import { deleteDraft } from "@/lib/api/drafts";
import { getMemberIdDisplay, getProfileSlug } from "@/lib/memberId";
import type { Profile } from "@/types";
import {
  computeProfileCompletion,
  completionTone,
} from "@/lib/profileCompletion";
import { BrideIcon, GroomIcon } from "@/components/ui/icons/BrideGroomIcons";
import { MAX_ACTIVE_OR_PENDING_PROFILES } from "@/lib/accessPolicy";

type RelationshipValue = NonNullable<Profile["relationship"]>;
type SimpleIcon = ComponentType<SVGProps<SVGSVGElement> & { size?: number }>;

/**
 * Each relationship option carries:
 *   • value  — canonical enum used in `Profile.relationship` / URL param
 *   • label  — user-facing display
 *   • icon   — visual cue. We reuse the bride/groom silhouettes to stay
 *              on-brand for a matrimony app (son/brother => groom,
 *              daughter/sister => bride). Generic icons are used for
 *              self + other.
 *   • hint   — one-liner shown under the label to help users pick right
 */
const RELATIONSHIP_OPTIONS: {
  value: RelationshipValue;
  label: string;
  icon: SimpleIcon;
  hint: string;
}[] = [
  { value: "self", label: "Self", icon: UserIcon as SimpleIcon, hint: "Profile for myself" },
  { value: "son", label: "Son", icon: GroomIcon as SimpleIcon, hint: "Looking for a bride" },
  { value: "daughter", label: "Daughter", icon: BrideIcon as SimpleIcon, hint: "Looking for a groom" },
  { value: "brother", label: "Brother", icon: GroomIcon as SimpleIcon, hint: "Looking for a bride" },
  { value: "sister", label: "Sister", icon: BrideIcon as SimpleIcon, hint: "Looking for a groom" },
  { value: "other", label: "Other", icon: Users as SimpleIcon, hint: "A dependent / relative" },
];

/**
 * Derive the correct `managedBy` value for a given relationship so the two
 * columns stay in sync whenever the user picks (or changes) a relationship.
 */
function managedByFor(rel: RelationshipValue): NonNullable<Profile["managedBy"]> {
  if (rel === "self") return "self";
  if (rel === "other") return "guardian";
  return "parent";
}

function formatMembershipDate(dateLike?: unknown) {
  if (!dateLike || typeof dateLike !== "string") return "—";
  const d = new Date(dateLike);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

function pendingAuthEmail(u: User): string | null {
  const raw = (u as User & { new_email?: string | null }).new_email;
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

export default function AccountPage() {
  const router = useRouter();
  const {
    authUser,
    accountMeta,
    isLoggedIn,
    loading,
    logout,
    updateAccountMeta,
    requestEmailChange,
    verifyEmailChangeOtp,
  } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showRelPicker, setShowRelPicker] = useState(false);
  // When non-null, the picker opens in EDIT mode for the given profile —
  // used to correct an accidentally-chosen relationship (e.g. user picked
  // "Daughter" but meant "Son"). When null the picker is in CREATE mode.
  const [editRelProfile, setEditRelProfile] = useState<Profile | null>(null);
  const [savingRel, setSavingRel] = useState(false);
  const [editing, setEditing] = useState(false);
  const [savingMeta, setSavingMeta] = useState(false);
  const [metaError, setMetaError] = useState("");
  const [metaForm, setMetaForm] = useState({
    firstName: "",
    lastName: "",
    city: "",
    gender: "" as "" | "male" | "female",
    dateOfBirth: "",
  });

  const [contactEmailInput, setContactEmailInput] = useState("");
  const [contactEmailOtp, setContactEmailOtp] = useState("");
  const [contactEmailStep, setContactEmailStep] = useState<"idle" | "sent">("idle");
  const [contactEmailBusy, setContactEmailBusy] = useState(false);
  const [contactEmailErr, setContactEmailErr] = useState("");
  const [contactEmailInfo, setContactEmailInfo] = useState("");
  const [contactEmailCooldown, setContactEmailCooldown] = useState(0);
  const [membershipHistory, setMembershipHistory] = useState<{
    subscriptions: Array<Record<string, unknown>>;
    transactions: Array<Record<string, unknown>>;
  }>({ subscriptions: [], transactions: [] });
  const [accountCode, setAccountCode] = useState<string | null>(null);
  const [pendingDeletionProfileIds, setPendingDeletionProfileIds] = useState<Set<string>>(() => new Set());
  const [deletionModalProfile, setDeletionModalProfile] = useState<Profile | null>(null);
  const [deletionReason, setDeletionReason] = useState("");
  const [deletionSubmitBusy, setDeletionSubmitBusy] = useState(false);
  const [deletionSubmitErr, setDeletionSubmitErr] = useState("");

  const loadPendingDeletionRequests = useCallback(async () => {
    const res = await adminFetch("/api/profile-deletion-request");
    const json = (await res.json()) as { pending?: Array<{ profile_id: string }> };
    if (!res.ok) return;
    setPendingDeletionProfileIds(new Set((json.pending || []).map((p) => p.profile_id)));
  }, []);

  const refreshProfiles = useCallback(async () => {
    if (!authUser) return;
    setLoadingProfiles(true);
    const { data } = await listProfilesByUserId(authUser.id);
    setProfiles(data);
    setLoadingProfiles(false);
  }, [authUser]);

  const loadMembershipHistory = useCallback(async () => {
    if (!authUser) return;
    const res = await adminFetch("/api/subscriptions/history");
    const json = (await res.json()) as {
      subscriptions?: Array<Record<string, unknown>>;
      transactions?: Array<Record<string, unknown>>;
    };
    if (!res.ok) return;
    setMembershipHistory({
      subscriptions: json.subscriptions || [],
      transactions: json.transactions || [],
    });
  }, [authUser]);

  // Drafts; submitted (active); soft-deleted (admin trash — read-only for members).
  const { drafts, submittedProfiles, deletedProfiles } = useMemo(() => {
    const d: Profile[] = [];
    const active: Profile[] = [];
    const del: Profile[] = [];
    for (const p of profiles) {
      if (p.deletedAt) {
        del.push(p);
        continue;
      }
      if (p.moderationStatus === "draft") d.push(p);
      else active.push(p);
    }
    return { drafts: d, submittedProfiles: active, deletedProfiles: del };
  }, [profiles]);
  const nonDeletedOwnedCount = drafts.length + submittedProfiles.length;
  const canCreateMoreProfiles = nonDeletedOwnedCount < MAX_ACTIVE_OR_PENDING_PROFILES;

  const handleResumeDraft = (draft: Profile) => {
    // Going through the normal /profile/complete route with the draft
    // id is enough — the wizard's init effect will detect it's a draft
    // and restore the saved step.
    const qs = new URLSearchParams({ profileId: draft.id });
    if (draft.relationship) qs.set("relationship", draft.relationship);
    router.push(`/profile/complete?${qs.toString()}`);
  };

  const handleDiscardDraft = async (draft: Profile) => {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        "Discard this unfinished profile? Any progress saved so far will be permanently removed."
      )
    ) {
      return;
    }
    const { error: delErr } = await deleteDraft(draft.id);
    if (delErr) {
      if (typeof window !== "undefined") window.alert(`Could not discard draft: ${delErr}`);
      return;
    }
    await refreshProfiles();
  };

  useEffect(() => {
    if (!loading && !isLoggedIn) {
      router.replace("/login");
    }
  }, [loading, isLoggedIn, router]);

  useEffect(() => {
    if (authUser) {
      refreshProfiles();
      void loadMembershipHistory();
      void loadPendingDeletionRequests();
    }
  }, [authUser, refreshProfiles, loadMembershipHistory, loadPendingDeletionRequests]);

  useEffect(() => {
    if (!authUser) return;
    let cancelled = false;
    (async () => {
      const res = await adminFetch("/api/account/account-code");
      const json = (await res.json()) as { accountCode?: string | null; error?: string };
      if (cancelled || !res.ok) return;
      setAccountCode(json.accountCode ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [authUser]);

  const pendingEmailForEffect = authUser ? pendingAuthEmail(authUser) : null;
  useEffect(() => {
    if (pendingEmailForEffect) {
      setContactEmailInput(pendingEmailForEffect);
      setContactEmailStep("sent");
    }
  }, [pendingEmailForEffect]);

  useEffect(() => {
    if (contactEmailCooldown <= 0) return;
    const id = window.setInterval(() => {
      setContactEmailCooldown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [contactEmailCooldown]);

  const startEditing = () => {
    setMetaForm({
      firstName: accountMeta?.firstName || "",
      lastName: accountMeta?.lastName || "",
      city: accountMeta?.city || "",
      gender: accountMeta?.gender || "",
      dateOfBirth: accountMeta?.dateOfBirth || "",
    });
    setMetaError("");
    if (authUser) {
      const pend = pendingAuthEmail(authUser);
      if (pend) {
        setContactEmailInput(pend);
        setContactEmailStep("sent");
      } else {
        setContactEmailInput(
          authUser.email && !isSyntheticAuthEmail(authUser.email) ? authUser.email : ""
        );
        setContactEmailStep("idle");
      }
      setContactEmailErr("");
      setContactEmailInfo("");
    }
    setEditing(true);
  };

  const handleSaveMeta = async () => {
    setMetaError("");
    if (!metaForm.firstName.trim()) return setMetaError("First name is required");
    if (!metaForm.city.trim()) return setMetaError("City is required");
    if (!metaForm.gender) return setMetaError("Gender is required");
    setSavingMeta(true);
    const result = await updateAccountMeta({
      firstName: metaForm.firstName.trim(),
      lastName: metaForm.lastName.trim() || undefined,
      city: metaForm.city.trim(),
      gender: metaForm.gender as "male" | "female",
      dateOfBirth: metaForm.dateOfBirth || undefined,
    });
    setSavingMeta(false);
    if (result.error) {
      setMetaError(result.error);
      return;
    }
    setEditing(false);
  };

  const openDeletionRequestModal = (profile: Profile) => {
    setDeletionReason("");
    setDeletionSubmitErr("");
    setDeletionModalProfile(profile);
  };

  const submitDeletionRequest = async () => {
    if (!deletionModalProfile) return;
    const reason = deletionReason.trim();
    if (reason.length < 15) {
      setDeletionSubmitErr("Please enter at least 15 characters explaining why you want this profile removed.");
      return;
    }
    setDeletionSubmitBusy(true);
    setDeletionSubmitErr("");
    const res = await adminFetch("/api/profile-deletion-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId: deletionModalProfile.id, reason }),
    });
    const json = (await res.json()) as { error?: string };
    setDeletionSubmitBusy(false);
    if (!res.ok) {
      setDeletionSubmitErr(json.error || "Could not submit request");
      return;
    }
    setPendingDeletionProfileIds((prev) => new Set(prev).add(deletionModalProfile.id));
    setDeletionModalProfile(null);
    setDeletionReason("");
    if (typeof window !== "undefined") {
      window.alert(
        "Your removal request was sent to our team. The profile will stay visible until an admin approves it."
      );
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  /**
   * Persist a corrected relationship on an existing profile.
   * Also keeps `managedBy` in sync so parent/guardian context stays correct.
   */
  const handleSaveRelationshipEdit = async (rel: RelationshipValue) => {
    if (!editRelProfile) return;
    setSavingRel(true);
    const { error } = await updateProfileById(editRelProfile.id, {
      relationship: rel,
      managedBy: managedByFor(rel),
    });
    setSavingRel(false);
    if (error) {
      alert(`Could not update relationship: ${error}`);
      return;
    }
    setEditRelProfile(null);
    refreshProfiles();
  };

  if (loading || !authUser) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  const pendingEmail = pendingAuthEmail(authUser);
  const hasRealVerifiedEmail =
    !!authUser.email &&
    !isSyntheticAuthEmail(authUser.email) &&
    !!authUser.email_confirmed_at &&
    !pendingEmail;
  const accountHolderCompletion = hasRealVerifiedEmail ? 100 : 90;
  const emailRowValue = pendingEmail
    ? `${pendingEmail} (check inbox to verify)`
    : hasRealVerifiedEmail
      ? authUser.email ?? "—"
      : "—";

  const sendContactEmailCode = async () => {
    if (contactEmailCooldown > 0) return;
    setContactEmailErr("");
    setContactEmailInfo("");
    setContactEmailBusy(true);
    const result = await requestEmailChange(contactEmailInput);
    setContactEmailBusy(false);
    if (result.error) {
      setContactEmailErr(result.error);
      if (result.rateLimited) {
        setContactEmailCooldown(60);
      }
      return;
    }
    setContactEmailStep("sent");
    setContactEmailInfo("Enter the 6-digit code from your email below.");
  };

  const confirmContactEmail = async () => {
    setContactEmailErr("");
    setContactEmailInfo("");
    setContactEmailBusy(true);
    const email =
      pendingEmail ||
      contactEmailInput.trim().toLowerCase();
    const result = await verifyEmailChangeOtp(email, contactEmailOtp);
    setContactEmailBusy(false);
    if (result.error) {
      setContactEmailErr(result.error);
      return;
    }
    setContactEmailStep("idle");
    setContactEmailOtp("");
    setContactEmailInput("");
    setContactEmailInfo("Email verified. You can sign in with this email and your password.");
  };

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-4">
      <header className="bg-[var(--primary)] text-white px-6 py-4 rounded-2xl shadow-sm flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/85">LingayatShaadi</p>
          <h1 className="text-xl font-bold leading-tight">My Account</h1>
        </div>
        <Link
          href="/settings"
          className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition"
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </Link>
      </header>

      <div className="px-0 space-y-4">
        {/* Account-holder basic details */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          {accountHolderCompletion < 100 && (
            <div className="mb-4 rounded-xl border border-amber-100 bg-amber-50/80 px-3 py-2.5">
              <div className="flex items-center justify-between text-xs font-medium text-amber-900">
                <span>Account completeness</span>
                <span>{accountHolderCompletion}%</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-amber-100/80 overflow-hidden">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${accountHolderCompletion}%` }}
                />
              </div>
              <p className="text-[11px] text-amber-900/80 mt-1.5">
                Add and verify an email to reach 100%. Phone signup doesn&apos;t require email; this is optional.
              </p>
            </div>
          )}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Account Holder</h2>
              <p className="text-sm text-gray-500 mt-0.5">Basic details for your account</p>
            </div>
            {!editing ? (
              <button
                onClick={startEditing}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 transition"
              >
                <Pencil size={14} />
                Edit
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveMeta}
                  disabled={savingMeta}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] transition disabled:opacity-50"
                >
                  <Check size={14} />
                  {savingMeta ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setMetaError("");
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
                >
                  <XIcon size={14} />
                  Cancel
                </button>
              </div>
            )}
          </div>

          {!editing ? (
            <>
              <dl className="divide-y divide-gray-100 text-sm">
                <Row
                  label="Account ID"
                  value={accountCode || "—"}
                  sub="Your account reference. Cannot be changed."
                />
                <Row label="Full Name" value={accountMeta?.fullName || "—"} />
                <Row label="Gender" value={accountMeta?.gender ? capitalize(accountMeta.gender) : "—"} />
                <Row label="City" value={accountMeta?.city || "—"} />
                <Row label="Phone" value={accountMeta?.phone || "—"} />
                <Row
                  label="Email"
                  value={emailRowValue}
                  sub={
                    hasRealVerifiedEmail
                      ? "Verified — you can sign in with this email and your password."
                      : "Optional. Not collected at signup."
                  }
                />
                <Row label="Date of Birth" value={accountMeta?.dateOfBirth || "—"} />
              </dl>

              {!hasRealVerifiedEmail && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <p className="text-sm font-medium text-gray-900">Add email (optional)</p>
                  <p className="text-xs text-gray-500">
                    We only use this for login and account recovery. Your signup mobile OTP flow stays the same.
                  </p>
                  <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    value={contactEmailInput}
                    onChange={(e) => setContactEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    disabled={contactEmailBusy}
                  />
                  {contactEmailStep === "sent" && (
                    <Input
                      label="6-digit code from email"
                      inputMode="numeric"
                      value={contactEmailOtp}
                      onChange={(e) => setContactEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter code"
                    />
                  )}
                  {contactEmailErr && <p className="text-sm text-red-600">{contactEmailErr}</p>}
                  {contactEmailInfo && <p className="text-xs text-blue-700">{contactEmailInfo}</p>}
                  <div className="flex flex-wrap gap-2">
                    {contactEmailStep !== "sent" ? (
                      <button
                        type="button"
                        disabled={
                          contactEmailBusy ||
                          !contactEmailInput.trim() ||
                          contactEmailCooldown > 0
                        }
                        onClick={sendContactEmailCode}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-50"
                      >
                        {contactEmailBusy
                          ? "Sending…"
                          : contactEmailCooldown > 0
                            ? `Wait ${contactEmailCooldown}s to retry`
                            : "Send verification code"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={contactEmailBusy || contactEmailOtp.length !== 6}
                        onClick={confirmContactEmail}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-50"
                      >
                        {contactEmailBusy ? "Verifying…" : "Verify email"}
                      </button>
                    )}
                    {contactEmailStep === "sent" && (
                      <button
                        type="button"
                        disabled={contactEmailBusy}
                        onClick={() => {
                          setContactEmailStep("idle");
                          setContactEmailOtp("");
                          setContactEmailErr("");
                          setContactEmailInfo("");
                          setContactEmailCooldown(0);
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700"
                      >
                        Edit email
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 min-w-0">
              {accountHolderCompletion < 100 && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                  Account completeness: {accountHolderCompletion}% — add and verify an email below to reach
                  100%.
                </p>
              )}
              <div className="rounded-xl border border-gray-100 bg-gray-50/90 px-3 py-2.5">
                <div className="flex items-start justify-between gap-3 text-sm">
                  <span className="text-gray-500 shrink-0">Account ID</span>
                  <span className="font-medium text-[var(--foreground)] text-right break-all">
                    {accountCode || "—"}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 text-right">Cannot be changed</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-0">
                <Input
                  label="First Name"
                  value={metaForm.firstName}
                  onChange={(e) => setMetaForm((m) => ({ ...m, firstName: e.target.value }))}
                />
                <Input
                  label="Last Name"
                  value={metaForm.lastName}
                  onChange={(e) => setMetaForm((m) => ({ ...m, lastName: e.target.value }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                <div className="flex gap-4">
                  {(["male", "female"] as const).map((g) => (
                    <label key={g} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="meta-gender"
                        checked={metaForm.gender === g}
                        onChange={() => setMetaForm((m) => ({ ...m, gender: g }))}
                        className="accent-[var(--primary)]"
                      />
                      <span className="capitalize">{g}</span>
                    </label>
                  ))}
                </div>
              </div>
              <Input
                label="City"
                value={metaForm.city}
                onChange={(e) => setMetaForm((m) => ({ ...m, city: e.target.value }))}
              />
              <Input
                label="Date of Birth"
                type="date"
                value={metaForm.dateOfBirth}
                onChange={(e) => setMetaForm((m) => ({ ...m, dateOfBirth: e.target.value }))}
                max={new Date().toISOString().slice(0, 10)}
              />

              {hasRealVerifiedEmail ? (
                <p className="text-sm text-gray-700">
                  <span className="text-gray-500">Email (verified):</span>{" "}
                  <span className="font-medium break-all">{authUser.email}</span>
                </p>
              ) : (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-900">Email (optional)</p>
                  <p className="text-xs text-gray-500">
                    Add a login email and verify it with the code we send you. Same as the section below when
                    not editing.
                  </p>
                  <Input
                    label="Email address"
                    type="email"
                    autoComplete="email"
                    value={contactEmailInput}
                    onChange={(e) => setContactEmailInput(e.target.value)}
                    placeholder="you@example.com"
                    disabled={contactEmailBusy}
                  />
                  {contactEmailStep === "sent" && (
                    <Input
                      label="6-digit code from email"
                      inputMode="numeric"
                      value={contactEmailOtp}
                      onChange={(e) => setContactEmailOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="Enter code"
                    />
                  )}
                  {contactEmailErr && <p className="text-sm text-red-600">{contactEmailErr}</p>}
                  {contactEmailInfo && <p className="text-xs text-blue-700">{contactEmailInfo}</p>}
                  <div className="flex flex-wrap gap-2">
                    {contactEmailStep !== "sent" ? (
                      <button
                        type="button"
                        disabled={
                          contactEmailBusy ||
                          !contactEmailInput.trim() ||
                          contactEmailCooldown > 0
                        }
                        onClick={sendContactEmailCode}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-50"
                      >
                        {contactEmailBusy
                          ? "Sending…"
                          : contactEmailCooldown > 0
                            ? `Wait ${contactEmailCooldown}s to retry`
                            : "Send verification code"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={contactEmailBusy || contactEmailOtp.length !== 6}
                        onClick={confirmContactEmail}
                        className="px-4 py-2 rounded-xl text-sm font-medium bg-[var(--primary)] text-white disabled:opacity-50"
                      >
                        {contactEmailBusy ? "Verifying…" : "Verify email"}
                      </button>
                    )}
                    {contactEmailStep === "sent" && (
                      <button
                        type="button"
                        disabled={contactEmailBusy}
                        onClick={() => {
                          setContactEmailStep("idle");
                          setContactEmailOtp("");
                          setContactEmailErr("");
                          setContactEmailInfo("");
                          setContactEmailCooldown(0);
                        }}
                        className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700"
                      >
                        Edit email
                      </button>
                    )}
                  </div>
                </div>
              )}

              <p className="text-xs text-gray-500">
                Phone number can&apos;t be changed here — contact support to update it.
              </p>
              {metaError && <p className="text-sm text-red-500">{metaError}</p>}
            </div>
          )}
        </section>

        {/* My Profiles */}
        <section className="bg-white rounded-2xl shadow-sm p-5">
          <div className="flex items-start justify-between gap-3 mb-5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">My Profiles</h2>
                {!loadingProfiles && drafts.length + submittedProfiles.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    {drafts.length + submittedProfiles.length}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-0.5">
                Detailed matrimonial profiles for yourself and your family
              </p>
            </div>
          </div>

          {loadingProfiles ? (
            <ProfileListSkeleton />
          ) : profiles.length === 0 ? (
            <EmptyProfilesState onCreate={() => setShowRelPicker(true)} />
          ) : (
            <>
              {/* Drafts surface — lets the user pick up where they left
                  off on any device. Rendered before submitted profiles
                  so an incomplete profile isn't accidentally forgotten. */}
              {drafts.length > 0 && (
                <div className="mb-4 space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Continue creating ({drafts.length})
                  </p>
                  {drafts.map((d) => (
                    <DraftRow
                      key={d.id}
                      draft={d}
                      onResume={() => handleResumeDraft(d)}
                      onDiscard={() => handleDiscardDraft(d)}
                    />
                  ))}
                </div>
              )}

              {submittedProfiles.length > 0 && (
                <div className="space-y-2.5">
                  {submittedProfiles.map((p) => (
                    <ProfileRow
                      key={p.id}
                      profile={p}
                      deletionPending={pendingDeletionProfileIds.has(p.id)}
                      onRequestDeletion={() => openDeletionRequestModal(p)}
                      onEditRelationship={setEditRelProfile}
                    />
                  ))}
                </div>
              )}

              {deletedProfiles.length > 0 && (
                <div className="mt-6 pt-6 border-t border-gray-100">
                  <h3 className="text-sm font-semibold text-[var(--foreground)]">Deleted profiles</h3>
                  <p className="text-xs text-gray-500 mt-1 mb-3 leading-relaxed">
                    These profiles are no longer on the site. This is for your records only — you cannot edit or
                    restore them here. Contact support if you need help.
                  </p>
                  <div className="space-y-2.5">
                    {deletedProfiles.map((p) => (
                      <DeletedProfileRow key={p.id} profile={p} />
                    ))}
                  </div>
                </div>
              )}

              {!canCreateMoreProfiles && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  You can create up to {MAX_ACTIVE_OR_PENDING_PROFILES} profiles. Delete one to add a new profile.
                </div>
              )}
              <button
                onClick={() => {
                  if (!canCreateMoreProfiles) return;
                  setShowRelPicker(true);
                }}
                disabled={!canCreateMoreProfiles}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--primary)]/30 text-[var(--primary)] font-medium hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={18} />
                {submittedProfiles.length === 0
                  ? "Create Full Profile"
                  : "Create Another Profile"}
              </button>
            </>
          )}
        </section>

        <section className="bg-white rounded-2xl shadow-sm p-4 sm:p-5 border border-gray-100/80">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-4">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-[var(--foreground)]">Membership History</h2>
              <p className="text-sm text-gray-500 mt-0.5 leading-snug">
                All activations, upgrades, and payment records.
              </p>
            </div>
            <Link
              href="/account/subscriptions"
              className="shrink-0 w-full sm:w-auto text-center rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold hover:bg-gray-50"
            >
              View Timeline
            </Link>
          </div>
          <Link
            href="/membership"
            className="mb-4 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)]/10 px-3 py-2 text-sm font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/15"
          >
            <Bell size={14} />
            Upgrade or manage membership
          </Link>
          {membershipHistory.subscriptions.length === 0 ? (
            <div className="rounded-xl bg-gray-50/80 border border-dashed border-gray-200 px-4 py-6 text-center">
              <p className="text-sm font-medium text-[var(--foreground)]">No membership records yet</p>
              <p className="text-xs text-gray-500 mt-1.5 max-w-sm mx-auto">
                When you subscribe or renew, entries will show here. Open the timeline for the full list.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {membershipHistory.subscriptions.slice(0, 10).map((s) => {
                const txn = membershipHistory.transactions.find(
                  (t) => String(t.subscription_id || "") === String(s.id || "")
                );
                return (
                  <div
                    key={String(s.id)}
                    className="rounded-xl border border-gray-100 p-3.5 sm:p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-sm text-[var(--foreground)]">
                        {String(s.plan_name_snapshot || "Plan")}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatMembershipDate(s.starts_at)} – {formatMembershipDate(s.expires_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 sm:text-right sm:justify-end">
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                        {String(s.status || "active")}
                      </span>
                      <span className="font-semibold text-[var(--foreground)]">
                        ₹{Number(txn?.amount || s.price_snapshot || 0).toLocaleString("en-IN")}
                      </span>
                      {txn && (
                        <span className="text-gray-500 w-full sm:w-auto sm:max-w-[200px] truncate">
                          {String(txn.payment_mode || "—")}
                        </span>
                      )}
                      {String((s as { notes?: string | null }).notes || "").trim() && (
                        <span
                          className="text-gray-500 w-full sm:w-auto sm:max-w-[320px] truncate"
                          title={String((s as { notes?: string | null }).notes || "")}
                        >
                          {String((s as { notes?: string | null }).notes || "")}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <div className="bg-white rounded-2xl shadow-sm p-3">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl text-red-600 font-medium hover:bg-red-50 transition"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      {deletionModalProfile && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="deletion-request-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 space-y-4">
            <div>
              <h2 id="deletion-request-title" className="text-lg font-semibold text-[var(--foreground)]">
                Request profile removal
              </h2>
              {deletionModalProfile.fullName && (
                <p className="text-xs text-gray-500 mt-0.5">Profile: {deletionModalProfile.fullName}</p>
              )}
              <p className="text-sm text-gray-600 mt-1">
                For member safety and accuracy, profile removal requests are handled by our support team. Please
                share the reason below.
              </p>
            </div>
            <div>
              <label htmlFor="deletion-reason" className="block text-sm font-medium text-gray-700 mb-1">
                Reason (required, min. 15 characters)
              </label>
              <textarea
                id="deletion-reason"
                rows={4}
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="e.g. Created by mistake, member found a match elsewhere, duplicate profile…"
                className="w-full rounded-xl border border-[var(--border)] bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/30 focus:border-[var(--primary)]"
              />
            </div>
            {deletionSubmitErr && <p className="text-sm text-red-600">{deletionSubmitErr}</p>}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <button
                type="button"
                disabled={deletionSubmitBusy}
                onClick={() => {
                  setDeletionModalProfile(null);
                  setDeletionReason("");
                  setDeletionSubmitErr("");
                }}
                className="px-4 py-2.5 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletionSubmitBusy || deletionReason.trim().length < 15}
                onClick={() => void submitDeletionRequest()}
                className="px-4 py-2.5 rounded-xl text-sm font-medium bg-[var(--primary)] text-white hover:opacity-95 disabled:opacity-50"
              >
                {deletionSubmitBusy ? "Sending…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(showRelPicker || editRelProfile) && (
        <RelationshipPickerModal
          mode={editRelProfile ? "edit" : "create"}
          currentValue={editRelProfile?.relationship}
          profileName={editRelProfile?.fullName}
          saving={savingRel}
          onClose={() => {
            setShowRelPicker(false);
            setEditRelProfile(null);
          }}
          onSelectCreate={() => setShowRelPicker(false)}
          onSelectEdit={handleSaveRelationshipEdit}
        />
      )}
    </div>
  );
}

function Row({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="py-2.5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-gray-500 shrink-0">{label}</span>
        <span className="font-medium text-[var(--foreground)] text-right break-all">{value}</span>
      </div>
      {sub && <p className="text-[11px] text-gray-500 mt-1 text-right">{sub}</p>}
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ProfileListSkeleton() {
  return (
    <div className="space-y-2.5">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 animate-pulse"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-gray-200 rounded w-2/3" />
            <div className="h-2.5 bg-gray-100 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyProfilesState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-8 px-4 rounded-xl bg-gradient-to-b from-[var(--primary)]/5 to-transparent border border-dashed border-[var(--primary)]/20">
      <div className="w-16 h-16 mx-auto rounded-full bg-white flex items-center justify-center shadow-sm mb-3">
        <UserPlus size={28} className="text-[var(--primary)]" />
      </div>
      <h3 className="font-semibold text-gray-900">No Profiles Found</h3>
      <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">
        You haven&apos;t created a detailed matrimonial profile yet. Add one for yourself
        or someone in your family to get started.
      </p>
      <button
        onClick={onCreate}
        className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold shadow-sm hover:bg-[var(--primary-hover)] transition"
      >
        <Plus size={18} />
        Create Full Profile
      </button>
    </div>
  );
}

function relationshipLabel(r?: Profile["relationship"]): string {
  if (!r) return "Profile";
  const map: Record<NonNullable<Profile["relationship"]>, string> = {
    self: "Self",
    son: "Son",
    daughter: "Daughter",
    brother: "Brother",
    sister: "Sister",
    other: "Dependent",
  };
  return map[r];
}

function calculateAge(dob?: string): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function DeletedProfileRow({ profile: p }: { profile: Profile }) {
  const age = calculateAge(p.dateOfBirth);
  const removedLabel = p.deletedAt
    ? new Date(p.deletedAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const memberId = getMemberIdDisplay(p);

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-gray-50/90">
      <div className="flex-shrink-0">
        {p.profilePhoto ? (
          <Image
            src={p.profilePhoto}
            alt={p.fullName || "Profile"}
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-xl object-cover grayscale opacity-80"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gray-200 flex items-center justify-center text-gray-400">
            <UserIcon size={22} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-600 truncate">{p.fullName || "Profile"}</span>
          {p.relationship && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-gray-200/80 text-gray-600">
              <Heart size={9} className="fill-gray-500" />
              {relationshipLabel(p.relationship)}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-gray-300/80 text-gray-700">
            Removed
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {age != null ? `${age} yrs · ` : null}
          ID {memberId} · Removed {removedLabel}
        </p>
        {p.deletedReason ? (
          <p className="text-[11px] text-gray-500 mt-1 line-clamp-2" title={p.deletedReason}>
            {p.deletedReason}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function ProfileRow({
  profile: p,
  deletionPending,
  onRequestDeletion,
  onEditRelationship,
}: {
  profile: Profile;
  deletionPending: boolean;
  onRequestDeletion: () => void;
  onEditRelationship: (profile: Profile) => void;
}) {
  const router = useRouter();
  const viewHref = `/profile/${getProfileSlug(p)}`;
  const editHref = `/profile/complete?profileId=${encodeURIComponent(p.id)}`;
  const age = calculateAge(p.dateOfBirth);
  const meta = [
    age != null ? `${age} yrs` : null,
    p.city,
    p.profession || p.qualification,
  ].filter(Boolean) as string[];
  const { percent: completionPct, isComplete } = computeProfileCompletion(p);
  const tone = completionTone(completionPct);
  const moderationStatus = p.moderationStatus || "approved";

  // The whole card is clickable and routes to the public profile page.
  // Internal action buttons stop the click and route to their own destinations.
  const handleCardClick = () => router.push(viewHref);
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleCardClick();
        }
      }}
      className="group cursor-pointer flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-[var(--primary)]/40 hover:bg-[var(--primary)]/[0.02] transition"
    >
      <div className="flex-shrink-0">
        {p.profilePhoto ? (
          <Image
            src={p.profilePhoto}
            alt={p.fullName || "Profile"}
            width={48}
            height={48}
            unoptimized
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5 flex items-center justify-center text-[var(--primary)]">
            <UserIcon size={22} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-[var(--foreground)] truncate">
            {p.fullName || "Untitled profile"}
          </span>
          {p.relationship && (
            // Clickable badge: tapping it opens the picker in EDIT mode so
            // the user can correct an accidental choice (e.g. Son ↔ Daughter).
            // We stop propagation so the card itself doesn't also navigate.
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEditRelationship(p);
              }}
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition cursor-pointer"
              title="Change who this profile is for"
              aria-label={`Change relationship. Currently: ${relationshipLabel(p.relationship)}`}
            >
              <Heart size={9} className="fill-[var(--primary)]" />
              {relationshipLabel(p.relationship)}
              <Pencil size={9} className="opacity-60" />
            </button>
          )}
          {p.profileStatus === "verified" && (
            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Verified
            </span>
          )}
          {isComplete && (
            <span
              className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700"
              title={`Profile is ${completionPct}% complete`}
            >
              <BadgeCheck size={10} />
              Complete
            </span>
          )}
          {moderationStatus === "pending_review" && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800">
              <Clock size={10} />
              Review pending
            </span>
          )}
          {moderationStatus === "rejected" && (
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">
              Needs changes
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5 flex items-center gap-2">
          {age != null && (
            <span className="inline-flex items-center gap-1">
              <Cake size={11} />
              {age} yrs
            </span>
          )}
          {p.city && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={11} />
              {p.city}
            </span>
          )}
          {(p.profession || p.qualification) && (
            <span className="inline-flex items-center gap-1 truncate">
              <Briefcase size={11} />
              {p.profession || p.qualification}
            </span>
          )}
          {meta.length === 0 && <span>Tap to add details</span>}
        </p>
        <div
          className="mt-2 flex items-center gap-2"
          title={`Profile ${completionPct}% complete`}
        >
          <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
            <div
              className={`h-full ${tone.bar} transition-all`}
              style={{ width: `${Math.max(4, completionPct)}%` }}
            />
          </div>
          <span className={`text-[10px] font-semibold tabular-nums ${
            isComplete
              ? "text-emerald-700"
              : completionPct >= 50
              ? "text-amber-700"
              : "text-red-600"
          }`}>
            {completionPct}%
          </span>
        </div>
      </div>
      <Link
        href={editHref}
        onClick={stop}
        className="p-2 rounded-lg text-gray-400 hover:text-[var(--primary)] hover:bg-white transition"
        aria-label="Edit profile"
        title="Edit profile"
      >
        <Pencil size={16} />
      </Link>
      {deletionPending ? (
        <span
          className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-100"
          title="Removal request is with our team"
        >
          <Clock size={14} className="shrink-0" />
          Pending review
        </span>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            stop(e);
            onRequestDeletion();
          }}
          className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
          aria-label="Request profile removal"
          title="Request removal (admin must approve)"
        >
          <Trash2 size={16} />
        </button>
      )}
      <span className="hidden sm:inline-flex p-1 rounded text-gray-300 group-hover:text-gray-500">
        <ChevronRight size={18} />
      </span>
    </div>
  );
}

/**
 * RelationshipPickerModal
 *
 * A centered modal used for two purposes:
 *   1. CREATE mode — picking who the new profile is for. Each option is a
 *      Link that navigates to /profile/complete?relationship=<value>.
 *   2. EDIT mode   — correcting a wrongly-set relationship on an existing
 *      profile. Options become buttons; the currently-selected option is
 *      highlighted. On click we call `onSelectEdit(value)` so the parent
 *      can persist the change via `updateProfileById`.
 *
 * Visual design intentionally differs from the old bottom-sheet:
 *   - Always centered, even on mobile, with a subtle fade/scale entrance.
 *   - Larger tiles with an icon, primary label, and contextual hint.
 *   - Close (X) button in the top-right corner.
 *   - Keyboard support: pressing Escape closes the modal.
 */
function RelationshipPickerModal({
  mode,
  currentValue,
  profileName,
  saving,
  onClose,
  onSelectCreate,
  onSelectEdit,
}: {
  mode: "create" | "edit";
  currentValue?: RelationshipValue;
  profileName?: string;
  saving: boolean;
  onClose: () => void;
  onSelectCreate: () => void;
  onSelectEdit: (rel: RelationshipValue) => void;
}) {
  // Close on Escape and lock body scroll while the modal is open so the
  // underlying page can't scroll behind the overlay on touch devices.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const heading = mode === "edit" ? "Change Who This Profile Is For" : "Create Full Profile";
  const subheading =
    mode === "edit"
      ? profileName
        ? `Pick the correct relationship for "${profileName}".`
        : "Pick the correct relationship for this profile."
      : "Who is this profile for?";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rel-picker-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-[fadeIn_120ms_ease-out]"
      onClick={onClose}
      style={{
        // Inline keyframes keep the entrance animation self-contained
        // without having to wire new global Tailwind keyframes.
        animation: "fadeIn 120ms ease-out",
      }}
    >
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
      `}</style>
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-5 sm:p-6"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "popIn 160ms ease-out" }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 p-2 rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition"
        >
          <XIcon size={18} />
        </button>

        <h3
          id="rel-picker-title"
          className="text-lg sm:text-xl font-semibold text-[var(--foreground)] pr-8"
        >
          {heading}
        </h3>
        <p className="text-sm text-gray-500 mt-1 mb-4">{subheading}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {RELATIONSHIP_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const isCurrent = mode === "edit" && currentValue === opt.value;
            const baseTile =
              "group relative flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border text-center transition focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40";
            const toneIdle =
              "border-gray-200 bg-white hover:border-[var(--primary)] hover:bg-[var(--primary)]/5";
            const toneCurrent =
              "border-[var(--primary)] bg-[var(--primary)]/10 ring-1 ring-[var(--primary)]/20";
            const className = `${baseTile} ${isCurrent ? toneCurrent : toneIdle}`;

            const body = (
              <>
                <span
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCurrent
                      ? "bg-[var(--primary)] text-white"
                      : "bg-[var(--primary)]/10 text-[var(--primary)] group-hover:bg-[var(--primary)]/20"
                  }`}
                >
                  <Icon size={22} />
                </span>
                <span className="text-sm font-semibold text-[var(--foreground)]">
                  {opt.label}
                </span>
                <span className="text-[11px] text-gray-500 leading-tight">
                  {opt.hint}
                </span>
                {isCurrent && (
                  <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[var(--primary)] text-white flex items-center justify-center">
                    <Check size={12} />
                  </span>
                )}
              </>
            );

            if (mode === "create") {
              return (
                <Link
                  key={opt.value}
                  href={`/profile/complete?relationship=${opt.value}`}
                  className={className}
                  onClick={onSelectCreate}
                >
                  {body}
                </Link>
              );
            }

            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => onSelectEdit(opt.value)}
                className={className}
                disabled={saving || isCurrent}
              >
                {body}
              </button>
            );
          })}
        </div>

        {mode === "edit" && (
          <p className="mt-4 text-xs text-gray-500">
            Changing the relationship will also update who manages this profile
            (parent/guardian/self) accordingly.
          </p>
        )}

        <button
          onClick={onClose}
          disabled={saving}
          className="w-full mt-5 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-60"
        >
          {saving ? "Saving..." : "Cancel"}
        </button>
      </div>
    </div>
  );
}

/**
 * Unfinished profile card on /account. Surfaces how far the user got
 * (step X of 7), which relationship it's for, and gives primary/secondary
 * actions to either resume or throw the draft away.
 *
 * We keep TOTAL_STEPS in sync with the wizard; the number itself is
 * cosmetic (X of 7). If the wizard gains/loses a step the percentage bar
 * simply looks slightly off until this constant is bumped — no data
 * corruption risk.
 */
const TOTAL_WIZARD_STEPS = 7;

function DraftRow({
  draft,
  onResume,
  onDiscard,
}: {
  draft: Profile;
  onResume: () => void;
  onDiscard: () => void;
}) {
  const currentStep = Math.min(
    Math.max(draft.draftCurrentStep ?? 1, 1),
    TOTAL_WIZARD_STEPS
  );
  const pct = Math.round((currentStep / TOTAL_WIZARD_STEPS) * 100);
  const relLabel = draft.relationship ? relationshipLabel(draft.relationship) : "Profile";
  const displayName = draft.fullName?.trim() || `${relLabel} (unnamed)`;

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 flex items-center gap-3">
      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
        <Pencil size={18} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-gray-900 truncate">{displayName}</span>
          <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-amber-200 text-amber-900">
            Draft
          </span>
          {draft.relationship && (
            <span className="text-[10px] uppercase tracking-wide font-semibold text-amber-800">
              For: {relLabel}
            </span>
          )}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-amber-100 overflow-hidden">
            <div
              className="h-full bg-amber-500"
              style={{ width: `${pct}%` }}
              aria-hidden="true"
            />
          </div>
          <span className="text-[11px] text-amber-800 font-medium whitespace-nowrap">
            Step {currentStep} of {TOTAL_WIZARD_STEPS}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button
          type="button"
          onClick={onResume}
          className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700 transition"
        >
          Resume
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="p-1.5 rounded-lg text-amber-800 hover:bg-amber-100 transition"
          aria-label="Discard draft"
          title="Discard draft"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}
