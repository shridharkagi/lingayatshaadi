-- User-initiated profile deletion requests (admin approves → trash flow).
-- This block is also appended at the end of supabase-superadmin-control-center.sql.
-- Run either this file or the full control-center script in the Supabase SQL editor.

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
