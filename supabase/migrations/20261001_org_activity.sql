-- The university manager's activity log. What happened and when, never what a
-- student wrote: a chat shows as "Asked MoeAI in <course / lecture>", a
-- correction as "Corrected a MoeAI answer", without the words. Plus the
-- system side (AI answers that failed or were slow, which provider answered)
-- and account changes. Owners only.
create or replace function public.org_activity(p_org uuid, p_user uuid default null, p_limit int default 150)
 returns table (at timestamptz, source text, kind text, user_id uuid, who text, label text)
 language sql stable security definer set search_path to 'public' as $$
  with members as (
    select m.user_id, coalesce(i.display_name, p.display_name, i.external_id, 'Member') as who
    from public.org_members m
    left join public.org_identities i on i.user_id = m.user_id and i.org_id = m.org_id
    left join public.profiles p on p.id = m.user_id
    where m.org_id = p_org and public.is_org_owner(p_org) and (p_user is null or m.user_id = p_user)
  )
  select * from (
    select e.created_at, 'student', e.kind, e.user_id, mb.who,
      case e.kind
        when 'chat' then 'Asked MoeAI' || coalesce(' in ' || substring(e.summary from '^Asked in (.*?): '), '')
        when 'correction' then 'Corrected a MoeAI answer'
        else left(e.summary, 140)
      end
    from public.student_events e join members mb on mb.user_id = e.user_id
    union all
    select l.created_at, 'system', l.status, l.user_id, mb.who,
      case when l.status = 'ok' then 'Answered by ' || coalesce(l.provider, 'AI') || coalesce(' · ' || nullif(l.model, 'none'), '') || ' in ' || round(coalesce(l.latency_ms, 0) / 1000.0, 1) || ' s'
           else 'Answer failed (' || coalesce(l.error_message, l.status) || ')' end
    from public.ai_logs l join members mb on mb.user_id = l.user_id
    union all
    select a.created_at, 'account', a.kind, a.user_id, mb.who, initcap(replace(a.kind, '_', ' '))
    from public.auth_events a join members mb on mb.user_id = a.user_id
  ) rows
  order by 1 desc
  limit least(greatest(p_limit, 1), 500);
$$;

-- AI health for the dashboard: answers, failures and speed per provider, last 7 days.
create or replace function public.org_ai_health(p_org uuid)
 returns table (provider text, answers int, failed int, avg_seconds numeric)
 language sql stable security definer set search_path to 'public' as $$
  select coalesce(l.provider, 'unknown'), count(*)::int, count(*) filter (where l.status <> 'ok')::int,
         round(avg(l.latency_ms) filter (where l.status = 'ok') / 1000.0, 1)
  from public.ai_logs l
  where public.is_org_owner(p_org) and l.created_at > now() - interval '7 days'
    and exists (select 1 from public.org_members m where m.user_id = l.user_id and m.org_id = p_org)
  group by 1 order by 2 desc;
$$;

revoke all on function public.org_activity(uuid, uuid, int), public.org_ai_health(uuid) from public, anon;
grant execute on function public.org_activity(uuid, uuid, int), public.org_ai_health(uuid) to authenticated;
