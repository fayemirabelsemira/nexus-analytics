-- =====================================================================
-- 00_base_profiles.sql  -- run FIRST in Supabase Dashboard -> SQL Editor -> New query.
-- Creates public.profiles (+ RLS and role/status guards) only if it does not exist yet.
-- Non-destructive; safe to re-run.
-- =====================================================================
create table if not exists public.profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  updated_at     timestamptz,
  username       text unique,
  full_name      text,
  avatar_url     text,
  website        text,
  role           text not null default 'user',
  account_status text not null default 'active',
  email          text,
  constraint username_length check (username is null or char_length(username) >= 3),
  constraint role_check check (role in ('admin', 'user', 'viewer')),
  constraint account_status_check check (account_status in ('active', 'inactive', 'suspended'))
);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by owner." on public.profiles;
create policy "Profiles are viewable by owner." on public.profiles for select using (auth.uid() = id);

drop policy if exists "Users can insert their own profile." on public.profiles;
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);

drop policy if exists "Users can update own profile." on public.profiles;
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

create or replace function public.set_profile_defaults_on_insert()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.role = 'user';
  new.account_status = 'active';
  return new;
end;
$$;

drop trigger if exists set_profile_defaults_on_insert on public.profiles;
create trigger set_profile_defaults_on_insert before insert on public.profiles
for each row execute function public.set_profile_defaults_on_insert();

create or replace function public.prevent_profile_role_status_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.role is distinct from old.role then raise exception 'Updating role is not permitted.'; end if;
  if new.account_status is distinct from old.account_status then raise exception 'Updating account_status is not permitted.'; end if;
  return new;
end;
$$;

drop trigger if exists prevent_profile_role_status_update on public.profiles;
create trigger prevent_profile_role_status_update before update on public.profiles
for each row execute function public.prevent_profile_role_status_update();
