-- Reference SQL for the dashboard metadata model.
-- Apply manually from the Supabase Dashboard for the prototype.

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  external_client_id bigint,
  display_name text not null,
  client_kind text not null check (client_kind in ('parent', 'child', 'standalone')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_external_id_required_for_transactional_clients
    check (client_kind = 'parent' or external_client_id is not null)
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  is_internal_admin boolean not null default false,
  display_name text not null,
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_client_required_for_non_admin
    check (is_internal_admin = true or client_id is not null)
);

create table if not exists public.client_groups (
  id uuid primary key default gen_random_uuid(),
  parent_client_id uuid not null references public.clients(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (parent_client_id, display_name)
);

create table if not exists public.client_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.client_groups(id) on delete cascade,
  child_client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, child_client_id)
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_client_id uuid references public.clients(id),
  event_type text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reconciliation_configs (
  id uuid primary key default gen_random_uuid(),
  owner_client_id uuid not null references public.clients(id) on delete cascade,
  is_enabled boolean not null default false,
  reconciliation_username text,
  cutoff_timezone text not null,
  filename_time_difference text not null,
  filename_date_format text not null default 'ddmmaaaa',
  content_date_format text not null default 'ddmmaaaa',
  delivery_protocol text not null default 'sftp',
  sftp_enabled boolean not null default false,
  sftp_host text,
  sftp_port integer not null default 22,
  sftp_username text,
  sftp_remote_path text,
  sftp_password_secret_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_client_id),
  constraint reconciliation_sftp_port check (sftp_port between 1 and 65535),
  constraint reconciliation_filename_date_format_check check (filename_date_format in ('ddmmaaaa', 'aaaammdd')),
  constraint reconciliation_content_date_format_check check (content_date_format in ('ddmmaaaa', 'aaaammdd')),
  constraint reconciliation_delivery_protocol_check check (delivery_protocol in ('sftp', 'ftp'))
);

create table if not exists public.reconciliation_child_configs (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references public.reconciliation_configs(id) on delete cascade,
  child_client_id uuid not null references public.clients(id) on delete cascade,
  reconciliation_username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (config_id, child_client_id),
  unique (config_id, reconciliation_username),
  constraint reconciliation_child_username_format
    check (reconciliation_username ~ '^[A-Za-z0-9_-]{1,40}$')
);

create table if not exists public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references public.reconciliation_configs(id),
  owner_client_id uuid not null references public.clients(id),
  subject_client_id uuid not null references public.clients(id),
  reconciled_date date not null,
  filename text,
  storage_path text,
  status text not null check (status in (
    'generated',
    'sent',
    'send_failed',
    'generation_failed'
  )),
  transaction_count integer not null default 0,
  total_amount numeric(12, 2) not null default 0,
  included_external_client_ids bigint[] not null default '{}',
  send_attempt_count integer not null default 0,
  last_send_error text,
  file_deleted_at timestamptz,
  internal_error text,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_client_id, subject_client_id, reconciled_date)
);

create index if not exists profiles_client_id_idx on public.profiles (client_id);
create unique index if not exists clients_external_client_id_unique_idx
  on public.clients (external_client_id)
  where external_client_id is not null;
create index if not exists client_groups_parent_client_id_idx
  on public.client_groups (parent_client_id);
create index if not exists client_group_members_group_id_idx
  on public.client_group_members (group_id);
create index if not exists client_group_members_child_client_id_idx
  on public.client_group_members (child_client_id);
create index if not exists audit_events_actor_user_id_idx
  on public.audit_events (actor_user_id);
create index if not exists audit_events_actor_client_id_idx
  on public.audit_events (actor_client_id);
create index if not exists audit_events_created_at_idx
  on public.audit_events (created_at desc);
create index if not exists reconciliation_configs_owner_client_id_idx
  on public.reconciliation_configs (owner_client_id);
create index if not exists reconciliation_child_configs_config_id_idx
  on public.reconciliation_child_configs (config_id);
create index if not exists reconciliation_child_configs_child_client_id_idx
  on public.reconciliation_child_configs (child_client_id);
create index if not exists reconciliation_runs_config_id_idx
  on public.reconciliation_runs (config_id);
create index if not exists reconciliation_runs_owner_date_idx
  on public.reconciliation_runs (owner_client_id, reconciled_date desc);
create index if not exists reconciliation_runs_subject_date_idx
  on public.reconciliation_runs (subject_client_id, reconciled_date desc);
create index if not exists reconciliation_runs_status_idx
  on public.reconciliation_runs (status);
create index if not exists reconciliation_runs_file_cleanup_idx
  on public.reconciliation_runs (reconciled_date)
  where storage_path is not null and file_deleted_at is null;
create unique index if not exists profiles_single_internal_admin_idx
  on public.profiles ((is_internal_admin))
  where is_internal_admin = true;

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.client_groups enable row level security;
alter table public.client_group_members enable row level security;
alter table public.audit_events enable row level security;
alter table public.reconciliation_configs enable row level security;
alter table public.reconciliation_child_configs enable row level security;
alter table public.reconciliation_runs enable row level security;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create or replace function private.is_internal_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and is_internal_admin = true
  );
