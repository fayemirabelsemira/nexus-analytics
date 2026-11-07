-- =====================================================================
-- 02_dataset_tables.sql
-- Run SECOND (after 01). Supabase Dashboard -> SQL Editor -> New query.
--
-- CREATES: tables public.datasets, public.analysis_history, public.reports,
--   their indexes, RLS policies and triggers.
-- MODIFIES EXISTING: function public.update_updated_at_column() is
--   re-declared with the same behaviour plus a fixed search_path.
-- DESTRUCTIVE? No (everything is "if not exists" / "drop policy if exists" on
--   policies created by this script only).
-- Does NOT touch: transactions, activities, profiles.
-- Safe to re-run.
-- =====================================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Prevents moving a row to another owner or pointing it at another user's file.
create or replace function public.protect_owner_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed.';
  end if;
  if new.storage_path is distinct from old.storage_path then
    raise exception 'storage_path cannot be changed.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------- datasets
create table if not exists public.datasets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  dataset_name      text not null check (char_length(dataset_name) between 1 and 120),
  original_filename text not null check (char_length(original_filename) between 1 and 255),
  file_format       text not null check (file_format in ('csv', 'xlsx', 'xls')),
  file_size         bigint not null check (file_size > 0 and file_size <= 26214400),   -- 25 MiB
  row_count         integer not null check (row_count between 0 and 100000),
  column_count      integer not null check (column_count between 0 and 500),
  category          text check (category is null or char_length(category) <= 60),
  storage_path      text not null unique,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  -- the file must live in the owner's own folder: <user_id>/...
  constraint datasets_path_in_owner_folder check (storage_path like user_id::text || '/%')
);

create index if not exists idx_datasets_user_created on public.datasets (user_id, created_at desc);

drop trigger if exists datasets_set_updated_at on public.datasets;
create trigger datasets_set_updated_at before update on public.datasets
for each row execute function public.update_updated_at_column();

drop trigger if exists datasets_protect_owner on public.datasets;
create trigger datasets_protect_owner before update on public.datasets
for each row execute function public.protect_owner_columns();

alter table public.datasets enable row level security;

drop policy if exists "datasets_select_own" on public.datasets;
create policy "datasets_select_own" on public.datasets for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "datasets_insert_own" on public.datasets;
create policy "datasets_insert_own" on public.datasets for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "datasets_update_own" on public.datasets;
create policy "datasets_update_own" on public.datasets for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "datasets_delete_own" on public.datasets;
create policy "datasets_delete_own" on public.datasets for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------ analysis_history
create table if not exists public.analysis_history (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  dataset_id       uuid not null references public.datasets (id) on delete cascade,
  analysis_name    text not null check (char_length(analysis_name) between 1 and 120),
  analysis_type    text not null check (char_length(analysis_type) between 1 and 40),
  analysis_results jsonb not null default '{}'::jsonb
                   check (pg_column_size(analysis_results) <= 1048576),               -- 1 MiB
  created_at       timestamptz not null default now()
);

create index if not exists idx_history_user_created on public.analysis_history (user_id, created_at desc);
create index if not exists idx_history_dataset on public.analysis_history (dataset_id);

alter table public.analysis_history enable row level security;

drop policy if exists "history_select_own" on public.analysis_history;
create policy "history_select_own" on public.analysis_history for select to authenticated
  using ((select auth.uid()) = user_id);

-- may only attach history to a dataset the user owns
drop policy if exists "history_insert_own" on public.analysis_history;
create policy "history_insert_own" on public.analysis_history for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = (select auth.uid()))
  );

drop policy if exists "history_delete_own" on public.analysis_history;
create policy "history_delete_own" on public.analysis_history for delete to authenticated
  using ((select auth.uid()) = user_id);
-- (no UPDATE policy on purpose: history entries are immutable)

-- ---------------------------------------------------------------- reports
create table if not exists public.reports (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  dataset_id    uuid not null references public.datasets (id) on delete cascade,
  report_name   text not null check (char_length(report_name) between 1 and 120),
  report_format text not null check (report_format in ('csv', 'xlsx', 'html', 'json', 'pdf')),
  storage_path  text not null unique,
  created_at    timestamptz not null default now(),
  constraint reports_path_in_owner_folder check (storage_path like user_id::text || '/%')
);

create index if not exists idx_reports_user_created on public.reports (user_id, created_at desc);
create index if not exists idx_reports_dataset on public.reports (dataset_id);

drop trigger if exists reports_protect_owner on public.reports;
create trigger reports_protect_owner before update on public.reports
for each row execute function public.protect_owner_columns();

alter table public.reports enable row level security;

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own" on public.reports for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.datasets d where d.id = dataset_id and d.user_id = (select auth.uid()))
  );

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own" on public.reports for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ------------------------------------------------------------------ grants
-- Guests never touch the database, so anonymous visitors get no table access at all.
revoke all on public.datasets, public.analysis_history, public.reports from anon;
grant select, insert, update, delete on public.datasets to authenticated;
grant select, insert, delete on public.analysis_history to authenticated;
grant select, insert, delete on public.reports to authenticated;
