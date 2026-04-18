-- Adds `relationship` and `nickname` columns to profiles so that one account
-- (auth user) can have many profiles — self / son / daughter / brother /
-- sister / other dependent. Run this once in the Supabase SQL editor.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS relationship TEXT
    CHECK (relationship IN ('self','son','daughter','brother','sister','other'));

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname TEXT;

CREATE INDEX IF NOT EXISTS idx_profiles_user_relationship
  ON profiles(user_id, relationship);

-- Best-effort backfill: existing rows inherit relationship='self' (the old flow
-- assumed 1:1 account↔profile). Safe to run multiple times.
UPDATE profiles SET relationship = 'self' WHERE relationship IS NULL;
