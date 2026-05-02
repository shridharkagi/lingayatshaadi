import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Profile row IDs for this auth user, **including soft-deleted** rows.
 *
 * Superadmin assign may store `user_subscriptions.user_id` as `profiles.id`
 * (legacy FK). Shadow profiles use `deleted_at` immediately — they must still
 * be included when resolving subscriptions for the account holder.
 */
export async function listOwnedProfileIdsIncludingDeleted(
  admin: SupabaseClient,
  authUserId: string
): Promise<string[]> {
  const { data } = await admin
    .from("profiles")
    .select("id")
    .eq("user_id", authUserId)
    .limit(500);
  return (data || [])
    .map((r) => String((r as { id?: string }).id || ""))
    .filter(Boolean);
}

/** PostgREST filter: subscription row belongs to this account (auth id or any owned profile id). */
export function userSubscriptionsOrFilter(authUserId: string, ownedProfileIds: string[]): string {
  const ids = Array.from(new Set([authUserId, ...ownedProfileIds]));
  return ids.map((id) => `user_id.eq.${id}`).join(",");
}
