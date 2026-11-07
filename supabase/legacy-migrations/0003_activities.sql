create table activities (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users on delete cascade,
    action text not null,
    entity_type text,
    entity_id uuid,
    metadata jsonb,
    created_at timestamp with time zone default now()
);

-- Enable RLS
alter table activities enable row level security;

-- Policies
create policy "Users can view their own activities."
on activities for select
using ( auth.uid() = user_id );

create policy "Users can insert their own activities."
on activities for insert
with check ( auth.uid() = user_id );

-- Indexes for performance
create index idx_activities_user_id on activities(user_id);
create index idx_activities_created_at on activities(created_at);
