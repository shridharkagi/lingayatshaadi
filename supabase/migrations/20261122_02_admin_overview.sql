-- =====================================================================
-- 20261122_02_admin_overview.sql
--
-- Accurate admin dashboard numbers computed in the database (replaces
-- client-side counting that was capped at ~1,000 rows).
--
-- admin_overview(p_from, p_to) returns one JSON document with:
--   inbox   — work waiting for the admin (always "now", not range-bound)
--   kpis    — current period vs previous period of equal length
--   funnel  — accounts → with profile → with live profile → paid
--   series  — daily signups and approvals within the range
--   mix     — live profiles by gender, state, age band
--   recent  — latest admin audit entries
--
-- Service role only (called from /api/superadmin/overview after
-- requireSuperAdmin). Idempotent.
-- =====================================================================

create or replace function public.admin_overview(p_from timestamptz, p_to timestamptz)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_len interval := p_to - p_from;
  v_pfrom timestamptz := p_from - (p_to - p_from);
  v_now timestamptz := now();
  result jsonb;
begin
  with
  -- Subscriptions may reference an auth user id or (legacy) a profile id.
  subs as (
    select us.*, coalesce(p.user_id, us.user_id) as account_id
      from user_subscriptions us
      left join profiles p on p.id = us.user_id
  ),
  live as (select * from public_profiles),
  pay as (
    select pt.*, coalesce(p.user_id, pt.user_id) as account_id
      from payment_transactions pt
      left join profiles p on p.id = pt.user_id
     where pt.status = 'paid'
  )
  select jsonb_build_object(
    'inbox', jsonb_build_object(
      'pendingProfiles', (select count(*) from profiles where moderation_status = 'pending_review' and deleted_at is null),
      'pendingNew', (select count(*) from profiles where moderation_status = 'pending_review' and deleted_at is null and approved_snapshot is null),
      'pendingEdits', (select count(*) from profiles where moderation_status = 'pending_review' and deleted_at is null and approved_snapshot is not null),
      'oldestPendingAt', (select min(coalesce(last_submitted_at, updated_at)) from profiles where moderation_status = 'pending_review' and deleted_at is null),
      'pendingPhotos', (select count(*) from profile_photos where status = 'pending'),
      'pendingPhotoProfiles', (select count(distinct profile_id) from profile_photos where status = 'pending'),
      'pendingKyc', (select count(*) from profile_kyc_documents where status = 'pending'),
      'upgradeNew', (select count(*) from subscription_upgrade_requests where status = 'new'),
      'upgradeOpen', (select count(*) from subscription_upgrade_requests where status in ('new', 'contacted')),
      'plansExpiring7d', (select count(*) from subs where status = 'active' and expires_at between v_now and v_now + interval '7 days'),
      'deletionRequests', (select count(*) from profile_deletion_requests where status = 'pending')
    ),
    'kpis', jsonb_build_object(
      'accountsTotal', (select count(*) from auth.users),
      'accountsNew', (select count(*) from auth.users where created_at >= p_from and created_at < p_to),
      'accountsNewPrev', (select count(*) from auth.users where created_at >= v_pfrom and created_at < p_from),
      'profilesTotal', (select count(*) from profiles where deleted_at is null),
      'liveProfiles', (select count(*) from live),
      'approvedInRange', (select count(*) from profiles where approved_at >= p_from and approved_at < p_to),
      'approvedPrev', (select count(*) from profiles where approved_at >= v_pfrom and approved_at < p_from),
      'paidMembers', (select count(distinct account_id) from subs
                       where status = 'active' and expires_at > v_now and coalesce(price_snapshot, 0) > 0),
      'revenue', (select coalesce(sum(amount), 0) from pay where coalesce(paid_at, created_at) >= p_from and coalesce(paid_at, created_at) < p_to),
      'revenuePrev', (select coalesce(sum(amount), 0) from pay where coalesce(paid_at, created_at) >= v_pfrom and coalesce(paid_at, created_at) < p_from),
      'revenueAllTime', (select coalesce(sum(amount), 0) from pay),
      'contactViews', (select count(*) from contact_views where viewed_at >= p_from and viewed_at < p_to),
      'contactViewsPrev', (select count(*) from contact_views where viewed_at >= v_pfrom and viewed_at < p_from),
      'profileViews', (select count(*) from profile_views where viewed_at >= p_from and viewed_at < p_to),
      'profileViewsPrev', (select count(*) from profile_views where viewed_at >= v_pfrom and viewed_at < p_from),
      'interests', (select count(*) from interests where created_at >= p_from and created_at < p_to),
      'interestsPrev', (select count(*) from interests where created_at >= v_pfrom and created_at < p_from)
    ),
    'funnel', jsonb_build_object(
      'accounts', (select count(*) from auth.users),
      'withProfile', (select count(distinct user_id) from profiles where deleted_at is null),
      'withLiveProfile', (select count(distinct user_id) from live),
      'paid', (select count(distinct account_id) from pay where coalesce(amount, 0) > 0)
    ),
    'series', (
      select coalesce(jsonb_agg(jsonb_build_object('day', d::date, 'signups', s, 'approvals', a) order by d), '[]'::jsonb)
        from (
          select d,
                 (select count(*) from auth.users u where u.created_at >= d and u.created_at < d + interval '1 day') s,
                 (select count(*) from profiles pr where pr.approved_at >= d and pr.approved_at < d + interval '1 day') a
            from generate_series(date_trunc('day', p_from), date_trunc('day', p_to - interval '1 second'), interval '1 day') d
        ) x
    ),
    'mix', jsonb_build_object(
      'gender', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(gender, 'unknown') k, count(*) n from live group by 1) g),
      'state', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (select coalesce(nullif(initcap(trim(state)), ''), 'Unknown') k, count(*) n from live group by 1) g),
      'age', (select coalesce(jsonb_object_agg(k, n), '{}'::jsonb) from (
                select case
                         when age < 24 then '18-23' when age < 29 then '24-28'
                         when age < 34 then '29-33' when age < 41 then '34-40' else '41+' end k,
                       count(*) n
                  from (select extract(year from age(date_of_birth))::int age from live where date_of_birth is not null) a
                 group by 1) g)
    ),
    'recent', (
      select coalesce(jsonb_agg(jsonb_build_object('action', action_type, 'entityType', entity_type, 'entityId', entity_id, 'at', created_at) order by created_at desc), '[]'::jsonb)
        from (select * from admin_audit_logs order by created_at desc limit 8) r
    )
  ) into result;
  return result;
end;
$$;

revoke all on function public.admin_overview(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_overview(timestamptz, timestamptz) to service_role;
