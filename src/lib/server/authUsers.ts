import type { SupabaseClient } from "@supabase/supabase-js";
import { syntheticEmailCandidatesForPhone } from "@/lib/phoneAuth";

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

async function findUsersFromProfilesContact(
  admin: SupabaseClient,
  phoneVariants: string[]
): Promise<AuthUserLite[]> {
  const variants = phoneVariants.map((v) => String(v || "").trim()).filter(Boolean);
  if (variants.length === 0) return [];

  type ProfileLite = {
    user_id?: string | null;
    created_at?: string | null;
    account_holder_name?: string | null;
    contact?: string | null;
  };

  const { data, error } = await admin
    .from("profiles")
    .select("user_id, created_at, account_holder_name, contact")
    .in("contact", variants)
    .order("created_at", { ascending: true })
    .limit(20);
  if (error) throw new Error(error.message);

  const rows = (data || []) as ProfileLite[];
  const out: AuthUserLite[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const id = String(row.user_id || "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      phone: row.contact || null,
      created_at: row.created_at || null,
      user_metadata: row.account_holder_name ? { full_name: row.account_holder_name } : null,
    });
  }
  return out;
}

/**
 * Locate the Supabase Auth user matching a phone number.
 *
 * Looks at:
 *   - `auth.users.phone` column with both `+91...` (E.164) and `91...` (no plus)
 *     formats, since GoTrue historically stored phone without the plus sign.
 *   - Both synthetic-email formats produced by our phone OTP flow:
 *       `phone_<digits10>@phone.otp.lingayatbandhu.com` (current)
 *       `phone_<digits10>@phone.otp.lingayatbandhu`    (legacy, no TLD)
 *
 * Strategy (in order — first one to return a match wins):
 *   1. RPC `public.find_auth_user_by_phone` — a SECURITY DEFINER function that
 *      reads `auth.users` server-side. This is the primary path because
 *      PostgREST does not expose the `auth` schema by default, and
 *      `auth.admin.listUsers` returns "Database error finding users" on this
 *      project. The RPC bypasses both issues. It must be installed once via
 *      `supabase-find-auth-user-by-phone.sql`.
 *   2. Direct SELECT against `auth.users` — works only if the project has
 *      explicitly exposed the `auth` schema to PostgREST.
 *   3. Paginated `auth.admin.listUsers` filtered in memory — slowest, used
 *      only when the first two paths are unavailable.
 *
 * If multiple rows match (e.g. a legacy duplicate plus a freshly-created broken
 * row with NULL phone), prefer the one whose phone column matches the input
 * phone, then the older `created_at` — that picks the real account and ignores
 * partially-created junk rows.
 */
