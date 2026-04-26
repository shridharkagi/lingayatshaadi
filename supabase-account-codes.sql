-- Persist stable account codes for each auth user.
-- Run once in Supabase SQL editor.

create table if not exists public.user_account_codes (
  user_id uuid primary key references auth.users(id) on delete cascade,
  account_code text not null unique,
  year_month char(4) not null,
  sequence_no integer not null check (sequence_no > 0),
  source_created_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists user_account_codes_account_code_idx
  on public.user_account_codes (account_code);

create index if not exists user_account_codes_year_month_idx
  on public.user_account_codes (year_month, sequence_no desc);

do $$
begin
  -- Remove old monthly uniqueness if it exists from earlier rollout.
  if exists (
    select 1
    from pg_constraint
    where conname = 'user_account_codes_year_month_sequence_no_key'
  ) then
    alter table public.user_account_codes
      drop constraint user_account_codes_year_month_sequence_no_key;
  end if;
end $$;

-- If rows were created with month-wise sequence, resequence globally.
do $$
begin
  if exists (
    select 1
    from (
      select sequence_no, count(*) c
      from public.user_account_codes
      group by sequence_no
      having count(*) > 1
    ) dups
  ) then
    with ordered as (
      select
        user_id,
        row_number() over (
          order by source_created_at asc nulls last, created_at asc, user_id asc
        ) as new_seq
      from public.user_account_codes
    )
    -- Phase 1: move all rows to guaranteed-unique temporary codes so we can
    -- safely rewrite values even under the existing unique(account_code).
    update public.user_account_codes c
    set account_code = 'TMP_' || c.user_id::text
    where exists (
      select 1 from ordered o where o.user_id = c.user_id
    );

    with ordered as (
      select
        user_id,
        row_number() over (
          order by source_created_at asc nulls last, created_at asc, user_id asc
        ) as new_seq
      from public.user_account_codes
    )
    -- Phase 2: write final global sequence and final account code.
    update public.user_account_codes c
    set
      sequence_no = o.new_seq,
      account_code = 'U' || c.year_month || o.new_seq::text
    from ordered o
    where o.user_id = c.user_id;
  end if;
end $$;

-- New rule: sequence_no is globally increasing (never resets by month).
create unique index if not exists user_account_codes_sequence_no_key
  on public.user_account_codes (sequence_no);

create or replace function public.touch_user_account_codes_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_touch_user_account_codes_updated_at on public.user_account_codes;
create trigger trg_touch_user_account_codes_updated_at
before update on public.user_account_codes
for each row
execute function public.touch_user_account_codes_updated_at();

create or replace function public.ensure_user_account_code(
  p_user_id uuid,
  p_created_at timestamptz default null
)
returns text
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_existing text;
  v_created_at timestamptz;
  v_year_month text;
  v_next_seq integer;
  v_code text;
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  select account_code into v_existing
  from public.user_account_codes
  where user_id = p_user_id;
  if v_existing is not null then
    return v_existing;
  end if;

  select coalesce(p_created_at, u.created_at, now())
    into v_created_at
  from auth.users u
  where u.id = p_user_id;
  v_created_at := coalesce(v_created_at, p_created_at, now());
  v_year_month := to_char(v_created_at at time zone 'utc', 'YYMM');

  -- Serialize globally so sequence_no is monotonic across all months.
  perform pg_advisory_xact_lock(hashtext('user_account_codes:global_sequence'));

  select coalesce(max(sequence_no), 0) + 1
    into v_next_seq
  from public.user_account_codes;

  v_code := 'U' || v_year_month || v_next_seq::text;

  insert into public.user_account_codes (
    user_id,
    account_code,
    year_month,
    sequence_no,
    source_created_at
  ) values (
    p_user_id,
    v_code,
    v_year_month,
    v_next_seq,
    v_created_at
  )
  on conflict (user_id) do nothing;

  if found then
    return v_code;
  end if;

  select account_code into v_existing
  from public.user_account_codes
  where user_id = p_user_id;
  return v_existing;
end;
$$;

grant execute on function public.ensure_user_account_code(uuid, timestamptz) to service_role;

do $$
declare
  r record;
begin
  for r in
    select u.id, u.created_at
    from auth.users u
    left join public.user_account_codes c on c.user_id = u.id
    where c.user_id is null
    order by u.created_at asc nulls last, u.id asc
  loop
    perform public.ensure_user_account_code(r.id, r.created_at);
  end loop;
end $$;
