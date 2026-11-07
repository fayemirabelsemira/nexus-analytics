create table transactions (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users on delete cascade,
    amount numeric(10,2) not null,
    description text,
    category text,
    date date not null,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone
);

-- Enable RLS
alter table transactions enable row level security;

-- Policies
create policy "Users can view their own transactions."
on transactions for select
using ( auth.uid() = user_id );

create policy "Users can insert their own transactions."
on transactions for insert
with check ( auth.uid() = user_id );

create policy "Users can update own transactions."
on transactions for update
using ( auth.uid() = user_id );

create policy "Users can delete own transactions."
on transactions for delete
using ( auth.uid() = user_id );

-- Trigger to update updated_at column
create trigger update_transactions_updated_at
before update on transactions
for each row
execute function update_updated_at_column();
