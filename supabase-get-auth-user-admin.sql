-- =============================================================================
-- get_auth_user_admin(p_user_id uuid)
-- -----------------------------------------------------------------------------
-- Superadmin account actions call GoTrue admin API (getUserById). On some
-- projects that endpoint returns "Database error loading user" while auth.users
-- is readable in Postgres. This RPC mirrors list_all_auth_users: SECURITY DEFINER
-- read of auth.users for merge-before-update suspend/unsuspend and delete audit.
--
-- Apply after list_all_auth_users pattern; DROP required if signature changes.
-- =============================================================================

drop function if exists public.get_auth_user_admin(uuid);

create or replace function public.get_auth_user_admin(p_user_id uuid)
returns table (
  id uuid,
  email text,
  phone text,
  raw_app_meta_data jsonb
)
language sql
security definer
set search_path = public, auth, pg_temp
stable
as $$
  select u.id,
         u.email::text,
         u.phone::text,
         coalesce(u.raw_app_meta_data, '{}'::jsonb)
  from auth.users u
  where u.id = p_user_id;
$$;

revoke all on function public.get_auth_user_admin(uuid) from public, anon, authenticated;
grant execute on function public.get_auth_user_admin(uuid) to service_role;

comment on function public.get_auth_user_admin(uuid) is
  'Service-role only: read one auth.users row for superadmin suspend/delete when GoTrue getUserById fails.';
