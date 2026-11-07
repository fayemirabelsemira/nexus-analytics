-- Prepares `transactions` for real business imports (CSV / Excel).

-- Large files can hold amounts bigger than numeric(10,2) allows (~100 million).
alter table transactions alter column amount type numeric(14,2);

-- Rows imported without a category are grouped together instead of being NULL.
alter table transactions alter column category set default 'Uncategorized';

-- The dashboard always reads one user's rows ordered by date.
create index if not exists idx_transactions_user_date on transactions (user_id, date);

-- Real sales data legitimately contains identical rows (same item, same price, same day).
-- An older demo seed created this unique index, which would reject such imports.
drop index if exists idx_transactions_user_key;
