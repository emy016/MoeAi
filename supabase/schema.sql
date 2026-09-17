-- ============================================================================
-- EduMoe / MoeAI — complete database schema
--
-- Applied to the live project via Supabase migrations. Kept here as the single
-- readable source of truth. Safe to re-run.
--
-- Two sources of truth feed MoeAI's retrieval:
--   1. `lessons`  — shared curriculum (FUE first-year CS). Public to students.
--   2. `chunks`   — Library Mode. Material a student or organisation uploads
--                   themselves. Private to its owner.
-- `search_material()` searches both in one call and RLS decides what you see.
-- ============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- profiles — one row per user, created automatically on signup
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  university   text default 'FUE',
  faculty      text default 'Computer Science',
  year         int  default 1,
  locale       text default 'auto',
  role         text default 'student' check (role in ('student','tutor','admin')),
  streak_days  int  default 0,
  last_active  date,
  created_at   timestamptz default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Shared curriculum. Readable by any signed-in student; writes are admin-only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.courses (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  title       text not null,
  description text,
  faculty     text default 'Computer Science',
  year        int  default 1,
  semester    int  default 1,
  accent      text default '#e5379a',
  order_index int  default 0,
  created_at  timestamptz default now()
);

create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.courses(id) on delete cascade,
  title       text not null,
  summary     text,
  content     text,
  -- YouTube id only, never a full URL. The page builds the embed src itself so
  -- a pasted tracking URL cannot smuggle parameters into the iframe.
  youtube_id  text,
  duration    text,
  order_index int default 0,
  search_tsv  tsvector generated always as (
                to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,'')) ||
                to_tsvector('simple',  coalesce(title,'') || ' ' || coalesce(content,''))
              ) stored,
  created_at  timestamptz default now()
);
create index if not exists lessons_search_idx on public.lessons using gin (search_tsv);
create index if not exists lessons_course_idx on public.lessons (course_id, order_index);

-- ─────────────────────────────────────────────────────────────────────────────
-- Library Mode. A student, tutor, or organisation uploads their own material;
-- MoeAI grounds on it exactly the way it grounds on shared curriculum.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.libraries (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  name        text not null default 'My library',
  description text,
  created_at  timestamptz default now()
);
create index if not exists libraries_owner_idx on public.libraries (owner_id);

create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  library_id  uuid not null references public.libraries(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  source_kind text default 'text' check (source_kind in ('text','pdf','youtube','link')),
  source_url  text,
  char_count  int default 0,
  created_at  timestamptz default now()
);
create index if not exists documents_owner_idx on public.documents (owner_id, created_at desc);

create table if not exists public.chunks (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  idx         int not null default 0,
  content     text not null,
  search_tsv  tsvector generated always as (
                to_tsvector('english', content) || to_tsvector('simple', content)
              ) stored,
  created_at  timestamptz default now()
);
create index if not exists chunks_search_idx on public.chunks using gin (search_tsv);
create index if not exists chunks_owner_idx on public.chunks (owner_id);
create index if not exists chunks_doc_idx on public.chunks (document_id, idx);

