create extension if not exists "pgcrypto";

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);

create table public.resumes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  file_url text not null,
  parsed_data jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade,
  url text,
  company text,
  title text,
  description text,
  parsed_data jsonb,
  created_at timestamptz not null default now()
);

create table public.analyses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  resume_id uuid not null references public.resumes(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  match_score numeric,
  result jsonb,
  created_at timestamptz not null default now()
);

create table public.company_research (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  website text,
  research_data jsonb,
  legitimacy_data jsonb,
  updated_at timestamptz not null default now()
);
create unique index company_research_name_idx on public.company_research (lower(company_name));

alter table public.resumes enable row level security;
alter table public.jobs enable row level security;
alter table public.analyses enable row level security;

create policy "own resumes" on public.resumes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own jobs" on public.jobs for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own analyses" on public.analyses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);