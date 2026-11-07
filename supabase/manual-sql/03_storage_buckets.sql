-- =====================================================================
-- 03_storage_buckets.sql
-- Run THIRD (after 02). Supabase Dashboard -> SQL Editor -> New query.
--
-- CREATES: private Storage buckets "datasets" and "reports" and the
--   policies on storage.objects that limit each user to their own folder
--   (<user_id>/...). If a bucket with the same id already exists, only its
--   privacy / size / mime-type settings are overwritten.
-- DESTRUCTIVE? No. No files or buckets are deleted.
-- Safe to re-run.
-- No UPDATE policy on purpose: files are never overwritten (the app uploads
-- with upsert disabled).
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('datasets', 'datasets', false, 26214400,
   array['text/csv',
         'application/vnd.ms-excel',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']),
  ('reports', 'reports', false, 10485760,
   array['text/csv',
         'text/html',
         'application/json',
         'application/pdf',
         'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- datasets bucket -------------------------------------------------------
drop policy if exists "datasets_files_select_own" on storage.objects;
create policy "datasets_files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'datasets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "datasets_files_insert_own" on storage.objects;
create policy "datasets_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'datasets' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "datasets_files_delete_own" on storage.objects;
create policy "datasets_files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'datasets' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- reports bucket --------------------------------------------------------
drop policy if exists "reports_files_select_own" on storage.objects;
create policy "reports_files_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "reports_files_insert_own" on storage.objects;
create policy "reports_files_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'reports' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "reports_files_delete_own" on storage.objects;
create policy "reports_files_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'reports' and (storage.foldername(name))[1] = (select auth.uid())::text);
