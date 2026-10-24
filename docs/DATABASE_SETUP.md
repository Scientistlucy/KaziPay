# Database Setup

KaziPay uses one PostgreSQL database with two roles:

| Role | Used by | Notes |
|------|---------|-------|
| `kazipay_owner` | Flyway migrations | Owns every table. |
| `kazipay_app` | The running application | `NOSUPERUSER NOBYPASSRLS`, owns nothing, so forced row-level security always applies. |

Locally, Docker Compose creates both roles (`infra/db/init.sql`). For a shared development database we use Neon.

## Neon (shared development)

- Project `kazipay`, region **AWS Europe Central 1 (Frankfurt)**, the closest Neon region to Kenya.
- Branch `production`, database `kazipay`.
- **Connection pooling must stay off.** `TenantAwareDataSource` sets `app.tenant_id` as a session setting when a connection is borrowed and clears it when the connection is returned. A transaction-mode pooler (PgBouncer) can hand that session to another client between transactions, so the app must use the direct endpoint.
- The free plan suspends compute when idle, so the first request after a pause is slower. This is acceptable for development. Production needs an always-on paid plan with backups (see `KAZIPAY_BACKEND_SPEC.md` §3).

### One-time role setup

Run as `neondb_owner` in the Neon SQL Editor or with `psql`. Generate long random passwords and store them only in `backend/.env`.

```sql
-- connected to database neondb
CREATE ROLE kazipay_owner LOGIN PASSWORD '<owner-password>';
CREATE ROLE kazipay_app LOGIN PASSWORD '<app-password>' NOSUPERUSER NOBYPASSRLS;
GRANT kazipay_owner TO neondb_owner;

-- run on its own: CREATE DATABASE cannot run inside a transaction block
CREATE DATABASE kazipay OWNER kazipay_owner;

-- connected to database kazipay
GRANT CONNECT ON DATABASE kazipay TO kazipay_app;
GRANT USAGE ON SCHEMA public TO kazipay_app;
GRANT ALL ON SCHEMA public TO kazipay_owner;
ALTER DEFAULT PRIVILEGES FOR ROLE kazipay_owner IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kazipay_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kazipay_owner IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO kazipay_app;
ALTER DEFAULT PRIVILEGES FOR ROLE kazipay_owner IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO kazipay_app;
```

The default privileges mean every table Flyway creates as `kazipay_owner` is automatically usable by `kazipay_app`, and migrations can still revoke rights where needed (for example `UPDATE`/`DELETE` on `audit_logs`).

### Connecting the backend

Copy `backend/.env.example` to `backend/.env` and fill in the direct (non-pooler) host and both passwords. On startup Flyway applies migrations as the owner, then the app connects as `kazipay_app`.

### Verifying isolation

As `kazipay_app`, with no tenant set, tenant tables return no rows, and writing a row for another tenant is rejected:

```sql
SELECT count(*) FROM clients;  -- 0
SELECT set_config('app.tenant_id', '11111111-1111-1111-1111-111111111111', false);
INSERT INTO clients (tenant_id, name) VALUES ('22222222-2222-2222-2222-222222222222', 'Other tenant');
-- ERROR: new row violates row-level security policy for table "clients"
```
