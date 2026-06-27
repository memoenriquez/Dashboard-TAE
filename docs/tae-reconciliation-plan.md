# TAE Reconciliation Plan

This is the first technical slice for daily TAE reconciliation files. It follows `CONTEXT.md` and `docs/adr/0006-tae-reconciliation-files.md`.

This plan is still in definition mode. It documents the intended product and technical shape, but it does not lock the first implementation PR scope yet. Review the plan again immediately before implementation and choose the smallest safe vertical slice based on the environment, test SFTP availability, and current dashboard state.

## Scope

- Route: `/dashboard/reconciliations`.
- Configurable owners: active `parent` and `standalone` clients.
- Non-configurable clients: `child`; included through parent group membership.
- Editor: internal admin only.
- Viewer: internal admin plus parent/standalone client users for their own runs.
- Operational owner: internal admin / operations owns daily failures and SFTP retries.
- Cron: once daily at 03:00 Mexico City time, triggered by an external scheduler that calls this project's API.
- Storage: private Supabase Storage bucket, not Postgres blobs.
- Retention target: 90 days, enforced by a scheduled cleanup that deletes objects through the Supabase Storage API.
- SFTP upload requires a test SFTP destination before implementation is executed.
- Test destination can be a provider sandbox SFTP or a `/test` folder in the real SFTP account.

## Supabase Objects

Bucket:

```text
reconciliation-files
```

Table: `reconciliation_configs`

```sql
create table public.reconciliation_configs (
  id uuid primary key default gen_random_uuid(),
  owner_client_id uuid not null references public.clients(id) on delete cascade,
  is_enabled boolean not null default false,
  reconciliation_username text not null,
  cutoff_timezone text not null,
  filename_time_difference text not null,
  sftp_enabled boolean not null default false,
  sftp_host text,
  sftp_port integer not null default 22,
  sftp_username text,
  sftp_remote_path text,
  sftp_password_secret_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_client_id),
  constraint reconciliation_sftp_port check (sftp_port between 1 and 65535)
);
```

Note: parent/standalone ownership cannot be enforced with a simple check constraint because it depends on `clients.client_kind`. Enforce it in trusted server code and, if needed later, with a trigger.

Table: `reconciliation_runs`

```sql
create table public.reconciliation_runs (
  id uuid primary key default gen_random_uuid(),
  config_id uuid not null references public.reconciliation_configs(id),
  owner_client_id uuid not null references public.clients(id),
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
  internal_error text,
  generated_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_client_id, reconciled_date)
);
```

RLS intent:

- Internal admins can read and mutate configs/runs.
- Client users can read runs/configs only for their own parent/standalone client.
- Child users cannot read reconciliation rows unless we later add an explicit view.
- Writes happen through trusted server code after authorization.

Secrets:

- Do not store SFTP password/private key in table plaintext.
- Store SFTP host, port, username, and remote path as configuration metadata.
- Capture SFTP host, port, and remote path as separate fields. Do not accept a single `sftp://user:pass@host/path` URL.
- Store only `sftp_password_secret_name` for the password; resolve the actual password server-side from Supabase Vault.
- Internal admins can see host, username, and remote path. Client users see masked SFTP metadata only.
- v1 assumes password authentication, not private key authentication.
- Supabase Vault is already installed in the project as `supabase_vault` in schema `vault`.

Vault lookup pattern:

```sql
select decrypted_secret
from vault.decrypted_secrets
where name = 'sftp/m3-corp/password';
```

Operational rule: create and rotate real SFTP passwords from the Supabase Dashboard Vault UI or another explicit secret-management flow. Do not expose decrypted Vault values through dashboard APIs or logs.

Cron portability rule: reconciliation business logic lives in this Next.js project, not in the scheduler. The scheduler only calls a protected route. Vercel Cron can be the first trigger, but a future host can replace it without moving the reconciliation service.

## File Rules

Filename:

