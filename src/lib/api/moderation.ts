import { createSupabaseClient, createSupabaseClientSafe } from "@/lib/supabase";
import { fromProfileRow, type ProfileRow } from "@/lib/profileMapper";
import type { Profile, ProfilePhoto } from "@/types";

/**
 * Admin-only moderation API (Batch 5B).
 *
 * These calls assume the signed-in user is a superadmin — the UI gates
 * access at the page level. For hardening we'd also add a server-side
 * role-check API route, but until then this module is only imported from
 * admin screens.
 *
 * NOTE: we intentionally talk to the same `profiles` table the rest of
 * the app uses. The approval action copies the current row into
 * `approved_snapshot` and flips `moderation_status = 'approved'` so that
 * public surfaces (see `profileForPublic` in `src/lib/api/profiles.ts`)
 * start rendering the freshly-approved content immediately.
 */

/** Raw photo row shape reused from the photos module. */
type PhotoRow = {
  id: string;
  profile_id: string;
  url: string;
  storage_path: string | null;
  is_primary: boolean;
  status: "pending" | "approved" | "rejected";
  rejection_reason: string | null;
  sort_order: number;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
};

function photoFromRow(row: PhotoRow): ProfilePhoto {
  return {
    id: row.id,
    profileId: row.profile_id,
    url: row.url,
    storagePath: row.storage_path ?? undefined,
    isPrimary: Boolean(row.is_primary),
    status: row.status,
    rejectionReason: row.rejection_reason ?? undefined,
    sortOrder: row.sort_order,
    uploadedAt: row.uploaded_at,
    reviewedAt: row.reviewed_at ?? undefined,
    reviewedBy: row.reviewed_by ?? undefined,
    createdAt: row.created_at,
  };
}

// ---------------------------------------------------------------------------
// Pending queue listing
// ---------------------------------------------------------------------------

/**
 * Every profile currently waiting on admin review, newest submission first.
 * Each profile is returned WITH its approved_snapshot attached (so the UI
 * can diff pending vs live). The Profile type already carries
 * `approvedSnapshot` for this purpose.
 */
export async function listPendingProfiles(): Promise<{
  data: Profile[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("moderation_status", "pending_review")
      .order("last_submitted_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => fromProfileRow(r as ProfileRow)),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to list pending profiles",
    };
  }
}

/** Pending photos across all profiles. Oldest-first so we work FIFO. */
export async function listPendingPhotos(): Promise<{
  data: ProfilePhoto[];
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("status", "pending")
      .order("uploaded_at", { ascending: true });
    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => photoFromRow(r as PhotoRow)),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to list pending photos",
    };
  }
}

/** Counts for the admin dashboard tiles. */
export async function getModerationCounts(): Promise<{
  data: { pendingProfiles: number; pendingPhotos: number; rejectedProfiles: number };
  error: string | null;
}> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) {
      return {
        data: { pendingProfiles: 0, pendingPhotos: 0, rejectedProfiles: 0 },
        error: "Supabase not configured",
      };
    }
    const [pp, ph, rp] = await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "pending_review"),
      supabase
        .from("profile_photos")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "rejected"),
    ]);
    return {
      data: {
        pendingProfiles: pp.count ?? 0,
        pendingPhotos: ph.count ?? 0,
        rejectedProfiles: rp.count ?? 0,
      },
      error: pp.error?.message || ph.error?.message || rp.error?.message || null,
    };
  } catch (err) {
    return {
      data: { pendingProfiles: 0, pendingPhotos: 0, rejectedProfiles: 0 },
      error: err instanceof Error ? err.message : "Failed to load counts",
    };
  }
}

// ---------------------------------------------------------------------------
// Profile approve / reject
// ---------------------------------------------------------------------------

/**
 * Approve a profile: freeze its current row into `approved_snapshot`, mark
 * status as `approved`, and stamp the reviewer + timestamp. The public
 * feed immediately starts rendering the new content.
 *
 * We fetch the row first so we can build the snapshot client-side rather
 * than relying on a DB trigger — this keeps the schema simple and the
 * update atomic from the app's perspective (one UPDATE).
 */
export async function approveProfile(
  profileId: string,
  reviewerId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { data: row, error: fetchError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .maybeSingle();
    if (fetchError) return { error: fetchError.message };
    if (!row) return { error: "Profile not found" };

    // Strip fields that should NOT live inside the snapshot itself — the
    // approval-metadata and the snapshot column. Everything else (the
    // actual profile content) goes in so public reads see the exact
    // moment-in-time body that was approved.
    const snapshot = { ...(row as Record<string, unknown>) };
    delete snapshot.approved_snapshot;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        moderation_status: "approved",
        approved_snapshot: snapshot,
        approved_at: new Date().toISOString(),
        rejection_reason: null,
        reviewed_by: reviewerId,
      })
      .eq("id", profileId);
    if (updateError) return { error: updateError.message };

    // Cascade: any `pending` photos attached to this profile are approved
    // along with the profile itself — a profile approval implicitly covers
    // everything it contains. Admins can still review / revoke individual
    // photos later from the photos tab. Failures here are logged but
    // non-fatal so the profile approval isn't silently reverted.
    const { error: photosError } = await supabase
      .from("profile_photos")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: reviewerId,
      })
      .eq("profile_id", profileId)
      .eq("status", "pending");
    if (photosError) {
      console.warn(
        "[moderation.approveProfile] profile approved but photo cascade failed:",
        photosError
      );
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve profile" };
  }
}

/**
 * Reject a profile. The approved_snapshot (if any) stays intact so the
 * public continues to see the last-approved version. The owner sees the
 * rejection reason on their edit / profile page.
 */
export async function rejectProfile(
  profileId: string,
  reviewerId: string,
  reason: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        moderation_status: "rejected",
        rejection_reason: reason || null,
        reviewed_by: reviewerId,
      })
      .eq("id", profileId);
    return { error: error?.message ?? null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reject profile" };
  }
}
