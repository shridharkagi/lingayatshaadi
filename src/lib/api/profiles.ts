import { createSupabaseClient, createSupabaseClientSafe } from "@/lib/supabase";
import { toProfileRow, fromProfileRow, type ProfileRow } from "@/lib/profileMapper";
import type { Profile } from "@/types";

/** Create a new profile linked to auth user */
export async function createProfile(
  userId: string,
  data: Partial<Profile> & { email: string; fullName: string; dateOfBirth: string; gender: Profile["gender"] }
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();
    const row = toProfileRow(data);
    row.user_id = userId;
    if (!row.public_id) {
      const yy = new Date().getFullYear().toString().slice(-2);
      const mm = String(new Date().getMonth() + 1).padStart(2, "0");
      const seq = Math.random().toString(36).slice(2, 6).toUpperCase();
      row.public_id = `LS${yy}${mm}${seq}`;
    }

    const { data: inserted, error } = await supabase
      .from("profiles")
      .insert(row)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromProfileRow(inserted as ProfileRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to create profile" };
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

    const { data: updated, error } = await supabase
      .from("profiles")
      .update(row)
      .eq("id", profileId)
      .select()
      .single();

    if (error) return { data: null, error: error.message };
    return { data: fromProfileRow(updated as ProfileRow), error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to update profile" };
  }
}

/** Upsert profile: create if missing, update if exists. Uses user_id (auth.users.id). */
export async function upsertProfile(
  userId: string,
  data: Partial<Profile> & { email: string; fullName: string; dateOfBirth: string; gender: Profile["gender"] }
): Promise<{ data: Profile | null; error: string | null }> {
  try {
    const supabase = createSupabaseClient();

    const { data: existing } = await supabase
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.id) {
      return updateProfileById(existing.id, data);
    }
    return createProfile(userId, data);
  } catch (err) {
    return { data: null, error: err instanceof Error ? err.message : "Failed to save profile" };
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
