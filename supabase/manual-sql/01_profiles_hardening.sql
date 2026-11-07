-- =====================================================================
-- 01_profiles_hardening.sql
-- Run FIRST. Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
--
-- MODIFIES EXISTING OBJECTS: table public.profiles, functions
--   prevent_profile_role_status_update(), set_profile_defaults_on_insert (unchanged).
-- CREATES: profiles.email column, handle_new_user(), sync_profile_email(),
--   two triggers on auth.users.
-- DESTRUCTIVE? No. Nothing is dropped or deleted. Rows are only added/backfilled.
-- Safe to re-run.
-- Requires: migrations 0001, 0004, 0005 already applied (profiles, role,
--   account_status, and the role/status triggers).
-- =====================================================================

-- 1) email column (mirrors auth.users.email; users cannot edit it, see step 4)
alter table public.profiles add column if not exists email text;

update public.profiles p
set email = u.email
from auth.users u
where u.id = p.id and p.email is null;

-- 2) role / account_status may not be NULL (NULL slipped past the old trigger)
update public.profiles set role = 'user' where role is null;
update public.profiles set account_status = 'active' where account_status is null;
alter table public.profiles alter column role set not null;
alter table public.profiles alter column account_status set not null;

-- 3) Create a profile automatically for every new auth user
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', ''))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when the auth email changes
create or replace function public.sync_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
after update of email on auth.users
for each row execute function public.sync_profile_email();

-- Backfill: profiles for users that registered before this trigger existed (additive only)
insert into public.profiles (id, email, full_name)
select u.id, u.email, coalesce(u.raw_user_meta_data ->> 'full_name', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);

-- 4) Close the NULL bypass and protect id/email from client edits.
--    (auth.uid() is NULL for SQL-editor / server-side changes, so those still work.)
create or replace function public.prevent_profile_role_status_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role then
    raise exception 'Updating role is not permitted.';
  end if;
  if new.account_status is distinct from old.account_status then
    raise exception 'Updating account_status is not permitted.';
  end if;
  if new.id is distinct from old.id then
    raise exception 'Updating id is not permitted.';
  end if;
  if auth.uid() is not null and new.email is distinct from old.email then
    raise exception 'Updating email is not permitted.';
  end if;
  return new;
end;
$$;
-- The existing trigger "prevent_profile_role_status_update" keeps using this function.
