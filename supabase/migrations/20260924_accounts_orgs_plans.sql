-- ============================================================================
-- Accounts, onboarding, organizations, plans — and the security fixes found
-- while building them. Applied to project nyrbrsftqqqqompqxxbk on 2026-09-24.
--
-- Principles:
--   * Supabase Auth owns identities and passwords. Nothing here stores a
--     password, token, OTP or secret.
--   * Everything that grants access (roles, memberships, subscriptions,
--     organization creation) is written by SECURITY DEFINER functions that
--     check auth.uid() themselves. The browser can read its own rows; it can
--     never write them directly.
--   * Commercial values (prices, limits, features, trials, refunds, taxes,
--     proration, seat limits) are undecided, so they are NULL / empty and the
--     paid plans are 'not_configured'. Nothing here invents a number.
-- ============================================================================

-- ─── 0. Security fixes ─────────────────────────────────────────────────────
-- profiles_self allowed UPDATE of every column, including `role`. Nothing
-- trusted it yet, but nothing should be able to: only the columns a person
-- may edit about themselves stay writable.
revoke insert, update on public.profiles from authenticated, anon;
grant update (display_name, university, faculty, year, locale) on public.profiles to authenticated;

-- orgs_write let any signed-in user INSERT an organization with
-- verified = true and any email_domain; claim_verified_org() then enrolled
-- every user of that domain into it. Organizations are now created only by
-- create_organization() (always unverified) and edited only by their owners.
drop policy if exists orgs_write on public.organizations;
revoke insert, update, delete on public.organizations from authenticated, anon;

-- ─── 1. Profiles: handle, phone, how the app is used, onboarding ──────────
alter table public.profiles
  add column if not exists handle text,
  add column if not exists phone text,
  add column if not exists user_type text,
  add column if not exists org_choice text,
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists updated_at timestamptz default now();

do $$ begin
  alter table public.profiles add constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_.]{3,24}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_phone_format check (phone is null or phone ~ '^\+[1-9][0-9]{7,14}$');
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_user_type check (user_type is null or user_type in ('student','organization'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.profiles add constraint profiles_org_choice check (org_choice is null or org_choice in ('member','independent','start','join'));
exception when duplicate_object then null; end $$;

create unique index if not exists profiles_handle_key on public.profiles (lower(handle)) where handle is not null;
create unique index if not exists profiles_phone_key on public.profiles (phone) where phone is not null;

-- Signup metadata carries the chosen handle and phone; the trigger claims
-- them. A taken handle/phone is dropped rather than failing the signup (the
-- signup route checks availability first; this only loses a race).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_handle text := lower(nullif(trim(new.raw_user_meta_data->>'handle'), ''));
  v_phone  text := nullif(trim(new.raw_user_meta_data->>'phone'), '');
  v_type   text := nullif(new.raw_user_meta_data->>'user_type', '');
begin
  if v_handle is not null and (v_handle !~ '^[a-z0-9_.]{3,24}$'
      or exists (select 1 from public.profiles p where lower(p.handle) = v_handle)) then
    v_handle := null;
  end if;
  if v_phone is not null and (v_phone !~ '^\+[1-9][0-9]{7,14}$'
      or exists (select 1 from public.profiles p where p.phone = v_phone)) then
    v_phone := null;
  end if;
  if v_type is not null and v_type not in ('student','organization') then v_type := null; end if;

  insert into public.profiles (id, display_name, handle, phone, user_type)
  values (new.id,
          coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email,'@',1)),
          v_handle, v_phone, v_type)
  on conflict (id) do nothing;

  insert into public.libraries (owner_id, name, description)
  values (new.id, 'My library', 'Material you upload yourself. MoeAI answers from it.');
  return new;
end;
$$;

create or replace function public.handle_available(p_handle text) returns boolean
language sql stable security definer set search_path = public as $$
  select lower(coalesce(p_handle,'')) ~ '^[a-z0-9_.]{3,24}$'
     and not exists (select 1 from public.profiles where lower(handle) = lower(p_handle) and id is distinct from auth.uid());
$$;

