-- Interview Questions Library: reusable bank populated on save
create table if not exists public.interview_questions_library (
  id uuid primary key default gen_random_uuid(),
  question_text text not null,
  question_text_normalized text not null unique,
  competency_names text[] not null default '{}',
  requirement_titles text[] not null default '{}',
  tags text[] not null default '{}',
  estimated_minutes numeric default 4.0,
  usage_count int not null default 1,
  used_in_jobs uuid[] not null default '{}',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now()
);

create index if not exists idx_iql_normalized on public.interview_questions_library (question_text_normalized);
create index if not exists idx_iql_last_used on public.interview_questions_library (last_used_at desc);

grant select, insert, update on public.interview_questions_library to authenticated;
grant all on public.interview_questions_library to service_role;

alter table public.interview_questions_library enable row level security;

drop policy if exists "Authenticated can read library" on public.interview_questions_library;
create policy "Authenticated can read library"
on public.interview_questions_library for select
to authenticated using (true);

drop policy if exists "Authenticated can insert library" on public.interview_questions_library;
create policy "Authenticated can insert library"
on public.interview_questions_library for insert
to authenticated with check (true);

drop policy if exists "Authenticated can update library" on public.interview_questions_library;
create policy "Authenticated can update library"
on public.interview_questions_library for update
to authenticated using (true);
