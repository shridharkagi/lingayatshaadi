import { createSupabaseClientSafe } from "@/lib/supabase";

const SESSION_TOKEN_TTL_MS = 10_000;

let tokenCache: { token: string; expiresAt: number } | null = null;
let tokenInFlight: Promise<string | null> | null = null;

async function getCachedAccessToken(): Promise<string | null> {
  const now = Date.now();
  if (tokenCache && now < tokenCache.expiresAt) return tokenCache.token;
  if (tokenInFlight) return tokenInFlight;

  tokenInFlight = (async () => {
    try {
      const supabase = createSupabaseClientSafe();
      if (!supabase) return null;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token || null;
      if (token) {
        tokenCache = { token, expiresAt: Date.now() + SESSION_TOKEN_TTL_MS };
      } else {
        tokenCache = null;
      }
      return token;
    } finally {
      tokenInFlight = null;
    }
  })();

  return tokenInFlight;
}

export async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  const token = await getCachedAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  return fetch(path, { ...init, headers, cache: "no-store" });
}