/** Display name, handle, phone and how the app is used — the fields onboarding collects. */
create or replace function public.update_my_profile(p_display_name text default null, p_handle text default null, p_phone text default null, p_user_type text default null, p_org_choice text default null)
returns public.profiles language plpgsql security definer set search_path = public as $$
declare v public.profiles;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if p_handle is not null and not public.handle_available(p_handle) then
    raise exception 'handle_taken' using errcode = '23505';
  end if;
  if p_phone is not null and exists (select 1 from public.profiles where phone = p_phone and id <> auth.uid()) then
    raise exception 'phone_taken' using errcode = '23505';
  end if;
  update public.profiles set
    display_name = coalesce(nullif(trim(p_display_name), ''), display_name),
    handle = coalesce(lower(nullif(trim(p_handle), '')), handle),
    phone = coalesce(nullif(trim(p_phone), ''), phone),
    user_type = coalesce(p_user_type, user_type),
    org_choice = coalesce(p_org_choice, org_choice),
    updated_at = now()
  where id = auth.uid() returning * into v;
  return v;
end;
$$;

-- ─── 2. Legal documents and consent ───────────────────────────────────────
create table if not exists public.legal_documents (
  kind text not null check (kind in ('terms','privacy')),
  version text not null,
  url text not null,
  effective_at timestamptz not null default now(),
  current boolean not null default false,
  primary key (kind, version)
);
create unique index if not exists legal_documents_current on public.legal_documents (kind) where current;
alter table public.legal_documents enable row level security;
drop policy if exists legal_read on public.legal_documents;
create policy legal_read on public.legal_documents for select to anon, authenticated using (true);
-- The documents already published at /legal ("Last updated: September 2026").
insert into public.legal_documents (kind, version, url, current) values
  ('terms', '2026-09', '/legal#terms', true),
  ('privacy', '2026-09', '/legal#privacy', true)
on conflict do nothing;

create table if not exists public.consents (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  version text not null,
  accepted_at timestamptz not null default now(),
  primary key (user_id, kind, version),
  foreign key (kind, version) references public.legal_documents(kind, version)
);
alter table public.consents enable row level security;
drop policy if exists consents_own on public.consents;
create policy consents_own on public.consents for select to authenticated using (user_id = auth.uid());

/** Records acceptance of the CURRENT terms and privacy policy — the only versions a person can accept. */
create or replace function public.accept_current_legal() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  insert into public.consents (user_id, kind, version)
  select auth.uid(), kind, version from public.legal_documents where current
  on conflict do nothing;
end;
$$;

