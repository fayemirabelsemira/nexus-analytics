-- Ensure profiles table has default values for role and account_status (already set in 0004_alter_profiles.sql)
-- But we add triggers to enforce immutability.

-- Function to set defaults on insert (ignore any provided role or account_status)
create or replace function set_profile_defaults_on_insert()
returns trigger as $$
begin
    -- Regardless of what was provided, set role to 'user' and account_status to 'active'
    NEW.role = 'user';
    NEW.account_status = 'active';
    return NEW;
end;
$$ language plpgsql;

-- Function to prevent updates to role and account_status (already defined, but we ensure it exists)
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

-- Drop existing triggers if they exist to avoid duplicates
drop trigger if exists set_profile_defaults_on_insert on profiles;
drop trigger if exists prevent_profile_role_status_update on profiles;

-- Create triggers
create trigger set_profile_defaults_on_insert
before insert on profiles
for each row
execute function set_profile_defaults_on_insert();

create trigger prevent_profile_role_status_update
before update on profiles
for each row
execute function prevent_profile_role_status_update();
