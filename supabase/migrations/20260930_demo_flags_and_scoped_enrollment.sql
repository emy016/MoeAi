-- The demo quota belongs to the public demo login, not to every account in a university that
-- happens to use demo sign-in (students who join by link were getting 15 a day).
alter table public.org_identities add column if not exists is_demo boolean not null default false;
-- Members who get every new course automatically. A showcase account keeps a fixed set.
alter table public.org_members add column if not exists auto_enroll boolean not null default true;

create or replace function public.is_demo_account()
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.org_identities i where i.user_id = auth.uid() and i.is_demo);
$$;

create or replace function public.enroll_org_into_course()
 returns trigger language plpgsql security definer set search_path to 'public' as $$
begin
  if new.org_id is null then return new; end if;
  insert into public.course_enrollments (course_id, user_id, role)
  select new.id, m.user_id, case when m.role in ('teacher', 'owner') then 'teacher' else 'student' end
  from public.org_members m where m.org_id = new.org_id and m.status = 'active' and m.auto_enroll
  on conflict do nothing;
  return new;
end; $$;

-- Data changes applied alongside (accounts are not named in the repo):
-- the pitch demo account got is_demo = true, auto_enroll = false and three courses;
-- the staff account became the organization's owner.
