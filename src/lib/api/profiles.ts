import { createSupabaseClient, createSupabaseClientSafe } from "@/lib/supabase";
import { toProfileRow, fromProfileRow, type ProfileRow } from "@/lib/profileMapper";
import { generatePublicIdFromExistingIds, genderFlag } from "@/lib/memberId";
import type { Profile } from "@/types";

/**
 * For public-facing surfaces (search, home cards, other-member profile
 * view), we must never display a profile's pending edits. If the row is
 * not `approved` AND it has a prior approved snapshot, we render from the
 * snapshot instead. The snapshot is `to_jsonb(profiles.*)` so the keys
 * already match `ProfileRow` and `fromProfileRow` can rehydrate it.
 */
export function profileForPublic(row: ProfileRow): Profile {
  const status = row.moderation_status as string | undefined;
  const snapshot = row.approved_snapshot as Record<string, unknown> | null | undefined;
  if (status === "approved" || !snapshot) {
    return fromProfileRow(row);
  }
  // Preserve the canonical id / public_id / moderation_status from the
  // live row so routing and "pending" badges keep working even when the
  // body comes from a stale snapshot.
  return fromProfileRow({
    ...(snapshot as ProfileRow),
    id: row.id,
    public_id: row.public_id ?? (snapshot as ProfileRow).public_id,
    user_id: row.user_id ?? (snapshot as ProfileRow).user_id,
    moderation_status: row.moderation_status,
    approved_snapshot: null,
  } as ProfileRow);
}

/**
 * Rehydrate an `approved_snapshot` JSONB blob back into a `Profile`.
 * Snapshots come from `to_jsonb(profiles.*)` so keys already match the
 * `ProfileRow` shape — we simply pass it through the existing mapper.
 * Returns null when snapshot is absent so callers can easily branch.
 */
export function profileFromSnapshot(
  snapshot: Record<string, unknown> | null | undefined
): Profile | null {
  if (!snapshot) return null;
  try {
    return fromProfileRow(snapshot as ProfileRow);
  } catch (err) {
    console.warn("[profiles.profileFromSnapshot] could not rehydrate snapshot:", err);
    return null;
  }
}

/**
 * Hard timeout for any single Supabase write operation. Prevents the UI from
 * being stuck on "Saving..." forever when the network or auth lock stalls.
 */
const PROFILE_WRITE_TIMEOUT_MS = 20000;

function withTimeout<T>(p: PromiseLike<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label} timed out after ${ms}ms`));
    }, ms);
    Promise.resolve(p).then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      }
    );
  });
}

function describeSupabaseError(err: unknown): string {
  if (!err) return "Unknown error";
  if (typeof err === "string") return err;
  const e = err as { message?: string; details?: string; hint?: string; code?: string };
  const parts = [e.message, e.details, e.hint, e.code ? `(code: ${e.code})` : ""].filter(Boolean);
  return parts.length ? parts.join(" — ") : JSON.stringify(err);
}

/**
 * Create a new profile linked to auth user. Multiple profiles per user are
 * supported (self/son/daughter/etc. — distinguished by `relationship`).
 */
export async function createProfile(
  userId: string,
  data: Partial<Profile>
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const row = toProfileRow(data);
    row.user_id = userId;

    // Moderation (Batch 5B): every brand-new profile enters the admin
    // review queue by default. `approved_snapshot` stays NULL until an
    // admin flips status to 'approved' for the first time — so the public
    // won't see anything until then. Callers that need to bypass this
    // (e.g. internal seeding scripts) should write directly via service
    // role + explicit `moderation_status`.
    if (row.moderation_status == null) {
      row.moderation_status = "pending_review";
    }
    if (row.last_submitted_at == null) {
      row.last_submitted_at = new Date().toISOString();
    }

    // Generate the next public_id in the "L[BG]YYMMNNNNN" scheme using a
    // GLOBAL counter — the next number is `max(seq across ALL existing
    // public_ids) + 1`, irrespective of year/month or gender. We scan
    // every public_id in the table (cheap: it's a short indexed column).
    if (!row.public_id) {
      const now = new Date();
      const yy = String(now.getFullYear()).slice(-2);
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const flag = genderFlag(data.gender);

      const { data: existing, error: lookupErr } = await withTimeout(
        // `LIKE 'L%'` matches both legacy (LS…) and new (LB…/LG…) formats.
        supabase.from("profiles").select("public_id").like("public_id", "L%"),
        PROFILE_WRITE_TIMEOUT_MS,
        "createProfile public_id scan"
      );

      if (lookupErr) {
        console.warn(
          "[profiles.createProfile] public_id scan failed, falling back to random suffix:",
          describeSupabaseError(lookupErr)
        );
        // Best-effort fallback: avoid collision via 5 random digits. Still
        // uses the new format so the parser keeps working. The DB UNIQUE
        // constraint on public_id is the final safety net.
        const seq = String(Math.floor(Math.random() * 100000)).padStart(5, "0");
        row.public_id = `L${flag}${yy}${mm}${seq}`;
      } else {
        const ids = (existing || [])
          .map((r) => (r as { public_id?: string }).public_id || "")
          .filter(Boolean);
        row.public_id = generatePublicIdFromExistingIds(ids, data.gender);
      }
    }

    if (typeof window !== "undefined") {
      console.info("[profiles.createProfile] inserting row", { user_id: userId, keys: Object.keys(row) });
    }

    const { data: inserted, error } = await withTimeout(
      supabase.from("profiles").insert(row).select().single(),
      PROFILE_WRITE_TIMEOUT_MS,
      "createProfile insert"
    );

    if (error) {
      const msg = describeSupabaseError(error);
      console.warn("[profiles.createProfile] supabase error:", msg, error);
      return { data: null, error: msg };
    }
    return { data: fromProfileRow(inserted as ProfileRow), error: null };
  } catch (err) {
    const msg = describeSupabaseError(err);
    console.warn("[profiles.createProfile] threw:", msg, err);
    return { data: null, error: msg };
  }
}

