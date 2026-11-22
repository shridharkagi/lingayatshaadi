-- =====================================================================
-- 20261122_06_admin_list_filters.sql
--
-- Richer admin lists (replaces the 05 versions of the two list functions):
--   admin_list_accounts: date filter (joined / last login), more sorts,
--                        "plan ending soon" filter, per-tab counts.
--   admin_list_profiles: date filter (created / approved), "profile for"
--                        filter, sorts, account name + phone, counts that
--                        respect the non-status filters.
-- Depends on 05 (admin_subscriptions_v). Service role only. Idempotent.
-- =====================================================================

drop function if exists public.admin_list_accounts(text, text, text, int, int);
drop function if exists public.admin_list_profiles(text, text, text, text, text, int, int);

-- ---------------------------------------------------------------------
create or replace function public.admin_list_accounts(
  p_q text default '', p_filter text default 'all', p_sort text default 'newest',
  p_limit int default 25, p_offset int default 0,
  p_from timestamptz default null, p_to timestamptz default null, p_date_on text default 'joined')
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
           (select jsonb_build_object('name', s.plan_display_name, 'price', coalesce(s.price_snapshot, 0), 'expiresAt', s.expires_at)
              from admin_subscriptions_v s
             where s.account_id = u.id and s.status = 'active' and s.expires_at > now()
             order by s.expires_at desc limit 1) as plan,
           (select count(*) from contact_views cv join profiles p on p.id = cv.viewer_id where p.user_id = u.id) as contact_views
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
           d.plan is not null and (d.plan->>'expiresAt')::timestamptz < now() + interval '30 days' as is_expiring
      from dated d
  ),
  filtered as (
    select * from tagged t
     where case p_filter
             when 'suspended' then t.suspended
             when 'paid' then t.is_paid
             when 'no_plan' then t.plan is null
             when 'expiring' then t.is_expiring
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
                 'no_profile', count(*) filter (where profiles = 0),
                 'pending', count(*) filter (where pending_profiles > 0),
                 'suspended', count(*) filter (where suspended)) from tagged),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'name', f.name, 'phone', f.phone, 'accountCode', f.account_code,
               'createdAt', f.created_at, 'lastSignInAt', f.last_sign_in_at, 'suspended', f.suspended,
               'profiles', f.profiles, 'liveProfiles', f.live_profiles, 'pendingProfiles', f.pending_profiles,
               'plan', f.plan, 'contactViews', f.contact_views) order by f.rn)
        from (select x.*, row_number() over () as rn from (
                select * from filtered
                 order by
                   case when p_sort = 'oldest' then created_at end asc,
                   case when p_sort in ('last_login', 'login_desc') then last_sign_in_at end desc nulls last,
                   case when p_sort = 'login_asc' then last_sign_in_at end asc nulls first,
                   case when p_sort in ('most_active', 'views_desc') then contact_views end desc,
                   case when p_sort = 'views_asc' then contact_views end asc,
                   case when p_sort in ('name', 'name_asc') then lower(nullif(name, '')) end asc nulls last,
                   case when p_sort = 'name_desc' then lower(nullif(name, '')) end desc nulls last,
                   created_at desc
                 limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) x) f
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------
create or replace function public.admin_list_profiles(
  p_q text default '', p_status text default 'all', p_gender text default '',
  p_state text default '', p_photo text default '', p_limit int default 25, p_offset int default 0,
  p_rel text default '', p_from timestamptz default null, p_to timestamptz default null,
  p_date_on text default 'created', p_sort text default 'newest')
returns jsonb
language plpgsql stable security definer
set search_path = public, auth
as $$
declare
  v_q text := trim(coalesce(p_q, ''));
  v_digits text := regexp_replace(coalesce(p_q, ''), '\D', '', 'g');
  result jsonb;
