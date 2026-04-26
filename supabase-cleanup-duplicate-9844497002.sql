-- =============================================================================
-- supabase-cleanup-duplicate-9844497002.sql
-- -----------------------------------------------------------------------------
-- Purpose
--   Diagnose and clean up duplicate auth.users rows for the phone number
--   `9844497002`. As of 2026-04-26 this number had at least three auth rows:
--
--     • U26032 (created 02/03/2026): phone='919844497002', email NULL,
--       metadata NULL.   <- JUNK — residue of an older OTP-login auto-create
--                            bug. Has no profile, no metadata, no email.
--     • U26044 (created 18/04/2026): phone='+919844497002', email
--       'phone_9844497002@phone.otp.lingayatshaadi' (LEGACY format, no `.in`),
--       metadata={Shridhar Kagi}.   <- THE REAL ACCOUNT — keep this.
--     • U26049 (created 26/04/2026): phone NULL, email
--       'phone_9844497002@phone.otp.lingayatshaadi.in' (current format),
--       metadata NULL.   <- JUNK — created by the magiclink auto-create bug
--                            during a login attempt.
--
--   The TypeScript-side bugs are already fixed in this commit:
--     1. `pickBestMatch` now scores rows by completeness so it can no longer
--        pick the U26032-style stub when U26044 is also a candidate.
--     2. `issueMagicLinkSession` now uses `type=recovery` so gotrue can no
--        longer auto-create users on a missed lookup.
--     3. `handleLoginOrReset` and `/reset-password` now refuse to synthesise
--        a fallback email when the matched row has none.
--
--   This script removes the existing junk rows so the data state matches the
--   fixed code path. It is intentionally split into a SAFE diagnose section
--   (run first, eyeball output) and a DESTRUCTIVE delete section (commented
--   out — uncomment AFTER you have eyeballed the diagnose output).
--
-- How to use
--   1. Open Supabase → SQL editor for this project.
--   2. Run "STEP 1 — DIAGNOSE" first. Confirm the result matches the table
--      above (or whatever the current real state is).
--   3. Run "STEP 2 — BACKUP" to copy the rows to a backup table so you can
--      restore if something goes wrong.
--   4. ONLY THEN, uncomment and run "STEP 3 — DELETE" with the actual UUIDs
--      from STEP 1. Do NOT paste UUIDs that you have not personally verified
--      against the diagnose output.
--   5. Re-run STEP 1 to confirm only the canonical row remains.
-- =============================================================================


-- STEP 1 — DIAGNOSE -----------------------------------------------------------
-- Lists every auth.users row that matches the phone in any way (E.164, no-plus,
-- 10-digit) or the synthetic email in either format (current `.in` and legacy
-- without). Run this FIRST. The "score" column mirrors the application-level
-- pickBestMatch heuristic — the highest-scoring row is the canonical one.

select
  u.id,
  u.email,
  u.phone,
  u.created_at,
  u.raw_user_meta_data,
  -- score: phone-match=4, has email=2, has metadata=1
  (case when u.phone in ('+919844497002', '919844497002', '9844497002') then 4 else 0 end)
    + (case when coalesce(nullif(trim(u.email::text), ''), '') <> '' then 2 else 0 end)
    + (case when u.raw_user_meta_data is not null and u.raw_user_meta_data <> '{}'::jsonb then 1 else 0 end)
    as completeness_score,
  -- joined profiles for context
  (
    select count(*) from public.profiles p
    where p.user_id = u.id and p.deleted_at is null
  ) as live_profile_count,
  (
    select count(*) from public.user_account_codes c
    where c.user_id = u.id
  ) as account_code_count
from auth.users u
where u.phone in ('+919844497002', '919844497002', '9844497002')
   or lower(u.email::text) in (
        'phone_9844497002@phone.otp.lingayatshaadi.in',
        'phone_9844497002@phone.otp.lingayatshaadi'
      )
