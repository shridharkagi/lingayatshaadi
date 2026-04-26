import type { SupabaseClient } from "@supabase/supabase-js";
import { computeAccountCodes, type AuthUserLite } from "@/lib/accountCode";

type AccountCodeRow = {
  user_id: string;
  account_code: string;
};

export async function getPersistedAccountCodeMap(
  admin: SupabaseClient,
  userIds: string[]
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return out;

  const { data, error } = await admin
    .from("user_account_codes")
    .select("user_id, account_code")
    .in("user_id", ids);
  if (error) return out;

  for (const row of (data || []) as AccountCodeRow[]) {
    if (row.user_id && row.account_code) out.set(row.user_id, row.account_code);
  }
  return out;
}

export async function ensureAccountCodeForUser(
  admin: SupabaseClient,
  userId: string,
  createdAt?: string | null
): Promise<string | null> {
  if (!userId) return null;
  const { data, error } = await admin.rpc("ensure_user_account_code", {
    p_user_id: userId,
    p_created_at: createdAt ?? null,
  });
  if (error) return null;
  return typeof data === "string" && data.trim() ? data.trim() : null;
}

export async function resolveAccountCodeMap(
  admin: SupabaseClient,
  users: AuthUserLite[]
): Promise<Map<string, string>> {
  const persisted = await getPersistedAccountCodeMap(
    admin,
    users.map((u) => u.id)
  );
  const fallback = computeAccountCodes(users);

  for (const u of users) {
    if (!persisted.has(u.id)) {
      const code = fallback.get(u.id);
      if (code) persisted.set(u.id, code);
    }
  }
  return persisted;
}
