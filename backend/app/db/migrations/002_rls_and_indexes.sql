-- Row Level Security policies and performance indexes
-- Run this AFTER the schema.sql has created the tables

-- Ensure RLS is enabled on all user-owned tables
alter table public.resumes enable row level security;
alter table public.jobs enable row level security;
alter table public.analyses enable row level security;

-- Drop existing policies if re-running (idempotent)
drop policy if exists "own resumes" on public.resumes;
drop policy if exists "own jobs" on public.jobs;
drop policy if exists "own analyses" on public.analyses;

-- Users can only see/modify their own resumes
create policy "own resumes" on public.resumes
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see/modify their own jobs
create policy "own jobs" on public.jobs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Users can only see/modify their own analyses
create policy "own analyses" on public.analyses
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Performance indexes for user-scoped queries
create index if not exists idx_resumes_user_id on public.resumes(user_id);
create index if not exists idx_jobs_user_id on public.jobs(user_id);
create index if not exists idx_analyses_user_id on public.analyses(user_id);
create index if not exists idx_analyses_created_at on public.analyses(created_at desc);

-- Company research is shared (no user_id) - no RLS needed
-- The unique index on lower(company_name) is already in schema.sql

-- Storage policies for the resumes bucket
-- These should be configured in Supabase Dashboard or via SQL:
-- INSERT: authenticated users can upload to their own folder
-- SELECT: authenticated users can read from their own folder
-- DELETE: authenticated users can delete from their own folder

-- Note: Storage policies are best managed via Supabase Dashboard.
-- The backend uses the service role key which bypasses storage policies.