$$;

-- The helper is used by RLS policies only and lives outside the exposed API schema.
revoke all on function private.is_internal_admin() from public, anon;
grant execute on function private.is_internal_admin() to authenticated, service_role;

create policy "Profiles are readable by owner or internal admins"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.is_internal_admin())
);

create policy "Profiles are insertable by internal admins"
on public.profiles
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Profiles are updatable by internal admins"
on public.profiles
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Profiles are deletable by internal admins"
on public.profiles
for delete
to authenticated
using ((select private.is_internal_admin()));

create policy "Clients are readable within resolved metadata scope"
on public.clients
for select
to authenticated
using (
  (select private.is_internal_admin())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.client_id = clients.id
  )
  or exists (
    select 1
    from public.profiles p
    join public.client_groups cg on cg.parent_client_id = p.client_id
    join public.client_group_members cgm on cgm.group_id = cg.id
    where p.id = (select auth.uid())
      and cgm.child_client_id = clients.id
  )
);

create policy "Clients are insertable by internal admins"
on public.clients
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Clients are updatable by internal admins"
on public.clients
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Clients are deletable by internal admins"
on public.clients
for delete
to authenticated
using ((select private.is_internal_admin()));

create policy "Client groups are readable by parent clients or internal admins"
on public.client_groups
for select
to authenticated
using (
  (select private.is_internal_admin())
  or exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.client_id = client_groups.parent_client_id
  )
);

create policy "Client groups are insertable by internal admins"
on public.client_groups
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Client groups are updatable by internal admins"
on public.client_groups
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Client groups are deletable by internal admins"
on public.client_groups
for delete
to authenticated
using ((select private.is_internal_admin()));

create policy "Client group members are readable by scoped clients or internal admins"
on public.client_group_members
for select
to authenticated
using (
  (select private.is_internal_admin())
  or exists (
    select 1
    from public.profiles p
    join public.client_groups cg on cg.id = client_group_members.group_id
    where p.id = (select auth.uid())
      and (
        p.client_id = cg.parent_client_id
        or p.client_id = client_group_members.child_client_id
      )
  )
);

create policy "Client group members are insertable by internal admins"
on public.client_group_members
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Client group members are updatable by internal admins"
on public.client_group_members
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Client group members are deletable by internal admins"
on public.client_group_members
for delete
to authenticated
using ((select private.is_internal_admin()));

create policy "Audit events are readable by internal admins"
on public.audit_events
for select
to authenticated
using ((select private.is_internal_admin()));

create policy "Reconciliation configs are readable by internal admins"
on public.reconciliation_configs
for select
to authenticated
using ((select private.is_internal_admin()));

create policy "Reconciliation configs are insertable by internal admins"
on public.reconciliation_configs
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Reconciliation configs are updatable by internal admins"
on public.reconciliation_configs
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Reconciliation configs are deletable by internal admins"
on public.reconciliation_configs
for delete
to authenticated
using ((select private.is_internal_admin()));

create policy "Reconciliation child configs are readable by internal admins"
on public.reconciliation_child_configs
for select
to authenticated
using ((select private.is_internal_admin()));

create policy "Reconciliation child configs are insertable by internal admins"
on public.reconciliation_child_configs
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Reconciliation child configs are updatable by internal admins"
on public.reconciliation_child_configs
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Reconciliation child configs are deletable by internal admins"
on public.reconciliation_child_configs
for delete
to authenticated
using ((select private.is_internal_admin()));

create policy "Reconciliation runs are readable by internal admins"
on public.reconciliation_runs
for select
to authenticated
using ((select private.is_internal_admin()));

create policy "Reconciliation runs are insertable by internal admins"
on public.reconciliation_runs
for insert
to authenticated
with check ((select private.is_internal_admin()));

create policy "Reconciliation runs are updatable by internal admins"
on public.reconciliation_runs
for update
to authenticated
using ((select private.is_internal_admin()))
with check ((select private.is_internal_admin()));

create policy "Reconciliation runs are deletable by internal admins"
on public.reconciliation_runs
for delete
to authenticated
using ((select private.is_internal_admin()));

-- Inserts must be performed by trusted server-side code using a secret key.
-- Transaction detail/export routes should authorize the user with a session client first,
-- then write audit_events through the server-only trusted audit writer.
-- The secret key bypasses RLS, so no authenticated insert policy is defined; do not
-- add a broad authenticated INSERT policy because users could forge audit records.

-- Trusted server-side admin code uses this RPC to replace group membership
-- atomically. It is intentionally not executable by browser roles.
create or replace function public.replace_group_members(
  group_id uuid,
  child_client_ids uuid[]
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.client_group_members
  where client_group_members.group_id = $1;

  if coalesce(array_length($2, 1), 0) = 0 then
    return;
  end if;

  insert into public.client_group_members (group_id, child_client_id)
  select $1, child_client_id
  from unnest($2) as child_client_id;
end;
$$;

revoke all on function public.replace_group_members(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.replace_group_members(uuid, uuid[]) to service_role;
