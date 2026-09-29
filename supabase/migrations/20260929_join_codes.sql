-- Class join links: one code, posted once (e.g. in the Telegram channel),
-- puts a signed-in student in the organization and every one of its courses.
-- Email invitations stay for staff; this is how a whole class gets in.
create table if not exists public.org_join_codes (
  code text primary key check (code ~ '^[A-Z0-9-]{6,32}$'),
  org_id uuid not null references public.organizations(id) on delete cascade,
  role text not null default 'student' check (role in ('student')),
  max_uses integer not null default 300 check (max_uses > 0),
  uses integer not null default 0,
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.org_join_codes enable row level security; -- read only through redeem_join_code

create table if not exists public.org_join_redemptions (
  code text not null references public.org_join_codes(code) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  primary key (code, user_id)
);
alter table public.org_join_redemptions enable row level security;

create or replace function public.redeem_join_code(p_code text)
returns table(org_name text, courses integer, already boolean)
language plpgsql security definer set search_path to 'public', 'auth' as $$
declare v public.org_join_codes; v_code text := upper(trim(coalesce(p_code, ''))); v_new boolean; v_courses int; v_email text;
begin
  if auth.uid() is null then raise exception 'sign in first' using errcode = '28000'; end if;
  select * into v from public.org_join_codes where code = v_code for update;
  if not found or not v.active or (v.expires_at is not null and v.expires_at < now()) then
    raise exception 'That class link is not valid anymore.' using errcode = '22023';
  end if;
  insert into public.org_join_redemptions (code, user_id) values (v.code, auth.uid()) on conflict do nothing;
  v_new := found;
  if v_new then
    if v.uses >= v.max_uses then raise exception 'This class link is full.' using errcode = '22023'; end if;
    update public.org_join_codes set uses = uses + 1 where code = v.code;
  end if;
  -- An existing membership is never changed here: a suspended student cannot
  -- let themselves back in with the class link.
  insert into public.org_members (org_id, user_id, role, status) values (v.org_id, auth.uid(), 'student', 'active')
  on conflict (org_id, user_id) do nothing;
  if not exists (select 1 from public.org_members m where m.org_id = v.org_id and m.user_id = auth.uid() and m.status = 'active') then
    raise exception 'Your access to this organization is paused. Ask its admin.' using errcode = '42501';
  end if;
  -- The app treats an account as a university student when it has an
  -- identity there; for a class-link student that identity is their email.
  if not exists (select 1 from public.org_identities i where i.org_id = v.org_id and i.user_id = auth.uid()) then
    select lower(u.email) into v_email from auth.users u where u.id = auth.uid();
    insert into public.org_identities (org_id, external_id, user_id, role, display_name)
    select v.org_id, coalesce(v_email, 'student-' || left(auth.uid()::text, 8)), auth.uid(), 'student',
           (select p.display_name from public.profiles p where p.id = auth.uid())
    on conflict (org_id, external_id) do nothing;
  end if;
  insert into public.course_enrollments (course_id, user_id, role)
  select c.id, auth.uid(), 'student' from public.courses c where c.org_id = v.org_id
  on conflict do nothing;
  select count(*) into v_courses from public.courses c where c.org_id = v.org_id;
  return query select o.name, v_courses, not v_new from public.organizations o where o.id = v.org_id;
end; $$;
revoke execute on function public.redeem_join_code(text) from anon, public;
grant execute on function public.redeem_join_code(text) to authenticated;

-- A course added to an organization later reaches its students and staff at once.
create or replace function public.enroll_org_into_course() returns trigger
language plpgsql security definer set search_path to 'public' as $$
begin
  if new.org_id is null then return new; end if;
  insert into public.course_enrollments (course_id, user_id, role)
  select new.id, m.user_id, case when m.role in ('teacher', 'owner') then 'teacher' else 'student' end
  from public.org_members m where m.org_id = new.org_id and m.status = 'active'
  on conflict do nothing;
  return new;
end; $$;
revoke execute on function public.enroll_org_into_course() from anon, public, authenticated;
drop trigger if exists courses_enroll_org on public.courses;
create trigger courses_enroll_org after insert on public.courses for each row execute function public.enroll_org_into_course();

-- Year 2, term 1 for the pilot organization, and Linear Algebra's real place.
-- Codes are placeholders (code_verified = false keeps them hidden from students
-- until staff set the real one on the Tutor page).
insert into public.courses (code, title, year, semester, org_id, accent, order_index)
select v.code, v.title, 2, 1, o.id, v.accent, v.ord
from public.organizations o,
  (values ('CS201', 'Object-Oriented Programming', '#8b5cf6', 20),
          ('CS202', 'Computer Networks', '#0ea5e9', 21),
          ('MA201', 'Advanced Probability', '#f59e0b', 22)) as v(code, title, accent, ord)
where o.slug = 'fue' and not exists (select 1 from public.courses c where c.title = v.title and c.org_id = o.id);
update public.courses set year = 2, semester = 1 where title = 'Linear Algebra' and org_id = (select id from public.organizations where slug = 'fue');
-- Everyone already in the organization gets every one of its courses.
insert into public.course_enrollments (course_id, user_id, role)
select c.id, m.user_id, case when m.role in ('teacher', 'owner') then 'teacher' else 'student' end
from public.courses c join public.org_members m on m.org_id = c.org_id and m.status = 'active'
on conflict do nothing;
