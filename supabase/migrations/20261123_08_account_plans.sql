-- =====================================================================
-- 20261123_08_account_plans.sql
--
-- Account-level plans (Phase 1 foundation). Idempotent; safe to re-run.
-- Apply on Test first, then Prod (Supabase SQL editor).
--
--   1. Backs up user_subscriptions + payment_transactions (once).
--   2. Subscriptions belong to the LOGIN ACCOUNT (auth.users), not a profile.
--   3. One plan catalogue: subscription_plans (legacy membership_plans is no
--      longer referenced; it is kept read-only for now, dropped later).
--   4. Member plans keep their own editable values (dates, contacts, price)
--      in the existing *_snapshot columns. NULL contact limit = unlimited,
--      0 = none.
--   5. Status: active | expired | cancelled | refunded. At most ONE 'active'
--      row per account (unique index). "Expired" for display is derived
--      from expires_at; stale 'active' rows are normalised here.
--   6. subscription_events: append-only history of every plan / payment /
--      template change (who, when, before, after, reason, batch).
--   7. payment_transactions: partial/full offline refunds, gateway-ready
--      unique (provider, external_txn_id).
--   8. Data: cancel the test account's Gold plan; one-time Free catch-up for
--      accounts that have an approved profile; remove the shadow profile.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- 1. Backups (first run only)
-- ---------------------------------------------------------------------
create table if not exists public.backup_20261123_user_subscriptions as
  select * from public.user_subscriptions;
create table if not exists public.backup_20261123_payment_transactions as
  select * from public.payment_transactions;
alter table public.backup_20261123_user_subscriptions enable row level security;
alter table public.backup_20261123_payment_transactions enable row level security;
revoke all on public.backup_20261123_user_subscriptions from public, anon, authenticated;
revoke all on public.backup_20261123_payment_transactions from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 2. Plan templates
-- ---------------------------------------------------------------------
alter table public.subscription_plans
  add column if not exists archived_at timestamptz,
  add column if not exists sort_order int not null default 0;
-- NULL = unlimited contacts (templates currently have no zero values).
alter table public.subscription_plans alter column total_contact_views drop not null;
alter table public.subscription_plans alter column daily_contact_view_limit drop not null;

-- ---------------------------------------------------------------------
-- 3. user_subscriptions: new columns
-- ---------------------------------------------------------------------
alter table public.user_subscriptions
  add column if not exists plan_code text,
  add column if not exists source text,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists updated_at timestamptz not null default now(),
  add column if not exists ended_at timestamptz,
  add column if not exists ended_by uuid,
  add column if not exists end_reason text;
update public.user_subscriptions set source = 'legacy' where source is null;
alter table public.user_subscriptions alter column source set default 'admin';
alter table public.user_subscriptions alter column source set not null;
alter table public.user_subscriptions alter column plan_id drop not null;

-- Old constraints (user_id -> profiles, plan_id -> membership_plans, status).
alter table public.user_subscriptions drop constraint if exists user_subscriptions_user_id_fkey;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_plan_id_fkey;
alter table public.user_subscriptions drop constraint if exists user_subscriptions_status_check;

-- 3a. Rows saved against a profile id -> that profile's login account.
update public.user_subscriptions us
   set user_id = p.user_id
  from public.profiles p
 where p.id = us.user_id and p.user_id is not null and p.user_id <> us.user_id;

do $$
declare n int;
begin
  select count(*) into n from public.user_subscriptions us
   where not exists (select 1 from auth.users u where u.id = us.user_id);
  if n > 0 then
    raise exception 'user_subscriptions: % row(s) do not map to a login account; aborting', n;
  end if;
end $$;

-- 3b. Legacy plan ids -> the single catalogue (match free / by name or code).
update public.user_subscriptions us
   set plan_id = sp.id
  from public.membership_plans mp
  join public.subscription_plans sp
    on (case when coalesce(mp.is_free, false) or coalesce(mp.price, 0) <= 0 then sp.code = 'free'
             else lower(sp.name) = lower(mp.name) or lower(sp.code) = lower(mp.name) end)
 where us.plan_id = mp.id;
