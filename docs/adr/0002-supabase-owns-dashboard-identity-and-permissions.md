# Supabase owns dashboard identity and permissions

The dashboard will use Supabase Auth and Supabase tables as its own metadata store for users, clients, client groups, and group membership. The model separates `clients`, `profiles`, `client_groups`, and `client_group_members`, where each profile belongs to one dashboard client, each client stores the external `cuentaid` as its `external_client_id`, and group membership determines which child clients a parent client can consult.

We chose this instead of reusing the external `usuario` table, putting dashboard permissions in the external transactional database, or encoding visible clients directly in users. Keeping dashboard identity and permissions in Supabase lets the dashboard evolve independently from the source of truth for transactions, keeps the external database read-only for the MVP, and makes group access explicit instead of hidden in application code.

## Consequences

- Supabase Row Level Security should protect dashboard metadata tables.
- For the prototype, Supabase infrastructure is managed from the Supabase Dashboard: tables, policies, and authentication configuration are applied there. Repository SQL is reference documentation, not the migration source of truth.
- Supabase tables created through SQL must explicitly enable Row Level Security and document the applied policies in the repository reference SQL.
- The Next.js app should use the current Supabase SSR pattern: `@supabase/ssr`, request-scoped server clients, and a Next.js `proxy.ts` to refresh auth cookies and protect dashboard routes.
- Server-side authorization must verify the user with `getClaims()` or `getUser()`, not trust `getSession()` as authorization authority.
- Supabase's current key model should prefer publishable and secret keys. Legacy `anon` and `service_role` keys are fallback only while still supported.
- The dashboard's internal admin UI still manages product operations for clients, profiles, groups, memberships, and dashboard users; it does not replace Supabase infrastructure administration.
- For the MVP, Auth users are created or invited from the Supabase Dashboard; the internal admin UI links existing Auth users to dashboard profiles. Creating or inviting Auth users from the product UI would require trusted server-only Admin API calls.
- The external transactional source remains authoritative only for transactions and external accounts, not dashboard users or dashboard permissions.
- External `cuenta.cuentaid` is stored in the dashboard as `external_client_id`; names such as `nombrenegocio`, `razonsocial`, or personal names are display data, not access authority.
- External `usuario.usuarioid` is diagnostic/source-system data and must not be used as dashboard authentication.
- Users do not carry per-user functional roles in the MVP; permissions are derived from their client.
- Client group membership is flat for the MVP, not recursive hierarchy.
- Internal administrators can manage dashboard metadata and consult transactions across all clients, but they cannot modify external transactions.
- Internal administrator access is sensitive and must be included in the minimum audit trail.