order by completeness_score desc, u.created_at asc;


-- STEP 2 — BACKUP -------------------------------------------------------------
-- Capture the rows we are about to delete into a side table so we can restore
-- if anything looks off after the cleanup. Idempotent — safe to re-run.

create table if not exists public._auth_users_backup_9844497002 (
  id uuid primary key,
  email text,
  phone text,
  created_at timestamptz,
  raw_user_meta_data jsonb,
  encrypted_password text,
  backed_up_at timestamptz not null default now()
);

insert into public._auth_users_backup_9844497002
  (id, email, phone, created_at, raw_user_meta_data, encrypted_password)
select
  u.id, u.email::text, u.phone::text, u.created_at, u.raw_user_meta_data,
  u.encrypted_password
from auth.users u
where u.phone in ('+919844497002', '919844497002', '9844497002')
   or lower(u.email::text) in (
        'phone_9844497002@phone.otp.lingayatshaadi.in',
        'phone_9844497002@phone.otp.lingayatshaadi'
      )
on conflict (id) do nothing;

-- Sanity check: how many rows did we back up?
select count(*) as backed_up_rows from public._auth_users_backup_9844497002;


-- STEP 3 — DELETE  (DESTRUCTIVE — KEEP COMMENTED UNTIL VERIFIED)
-- ----------------------------------------------------------------------------
-- Replace the UUIDs below with the EXACT ids returned by STEP 1 for the
-- ROWS YOU WANT TO REMOVE. The canonical row (highest completeness score —
-- normally the one that has phone+email+metadata) MUST NOT appear here.
--
-- Why two passes:
--   • auth.users has cascading FKs (sessions, identities, refresh_tokens,
--     mfa_*, audit log links). Deleting from auth.users handles those.
--   • public.profiles, public.user_account_codes, etc. may also reference
--     user_id — Supabase normally keeps these via ON DELETE CASCADE, but if
--     any of them are ON DELETE RESTRICT the auth.users delete will error.
--     If that happens, run the public-side deletes first (commented below)
--     and retry.
--
-- FROM YOUR 26/04/2026 SCREENSHOT THE JUNK UUIDs ARE LIKELY:
--   • cba2e744-69d3-43bf-8931-ce29640cd0b5  (U26049, just-created junk)
--   • <UUID-of-U26032>                       (the 02/03/2026 phone-only stub —
--                                              not visible in the auth.users
--                                              screenshot you shared; copy it
--                                              from the STEP 1 result)
--
-- IMPORTANT — DO NOT delete 436aac16-492c-4c2a-8ac3-5c2747a8df96. That is
-- the real account row (U26044, Shridhar Kagi).

-- Optional: clean up dangling public.* rows first if cascades aren't set.
-- delete from public.user_account_codes
--   where user_id in ('<JUNK_UUID_1>', '<JUNK_UUID_2>');
-- delete from public.profiles
--   where user_id in ('<JUNK_UUID_1>', '<JUNK_UUID_2>')
--     and deleted_at is null
--     and account_holder_name is null
--     and full_name is null;

-- The actual auth.users delete:
-- delete from auth.users
--   where id in (
--     '<JUNK_UUID_1>',  -- e.g. cba2e744-69d3-43bf-8931-ce29640cd0b5
--     '<JUNK_UUID_2>'   -- e.g. UUID of U26032
--   );


-- STEP 4 — VERIFY -------------------------------------------------------------
-- Re-run after STEP 3. Should now return exactly ONE row — the real account.

-- (Same query as STEP 1; uncomment to use)
-- select u.id, u.email, u.phone, u.created_at, u.raw_user_meta_data
-- from auth.users u
-- where u.phone in ('+919844497002', '919844497002', '9844497002')
--    or lower(u.email::text) in (
--         'phone_9844497002@phone.otp.lingayatshaadi.in',
--         'phone_9844497002@phone.otp.lingayatshaadi'
--       )
-- order by u.created_at asc;