export async function findAuthUserByPhone(
  admin: SupabaseClient,
  phoneE164: string,
  digits10: string
): Promise<AuthUserLite | null> {
  const phoneStripped = phoneE164.startsWith("+") ? phoneE164.slice(1) : phoneE164;
  const localPhone = `0${digits10}`;
  const emails = syntheticEmailCandidatesForPhone(digits10).map((e) => e.toLowerCase());
  const phoneVariants = [phoneE164, phoneStripped, digits10, localPhone];

  const matches: AuthUserLite[] = [];

  type AuthUserRow = {
    id?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at?: string | null;
    raw_user_meta_data?: Record<string, unknown> | null;
  };

  const pushRow = (row: AuthUserRow) => {
    const id = String(row.id || "").trim();
    if (!id) return;
    matches.push({
      id,
      email: row.email || null,
      phone: row.phone || null,
      created_at: row.created_at || null,
      user_metadata: row.raw_user_meta_data || null,
    });
  };

  // 1. SECURITY DEFINER RPC — primary path.
  // We track whether the RPC was authoritative (i.e. the call succeeded, even
  // if it returned zero rows) so we don't waste round trips on the broken
  // fallback paths when we already know the user doesn't exist.
  let rpcAuthoritative = false;
  try {
    const { data, error } = await admin.rpc("find_auth_user_by_phone", {
      p_phone_e164: phoneE164,
      p_digits10: digits10,
    });
    if (!error && Array.isArray(data)) {
      rpcAuthoritative = true;
      for (const row of data as AuthUserRow[]) pushRow(row);
    } else if (error) {
      // Common when the migration hasn't been applied yet — log once at warn,
      // do NOT throw, and fall through to the legacy paths below.
      console.warn(
        "[findAuthUserByPhone] RPC find_auth_user_by_phone failed:",
        error.message,
        "— falling back to direct/auth.users + listUsers paths. Apply",
        "supabase-find-auth-user-by-phone.sql to silence this."
      );
    }
  } catch (e) {
    console.warn(
      "[findAuthUserByPhone] RPC find_auth_user_by_phone threw:",
      e instanceof Error ? e.message : String(e)
    );
  }

  // If the RPC succeeded (regardless of row count), trust it as authoritative.
  // No need to hit the broken direct-auth-schema or listUsers paths.
  if (rpcAuthoritative) {
    if (matches.length === 0) return null;
    if (matches.length === 1) return matches[0];
    return pickBestMatch(matches, phoneE164, phoneStripped);
  }

  // 2. Direct SELECT against auth.users (only works if PostgREST exposes auth).
  if (matches.length === 0) {
    try {
      const orParts = [
        `phone.eq.${phoneE164}`,
        `phone.eq.${phoneStripped}`,
        ...emails.map((e) => `email.eq.${e}`),
      ];
      const { data, error } = await admin
        .schema("auth")
        .from("users")
        .select("id, email, phone, created_at, raw_user_meta_data")
        .or(orParts.join(","));
      if (!error && Array.isArray(data)) {
        for (const row of data as AuthUserRow[]) pushRow(row);
      } else if (error) {
        console.warn("[findAuthUserByPhone] direct auth.users SELECT failed:", error.message);
      }
    } catch (e) {
      console.warn(
        "[findAuthUserByPhone] direct auth.users SELECT threw:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  // 3. Targeted profiles-contact lookup fallback (much faster than listUsers scan).
  // This avoids a slow full auth-user pagination on projects where RPC and
  // auth-schema access are unavailable.
  if (matches.length === 0) {
    try {
      const fromProfiles = await findUsersFromProfilesContact(admin, phoneVariants);
      if (fromProfiles.length > 0) {
        matches.push(...fromProfiles);
      }
    } catch (e) {
      console.warn(
        "[findAuthUserByPhone] profiles contact lookup failed:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  // 4. listUsers paginated fallback.
  if (matches.length === 0) {
    try {
      const perPage = 200;
      // Page 1..N until we find the user or run out of pages. We cap at 50
      // pages (10k users) — that is more than enough for our user base today
      // and prevents runaway loops on misconfigured GoTrue deployments.
      for (let page = 1; page <= 50; page += 1) {
        const batch = await listUsersPageWithRetry(admin, page, perPage);
        if (batch.length === 0) break;
        for (const u of batch) {
          const phone = (u.phone || "").trim();
          const email = (u.email || "").toLowerCase();
          const phoneHit =
            phone === phoneE164 || phone === phoneStripped || phone === `+${phoneStripped}`;
          const emailHit = email && emails.includes(email);
          if (phoneHit || emailHit) matches.push(u);
        }
        if (matches.length > 0 || batch.length < perPage) break;
      }
    } catch (e) {
      console.warn(
        "[findAuthUserByPhone] listUsers fallback failed:",
        e instanceof Error ? e.message : String(e)
      );
    }
  }

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];
  return pickBestMatch(matches, phoneE164, phoneStripped);
}

/**
 * Pick the canonical row out of a candidate set.
 *
 * Historically this function preferred phone-matched rows and then the oldest
 * `created_at`. That broke down when a phone number had two rows:
 *   • an old "junk" row (phone column populated but email + metadata NULL —
 *     residue of the older OTP-login auto-create bug), and
 *   • the real account row (phone + email + metadata all populated).
 *
 * The old "oldest wins" rule picked the junk row, after which
 * `handleLoginOrReset` would synthesise an email from `digits10` (because
 * existing.email was NULL). That synthesised email would not exist in
 * auth.users, and `generate_link` with type='magiclink' silently created a
 * brand-new third row — exactly the regression we are fixing.
 *
 * The new rule scores rows by how "complete" they are. A row that has the
 * phone column populated AND an email AND non-empty user_metadata is far
 * more likely to be the real account than a phone-only stub. Tie-break on
 * `created_at` ASC so when two equally-complete rows exist (very rare) we
 * still return the original.
 *
 * Score weights:
 *   +4  phone column populated AND it matches the input phone
 *   +2  has an email column set
 *   +1  has non-empty user_metadata
 */
function pickBestMatch(
  matches: AuthUserLite[],
  phoneE164: string,
  phoneStripped: string
): AuthUserLite {
  const score = (m: AuthUserLite): number => {
    const phone = (m.phone || "").trim();
    const phoneMatches =
      phone === phoneE164 || phone === phoneStripped || phone === `+${phoneStripped}`;
    let s = 0;
    if (phoneMatches) s += 4;
    if (m.email && m.email.trim().length > 0) s += 2;
    if (m.user_metadata && Object.keys(m.user_metadata).length > 0) s += 1;
    return s;
  };

  const sorted = [...matches].sort((a, b) => {
    const sb = score(b);
    const sa = score(a);
    if (sa !== sb) return sb - sa;
    const at = a.created_at ? new Date(a.created_at).getTime() : Number.MAX_SAFE_INTEGER;
    const bt = b.created_at ? new Date(b.created_at).getTime() : Number.MAX_SAFE_INTEGER;
    return at - bt;
  });

  if (sorted.length > 1) {
    console.warn(
      "[findAuthUserByPhone] multiple matches; selected highest-scoring:",
      JSON.stringify(
        sorted.map((m) => ({
          id: m.id,
          phone: m.phone || null,
          has_email: !!(m.email && m.email.trim()),
          has_metadata: !!(m.user_metadata && Object.keys(m.user_metadata).length > 0),
          score: score(m),
          created_at: m.created_at || null,
        }))
      )
    );
  }

  return sorted[0];
}

/**
 * Primary path for listing auth users on this project.
 *
 * Uses the SECURITY DEFINER RPC `public.list_all_auth_users` (see
 * `supabase-list-all-auth-users.sql`). This is the only path that reliably
 * returns `raw_user_meta_data` — every other path either fails with
 * "Database error finding users" (gotrue listUsers) or "Invalid schema:
 * auth" (PostgREST direct), or it loses metadata entirely (the
 * profiles/account-codes fallbacks).
 *
 * Returns null when the RPC is missing or errors, so the caller can fall
 * back to the legacy paths instead of failing the whole request.
 */
async function listUsersFromRpc(admin: SupabaseClient): Promise<AuthUserLite[] | null> {
  type RpcRow = {
    id?: string | null;
    email?: string | null;
    phone?: string | null;
    created_at?: string | null;
    raw_user_meta_data?: Record<string, unknown> | null;
  };
  try {
    const { data, error } = await admin.rpc("list_all_auth_users");
    if (error) {
      console.warn(
        "[listAllAuthUsers] RPC list_all_auth_users failed:",
        error.message,
        "— falling back to listUsers / direct auth.users / profiles paths.",
        "Apply supabase-list-all-auth-users.sql to silence this."
      );
      return null;
    }
    if (!Array.isArray(data)) return null;
    const out: AuthUserLite[] = [];
    for (const raw of data as RpcRow[]) {
      const id = String(raw.id || "").trim();
      if (!id) continue;
      out.push({
        id,
        email: raw.email || null,
        phone: raw.phone || null,
        created_at: raw.created_at || null,
        user_metadata: raw.raw_user_meta_data || null,
      });
    }
    return out;
  } catch (e) {
    console.warn(
      "[listAllAuthUsers] RPC list_all_auth_users threw:",
      e instanceof Error ? e.message : String(e)
    );
    return null;
  }
}

export async function listAllAuthUsers(admin: SupabaseClient): Promise<AuthUserLite[]> {
  // 1. Primary: SECURITY DEFINER RPC. Reliable on this project where the
  //    standard listUsers + auth-schema paths both fail, and unlike the
  //    profiles-based fallbacks this one preserves raw_user_meta_data
  //    (so account-holder names show up in the superadmin UI).
  const fromRpc = await listUsersFromRpc(admin);
  if (fromRpc !== null) return fromRpc;

  // 2. gotrue admin listUsers — works on most projects, broken on ours.
  const users: AuthUserLite[] = [];
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
    // 3. Direct SELECT against the auth schema (works only if PostgREST
    //    has been configured to expose it).
    try {
      const fromAuthSchema = await listUsersFromAuthTableFallback(admin);
      if (fromAuthSchema.length > 0) return fromAuthSchema;
    } catch {
      // continue to next fallback
    }
    // 4. user_account_codes + profiles join — loses user_metadata, names
    //    only land for profiles whose `account_holder_name` is populated.
    try {
      const fromAccountCodes = await listUsersFromAccountCodesFallback(admin);
      if (fromAccountCodes.length > 0) return fromAccountCodes;
    } catch {
      // continue to last-resort fallback
    }
    // 5. Last-resort: derive account owners from profiles only.
    return await listUsersFromProfilesFallback(admin);
  }
  return users;
}
