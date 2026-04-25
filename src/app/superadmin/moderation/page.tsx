"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Check,
  X as XIcon,
  Clock,
  RefreshCw,
  ExternalLink,
  Star,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { adminFetch } from "@/lib/api/adminClient";
import { ProfileTransferModal } from "@/components/admin/ProfileTransferModal";
import {
  listPendingProfiles,
  listPendingPhotos,
  approveProfile,
  rejectProfile,
  getModerationCounts,
} from "@/lib/api/moderation";
import { approvePhoto, rejectPhoto } from "@/lib/api/photos";
import { getProfileSlug } from "@/lib/memberId";
import { profileFromSnapshot } from "@/lib/api/profiles";
import type { Profile, ProfilePhoto } from "@/types";

// -----------------------------------------------------------------------------
// Pure helpers
// -----------------------------------------------------------------------------

/**
 * Human-readable timestamp — admins scan this queue quickly so a compact
 * "2 hours ago" style is more useful than a full ISO string.
 */
function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diff = Date.now() - then;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

/**
 * Which fields changed between the previous approved snapshot and the
 * current (pending) row. Keeps the queue surface scannable — admins can
 * see the 3-4 fields that actually changed rather than a full diff.
 */
type FieldDiff = { label: string; before?: string; after?: string };
function computeProfileDiff(current: Profile, prev: Profile | null): FieldDiff[] {
  if (!prev) return [];
  const fields: Array<[keyof Profile, string]> = [
    ["fullName", "Full Name"],
    ["dateOfBirth", "Date of Birth"],
    ["gender", "Gender"],
    ["maritalStatus", "Marital Status"],
    ["height", "Height"],
    ["caste", "Caste"],
    ["subCaste", "Sub-caste"],
    ["motherTongue", "Mother Tongue"],
    ["qualification", "Qualification"],
    ["profession", "Profession"],
    ["companyName", "Company"],
    ["annualIncome", "Annual Income"],
    ["city", "City"],
    ["state", "State"],
    ["country", "Country"],
    ["aboutMe", "About Me"],
    ["fatherName", "Father's Name"],
    ["motherName", "Mother's Name"],
    ["siblingDetails", "Siblings"],
    ["foodHabits", "Food Habits"],
  ];
  const diffs: FieldDiff[] = [];
  for (const [key, label] of fields) {
    const a = (current[key] ?? "") as string;
    const b = (prev[key] ?? "") as string;
    if (String(a).trim() !== String(b).trim()) {
      diffs.push({ label, before: String(b), after: String(a) });
    }
  }
  return diffs;
}

// -----------------------------------------------------------------------------
// Page
// -----------------------------------------------------------------------------

type Tab = "profiles" | "photos";

