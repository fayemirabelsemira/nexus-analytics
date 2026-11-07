-- Helper function to update updated_at column
create or replace function update_updated_at_column()
returns trigger as $$
begin
   new.updated_at = now();
   return new;
end;
$$ language 'plpgsql';

-- Profiles table extends supabase.auth.users
create table profiles (
    id uuid references auth.users not null primary key,
    updated_at timestamp with time zone,
    username text unique,
    full_name text,
    avatar_url text,
    website text,
    constraint username_length check (char_length(username) >= 3)
);

-- Enable RLS
alter table profiles enable row level security;

-- Function to prevent updates to role and account_status
create or replace function prevent_profile_role_status_update()
returns trigger as $$
begin
    if (NEW.role <> OLD.role) then
        raise exception 'Updating role is not permitted.';
    end if;
    if (NEW.account_status <> OLD.account_status) then
        raise exception 'Updating account_status is not permitted.';
    end if;
    return NEW;
end;
$$ language plpgsql;

-- Trigger to call the function before update on profiles
drop trigger if exists prevent_profile_role_status_update on profiles;
create trigger prevent_profile_role_status_update
before update on profiles
for each row
execute function prevent_profile_role_status_update();

-- Policies

-- Profiles are viewable only by the owner
create policy "Profiles are viewable by owner."
on profiles for select
using ( auth.uid() = id );

-- Users can insert their own profile (with defaults)
create policy "Users can insert their own profile."
on profiles for insert
with check ( auth.uid() = id );

-- Users can update their own profile (business logic enforced by trigger)
create policy "Users can update own profile."
on profiles for update
using ( auth.uid() = id );
