-- Site settings stored in Supabase so superadmin can save on serverless (read-only filesystem).
-- Run in Supabase SQL editor after deploy. Service role bypasses RLS for API routes.

create table if not exists public.site_settings (
  id text primary key default 'default',
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.site_settings is 'Singleton platform config (favicon, scripts, SEO, contact). Merged with defaults in app code.';

alter table public.site_settings enable row level security;

-- Intentionally no policies: only the service role (used by /api/site-config) can read/write.
