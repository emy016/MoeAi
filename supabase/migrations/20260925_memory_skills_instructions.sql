-- Student memory, skills and custom instructions. Applied 2026-09-25.
alter table public.student_memory
  add column if not exists importance text not null default 'called',
  add column if not exists source text not null default 'extract';
do $$ begin
  alter table public.student_memory add constraint student_memory_importance check (importance in ('always','called'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.student_memory add constraint student_memory_source check (source in ('tutor','student','quiz','extract'));
exception when duplicate_object then null; end $$;
update public.student_memory set importance = 'always' where kind in ('preference','goal') and importance = 'called';

create table if not exists public.student_skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 2 and 60),
  content text not null check (length(content) between 4 and 4000),
  usage text,
  enabled boolean not null default true,
  source text not null default 'student' check (source in ('student','tutor','template')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.student_skills add constraint student_skills_user_name unique (user_id, name);
alter table public.student_skills enable row level security;
drop policy if exists skills_own on public.student_skills;
create policy skills_own on public.student_skills for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.profiles add column if not exists custom_instructions text;
do $$ begin
  alter table public.profiles add constraint profiles_custom_instructions_len check (custom_instructions is null or length(custom_instructions) <= 1500);
exception when duplicate_object then null; end $$;
grant update (custom_instructions) on public.profiles to authenticated;
