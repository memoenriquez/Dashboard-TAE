# Prototype starts as a full navigable vertical slice

The first dashboard prototype will be built as a full navigable MVP slice using the latest stable Next.js version confirmed at planning time, `16.2.6`. It will include Supabase Auth, dashboard metadata in Supabase, minimum internal administration for clients/users/groups, transaction consultation, filters, KPIs, paginated table, transaction detail, CSV export, minimum audit events, and external-source error handling.

The prototype will run locally against the TAE read API using a server-only `ApiKey`. Supabase infrastructure will be managed from the Supabase Dashboard, not from local migrations as the source of truth; this includes tables, policies, Row Level Security, and authentication configuration. The repository keeps API contract notes for review and reproducibility, but the TAE API remains the external transaction source. The product's internal admin UI still manages clients, profiles, groups, memberships, and dashboard users, while Auth user creation or invitation remains in the Supabase Dashboard for the MVP. The frontend will use shadcn/ui components for visual and interactive UI elements, with custom layouts limited to composing those components using semantic Tailwind classes.

We chose this instead of starting with a visual-only mock, a query-only spike, a local Supabase migration workflow, or a mock transaction adapter. A complete vertical slice validates the riskiest product assumptions together: authentication, scope resolution, parent/child client visibility, scoped transaction access, normalized records, CSV behavior, and audit events. Using the TAE read API exercises the actual integration boundary while keeping credentials server-only. Managing Supabase from its dashboard matches how the project will be operated at this stage and avoids introducing local infrastructure process before the model stabilizes.

## Consequences

- The implementation plan must start from Next.js `16.2.6` unless a newer stable release is explicitly revalidated before scaffolding.
- Next.js 16 request protection should use `proxy.ts`, not the deprecated `middleware.ts` convention.
- Supabase table definitions, RLS, policies, and authentication configuration should be documented as reference SQL or notes, but the Supabase Dashboard is the operational place where infrastructure changes are applied for the prototype.
- Supabase integration should use `@supabase/ssr` with browser and request-scoped server clients.
- Supabase API keys should prefer the current publishable/secret key model, with legacy anon/service-role keys only as fallback.
- The internal admin UI remains responsible for day-to-day product administration of clients, profiles, groups, memberships, and dashboard profiles.
- Auth user creation or invitation remains a Supabase Dashboard operation for the MVP unless explicitly changed to a trusted server-only Admin API flow.
- The app must treat the TAE API key as server-only and must apply Supabase-derived CuentaID scope before issuing transaction reads.
- The prototype must include enough internal administration to create and maintain dashboard clients, users, groups, and memberships.
- The first demo should cover an internal administrator, a parent client, and a child client.
- shadcn/ui components should be used for forms, tables, navigation, overlays, feedback, empty states, loading states, and badges instead of custom visual widgets.
- Custom frontend code should focus on domain composition, data flow, and layout, not recreating component primitives already provided by shadcn/ui.
- A separate prototype contract should define routes, normalized data fields, Supabase reference SQL, environment variables, and demo acceptance criteria before application code is written.
