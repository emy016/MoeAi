-- Security hardening after the pre-launch audit.

-- 1. Only course staff, or the server itself, may write passage vectors.
--    Before, any enrolled student could call fill_chunk_embeddings directly
--    with made-up vectors for passages still missing one, which would bend
--    what retrieval returns for everyone in that course.
create or replace function public.fill_chunk_embeddings(course uuid, ids uuid[], vectors text[])
returns integer language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare n int := 0; i int; v extensions.vector(768);
begin
  if not (auth.role() = 'service_role' or public.can_teach_course(course)) then
    raise exception 'only course staff or the server can write embeddings' using errcode = '42501';
  end if;
  if coalesce(array_length(ids,1),0) <> coalesce(array_length(vectors,1),0) or coalesce(array_length(ids,1),0) > 32 then
    raise exception 'bad batch' using errcode = '22023';
  end if;
  for i in 1 .. coalesce(array_length(ids,1),0) loop
    v := vectors[i]::extensions.vector(768);
    if abs(extensions.vector_norm(v) - 1) > 0.02 then continue; end if;
    update public.course_chunks set embedding = v where id = ids[i] and course_id = course and embedding is null;
    n := n + (case when found then 1 else 0 end);
  end loop;
  return n;
end; $$;

create or replace function public.chunks_missing_embeddings(course uuid, max_rows integer default 16)
returns table(id uuid, material_title text, heading text, content text)
language sql stable security definer set search_path to 'public' as $$
  select c.id, m.title, c.heading, c.content from public.course_chunks c join public.course_materials m on m.id = c.material_id
  where c.course_id = course and c.embedding is null and (auth.role() = 'service_role' or public.can_read_course(course))
  order by c.created_at limit least(greatest(max_rows, 1), 32);
$$;

-- 2. Nothing a signed-out visitor should be calling.
revoke execute on function public.set_course_code(uuid, text) from anon, public;
revoke execute on function public.hit_daily_limit(integer, integer) from anon, public;
revoke execute on function public.is_demo_account() from anon, public;
grant execute on function public.set_course_code(uuid, text) to authenticated;
grant execute on function public.hit_daily_limit(integer, integer) to authenticated;
grant execute on function public.is_demo_account() to authenticated;
