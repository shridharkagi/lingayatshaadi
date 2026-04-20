/**
 * Centralised feature flags. Read from build-time env vars so they can be
 * toggled per deployment (Vercel → Settings → Environment Variables) without
 * code changes.
 *
 * Defaults are conservative: features ship OFF unless explicitly enabled.
 */

/**
 * In-app messaging (chat). When false:
 *   - /messages and /messages/[id] render a "Coming Soon" placeholder
 *   - Message buttons on profile detail & activities are hidden
 *   - Bottom nav / sidebar omit the Messages tab
 *
 * Toggle via:  NEXT_PUBLIC_FEATURE_MESSAGING=true
 */
export const FEATURE_MESSAGING_ENABLED =
  process.env.NEXT_PUBLIC_FEATURE_MESSAGING === "true";
