"use client";

import { useCallback, useEffect, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/Input";
import { listProfilesByUserId, deleteProfileById } from "@/lib/api/profiles";
import { getProfileSlug } from "@/lib/memberId";
import type { Profile } from "@/types";

const RELATIONSHIP_OPTIONS: { value: NonNullable<Profile["relationship"]>; label: string }[] = [
  { value: "self", label: "Self" },
  { value: "son", label: "Son" },
  { value: "daughter", label: "Daughter" },
  { value: "brother", label: "Brother" },
  { value: "sister", label: "Sister" },
  { value: "other", label: "Other Dependent" },
];

export default function AccountPage() {
  const router = useRouter();
  const { authUser, accountMeta, isLoggedIn, loading, logout, updateAccountMeta } = useAuth();

  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [showRelPicker, setShowRelPicker] = useState(false);
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

  if (loading || !authUser) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <header className="bg-[var(--primary)] text-white px-6 py-4 rounded-b-[10px] shadow-md flex items-center justify-between">
        <h1 className="text-xl font-bold">My Account</h1>
        <Link
          href="/settings"
          className="p-2.5 rounded-full bg-white/20 hover:bg-white/30 transition"
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </Link>
      </header>

      <div className="px-4 mt-4 space-y-4">
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
              <div className="space-y-2.5">
                {profiles.map((p) => (
                  <ProfileRow key={p.id} profile={p} onDelete={() => handleDelete(p)} />
                ))}
              </div>
              <button
                onClick={() => setShowRelPicker(true)}
                className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-[var(--primary)]/30 text-[var(--primary)] font-medium hover:bg-[var(--primary)]/5 hover:border-[var(--primary)]/60 transition"
              >
                <Plus size={18} />
                Create Another Profile
              </button>
            </>
          )}
        </section>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-white rounded-2xl shadow-sm text-red-600 font-medium hover:bg-red-50 transition"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>

      {showRelPicker && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-4"
          onClick={() => setShowRelPicker(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-1">Create Full Profile</h3>
            <p className="text-sm text-gray-500 mb-4">Who is this profile for?</p>
            <div className="grid grid-cols-2 gap-2">
              {RELATIONSHIP_OPTIONS.map((opt) => (
                <Link
                  key={opt.value}
                  href={`/profile/complete?relationship=${opt.value}`}
                  className="p-3 rounded-xl border border-gray-200 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 text-center font-medium text-[var(--foreground)] transition"
                  onClick={() => setShowRelPicker(false)}
                >
                  {opt.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => setShowRelPicker(false)}
              className="w-full mt-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition"
            >
              Cancel
            </button>
          </div>
        </div>
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

function ProfileRow({ profile: p, onDelete }: { profile: Profile; onDelete: () => void }) {
  const router = useRouter();
  const viewHref = `/profile/${getProfileSlug(p)}`;
  const editHref = `/profile/complete?profileId=${encodeURIComponent(p.id)}`;
  const age = calculateAge(p.dateOfBirth);
  const meta = [
    age != null ? `${age} yrs` : null,
    p.city,
    p.profession || p.qualification,
  ].filter(Boolean) as string[];

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
            <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-[var(--primary)]/10 text-[var(--primary)]">
              <Heart size={9} className="fill-[var(--primary)]" />
              {relationshipLabel(p.relationship)}
            </span>
          )}
          {p.profileStatus === "verified" && (
            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-green-100 text-green-700">
              Verified
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
