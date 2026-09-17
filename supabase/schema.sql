-- ============================================================================
-- EduMoe / MoeAI — complete database schema
-- Run this once in the Supabase SQL editor. It is idempotent enough to re-run.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — one row per authenticated student, created automatically on signup
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  university   text default 'FUE',
  faculty      text default 'Computer Science',
  year         int  default 1,
  locale       text default 'auto',   -- auto | en | ar | franco
  role         text default 'student' -- student | tutor | admin
                 check (role in ('student','tutor','admin')),
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Curriculum. Public read for any signed-in student; writes are admin-only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,        -- e.g. 'CS102'
  title       text not null,
  description text,
  faculty     text default 'Computer Science',
  year        int  default 1,
  semester    int  default 1,
  created_at  timestamptz default now()
);

create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  content     text,                        -- plain text / markdown of the lecture
  video_url   text,                        -- YouTube link once Moemen reposts
  order_index int default 0,
  -- Full-text search vector. Postgres FTS first; pgvector only if this fails.
  search_tsv  tsvector generated always as (
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
              ) stored,
  created_at  timestamptz default now()
);
create index if not exists lessons_search_idx on public.lessons using gin (search_tsv);
create index if not exists lessons_course_idx on public.lessons (course_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversations and messages
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  title      text default 'New chat',
  course_id  uuid references public.courses(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists conversations_user_idx
  on public.conversations (user_id, updated_at desc);

create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system')),
  content         text not null,
  language        text,                    -- detected language of this turn
  created_at      timestamptz default now()
);
-- Paginating a long chat scans this index, never the whole table.
create index if not exists messages_conv_idx
  on public.messages (conversation_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- student_memory — Layer 3 of MoeAI. One row per durable fact about a student.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.student_memory (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null default 'fact'
               check (kind in ('fact','preference','misconception','goal')),
  key        text not null,
  value      text not null,
  confidence real default 0.8,
  updated_at timestamptz default now(),
  unique (user_id, key)
);
create index if not exists memory_user_idx on public.student_memory (user_id, kind);

-- ─────────────────────────────────────────────────────────────────────────────
-- progress
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  course_id  uuid not null references public.courses(id) on delete cascade,
  lesson_id  uuid references public.lessons(id) on delete cascade,
  completed  boolean default false,
  score      real,
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);
create index if not exists progress_user_idx on public.progress (user_id, course_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- ai_logs — every model call. Cost control, debugging, and the "error logging"
-- line item on the launch checklist. Written by API routes via service role.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.ai_logs (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid references auth.users(id) on delete set null,
  conversation_id   uuid references public.conversations(id) on delete set null,
  provider          text,
  model             text,
  prompt_tokens     int,
  completion_tokens int,
  latency_ms        int,
  status            text,     -- ok | provider_error | all_failed | rate_limited
  error_message     text,
  created_at        timestamptz default now()
);
create index if not exists ai_logs_user_idx on public.ai_logs (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- rate_limits — per-user hourly message counter. Cheap abuse + spend cap.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.rate_limits (
  user_id      uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  count        int default 0,
  primary key (user_id, window_start)
);

-- ============================================================================
-- Row Level Security. Every table on. No exceptions.
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.lessons        enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.student_memory enable row level security;
alter table public.progress       enable row level security;
alter table public.ai_logs        enable row level security;
alter table public.rate_limits    enable row level security;

-- profiles: a student reads and edits only their own row.
drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

-- Curriculum is public to signed-in users; only admins write it.
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses
  for select using (auth.role() = 'authenticated');

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons
  for select using (auth.role() = 'authenticated');

-- Conversations: owner only.
drop policy if exists conversations_own on public.conversations;
create policy conversations_own on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages: reachable only through a conversation the caller owns.
drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages
  for all
  using (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  ))
  with check (exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id and c.user_id = auth.uid()
  ));

drop policy if exists memory_own on public.student_memory;
create policy memory_own on public.student_memory
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists progress_own on public.progress;
create policy progress_own on public.progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ai_logs: a student may read their own usage. Inserts come from the service
-- role, which bypasses RLS, so no insert policy is granted here.
drop policy if exists ai_logs_read_own on public.ai_logs;
create policy ai_logs_read_own on public.ai_logs
  for select using (auth.uid() = user_id);

-- rate_limits: no client policy at all. Service role only.

-- ============================================================================
-- Auto-create a profile row whenever someone signs up.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- search_lessons — the retrieval function MoeAI calls. Postgres FTS, no vector
-- database. Returns the top N lecture chunks for a query, optionally scoped to
-- one course.
-- ============================================================================
create or replace function public.search_lessons(
  q            text,
  course_code  text default null,
  max_results  int  default 4
)
returns table (
  lesson_id   uuid,
  course_code text,
  title       text,
  content     text,
  rank        real
)
language sql
stable
as $$
  select l.id,
         c.code,
         l.title,
         left(l.content, 1500),
         ts_rank(l.search_tsv, websearch_to_tsquery('english', q)) as rank
  from public.lessons l
  join public.courses c on c.id = l.course_id
  where l.search_tsv @@ websearch_to_tsquery('english', q)
    and (search_lessons.course_code is null or c.code = search_lessons.course_code)
  order by rank desc
  limit greatest(1, least(max_results, 10));
$$;
