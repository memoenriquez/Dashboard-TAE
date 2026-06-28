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
- `TAE_FANOUT_MAX_ROWS`
- `RECONCILIATION_CRON_TIMEZONE`
- `RECONCILIATION_RETENTION_DAYS`

## Reconciliation Cron

`vercel.json` schedules reconciliation generation at `07:00 UTC` and cleanup at `08:00 UTC`. Vercel calls cron paths with `GET` and automatically sends `Authorization: Bearer <CRON_SECRET>` when `CRON_SECRET` is configured in the project.

Use a random password-manager generated value for `CRON_SECRET`; it is only compared by the cron routes and is not stored in the database.

For protected preview deployments, include `x-vercel-protection-bypass: <VERCEL_AUTOMATION_BYPASS_SECRET>` when manually smoke-testing cron routes. Generation responses report whether each run was `created` or `reused`; reused runs are not regenerated or resent.

## Verification

```bash
npm test
npm run lint
npm run build
```