update public.user_subscriptions us
   set plan_id = null
 where us.plan_id is not null
   and not exists (select 1 from public.subscription_plans sp where sp.id = us.plan_id);

-- 3c. Fill display values for old rows (the member's own plan values).
update public.user_subscriptions us
   set plan_name_snapshot = coalesce(us.plan_name_snapshot, sp.name, 'Plan'),
       plan_code = coalesce(us.plan_code, sp.code),
       price_snapshot = coalesce(us.price_snapshot, 0),
       currency_snapshot = coalesce(us.currency_snapshot, 'INR'),
       duration_days_snapshot = coalesce(us.duration_days_snapshot,
         greatest(1, ceil(extract(epoch from (us.expires_at - us.starts_at)) / 86400)::int))
  from public.subscription_plans sp
 where sp.id = us.plan_id
   and (us.plan_name_snapshot is null or us.plan_code is null or us.price_snapshot is null
        or us.currency_snapshot is null or us.duration_days_snapshot is null);
update public.user_subscriptions
   set plan_name_snapshot = coalesce(plan_name_snapshot, 'Plan'),
       price_snapshot = coalesce(price_snapshot, 0),
       currency_snapshot = coalesce(currency_snapshot, 'INR')
 where plan_name_snapshot is null or price_snapshot is null or currency_snapshot is null;

-- 3d. Statuses: past-dated 'active' rows are expired; one active per account.
update public.user_subscriptions
   set status = 'expired', ended_at = coalesce(ended_at, expires_at),
       end_reason = coalesce(end_reason, 'Expired (normalised by migration)')
 where status = 'active' and expires_at < now();
with ranked as (
  select id, row_number() over (partition by user_id order by expires_at desc, created_at desc) rn
    from public.user_subscriptions where status = 'active'
)
update public.user_subscriptions us
   set status = 'cancelled', ended_at = now(), end_reason = 'Duplicate active plan (migration)'
  from ranked r
 where r.id = us.id and r.rn > 1;

alter table public.user_subscriptions
  add constraint user_subscriptions_status_check
  check (status in ('active', 'expired', 'cancelled', 'refunded'));

-- 3e. New foreign keys.
alter table public.user_subscriptions
  add constraint user_subscriptions_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete cascade;
alter table public.user_subscriptions
  add constraint user_subscriptions_plan_id_fkey
  foreign key (plan_id) references public.subscription_plans(id) on delete restrict;

create unique index if not exists user_subscriptions_one_active
  on public.user_subscriptions (user_id) where status = 'active';

-- Members read only their own rows (old policy compared profiles.id to user_id).
drop policy if exists "Users can view their own subscription" on public.user_subscriptions;
create policy "Users can view their own subscription" on public.user_subscriptions
  for select using (auth.uid() = user_id);

-- ---------------------------------------------------------------------
-- 4. History (append-only). Service role only.
-- ---------------------------------------------------------------------
create table if not exists public.subscription_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,                                   -- account
  subscription_id uuid references public.user_subscriptions(id) on delete set null,
  payment_id uuid references public.payment_transactions(id) on delete set null,
  plan_id uuid references public.subscription_plans(id) on delete set null,
  action text not null,
  reason text,
  before_json jsonb,
  after_json jsonb,
  actor_user_id uuid,                             -- null = system / gateway
  batch_id uuid,                                  -- set for bulk actions
  created_at timestamptz not null default now()
);
create index if not exists subscription_events_user_idx on public.subscription_events (user_id, created_at desc);
create index if not exists subscription_events_created_idx on public.subscription_events (created_at desc);
create index if not exists subscription_events_batch_idx on public.subscription_events (batch_id) where batch_id is not null;
create index if not exists subscription_events_sub_idx on public.subscription_events (subscription_id);
alter table public.subscription_events enable row level security;
revoke all on public.subscription_events from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 5. Payments: offline refunds + gateway readiness
-- ---------------------------------------------------------------------
alter table public.payment_transactions
  add column if not exists refunded_amount numeric(12, 2) not null default 0,
  add column if not exists refund_mode text,
  add column if not exists notes text,
  add column if not exists created_by uuid,
  add column if not exists updated_at timestamptz not null default now();
