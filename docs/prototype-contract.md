# Prototype Contract

This document defines the first implementable prototype contract for the airtime transaction dashboard. It is intentionally technical and should be read together with `CONTEXT.md` and the ADRs in `docs/adr/`.

## Stack Baseline

- Framework: Next.js `16.2.6`, confirmed as the latest stable version during planning.
- Router: App Router.
- Language: TypeScript.
- UI: shadcn/ui components for visual and interactive elements.
- Styling: Tailwind CSS with semantic tokens and layout utilities.
- Auth and dashboard metadata: Supabase Auth and Supabase tables.
- Supabase integration: `@supabase/supabase-js` plus `@supabase/ssr` for App Router SSR auth.
- Request protection: Next.js `proxy.ts`; `middleware.ts` is deprecated in Next.js 16.
- External transaction source for local prototype: restored SQL Server backup of the external database.
- External database access: read-only application user; application queries must be `SELECT` only.

## Operating Boundaries

- The dashboard is not the transaction source of truth.
- The external backup is a local development copy, not a new source of truth.
- Supabase infrastructure is operated from the Supabase Dashboard for this prototype.
- The internal admin UI operates dashboard product data: clients, profiles, groups, memberships, and dashboard users.
- The repository may keep SQL reference snippets, but it is not the operational migration source.
- Auth users are invited from the internal admin UI through trusted server code
  that calls Supabase Auth Admin APIs. The invitation immediately creates a
  non-admin `profiles` row linked to the selected dashboard client.
- Secrets and connection strings belong in local environment variables, never in committed files.

## Supabase Reference Model

The following tables represent the expected dashboard metadata model. Apply equivalent structure manually in the Supabase Dashboard. After the infrastructure exists, the dashboard's internal admin UI manages day-to-day records.

```sql
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  external_client_id bigint not null unique,
  display_name text not null,
  client_kind text not null check (client_kind in ('parent', 'child', 'standalone')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id),
  is_internal_admin boolean not null default false,
  display_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_client_required_for_non_admin
    check (is_internal_admin = true or client_id is not null)
);

create table public.client_groups (
  id uuid primary key default gen_random_uuid(),
  parent_client_id uuid not null references public.clients(id) on delete cascade,
  display_name text not null,
  created_at timestamptz not null default now(),
  unique (parent_client_id, display_name)
);

create table public.client_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.client_groups(id) on delete cascade,
  child_client_id uuid not null references public.clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, child_client_id)
);

create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id),
  actor_client_id uuid references public.clients(id),
  event_type text not null,
  target_type text,
  target_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.clients enable row level security;
alter table public.profiles enable row level security;
alter table public.client_groups enable row level security;
alter table public.client_group_members enable row level security;
alter table public.audit_events enable row level security;
```

### Supabase Policies

Reference policy intent:

- Internal administrators can manage dashboard metadata.
- Internal administrators use the product admin UI for operational records after tables and policies exist.
- Client users can read only their own profile and the client metadata needed to render their scope.
- Normal client users cannot mutate clients, groups, memberships, or audit events.
- Audit events are written by trusted server-side dashboard code.
- Transaction access is not protected by Supabase RLS because transactions live in the external database; Next.js enforces transaction scope server-side.

The reference SQL kept in the repository should include both table definitions and the RLS/policy statements applied manually in the Supabase Dashboard. RLS must be enabled explicitly when tables are created through SQL.

### Supabase App Integration

Implementation rules:

- Browser Supabase client: create with `createBrowserClient` from `@supabase/ssr`.
- Server Supabase client: create per request with `createServerClient` from `@supabase/ssr` for Server Components, Server Actions, and Route Handlers.
- Request proxy: use `proxy.ts` to refresh Supabase auth cookies and protect `/dashboard/**`.
- Server authorization must use `supabase.auth.getClaims()` or `supabase.auth.getUser()`. Do not use `getSession()` as authorization authority.
- Admin client, only if required: create with `@supabase/supabase-js`, `SUPABASE_SECRET_KEY`, `persistSession: false`, and `autoRefreshToken: false`.
- Admin Auth API methods under `supabase.auth.admin` must only run on trusted server code and must never be exposed to the browser.

## Environment Variables

Required local variables:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
EXTERNAL_DB_HOST=
EXTERNAL_DB_PORT=
EXTERNAL_DB_NAME=
EXTERNAL_DB_USER=
EXTERNAL_DB_PASSWORD=
EXTERNAL_DB_ENCRYPT=
TRANSACTION_QUERY_DEFAULT_DAYS=7
TRANSACTION_QUERY_MAX_DAYS=90
```

Rules:

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` may be used by browser-safe Supabase clients.
- `SUPABASE_SECRET_KEY` is server-only, bypasses RLS, and must never be exposed to the browser.
- User-scoped reads should use the SSR client created with the publishable key and the request cookies so RLS remains the default enforcement layer.
- Secret-key clients are reserved for trusted server code after authorization has already verified the actor, such as internal-admin mutations, Supabase Auth Admin calls, and privileged RPCs.
- Legacy fallback variables are allowed only if the Supabase project does not yet use the new key model: `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`.
- External database credentials are server-only.
- The external database user must be read-only.

