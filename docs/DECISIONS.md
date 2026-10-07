# KaziPay Decisions

## 2026-10-07: Step 1 foundation

- The repository is a modular monolith with separate `backend` and `frontend` projects.
- The frontend uses React, TypeScript, Vite, Tailwind CSS, React Router, Axios, and TanStack Query as specified.
- Money serializes as an object with a string `amount` and a three-letter `currency`, preventing JSON numeric precision loss.
- The local compose file starts PostgreSQL, Redis, MinIO, and MailHog. Additional services are added in later build steps when their modules need them.
- Step 5 uses `V11__tenant_settings_and_seed_plans.sql` as required by the backend specification, even though later feature migrations use lower version numbers. Flyway `out-of-order` is enabled so those future step migrations can be added without editing applied migrations.