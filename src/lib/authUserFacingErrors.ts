/**
 * Turns Supabase Auth / GoTrue messages into short, actionable copy for the UI.
 */

/**
 * Shown to the user when Cloudflare Turnstile cannot deliver a token, typically
 * because a corporate proxy (Zscaler, Cisco Umbrella, Palo Alto Prisma, Netskope,
 * Symantec) or strict ad-blocker is intercepting Cloudflare's challenge platform
 * traffic. The wording deliberately avoids saying "captcha failed" because that
 * sounds like the user did something wrong.
 */
export const CAPTCHA_BLOCKED_MESSAGE =
  "Couldn't verify your browser. Wait a few seconds and tap Continue again. If it keeps failing: try mobile data, " +
  "turn off VPN/ad-blockers for this site, or see Help → Sign-in issues.";

/**
 * Detect captcha-related error messages bubbling up from Supabase Auth so we
 * can replace them with a more actionable instruction.
 */
export function isCaptchaErrorMessage(raw: string): boolean {
  if (!raw) return false;
  const m = raw.toLowerCase();
  return m.includes("captcha") || m.includes("turnstile");
}

export function friendlyEmailChangeError(raw: string): string {
  const m = raw.toLowerCase();
  if (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("too many emails") ||
    m.includes("email rate limit")
  ) {
    return (
      "Too many verification emails were requested. Wait about 60 seconds and try again. " +
      "Check your inbox and spam folder in case a message was already delivered. " +
      "If this keeps happening, open Supabase Dashboard → Authentication → Rate Limits to review email quotas, or wait longer between attempts."
    );
  }
  if (
    m.includes("already registered") ||
    m.includes("already been registered") ||
    m.includes("user already exists") ||
    m.includes("email address is already")
  ) {
    return "That email is already linked to an account. Use a different address, or sign in with that email if it’s yours.";
  }
  return raw;
}

export function isAuthEmailRateLimitedMessage(raw: string): boolean {
  const m = raw.toLowerCase();
  return (
    m.includes("rate limit") ||
    m.includes("too many requests") ||
    m.includes("too many emails") ||
    m.includes("email rate limit")
  );
}
