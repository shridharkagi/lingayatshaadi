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
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input";
import {
  listProfilesByUserId,
  deleteProfileById,
  updateProfileById,
} from "@/lib/api/profiles";
import { deleteDraft } from "@/lib/api/drafts";
import { getProfileSlug } from "@/lib/memberId";
import type { Profile } from "@/types";
import {
  computeProfileCompletion,
  completionTone,
} from "@/lib/profileCompletion";
import { BrideIcon, GroomIcon } from "@/components/ui/icons/BrideGroomIcons";

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

export default function AccountPage() {
  const router = useRouter();
  const { authUser, accountMeta, isLoggedIn, loading, logout, updateAccountMeta } = useAuth();

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

  const refreshProfiles = useCallback(async () => {
    if (!authUser) return;
    setLoadingProfiles(true);
    const { data } = await listProfilesByUserId(authUser.id);
    setProfiles(data);
    setLoadingProfiles(false);
  }, [authUser]);

  // Split server-returned profiles into (a) abandoned drafts to resume
  // and (b) profiles the user has actually submitted. A profile is a
  // draft iff its moderation_status is exactly "draft"; any other status
  // (pending_review, approved, rejected) is "real". We memoise so we
  // don't rebuild these arrays on every render.
  const { drafts, submittedProfiles } = useMemo(() => {
    const d: Profile[] = [];
    const s: Profile[] = [];
    for (const p of profiles) {
      if (p.moderationStatus === "draft") d.push(p);
      else s.push(p);
    }
    return { drafts: d, submittedProfiles: s };
  }, [profiles]);

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
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshProfiles();
    }
  }, [authUser, refreshProfiles]);

  const startEditing = () => {
    setMetaForm({
      firstName: accountMeta?.firstName || "",
      lastName: accountMeta?.lastName || "",
      city: accountMeta?.city || "",
      gender: accountMeta?.gender || "",
      dateOfBirth: accountMeta?.dateOfBirth || "",
    });
    setMetaError("");
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

  const handleDelete = async (profile: Profile) => {
    if (!confirm(`Delete profile "${profile.fullName}"? This cannot be undone.`)) return;
    const { error } = await deleteProfileById(profile.id);
    if (error) {
      alert(`Failed to delete: ${error}`);
      return;
    }
    refreshProfiles();
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

  return (
    <div className="max-w-2xl mx-auto pb-10 space-y-4">
      <header className="bg-[var(--primary)] text-white px-6 py-4 rounded-2xl shadow-sm flex items-center justify-between">
        <h1 className="text-xl font-bold">My Account</h1>
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
            <dl className="divide-y divide-gray-100 text-sm">
              <Row label="Full Name" value={accountMeta?.fullName || "—"} />
              <Row label="Gender" value={accountMeta?.gender ? capitalize(accountMeta.gender) : "—"} />
              <Row label="City" value={accountMeta?.city || "—"} />
              <Row label="Phone" value={accountMeta?.phone || "—"} />
              <Row label="Date of Birth" value={accountMeta?.dateOfBirth || "—"} />
            </dl>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
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
                {!loadingProfiles && profiles.length > 0 && (
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                    {profiles.length}
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
                      onDelete={() => handleDelete(p)}
                      onEditRelationship={setEditRelProfile}
                    />
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowRelPicker(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--primary)]/30 text-[var(--primary)] font-medium hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/60 transition"
              >
                <Plus size={18} />
                {submittedProfiles.length === 0
                  ? "Create Full Profile"
                  : "Create Another Profile"}
              </button>
            </>
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-[var(--foreground)] text-right">{value}</span>
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

function ProfileRow({
  profile: p,
  onDelete,
  onEditRelationship,
}: {
  profile: Profile;
  onDelete: () => void;
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
      <button
        onClick={(e) => {
          stop(e);
          onDelete();
        }}
        className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
        aria-label="Delete profile"
        title="Delete profile"
      >
        <Trash2 size={16} />
      </button>
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
