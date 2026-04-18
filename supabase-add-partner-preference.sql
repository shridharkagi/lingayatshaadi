-- Adds the partner_preference JSONB column to the profiles table.
-- Safe to run multiple times: the IF NOT EXISTS guard means re-running
-- this migration is a no-op once the column is in place.
--
-- The column stores the structured PartnerPreference object emitted by the
-- web client (age range, height range, marital status, caste, sub-caste,
-- education, profession, income range, city, state, food habits, etc.).
-- We use JSONB so we can easily add/remove fields later without further
-- schema migrations.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS partner_preference JSONB DEFAULT '{}'::jsonb;

-- Make sure the column has a sane default so SELECTs never return NULL
-- for legacy rows that pre-date the column.
UPDATE profiles
   SET partner_preference = '{}'::jsonb
 WHERE partner_preference IS NULL;
