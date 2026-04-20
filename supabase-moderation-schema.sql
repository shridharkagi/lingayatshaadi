-- =============================================================================
-- Moderation schema (Batch 5 foundation)
--
-- Introduces full-profile + per-photo moderation on top of the existing
-- `profiles` table.
--
-- High-level model (agreed with product):
--   * Every profile create and every subsequent edit must be approved by a
--     super-admin before it becomes publicly visible.
--   * Public profile pages render from `profiles.approved_snapshot` (JSONB)
--     — a frozen copy of the last approved version. The owner's own edits
--     live on the normal `profiles` columns and are only viewable by the
--     owner + admins until an admin flips status to 'approved', at which
--     point we refresh `approved_snapshot` from the current row.
--   * Each photo has its own moderation lifecycle — uploading creates a
--     pending row; deletions are immediate (no approval). Public listings
--     only include photos with status='approved'.
--
-- This migration is idempotent: it can be safely re-run.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. profiles: moderation columns
--
-- NOTE: we intentionally use `moderation_status` (not `profile_status`) since
-- the legacy `profile_status` column already holds a different value set
-- (verified / pending / rejected / suspended) used elsewhere. Keeping them
-- separate avoids migrating legacy consumers.
-- -----------------------------------------------------------------------------
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS moderation_status  TEXT        NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS approved_snapshot  JSONB,
  ADD COLUMN IF NOT EXISTS approved_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_submitted_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rejection_reason   TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_by        UUID REFERENCES auth.users(id);

-- Enforce allowed statuses. We wrap in a DO block so it remains idempotent
-- (CHECK constraints can't use ADD IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_moderation_status_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_moderation_status_check
      CHECK (moderation_status IN ('draft', 'pending_review', 'approved', 'rejected'));
  END IF;
END$$;

COMMENT ON COLUMN profiles.moderation_status IS
  'Moderation state. draft=owner is still filling it; pending_review=waiting for admin; approved=live; rejected=needs fixes.';
COMMENT ON COLUMN profiles.approved_snapshot IS
  'JSONB snapshot of the profile at the moment it was last approved. Public pages render from this column so pending edits stay private.';
COMMENT ON COLUMN profiles.approved_at IS 'Timestamp of the most recent approval.';
COMMENT ON COLUMN profiles.last_submitted_at IS 'When the owner last submitted this profile for review.';
COMMENT ON COLUMN profiles.rejection_reason IS 'Optional admin-provided reason when moderation_status=rejected.';
COMMENT ON COLUMN profiles.reviewed_by IS 'Admin auth.users.id who last approved/rejected this profile.';

-- Back-fill: existing rows with completed fields are treated as approved so
-- the public site keeps working. Their approved_snapshot is initialised to
-- the current row so future edits correctly flow through the pending flow.
UPDATE profiles
SET moderation_status = 'approved',
    approved_at       = COALESCE(approved_at, NOW()),
    approved_snapshot = COALESCE(
      approved_snapshot,
      to_jsonb(profiles.*) - 'approved_snapshot'
    )
WHERE moderation_status = 'draft'
  AND full_name IS NOT NULL
  AND full_name <> '';

CREATE INDEX IF NOT EXISTS idx_profiles_moderation_status ON profiles(moderation_status);


-- -----------------------------------------------------------------------------
-- 2. profile_photos: per-photo moderation
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS profile_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url               TEXT NOT NULL,
  storage_path      TEXT,
  is_primary        BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT    NOT NULL DEFAULT 'pending',
  rejection_reason  TEXT,
  sort_order        INT     NOT NULL DEFAULT 0,
  uploaded_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at       TIMESTAMPTZ,
  reviewed_by       UUID REFERENCES auth.users(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profile_photos_status_check'
  ) THEN
    ALTER TABLE profile_photos
      ADD CONSTRAINT profile_photos_status_check
      CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END$$;

-- Only one primary photo per profile. Partial unique index ignores
-- non-primary rows, which is the desired behaviour.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_profile_photos_primary
  ON profile_photos(profile_id)
  WHERE is_primary = TRUE;

CREATE INDEX IF NOT EXISTS idx_profile_photos_profile_status
  ON profile_photos(profile_id, status);

COMMENT ON TABLE profile_photos IS
  'Per-photo moderation. Public queries filter by status=''approved''. Deleting a photo is immediate and does not require approval.';


-- -----------------------------------------------------------------------------
-- 3. Data migration: convert existing profiles.photos (string[]) into rows
--    in profile_photos with status='approved' (live photos are pre-approved).
--    The first photo (or profile_photo if set) is marked primary.
-- -----------------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  photo_url TEXT;
  idx INT;
  has_primary BOOLEAN;
BEGIN
  FOR r IN
    SELECT id, profile_photo, photos
    FROM profiles
    WHERE photos IS NOT NULL
      AND array_length(photos, 1) IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM profile_photos pp WHERE pp.profile_id = profiles.id
      )
  LOOP
    idx := 0;
    has_primary := FALSE;
    FOREACH photo_url IN ARRAY r.photos
    LOOP
      INSERT INTO profile_photos (
        profile_id, url, is_primary, status, sort_order, uploaded_at, reviewed_at
      )
      VALUES (
        r.id,
        photo_url,
        CASE
          WHEN NOT has_primary AND (
            (r.profile_photo IS NOT NULL AND photo_url = r.profile_photo)
            OR (r.profile_photo IS NULL AND idx = 0)
          )
          THEN TRUE
          ELSE FALSE
        END,
        'approved',
        idx,
        NOW(),
        NOW()
      );

      IF (r.profile_photo IS NOT NULL AND photo_url = r.profile_photo)
         OR (r.profile_photo IS NULL AND idx = 0) THEN
        has_primary := TRUE;
      END IF;

      idx := idx + 1;
    END LOOP;
  END LOOP;
END$$;


-- -----------------------------------------------------------------------------
-- 4. RLS (Row Level Security)
-- -----------------------------------------------------------------------------
ALTER TABLE profile_photos ENABLE ROW LEVEL SECURITY;

-- Owners can do anything with their own photos (via profiles.user_id).
DROP POLICY IF EXISTS "profile_photos_owner_all" ON profile_photos;
CREATE POLICY "profile_photos_owner_all" ON profile_photos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_photos.profile_id
        AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = profile_photos.profile_id
        AND p.user_id = auth.uid()
    )
  );

-- Public (anon + authenticated) can READ only approved photos.
DROP POLICY IF EXISTS "profile_photos_public_read_approved" ON profile_photos;
CREATE POLICY "profile_photos_public_read_approved" ON profile_photos
  FOR SELECT
  USING (status = 'approved');


-- -----------------------------------------------------------------------------
-- Done. Verify with:
--   SELECT profile_status, COUNT(*) FROM profiles GROUP BY 1;
--   SELECT status, COUNT(*) FROM profile_photos GROUP BY 1;
-- -----------------------------------------------------------------------------