update public.payment_transactions
   set refunded_amount = amount
 where status = 'refunded' and refunded_amount = 0;
-- Zero-amount "free_auto" receipts are not payments.
update public.payment_transactions
   set status = 'void', notes = coalesce(notes, 'Free plan - no payment')
 where payment_mode = 'free_auto' and amount = 0 and status = 'paid';
create unique index if not exists payment_transactions_provider_txn
  on public.payment_transactions (provider, external_txn_id)
  where provider <> 'manual' and external_txn_id is not null;
create index if not exists payment_transactions_sub_idx on public.payment_transactions (subscription_id);

-- ---------------------------------------------------------------------
-- 6. Data: cancel the test account's paid plan (owner of LB260400028)
-- ---------------------------------------------------------------------
with target as (
  select us.id, us.user_id, us.plan_id, to_jsonb(us) as before_row
    from public.user_subscriptions us
   where us.status = 'active'
     and us.user_id in (select p.user_id from public.profiles p where p.public_id = 'LB260400028')
     and us.source = 'legacy'
     and coalesce(us.plan_code, '') <> 'free'
), upd as (
  update public.user_subscriptions us
     set status = 'cancelled', ended_at = now(), updated_at = now(),
         end_reason = 'Test account - cancelled on request'
    from target t
   where us.id = t.id
  returning us.id, us.user_id, us.plan_id
)
insert into public.subscription_events (user_id, subscription_id, plan_id, action, reason, before_json, after_json)
select u.user_id, u.id, u.plan_id, 'cancelled', 'Test account - cancelled on request',
       t.before_row, jsonb_build_object('status', 'cancelled')
  from upd u join target t on t.id = u.id;

-- ---------------------------------------------------------------------
-- 7. One-time Free catch-up: accounts with an approved (live) profile, no
--    current plan, and never given Free by the new rules.
-- ---------------------------------------------------------------------
with free_plan as (
  select * from public.subscription_plans where code = 'free' limit 1
), eligible as (
  select distinct p.user_id
    from public.profiles p
   where p.user_id is not null and p.deleted_at is null
     and (p.moderation_status = 'approved' or p.approved_snapshot is not null)
     and exists (select 1 from auth.users u where u.id = p.user_id)
     and not exists (select 1 from public.user_subscriptions s
                      where s.user_id = p.user_id and s.status = 'active')
     and not exists (select 1 from public.user_subscriptions s
                      where s.user_id = p.user_id and s.source in ('free_auto', 'free_catchup'))
), ins as (
  insert into public.user_subscriptions
    (user_id, plan_id, plan_code, plan_name_snapshot, price_snapshot, currency_snapshot,
     duration_days_snapshot, total_contact_views_snapshot, daily_contact_view_limit_snapshot,
     starts_at, expires_at, status, source, notes)
  select e.user_id, f.id, f.code, f.name, 0, coalesce(f.currency, 'INR'),
         f.duration_days, f.total_contact_views, f.daily_contact_view_limit,
         now(), now() + make_interval(days => f.duration_days), 'active', 'free_catchup',
         'One-time Free plan for members with an approved profile'
    from eligible e cross join free_plan f
  returning id, user_id, plan_id, to_jsonb(user_subscriptions.*) as row_json
)
insert into public.subscription_events (user_id, subscription_id, plan_id, action, reason, after_json)
select i.user_id, i.id, i.plan_id, 'assigned', 'One-time Free catch-up (approved profile)', i.row_json
  from ins i;

-- ---------------------------------------------------------------------
-- 8. Remove the shadow profile(s) created only to satisfy the old FK.
-- ---------------------------------------------------------------------
delete from public.profiles where deleted_reason = 'auto_shadow_for_subscription_fk';

commit;

-- ---------------------------------------------------------------------
-- Checks (run after applying; all should look sensible):
--   select status, source, count(*) from user_subscriptions group by 1, 2 order by 1, 2;
--   select count(*) as active_free_now from user_subscriptions
--    where status = 'active' and plan_code = 'free' and expires_at > now();
--   select action, count(*) from subscription_events group by 1;
-- ---------------------------------------------------------------------
