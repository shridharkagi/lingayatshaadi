import { createSupabaseClient, createSupabaseClientSafe } from "@/lib/supabase";
import { toProfileRow, fromProfileRow, type ProfileRow } from "@/lib/profileMapper";
import type { Profile } from "@/types";
import { MAX_ACTIVE_OR_PENDING_PROFILES } from "@/lib/accessPolicy";

/**
 * Cross-device profile autosave (Batch 6).
 *
 * A "draft" is just a row in the normal `profiles` table with
 * `moderation_status = 'draft'`. Storing drafts in the main table (rather
 * than a side cache or localStorage) means:
 *
 *   • They follow the user across devices — signing in on a phone
 *     resumes where the laptop left off.
 *   • The final "Save" action is a status flip (draft → pending_review),
 *     not a copy — no data has to migrate anywhere.
 *   • The existing RLS policies already gate access to the owner.
 *
 * Each `user_id + relationship` pair has at most ONE draft. If the user
 * starts a Son profile, hops away, and later clicks "Create → Son" again,
 * we resume the same draft instead of creating another row.
 */

const DRAFT_STATUS = "draft" as const;

/**
 * Look up an existing draft for this user + relationship. Returns `null`
 * when there's nothing to resume. When `relationship` is undefined we
 * match any draft the user owns (used by the "oops, you have a draft"
 * banner on /account).
 */
export async function findDraftForUser(
  userId: string,
  relationship?: NonNullable<Profile["relationship"]>
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };

    let query = supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("moderation_status", DRAFT_STATUS)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (relationship) query = query.eq("relationship", relationship);

    const { data, error } = await query.maybeSingle();
    if (error) return { data: null, error: error.message };
    return { data: data ? fromProfileRow(data as ProfileRow) : null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to look up draft",
    };
  }
}

/** List every draft owned by a user, newest-first. */
export async function listDraftsForUser(
  userId: string
): Promise<{ data: Profile[]; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .eq("moderation_status", DRAFT_STATUS)
      .order("updated_at", { ascending: false });
    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => fromProfileRow(r as ProfileRow)),
      error: null,
    };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to list drafts",
    };
  }
}

/**
 * Create a brand-new draft row. The caller is expected to have first
 * checked that no existing draft exists for this user+relationship
 * (via `findDraftForUser`); if one does exist, use `updateDraft` instead.
 * Returns the draft's database id so the wizard can put it in the URL.
 */
export async function createDraft(
  userId: string,
  partial: Partial<Profile>,
  currentStep: number
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { count: nonDeletedProfileCount, error: countError } = await supabase
      .from("profiles")
      .select("id", { head: true, count: "exact" })
      .eq("user_id", userId)
      .is("deleted_at", null);
    if (countError) return { data: null, error: countError.message };
    if (Number(nonDeletedProfileCount || 0) >= MAX_ACTIVE_OR_PENDING_PROFILES) {
      return {
        data: null,
        error: `You can create up to ${MAX_ACTIVE_OR_PENDING_PROFILES} profiles. Delete one to add a new profile.`,
      };
    }

    // We intentionally mark as 'draft' so the normal createProfile auto-
    // pending-review logic is bypassed. Going through the mapper keeps
    // field translation consistent with every other write path.
    const row = toProfileRow({
      ...partial,
      moderationStatus: "draft",
      draftCurrentStep: currentStep,
    });
    row.user_id = userId;
    // Drafts don't need a public_id until they're submitted — leaving
    // it null avoids "burning" an ID for profiles that never ship.

    const { data, error } = await supabase
      .from("profiles")
      .insert(row)
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: fromProfileRow(data as ProfileRow), error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to create draft",
    };
  }
}

/**
 * Patch an existing draft with the latest form state + step number.
 *
 * IMPORTANT: we explicitly write `moderation_status = 'draft'` on every
 * update so `updateProfileById`'s pending-review flip is skipped. This
 * relies on the "explicit status wins" rule in `updateProfileById`.
 */
export async function updateDraft(
  draftId: string,
  partial: Partial<Profile>,
  currentStep: number
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const row = toProfileRow({
      ...partial,
      moderationStatus: "draft",
      draftCurrentStep: currentStep,
    });
    // Never let the user_id / id / public_id be clobbered by an update.
    delete row.user_id;
    delete row.id;
    delete row.public_id;

    const { data, error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", draftId)
      .eq("moderation_status", DRAFT_STATUS) // safety: only touch drafts
      .select()
      .single();
    if (error) return { data: null, error: error.message };
    return { data: data ? fromProfileRow(data as ProfileRow) : null, error: null };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err.message : "Failed to update draft",
    };
  }
}

/**
 * Hard-delete an abandoned draft. We rely on the `status = 'draft'` guard
 * so even a malicious caller passing a submitted profile id can't
 * accidentally nuke an approved row.
 */
export async function deleteDraft(
  draftId: string
): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { data, error } = await supabase
      .from("profiles")
      .delete()
      .eq("id", draftId)
      .eq("moderation_status", DRAFT_STATUS)
      .select("id");
    if (error) return { error: error.message };
    if (!data || data.length === 0) {
      return {
        error: "Draft could not be deleted. It may have already been submitted or removed.",
      };
    }
    return { error: null };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : "Failed to delete draft",
    };
  }
}