export default function ModerationQueuePage() {
  const { authUser } = useAuth();
  const [tab, setTab] = useState<Tab>("profiles");
  const [pendingProfiles, setPendingProfiles] = useState<Profile[]>([]);
  const [pendingPhotos, setPendingPhotos] = useState<ProfilePhoto[]>([]);
  const [counts, setCounts] = useState({
    pendingProfiles: 0,
    pendingPhotos: 0,
    rejectedProfiles: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reviewerId = authUser?.id ?? "";

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const [profilesRes, photosRes, countsRes] = await Promise.all([
      listPendingProfiles(),
      listPendingPhotos(),
      getModerationCounts(),
    ]);
    if (profilesRes.error) setError(profilesRes.error);
    else setPendingProfiles(profilesRes.data);
    if (photosRes.data) setPendingPhotos(photosRes.data);
    if (countsRes.data) setCounts(countsRes.data);
    setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Moderation Queue</h1>
          <p className="text-gray-500 mt-1">
            Review and approve pending profile changes and photo uploads.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
        <SummaryTile
          label="Profiles awaiting review"
          value={counts.pendingProfiles}
          tone="amber"
        />
        <SummaryTile
          label="Photos awaiting review"
          value={counts.pendingPhotos}
          tone="blue"
        />
        <SummaryTile
          label="Recently rejected"
          value={counts.rejectedProfiles}
          tone="red"
        />
      </div>

      {/* Tabs */}
      <div className="mt-6 flex items-center gap-2 border-b border-gray-200">
        <TabButton active={tab === "profiles"} onClick={() => setTab("profiles")}>
          Profiles <Count>{counts.pendingProfiles}</Count>
        </TabButton>
        <TabButton active={tab === "photos"} onClick={() => setTab("photos")}>
          Photos <Count>{counts.pendingPhotos}</Count>
        </TabButton>
      </div>

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="mt-6 bg-white rounded-xl shadow-sm p-8 text-center text-gray-500">
          Loading queue…
        </div>
      ) : tab === "profiles" ? (
        <ProfilesQueue
          profiles={pendingProfiles}
          reviewerId={reviewerId}
          onChanged={refresh}
        />
      ) : (
        <PhotosQueue
          photos={pendingPhotos}
          reviewerId={reviewerId}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Summary tile + tab
// -----------------------------------------------------------------------------

function SummaryTile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "amber" | "blue" | "red";
}) {
  const toneClasses: Record<string, string> = {
    amber: "bg-amber-50 text-amber-800 border-amber-200",
    blue: "bg-blue-50 text-blue-800 border-blue-200",
    red: "bg-red-50 text-red-800 border-red-200",
  };
  return (
    <div
      className={`rounded-xl border p-4 ${toneClasses[tone]}`}
      role="status"
      aria-label={`${value} ${label}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
        {label}
      </p>
      <p className="text-3xl font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 -mb-px border-b-2 text-sm font-medium transition ${
        active
          ? "border-[var(--primary)] text-[var(--primary)]"
          : "border-transparent text-gray-500 hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: React.ReactNode }) {
  return (
    <span className="ml-1.5 inline-flex items-center justify-center min-w-[22px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-semibold tabular-nums">
      {children}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Profiles queue
// -----------------------------------------------------------------------------

function ProfilesQueue({
  profiles,
  reviewerId,
  onChanged,
}: {
  profiles: Profile[];
  reviewerId: string;
  onChanged: () => void;
}) {
  if (profiles.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-sm p-8 text-center">
        <Check size={32} className="mx-auto text-emerald-500" />
        <h2 className="mt-3 text-lg font-semibold text-gray-900">All caught up</h2>
        <p className="mt-1 text-sm text-gray-500">
          No profiles are currently pending review.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 space-y-4">
      {profiles.map((p) => (
        <PendingProfileCard
          key={p.id}
          profile={p}
          reviewerId={reviewerId}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function PendingProfileCard({
  profile,
  reviewerId,
  onChanged,
}: {
  profile: Profile;
  reviewerId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | "transfer" | null>(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  // Compute a compact diff when there's a previously-approved snapshot.
  // For brand-new profiles (no snapshot), diff is empty and we render the
  // full current profile instead.
  const prevProfile = useMemo(
    () => profileFromSnapshot(profile.approvedSnapshot),
    [profile.approvedSnapshot]
  );
  const diffs = useMemo(
    () => computeProfileDiff(profile, prevProfile),
    [profile, prevProfile]
  );
  const isFirstSubmission = !prevProfile;

  const handleApprove = async () => {
    setBusy("approve");
    setLocalError(null);
    const { error } = await approveProfile(profile.id, reviewerId);
    setBusy(null);
    if (error) {
      setLocalError(error);
      return;
    }
    onChanged();
  };

  const handleReject = async () => {
    if (!reason.trim()) {
      setLocalError("Please provide a reason so the member knows what to fix.");
      return;
    }
    setBusy("reject");
    setLocalError(null);
    const { error } = await rejectProfile(profile.id, reviewerId, reason.trim());
    setBusy(null);
    if (error) {
      setLocalError(error);
      return;
    }
    setRejectMode(false);
    setReason("");
    onChanged();
  };

  const viewHref = `/profile/${getProfileSlug(profile)}?preview=admin`;
  const memberId = profile.publicId || profile.memberId || profile.id;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {profile.profilePhoto ? (
            <Image
              src={profile.profilePhoto}
              alt={profile.fullName}
              width={48}
              height={48}
              unoptimized
              className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--primary)]/5 flex items-center justify-center text-[var(--primary)] font-semibold">
              {(profile.fullName || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 truncate">
              {profile.fullName || "(unnamed profile)"}
            </p>
            <p className="text-xs text-gray-500 flex items-center gap-2 mt-0.5 flex-wrap">
              <span>{memberId}</span>
              <span>•</span>
              <span>{profile.city || "—"}</span>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock size={11} />
                submitted {relativeTime(profile.lastSubmittedAt)}
              </span>
              {isFirstSubmission && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 font-semibold text-[10px] uppercase">
                  First submission
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={viewHref}
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-sm font-medium text-gray-700 border border-gray-200"
          >
            <ExternalLink size={14} />
            Open profile
          </Link>
          <Link
            href={`/superadmin/users/${profile.id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/15 text-sm font-medium text-[var(--primary)] border border-[var(--primary)]/20"
          >
            Edit
          </Link>
          <button
            type="button"
            onClick={() => setTransferOpen(true)}
            disabled={busy !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-sm font-medium text-indigo-700 border border-indigo-200 disabled:opacity-60"
          >
            Transfer
          </button>
        </div>
      </div>

      {/* Body: either diff or full-profile snapshot for first-time submissions */}
      <div className="p-4">
        {isFirstSubmission ? (
          <FullProfilePreview profile={profile} />
        ) : diffs.length === 0 ? (
          <p className="text-sm text-gray-500">
            The submission is identical to the last-approved version. You can
            approve to refresh the approval timestamp, or reject to request
            further changes.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Changes requested ({diffs.length})
            </p>
            <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
              {diffs.map((d) => (
                <div key={d.label} className="grid grid-cols-12 gap-2 p-2.5 text-sm">
                  <div className="col-span-12 sm:col-span-3 font-medium text-gray-700">
                    {d.label}
                  </div>
                  <div className="col-span-12 sm:col-span-4 text-gray-400 line-through break-words">
                    {d.before || <em className="not-italic opacity-60">(empty)</em>}
                  </div>
                  <div className="col-span-12 sm:col-span-5 text-gray-900 break-words">
                    {d.after || <em className="italic opacity-60">(empty)</em>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="p-4 border-t border-gray-100 bg-gray-50">
        {localError && (
          <p className="mb-3 text-sm text-red-600">{localError}</p>
        )}
        {rejectMode ? (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
              Rejection reason (shown to the member)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Profile photo is unclear. Please upload a front-facing photo."
              className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/40"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleReject}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                <XIcon size={14} />
                Confirm reject
              </button>
              <button
                onClick={() => {
                  setRejectMode(false);
                  setReason("");
                  setLocalError(null);
                }}
                disabled={busy !== null}
                className="px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleApprove}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60"
            >
              <Check size={14} />
              {busy === "approve" ? "Approving…" : "Approve"}
            </button>
            <button
              onClick={() => setRejectMode(true)}
              disabled={busy !== null}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-red-300 text-red-700 text-sm font-medium hover:bg-red-50"
            >
              <XIcon size={14} />
              Reject…
            </button>
          </div>
        )}
      </div>
      <ProfileTransferModal
        open={transferOpen}
        profileId={profile.id}
        note="Transferred from moderation queue"
        onClose={() => setTransferOpen(false)}
        onTransferred={onChanged}
      />
    </div>
  );
}

/**
 * Compact snapshot of the core fields — used when there's no prior
 * approved version to diff against.
 */
function FullProfilePreview({ profile }: { profile: Profile }) {
  const rows: Array<[string, string | undefined]> = [
    ["Full Name", profile.fullName],
    ["DoB", profile.dateOfBirth],
    ["Gender", profile.gender],
    ["Marital Status", profile.maritalStatus],
    ["Height", profile.height],
    ["Caste / Sub-caste", [profile.caste, profile.subCaste].filter(Boolean).join(" / ")],
    ["Qualification", profile.qualification],
    ["Profession", [profile.profession, profile.companyName].filter(Boolean).join(" @ ")],
    ["Income", profile.annualIncome],
    ["Location", [profile.city, profile.state, profile.country].filter(Boolean).join(", ")],
    ["Father", profile.fatherName],
    ["Mother", profile.motherName],
    ["Food", profile.foodHabits],
  ];
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2 py-1">
          <span className="text-gray-500 w-32 flex-shrink-0">{k}</span>
          <span className="text-gray-900 font-medium break-words">{v || "—"}</span>
        </div>
      ))}
      {profile.aboutMe && (
        <div className="col-span-1 sm:col-span-2 mt-1">
          <span className="text-gray-500 text-xs">About</span>
          <p className="text-gray-800 text-sm mt-1 whitespace-pre-wrap">
            {profile.aboutMe}
          </p>
        </div>
      )}
    </div>
  );
}

// -----------------------------------------------------------------------------
// Photos queue
// -----------------------------------------------------------------------------

function PhotosQueue({
  photos,
  reviewerId,
  onChanged,
}: {
  photos: ProfilePhoto[];
  reviewerId: string;
  onChanged: () => void;
}) {
  if (photos.length === 0) {
    return (
      <div className="mt-6 bg-white rounded-xl shadow-sm p-8 text-center">
        <Check size={32} className="mx-auto text-emerald-500" />
        <h2 className="mt-3 text-lg font-semibold text-gray-900">All caught up</h2>
        <p className="mt-1 text-sm text-gray-500">No photos are currently pending review.</p>
      </div>
    );
  }
  return (
    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {photos.map((p) => (
        <PendingPhotoCard
          key={p.id}
          photo={p}
          reviewerId={reviewerId}
          onChanged={onChanged}
        />
      ))}
    </div>
  );
}

function PendingPhotoCard({
  photo,
  reviewerId,
  onChanged,
}: {
  photo: ProfilePhoto;
  reviewerId: string;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<"approve" | "reject" | null>(null);
  const [reason, setReason] = useState("");
  const [rejectMode, setRejectMode] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleApprove = async () => {
    setBusy("approve");
    setErr(null);
    const { error } = await approvePhoto(photo.id, reviewerId);
    setBusy(null);
    if (error) setErr(error);
    else onChanged();
  };

  const handleReject = async () => {
    setBusy("reject");
    setErr(null);
    const { error } = await rejectPhoto(photo.id, reviewerId, reason.trim() || undefined);
    setBusy(null);
    if (error) {
      setErr(error);
      return;
    }
    setRejectMode(false);
    setReason("");
    onChanged();
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={photo.url}
          alt={`Pending photo`}
          fill
          unoptimized
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {photo.isPrimary && (
          <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full bg-[var(--primary)] text-white shadow">
            <Star size={11} />
            Primary
          </span>
        )}
      </div>
      <div className="p-2 text-xs text-gray-500">
        <p>Profile: {photo.profileId.slice(0, 8)}…</p>
        <p>Uploaded {relativeTime(photo.uploadedAt)}</p>
      </div>
      {err && <p className="px-2 text-xs text-red-600">{err}</p>}
      {rejectMode ? (
        <div className="p-2 border-t border-gray-100 space-y-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="Optional reason"
            className="w-full px-2 py-1 text-xs rounded border border-gray-200 focus:outline-none focus:ring-1 focus:ring-[var(--primary)]/40"
          />
          <div className="flex gap-1">
            <button
              onClick={handleReject}
              disabled={busy !== null}
              className="flex-1 px-2 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-60"
            >
              Confirm
            </button>
            <button
              onClick={() => {
                setRejectMode(false);
                setReason("");
              }}
              className="flex-1 px-2 py-1.5 rounded text-xs font-medium text-gray-700 hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-gray-100 flex gap-1">
          <button
            onClick={handleApprove}
            disabled={busy !== null}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-60"
          >
            <Check size={12} />
            {busy === "approve" ? "…" : "Approve"}
          </button>
          <button
            onClick={() => setRejectMode(true)}
            disabled={busy !== null}
            className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded bg-white border border-red-300 text-red-700 text-xs font-medium hover:bg-red-50"
          >
            <XIcon size={12} />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
