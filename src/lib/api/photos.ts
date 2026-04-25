import { createSupabaseClient, createSupabaseClientSafe } from "@/lib/supabase";
import type { ProfilePhoto } from "@/types";
async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createSupabaseClientSafe();
  if (!supabase) return {};
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Per-photo moderation API (Batch 5).
 *
 * Photos now live in their own `profile_photos` table (see
 * `supabase-moderation-schema.sql`) so each photo has its own status,
 * primary flag, and sort order. This module is the ONLY place the rest of
 * the app should talk to that table from — it also handles the row-shape
 * mapping between the DB (snake_case) and the `ProfilePhoto` type.
 */

// snake_case shape as returned by Supabase — kept local so we don't leak
// raw DB types into callers.
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

function fromRow(row: PhotoRow): ProfilePhoto {
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

/**
 * List all photos belonging to a profile, regardless of moderation state.
 * Intended for the profile owner and for admins. Public consumers should
 * use `listApprovedPhotosForProfile` instead (which relies on RLS to only
 * return rows where status='approved').
 */
export async function listPhotosForProfile(
  profileId: string
): Promise<{ data: ProfilePhoto[]; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("profile_id", profileId)
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: (data || []).map((r) => fromRow(r as PhotoRow)), error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to list photos" };
  }
}

/**
 * List only approved photos for a profile. Usable by the public / other
 * members. RLS ensures non-approved rows aren't returned even if status is
 * omitted from the filter, but we still filter explicitly for clarity.
 */
export async function listApprovedPhotosForProfile(
  profileId: string
): Promise<{ data: ProfilePhoto[]; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profile_photos")
      .select("*")
      .eq("profile_id", profileId)
      .eq("status", "approved")
      .order("is_primary", { ascending: false })
      .order("sort_order", { ascending: true });
    if (error) return { data: [], error: error.message };
    return { data: (data || []).map((r) => fromRow(r as PhotoRow)), error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to list photos" };
  }
}

/**
 * Insert a newly-uploaded photo. Upload to Supabase Storage happens
 * elsewhere (/api/upload-photo); this simply records the metadata row and
 * kicks off the moderation lifecycle with status='pending'.
 */
export async function createPhotoRecord(params: {
  profileId: string;
  url: string;
  storagePath?: string;
  sortOrder?: number;
  isPrimary?: boolean;
}): Promise<{ data: ProfilePhoto | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("profile_photos")
      .insert({
        profile_id: params.profileId,
        url: params.url,
        storage_path: params.storagePath ?? null,
        sort_order: params.sortOrder ?? 0,
        is_primary: Boolean(params.isPrimary),
        status: "pending",
      })
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: fromRow(data as PhotoRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create photo" };
  }
}

/**
 * Hard-delete a photo row. Per the product decision, photo deletion is
 * immediate and does NOT require admin approval — this also removes the
 * Storage object when a `storage_path` is known.
 */
export async function deletePhoto(
  photoId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    // Best-effort: look up storage path so we can also delete the file.
    const { data: row } = await supabase
      .from("profile_photos")
      .select("storage_path")
      .eq("id", photoId)
      .maybeSingle();

    const { error } = await supabase
      .from("profile_photos")
      .delete()
      .eq("id", photoId);
    if (error) return { error: error.message };

    // Remove the backing storage object if we recorded one. Failures here
    // are logged but non-fatal — the DB row is already gone so the photo
    // is effectively deleted from the user's POV.
    const storagePath = (row as { storage_path?: string | null } | null)?.storage_path;
    if (storagePath) {
      const { error: rmError } = await supabase.storage
        .from("profile-photos")
        .remove([storagePath]);
      if (rmError) {
        console.warn("[photos.deletePhoto] storage remove failed:", rmError);
      }
    }
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete photo" };
  }
}

/**
 * Convenience: delete the profile_photos row that matches a given URL.
 *
 * The rest of the app still tracks photos primarily as URL strings on
 * `profile.photos[]`. When the user removes one from that array, we also
 * need to clean up the mirror row in `profile_photos` (and its backing
 * storage object) — but the caller typically doesn't know the row's id.
 * This helper does the lookup → delete in one call.
 *
 * Failures here are not critical to the user: the URL has already been
 * dropped from their `profile.photos` array so the photo no longer
 * appears anywhere public. Worst case we leave an orphan row that the
 * admin queue will not show (because the url no longer resolves to a
 * live profile entry).
 */
export async function deletePhotoByUrl(
  profileId: string,
  url: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { data: rows, error: lookupError } = await supabase
      .from("profile_photos")
      .select("id")
      .eq("profile_id", profileId)
      .eq("url", url)
      .limit(1);
    if (lookupError) return { error: lookupError.message };
    const row = (rows ?? [])[0] as { id?: string } | undefined;
    if (!row?.id) return { error: null }; // nothing to clean up
    return await deletePhoto(row.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete photo" };
  }
}

/**
 * Promote a photo to primary for its profile. Clears the flag on any
 * existing primary first so the DB's partial unique index is respected.
 * Both operations happen in sequence; on failure we surface the error so
 * callers can retry.
 */
export async function setPrimaryPhoto(
  photoId: string,
  profileId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    // 1. Demote any existing primaries for this profile.
    const { error: demoteError } = await supabase
      .from("profile_photos")
      .update({ is_primary: false })
      .eq("profile_id", profileId)
      .eq("is_primary", true);
    if (demoteError) return { error: demoteError.message };
    // 2. Promote the requested photo.
    const { error: promoteError } = await supabase
      .from("profile_photos")
      .update({ is_primary: true })
      .eq("id", photoId);
    if (promoteError) return { error: promoteError.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to set primary" };
  }
}

/**
 * Admin-only: approve a pending photo. Callers must ensure the current
 * user has admin role (RLS does not currently enforce this on updates —
 * tighten via a service-role API route if exposing this beyond trusted
 * internal tooling).
 */
export async function approvePhoto(
  photoId: string,
  reviewerId: string
): Promise<{ error: string | null }> {
  try {
    void reviewerId;
    const headers = await getAuthHeader();
    const res = await fetch("/api/superadmin/moderation/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ photoId, action: "approve" }),
    });
    const json = (await res.json()) as { error?: string };
    return { error: res.ok ? null : json.error || "Failed to approve" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to approve" };
  }
}

/**
 * Admin-only: reject a pending photo with an optional reason surfaced
 * back to the owner. Rejected photos remain in the DB but are hidden from
 * public listings via the RLS policy.
 */
export async function rejectPhoto(
  photoId: string,
  reviewerId: string,
  reason?: string
): Promise<{ error: string | null }> {
  try {
    void reviewerId;
    const headers = await getAuthHeader();
    const res = await fetch("/api/superadmin/moderation/photo", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ photoId, action: "reject", reason }),
    });
    const json = (await res.json()) as { error?: string };
    return { error: res.ok ? null : json.error || "Failed to reject" };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to reject" };
  }
}
