-- Tutor mode: what's happening in each course and when (the awareness system),
-- the simulators MoeAI builds for each course, and the university manager's
-- view of its students.

-- ─── 1. Course calendar ──────────────────────────────────────────────────
create table if not exists public.course_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  course_id uuid references public.courses(id) on delete cascade, -- null: the whole university (holidays, exam weeks)
  kind text not null check (kind in ('lecture','lab','tutorial','assignment','quiz','midterm','final','project','deadline','holiday','announcement','other')),
  title text not null check (length(title) between 1 and 200),
  details text check (length(details) <= 4000),
  starts_at timestamptz not null,           -- for a deadline, the due time
  ends_at timestamptz,
  all_day boolean not null default false,
  location text check (length(location) <= 200),
  repeat_weekly_until date,                 -- a weekly lecture or lab: repeats on the same weekday until this date
  weight text check (length(weight) <= 60), -- "10% of the grade"
  material_id uuid references public.course_materials(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists course_events_course_idx on public.course_events (course_id, starts_at);
create index if not exists course_events_org_idx on public.course_events (org_id, starts_at);
alter table public.course_events enable row level security;

create or replace function public.is_org_member(org uuid)
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.org_members m where m.org_id = org and m.user_id = (select auth.uid()) and m.status = 'active');
$$;

drop policy if exists course_events_read on public.course_events;
create policy course_events_read on public.course_events for select to authenticated
  using (case when course_id is null then public.is_org_member(org_id) else public.can_read_course(course_id) end);
drop policy if exists course_events_write on public.course_events;
create policy course_events_write on public.course_events for all to authenticated
  using (case when course_id is null then public.is_org_owner(org_id) else public.can_teach_course(course_id) end)
  with check (case when course_id is null then public.is_org_owner(org_id)
                   else public.can_teach_course(course_id) and exists (select 1 from public.courses c where c.id = course_id and c.org_id = course_events.org_id) end);

-- ─── 2. Simulators MoeAI builds per course ───────────────────────────────
create table if not exists public.course_simulators (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null check (length(title) between 1 and 120),
  topic text check (length(topic) <= 200),
  purpose text check (length(purpose) <= 600),     -- what a student does with it, for the builder and for staff
  builtin_id text,                                  -- one of the app's built-in engines, when it fits
  code text,                                        -- a simulator MoeAI wrote for this course (sandboxed page fragment)
  status text not null default 'planned' check (status in ('planned','building','ready','failed','hidden')),
  error text,
  source text not null default 'auto' check (source in ('auto','staff')),
  position int not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (builtin_id is not null or code is not null or status in ('planned','building','failed'))
);
create index if not exists course_simulators_course_idx on public.course_simulators (course_id, position);
alter table public.course_simulators enable row level security;
drop policy if exists sims_read on public.course_simulators;
create policy sims_read on public.course_simulators for select to authenticated
  using (public.can_teach_course(course_id) or (status = 'ready' and public.can_read_course(course_id)));
drop policy if exists sims_write on public.course_simulators;
create policy sims_write on public.course_simulators for all to authenticated
  using (public.can_teach_course(course_id)) with check (public.can_teach_course(course_id));

-- ─── 3. The university manager's view of its people ──────────────────────
-- Owners only. One row per member with what a manager needs to act on.
create or replace function public.org_people(p_org uuid)
 returns table (user_id uuid, external_id text, display_name text, role text, status text, is_demo boolean,
                joined_at timestamptz, last_active date, messages_today int, messages_7d int, messages_total int,
                courses int, course_ids uuid[])
 language sql stable security definer set search_path to 'public' as $$
  select m.user_id, i.external_id, coalesce(i.display_name, p.display_name), m.role, m.status, coalesce(i.is_demo, false),
         m.created_at,
         (select max(u.day) from public.usage_daily u where u.user_id = m.user_id),
         coalesce((select u.count from public.usage_daily u where u.user_id = m.user_id and u.day = (now() at time zone 'utc')::date), 0),
         coalesce((select sum(u.count)::int from public.usage_daily u where u.user_id = m.user_id and u.day > (now() at time zone 'utc')::date - 7), 0),
         coalesce((select sum(u.count)::int from public.usage_daily u where u.user_id = m.user_id), 0),
         (select count(*)::int from public.course_enrollments e join public.courses c on c.id = e.course_id where e.user_id = m.user_id and c.org_id = p_org),
         (select coalesce(array_agg(e.course_id), '{}') from public.course_enrollments e join public.courses c on c.id = e.course_id where e.user_id = m.user_id and c.org_id = p_org)
  from public.org_members m
  left join public.org_identities i on i.user_id = m.user_id and i.org_id = m.org_id
  left join public.profiles p on p.id = m.user_id
  where m.org_id = p_org and public.is_org_owner(p_org)
  order by (m.role = 'owner') desc, (m.role = 'teacher') desc, m.created_at;
