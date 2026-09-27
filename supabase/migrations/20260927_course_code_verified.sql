-- Course codes were seeded by hand and are not the real ones. A code is shown
-- (and told to MoeAI) only once it is verified: read from the lecture files by
-- the organizer, or entered by staff.
alter table public.courses add column if not exists code_verified boolean not null default false;

create or replace function public.set_course_code(p_course uuid, p_code text)
returns void language plpgsql security definer set search_path = public as $$
declare v_code text := upper(regexp_replace(coalesce(p_code, ''), '\s+', '', 'g'));
begin
  if not public.can_teach_course(p_course) then raise exception 'Only this course''s staff can change its code.' using errcode = '42501'; end if;
  if v_code !~ '^[A-Z]{2,5}[0-9]{2,4}[A-Z]?$' then raise exception 'Use a course code like CS103.' using errcode = '22023'; end if;
  if exists (select 1 from public.courses where code = v_code and id <> p_course) then raise exception 'Another course already uses %.', v_code using errcode = '23505'; end if;
  update public.courses set code = v_code, code_verified = true where id = p_course;
end;
$$;
revoke all on function public.set_course_code(uuid, text) from public;
grant execute on function public.set_course_code(uuid, text) to authenticated;
