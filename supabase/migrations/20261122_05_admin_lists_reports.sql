-- =====================================================================
-- 20261122_05_admin_lists_reports.sql
--
-- Server-side lists and reports for the admin console (exact counts,
-- filtering, sorting and paging in the database):
--   admin_list_accounts(q, filter, sort, limit, offset)
--   admin_list_profiles(q, status, gender, state, photo, limit, offset)
--   admin_reports(from, to)
-- Service role only. Idempotent.
-- =====================================================================

-- Helper: each subscription row mapped to its account (rows may reference a
-- legacy profile id), with a display plan name.
create or replace view public.admin_subscriptions_v as
select us.*,
       coalesce(p.user_id, us.user_id) as account_id,
       coalesce(us.plan_name_snapshot, sp.name, mp.name, 'Plan') as plan_display_name
  from public.user_subscriptions us
  left join public.profiles p on p.id = us.user_id
  left join public.subscription_plans sp on sp.id = us.plan_id
  left join public.membership_plans mp on mp.id = us.plan_id;
revoke all on public.admin_subscriptions_v from public, anon, authenticated;
grant select on public.admin_subscriptions_v to service_role;

-- ---------------------------------------------------------------------
create or replace function public.admin_list_accounts(
  p_q text default '', p_filter text default 'all', p_sort text default 'newest',
  p_limit int default 25, p_offset int default 0)
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
  filtered as (
    select * from base b
     where (v_q = ''
            or (length(v_digits) >= 3 and regexp_replace(coalesce(b.phone, ''), '\D', '', 'g') like '%' || v_digits || '%')
            or b.account_code ilike '%' || v_q || '%'
            or b.name ilike '%' || v_q || '%')
       and case p_filter
             when 'suspended' then b.suspended
             when 'paid' then coalesce((b.plan->>'price')::numeric, 0) > 0
             when 'no_plan' then b.plan is null
             when 'no_profile' then b.profiles = 0
             when 'pending' then b.pending_profiles > 0
             else true end
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'name', f.name, 'phone', f.phone, 'accountCode', f.account_code,
               'createdAt', f.created_at, 'lastSignInAt', f.last_sign_in_at, 'suspended', f.suspended,
               'profiles', f.profiles, 'liveProfiles', f.live_profiles, 'pendingProfiles', f.pending_profiles,
               'plan', f.plan, 'contactViews', f.contact_views))
        from (select * from filtered
               order by
                 case when p_sort = 'oldest' then created_at end asc,
                 case when p_sort = 'last_login' then last_sign_in_at end desc nulls last,
                 case when p_sort = 'most_active' then contact_views end desc,
                 case when p_sort = 'name' then lower(name) end asc,
                 created_at desc
               limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) f
    ), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------
create or replace function public.admin_list_profiles(
  p_q text default '', p_status text default 'all', p_gender text default '',
  p_state text default '', p_photo text default '', p_limit int default 25, p_offset int default 0)
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
           extract(year from age(p.date_of_birth))::int as age_years,
           case
             when p.deleted_at is not null then 'deleted'
             when coalesce(p.profile_status, '') = 'suspended' then 'suspended'
             when coalesce(p.is_blocked, false) then 'blocked'
             else coalesce(p.moderation_status, 'draft') end as admin_status
      from profiles p
      left join user_account_codes c on c.user_id = p.user_id
  ),
  filtered as (
    select * from base b
     where (v_q = ''
            or b.public_id ilike '%' || v_q || '%'
            or b.full_name ilike '%' || v_q || '%'
            or b.account_code ilike '%' || v_q || '%'
            or b.city ilike '%' || v_q || '%'
            or (length(v_digits) >= 4 and (regexp_replace(coalesce(b.contact, ''), '\D', '', 'g') like '%' || v_digits || '%'
                                           or b.contacts::text like '%' || v_digits || '%')))
       and (p_status = 'all' and b.admin_status <> 'deleted'
            or p_status = 'everything'
            or p_status = 'live' and b.admin_status = 'approved'
            or p_status = 'pending' and b.admin_status = 'pending_review'
            or p_status = b.admin_status)
       and (coalesce(p_gender, '') = '' or b.gender = p_gender)
       and (coalesce(p_state, '') = '' or initcap(trim(b.state)) = initcap(trim(p_state)))
       and (coalesce(p_photo, '') = ''
            or p_photo = 'with' and coalesce(b.profile_photo, '') <> ''
            or p_photo = 'without' and coalesce(b.profile_photo, '') = '')
  )
  select jsonb_build_object(
    'total', (select count(*) from filtered),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', f.id, 'publicId', f.public_id, 'name', f.full_name, 'gender', f.gender, 'age', f.age_years,
               'city', f.city, 'state', f.state, 'profession', f.profession, 'relationship', f.relationship,
               'status', f.admin_status, 'photo', f.profile_photo, 'userId', f.user_id, 'accountCode', f.account_code,
               'createdAt', f.created_at, 'approvedAt', f.approved_at, 'rejectionReason', f.rejection_reason,
               'views', (select count(*) from profile_views v where v.viewed_id = f.id),
               'contactedBy', (select count(*) from contact_views cv where cv.viewed_id = f.id)))
        from (select * from filtered order by created_at desc
               limit greatest(1, least(p_limit, 500)) offset greatest(0, p_offset)) f
    ), '[]'::jsonb),
    'counts', (select jsonb_object_agg(admin_status, n) from (select admin_status, count(*) n from base group by 1) x)
  ) into result;
  return result;
