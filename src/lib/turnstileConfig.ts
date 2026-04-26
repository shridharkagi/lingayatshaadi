/**
 * Cloudflare Turnstile — shared config (client + server safe).
 *
 * Server-only values (TURNSTILE_MODE, TURNSTILE_SECRET_KEY, CAPTCHA_BYPASS)
 * live in `src/lib/server/turnstile.ts` so they never leak into the browser
 * bundle.
 *
 * Env var contract:
 *   - NEXT_PUBLIC_TURNSTILE_SITE_KEY  Public site key (rendered in the page)
 *   - TURNSTILE_SECRET_KEY            Server-only secret used to call siteverify
 *   - TURNSTILE_MODE                  "enforce" | "shadow" | "disabled" (server)
 *   - CAPTCHA_BYPASS                  "true" disables both sides (test/dev)
 */

/** Public site key for the Turnstile widget. Empty string if not configured. */
export function getTurnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "").trim();
}

/** True when a public site key is configured and the client should mount the widget. */
export function isTurnstileClientConfigured(): boolean {
  return getTurnstileSiteKey().length > 0;
}

/** URL of the Cloudflare Turnstile loader script. Hard-coded so callers can't drift. */
export const TURNSTILE_SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
