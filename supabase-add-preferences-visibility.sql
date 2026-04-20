-- Adds two columns to support the Partner Preferences privacy toggle and
-- "has the user actually saved their preferences yet?" detection.
--
-- 1. show_partner_preferences  – owner-controlled visibility flag for the
--    public profile. Defaults to TRUE so existing rows continue to display
--    their preferences exactly as before. The toggle is purely a *display*
--    control: matching/search algorithms still read partner_preference
--    regardless of this flag.
--
-- 2. preferences_updated_at    – timestamp of the most recent successful save
--    of partner_preference. NULL means the user has never explicitly saved
--    their preferences, which lets the UI distinguish auto-defaulted values
--    from real user intent (drives nudges + smart-default banners).
--
-- Safe to run multiple times: every statement is idempotent.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_partner_preferences BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS preferences_updated_at  TIMESTAMPTZ;

COMMENT ON COLUMN profiles.show_partner_preferences IS
  'Owner-controlled visibility flag for the Partner Preferences card on the public profile. TRUE = visible to viewers, FALSE = private (owner still sees their own). Display-only — does not affect matching algorithms.';

COMMENT ON COLUMN profiles.preferences_updated_at IS
  'Timestamp of the most recent explicit save of partner_preference. NULL until the user first saves the preferences form.';
