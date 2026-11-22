-- =====================================================================
-- 20261122_01_lock_down_profiles.sql
--
-- Closes two critical holes confirmed on Test (2026-11-22):
--   1. `profiles` SELECT policy was USING (true): anyone with the public
--      anon key could read every column (contacts, email, address…) of
--      every profile, including drafts and unapproved rows.
--   2. `profiles` UPDATE policy had no column guard: an owner could set
--      their own role='superadmin', moderation_status='approved', etc.
--
-- What this does:
--   A. `public_profiles` view: safe columns only, approved/visible rows
--      only, PII stripped from `approved_snapshot` too. Public browsing
--      reads this view.
--   B. `profiles` table readable only by its owner or a superadmin.
--   C. Trigger guarding admin-only columns for non-admin writers, and
--      enforcing the 3-profiles-per-account limit on insert.
--   D. Server-side public_id assignment (removes client-side race and
--      the client's need to read every profile's public_id).
--   E. Trigger stopping owners from approving their own photos.
--
-- Idempotent. Apply to TEST first. Rollback: 20261122_01_rollback.sql
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- Helper: superadmin check (same definition as hardening file).
-- ---------------------------------------------------------------------
create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'superadmin'
  );
$$;
grant execute on function public.is_superadmin() to authenticated;

-- True for end-user requests (anon/authenticated JWT) that are not admins.
-- Service-role API calls and SQL-editor sessions have no auth.uid().
create or replace function public.is_restricted_writer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and not public.is_superadmin();
$$;

