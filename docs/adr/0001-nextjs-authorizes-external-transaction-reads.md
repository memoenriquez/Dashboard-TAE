# Next.js authorizes external transaction reads

The dashboard will use Supabase Auth and Supabase tables for dashboard identity, clients, groups, and permissions, but Next.js will be the mandatory server-side layer for reading transactions from the external source of truth. Each transaction request validates the authenticated user, resolves the allowed `external_client_id` values from Supabase, applies that scope as a required filter, and queries the external transactional database with read-only credentials.

We chose this instead of exposing the external database to the browser, relying on Supabase to query the external source directly, or creating a separate microservice now. This keeps transaction credentials server-only, centralizes scope enforcement near the query, avoids duplicating transaction data into the dashboard database for the MVP, and leaves room to extract a service later if load or integration complexity requires it.

## Consequences

- Supabase Row Level Security protects dashboard metadata, not external transactions.
- Next.js must never accept `external_client_id` from the client as authority; it must derive scope from the authenticated user's dashboard metadata.
- KPI, table, detail, and CSV endpoints must all share the same scope resolution rules.
- The external transaction connection must use read-only credentials.
- Internal administrators may resolve a global transaction scope across clients, but this scope must still be derived server-side from dashboard permissions.
- CSV exports, transaction detail views, permission or mapping changes, and internal administrator access must emit minimum audit events.
