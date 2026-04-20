-- =============================================================================
-- Cross-device draft autosave (Batch 6)
--
-- The profile creation wizard persists its in-progress state directly to
-- the `profiles` table as a row with `moderation_status = 'draft'`. When
-- the user finally presses "Save", that same row flips to `pending_review`
-- via the normal create/update path — there is no "draft" side-table.
--
-- This tiny migration adds a single column so we can remember which step
-- of the wizard the user was on when they left, and resume there on any
-- device without relying on localStorage.
--
-- Idempotent — safe to re-run.
-- =============================================================================

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS draft_current_step INT;

COMMENT ON COLUMN profiles.draft_current_step IS
  'Wizard step (1..N) the owner was on when they last left the profile creation flow. Only meaningful for rows with moderation_status = ''draft''. Null for submitted/approved profiles.';

-- Index so /account can cheaply list drafts.
CREATE INDEX IF NOT EXISTS idx_profiles_draft_by_user
  ON profiles(user_id)
  WHERE moderation_status = 'draft';

-- Done. Verify:
--   SELECT moderation_status, COUNT(*) FROM profiles GROUP BY 1;
