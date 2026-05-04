-- Owner-controlled visibility for annual income on the public profile.
-- Default TRUE so existing rows keep current behavior. Display-only; search
-- / matching may still use annual_income depending on product rules.
--
-- Safe to run multiple times.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_annual_income BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN profiles.show_annual_income IS
  'When TRUE, annual income may appear on the public profile (subject to site data-visibility rules). When FALSE, other members do not see income; owner and superadmin still do.';
