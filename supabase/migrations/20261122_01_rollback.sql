-- Rollback for 20261122_01_lock_down_profiles.sql
-- Restores the previous (insecure) behaviour. Use only if the app breaks
-- and the code changes can't be fixed forward quickly.

begin;

drop trigger if exists profile_photos_guard on public.profile_photos;
drop function if exists public.profile_photos_guard();

drop view if exists public.public_profiles;
drop function if exists public.sanitize_profile_snapshot(jsonb);

drop policy if exists "Owners and admins can view profiles" on public.profiles;
drop policy if exists "Anyone can view profiles" on public.profiles;
create policy "Anyone can view profiles" on public.profiles for select using (true);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = user_id);

drop trigger if exists profiles_guard on public.profiles;
drop function if exists public.profiles_guard();
drop function if exists public.next_profile_public_id(text);
drop function if exists public.is_restricted_writer();
-- is_superadmin() is left in place (other tables' policies may use it).

commit;
