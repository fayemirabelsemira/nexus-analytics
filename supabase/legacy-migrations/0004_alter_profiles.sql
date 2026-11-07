-- Add role and account_status to profiles table
alter table profiles
add column if not exists role text default 'user',
add column if not exists account_status text default 'active';

-- Add check constraints for valid values
alter table profiles
add constraint role_check check (role in ('admin', 'user', 'viewer')),
add constraint account_status_check check (account_status in ('active', 'inactive', 'suspended'));

-- Update existing profiles to have default values if they are null
update profiles
set role = coalesce(role, 'user'),
    account_status = coalesce(account_status, 'active');
