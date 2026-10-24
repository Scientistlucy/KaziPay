# KaziPay Decisions

## 2026-10-07: Step 1 foundation

- The repository is a modular monolith with separate `backend` and `frontend` projects.
- The frontend uses React, TypeScript, Vite, Tailwind CSS, React Router, Axios, and TanStack Query as specified.
- Money serializes as an object with a string `amount` and a three-letter `currency`, preventing JSON numeric precision loss.
- The local compose file starts PostgreSQL, Redis, MinIO, and MailHog. Additional services are added in later build steps when their modules need them.
- Step 5 uses `V11__tenant_settings_and_seed_plans.sql` as required by the backend specification, even though later feature migrations use lower version numbers. Flyway `out-of-order` is enabled so those future step migrations can be added without editing applied migrations.

## 2026-10-24: Shared development database on Neon

- The shared development database is Neon (free plan, Frankfurt). Production will move to a paid, always-on tier with backups before real payments flow, as the backend specification requires.
- The app connects through Neon's direct endpoint, never the pooler, because the tenant id is a session-level setting that is cleared when the connection returns to the Hikari pool. Switching to transaction-scoped `set_config(..., true)` would need the tenant to be set after each transaction begins, which is a larger change and not needed without a pooler.
- Neon provisioned PostgreSQL 18, while Docker Compose and Testcontainers use 16. The migrations use no version-specific features. We will align the versions before production.
- Setup steps are in `docs/DATABASE_SETUP.md`.

## 2026-10-24: Frontend built ahead of the remaining backend steps

- The staff UI for every MVP area was built before the backend steps for projects, time, invoicing and payments (Steps 7–10), so the product can be demoed and the screens reviewed early. This is a deliberate exception to "one build step at a time"; it changes no backend order.
- Screens read data only through TanStack Query hooks (`frontend/src/lib/queries.ts`). Until each backend step lands, those hooks call `frontend/src/mocks`, which returns typed sample data after a simulated delay so loading and error states are exercised. Integration swaps the fetchers and leaves components unchanged.
- Actions whose backend doesn't exist yet (creating projects and tasks, the invoice editor, PDF, gateway setup) show an informational toast naming the step that delivers them, rather than faking success.
- Icons come from Material Design through `react-icons/md`, which tree-shakes to only the icons used, instead of the Material UI icon package and its runtime.
- Pages are lazily loaded per route. The shared shell is about 166 KB gzipped.