begin
  with base as (
    select p.*,
           c.account_code,
           coalesce(u.raw_user_meta_data->>'full_name', '') as account_name,
           u.phone as account_phone,
           coalesce(nullif(p.relationship, ''), 'self') as rel,
           extract(year from age(p.date_of_birth))::int as age_years,
           case
             when p.deleted_at is not null then 'deleted'
             when coalesce(p.profile_status, '') = 'suspended' then 'suspended'
             when coalesce(p.is_blocked, false) then 'blocked'
             else coalesce(p.moderation_status, 'draft') end as admin_status,
           case when p_date_on = 'approved' then p.approved_at else p.created_at end as date_key
      from profiles p
      left join user_account_codes c on c.user_id = p.user_id
      left join auth.users u on u.id = p.user_id
  ),
  scoped as (   -- every filter except the status tab
    select * from base b
     where (v_q = ''
            or b.public_id ilike '%' || v_q || '%'
            or b.full_name ilike '%' || v_q || '%'
            or b.account_code ilike '%' || v_q || '%'
            or b.account_name ilike '%' || v_q || '%'
            or b.city ilike '%' || v_q || '%'
            or (length(v_digits) >= 4 and (regexp_replace(coalesce(b.contact, ''), '\D', '', 'g') like '%' || v_digits || '%'
                                           or regexp_replace(coalesce(b.account_phone, ''), '\D', '', 'g') like '%' || v_digits || '%'
                                           or b.contacts::text like '%' || v_digits || '%')))
       and (coalesce(p_gender, '') = '' or b.gender = p_gender)
       and (coalesce(p_state, '') = '' or initcap(trim(b.state)) = initcap(trim(p_state)))
       and (coalesce(p_photo, '') = ''
            or p_photo = 'with' and coalesce(b.profile_photo, '') <> ''
            or p_photo = 'without' and coalesce(b.profile_photo, '') = '')
       and (coalesce(p_rel, '') = ''
            or p_rel = 'family' and b.rel <> 'self'
            or p_rel = 'parent' and b.rel in ('son', 'daughter')
            or p_rel = 'sibling' and b.rel in ('brother', 'sister')
            or b.rel = p_rel)
       and (p_from is null or b.date_key >= p_from)
       and (p_to is null or b.date_key < p_to)
  ),
  filtered as (
    select s.*,
           (select count(*) from profile_views v where v.viewed_id = s.id) as views_n,
           (select count(*) from contact_views cv where cv.viewed_id = s.id) as contacted_n
      from scoped s
     where (p_status = 'all' and s.admin_status <> 'deleted'
            or p_status = 'everything'
            or p_status = 'live' and s.admin_status = 'approved'
            or p_status = 'pending' and s.admin_status = 'pending_review'
            or p_status = s.admin_status)
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'publicId', f.public_id, 'name', f.full_name, 'gender', f.gender, 'age', f.age_years,
               'city', f.city, 'state', f.state, 'profession', f.profession, 'relationship', f.rel,
               'status', f.admin_status, 'photo', f.profile_photo, 'userId', f.user_id, 'accountCode', f.account_code,
               'accountName', f.account_name, 'accountPhone', f.account_phone,
               'createdAt', f.created_at, 'approvedAt', f.approved_at, 'rejectionReason', f.rejection_reason,
               'views', f.views_n, 'contactedBy', f.contacted_n) order by f.rn)
        from (select x.*, row_number() over () as rn from (
                select * from filtered
                 order by
                   case when p_sort = 'oldest' then created_at end asc,
                   case when p_sort = 'name' then lower(nullif(full_name, '')) end asc nulls last,
                   case when p_sort = 'most_viewed' then views_n end desc,
                   case when p_sort = 'most_contacted' then contacted_n end desc,
                   case when p_sort = 'recently_approved' then approved_at end desc nulls last,
                   created_at desc
                 limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) x) f
    ), '[]'::jsonb),
    'counts', (select coalesce(jsonb_object_agg(admin_status, n), '{}'::jsonb)
                 from (select admin_status, count(*) n from scoped group by 1) x),
    'relCounts', (select coalesce(jsonb_object_agg(rel, n), '{}'::jsonb)
                    from (select rel, count(*) n from scoped where admin_status <> 'deleted' group by 1) x)
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_list_accounts(text, text, text, int, int, timestamptz, timestamptz, text) from public, anon, authenticated;
revoke all on function public.admin_list_profiles(text, text, text, text, text, int, int, text, timestamptz, timestamptz, text, text) from public, anon, authenticated;
grant execute on function public.admin_list_accounts(text, text, text, int, int, timestamptz, timestamptz, text) to service_role;
grant execute on function public.admin_list_profiles(text, text, text, text, text, int, int, text, timestamptz, timestamptz, text, text) to service_role;
