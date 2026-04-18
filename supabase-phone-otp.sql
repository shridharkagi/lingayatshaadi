-- Run in Supabase SQL Editor (once). Stores hashed OTP codes for custom SMS (e.g. API HOME).
-- Service role bypasses RLS; anon cannot read this table.

create table if not exists public.phone_otp_challenges (
  phone text primary key,
  code_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists phone_otp_challenges_expires_at_idx on public.phone_otp_challenges (expires_at);

alter table public.phone_otp_challenges enable row level security;