-- ---------------------------------------------------------------------
-- D. public_id assignment: L + B(female)/G(male) + YYMM (IST) + 5-digit
--    global sequence. Same format as src/lib/memberId.ts.
-- ---------------------------------------------------------------------
create or replace function public.next_profile_public_id(p_gender text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_seq int;
  v_flag text := case when p_gender = 'female' then 'B' else 'G' end;
begin
  perform pg_advisory_xact_lock(hashtext('profiles.public_id'));
  select coalesce(max(substring(public_id from 7)::int), 0) + 1
    into v_seq
    from public.profiles
   where public_id ~ '^L[BGS][0-9]{8,9}$';
  return 'L' || v_flag || to_char(now() at time zone 'Asia/Kolkata', 'YYMM')
             || lpad(v_seq::text, 5, '0');
end;
$$;
revoke all on function public.next_profile_public_id(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- C. Guard trigger on profiles.
-- ---------------------------------------------------------------------
create or replace function public.profiles_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if public.is_restricted_writer() then
      if (select count(*) from public.profiles
           where user_id = new.user_id and deleted_at is null) >= 3 then
        raise exception 'An account can have at most 3 profiles'
          using errcode = 'check_violation';
      end if;
      new.role := 'user';
      new.verified := false;
      new.profile_status := 'pending';
      if coalesce(new.moderation_status, '') not in ('draft', 'pending_review') then
        new.moderation_status := 'pending_review';
      end if;
      new.approved_snapshot := null;
      new.approved_at := null;
      new.reviewed_by := null;
      new.rejection_reason := null;
      new.deleted_at := null;  new.deleted_reason := null;
      new.deleted_note := null; new.deleted_by := null;
      new.is_blocked := false; new.blocked_reason := null;
      new.blocked_at := null;  new.blocked_by := null;
      new.public_id := null;   -- always server-assigned for end users
    end if;
    if new.public_id is null and coalesce(new.moderation_status, '') <> 'draft' then
      new.public_id := public.next_profile_public_id(new.gender);
    end if;
    return new;
  end if;

  -- UPDATE
  if public.is_restricted_writer() then
    new.user_id := old.user_id;
    new.role := old.role;
    new.verified := old.verified;
    new.profile_status := old.profile_status;
    new.trust_score := old.trust_score;
    new.approved_snapshot := old.approved_snapshot;
    new.approved_at := old.approved_at;
    new.reviewed_by := old.reviewed_by;
    -- Owners may clear a rejection reason only when re-submitting.
    if not (new.moderation_status = 'pending_review' and new.rejection_reason is null) then
      new.rejection_reason := old.rejection_reason;
    end if;
    new.deleted_at := old.deleted_at;  new.deleted_reason := old.deleted_reason;
    new.deleted_note := old.deleted_note; new.deleted_by := old.deleted_by;
    new.is_blocked := old.is_blocked;  new.blocked_reason := old.blocked_reason;
    new.blocked_at := old.blocked_at;  new.blocked_by := old.blocked_by;
    -- Owners may only move a profile to draft or (re)submit for review.
    if new.moderation_status is distinct from old.moderation_status
       and coalesce(new.moderation_status, '') not in ('draft', 'pending_review') then
      new.moderation_status := old.moderation_status;
    end if;
    -- public_id is immutable for owners once set.
    if old.public_id is not null then
      new.public_id := old.public_id;
    end if;
  end if;
  if new.public_id is null and coalesce(new.moderation_status, '') <> 'draft' then
    new.public_id := public.next_profile_public_id(new.gender);
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard
  before insert or update on public.profiles
  for each row execute function public.profiles_guard();

-- One-time backfill of missing public_ids for non-draft rows (trigger assigns).
update public.profiles set public_id = null where public_id is null;

-- ---------------------------------------------------------------------
-- B. profiles RLS: owner or superadmin only.
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "Anyone can view profiles" on public.profiles;
drop policy if exists "Owners and admins can view profiles" on public.profiles;
create policy "Owners and admins can view profiles" on public.profiles
  for select using (auth.uid() = user_id or public.is_superadmin());

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- (INSERT policy "Users can insert their own profile" is unchanged.)

-- ---------------------------------------------------------------------
-- A. public_profiles view (runs as owner, bypassing RLS by design;
--    exposes only safe columns and publicly visible rows).
-- ---------------------------------------------------------------------
create or replace function public.sanitize_profile_snapshot(s jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when s is null then null
    else (
      (s - array[
        'email', 'contact', 'contact_type', 'contacts', 'address',
        'account_holder_name', 'nickname', 'role', 'trust_score',
        'rejection_reason', 'reviewed_by', 'deleted_reason', 'deleted_note',
        'deleted_by', 'blocked_reason', 'blocked_by', 'draft_current_step',
        'approved_snapshot'
      ])
      - (case when (s->>'show_annual_income') = 'false' then 'annual_income' else '' end)
      - (case when (s->>'show_partner_preferences') = 'false' then 'partner_preference' else '' end)
      - (case when (s->>'about_me_visible') = 'false' then 'about_me' else '' end)
    )
  end;
$$;

drop view if exists public.public_profiles;
create view public.public_profiles
with (security_invoker = false)
as
select
  p.id, p.user_id, p.public_id,
  p.full_name, p.date_of_birth, p.gender, p.marital_status, p.caste, p.sub_caste,
  p.height, p.languages_known, p.mother_tongue,
  case when p.about_me_visible is false then null else p.about_me end as about_me,
  p.about_me_visible, p.hobbies,
  p.time_of_birth, p.place_of_birth, p.rashi, p.nakshatra, p.horoscope_other_details,
  p.qualification, p.profession_type, p.profession, p.company_name,
  case when p.show_annual_income is false then null else p.annual_income end as annual_income,
  p.show_annual_income,
  p.father_name, p.father_occupation, p.mother_name, p.mother_occupation,
  p.food_habits, p.sibling_details, p.family_other_details,
  p.city, p.district, p.state, p.country,
  p.profile_photo, p.photos,
  p.verified, p.profile_status, p.profile_type, p.managed_by, p.relationship,
  case when p.show_partner_preferences is false then null else p.partner_preference end as partner_preference,
  p.show_partner_preferences,
  p.created_at, p.updated_at,
  p.moderation_status, p.approved_at, p.last_submitted_at,
  public.sanitize_profile_snapshot(p.approved_snapshot) as approved_snapshot,
  p.deleted_at
from public.profiles p
where p.deleted_at is null
  and coalesce(p.is_blocked, false) = false
  and coalesce(p.profile_status, '') <> 'suspended'
  and (p.moderation_status = 'approved' or p.approved_snapshot is not null);

grant select on public.public_profiles to anon, authenticated;

-- ---------------------------------------------------------------------
-- E. profile_photos: owners cannot approve/reject their own photos.
-- ---------------------------------------------------------------------
create or replace function public.profile_photos_guard()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.is_restricted_writer() then
    if tg_op = 'INSERT' then
      new.status := 'pending';
    elsif new.status is distinct from old.status then
      new.status := old.status;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profile_photos_guard on public.profile_photos;
create trigger profile_photos_guard
  before insert or update on public.profile_photos
  for each row execute function public.profile_photos_guard();

commit;
