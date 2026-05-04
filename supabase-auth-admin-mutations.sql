-- =============================================================================
-- Bypass broken GoTrue Admin HTTP API (getUser/update/delete) for superadmin
-- account actions. Same projects return "Database error loading user" on PATCH
-- /admin/users/:id while Postgres auth.users is writable.
--
-- Apply in Supabase SQL Editor (same DB as NEXT_PUBLIC_SUPABASE_URL).
-- Grant is service_role only — matches list_all_auth_users / get_auth_user_admin.
-- =============================================================================

drop function if exists public.admin_set_auth_app_metadata(uuid, jsonb);
drop function if exists public.admin_delete_auth_user(uuid);

create or replace function public.admin_set_auth_app_metadata(
  p_user_id uuid,
  p_raw_app_meta jsonb
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update auth.users
  set
    raw_app_meta_data = coalesce(p_raw_app_meta, '{}'::jsonb),
    updated_at = now()
  where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

create or replace function public.admin_delete_auth_user(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  delete from auth.users where id = p_user_id;
  if not found then
    raise exception 'User not found';
  end if;
end;
$$;

revoke all on function public.admin_set_auth_app_metadata(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.admin_set_auth_app_metadata(uuid, jsonb) to service_role;

revoke all on function public.admin_delete_auth_user(uuid) from public, anon, authenticated;
grant execute on function public.admin_delete_auth_user(uuid) to service_role;

comment on function public.admin_set_auth_app_metadata(uuid, jsonb) is
  'Service-role: set auth.users.raw_app_meta_data when GoTrue updateUserById fails.';
comment on function public.admin_delete_auth_user(uuid) is
  'Service-role: delete auth.users row when GoTrue deleteUser fails.';