-- ─────────────────────────────────────────────────────────────────────────────
-- Conversations
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
  language        text,
  sources         jsonb,          -- what was retrieved for this answer
  created_at      timestamptz default now()
);
create index if not exists messages_conv_idx
  on public.messages (conversation_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Student model
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

create table if not exists public.progress (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  course_id  uuid references public.courses(id) on delete cascade,
  lesson_id  uuid references public.lessons(id) on delete cascade,
  completed  boolean default false,
  score      real,
  updated_at timestamptz default now(),
  unique (user_id, lesson_id)
);
create index if not exists progress_user_idx on public.progress (user_id, course_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Quizzes generated from whatever material the student actually has
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.quizzes (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users(id) on delete cascade,
  title       text not null,
  topic       text,
  document_id uuid references public.documents(id) on delete set null,
  course_id   uuid references public.courses(id) on delete set null,
  created_at  timestamptz default now()
);
create index if not exists quizzes_owner_idx on public.quizzes (owner_id, created_at desc);

create table if not exists public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.quizzes(id) on delete cascade,
  idx         int not null default 0,
  stem        text not null,
  options     jsonb not null,      -- ["a","b","c","d"]
  answer_idx  int not null,
  explanation text
);
create index if not exists quiz_questions_quiz_idx on public.quiz_questions (quiz_id, idx);

create table if not exists public.quiz_attempts (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references public.quizzes(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  score      real,
  answers    jsonb,
  created_at timestamptz default now()
);
create index if not exists quiz_attempts_user_idx on public.quiz_attempts (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- nudges — the proactive layer. Written by the daily cron, read in the app.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.nudges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  kind       text not null check (kind in ('revisit','dormant','streak','misconception')),
  body       text not null,
  action_url text,
  seen_at    timestamptz,
  created_at timestamptz default now()
);
create index if not exists nudges_user_idx on public.nudges (user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- Operational tables
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
  status            text,
  error_message     text,
  created_at        timestamptz default now()
);
create index if not exists ai_logs_user_idx on public.ai_logs (user_id, created_at desc);

create table if not exists public.rate_limits (
  user_id      uuid not null references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  count        int default 0,
  primary key (user_id, window_start)
);

-- ============================================================================
-- Row Level Security. Every table, no exceptions.
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.courses        enable row level security;
alter table public.lessons        enable row level security;
alter table public.libraries      enable row level security;
alter table public.documents      enable row level security;
alter table public.chunks         enable row level security;
alter table public.conversations  enable row level security;
alter table public.messages       enable row level security;
alter table public.student_memory enable row level security;
alter table public.progress       enable row level security;
alter table public.quizzes        enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_attempts  enable row level security;
alter table public.nudges         enable row level security;
alter table public.ai_logs        enable row level security;
alter table public.rate_limits    enable row level security;

drop policy if exists profiles_self on public.profiles;
create policy profiles_self on public.profiles
  for all to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Curriculum is readable by any signed-in student. Writes go through the
-- service role, so no insert/update policy is granted.
drop policy if exists courses_read on public.courses;
create policy courses_read on public.courses for select to authenticated using (true);

drop policy if exists lessons_read on public.lessons;
create policy lessons_read on public.lessons for select to authenticated using (true);

-- Library Mode: strictly owner-scoped. This is the boundary that lets an
-- organisation upload private material without leaking it to other students.
drop policy if exists libraries_own on public.libraries;
create policy libraries_own on public.libraries
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists documents_own on public.documents;
create policy documents_own on public.documents
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists chunks_own on public.chunks;
create policy chunks_own on public.chunks
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists conversations_own on public.conversations;
create policy conversations_own on public.conversations
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages are reachable only through a conversation the caller owns.
drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages
  for all to authenticated
  using (exists (select 1 from public.conversations c
                 where c.id = messages.conversation_id and c.user_id = auth.uid()))
  with check (exists (select 1 from public.conversations c
                 where c.id = messages.conversation_id and c.user_id = auth.uid()));

drop policy if exists memory_own on public.student_memory;
create policy memory_own on public.student_memory
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists progress_own on public.progress;
create policy progress_own on public.progress
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists quizzes_own on public.quizzes;
create policy quizzes_own on public.quizzes
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists quiz_questions_own on public.quiz_questions;
create policy quiz_questions_own on public.quiz_questions
  for all to authenticated
  using (exists (select 1 from public.quizzes q
                 where q.id = quiz_questions.quiz_id and q.owner_id = auth.uid()))
  with check (exists (select 1 from public.quizzes q
                 where q.id = quiz_questions.quiz_id and q.owner_id = auth.uid()));

drop policy if exists quiz_attempts_own on public.quiz_attempts;
create policy quiz_attempts_own on public.quiz_attempts
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Nudges are written by the cron (service role) and read/dismissed by the owner.
drop policy if exists nudges_read on public.nudges;
create policy nudges_read on public.nudges
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists nudges_update on public.nudges;
create policy nudges_update on public.nudges
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- A student may read their own usage. Inserts come from the service role.
drop policy if exists ai_logs_read_own on public.ai_logs;
create policy ai_logs_read_own on public.ai_logs
  for select to authenticated using (auth.uid() = user_id);

-- rate_limits: no client policy at all. Service role only.

-- ============================================================================
-- Signup trigger: create a profile and a default library.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)))
  on conflict (id) do nothing;

  insert into public.libraries (owner_id, name, description)
  values (new.id, 'My library', 'Material you upload yourself. MoeAI answers from it.');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- search_material — the one retrieval call MoeAI makes.
