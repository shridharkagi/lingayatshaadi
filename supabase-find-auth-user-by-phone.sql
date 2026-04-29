-- =============================================================================
-- find_auth_user_by_phone
-- -----------------------------------------------------------------------------
-- Purpose
--   Reliable server-side lookup for Supabase Auth users by phone number.
--
-- Why this exists
--   PostgREST does not expose the `auth` schema by default ("Invalid schema:
--   auth"), and `gotrue.admin.listUsers` has historically returned
--   "Database error finding users" on this project. Both standard paths from
--   the Supabase JS client therefore fail, leaving our login/signup flow unable
--   to detect existing accounts.
--
--   This function runs with `security definer` so it is executed as the
--   function owner (postgres) and can read `auth.users` regardless of the
--   caller's role. It is intentionally exposed only to `service_role` so it
--   cannot be called from the browser/anon client.
--
-- Matching rules (mirror server/authUsers.ts)
--   - phone column equals either the +E.164 form (+91xxxxxxxxxx) or the bare
--     digits form (91xxxxxxxxxx) — GoTrue has used both historically.
--   - email equals either the current synthetic format
--       phone_<digits10>@phone.otp.lingayatbandhu.com
--     or the legacy format (no TLD)
--       phone_<digits10>@phone.otp.lingayatbandhu
--
-- Returned ordering (handled in TS, but kept stable here)
--   Rows whose `phone` column actually matches the input are returned first,
--   then by `created_at ASC` so the oldest "real" account wins over freshly
--   created junk duplicates with NULL phone.
-- =============================================================================

create or replace function public.find_auth_user_by_phone(
  p_phone_e164 text,
  p_digits10 text
)
returns table (
  id uuid,
  email text,
  phone text,
  created_at timestamptz,
  raw_user_meta_data jsonb
)
language plpgsql
security definer
set search_path = public, auth, pg_temp
stable
as $$
declare
  v_phone_stripped text;
  v_email_new text;
  v_email_legacy text;
begin
  if p_phone_e164 is null or length(trim(p_phone_e164)) = 0 then
    return;
  end if;
  if p_digits10 is null or length(trim(p_digits10)) = 0 then
    return;
  end if;

  v_phone_stripped := case
    when left(p_phone_e164, 1) = '+' then substring(p_phone_e164 from 2)
    else p_phone_e164
  end;
  v_email_new    := lower('phone_' || p_digits10 || '@phone.otp.lingayatbandhu.com');
  v_email_legacy := lower('phone_' || p_digits10 || '@phone.otp.lingayatbandhu');

  -- auth.users.email and auth.users.phone are declared as varchar(255), so we
  -- explicitly cast to text here. RETURNS TABLE in plpgsql does an exact type
  -- check (no implicit varchar -> text coercion) and would otherwise raise
  -- "structure of query does not match function result type".
  return query
    select u.id,
           u.email::text,
           u.phone::text,
           u.created_at,
           u.raw_user_meta_data
    from auth.users u
    where
      u.phone = p_phone_e164
      or u.phone = v_phone_stripped
      or u.phone = ('+' || v_phone_stripped)
      or lower(u.email) = v_email_new
      or lower(u.email) = v_email_legacy
    order by
      case
        when u.phone in (p_phone_e164, v_phone_stripped, '+' || v_phone_stripped) then 0
        else 1
      end,
      u.created_at asc nulls last;
end;
$$;

revoke all on function public.find_auth_user_by_phone(text, text) from public, anon, authenticated;
grant execute on function public.find_auth_user_by_phone(text, text) to service_role;

comment on function public.find_auth_user_by_phone(text, text) is
  'Server-only lookup of auth.users by phone or synthetic phone-OTP email. Used by the phone OTP login/signup pipeline because PostgREST does not expose the auth schema and gotrue listUsers is unreliable on this project. Callable only via service_role.';