create or replace function public.has_current_consent(p_user uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select not exists (
    select 1 from public.legal_documents d where d.current
      and not exists (select 1 from public.consents c where c.user_id = auth.uid() and c.kind = d.kind and c.version = d.version));  -- only ever the caller
$$;

-- ─── 3. Security / audit events ──────────────────────────────────────────
create table if not exists public.auth_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  kind text not null,
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists auth_events_user on public.auth_events (user_id, created_at desc);
alter table public.auth_events enable row level security;
drop policy if exists auth_events_own on public.auth_events;
create policy auth_events_own on public.auth_events for select to authenticated using (user_id = auth.uid());

-- Only known event names, only small detail objects; never credentials.
create or replace function public.log_auth_event(p_kind text, p_detail jsonb default '{}') returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_kind not in ('sign_in','sign_out','sign_up','password_reset_requested','password_changed','email_change_requested',
                    'phone_change_requested','oauth_linked','oauth_unlinked','mfa_enrolled','mfa_removed','org_created',
                    'org_joined','org_membership_changed','role_changed','invitation_created','invitation_accepted',
                    'subscription_changed','account_export','account_deleted','onboarding_completed') then
    raise exception 'unknown event' using errcode = '22023';
  end if;
  if pg_column_size(p_detail) > 2048 then p_detail := '{}'; end if;
  insert into public.auth_events (user_id, kind, detail) values (auth.uid(), p_kind, coalesce(p_detail, '{}'));
end;
$$;

-- ─── 4. Organizations and membership ─────────────────────────────────────
alter table public.organizations
  add column if not exists type text,
  add column if not exists country text,
  add column if not exists status text not null default 'active',
  add column if not exists sso_provider text,
  add column if not exists sso_provider_id text,
  add column if not exists create_request uuid;
do $$ begin
  alter table public.organizations add constraint organizations_type check (type is null or type in ('university','school','institute','company','other'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.organizations add constraint organizations_status check (status in ('active','suspended','closed'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.organizations add constraint organizations_sso check (sso_provider is null or sso_provider in ('demo','saml','oidc'));
exception when duplicate_object then null; end $$;
-- Double-clicking "Create organization" returns the first one, never a second.
create unique index if not exists organizations_create_request on public.organizations (created_by, create_request) where create_request is not null;
-- FUE's sign-in today is MoeAI's clearly-labelled demo stand-in (/sso/fue).
update public.organizations set sso_provider = 'demo', type = 'university', country = 'EG' where slug = 'fue' and sso_provider is null;

alter table public.org_members
  add column if not exists status text not null default 'active',
  add column if not exists updated_at timestamptz default now();
do $$ begin
  alter table public.org_members add constraint org_members_status check (status in ('invited','pending','active','suspended','removed','expired'));
exception when duplicate_object then null; end $$;

-- A membership only counts while it is active.
create or replace function public.is_org_member(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = org and m.user_id = auth.uid() and m.status = 'active');
$$;
create or replace function public.is_org_teacher(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = org and m.user_id = auth.uid() and m.role in ('teacher','owner') and m.status = 'active');
$$;
create or replace function public.is_org_owner(org uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.org_members m where m.org_id = org and m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active');
$$;

-- Owners edit what describes their organization, never its verification.
drop policy if exists orgs_owner_update on public.organizations;
grant update (name, description, type, country) on public.organizations to authenticated;
create policy orgs_owner_update on public.organizations for update to authenticated
  using (public.is_org_owner(id)) with check (public.is_org_owner(id));

/** Organization identification: verified organizations by name, slug or email domain. */
create or replace function public.find_organizations(q text)
returns table (id uuid, slug text, name text, type text, sso text, sso_ref text)
language sql stable security definer set search_path = public as $$
  select o.id, o.slug, o.name, o.type, coalesce(o.sso_provider, 'none'),
         case when o.sso_provider in ('saml','oidc') then o.sso_provider_id end
  from public.organizations o
  where o.verified and o.status = 'active' and length(trim(coalesce(q,''))) >= 2
    and (o.name ilike '%' || trim(q) || '%' or o.slug = lower(trim(q)) or lower(o.email_domain) = lower(trim(q)))
  order by o.name limit 8;
$$;

/** This person's standing in an organization, for the access step. */
create or replace function public.my_org_access(p_org uuid)
returns table (org_id uuid, org_name text, org_status text, verified boolean, role text, membership text)
language sql stable security definer set search_path = public as $$
  select o.id, o.name, o.status, o.verified, m.role, coalesce(m.status, 'none')
  from public.organizations o left join public.org_members m on m.org_id = o.id and m.user_id = auth.uid()
  where o.id = p_org;
$$;

-- ─── 5. Plans and subscriptions ──────────────────────────────────────────
create table if not exists public.plans (
  id text primary key,
  target text not null check (target in ('student','organization')),
  name text not null,
  billing_interval text not null check (billing_interval in ('none','month','year')),
  sort int not null default 0,
  -- Undecided commercial values: NULL / empty until the business sets them.
  price_minor integer,
  currency text,
  features jsonb not null default '[]',
  limits jsonb not null default '{}',
  entitlements text[] not null default '{}',
  seat_limit integer,
  trial_enabled boolean,
  trial_days integer,
  refund_policy text,
  tax_configuration jsonb,
  proration_policy text,
  provider_price_id text,
  status text not null default 'not_configured' check (status in ('not_configured','available','retired'))
);
alter table public.plans enable row level security;
drop policy if exists plans_read on public.plans;
create policy plans_read on public.plans for select to anon, authenticated using (status <> 'retired');
-- Free needs no payment, so it is selectable; Monthly and Yearly wait for pricing and a billing provider.
insert into public.plans (id, target, name, billing_interval, sort, status) values
  ('student_free',    'student',      'Free',    'none',  0, 'available'),
  ('student_monthly', 'student',      'Monthly', 'month', 1, 'not_configured'),
  ('student_yearly',  'student',      'Yearly',  'year',  2, 'not_configured'),
  ('org_free',        'organization', 'Free',    'none',  0, 'available'),
  ('org_monthly',     'organization', 'Monthly', 'month', 1, 'not_configured'),
  ('org_yearly',      'organization', 'Yearly',  'year',  2, 'not_configured')
on conflict (id) do nothing;

-- Billing ownership is explicit: a subscription belongs to a person OR an organization.
create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  owner_type text not null check (owner_type in ('user','organization')),
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references public.organizations(id) on delete cascade,
  plan_id text not null references public.plans(id),
  status text not null check (status in ('pending','active','trialing','past_due','payment_failed','cancelled','expired')),
  provider text,
  provider_ref text unique,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((owner_type = 'user' and user_id is not null and org_id is null) or (owner_type = 'organization' and org_id is not null and user_id is null))
);
-- One live subscription per owner, enforced by the database rather than a disabled button.
create unique index if not exists subscriptions_one_live_user on public.subscriptions (user_id) where owner_type = 'user' and status in ('pending','active','trialing','past_due');
create unique index if not exists subscriptions_one_live_org on public.subscriptions (org_id) where owner_type = 'organization' and status in ('pending','active','trialing','past_due');
alter table public.subscriptions enable row level security;
drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (user_id = auth.uid() or (org_id is not null and public.is_org_owner(org_id)));

-- Verified billing-provider events, stored once by their provider event id (idempotent webhooks).
create table if not exists public.billing_events (
  id text primary key,
  provider text not null,
  kind text not null,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);
alter table public.billing_events enable row level security; -- no policies: server/provider only

/**
 * Choose a plan. Free activates immediately (nothing to pay). A paid plan
 * starts checkout only once it is configured with a price and a provider, so
 * today it answers 'not_configured' and grants nothing.
 */
create or replace function public.choose_plan(p_plan text, p_org uuid default null)
returns table (status text, subscription_id uuid)
language plpgsql security definer set search_path = public as $$
declare v_plan public.plans; v_id uuid;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into v_plan from public.plans where id = p_plan;
  if not found then raise exception 'unknown plan' using errcode = '22023'; end if;
  if v_plan.target = 'organization' and (p_org is null or not public.is_org_owner(p_org)) then
    raise exception 'only an organization owner can choose its plan' using errcode = '42501';
  end if;
  if v_plan.target = 'student' and p_org is not null then raise exception 'personal plan' using errcode = '22023'; end if;
  if v_plan.status <> 'available' or v_plan.billing_interval <> 'none' then
    return query select 'not_configured'::text, null::uuid; return;
  end if;
  if v_plan.target = 'student' then
    select s.id into v_id from public.subscriptions s where s.owner_type = 'user' and s.user_id = auth.uid() and s.status in ('pending','active','trialing','past_due');
    if v_id is null then
      insert into public.subscriptions (owner_type, user_id, plan_id, status) values ('user', auth.uid(), p_plan, 'active') returning id into v_id;
    elsif (select plan_id from public.subscriptions where id = v_id) <> p_plan then
      -- Moving to Free from a live paid plan is a billing-provider change; not configured yet.
      return query select 'not_configured'::text, v_id; return;
    end if;
  else
    select s.id into v_id from public.subscriptions s where s.owner_type = 'organization' and s.org_id = p_org and s.status in ('pending','active','trialing','past_due');
    if v_id is null then
      insert into public.subscriptions (owner_type, org_id, plan_id, status) values ('organization', p_org, p_plan, 'active') returning id into v_id;
    end if;
  end if;
  perform public.log_auth_event('subscription_changed', jsonb_build_object('plan', p_plan));
  return query select 'active'::text, v_id;
end;
$$;

-- ─── 6. Organization creation (idempotent) and invitations ────────────────
create or replace function public.create_organization(p_name text, p_type text, p_request uuid, p_domain text default null, p_country text default null)
returns table (id uuid, slug text, created boolean)
language plpgsql security definer set search_path = public as $$
declare v_org public.organizations; v_slug text; v_base text; n int := 0;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  if p_request is null then raise exception 'request id required' using errcode = '22023'; end if;
  select * into v_org from public.organizations o where o.created_by = auth.uid() and o.create_request = p_request;
  if found then return query select v_org.id, v_org.slug, false; return; end if;
  if length(trim(coalesce(p_name,''))) < 2 or length(p_name) > 120 then raise exception 'name' using errcode = '22023'; end if;
  if p_domain is not null and p_domain !~ '^[a-z0-9.-]+\.[a-z]{2,}$' then raise exception 'domain' using errcode = '22023'; end if;
  v_base := trim(both '-' from regexp_replace(lower(p_name), '[^a-z0-9]+', '-', 'g'));
  if v_base = '' then v_base := 'org'; end if;
  v_base := left(v_base, 40); v_slug := v_base;
  while exists (select 1 from public.organizations o where o.slug = v_slug) loop
    n := n + 1; v_slug := v_base || '-' || n;
  end loop;
  -- Unverified until MoeAI confirms the domain/ownership: a typed domain proves nothing.
  insert into public.organizations (name, slug, type, email_domain, country, verified, created_by, create_request)
  values (trim(p_name), v_slug, p_type, lower(p_domain), p_country, false, auth.uid(), p_request)
  returning * into v_org;
  insert into public.org_members (org_id, user_id, role, status) values (v_org.id, auth.uid(), 'owner', 'active')
  on conflict (org_id, user_id) do update set role = 'owner', status = 'active', updated_at = now();
  update public.profiles set user_type = 'organization', org_choice = 'start', updated_at = now() where profiles.id = auth.uid();
  perform public.log_auth_event('org_created', jsonb_build_object('org', v_org.id));
  return query select v_org.id, v_org.slug, true;
end;
$$;

create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role text not null default 'student' check (role in ('student','teacher')),
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending','accepted','revoked','expired')),
  invited_by uuid references auth.users(id) on delete set null,
  accepted_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null default now() + interval '14 days',
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create unique index if not exists org_invitations_one_pending on public.org_invitations (org_id, lower(email)) where status = 'pending';
alter table public.org_invitations enable row level security;
drop policy if exists invitations_owner_read on public.org_invitations;
create policy invitations_owner_read on public.org_invitations for select to authenticated using (public.is_org_owner(org_id));

/** Owner invites an address. Returns the raw token once (only its hash is stored); the caller builds the link. */
create or replace function public.invite_member(p_org uuid, p_email text, p_role text default 'student')
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_token text := encode(gen_random_bytes(24), 'hex');
begin
  if not public.is_org_owner(p_org) then raise exception 'owners only' using errcode = '42501'; end if;
  if p_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'email' using errcode = '22023'; end if;
  update public.org_invitations set status = 'revoked' where org_id = p_org and lower(email) = lower(p_email) and status = 'pending';
  insert into public.org_invitations (org_id, email, role, token_hash, invited_by)
  values (p_org, lower(trim(p_email)), p_role, encode(digest(v_token, 'sha256'), 'hex'), auth.uid());
  perform public.log_auth_event('invitation_created', jsonb_build_object('org', p_org, 'role', p_role));
  return v_token;
end;
$$;

/** Accept an invitation — only as the verified email address it was sent to. */
create or replace function public.accept_invitation(p_token text)
returns table (org_id uuid, role text) language plpgsql security definer set search_path = public, auth, extensions as $$
declare v public.org_invitations; v_email text; v_confirmed timestamptz;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select * into v from public.org_invitations i where i.token_hash = encode(digest(coalesce(p_token,''), 'sha256'), 'hex');
  if not found then raise exception 'invalid invitation' using errcode = '22023'; end if;
  if v.status = 'accepted' and v.accepted_by = auth.uid() then return query select v.org_id, v.role; return; end if;
  if v.status <> 'pending' then raise exception 'invitation is %', v.status using errcode = '22023'; end if;
  if v.expires_at < now() then
    update public.org_invitations set status = 'expired' where id = v.id;
    raise exception 'invitation expired' using errcode = '22023';
  end if;
  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = auth.uid();
  if lower(v_email) <> lower(v.email) or v_confirmed is null then
    raise exception 'this invitation belongs to another verified email address' using errcode = '42501';
  end if;
  insert into public.org_members (org_id, user_id, role, status) values (v.org_id, auth.uid(), v.role, 'active')
  on conflict (org_id, user_id) do update set status = 'active', role = excluded.role, updated_at = now();
  update public.org_invitations set status = 'accepted', accepted_by = auth.uid(), accepted_at = now() where id = v.id;
  perform public.log_auth_event('invitation_accepted', jsonb_build_object('org', v.org_id));
  return query select v.org_id, v.role;
end;
$$;

/** Owner changes a member's status (suspend, reactivate, remove); never their own, never to/from owner. */
create or replace function public.set_member_status(p_org uuid, p_user uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_owner(p_org) then raise exception 'owners only' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'not on yourself' using errcode = '42501'; end if;
  if p_status not in ('active','suspended','removed') then raise exception 'status' using errcode = '22023'; end if;
  update public.org_members set status = p_status, updated_at = now() where org_id = p_org and user_id = p_user and role <> 'owner';
  perform public.log_auth_event('org_membership_changed', jsonb_build_object('org', p_org, 'user', p_user, 'status', p_status));
end;
$$;

/** The member list an owner sees in the admin dashboard. */
create or replace function public.org_roster(p_org uuid)
returns table (user_id uuid, display_name text, handle text, role text, status text, joined_at timestamptz)
language sql stable security definer set search_path = public as $$
  select m.user_id, p.display_name, p.handle, m.role, m.status, m.created_at
  from public.org_members m left join public.profiles p on p.id = m.user_id
  where m.org_id = p_org and public.is_org_owner(p_org)
  order by (m.role = 'owner') desc, m.created_at;
$$;

-- claim_verified_org: only verified orgs, only for a CONFIRMED email address.
create or replace function public.claim_verified_org()
returns table(org_id uuid, org_name text, newly_joined boolean)
language plpgsql security definer set search_path = public, auth as $$
declare v_email text; v_confirmed timestamptz; v_domain text; v_org public.organizations%rowtype; v_rows integer := 0;
begin
  if auth.uid() is null then return; end if;
  select u.email, u.email_confirmed_at into v_email, v_confirmed from auth.users u where u.id = auth.uid();
  if v_confirmed is null then return; end if;
  v_domain := lower(split_part(coalesce(v_email, ''), '@', 2));
  if v_domain = '' then return; end if;
  select * into v_org from public.organizations o where o.verified and o.status = 'active' and lower(o.email_domain) = v_domain limit 1;
  if not found then return; end if;
  insert into public.org_members (org_id, user_id, role, status) values (v_org.id, auth.uid(), 'student', 'active')
  on conflict (org_id, user_id) do nothing;
  get diagnostics v_rows = row_count;
  return query select v_org.id, v_org.name, v_rows > 0;
end;
$$;

-- ─── 7. Onboarding state (derived from facts, not trusted from the browser) ─
create or replace function public.my_onboarding()
returns jsonb language sql stable security definer set search_path = public, auth as $$
  select jsonb_build_object(
    'email_confirmed', (select u.email_confirmed_at is not null or u.phone_confirmed_at is not null from auth.users u where u.id = auth.uid()),
    'profile', (select jsonb_build_object('display_name', p.display_name, 'handle', p.handle, 'phone', p.phone, 'user_type', p.user_type,
                                          'org_choice', p.org_choice, 'completed_at', p.onboarding_completed_at) from public.profiles p where p.id = auth.uid()),
    'consent', public.has_current_consent(auth.uid()),
    'memberships', coalesce((select jsonb_agg(jsonb_build_object('org_id', m.org_id, 'org', o.name, 'slug', o.slug, 'role', m.role, 'status', m.status, 'verified', o.verified))
                             from public.org_members m join public.organizations o on o.id = m.org_id where m.user_id = auth.uid()), '[]'),
    'university', (select jsonb_build_object('org_id', i.org_id, 'role', i.role) from public.org_identities i where i.user_id = auth.uid() limit 1),
    'subscription', (select jsonb_build_object('plan', s.plan_id, 'status', s.status) from public.subscriptions s
                     where s.owner_type = 'user' and s.user_id = auth.uid() order by s.created_at desc limit 1)
  );
$$;

create or replace function public.complete_onboarding() returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  update public.profiles set onboarding_completed_at = coalesce(onboarding_completed_at, now()), updated_at = now() where id = auth.uid();
  perform public.log_auth_event('onboarding_completed', '{}');
end;
$$;

-- University (demo SSO) accounts are onboarded by their university.
update public.profiles p set user_type = 'student', org_choice = 'member', onboarding_completed_at = coalesce(onboarding_completed_at, now())
where exists (select 1 from public.org_identities i where i.user_id = p.id);

-- ─── 8. Account deletion ──────────────────────────────────────────────────
/**
 * Deletes the caller's account. Refuses while they are the only owner of an
 * organization that has other active members, so an organization is never
 * orphaned by one person leaving; organization-owned content is untouched.
 */
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public, auth as $$
declare v_blocking text;
begin
  if auth.uid() is null then raise exception 'not signed in' using errcode = '28000'; end if;
  select o.name into v_blocking from public.org_members m join public.organizations o on o.id = m.org_id
  where m.user_id = auth.uid() and m.role = 'owner' and m.status = 'active'
    and not exists (select 1 from public.org_members x where x.org_id = m.org_id and x.role = 'owner' and x.status = 'active' and x.user_id <> auth.uid())
    and exists (select 1 from public.org_members y where y.org_id = m.org_id and y.status = 'active' and y.user_id <> auth.uid())
  limit 1;
  if v_blocking is not null then
    raise exception 'You are the only owner of %. Add another owner or remove its members first.', v_blocking using errcode = '42501';
  end if;
  -- Keep the audit trail (user_id becomes NULL), keep organizations (created_by is not cascaded).
  update public.organizations set created_by = null where created_by = auth.uid();
  perform public.log_auth_event('account_deleted', '{}');
  delete from auth.users where id = auth.uid();
end;
$$;

-- ─── 9. Server-side counters without the service-role key ────────────────
/** Counts one model call against the caller's hourly cap; false once it is used up. */
create or replace function public.hit_rate_limit(p_limit int)
returns table (allowed boolean, remaining int, reset_at timestamptz)
language plpgsql security definer set search_path = public as $$
declare v_window timestamptz := date_trunc('hour', now()); v_count int;
begin
  if auth.uid() is null then return query select false, 0, v_window + interval '1 hour'; return; end if;
  insert into public.rate_limits (user_id, window_start, count) values (auth.uid(), v_window, 1)
  on conflict (user_id, window_start) do update set count = rate_limits.count + 1
  returning count into v_count;
  return query select v_count <= greatest(p_limit, 1), greatest(p_limit - v_count, 0), v_window + interval '1 hour';
end;
$$;

create or replace function public.log_ai_call(p_provider text, p_model text, p_latency_ms int, p_prompt_tokens int, p_completion_tokens int, p_status text, p_error text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then return; end if;
  insert into public.ai_logs (user_id, provider, model, latency_ms, prompt_tokens, completion_tokens, status, error_message)
  values (auth.uid(), left(p_provider, 40), left(p_model, 80), p_latency_ms, p_prompt_tokens, p_completion_tokens, left(p_status, 20), left(p_error, 300));
end;
$$;

-- ─── 10. Answer feedback ─────────────────────────────────────────────────
create table if not exists public.message_feedback (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  message_key text not null,
  rating smallint not null check (rating in (-1, 1)),
  reason text,
  course_id uuid references public.courses(id) on delete set null,
  excerpt text,
  created_at timestamptz not null default now(),
  unique (user_id, message_key)
);
alter table public.message_feedback enable row level security;
drop policy if exists feedback_own on public.message_feedback;
create policy feedback_own on public.message_feedback for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists feedback_staff_read on public.message_feedback;
create policy feedback_staff_read on public.message_feedback for select to authenticated using (course_id is not null and public.can_teach_course(course_id));

-- ─── 11. Retrieval: focus on the lecture the student opened ─────────────
drop function if exists public.match_course_chunks(uuid, extensions.vector, text, integer);
create or replace function public.match_course_chunks(course uuid, query_embedding extensions.vector(768), query_text text, match_count int default 6, focus_material uuid default null)
returns table (id uuid, material_id uuid, material_title text, heading text, page int, content text, score double precision)
language sql stable set search_path = public, extensions as $$
  with v as (      -- by meaning
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as r
    from public.course_chunks c where c.course_id = course and c.embedding is not null and query_embedding is not null
    order by c.embedding <=> query_embedding limit 24
  ), k as (        -- every word
    select c.id, row_number() over (order by ts_rank(c.search_tsv, q) desc) as r
    from public.course_chunks c, websearch_to_tsquery('english', coalesce(query_text,'')) q
    where c.course_id = course and c.search_tsv @@ q limit 24
  ), ko as (       -- any word, so short follow-ups ("solve this example") still find text
    select c.id, row_number() over (order by ts_rank(c.search_tsv, q) desc) as r
    from public.course_chunks c,
         to_tsquery('english', coalesce(nullif(array_to_string(array(select quote_literal(w) || ':*' from unnest(tsvector_to_array(to_tsvector('english', coalesce(query_text,'')))) w), ' | '), ''), 'zzzz')) q
    where c.course_id = course and c.search_tsv @@ q limit 24
  ), f as (        -- the lecture the student has open, in page order
    select c.id, row_number() over (order by c.page, c.idx) as r
    from public.course_chunks c where focus_material is not null and c.material_id = focus_material and c.course_id = course
    order by c.page, c.idx limit 24
  ), ids as (
    select id from v union select id from k union select id from ko union select id from f
  ), fused as (    -- reciprocal-rank fusion; the open lecture wins ties, a clearly better match elsewhere still wins
    select ids.id,
           coalesce(1.0/(60+v.r),0) + coalesce(1.0/(60+k.r),0) + coalesce(0.5/(60+ko.r),0)
           + case when f.id is not null then 0.012 + 0.5/(60+f.r) else 0 end as score
    from ids left join v on v.id = ids.id left join k on k.id = ids.id left join ko on ko.id = ids.id left join f on f.id = ids.id
  )
  select c.id, c.material_id, m.title, c.heading, c.page, c.content, fused.score
  from fused join public.course_chunks c on c.id = fused.id join public.course_materials m on m.id = c.material_id
  where m.status in ('ready','pending_review')
  order by fused.score desc limit greatest(1, least(match_count, 12));
$$;

/** Chunks still waiting for an embedding, for whoever may fill them. */
create or replace function public.chunks_missing_embeddings(course uuid, max_rows int default 16)
returns table (id uuid, material_title text, heading text, content text)
language sql stable security definer set search_path = public as $$
  select c.id, m.title, c.heading, c.content from public.course_chunks c join public.course_materials m on m.id = c.material_id
  where c.course_id = course and c.embedding is null and public.can_read_course(course)
  order by c.created_at limit least(greatest(max_rows, 1), 32);
$$;

/**
 * Fills embeddings that are still missing, computed by the MoeAI server from
 * the chunk text. Only NULL embeddings, only in a course the caller can read,
 * only unit-length 768-d vectors — so it can complete an index but never
 * overwrite one. Staff re-embed through chunks_write as before.
 */
create or replace function public.fill_chunk_embeddings(course uuid, ids uuid[], vectors text[])
returns int language plpgsql security definer set search_path = public, extensions as $$
declare n int := 0; i int; v extensions.vector(768);
begin
  if not public.can_read_course(course) then raise exception 'not enrolled' using errcode = '42501'; end if;
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
end;
$$;

-- ─── 12. Grants ───────────────────────────────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'public.handle_available(text)', 'public.update_my_profile(text,text,text,text,text)', 'public.accept_current_legal()',
    'public.has_current_consent(uuid)', 'public.log_auth_event(text,jsonb)', 'public.is_org_owner(uuid)',
    'public.find_organizations(text)', 'public.my_org_access(uuid)', 'public.choose_plan(text,uuid)',
    'public.create_organization(text,text,uuid,text,text)', 'public.invite_member(uuid,text,text)', 'public.accept_invitation(text)',
    'public.set_member_status(uuid,uuid,text)', 'public.org_roster(uuid)', 'public.my_onboarding()', 'public.complete_onboarding()',
    'public.delete_my_account()', 'public.hit_rate_limit(integer)', 'public.log_ai_call(text,text,integer,integer,integer,text,text)',
    'public.chunks_missing_embeddings(uuid,integer)', 'public.fill_chunk_embeddings(uuid,uuid[],text[])',
    'public.match_course_chunks(uuid,extensions.vector,text,integer,uuid)', 'public.claim_verified_org()'
  ] loop
    execute format('revoke all on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
  end loop;
end $$;
-- Organization lookup and handle checks happen before sign-in too.
grant execute on function public.find_organizations(text) to anon;
grant execute on function public.handle_available(text) to anon;

-- Signup checks a phone number is free before creating the account.
create or replace function public.phone_available(p_phone text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_phone,'') ~ '^\+[1-9][0-9]{7,14}$'
     and not exists (select 1 from public.profiles where phone = p_phone and id is distinct from auth.uid());
$$;
revoke all on function public.phone_available(text) from public;
grant execute on function public.phone_available(text) to anon, authenticated;

create or replace function public.revoke_invitation(p_id uuid) returns boolean
language plpgsql security definer set search_path = public as $$
declare v_org uuid;
begin
  select org_id into v_org from public.org_invitations where id = p_id and status = 'pending';
  if v_org is null then return false; end if;
  if not public.is_org_owner(v_org) then raise exception 'owners only' using errcode = '42501'; end if;
  update public.org_invitations set status = 'revoked' where id = p_id;
  return true;
end;
$$;
revoke all on function public.revoke_invitation(uuid) from public, anon;
grant execute on function public.revoke_invitation(uuid) to authenticated;