--
-- Searches shared curriculum and the caller's own library in a single query.
-- SECURITY INVOKER (the default), so RLS decides which chunks are visible:
-- a student can never retrieve another student's uploaded material.
-- ============================================================================
create or replace function public.search_material(
  q           text,
  scope       text default null,
  max_results int  default 5
)
returns table (source text, ref text, title text, content text, rank real)
language sql stable set search_path = public as $$
  -- Students do not type the syllabus's words. They ask about "karnaugh maps"
  -- when the lecture is called "K-Maps", or pile on context: "kirchhoff law
  -- circuits exam tomorrow". websearch_to_tsquery ANDs every term, so one word
  -- the curriculum never uses returns nothing at all — and MoeAI then correctly
  -- but uselessly says it has no material.
  --
  -- Try the strict AND first, because when it matches it is the most precise
  -- answer available. Only if it finds nothing, retry with the terms ORed.
  -- ts_rank still orders by overlap, so the best match stays on top.
  with parsed as (
    select
      websearch_to_tsquery('english', q) || websearch_to_tsquery('simple', q) as strict_q,
      nullif(replace(
        (websearch_to_tsquery('english', q) || websearch_to_tsquery('simple', q))::text,
        '&', '|'), '')::tsquery as loose_q
  ),
  hits as (
    select 'curriculum'::text as s, c.code as rf, l.title as ti,
           left(coalesce(l.content, l.summary, ''), 1500) as co,
           ts_rank(l.search_tsv, parsed.strict_q) as rk, true as strict
    from public.lessons l join public.courses c on c.id = l.course_id
    cross join parsed
    where l.search_tsv @@ parsed.strict_q and (scope is null or c.code = scope)
    union all
    select 'library'::text, d.title, d.title || ' (part ' || (ch.idx + 1) || ')',
           left(ch.content, 1500), ts_rank(ch.search_tsv, parsed.strict_q), true
    from public.chunks ch join public.documents d on d.id = ch.document_id
    cross join parsed
    where ch.search_tsv @@ parsed.strict_q
    union all
    select 'curriculum'::text, c.code, l.title,
           left(coalesce(l.content, l.summary, ''), 1500),
           ts_rank(l.search_tsv, parsed.loose_q), false
    from public.lessons l join public.courses c on c.id = l.course_id
    cross join parsed
    where parsed.loose_q is not null and l.search_tsv @@ parsed.loose_q
      and (scope is null or c.code = scope)
    union all
    select 'library'::text, d.title, d.title || ' (part ' || (ch.idx + 1) || ')',
           left(ch.content, 1500), ts_rank(ch.search_tsv, parsed.loose_q), false
    from public.chunks ch join public.documents d on d.id = ch.document_id
    cross join parsed
    where parsed.loose_q is not null and ch.search_tsv @@ parsed.loose_q
  )
  select h.s, h.rf, h.ti, h.co, h.rk
  from hits h
  where h.strict or not exists (select 1 from hits x where x.strict)
  order by h.rk desc
  limit greatest(1, least(max_results, 12));
$$;

