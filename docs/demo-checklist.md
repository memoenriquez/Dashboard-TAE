# Demo Checklist

Use this checklist to prepare the local prototype demo.

## Supabase Dashboard

- Apply the reference schema and RLS policies from `docs/supabase-reference.sql`.
- Configure Supabase Auth redirect URLs to allow
  `http://localhost:3000/auth/accept-invite` for local invitation acceptance.
- Enable leaked password protection in Supabase Auth before sharing the demo
  outside the local prototype.
- Confirm `public.profiles` has exactly one `is_internal_admin = true` row for
  the demo owner.
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

## SQL Server Backup

- Confirm `.env` has:
  - `EXTERNAL_DB_HOST`
  - `EXTERNAL_DB_PORT`
  - `EXTERNAL_DB_NAME`
  - `EXTERNAL_DB_USER`
  - `EXTERNAL_DB_PASSWORD`
  - `EXTERNAL_DB_ENCRYPT`
- Confirm the SQL Server user is read-only.
- Confirm this query works in SSMS:

```sql
select top 1 ticket, cuentaid, fechahora
from sales_recargas
order by fechahora desc;
```

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
- Open transaction detail and confirm response code/message and API reference appear.
- Export CSV and confirm it respects active filters and scope.

## Verification Commands

Run before sharing the demo:

```powershell
npm test
npm run lint
npm run build
```
