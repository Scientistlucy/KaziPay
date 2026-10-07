# KaziPay

KaziPay is a modular monolith for consultants and small agencies to manage client work, time, invoices, and payments.

> Do the work. Get paid.

## Project Status

The project is being built in the order defined by the specifications:

- Step 1: Foundation - complete
- Step 2: Tenancy core - complete
- Step 3: Platform plumbing - complete
- Step 4: Identity - complete
- Step 5: Tenant settings - next

The database is intentionally being delivered through versioned Flyway migrations alongside each build step. The current migrations cover the foundation, tenancy/platform plumbing, and identity tables. Docker-backed integration tests require Docker Desktop.

## Technology

### Backend

- Java 21
- Spring Boot 3.5.x
- Spring Modulith
- Spring Data JPA and JDBC
- PostgreSQL 16
- Flyway
- MapStruct and Lombok
- Spring Security with RS256 JWTs
- Testcontainers and JUnit 5

### Frontend

- React
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Axios
- Vitest and Testing Library

### Local infrastructure

- PostgreSQL
- Redis
- MinIO
- MailHog

## Repository Structure

```text
.
|-- backend/
|   |-- pom.xml
|   |-- .mvn/settings.xml
|   `-- src/
|       |-- main/java/com/kazipay/
|       |   |-- common/       # shared API, tenant, security, crypto, outbox, audit
|       |   |-- identity/     # authentication, roles, permissions, identity API
|       |   `-- KaziPayApplication.java
|       |-- main/resources/
|       |   |-- application.yml
|       |   `-- db/migration/ # immutable Flyway migrations
|       `-- test/
|-- frontend/
|   |-- package.json
|   |-- src/
|   |   |-- lib/              # API client
|   |   |-- test/             # test setup
|   |   `-- App.tsx
|   `-- vite.config.ts
|-- infra/
|   |-- docker-compose.yml
|   `-- db/init.sql
|-- docs/
|   |-- KAZIPAY_PROJECT_SPEC.md
|   |-- KAZIPAY_BACKEND_SPEC.md
|   |-- TESTING_AND_CI.md
|   |-- ERROR_LOG.md
|   |-- DECISIONS.md
|   `-- ...
|-- .cursorrules
`-- README.md
```

## Architecture Rules

- Build as a modular monolith; do not split into microservices prematurely.
- Package by module: `com.kazipay.<module>`.
- Modules communicate through public APIs or domain events only.
- Controllers call services; services call repositories.
- DTOs are used at module and HTTP boundaries. JPA entities never leave their module.
- Use `BigDecimal` for money and PostgreSQL `NUMERIC(14,2)` for stored amounts.
- Every tenant table has `tenant_id` and forced PostgreSQL Row-Level Security.
- Every new table requires a new Flyway migration. Applied migrations are immutable.
- Side-effect POST requests use idempotency keys where specified.
- Secrets and credentials must never be committed or logged.
- Each feature must include unit and integration tests.

The complete working rules are in [.cursorrules](.cursorrules). The specifications in [docs/](docs/) are the source of truth.

## Local Setup

### Prerequisites

- Java 21
- Maven 3.10+
- Node.js 22+
- Docker Desktop for PostgreSQL/Testcontainers integration tests

### Start infrastructure

```powershell
docker compose -f infra/docker-compose.yml up -d
```

### Run the backend

```powershell
Push-Location backend
mvn -s .mvn\settings.xml spring-boot:run
Pop-Location
```

### Run the frontend

```powershell
Push-Location frontend
npm install
npm run dev
Pop-Location
```

## Testing

Backend focused tests:

```powershell
Push-Location backend
mvn -s .mvn\settings.xml test
Pop-Location
```

Frontend build and tests:

```powershell
Push-Location frontend
npm run build
npm test
Pop-Location
```

The Maven settings file points dependencies to a writable user-local cache because the default Maven cache on the development machine is restricted.

## Database and tenancy

The application uses one PostgreSQL database with shared tables, `tenant_id`, and forced RLS. The local Compose setup creates a migration owner role and a restricted application role. The application role must not own tables and must not have `BYPASSRLS`.

Tenant context is established before a transaction begins. The tenant-aware datasource sets `app.tenant_id` when a connection is borrowed and clears it before the connection returns to the pool.

## Security Notes

- Never commit `.env` files, keys, passwords, gateway credentials, or tokens.
- Development JWT signing keys are generated at startup until environment-backed key configuration is added.
- Refresh tokens are opaque, hashed, rotated, and stored in tenant scope.
- Public and one-time tokens are stored as hashes and expire.

## Build Order

The authoritative build order is Section 19 of [KAZIPAY_PROJECT_SPEC.md](docs/KAZIPAY_PROJECT_SPEC.md) and Section 17 of [KAZIPAY_BACKEND_SPEC.md](docs/KAZIPAY_BACKEND_SPEC.md). Work on one step at a time and keep the build green before moving forward.

## License

MIT. See the project specifications and repository history for project decisions and implementation status.