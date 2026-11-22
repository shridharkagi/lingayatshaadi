-- =====================================================================
-- 20261122_04_admin_notes.sql
-- Internal admin notes on an account (Member 360° page) and follow-up
-- dates for upgrade requests. Only reachable through service-role admin
-- APIs (RLS on, no policies). Idempotent.
-- =====================================================================

create table if not exists public.admin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,              -- account (auth user) the note is about
  body text not null check (length(body) between 1 and 2000),
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists admin_notes_user_idx on public.admin_notes (user_id, created_at desc);
alter table public.admin_notes enable row level security;

-- Follow-ups for the upgrade-request pipeline.
alter table public.subscription_upgrade_requests add column if not exists follow_up_at timestamptz;
alter table public.subscription_upgrade_requests add column if not exists admin_note text;
