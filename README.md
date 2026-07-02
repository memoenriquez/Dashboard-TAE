# Dashboard TAE

Dashboard interno para consultar transacciones TAE con permisos resueltos por
Supabase y lecturas server-only hacia la API TAE.

## Getting Started

Configure `.env` from `.env.example`, then run:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Required Environment

Server-only values:

- `SUPABASE_SECRET_KEY`
- `SUPABASE_DB_URL` for server-only Vault reads
- `CRON_SECRET` for Vercel Cron authentication
- `TAE_API_BASE_URL`
- `TAE_API_KEY`

Browser-safe values:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

Runtime tuning values:

- `TRANSACTION_QUERY_DEFAULT_DAYS`
- `TRANSACTION_QUERY_MAX_DAYS`
- `TAE_API_TIMEOUT_MS`
- `TAE_FANOUT_CONCURRENCY`
- `TAE_ACCOUNT_PAGE_SIZE`
- `TAE_MAX_PAGES_PER_ACCOUNT`
- `TAE_FANOUT_MAX_ACCOUNTS`
- `TAE_FANOUT_MAX_ROWS`
- `OPENING_BALANCE_TIMEZONE`
- `RECONCILIATION_CRON_TIMEZONE`
- `RECONCILIATION_RETENTION_DAYS`

## Cron Jobs

`vercel.json` schedules:

- Opening balance snapshots at `06:00 UTC` through `/api/cron/opening-balances`.
- Reconciliation generation at `07:00 UTC` through `/api/cron/reconciliations`.
- Reconciliation cleanup at `08:00 UTC` through `/api/cron/reconciliations/cleanup`.

Vercel calls cron paths with `GET` and automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured in the project.

Use a random password-manager generated value for `CRON_SECRET`; it is only compared by the cron routes and is not stored in the database.

For protected preview deployments, include `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>` when manually smoke-testing cron routes. Reconciliation generation responses report whether each run was `created` or `reused`; reused runs are not regenerated or resent. Opening balance responses report one result per external client as `created`, `reused`, or `failed`.

## Verification

```bash
npm test
npm run lint
npm run build
```