```text
[reconciliation_username]_[ddMMyyyy]_TAE_[filename_time_difference].txt
```

Header:

```text
HDR[ddMMyyyy]
```

Detail line:

```text
[phone 10][authorization 10][ddMMyyyy][amount 4]
```

Validation:

- Include only `status = successful`.
- `phoneNumber` must be exactly 10 digits.
- `authorization` is required, numeric, max 10 digits, left-padded to 10.
- `soldAmount` must be an integer from 0 to 9999, left-padded to 4.
- `occurredAt` must fall inside the reconciled day for the config `cutoff_timezone`.
- If any included transaction fails validation, mark `generation_failed` and do not upload/send.
- If there are zero successful transactions, generate a header-only file.
- Use CRLF (`\r\n`) line endings because the provider format is a `.TXT` file shown in a Windows/Notepad context.
- Manual generation is limited to dates up to 90 days in the past.
- `cutoff_timezone` must be one of the configured Mexican IANA timezones.

Mexican timezones allowed in v1:

```text
America/Bahia_Banderas
America/Cancun
America/Chihuahua
America/Ciudad_Juarez
America/Hermosillo
America/Matamoros
America/Mazatlan
America/Merida
America/Mexico_City
America/Monterrey
America/Ojinaga
America/Tijuana
```

Storage path:

```text
{owner_client_id}/{yyyy}/{MM}/{filename}
```

Remote SFTP path:

```text
{sftp_remote_path}/{filename}
```

Do not create date subfolders on the provider SFTP in v1. Many provider SFTP accounts expect a fixed folder and may not allow directory creation.

## Backend Shape

Page data loader:

- Resolve current user/profile with existing auth flow.
- Internal admin: list parent/standalone clients and their configs/runs.
- Client user: if parent/standalone, load own config/runs; if child, show no access state.

API routes:

```text
GET    /api/reconciliations
PATCH  /api/reconciliations/config
POST   /api/reconciliations/config/test-sftp
POST   /api/reconciliations/generate
POST   /api/reconciliations/runs/[id]/retry-send
GET    /api/reconciliations/runs/[id]/download
POST   /api/cron/reconciliations
POST   /api/cron/reconciliations?clientId=...
```

Authorization:

- `PATCH config`, `test-sftp`, `generate`, `retry-send`, and cron endpoint require internal admin or trusted cron secret.
- `download` requires internal admin or owner parent/standalone user.
- `GET` returns masked SFTP data for clients.
- `POST /api/cron/reconciliations` processes all enabled configurations.
- `POST /api/cron/reconciliations?clientId=...` processes one enabled parent/standalone client for protected operational/debug runs.

Cron portability:

```http
POST /api/cron/reconciliations
Authorization: Bearer <CRON_SECRET>
```

Environment variables:

```text
CRON_SECRET=
RECONCILIATION_CRON_TIMEZONE=America/Mexico_City
```

Audit events:

- `reconciliation_config_changed`
- `reconciliation_file_generated`
- `reconciliation_file_downloaded`
- `reconciliation_sftp_retry_requested`

Reconciliation download auditing should use the existing trusted audit pattern used by CSV export: write to `audit_events` through trusted server code, but do not fail an already authorized download solely because audit storage is unavailable.

## UI Shape

Internal admin:

- Client selector grouped as `Configurables` and `No configurables`.
- Config card for selected parent/standalone.
- Run history table.
- Actions: save config, test SFTP, generate date manually, download, retry send.

Client parent/standalone:

- Masked config summary.
- Run history table.
- Action: download.
- No retry, SFTP edit, or technical-error access.

Child client:

- Empty state: reconciliation is managed by the parent client.

## Implementation Order

Final PR boundaries are intentionally not fixed yet. At implementation time, choose the smallest slice that proves the workflow without weakening audit, storage, or authorization rules.

