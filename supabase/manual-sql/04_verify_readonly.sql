-- =====================================================================
-- 04_verify_readonly.sql  (READ-ONLY: only SELECTs, changes nothing)
-- Run after 01-03 and paste me the three result tables.
-- =====================================================================

-- A) RLS must be ON (rowsecurity = true) for all four tables
select tablename, rowsecurity
from pg_tables
where schemaname = 'public'
  and tablename in ('profiles', 'datasets', 'analysis_history', 'reports')
order by tablename;

-- B) Policies in place
select tablename, policyname, cmd
from pg_policies
where (schemaname = 'public' and tablename in ('profiles', 'datasets', 'analysis_history', 'reports'))
   or (schemaname = 'storage' and tablename = 'objects')
order by schemaname, tablename, policyname;

-- C) Buckets must be private (public = false)
select id, public, file_size_limit, allowed_mime_types
from storage.buckets
where id in ('datasets', 'reports');