/**
 * Update an existing profile by profile id.
 *
 * Batch 5B: every edit by a non-admin re-enters the moderation queue.
 * Callers that are performing an admin action (approve / reject) must pass
 * `options.skipModeration = true` to avoid flipping their own approval
 * back to `pending_review`. Edits that only touch already-admin columns
 * (moderation_status, approved_snapshot, etc.) also get this treatment
 * automatically so callers don't need to remember the flag.
 */
const ADMIN_ONLY_ROW_KEYS = new Set([
  "moderation_status",
  "approved_snapshot",
  "approved_at",
  "last_submitted_at",
  "rejection_reason",
  "reviewed_by",
  // Verification + trust are admin-managed.
  "verified",
  "profile_status",
  "trust_score",
  "role",
]);

export async function updateProfileById(
  profileId: string,
  data: Partial<Profile>,
  options: { skipModeration?: boolean } = {}
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const row = toProfileRow(data);

    // Decide whether this edit counts as "content change" (= requires
    // re-approval) or is a pure admin field update (= leave status alone).
    //
    // If the caller has explicitly set `moderation_status` (e.g. the
    // autosave flow saving as 'draft'), that value is respected as-is —
    // we never override an explicit intent. Pure admin-field updates
    // (verification toggles etc.) also skip the flip.
    const touchesOwnerFields = Object.keys(row).some(
      (k) => !ADMIN_ONLY_ROW_KEYS.has(k)
    );
    const explicitStatus = row.moderation_status as string | undefined;
    // Decision matrix:
    //   - explicit "draft" (autosave) → respect, no pending flip
    //   - explicit "pending_review" (submit-from-draft) → treat as submission:
    //     stamp last_submitted_at, clear rejection_reason, drop draft step
    //   - no explicit status + owner field changed → auto-flip to
    //     pending_review (normal edit-after-approval)
    //   - options.skipModeration (admin tools) → never change status
    const isSubmission =
      !options.skipModeration &&
      (explicitStatus === "pending_review" ||
        (explicitStatus == null && touchesOwnerFields));

    // Draft-created profiles may not have a public_id yet. When they are
    // first submitted, assign one so all UI links can use canonical lb/lg slugs.
    if (isSubmission) {
      const { data: existingRow } = await supabase
        .from("profiles")
        .select("public_id, gender")
        .eq("id", profileId)
        .maybeSingle();
      const existingPublicId = (existingRow as { public_id?: string | null } | null)?.public_id;
      if (!existingPublicId) {
        const genderForId =
          (row.gender as Profile["gender"] | undefined) ||
          ((existingRow as { gender?: Profile["gender"] | null } | null)?.gender as Profile["gender"] | undefined) ||
          "male";
        const { data: existingIds } = await supabase
          .from("profiles")
          .select("public_id")
          .like("public_id", "L%");
        const ids = (existingIds || [])
          .map((r) => (r as { public_id?: string | null }).public_id || "")
          .filter(Boolean);
        row.public_id = generatePublicIdFromExistingIds(ids, genderForId);
      }
    }
    if (isSubmission) {
      row.moderation_status = "pending_review";
      row.last_submitted_at = new Date().toISOString();
      // Explicitly clear a previous rejection reason since the user is
      // re-submitting; otherwise the stale reason would linger.
      row.rejection_reason = null;
      // A submitted profile is no longer a draft — nuke the resume step
      // so /account stops listing it under "Continue creating".
      row.draft_current_step = null;
    }

    if (typeof window !== "undefined") {
      console.info("[profiles.updateProfileById] updating row", {
        profileId,
        keys: Object.keys(row),
        skipModeration: options.skipModeration,
        touchesOwnerFields,
        isSubmission,
      });
    }

    const { data: updated, error } = await withTimeout(
      supabase.from("profiles").update(row).eq("id", profileId).select().single(),
      PROFILE_WRITE_TIMEOUT_MS,
      "updateProfileById update"
    );

    if (error) {
      const msg = describeSupabaseError(error);
      console.warn("[profiles.updateProfileById] supabase error:", msg, error);
      return { data: null, error: msg };
    }
    return { data: fromProfileRow(updated as ProfileRow), error: null };
  } catch (err) {
    const msg = describeSupabaseError(err);
    console.warn("[profiles.updateProfileById] threw:", msg, err);
    return { data: null, error: msg };
  }
}

