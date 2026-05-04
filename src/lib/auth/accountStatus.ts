/**
 * Account-level suspension (auth user) — separate from profile_status suspended.
 * Primary signal: app_metadata.account_suspended (+ suspended_at, suspend_reason).
 * GoTrue banned_until (if set) also blocks sign-in.
 */
export const ACCOUNT_SUSPENDED_LOGIN_MESSAGE =
  "Your account is suspended. Please contact support.";

export function isAccountAuthSuspended(
  appMetadata: Record<string, unknown> | null | undefined,
  bannedUntil: string | null | undefined
): boolean {
  if (appMetadata && appMetadata.account_suspended === true) return true;
  if (bannedUntil) {
    const t = new Date(bannedUntil).getTime();
    if (Number.isFinite(t) && t > Date.now()) return true;
  }
  return false;
}
