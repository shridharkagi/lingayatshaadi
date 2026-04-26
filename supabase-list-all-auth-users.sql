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

create or replace function public.list_all_auth_users()
returns table (
  id uuid,
  email text,
  phone text,
  created_at timestamptz,
  raw_user_meta_data jsonb
)
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  -- auth.users.email and auth.users.phone are declared as varchar(255), so we
  -- explicitly cast to text here. RETURNS TABLE does an exact type check and
  -- would otherwise raise "structure of query does not match function result
  -- type". We deliberately do NOT filter banned/deleted rows here so the
  -- superadmin UI can still surface them; the admin layer can decide what to
  -- show. Keeping the function tolerant to schema variations across gotrue
  -- versions also avoids surprises on upgrade.
  select u.id,
         u.email::text,
         u.phone::text,
         u.created_at,
         u.raw_user_meta_data
  from auth.users u
  order by u.created_at asc nulls last;
$$;

revoke all on function public.list_all_auth_users() from public, anon, authenticated;
grant execute on function public.list_all_auth_users() to service_role;

comment on function public.list_all_auth_users() is
  'Server-only listing of every active auth.users row with raw_user_meta_data. Used by the superadmin user-list page because gotrue.admin.listUsers is unreliable on this project and PostgREST does not expose the auth schema. Callable only via service_role.';
