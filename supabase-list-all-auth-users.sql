-- =============================================================================
-- list_all_auth_users
-- -----------------------------------------------------------------------------
-- Purpose
--   Return every Supabase Auth user with their metadata for server-side
--   admin views (e.g. /superadmin/users).
--
-- Why this exists
--   The standard `gotrue.admin.listUsers` API returns
--   "Database error finding users" on this project, and PostgREST does not
--   expose the `auth` schema by default. Both standard read paths fail,
--   forcing the admin user-list page onto a profiles-only fallback that
--   loses `auth.users.raw_user_meta_data` — so account-holder names set
--   during signup never reach the UI.
--
--   This function runs with `security definer` so it executes as the
--   function owner (postgres) and can read `auth.users` regardless of the
--   caller's role. It is intentionally exposed only to `service_role` so it
--   cannot be called from the browser/anon client.
--
-- Sibling
--   Mirrors the pattern used by `find_auth_user_by_phone` (see
--   supabase-find-auth-user-by-phone.sql). Apply both for a fully working
--   superadmin user list and phone-based account lookup.
-- =============================================================================
--
-- Re-applying this file after changing RETURNS TABLE (...) requires DROP first:
-- Postgres error 42P13 — CREATE OR REPLACE cannot change the function result type.

drop function if exists public.list_all_auth_users();

create or replace function public.list_all_auth_users()
returns table (
  id uuid,
  email text,
  phone text,
  created_at timestamptz,
  raw_user_meta_data jsonb,
  raw_app_meta_data jsonb
)
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  -- Includes raw_app_meta_data for account-level suspend flags (no banned_until
  -- here — column varies by GoTrue version; ban state may still exist from API).
  select u.id,
         u.email::text,
         u.phone::text,
         u.created_at,
         u.raw_user_meta_data,
         coalesce(u.raw_app_meta_data, '{}'::jsonb)
  from auth.users u
  order by u.created_at asc nulls last;
$$;

revoke all on function public.list_all_auth_users() from public, anon, authenticated;
grant execute on function public.list_all_auth_users() to service_role;

comment on function public.list_all_auth_users() is
  'Server-only listing of every active auth.users row with raw_user_meta_data. Used by the superadmin user-list page because gotrue.admin.listUsers is unreliable on this project and PostgREST does not expose the auth schema. Callable only via service_role.';
