-- Accounts with no message limits (the pitch demo login), set per identity.
alter table public.org_identities add column if not exists unlimited boolean not null default false;

create or replace function public.is_unlimited_account()
 returns boolean language sql stable security definer set search_path to 'public' as $$
  select exists (select 1 from public.org_identities i where i.user_id = auth.uid() and i.unlimited);
$$;
revoke all on function public.is_unlimited_account() from public, anon;
grant execute on function public.is_unlimited_account() to authenticated;

create or replace function public.hit_daily_limit(p_default integer, p_demo integer)
 returns table(allowed boolean, remaining integer, day_limit integer, demo boolean)
 language plpgsql security definer set search_path to 'public' as $$
declare v_day date := (now() at time zone 'utc')::date; v_count int; v_demo boolean; v_limit int;
begin
  if auth.uid() is null then return query select false, 0, 0, false; return; end if;
  insert into public.usage_daily (user_id, day, count) values (auth.uid(), v_day, 1)
  on conflict (user_id, day) do update set count = usage_daily.count + 1
  returning count into v_count;
  if public.is_unlimited_account() then return query select true, 9999, 9999, false; return; end if;
  v_demo := public.is_demo_account();
  v_limit := greatest(case when v_demo then p_demo else p_default end, 1);
  return query select v_count <= v_limit, greatest(v_limit - v_count, 0), v_limit, v_demo;
end;
$$;

create or replace function public.hit_rate_limit(p_limit integer)
 returns table(allowed boolean, remaining integer, reset_at timestamptz)
 language plpgsql security definer set search_path to 'public' as $$
declare v_window timestamptz := date_trunc('hour', now()); v_count int;
begin
  if auth.uid() is null then return query select false, 0, v_window + interval '1 hour'; return; end if;
  if public.is_unlimited_account() then return query select true, 9999, v_window + interval '1 hour'; return; end if;
  insert into public.rate_limits (user_id, window_start, count) values (auth.uid(), v_window, 1)
  on conflict (user_id, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;
  return query select v_count <= greatest(p_limit, 1), greatest(p_limit - v_count, 0), v_window + interval '1 hour';
end;
$$;
