import type { SupabaseClient } from "@supabase/supabase-js";

export type AuthUserLite = {
  id: string;
  email?: string | null;
  phone?: string | null;
  created_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
};

async function listUsersPageWithRetry(
  admin: SupabaseClient,
  page: number,
  perPage: number
): Promise<AuthUserLite[]> {
  let lastErr: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (!error) return (data.users || []) as AuthUserLite[];
    lastErr = error.message || "Unknown listUsers error";
    // Short backoff for transient GoTrue/network hiccups.
    await new Promise((resolve) => setTimeout(resolve, attempt * 120));
  }
  throw new Error(lastErr || "Database error finding users");
}

async function listUsersFromProfilesFallback(admin: SupabaseClient): Promise<AuthUserLite[]> {
  type ProfileLite = {
    user_id?: string | null;
    created_at?: string | null;
    account_holder_name?: string | null;
    contact?: string | null;
  };
  const byUser = new Map<string, AuthUserLite>();
  const pageSize = 1000;
  for (let page = 0; page < 300; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await admin
      .from("profiles")
      .select("user_id, created_at, account_holder_name, contact")
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    const batch = (data || []) as ProfileLite[];
    if (!batch.length) break;
    for (const row of batch) {
      const uid = String(row.user_id || "").trim();
      if (!uid) continue;
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          id: uid,
          created_at: row.created_at || null,
          phone: row.contact || null,
          user_metadata: row.account_holder_name
            ? { full_name: row.account_holder_name }
            : null,
        });
      }
    }
    if (batch.length < pageSize) break;
  }
  return [...byUser.values()];
}

async function listUsersFromAccountCodesFallback(admin: SupabaseClient): Promise<AuthUserLite[]> {
  type CodeRow = {
    user_id?: string | null;
    source_created_at?: string | null;
    created_at?: string | null;
  };
  type ProfileLite = {
    user_id?: string | null;
    created_at?: string | null;
    account_holder_name?: string | null;
    contact?: string | null;
  };

  const { data: codeRows, error: codeErr } = await admin
    .from("user_account_codes")
    .select("user_id, source_created_at, created_at")
    .order("sequence_no", { ascending: true });
  if (codeErr) throw new Error(codeErr.message);

  const users = (codeRows || []) as CodeRow[];
  if (users.length === 0) return [];

  const userIds = users.map((r) => String(r.user_id || "")).filter(Boolean);
  const profileByUser = new Map<string, ProfileLite>();
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("user_id, created_at, account_holder_name, contact")
      .in("user_id", userIds)
      .order("created_at", { ascending: true });
    for (const row of (profs || []) as ProfileLite[]) {
      const uid = String(row.user_id || "").trim();
      if (!uid || profileByUser.has(uid)) continue;
      profileByUser.set(uid, row);
    }
  }

  const out: AuthUserLite[] = [];
  for (const row of users) {
    const uid = String(row.user_id || "").trim();
    if (!uid) continue;
    const profile = profileByUser.get(uid);
    out.push({
      id: uid,
      created_at: row.source_created_at || profile?.created_at || row.created_at || null,
      phone: profile?.contact || null,
      user_metadata: profile?.account_holder_name
        ? { full_name: profile.account_holder_name }
        : null,
    });
  }
  return out;
}

async function listUsersFromAuthTableFallback(admin: SupabaseClient): Promise<AuthUserLite[]> {
  type AuthRow = {
    id?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at?: string | null;
    raw_user_meta_data?: Record<string, unknown> | null;
  };
  const users: AuthUserLite[] = [];
  const pageSize = 1000;
  for (let page = 0; page < 300; page += 1) {
    const from = page * pageSize;
    const to = from + pageSize - 1;
    const { data, error } = await admin
      .schema("auth")
      .from("users")
      .select("id, email, phone, created_at, raw_user_meta_data")
      .order("created_at", { ascending: true })
      .range(from, to);
    if (error) throw new Error(error.message);
    const batch = (data || []) as AuthRow[];
    if (!batch.length) break;
    for (const row of batch) {
      const id = String(row.id || "").trim();
      if (!id) continue;
      users.push({
        id,
        email: row.email || null,
        phone: row.phone || null,
        created_at: row.created_at || null,
        user_metadata: row.raw_user_meta_data || null,
      });
    }
    if (batch.length < pageSize) break;
  }
  return users;
}

export async function listAllAuthUsers(admin: SupabaseClient): Promise<AuthUserLite[]> {
  const users: AuthUserLite[] = [];
  // GoTrue listUsers is more reliable with smaller pages on some projects.
  const perPage = 100;
  try {
    for (let page = 1; page <= 200; page += 1) {
      const batch = await listUsersPageWithRetry(admin, page, perPage);
      if (batch.length === 0) break;
      users.push(...batch);
      if (batch.length < perPage) break;
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!/database error finding users/i.test(msg)) throw error;
    // First fallback: read auth.users directly.
    try {
      const fromAuthSchema = await listUsersFromAuthTableFallback(admin);
      if (fromAuthSchema.length > 0) return fromAuthSchema;
    } catch {
      // If auth schema access is unavailable, continue to last-resort fallback.
    }
    // Second fallback: use persisted account-code rows (all account owners).
    try {
      const fromAccountCodes = await listUsersFromAccountCodesFallback(admin);
      if (fromAccountCodes.length > 0) return fromAccountCodes;
    } catch {
      // Continue to last-resort fallback.
    }
    // Last-resort fallback: derive account owners from profiles.
    return await listUsersFromProfilesFallback(admin);
  }
  return users;
}
