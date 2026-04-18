-- Adds a structured `contacts` JSONB column to `profiles` so each profile can
-- carry a primary contact + up to N alternate contacts, each with metadata
-- (whom it belongs to, whether to show on the public profile, and preferred
-- contact channels — Call / WhatsApp / SMS).
--
-- Shape per entry:
--   {
--     "number":         "9876543210",
--     "belongsTo":      "Self" | "Father" | ... | "Other",
--     "belongsToOther": "Maternal Uncle",     -- only when belongsTo === "Other"
--     "showOnProfile":  true,
--     "methods":        ["Call", "WhatsApp"]
--   }
--
-- Run this once in the Supabase SQL editor. Safe to re-run.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS contacts JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_profiles_contacts_gin
  ON profiles USING GIN (contacts);

-- Backfill: when only the legacy single `contact` column has a value, seed the
-- JSONB array with a primary entry so existing profiles render correctly.
UPDATE profiles
   SET contacts = jsonb_build_array(
     jsonb_build_object(
       'number',         contact,
       'belongsTo',      COALESCE(contact_type, 'Self'),
       'showOnProfile',  true,
       'methods',        jsonb_build_array('Call')
     )
   )
 WHERE (contacts IS NULL OR contacts = '[]'::jsonb)
   AND contact IS NOT NULL
   AND contact <> '';
