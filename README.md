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

## Verification

```bash
npm test
npm run lint
npm run build
```
