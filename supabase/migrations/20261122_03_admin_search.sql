-- =====================================================================
-- 20261122_03_admin_search.sql
--
-- Global admin search: one query string matched against
--   accounts (auth users): phone digits, account code (U…), account name
--   profiles: member ID (LB…/LG…), name, contact digits
-- Service role only (called from /api/superadmin/search). Idempotent.
-- =====================================================================

create or replace function public.admin_search(p_q text, p_limit int default 8)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_q text := trim(coalesce(p_q, ''));
  v_digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
  v_like text := '%' || v_q || '%';
begin
  if length(v_q) < 2 then
    return jsonb_build_object('accounts', '[]'::jsonb, 'profiles', '[]'::jsonb);
  end if;
  -- Ignore a leading 91 country code for phone matching.
  if length(v_digits) > 10 and left(v_digits, 2) = '91' then
    v_digits := substr(v_digits, 3);
  end if;

  return jsonb_build_object(
    'accounts', (
      select coalesce(jsonb_agg(a order by a->>'createdAt' desc), '[]'::jsonb) from (
        select jsonb_build_object(
                 'id', u.id,
                 'phone', u.phone,
                 'name', coalesce(u.raw_user_meta_data->>'full_name', ''),
                 'accountCode', c.account_code,
                 'createdAt', u.created_at,
                 'suspended', coalesce((u.raw_app_meta_data->>'account_suspended')::boolean, false),
                 'profileCount', (select count(*) from profiles p where p.user_id = u.id and p.deleted_at is null)
               ) a
          from auth.users u
          left join user_account_codes c on c.user_id = u.id
         where (length(v_digits) >= 4 and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '%' || v_digits || '%')
            or c.account_code ilike v_like
            or coalesce(u.raw_user_meta_data->>'full_name', '') ilike v_like
         limit p_limit
      ) x
    ),
    'profiles', (
      select coalesce(jsonb_agg(p), '[]'::jsonb) from (
        select jsonb_build_object(
                 'id', pr.id,
                 'publicId', pr.public_id,
                 'name', pr.full_name,
                 'gender', pr.gender,
                 'city', pr.city,
                 'status', pr.moderation_status,
                 'deleted', pr.deleted_at is not null,
                 'userId', pr.user_id,
                 'photo', pr.profile_photo
               ) p
          from profiles pr
         where pr.public_id ilike v_like
            or pr.full_name ilike v_like
            or (length(v_digits) >= 4 and (
                  regexp_replace(coalesce(pr.contact, ''), '\D', '', 'g') like '%' || v_digits || '%'
                  or pr.contacts::text like '%' || v_digits || '%'))
         order by pr.deleted_at nulls first, pr.updated_at desc
         limit p_limit
      ) y
    )
  );
end;
$$;

revoke all on function public.admin_search(text, int) from public, anon, authenticated;
grant execute on function public.admin_search(text, int) to service_role;
