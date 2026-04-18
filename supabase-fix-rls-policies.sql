-- ============================================================================
-- Fix RLS policies that were silently rejecting Interest / Shortlist actions
-- ----------------------------------------------------------------------------
-- The shortlist policy used `WHERE id = user_id` — because `user_id` exists
-- on BOTH `shortlisted_profiles` AND `profiles`, PostgreSQL bound the inner
-- reference to `profiles.user_id`, making the subquery effectively a no-op
-- and the policy failed every insert.
--
-- This script:
--   * Drops the buggy policies.
--   * Re-creates them with FULLY-QUALIFIED outer references.
--   * Adds a separate WITH CHECK clause so INSERTs are allowed.
--   * Adds explicit policies for the `interests` table covering INSERT &
--     SELECT (was previously expected from main schema but might be missing).
--
-- Safe to run multiple times.
-- ============================================================================

-- ---------- shortlisted_profiles ----------
DROP POLICY IF EXISTS "Users can manage shortlist" ON shortlisted_profiles;
DROP POLICY IF EXISTS "Users can view their shortlist" ON shortlisted_profiles;
DROP POLICY IF EXISTS "Users can insert into their shortlist" ON shortlisted_profiles;
DROP POLICY IF EXISTS "Users can delete from their shortlist" ON shortlisted_profiles;

ALTER TABLE shortlisted_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their shortlist" ON shortlisted_profiles
  FOR SELECT USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = shortlisted_profiles.user_id)
  );

CREATE POLICY "Users can insert into their shortlist" ON shortlisted_profiles
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = shortlisted_profiles.user_id)
  );

CREATE POLICY "Users can delete from their shortlist" ON shortlisted_profiles
  FOR DELETE USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = shortlisted_profiles.user_id)
  );

-- ---------- blocked_users ----------
DROP POLICY IF EXISTS "Users can manage blocked" ON blocked_users;
DROP POLICY IF EXISTS "Users can view their blocked list" ON blocked_users;
DROP POLICY IF EXISTS "Users can block" ON blocked_users;
DROP POLICY IF EXISTS "Users can unblock" ON blocked_users;

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their blocked list" ON blocked_users
  FOR SELECT USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = blocked_users.blocker_id)
  );

CREATE POLICY "Users can block" ON blocked_users
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = blocked_users.blocker_id)
  );

CREATE POLICY "Users can unblock" ON blocked_users
  FOR DELETE USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = blocked_users.blocker_id)
  );

-- ---------- profile_views ----------
-- Re-create with fully qualified refs (current names are fine but hardening).
DROP POLICY IF EXISTS "Users can insert profile views" ON profile_views;
DROP POLICY IF EXISTS "Users can view profile views on their profile" ON profile_views;

ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert profile views" ON profile_views
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = profile_views.viewer_id)
  );

CREATE POLICY "Users can view profile views on their profile" ON profile_views
  FOR SELECT USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = profile_views.viewed_id)
    OR auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = profile_views.viewer_id)
  );

-- ---------- interests ----------
DROP POLICY IF EXISTS "Users can view their sent/received interests" ON interests;
DROP POLICY IF EXISTS "Users can send interests" ON interests;
DROP POLICY IF EXISTS "Users can update interests they received" ON interests;

ALTER TABLE interests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their sent/received interests" ON interests
  FOR SELECT USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = interests.from_id)
    OR auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = interests.to_id)
  );

CREATE POLICY "Users can send interests" ON interests
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = interests.from_id)
  );

CREATE POLICY "Users can update interests they received" ON interests
  FOR UPDATE USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = interests.to_id)
  );

-- ---------- contact_views ----------
DROP POLICY IF EXISTS "Users can manage their contact views" ON contact_views;

ALTER TABLE contact_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their contact views" ON contact_views
  FOR SELECT USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = contact_views.viewer_id)
  );

CREATE POLICY "Users can record contact views" ON contact_views
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = contact_views.viewer_id)
  );

-- ---------- profile_notes ----------
DROP POLICY IF EXISTS "Users can manage their own notes" ON profile_notes;

ALTER TABLE profile_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own notes" ON profile_notes
  FOR ALL USING (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = profile_notes.user_id)
  ) WITH CHECK (
    auth.uid() = (SELECT p.user_id FROM profiles p WHERE p.id = profile_notes.user_id)
  );

-- Done.
SELECT 'RLS policies fixed' AS status;
