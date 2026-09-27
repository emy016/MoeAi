-- Arena questions generated from a course's own material, cached per course so
-- they are made once and shared by every student in it. Students read them
-- (only for courses they can read); only the server (service role) writes, so
-- no student can plant questions for classmates.
create table if not exists public.ranked_questions (
  id bigint generated always as identity primary key,
  course_id uuid not null references public.courses(id) on delete cascade,
  question jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists ranked_questions_course_idx on public.ranked_questions (course_id);
alter table public.ranked_questions enable row level security;
drop policy if exists ranked_questions_read on public.ranked_questions;
create policy ranked_questions_read on public.ranked_questions for select to authenticated using (public.can_read_course(course_id));
