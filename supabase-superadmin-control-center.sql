-- Superadmin control center schema: audit, trash, subscriptions, payments.
-- Safe to run multiple times.

create extension if not exists pgcrypto;

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action_type text not null,
  entity_type text not null,
  entity_id text not null,
  before_json jsonb,
  after_json jsonb,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_admin_audit_logs_created_at on admin_audit_logs(created_at desc);
create index if not exists idx_admin_audit_logs_actor on admin_audit_logs(actor_user_id);

create table if not exists profile_moderation_events (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  action text not null check (action in ('submit','approve','reject','reopen')),
  reason text,
  actor_user_id uuid references auth.users(id) on delete set null,
  payload jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_profile_moderation_events_profile on profile_moderation_events(profile_id, created_at desc);

create table if not exists profile_trash (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  public_id text,
  full_name text,
  deleted_reason text not null,
  deleted_note text,
  deleted_by uuid not null references auth.users(id) on delete restrict,
  deleted_at timestamptz not null default now(),
  restored_at timestamptz,
  restored_by uuid references auth.users(id) on delete set null,
  is_purged boolean not null default false,
  purged_at timestamptz,
  payload jsonb not null
);
create unique index if not exists uq_profile_trash_profile_active
  on profile_trash(profile_id) where restored_at is null and is_purged = false;
create index if not exists idx_profile_trash_deleted_at on profile_trash(deleted_at desc);

alter table profiles add column if not exists deleted_at timestamptz;
alter table profiles add column if not exists deleted_reason text;
alter table profiles add column if not exists deleted_note text;
alter table profiles add column if not exists deleted_by uuid references auth.users(id) on delete set null;
alter table profiles add column if not exists is_blocked boolean not null default false;
alter table profiles add column if not exists blocked_reason text;
alter table profiles add column if not exists blocked_at timestamptz;
alter table profiles add column if not exists blocked_by uuid references auth.users(id) on delete set null;

create table if not exists subscription_plans (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  duration_days integer not null check (duration_days > 0),
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'INR',
  features jsonb not null default '[]'::jsonb,
  total_contact_views integer not null default 10 check (total_contact_views >= 0),
  daily_contact_view_limit integer not null default 3 check (daily_contact_view_limit >= 0),
  is_active boolean not null default true,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table subscription_plans add column if not exists total_contact_views integer not null default 10;
alter table subscription_plans add column if not exists daily_contact_view_limit integer not null default 3;
alter table subscription_plans drop constraint if exists subscription_plans_total_contact_views_check;
alter table subscription_plans add constraint subscription_plans_total_contact_views_check check (total_contact_views >= 0);
alter table subscription_plans drop constraint if exists subscription_plans_daily_contact_view_limit_check;
alter table subscription_plans add constraint subscription_plans_daily_contact_view_limit_check check (daily_contact_view_limit >= 0);

create table if not exists user_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  plan_id uuid not null references subscription_plans(id) on delete restrict,
  status text not null check (status in ('pending','active','expired','cancelled','refunded')),
  source text not null check (source in ('manual','gateway')),
  starts_at timestamptz not null,
  expires_at timestamptz not null,
  assigned_by uuid references auth.users(id) on delete set null,
  notes text,
  plan_name_snapshot text,
  price_snapshot numeric(12,2),
  currency_snapshot text,
  duration_days_snapshot integer,
  total_contact_views_snapshot integer,
  daily_contact_view_limit_snapshot integer,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_subscriptions_user on user_subscriptions(user_id, expires_at desc);
alter table user_subscriptions add column if not exists plan_name_snapshot text;
alter table user_subscriptions add column if not exists price_snapshot numeric(12,2);
alter table user_subscriptions add column if not exists currency_snapshot text;
alter table user_subscriptions add column if not exists duration_days_snapshot integer;
alter table user_subscriptions add column if not exists total_contact_views_snapshot integer;
alter table user_subscriptions add column if not exists daily_contact_view_limit_snapshot integer;

create table if not exists payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references user_subscriptions(id) on delete set null,
  provider text not null check (provider in ('manual','razorpay','cashfree','stripe','other')),
  external_txn_id text,
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  status text not null check (status in ('initiated','paid','failed','refunded','void')),
  paid_at timestamptz,
  received_by uuid references auth.users(id) on delete set null,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_payment_transactions_user on payment_transactions(user_id, created_at desc);

alter table payment_transactions add column if not exists payment_mode text;
alter table payment_transactions add column if not exists payer_source text;
alter table payment_transactions add column if not exists payment_made_at timestamptz;
alter table payment_transactions add column if not exists payment_mode_details text;
alter table payment_transactions add column if not exists refunded_at timestamptz;
alter table payment_transactions add column if not exists refund_reason text;

create table if not exists manual_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references payment_transactions(id) on delete cascade,
  receipt_ref text not null,
  collected_by uuid references auth.users(id) on delete set null,
  proof_url text,
  note text,
  created_at timestamptz not null default now()
);

insert into subscription_plans (code, name, duration_days, price, features, total_contact_views, daily_contact_view_limit)
values
  ('free','Free',30,0,'["Basic profile visibility"]'::jsonb, 10, 1),
  ('gold','Gold',90,999,'["30 contact views total","Premium profile reach"]'::jsonb, 30, 3),
  ('platinum','Platinum',180,1999,'["75 contact views total","Priority visibility"]'::jsonb, 75, 5),
  ('diamond','Diamond',365,3499,'["150 contact views total","Highest visibility priority"]'::jsonb, 150, 8)
on conflict (code) do update set
  name = excluded.name,
  duration_days = excluded.duration_days,
  price = excluded.price,
  features = excluded.features,
  total_contact_views = excluded.total_contact_views,
  daily_contact_view_limit = excluded.daily_contact_view_limit,
  updated_at = now();

update subscription_plans
set is_active = false, updated_at = now()
where code in ('premium_3m', 'premium_6m');

create table if not exists profile_kyc_documents (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  id_type text not null check (id_type in ('aadhar','voter_id','pan','driving_license','passport','other')),
  file_type text not null,
  file_name text not null,
  url text not null,
  storage_path text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profile_kyc_documents_profile on profile_kyc_documents(profile_id, created_at desc);

create table if not exists subscription_notification_logs (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references user_subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reminder_type text not null check (reminder_type in ('expiry_7d','expiry_3d','expiry_1d')),
  target_date date not null,
  created_at timestamptz not null default now(),
  unique (subscription_id, reminder_type, target_date)
);

create table if not exists subscription_upgrade_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,
  plan_id uuid not null references subscription_plans(id) on delete restrict,
  plan_code text,
  plan_name text not null,
  plan_price numeric(12,2) not null default 0,
  callback_number text not null,
  note text,
  status text not null default 'new' check (status in ('new','contacted','closed')),
  email_notification_status text not null default 'pending',
  email_notification_error text,
  whatsapp_notification_status text not null default 'pending',
  whatsapp_notification_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_subscription_upgrade_requests_created_at
  on subscription_upgrade_requests(created_at desc);
alter table subscription_upgrade_requests
  add column if not exists email_notification_status text not null default 'pending';
alter table subscription_upgrade_requests
  add column if not exists email_notification_error text;
alter table subscription_upgrade_requests
  add column if not exists whatsapp_notification_status text not null default 'pending';
alter table subscription_upgrade_requests
  add column if not exists whatsapp_notification_error text;

create table if not exists whatsapp_leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  name text not null,
  contact_no text not null,
  city text not null,
  source_page text not null check (source_page in ('home', 'search', 'profile')),
  status text not null default 'submitted' check (status in ('submitted', 'duplicate', 'blocked')),
  date_of_joining date not null default (now() at time zone 'Asia/Kolkata')::date,
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_leads_account_created
  on whatsapp_leads(account_id, created_at desc);
create index if not exists idx_whatsapp_leads_contact_created
  on whatsapp_leads(contact_no, created_at desc);
create index if not exists idx_whatsapp_leads_source_created
  on whatsapp_leads(source_page, created_at desc);

create table if not exists whatsapp_lead_events (
  id uuid primary key default gen_random_uuid(),
  account_id uuid references auth.users(id) on delete set null,
  source_page text not null check (source_page in ('home', 'search', 'profile')),
  event_name text not null check (event_name in ('cta_impression', 'form_opened', 'submit_success')),
  metadata jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_whatsapp_lead_events_source_created
  on whatsapp_lead_events(source_page, created_at desc);

create or replace function send_subscription_expiry_reminders()
returns void
language plpgsql
security definer
as $$
declare
  rec record;
  days_left integer;
  reminder_type_val text;
begin
  for rec in
    select id, user_id, expires_at, plan_name_snapshot
    from user_subscriptions
    where status = 'active'
      and expires_at >= now()
      and expires_at <= now() + interval '7 days'
  loop
    days_left := floor(extract(epoch from (rec.expires_at - now())) / 86400);
    if days_left = 7 then
      reminder_type_val := 'expiry_7d';
    elsif days_left = 3 then
      reminder_type_val := 'expiry_3d';
    elsif days_left = 1 then
      reminder_type_val := 'expiry_1d';
    else
      reminder_type_val := null;
    end if;

    if reminder_type_val is null then
      continue;
    end if;

    begin
      insert into subscription_notification_logs (
        subscription_id,
        user_id,
        reminder_type,
        target_date
      )
      values (
        rec.id,
        rec.user_id,
        reminder_type_val,
        (rec.expires_at at time zone 'Asia/Kolkata')::date
      );

      insert into notifications (user_id, type, title, message, read)
      values (
        rec.user_id,
        'general',
        'Subscription expiry reminder',
        coalesce(rec.plan_name_snapshot, 'Your plan') || ' expires in ' || days_left || ' day(s). Please renew to continue uninterrupted access.',
        false
      );
    exception
      when unique_violation then
        -- reminder already sent for this cycle; skip
        null;
    end;
  end loop;
end;
$$;

-- Optional pg_cron schedule (daily at 10:00 IST).
-- Enable extension once per database:
--   create extension if not exists pg_cron;
-- Then schedule:
--   select cron.schedule(
--     'subscription-expiry-reminders-10am-ist',
--     '30 4 * * *',
--     $$select send_subscription_expiry_reminders();$$
--   );

-- ---------------------------------------------------------------------------
-- Optional: legacy membership_plans seed (run manually in SQL editor when needed)
-- Use when user_subscriptions.plan_id REFERENCES membership_plans(id) and
-- SELECT count(*) FROM membership_plans is 0. duration = months.
-- If your columns differ, adjust to match information_schema (e.g. drop popular).
-- ---------------------------------------------------------------------------
-- insert into membership_plans (name, duration, price, features, popular, is_free)
-- select * from (values
--   ('Free'::text, 1::int, 0::numeric, array['Basic profile visibility']::text[], false, true),
--   ('Gold'::text, 3::int, 999::numeric, array['Contact views','Premium reach']::text[], true, false),
--   ('Platinum'::text, 6::int, 1999::numeric, array['Priority visibility']::text[], false, false),
--   ('Diamond'::text, 12::int, 3499::numeric, array['Highest tier']::text[], false, false)
-- ) as v(name, duration, price, features, popular, is_free)
-- where not exists (select 1 from membership_plans limit 1);

-- ---------------------------------------------------------------------------
-- Profile deletion requests (member asks removal; admin approves → trash)
-- ---------------------------------------------------------------------------
create table if not exists profile_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null,
  admin_note text
);
create index if not exists idx_profile_deletion_requests_status_created
  on profile_deletion_requests(status, created_at desc);
create unique index if not exists uq_profile_deletion_one_pending
  on profile_deletion_requests(profile_id)
  where status = 'pending';
