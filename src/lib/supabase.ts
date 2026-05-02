import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Singleton Supabase clients.
 *
 * IMPORTANT: We must reuse a single browser/anon client across the whole app.
 * Creating multiple clients makes each one race for the same `navigator.locks`
 * auth lock, which surfaces as the runtime error:
 *   "Lock broken by another request with the 'steal' option."
 * This also caused noticeable slowness during navigation because every page
 * mount re-initialised auth and re-acquired the lock.
 *
 * We cache on `globalThis` so that Next.js HMR / Fast Refresh doesn't create
 * fresh instances per module reload during development either.
 */

type GlobalWithSupabase = typeof globalThis & {
  __ls_supabase_anon__?: SupabaseClient | null;
  __ls_supabase_admin__?: SupabaseClient | null;
};

const g = globalThis as GlobalWithSupabase;

function buildAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;
  return createClient(url, anon, {
    auth: {
      // A unique storage key per app — prevents collision with other apps on
      // the same origin and keeps the Web Lock name predictable.
      storageKey: "ls.auth.token",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

/** Get the singleton browser client (anon key). Throws if env is missing. */
export function createSupabaseClient(): SupabaseClient {
  if (!g.__ls_supabase_anon__) {
    const client = buildAnonClient();
    if (!client) {
      throw new Error("supabaseUrl and supabaseAnonKey are required");
    }
    g.__ls_supabase_anon__ = client;
  }
  return g.__ls_supabase_anon__;
}

/** Same singleton, but returns null instead of throwing when env is missing. */
export function createSupabaseClientSafe(): SupabaseClient | null {
  if (g.__ls_supabase_anon__ === undefined) {
    g.__ls_supabase_anon__ = buildAnonClient();
  }
  return g.__ls_supabase_anon__ ?? null;
}

/** Server-only service-role client, or null when env is not configured. */
export function createSupabaseAdminSafe(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;
  if (!g.__ls_supabase_admin__) {
    g.__ls_supabase_admin__ = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return g.__ls_supabase_admin__;
}

/** Server-only singleton client with service role (bypasses RLS). */
export function createSupabaseAdmin(): SupabaseClient {
  const client = createSupabaseAdminSafe();
  if (!client) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for server-side uploads");
  }
  return client;
}
