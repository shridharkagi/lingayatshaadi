import { createSupabaseClient, createSupabaseClientSafe } from "@/lib/supabase";
import { toProfileRow, fromProfileRow, type ProfileRow } from "@/lib/profileMapper";
import { generatePublicIdFromExistingIds, genderFlag } from "@/lib/memberId";
import type { Profile } from "@/types";

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

/** Update an existing profile by profile id */
export async function updateProfileById(
  profileId: string,
  data: Partial<Profile>
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const row = toProfileRow(data);

    if (typeof window !== "undefined") {
      console.info("[profiles.updateProfileById] updating row", { profileId, keys: Object.keys(row) });
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
    return {
      data: (data || []).map((r) => fromProfileRow(r as ProfileRow)),
      error: null,
    };
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

    const { data, error } = await query.order("created_at", { ascending: false }).limit(limit);

    if (error) return { data: [], error: error.message };
    return {
      data: (data || []).map((r) => fromProfileRow(r as ProfileRow)),
      error: null,
    };
  } catch (err) {
    return { data: [], error: err instanceof Error ? err.message : "Failed to search profiles" };
  }
}
