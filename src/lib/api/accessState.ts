import { adminFetch } from "@/lib/api/adminClient";
import type { AccountAccessState } from "@/lib/accessPolicy";

const ACCESS_STATE_TTL_MS = 30_000;

let cached: { value: AccountAccessState | null; expiresAt: number } | null = null;
let inFlight: Promise<AccountAccessState | null> | null = null;

export async function getAccountAccessState(options?: {
  forceRefresh?: boolean;
}): Promise<AccountAccessState | null> {
  const now = Date.now();
  if (!options?.forceRefresh && cached && now < cached.expiresAt) {
    return cached.value;
  }
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const res = await adminFetch("/api/account/access-state");
      if (!res.ok) return null;
      const json = (await res.json()) as { access?: AccountAccessState };
      const value = json.access || null;
      cached = { value, expiresAt: Date.now() + ACCESS_STATE_TTL_MS };
      return value;
    } catch {
      return null;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

export function invalidateAccountAccessStateCache() {
  cached = null;
}
