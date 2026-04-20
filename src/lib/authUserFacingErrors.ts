/**
 * Turns Supabase Auth / GoTrue messages into short, actionable copy for the UI.
 */
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
