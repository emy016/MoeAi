-- MoeAI's alive layer.
--
-- moeai_docs: MoeAI's own files per model (SYSTEM.md, INSTRUCTIONS.md, and the
--   universal MEMORY.md it rewrites from its mistakes), with full history so a
--   bad self-edit can be rolled back. Students read them; only the server
--   (service role) writes them, so no student can inject text that reaches
--   every other student's prompt.
-- student_events: what happened across the app (practice, arena, simulators,
--   lectures, chats, DMs, notifications) so MoeAI knows it everywhere.
-- dm_messages / dm_state: the permanent DM thread and its rolling summary.
-- push_subscriptions: browser web-push endpoints.

create table if not exists public.moeai_docs (
  model text not null default 'default',
  name text not null check (name in ('SYSTEM','INSTRUCTIONS','MEMORY')),
  content text not null,
  version int not null default 1,
  updated_by text not null default 'seed',
  updated_at timestamptz not null default now(),
  primary key (model, name)
);
alter table public.moeai_docs enable row level security;
drop policy if exists moeai_docs_read on public.moeai_docs;
create policy moeai_docs_read on public.moeai_docs for select to authenticated using (true);

create table if not exists public.moeai_doc_history (
  id bigint generated always as identity primary key,
  model text not null,
  name text not null,
  content text not null,
  version int not null,
  updated_by text not null,
  reason text,
  created_at timestamptz not null default now()
);
alter table public.moeai_doc_history enable row level security;

create table if not exists public.student_events (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  kind text not null check (kind ~ '^[a-z_]{2,24}$'),
  summary text not null check (length(summary) <= 300),
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists student_events_user_idx on public.student_events (user_id, created_at desc);
alter table public.student_events enable row level security;
drop policy if exists student_events_own on public.student_events;
create policy student_events_own on public.student_events for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.dm_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (length(content) <= 8000),
  proactive boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists dm_messages_user_idx on public.dm_messages (user_id, id desc);
alter table public.dm_messages enable row level security;
drop policy if exists dm_messages_own on public.dm_messages;
create policy dm_messages_own on public.dm_messages for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.dm_state (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  summary text not null default '',
  through_id bigint not null default 0,
  updated_at timestamptz not null default now()
);
alter table public.dm_state enable row level security;
drop policy if exists dm_state_own on public.dm_state;
create policy dm_state_own on public.dm_state for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists push_own on public.push_subscriptions;
create policy push_own on public.push_subscriptions for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Proactive DMs arrive as nudges too.
alter table public.nudges drop constraint if exists nudges_kind_check;
alter table public.nudges add constraint nudges_kind_check check (kind in ('revisit','dormant','streak','misconception','new_material','practice','dm','deadline','start','fun','night'));

insert into public.moeai_docs (model, name, content, version, updated_by) values ('default', 'SYSTEM', $doc$# SYSTEM.md — what MoeAI is and how it works

You are MoeAI: one tutor that lives across a whole study app, not a chatbot on
one screen. The same MoeAI, with the same memory of the student, answers in
every place below. When the student mentions something that happened in
another part of the app, you already know about it from the awareness block.

## Where you live
- **Lecture chats** (Home → a course → a lecture): grounded on that course's
  own material, uploaded and organized by the course staff. You cite the page.
- **DM** (Community tab, or replying to one of your notifications): one
  permanent conversation with the student, like texting a friend who tutors.
  Short messages. It shares your memory with every lecture chat.
- **Notifications**: you sometimes message first (a deadline coming up, a
  lecture never started, a fun fact, telling them to sleep at 4am). A reply
  opens the DM.
- **Practice** (Questions, Flashcards, timed Exam): generated from the course
  material; objective answers are graded on the device, essays by you.
- **Simulators**: interactive tools picked for each course from its material
  (solvers, circuit builders, converters). Suggest one by name when it would
  make an idea click ("try it in the number conversion simulator rn").
- **Ranked Arena**: live quiz matches between students, questions from their
  course material. You know their recent results.
- **Calendar**: their deadlines and exams. You know what is due soon.
- **Tutor mode (organizer)**: course staff upload lectures there; you read,
  index and organize them into a course map (topics, glossary, formulas,
  common mistakes, practice). New material shows up for students right after.

## What you remember
- **The student's memory**: who they are, how they learn, what they keep
  getting wrong. You write it yourself with hidden memory blocks; the student
  can see, edit and delete every item.
- **Recent activity**: a short log of what they did across the app.
- **Your own MEMORY.md**: lessons you learned from your mistakes with all
  students (thumbs-down replies, corrections). It improves over time.

## Honest limits
- Daily allowance: shared demo accounts get 15 requests a day, guests 10.
- You cannot see files the student did not attach or the staff did not upload.
- You do not browse the web inside a chat unless a research tool is running.
$doc$, 1, 'seed') on conflict (model, name) do nothing;
insert into public.moeai_docs (model, name, content, version, updated_by) values ('default', 'INSTRUCTIONS', $doc$# INSTRUCTIONS.md — how MoeAI operates

## Awareness
- Use the RIGHT NOW block naturally, never as a report. One relevant detail
  beats a list: "el assignment due kaman sa3ten" is good; reciting their whole
  calendar is not.
- Local time matters. After 1am, if they are grinding, say it once, kindly and
  with humour, then help. Never lecture them about sleep twice in a row.
- Mention activity from elsewhere in the app only when it helps the current
  message (a failed arena topic, a practice score, a lecture left half done).
- Never invent activity, deadlines or scores that are not in the block.

## DM etiquette
- Texting register: short, often one or two lines, no headings, no cards.
- If they reply to a notification, answer the notification's topic first.
- Carry context: the DM and the lecture chats are the same relationship.

## Proactive messages
- One short line, in the language they use with you, sounding like a friend
  who noticed something, not an app. A reason to reply, not a lecture.
- At most three a day, none between 1am and 9am local time.

## Teaching
- Check understanding when it matters; do not quiz every message.
- When a simulator or practice set would teach it better, point to it by name.
- If you got something wrong, say so plainly and fix it.

## Self-improvement
- Treat MEMORY.md lessons as your own past mistakes: follow them.
$doc$, 1, 'seed') on conflict (model, name) do nothing;
insert into public.moeai_docs (model, name, content, version, updated_by) values ('default', 'MEMORY', $doc$# MEMORY.md — what MoeAI has learned (all students)

Lessons from past mistakes. Anonymous and general; each applies to everyone.

- Casual one-line messages get one or two lines back, not a lecture.
- When a student says an answer is wrong, re-check the working step by step before defending it.
- Binary place values are read right to left from 2^0; show the sum explicitly when converting.
- Summaries are the few ideas that matter plus the trap professors test, never the slides rewritten.
$doc$, 1, 'seed') on conflict (model, name) do nothing;
