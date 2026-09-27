-- Daily AI allowance, on top of the hourly cap.
--
-- The demo accounts are shared and public: anyone who finds the sign-in page
-- can use them, so they get a small daily allowance (15 requests). Signed-in
-- students get a larger one, and guests are counted per hashed IP address.
-- The counters are server-side (Postgres), so serverless instances cannot be
-- played against each other, and the check and increment are one upsert.

create table if not exists public.usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  count int not null default 0,
  primary key (user_id, day)
);
alter table public.usage_daily enable row level security;
drop policy if exists usage_daily_own on public.usage_daily;
create policy usage_daily_own on public.usage_daily for select to authenticated using (user_id = auth.uid());

create table if not exists public.usage_guest (
  key text not null,
  day date not null,
  count int not null default 0,
  primary key (key, day)
);
alter table public.usage_guest enable row level security;
-- No policies: only the security-definer function below touches it.

/** True when the caller signed in with a demo university account. */
create or replace function public.is_demo_account()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_identities i join public.organizations o on o.id = i.org_id
    where i.user_id = auth.uid() and o.sso_provider = 'demo'
  );
$$;

/** Counts one request against today's allowance (UTC day); demo accounts get p_demo, everyone else p_default. */
create or replace function public.hit_daily_limit(p_default int, p_demo int)
returns table (allowed boolean, remaining int, day_limit int, demo boolean)
language plpgsql security definer set search_path = public as $$
declare v_day date := (now() at time zone 'utc')::date; v_count int; v_demo boolean; v_limit int;
begin
  if auth.uid() is null then return query select false, 0, 0, false; return; end if;
  v_demo := public.is_demo_account();
  v_limit := greatest(case when v_demo then p_demo else p_default end, 1);
  insert into public.usage_daily (user_id, day, count) values (auth.uid(), v_day, 1)
  on conflict (user_id, day) do update set count = usage_daily.count + 1
  returning count into v_count;
  return query select v_count <= v_limit, greatest(v_limit - v_count, 0), v_limit, v_demo;
end;
$$;

/** The same for guests, keyed by a hash of their IP the server computes. */
create or replace function public.hit_guest_limit(p_key text, p_limit int)
returns table (allowed boolean, remaining int)
language plpgsql security definer set search_path = public as $$
declare v_day date := (now() at time zone 'utc')::date; v_count int;
begin
  if p_key is null or length(p_key) < 16 then return query select false, 0; return; end if;
  insert into public.usage_guest (key, day, count) values (left(p_key, 80), v_day, 1)
  on conflict (key, day) do update set count = usage_guest.count + 1
  returning count into v_count;
  delete from public.usage_guest where day < v_day - 2;
  return query select v_count <= greatest(p_limit, 1), greatest(p_limit - v_count, 0);
end;
$$;

revoke all on function public.hit_daily_limit(int, int) from public;
revoke all on function public.hit_guest_limit(text, int) from public;
revoke all on function public.is_demo_account() from public;
grant execute on function public.hit_daily_limit(int, int) to authenticated;
grant execute on function public.is_demo_account() to authenticated;
grant execute on function public.hit_guest_limit(text, int) to anon, authenticated;