-- ============================================================================
-- dashboard_stats — one round trip for everything the dashboard shows.
-- ============================================================================
create or replace function public.dashboard_stats()
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'conversations', (select count(*) from public.conversations where user_id = auth.uid()),
    'messages',      (select count(*) from public.messages m
                       join public.conversations c on c.id = m.conversation_id
                       where c.user_id = auth.uid() and m.role = 'user'),
    'documents',     (select count(*) from public.documents where owner_id = auth.uid()),
    'chunks',        (select count(*) from public.chunks where owner_id = auth.uid()),
    'memory',        (select count(*) from public.student_memory where user_id = auth.uid()),
    'misconceptions',(select count(*) from public.student_memory
                       where user_id = auth.uid() and kind = 'misconception'),
    'quizzes',       (select count(*) from public.quizzes where owner_id = auth.uid()),
    'avg_score',     (select round(avg(score)::numeric, 1) from public.quiz_attempts
                       where user_id = auth.uid()),
    'active_days',   (select count(distinct created_at::date) from public.conversations
                       where user_id = auth.uid())
  );
$$;

-- handle_new_user() is a trigger function. It must never be reachable over the
-- REST API, where a SECURITY DEFINER function is an escalation surface.
revoke execute on function public.handle_new_user() from anon, authenticated, public;


-- ============================================================================
-- Cross-device state.
--
-- Every ported page keeps its working state in localStorage: course progress,
-- quiz history, ranked rating, bookmarks, theme. That is the right place for
-- them to read and write, and the wrong place for it to live — a student who
-- opens the site on a phone would find an empty account.
--
-- Deliberately key/value: the pages own their own shapes, and redefining those
-- shapes here would create a second definition to drift from.
-- ============================================================================
create table if not exists public.user_state (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null,
  value      jsonb not null,
  updated_at timestamptz default now(),
  primary key (user_id, key)
);
alter table public.user_state enable row level security;
drop policy if exists user_state_own on public.user_state;
create policy user_state_own on public.user_state
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================================
-- Ranked. The one inherently cross-user table: a rating only means something
-- measured against other students. Readable by every signed-in student,
-- writable only by its owner.
-- ============================================================================
create table if not exists public.ranked_profiles (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Student',
  rating       int  not null default 1000,
  wins         int  not null default 0,
  losses       int  not null default 0,
  draws        int  not null default 0,
  best_streak  int  not null default 0,
  matches      int  not null default 0,
  achievements jsonb not null default '[]'::jsonb,
  updated_at   timestamptz default now(),
  constraint ranked_rating_sane check (rating between 0 and 4000),
  constraint ranked_counts_sane check (wins >= 0 and losses >= 0 and draws >= 0 and matches >= 0)
);
alter table public.ranked_profiles enable row level security;
drop policy if exists ranked_read_all on public.ranked_profiles;
create policy ranked_read_all on public.ranked_profiles
  for select to authenticated using (true);
drop policy if exists ranked_write_own on public.ranked_profiles;
create policy ranked_write_own on public.ranked_profiles
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index if not exists ranked_leaderboard_idx
  on public.ranked_profiles (rating desc, updated_at asc);

-- The top players, plus the caller's own rank even when they are below the
-- cut. One round trip instead of two.
create or replace function public.leaderboard(max_rows int default 50)
returns table (
  user_id uuid, display_name text, rating int,
  wins int, losses int, matches int, rank bigint, is_me boolean
)
language sql stable set search_path = public as $$
  with ranked as (
    select r.user_id, r.display_name, r.rating, r.wins, r.losses, r.matches,
           rank() over (order by r.rating desc, r.updated_at asc) as rank
    from public.ranked_profiles r
  )
  select ranked.user_id, ranked.display_name, ranked.rating, ranked.wins,
         ranked.losses, ranked.matches, ranked.rank,
         ranked.user_id = auth.uid() as is_me
  from ranked
  where ranked.rank <= greatest(1, least(max_rows, 200)) or ranked.user_id = auth.uid()
  order by ranked.rank;
$$;