/**
 * Upsert profile: DEPRECATED. Use `createProfile` for new rows and
 * `updateProfileById` for edits. Retained for backward compatibility only.
 *
 * NOTE: the account holder can now own MANY profiles (self/son/daughter/etc.)
 * so picking "the one" by user_id is ambiguous. This implementation prefers
 * the `relationship = 'self'` row when present; otherwise the first row.
 */
export async function upsertProfile(
  userId: string,
  data: Partial<Profile> & { email: string; fullName: string; dateOfBirth: string; gender: Profile["gender"] }
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();

    const { data: rows } = await supabase
      .from("profiles")
      .select("id,relationship,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    const existing =
      (rows || []).find((r) => (r as { relationship?: string }).relationship === "self") ||
      (rows || [])[0];

    if (existing?.id) {
      return updateProfileById(String(existing.id), data);
    }
    return createProfile(userId, data);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to save profile" };
  }
}

/** List all profiles owned by a given auth user (account holder). */
export async function listProfilesByUserId(
  userId: string
): Promise<{ data: Profile[]; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });

    if (error) return { data: [], error: error.message };
    const rows = (data || []) as ProfileRow[];
    const missing = rows.filter((r) => !(r.public_id as string | undefined));
    if (missing.length > 0) {
      const { data: existingIds } = await supabase
        .from("profiles")
        .select("public_id")
        .like("public_id", "L%");
      const seed = (existingIds || [])
        .map((r) => (r as { public_id?: string | null }).public_id || "")
        .filter(Boolean);
      for (const m of missing) {
        const id = String(m.id || "");
        if (!id) continue;
        const g = (m.gender as Profile["gender"] | undefined) || "male";
        const next = generatePublicIdFromExistingIds(seed, g);
        seed.push(next);
        await supabase.from("profiles").update({ public_id: next }).eq("id", id);
        m.public_id = next;
      }
    }
    return { data: rows.map((r) => fromProfileRow(r)), error: null };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to list profiles" };
  }
}

/** Delete a profile by its UUID. Only works for profiles owned by the caller (RLS enforced). */
export async function deleteProfileById(profileId: string): Promise<{ error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("profiles").delete().eq("id", profileId);
    if (error) return { error: error.message };
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Failed to delete profile" };
  }
}

/** Get profile by id (profile UUID) */
export async function getProfileById(profileId: string): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data ? fromProfileRow(data as ProfileRow) : null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch profile" };
  }
}

/** Get profile by public_id */
export async function getProfileByPublicId(publicId: string): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: null, error: "Supabase not configured" };
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("public_id", publicId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return { data: null, error: error.message };
    return { data: data ? fromProfileRow(data as ProfileRow) : null, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to fetch profile" };
  }
}

export interface SearchFilters {
  gender?: string;
  ageMin?: number;
  ageMax?: number;
  city?: string;
  maritalStatus?: string;
  caste?: string;
  subCaste?: string;
}

/** Search profiles with optional filters */
export async function searchProfiles(
  filters: SearchFilters = {},
  limit = 50
): Promise<{ data: Profile[]; error: string | null }> {
  try {
    const supabase = createSupabaseClientSafe();
    if (!supabase) return { data: [], error: "Supabase not configured" };
    let query = supabase.from("profiles").select("*");
    query = query.is("deleted_at", null);

    if (filters.gender) query = query.eq("gender", filters.gender);
    if (filters.city) query = query.ilike("city", `%${filters.city}%`);
    if (filters.maritalStatus) query = query.eq("marital_status", filters.maritalStatus);
    if (filters.caste) query = query.eq("caste", filters.caste);
    if (filters.subCaste) query = query.eq("sub_caste", filters.subCaste);

    if (filters.ageMin != null) {
      const maxDob = new Date();
      maxDob.setFullYear(maxDob.getFullYear() - filters.ageMin);
      query = query.lte("date_of_birth", maxDob.toISOString().slice(0, 10));
    }
    if (filters.ageMax != null) {
      const minDob = new Date();
      minDob.setFullYear(minDob.getFullYear() - filters.ageMax - 1);
      query = query.gte("date_of_birth", minDob.toISOString().slice(0, 10));
    }

    // Moderation (Batch 5B): a profile is publicly listable if EITHER its
    // live moderation_status is 'approved' OR it has a prior approved
    // snapshot to fall back to. Anything else (brand-new pending, draft,
    // rejected with no history) is hidden from the public feed.
    query = query.or(
      "moderation_status.eq.approved,approved_snapshot.not.is.null"
    );

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

    if (error) return { data: [], error: error.message };
    return {
      // Public consumers always see the approved version of the data,
      // even when there are pending edits on the live row.
      data: (data || []).map((r) => profileForPublic(r as ProfileRow)),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to search profiles" };
  }
}
