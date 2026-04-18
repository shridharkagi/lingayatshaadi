-- =============================================================================
-- Migration: Public ID v1 (LS+YY+MM+NNNN, 10 chars)  ->  v2 (L[BG]+YY+MM+NNNNN, 11 chars)
--
-- v2 format:
--   L  = static prefix (LingayatShaadi)
--   B  = Bride  (gender = 'female')
--   G  = Groom  (gender = 'male')
--   YY = 2-digit year of registration
--   MM = 2-digit month of registration
--   NNNNN = 5-digit zero-padded incremental sequence,
--           shared across BOTH genders, scoped to (year, month).
--
-- Strategy:
--   For every row whose public_id matches the legacy "LS\d{8}" pattern,
--   compute the new ID by:
--     1. Take YY, MM, and the 4-digit sequence from the legacy ID.
--     2. Pad the sequence to 5 digits (preserving the original ordering).
--     3. Choose the prefix letter based on `gender`.
--   Rows already in the new format are skipped (idempotent).
--
-- This is safe to run multiple times.
-- =============================================================================

BEGIN;

-- 1. Sanity check: ensure the column exists and is unique.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS public_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_id_unique_idx
  ON profiles(public_id)
  WHERE public_id IS NOT NULL;

-- 2. Migrate legacy IDs in-place. Preserves the YY/MM/seq, just changes
--    "LS" -> "LB"/"LG" and pads the seq to 5 digits.
UPDATE profiles
SET public_id =
  'L'
  || CASE WHEN lower(gender) = 'female' THEN 'B' ELSE 'G' END
  || substring(public_id FROM 3 FOR 2)            -- YY
  || substring(public_id FROM 5 FOR 2)            -- MM
  || lpad(substring(public_id FROM 7 FOR 4), 5, '0')  -- 4-digit seq -> 5-digit
WHERE public_id ~ '^LS[0-9]{8}$';

-- 3. Backfill missing public_ids (rows that never had one).
--    Generates new-format IDs using created_at YY/MM and a per-cohort sequence
--    that continues from the highest existing seq for that month.
WITH cohorts AS (
  SELECT
    id,
    gender,
    to_char(created_at AT TIME ZONE 'UTC', 'YY') AS yy,
    to_char(created_at AT TIME ZONE 'UTC', 'MM') AS mm,
    row_number() OVER (
      PARTITION BY to_char(created_at AT TIME ZONE 'UTC', 'YYMM')
      ORDER BY created_at, id
    ) AS rn
  FROM profiles
  WHERE public_id IS NULL OR public_id = ''
),
existing_max AS (
  SELECT
    substring(public_id FROM 3 FOR 4) AS yymm,
    MAX(
      CASE
        WHEN public_id ~ '^L[BG][0-9]{9}$' THEN substring(public_id FROM 7 FOR 5)::int
        ELSE 0
      END
    ) AS max_seq
  FROM profiles
  WHERE public_id ~ '^L[BG][0-9]{9}$'
  GROUP BY substring(public_id FROM 3 FOR 4)
)
UPDATE profiles p
SET public_id =
  'L'
  || CASE WHEN lower(c.gender) = 'female' THEN 'B' ELSE 'G' END
  || c.yy
  || c.mm
  || lpad((COALESCE(em.max_seq, 0) + c.rn)::text, 5, '0')
FROM cohorts c
LEFT JOIN existing_max em ON em.yymm = (c.yy || c.mm)
WHERE p.id = c.id;

COMMIT;

-- =============================================================================
-- Verify (run separately):
--
--   SELECT public_id, gender, full_name
--     FROM profiles
--    ORDER BY public_id;
--
-- All rows should now match  ^L[BG][0-9]{9}$
-- =============================================================================
