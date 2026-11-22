-- =====================================================================
-- 20261122_07_admin_accounts_plans.sql
--
-- admin_list_accounts v3 (replaces 06): plan filter (p_plan), 'inactive'
-- tab (no login in 30 days), contact quota per account (limits + used,
-- used today in IST), plan counts. Service role only. Idempotent.
-- =====================================================================

drop function if exists public.admin_list_accounts(text, text, text, int, int, timestamptz, timestamptz, text);

create or replace function public.admin_list_accounts(
  p_q text default '', p_filter text default 'all', p_sort text default 'newest',
  p_limit int default 25, p_offset int default 0,
  p_from timestamptz default null, p_to timestamptz default null, p_date_on text default 'joined',
  p_plan text default '')
returns jsonb
language plpgsql stable security definer
set search_path = public, auth
as $$
declare
  v_q text := trim(coalesce(p_q, ''));
  v_digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
  result jsonb;
begin
  if length(v_digits) > 10 and left(v_digits, 2) = '91' then v_digits := substr(v_digits, 3); end if;
  with base as (
    select u.id, u.phone, u.created_at, u.last_sign_in_at,
           coalesce(u.raw_user_meta_data->>'full_name', '') as name,
           coalesce((u.raw_app_meta_data->>'account_suspended')::boolean, false) as suspended,
           c.account_code,
           (select count(*) from profiles p where p.user_id = u.id and p.deleted_at is null) as profiles,
           (select count(*) from profiles p where p.user_id = u.id and p.deleted_at is null and p.moderation_status = 'approved') as live_profiles,
           (select count(*) from profiles p where p.user_id = u.id and p.deleted_at is null and p.moderation_status = 'pending_review') as pending_profiles,
           (select jsonb_build_object('name', s.plan_display_name, 'price', coalesce(s.price_snapshot, 0), 'expiresAt', s.expires_at,
                                      'startsAt', s.starts_at,
                                      'totalLimit', nullif(s.total_contact_views_snapshot, 0),
                                      'dailyLimit', nullif(s.daily_contact_view_limit_snapshot, 0))
              from admin_subscriptions_v s
             where s.account_id = u.id and s.status = 'active' and s.expires_at > now()
             order by s.expires_at desc limit 1) as plan,
           (select count(*) from contact_views cv join profiles p on p.id = cv.viewer_id where p.user_id = u.id) as contact_views,
           (select count(*) from contact_views cv join profiles p on p.id = cv.viewer_id
             where p.user_id = u.id
               and cv.viewed_at >= (date_trunc('day', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata')) as contact_views_today
      from auth.users u
      left join user_account_codes c on c.user_id = u.id
  ),
  scoped as (   -- search + date; tab filter applied below so tabs can show counts
    select b.*,
           case when p_date_on = 'last_login' then b.last_sign_in_at else b.created_at end as date_key
      from base b
     where (v_q = ''
            or (length(v_digits) >= 3 and regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') like '%' || v_digits || '%')
            or b.account_code ilike '%' || v_q || '%'
            or b.name ilike '%' || v_q || '%')
  ),
  dated as (
    select * from scoped s
     where (p_from is null or s.date_key >= p_from)
       and (p_to is null or s.date_key < p_to)
  ),
  tagged as (
    select d.*,
           coalesce((d.plan->>'price')::numeric, 0) > 0 as is_paid,
           d.plan is not null and (d.plan->>'expiresAt')::timestamptz < now() + interval '30 days' as is_expiring,
           d.last_sign_in_at is null or d.last_sign_in_at < now() - interval '30 days' as is_inactive
      from dated d
     where coalesce(p_plan, '') = ''
        or p_plan = 'none' and d.plan is null
        or p_plan = 'paid' and coalesce((d.plan->>'price')::numeric, 0) > 0
        or lower(d.plan->>'name') = lower(p_plan)
  ),
  filtered as (
    select * from tagged t
     where case p_filter
             when 'suspended' then t.suspended
             when 'paid' then t.is_paid
             when 'no_plan' then t.plan is null
             when 'expiring' then t.is_expiring
             when 'inactive' then t.is_inactive
             when 'no_profile' then t.profiles = 0
             when 'pending' then t.pending_profiles > 0
             else true end
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'counts', (select jsonb_build_object(
                 'all', count(*),
                 'paid', count(*) filter (where is_paid),
                 'no_plan', count(*) filter (where plan is null),
                 'expiring', count(*) filter (where is_expiring),
                 'inactive', count(*) filter (where is_inactive),
                 'no_profile', count(*) filter (where profiles = 0),
                 'pending', count(*) filter (where pending_profiles > 0),
                 'suspended', count(*) filter (where suspended)) from tagged),
    'plans', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                from (select coalesce(d.plan->>'name', 'none') k, count(*) n from dated d group by 1) x),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'name', f.name, 'phone', f.phone, 'accountCode', f.account_code,
               'createdAt', f.created_at, 'lastSignInAt', f.last_sign_in_at, 'suspended', f.suspended,
               'profiles', f.profiles, 'liveProfiles', f.live_profiles, 'pendingProfiles', f.pending_profiles,
               'plan', f.plan, 'contactViews', f.contact_views, 'contactViewsToday', f.contact_views_today) order by f.rn)
        from (select x.*, row_number() over () as rn from (
                select * from filtered
                 order by
                   case when p_sort = 'oldest' then created_at end asc,
                   case when p_sort in ('last_login', 'login_desc') then last_sign_in_at end desc nulls last,
                   case when p_sort = 'login_asc' then last_sign_in_at end asc nulls first,
                   case when p_sort in ('most_active', 'views_desc') then contact_views end desc,
                   case when p_sort = 'views_asc' then contact_views end asc,
                   case when p_sort = 'quota_left' then coalesce((plan->>'totalLimit')::int, 1000000) - contact_views end asc nulls last,
                   case when p_sort in ('name', 'name_asc') then lower(nullif(name, '')) end asc nulls last,
                   case when p_sort = 'name_desc' then lower(nullif(name, '')) end desc nulls last,
                   created_at desc
                 limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) x) f
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_list_accounts(text, text, text, int, int, timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_list_accounts(text, text, text, int, int, timestamptz, timestamptz, text, text) to service_role;
notify pgrst, 'reload schema';