end;
$$;

-- ---------------------------------------------------------------------
create or replace function public.admin_reports(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql stable security definer
set search_path = public, auth
as $$
declare result jsonb;
begin
  with live as (select * from public_profiles),
  pay as (
    select pt.*, coalesce(pt.paid_at, pt.created_at) as at
      from payment_transactions pt where pt.status = 'paid'
  )
  select jsonb_build_object(
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
               'day', d::date,
               'signups', (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day'),
               'profiles', (select count(*) from profiles p where p.created_at >= d and p.created_at < d + interval '1 day'),
               'approvals', (select count(*) from profiles p where p.approved_at >= d and p.approved_at < d + interval '1 day'),
               'profileViews', (select count(*) from profile_views v where v.viewed_at >= d and v.viewed_at < d + interval '1 day'),
               'contactViews', (select count(*) from contact_views v where v.viewed_at >= d and v.viewed_at < d + interval '1 day'),
               'interests', (select count(*) from interests i where i.created_at >= d and i.created_at < d + interval '1 day'),
               'leads', (select count(*) from whatsapp_leads l where l.created_at >= d and l.created_at < d + interval '1 day')
             ) order by d), '[]'::jsonb)
        from generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day') d
    ),
    'revenue', jsonb_build_object(
      'total', (select coalesce(sum(amount), 0) from pay where at >= p_from and at < p_to),
      'payments', (select count(*) from pay where at >= p_from and at < p_to and coalesce(amount, 0) > 0),
      'byMonth', (select coalesce(jsonb_agg(jsonb_build_object('month', m, 'amount', amt, 'count', n) order by m), '[]'::jsonb)
                    from (select to_char(date_trunc('month', at), 'YYYY-MM') m, sum(amount) amt, count(*) filter (where amount > 0) n
                            from pay where at >= p_from and at < p_to group by 1) x),
      'byPlan', (select coalesce(jsonb_agg(jsonb_build_object('plan', plan, 'amount', amt, 'count', n) order by amt desc), '[]'::jsonb)
                   from (select coalesce(s.plan_display_name, 'Unknown') plan, sum(pay.amount) amt, count(*) n
                           from pay left join admin_subscriptions_v s on s.id = pay.subscription_id
                          where pay.at >= p_from and pay.at < p_to group by 1) x),
      'byMode', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                   from (select coalesce(payment_mode, provider, 'unknown') k, count(*) n from pay where at >= p_from and at < p_to group by 1) x),
      'activePlans', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                        from (select plan_display_name k, count(distinct account_id) n from admin_subscriptions_v
                               where status = 'active' and expires_at > now() group by 1) x),
      'expiring30d', (select count(*) from admin_subscriptions_v where status = 'active' and expires_at between now() and now() + interval '30 days')
    ),
    'engagement', jsonb_build_object(
      'topViewed', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                      select jsonb_build_object('id', p.id, 'publicId', p.public_id, 'name', p.full_name, 'gender', p.gender, 'n', count(*)) x
                        from profile_views v join profiles p on p.id = v.viewed_id
                       where v.viewed_at >= p_from and v.viewed_at < p_to group by p.id order by count(*) desc limit 10) t),
      'topContacted', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                      select jsonb_build_object('id', p.id, 'publicId', p.public_id, 'name', p.full_name, 'gender', p.gender, 'n', count(*)) x
                        from contact_views v join profiles p on p.id = v.viewed_id
                       where v.viewed_at >= p_from and v.viewed_at < p_to group by p.id order by count(*) desc limit 10) t),
      'topContactors', (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
                      select jsonb_build_object('userId', p.user_id, 'accountCode', c.account_code,
                               'name', coalesce(u.raw_user_meta_data->>'full_name', ''), 'n', count(*)) x
                        from contact_views v join profiles p on p.id = v.viewer_id
                        left join user_account_codes c on c.user_id = p.user_id
                        left join auth.users u on u.id = p.user_id
                       where v.viewed_at >= p_from and v.viewed_at < p_to
                       group by p.user_id, c.account_code, u.raw_user_meta_data order by count(*) desc limit 10) t),
      'interestStatus', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                           from (select coalesce(status, 'pending') k, count(*) n from interests where created_at >= p_from and created_at < p_to group by 1) x)
    ),
    'members', jsonb_build_object(
      'gender', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(gender, 'unknown') k, count(*) n from live group by 1) x),
      'state', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(nullif(initcap(trim(state)), ''), 'Unknown') k, count(*) n from live group by 1) x),
      'district', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb) from (select coalesce(nullif(initcap(trim(coalesce(district, city))), ''), 'Unknown') k, count(*) n from live group by 1 order by 2 desc limit 12) x),
      'marital', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(nullif(marital_status, ''), 'Unknown') k, count(*) n from live group by 1) x),
      'profession', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb) from (select coalesce(nullif(profession_type, ''), 'Not set') k, count(*) n from live group by 1 order by 2 desc limit 10) x),
      'subCaste', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb) from (select coalesce(nullif(sub_caste, ''), 'Not set') k, count(*) n from live group by 1 order by 2 desc limit 12) x),
      'relationship', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(relationship, 'self') k, count(*) n from live group by 1) x),
      'age', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
                select case when a < 24 then '18-23' when a < 29 then '24-28' when a < 34 then '29-33' when a < 41 then '34-40' else '41+' end k, count(*) n
                  from (select extract(year from age(date_of_birth))::int a from live where date_of_birth is not null) y group by 1) x)
    ),
    'operations', jsonb_build_object(
      'approved', (select count(*) from admin_audit_logs where action_type = 'profile.approve' and created_at >= p_from and created_at < p_to),
      'rejected', (select count(*) from admin_audit_logs where action_type = 'profile.reject' and created_at >= p_from and created_at < p_to),
      'avgHoursToApprove', (select round(avg(extract(epoch from (approved_at - last_submitted_at)) / 3600)::numeric, 1)
                              from profiles where approved_at >= p_from and approved_at < p_to and last_submitted_at is not null and approved_at > last_submitted_at),
      'backlog', (select count(*) from profiles where moderation_status = 'pending_review' and deleted_at is null),
      'rejectionReasons', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
                             from (select coalesce(nullif(split_part(rejection_reason, '.', 1), ''), 'No reason') k, count(*) n
                                     from profiles where moderation_status = 'rejected' and deleted_at is null group by 1 order by 2 desc limit 8) x),
      'photosRejected', (select count(*) from profile_photos where status = 'rejected' and reviewed_at >= p_from and reviewed_at < p_to),
      'deletionRequests', (select count(*) from profile_deletion_requests where created_at >= p_from and created_at < p_to)
    ),
    'leads', jsonb_build_object(
      'total', (select count(*) from whatsapp_leads where created_at >= p_from and created_at < p_to),
      'withAccount', (select count(*) from whatsapp_leads where created_at >= p_from and created_at < p_to and account_id is not null),
      'bySource', (select coalesce(jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc), '[]'::jsonb)
                     from (select coalesce(nullif(source_page, ''), 'unknown') k, count(*) n from whatsapp_leads
                            where created_at >= p_from and created_at < p_to group by 1 order by 2 desc limit 10) x),
      'events', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb)
                   from (select event_name k, count(*) n from whatsapp_lead_events where created_at >= p_from and created_at < p_to group by 1) x)
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_list_accounts(text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_list_profiles(text, text, text, text, text, int, int) from public, anon, authenticated;
revoke all on function public.admin_reports(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_list_accounts(text, text, text, int, int) to service_role;
grant execute on function public.admin_list_profiles(text, text, text, text, text, int, int) to service_role;
grant execute on function public.admin_reports(timestamptz, timestamptz) to service_role;