## Internal Dashboard Routes

Initial application routes:

- `/login`: Supabase Auth login.
- `/dashboard`: main transaction dashboard.
- `/dashboard/transactions/[ticket]`: transaction detail route or detail panel state.
- `/dashboard/admin/clients`: minimum client administration.
- `/dashboard/admin/users`: minimum user/profile administration.
- `/dashboard/admin/groups`: minimum parent/child group administration.

Initial backend endpoints or server actions:

- Resolve current profile and dashboard permissions.
- Resolve transaction scope from authenticated user metadata.
- Query transaction KPIs and paginated transaction results.
- Query one transaction detail by ticket within resolved scope.
- Export CSV using the same filters and scope as the current result.
- Write audit events for CSV export, transaction detail view, permission changes, mapping changes, and internal administrator access.
- Manage clients, profiles, groups, and memberships for internal administrators.
- Auth user creation or invitation remains a Supabase Dashboard operation for the MVP unless explicitly changed; the product admin UI links existing Auth users to profiles.

## Normalized Transaction Record

The UI, CSV, KPIs, and detail view depend on this normalized shape, not raw external rows.

```ts
interface NormalizedTransactionRecord {
  ticket: string;
  externalClientId: number;
  visibleClientName: string;
  occurredAt: string;
  status: "successful" | "failed";
  phoneNumber: string;
  operatorName: "Telcel";
  sku: string;
  productName: string | null;
  soldAmount: number;
  responseCode: string;
  responseMessage: string | null;
  apiReference: string | null;
}
```

Mapping rules:

- `ticket` comes from `sales_recargas.ticket`.
- `externalClientId` comes from `sales_recargas.cuentaid`.
- `occurredAt` comes from `sales_recargas.fechahora`.
- `phoneNumber` comes from `sales_recargas.telefono`.
- `sku` comes from `sales_recargas.SKU`.
- `productName` may be enriched from `sku_items.Nombre`.
- `operatorName` is fixed to `Telcel` for the MVP because there are no additional operators in scope.
- `soldAmount` comes from `sales_recargas.monto`.
- `responseCode` comes from `sales_recargas.codresp`.
- `responseMessage` prefers `sales_recargas.descrip`, falls back to `sales_recargas.mensajenativo`, and is `null` when both are absent.
- `status` is `successful` when `codresp = '0'`; otherwise `failed`.
- `apiReference` comes from `sales_recargas.tokentransid` or `sales_recargas.trequestid`.
- `visibleClientName` prefers `cuenta.nombrenegocio`, then `cuenta.razonsocial`, then operational personal-name fallback.

## Filters And Limits

MVP filters:

- Date range.
- Status.
- Visible client, when the user can consult more than one client.
- Exact phone number.
- Operator. For the MVP this has a single option: Telcel.
- Transaction reference.

Rules:

- Default date range is the last 7 days.
- Maximum interactive range is 90 days.
- KPIs are calculated across the full filtered and authorized result set, not only the visible page.
- CSV export uses the same filters, scope, and 90-day limit.

## KPI Rules

MVP KPIs:

- Number of transactions: count all successful and failed transactions in scope.
- Sold amount: sum only successful transactions.

Unavailable in MVP:

- Balance consumed.
- Commission.
- Reversals.
- Refunds.

The API balance endpoint reports current account balance and does not provide per-transaction consumed balance.

## shadcn/ui Policy

Use shadcn/ui components for visual and interactive UI:

- Forms and fields.
- Buttons and actions.
- Tables and pagination.
- Cards and KPI containers.
- Dialogs, sheets, drawers, popovers, and menus.
- Badges and status labels.
- Alerts, toasts, empty states, skeletons, and loading indicators.
- Sidebar, navigation, breadcrumbs, tabs, and command patterns.

Allowed custom frontend code:

- Domain-specific composition around shadcn/ui components.
- Page layouts using Tailwind semantic tokens and layout utilities.
- Data formatting helpers.
- Server/client boundaries required by Next.js App Router.

Avoid:

- Custom visual widgets when shadcn/ui has an equivalent component.
- Raw color classes when semantic tokens or component variants fit.
- Recreating dialog, table, form, empty, toast, or badge primitives manually.

## Audit Events

Minimum audit event types:

- `csv_exported`
- `transaction_detail_viewed`
- `permission_changed`
- `client_mapping_changed`
- `internal_admin_accessed`

Audit metadata should include enough context to investigate the action without storing unnecessary duplicated transaction data.

## Demo Acceptance Criteria

The first prototype demo is acceptable when all of the following work locally:

- An internal administrator can log in with Supabase Auth.
- The internal administrator can create or maintain clients, users/profiles, groups, and memberships through a minimum UI.
- A parent client user can view its own transactions and child client transactions.
- A child client user can view only its own transactions.
- The dashboard can query the restored SQL Server backup through a read-only user.
- Date, status, visible client, phone number, operator, and transaction reference filters affect KPIs and table results consistently.
- A transaction detail view opens only inside the authenticated user's resolved scope.
- CSV export respects filters, scope, and the 90-day limit.
- Minimum audit events are written for sensitive actions.
- External source failures show an explicit error state, not an empty result.
