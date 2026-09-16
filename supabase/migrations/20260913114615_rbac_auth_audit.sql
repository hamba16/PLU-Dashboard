-- All access is through the Next.js server after a complete password + email-OTP session.
-- No Data API grants, no client-callable SECURITY DEFINER functions, no user_metadata roles.
create schema plu_private;
revoke all on schema plu_private from public, anon, authenticated;
create table plu_private.users (
  id uuid primary key,
  email text not null unique check (email=lower(email)),
  name text not null,
  role text not null check (role in ('registration','approval','admin-readonly','admin-full')),
  division text,
  active boolean not null default true,
  otp_enabled boolean not null default true,
  must_change_password boolean not null default true,
  security_version integer not null default 1,
  is_test boolean not null default false,
  created_at timestamptz not null default now(),
  check ((role='registration' and division is not null and division in ('Kampala Central','Kawempe','Makindye','Nakawa','Rubaga')) or (role<>'registration' and division is null))
);
create table plu_private.sessions (
  token_hash text primary key,
  user_id uuid not null references plu_private.users(id),
  stage text not null check(stage in ('otp','password','complete')),
  security_version integer not null,
  attempts integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_user_idx on plu_private.sessions(user_id);
create index sessions_expiry_idx on plu_private.sessions(expires_at);
create table plu_private.registrants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references plu_private.users(id),
  division text not null check(division in ('Kampala Central','Kawempe','Makindye','Nakawa','Rubaga')),
  fields jsonb not null check(jsonb_typeof(fields)='object' and not fields ? 'nin'),
  nin_ciphertext text,
  nin_suffix text check(nin_suffix is null or length(nin_suffix)=4),
  status text not null default 'draft' check(status in ('draft','submitted','needs_correction','approved','rejected')),
  version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index registrants_division_created_idx on plu_private.registrants(division,created_at desc);
create index registrants_owner_idx on plu_private.registrants(owner_id);
create index registrants_status_idx on plu_private.registrants(status);
create table plu_private.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references plu_private.users(id),
  action text not null,
  record_id uuid references plu_private.registrants(id),
  target_user_id uuid references plu_private.users(id),
  detail jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index audit_created_idx on plu_private.audit_events(created_at desc,id desc);
create index audit_actor_idx on plu_private.audit_events(actor_id,created_at desc);
create index audit_record_idx on plu_private.audit_events(record_id,created_at desc);
create index audit_action_idx on plu_private.audit_events(action,created_at desc);
create table plu_private.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);
alter table plu_private.users enable row level security;
alter table plu_private.sessions enable row level security;
alter table plu_private.registrants enable row level security;
alter table plu_private.audit_events enable row level security;
alter table plu_private.rate_limits enable row level security;
revoke all on all tables in schema plu_private from public, anon, authenticated;
revoke all on all sequences in schema plu_private from public, anon, authenticated;
alter default privileges in schema plu_private revoke all on tables from public, anon, authenticated;
alter default privileges in schema plu_private revoke all on functions from public, anon, authenticated;
-- Even server code cannot silently rewrite history. Audit management means filter/export.
create function plu_private.reject_audit_mutation() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Audit events are append-only'; end;
$$;
revoke all on function plu_private.reject_audit_mutation() from public, anon, authenticated;
create trigger audit_append_only before update or delete or truncate on plu_private.audit_events
for each statement execute function plu_private.reject_audit_mutation();

-- Dedicated server login: password is installed separately, never in migration history.
create role plu_app nologin nosuperuser nocreatedb nocreaterole noinherit nobypassrls;
grant usage on schema plu_private to plu_app;
grant select,insert,update on plu_private.users,plu_private.registrants to plu_app;
grant select,insert,update,delete on plu_private.sessions,plu_private.rate_limits to plu_app;
grant select,insert on plu_private.audit_events to plu_app;
grant usage on all sequences in schema plu_private to plu_app;
create policy server_access on plu_private.users to plu_app using(true) with check(true);
create policy server_access on plu_private.registrants to plu_app using(true) with check(true);
create policy server_access on plu_private.sessions to plu_app using(true) with check(true);
create policy server_access on plu_private.rate_limits to plu_app using(true) with check(true);
create policy server_read on plu_private.audit_events for select to plu_app using(true);
create policy server_append on plu_private.audit_events for insert to plu_app with check(true);
