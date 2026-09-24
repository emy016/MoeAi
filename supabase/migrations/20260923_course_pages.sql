-- Page-by-page text of each lecture file, for the in-app lecture reader and
-- for re-chunking without re-reading the PDF. Applied 2026-09-23.
create table if not exists public.course_pages (
  material_id uuid not null references public.course_materials(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  page int not null,
  content text not null,
  primary key (material_id, page)
);
alter table public.course_pages enable row level security;
drop policy if exists pages_read on public.course_pages;
create policy pages_read on public.course_pages for select to authenticated using (
  public.can_teach_course(course_id)
  or (public.can_read_course(course_id) and exists (select 1 from public.course_materials m where m.id = course_pages.material_id and m.status = 'ready')));
drop policy if exists pages_write on public.course_pages;
create policy pages_write on public.course_pages for all to authenticated
  using (public.can_teach_course(course_id)) with check (public.can_teach_course(course_id));

-- Course content for FUE Computer Science (CS103 Logic Design, MA103
-- Differential Equations, MA105 Linear Algebra) was imported into
-- course_materials / course_pages / course_chunks / course_brain directly
-- (OCR'd page by page, math-checked). It is data, not schema, and is not
-- committed to this public repository.
