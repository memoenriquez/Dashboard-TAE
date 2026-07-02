# Demo Checklist

Use this checklist to prepare the local prototype demo.

## Supabase Dashboard

- Apply the reference schema and RLS policies from `docs/supabase-reference.sql`.
- Configure Supabase Auth redirect URLs to allow
  `http://localhost:3000/auth/accept-invite` for local invitation acceptance
  and `http://localhost:3000/auth/confirm` for password reset callbacks.
- Enable leaked password protection in Supabase Auth before sharing the demo
  outside the local prototype, then confirm Supabase Security Advisor no longer
  reports `auth_leaked_password_protection`.
- Confirm `public.profiles` has exactly one `is_internal_admin = true` row for
  the demo owner.
- Confirm `public.audit_events` has no authenticated `insert` policy; inserts
  should come only from trusted server-side code using `SUPABASE_SECRET_KEY`.
- Confirm local `.env` has:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SECRET_KEY`
  - `APP_URL`
- Log in as an internal administrator.
- Keep additional dashboard users as client-linked profiles; the prototype does
  not support promoting more internal admins from the portal.
- Open `/dashboard/admin/clients` and create:
  - one parent client with its external client id.
  - one or more child clients with their external client ids.
- Open `/dashboard/admin/users` and invite client users by email.
- Open `/dashboard/admin/groups` and assign child client ids to the parent group.

## TAE API

- Confirm `.env` has:
  - `TAE_API_BASE_URL`
  - `TAE_API_KEY`
  - `TAE_API_TIMEOUT_MS`
  - `TAE_FANOUT_CONCURRENCY`
  - `TAE_ACCOUNT_PAGE_SIZE`
  - `TAE_MAX_PAGES_PER_ACCOUNT`
  - `TAE_FANOUT_MAX_ROWS`
- Confirm the `ApiKey` is available only to server-side runtime code.
- Confirm `getAccountsList` and `getTransactionsList` return data for at least
  one linked CuentaID used in the demo.

## Runtime Checks

- Run `npm run dev`.
- Confirm `/` loads.
- Confirm anonymous `/dashboard` redirects to `/login?next=%2Fdashboard`.
- Log in as internal admin and confirm:
  - `/dashboard` loads transactions.
  - `/dashboard/admin/clients` lists and creates clients.
  - `/dashboard/admin/users` sends invitations and creates client-linked profiles.
  - `/dashboard/admin/groups` creates parent/child groups.
- Log in as a parent client user and confirm it sees own transactions plus child transactions.
- Log in as a child client user and confirm it sees only its own transactions.
- Use the quick date filters and confirm they update the selected full-day range.
- Open transaction detail and confirm response code/message and API reference appear.
- Export CSV and confirm it respects active filters and scope.

## Verification Commands

Run before sharing the demo:

```powershell
npm test
npm run lint
npm run build
```