$$;

-- Messages per day across the university, for the dashboard chart.
create or replace function public.org_usage(p_org uuid, p_days int default 14)
 returns table (day date, messages int, students int)
 language sql stable security definer set search_path to 'public' as $$
  select d::date, coalesce(sum(u.count), 0)::int, count(distinct u.user_id)::int
  from generate_series((now() at time zone 'utc')::date - (least(greatest(p_days, 1), 90) - 1), (now() at time zone 'utc')::date, interval '1 day') d
  left join public.usage_daily u on u.day = d::date
    and exists (select 1 from public.org_members m where m.user_id = u.user_id and m.org_id = p_org)
  where public.is_org_owner(p_org)
  group by 1 order by 1;
$$;

create or replace function public.set_member_courses(p_org uuid, p_user uuid, p_courses uuid[])
 returns void language plpgsql security definer set search_path to 'public' as $$
declare v_role text;
begin
  if not public.is_org_owner(p_org) then raise exception 'owners only' using errcode = '42501'; end if;
  select role into v_role from public.org_members where org_id = p_org and user_id = p_user;
  if v_role is null then raise exception 'not a member' using errcode = '22023'; end if;
  delete from public.course_enrollments e using public.courses c
   where c.id = e.course_id and c.org_id = p_org and e.user_id = p_user and not (e.course_id = any(p_courses));
  insert into public.course_enrollments (course_id, user_id, role)
  select c.id, p_user, case when v_role in ('teacher','owner') then 'teacher' else 'student' end
  from public.courses c where c.org_id = p_org and c.id = any(p_courses)
  on conflict do nothing;
  -- A hand-picked set stays hand-picked when new courses are added.
  update public.org_members set auto_enroll = (select count(*) = cardinality(p_courses) from public.courses where org_id = p_org)
   where org_id = p_org and user_id = p_user;
end; $$;

create or replace function public.set_member_role(p_org uuid, p_user uuid, p_role text)
 returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not public.is_org_owner(p_org) then raise exception 'owners only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'not on yourself' using errcode = '42501'; end if;
  if p_role not in ('student','teacher') then raise exception 'role' using errcode = '22023'; end if;
  update public.org_members set role = p_role, updated_at = now() where org_id = p_org and user_id = p_user and role <> 'owner';
  update public.org_identities set role = p_role where org_id = p_org and user_id = p_user and role <> 'owner';
  update public.course_enrollments e set role = p_role from public.courses c
   where c.id = e.course_id and c.org_id = p_org and e.user_id = p_user;
end; $$;

-- Join links, managed by owners.
drop policy if exists join_codes_owner on public.org_join_codes;
create policy join_codes_owner on public.org_join_codes for all to authenticated
  using (public.is_org_owner(org_id)) with check (public.is_org_owner(org_id));
grant select, insert, update on public.org_join_codes to authenticated;

revoke all on function public.org_people(uuid), public.org_usage(uuid, int), public.set_member_courses(uuid, uuid, uuid[]), public.set_member_role(uuid, uuid, text), public.is_org_member(uuid) from public, anon;
grant execute on function public.org_people(uuid), public.org_usage(uuid, int), public.set_member_courses(uuid, uuid, uuid[]), public.set_member_role(uuid, uuid, text), public.is_org_member(uuid) to authenticated;
grant select, insert, update, delete on public.course_events, public.course_simulators to authenticated;

create or replace function public.course_chunk_counts(p_courses uuid[])
 returns table (course_id uuid, chunks int)
 language sql stable security definer set search_path to 'public' as $$
  select c.course_id, count(*)::int from public.course_chunks c
  where c.course_id = any(p_courses) and public.can_teach_course(c.course_id)
  group by c.course_id;
$$;
revoke all on function public.course_chunk_counts(uuid[]) from public, anon;
grant execute on function public.course_chunk_counts(uuid[]) to authenticated;