1. Add SQL reference and storage bucket instructions.
2. Add types and repository methods for configs/runs.
3. Add file builder with small tests.
4. Add route handlers for list/config/download.
5. Add generate/send service and cron endpoint.
6. Add `/dashboard/reconciliations` UI.
7. Add manual generation and retry send.

## Operational Rules

- If a run already exists for `owner_client_id + reconciled_date`, automatic cron must not regenerate or replace it. Return `already_exists` and use manual resend for the stored file.
- Manual generation for an existing date should show the existing run instead of overwriting it in v1.
- `generated` means the file exists in private storage and SFTP is disabled or no send attempt has completed yet.
- SFTP retry updates the same run: increment `send_attempt_count`, update `last_send_error` on failure, and set `sent_at` on success.
- Automatic SFTP upload must not overwrite an existing remote file. If the remote file exists, mark/send as failed with a clear internal error.
- Retry send uses the stored file from private storage; it does not regenerate file contents.
- A test SFTP destination must exist before enabling automatic SFTP upload in implementation.
- Production SFTP should not be activated until connection, authentication, and upload have been validated against the test destination.
- Provider validation flow: generate file in dashboard, download/review it, upload manually to the test destination, get provider confirmation, then enable automatic upload.
- Cleanup removes files older than 90 days through the Storage API and updates run metadata so stale files are no longer downloadable. Do not delete Storage objects with direct SQL against the `storage` schema.
- Internal operations owns failed generation, failed SFTP delivery, retry decisions, and provider escalation. Client users only see high-level status and downloadable evidence.

## Reconciliation Query Limits

The current interactive transaction repository has guardrails for dashboard reads: `TAE_FANOUT_MAX_ACCOUNTS`, `TAE_ACCOUNT_PAGE_SIZE`, `TAE_MAX_PAGES_PER_ACCOUNT`, and `TAE_FANOUT_MAX_ROWS`. Reconciliation should not silently inherit the interactive row cap as a business limit because a mandatory daily file can be larger than an interactive dashboard page.

V1 recommendation:

- Keep `TAE_FANOUT_MAX_ACCOUNTS` for owner scope protection.
- Add reconciliation-specific limits, for example `RECONCILIATION_MAX_ACCOUNTS`, `RECONCILIATION_ACCOUNT_PAGE_SIZE`, `RECONCILIATION_MAX_PAGES_PER_ACCOUNT`, and `RECONCILIATION_MAX_ROWS`.
- Default `RECONCILIATION_MAX_ROWS` higher than the interactive `10_000`, but still finite to avoid runaway jobs.
- If the reconciliation limit is exceeded, mark the run `generation_failed` with a clear internal error. Do not create a partial file.
- If real daily volumes approach the limit, move the generator to chunked file writing before raising limits again.

Rejected for v1:

- Partial reconciliation files.
- Multiple files per client/day.
- Ignoring row limits and building unbounded files in memory.

## Open Checks Before Coding

- Confirm who will create and rotate SFTP password secrets in Supabase Vault.
- Confirm cron provider and auth mechanism.
- Confirm Supabase Storage bucket creation process.
- Confirm test SFTP destination details before implementing upload.
- Estimate expected maximum daily successful transactions per parent/standalone before choosing `RECONCILIATION_MAX_ROWS`.

## Supabase Infra Execution

No Supabase infrastructure should be created during planning. When implementation starts, schema changes, storage bucket setup, Vault secret creation, and policy changes can be applied through the Supabase MCP after explicit approval and after reviewing the current production/project state.

Expected execution flow:

1. Inspect current Supabase tables, extensions, storage, and policies.
2. Confirm exact SQL/storage/Vault changes with the operator.
3. Apply schema changes through MCP migrations where appropriate.
4. Create or document manual Storage bucket setup, depending on Supabase support and operational preference.
5. Create/rotate real Vault secrets only through an explicit secret-management step; do not expose decrypted secrets in logs, docs, or normal tool output.
