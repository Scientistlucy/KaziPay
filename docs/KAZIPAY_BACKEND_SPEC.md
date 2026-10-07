# KaziPay — Backend Architecture, Implementation & API Specification

> Companion to `KAZIPAY_PROJECT_SPEC.md` (product, modules, canonical data model, build order) and `KAZIPAY_DESIGN_SYSTEM.md` (UI).
> **Precedence for backend questions: this document > project spec.** Where this document is silent, follow the project spec. Log deviations in `docs/DECISIONS.md`.

---

## 0. HOW CURSOR MUST USE THIS DOCUMENT

1. Build the backend as a **modular monolith** (Spring Modulith) — one deployable, strict module boundaries. Do **not** create separate microservices.
2. Follow the build steps in **Section 17**. After every step: `mvn verify` must pass (including the Modulith boundary test and the tenant-isolation tests).
3. **Canonical data model = project spec §8.** Section 5 here gives the executable Flyway migrations for the foundation and money-critical tables; generate the remaining tables exactly as defined in spec §8 using the same conventions.
4. **Money:** `BigDecimal` + `NUMERIC(14,2)` + currency code. In JSON, money is a **string** (`"150000.00"`) — never a JSON number.
5. **Tenant safety:** every tenant table has `tenant_id` + Row-Level Security. No query may rely on `WHERE tenant_id = ?` alone.
6. **Idempotency & concurrency:** payments, invoice numbering, and webhooks must be race-safe (Section 10–11).
7. **Never trust the client for amounts.** The server computes payable amounts from the invoice.
8. **No secrets in code or logs.** Gateway credentials are encrypted at rest.
9. Prefer the simplest thing that works; leave `// DECISION:` comments for non-obvious choices.

---

## 1. Technology Stack & Versions

| Concern | Choice | Notes |
|---------|--------|-------|
| Language | **Java 21** (LTS) | Virtual threads optional (`spring.threads.virtual.enabled=true`) after load testing |
| Framework | **Spring Boot 3.5.x (latest patch)** | Only move to Boot 4.x after verifying Spring Modulith, springdoc, Testcontainers, and all libraries support it. Never mix major lines. |
| Modularity | **Spring Modulith** | `ApplicationModules.verify()` in CI |
| Build | Maven 3.9+ (wrapper committed) | |
| Persistence | Spring Data JPA + Hibernate 6.x | **Prisma is NOT used** (it's a Node/TypeScript ORM, irrelevant here) |
| Migrations | **Flyway** | Versioned SQL only; never edit applied migrations |
| DB | **PostgreSQL 16** (15+ ok) | RLS required |
| Cache / rate limits | Caffeine (single instance) → **Redis 7** when running >1 instance | |
| Security | Spring Security 6 + **OAuth2 Resource Server (Nimbus JWT, RS256)** | No hand-rolled JWT parsing |
| Validation | Jakarta Bean Validation | |
| Mapping | MapStruct + Lombok | Never expose JPA entities in controllers |
| HTTP client | `WebClient` (+ Resilience4j) | M-Pesa, Stripe, Paystack, Africa's Talking |
| Jobs | `@Scheduled` + **ShedLock** (JDBC) for schedulers; **JobRunr** (or RabbitMQ in Phase 2) for retries | |
| PDF | OpenPDF or Flying Saucer (HTML→PDF) | Server-side only |
| Object storage | S3 API (MinIO local, Cloudflare R2/S3 prod) via AWS SDK v2 | |
| API docs | springdoc-openapi (latest 2.x compatible with your Boot version) | Don't pin the old `2.3.0` |
| Observability | Micrometer + Prometheus, structured JSON logs (Logback + logstash-encoder), Sentry | |
| Tests | JUnit 5, Mockito, Testcontainers, Rest Assured, WireMock, ArchUnit | |

**Core Maven dependencies:** `spring-boot-starter-web`, `-data-jpa`, `-validation`, `-security`, `-oauth2-resource-server`, `-actuator`, `-mail`, `-webflux` (for WebClient only), `spring-modulith-starter-core`, `-jpa`, `-events-jpa`, `postgresql`, `flyway-core`, `flyway-database-postgresql`, `springdoc-openapi-starter-webmvc-ui`, `mapstruct`, `lombok`, `resilience4j-spring-boot3`, `shedlock-spring` + `shedlock-provider-jdbc-template`, `bucket4j`, `caffeine`, `micrometer-registry-prometheus`, `logstash-logback-encoder`, `openpdf`, `software.amazon.awssdk:s3`, `com.stripe:stripe-java`, test: `spring-boot-starter-test`, `spring-security-test`, `testcontainers` (+ `postgresql`, `junit-jupiter`), `rest-assured`, `wiremock-standalone`, `archunit-junit5`.

---

## 2. Architecture

### 2.1 Package layout (package-by-module)
```
backend/src/main/java/com/kazipay/
├── KaziPayApplication.java
├── common/                    # shared kernel (no business logic)
│   ├── api/                   # ApiError, PageResponse, ProblemDetail advice, IdempotencyFilter
│   ├── money/                 # Money, Currency helpers, MoneySerializer
│   ├── tenant/                # TenantContext, TenantAwareDataSource, TenantFilter
│   ├── security/              # JwtService, Permission, PermissionEvaluator, CurrentUser
│   ├── outbox/                # OutboxEvent, OutboxPublisher
│   ├── audit/ (or module)     # AuditLogger
│   └── crypto/                # AesGcmEncryptor
├── identity/        ├── tenant/       ├── clients/     ├── projects/
├── time/            ├── expenses/     ├── invoicing/   ├── payments/
│   └── payments/{api,domain,infra,mpesa,stripe,paystack,gateway}
├── proposals/       ├── files/        ├── notifications/
├── reports/         ├── subscriptions/├── audit/       ├── webhooks/
└── admin/
```
Inside each module: `api` (controllers + DTOs, **public**), `domain` (entities, domain services, **package-private where possible**), `infra` (repositories, adapters), `events` (public event records). Cross-module access **only** through a module's `api` facade interface or via domain events.

### 2.2 Layering rules
`Controller → Service (application/domain) → Repository`. Controllers: validation + mapping only. Services: transactions + business rules. No entity leaves its module; DTOs/records at boundaries. ArchUnit test enforces: controllers don't touch repositories; modules don't access each other's `domain`/`infra`.

### 2.3 Events & outbox
- In-process events: Spring `ApplicationEventPublisher` + Spring Modulith's JPA event publication registry (persisted, retried).
- **Outbox** (`outbox_events`) for anything leaving the process (email/SMS/webhooks/queue): written in the **same transaction** as the state change; a poller publishes and marks `published_at`. Consumers must be idempotent (dedupe by event id).

### 2.4 Request lifecycle (authenticated)
`Rate limit → Correlation-ID filter → JWT validation → TenantFilter (sets TenantContext from JWT 'tid') → Idempotency filter (POST only) → Controller → @PreAuthorize permission check → Service @Transactional (connection gets app.tenant_id) → Repository (RLS enforced) → response`.

---

## 3. Hosting & Infrastructure

> **Verify current plans and limits before committing** — free-tier terms change often and the figures in the earlier draft may be out of date.

### 3.1 What matters more than "free"
- **M-Pesa and Stripe/Paystack call YOUR server.** Daraja callbacks and gateway webhooks need a **publicly reachable, always-on HTTPS endpoint**. A backend that sleeps when idle (many free app hosts) will silently lose payment callbacks. Do not host the Spring Boot app on a sleeping free tier in production.
- **JVM memory:** Spring Boot needs ~512 MB–1 GB comfortably. Free 256 MB containers will struggle.
- **Region/latency:** pick the region closest to Kenya that your provider offers (e.g., Cape Town if available, otherwise Europe). Payment polling and portal speed depend on it.
- **Database that auto-suspends** adds seconds of cold-start latency to the first request/callback after idle. Fine for dev; not for production payments.
- **Backups / PITR** are non-negotiable once real money flows.

### 3.2 Recommended path

| Stage | Database | App | Notes |
|-------|----------|-----|-------|
| **Local dev** | Postgres in Docker Compose | `mvn spring-boot:run` | No external DB needed. Use ngrok/cloudflared for Daraja callbacks. |
| **Shared dev / demo** | Neon or Supabase free tier (**dev only**) | Small container host or the VPS below | Free tiers have storage/compute limits and may pause/suspend — acceptable for dev. |
| **MVP / beta (real users)** | **Paid** managed Postgres (small tier) with backups — e.g., Neon paid, Supabase Pro, Aiven, DO Managed, AWS RDS | **Small always-on VPS** (e.g., Hetzner/DigitalOcean) running Docker Compose + Caddy (auto-HTTPS), or Fly.io/Render paid always-on instance | Predictable cost, always-on, callbacks safe. |
| **Scale** | Managed Postgres + read replica/PITR | Kubernetes or ECS with HPA | Phase 3+. |

### 3.3 Provider cheat-sheet (verify details yourself)

| Provider | Good for | Watch out for |
|----------|----------|---------------|
| **Neon** | Dev branching, serverless Postgres, quick start | Free tier is small; scale-to-zero cold starts; use **pooled** endpoint for the app and **direct** endpoint for Flyway |
| **Supabase** | Postgres + storage + dashboards | Free projects can pause after inactivity; you are only using its Postgres (Spring handles auth) |
| **Aiven** | Managed Postgres with backups, production-leaning | Free tier is single-region/limited resources |
| **Render / Railway / Fly.io** | Easy app hosting | Free/trial offers may sleep, expire, or be one-time credit; check terms |
| **VPS + Docker Compose** | Cheapest reliable always-on MVP | You manage updates/backups (script them) |

### 3.4 Connection-pooling gotchas (Neon/Supabase/PgBouncer)
- Row-level security uses a transaction-scoped setting (`set_config('app.tenant_id', …, true)`), which is **safe with transaction pooling**. Do **not** rely on session-level state across transactions unless you reset it (Section 6 does).
- Run **Flyway against the direct (non-pooled) connection** with the owner role; run the app against the pooled connection with the restricted app role.
- With PgBouncer in transaction mode, set JDBC `prepareThreshold=0` if you see prepared-statement errors.
- Keep Hikari small on small plans: `maximum-pool-size=5–10`, `connection-timeout=30000`, `keepalive-time=300000`.

### 3.5 Other infrastructure
- **Object storage:** Cloudflare R2 or S3 (MinIO locally).
- **Email:** SendGrid / Mailgun / Amazon SES / SMTP (MailHog locally). Set SPF, DKIM, DMARC.
- **SMS:** Africa's Talking (Kenya), Twilio fallback.
- **Daraja go-live:** sandbox works immediately with test credentials; production needs a registered Paybill/Till (shortcode), Safaricom approval ("Go Live" process), a public HTTPS callback URL, and the production passkey. Plan lead time for this — start early.
- **TLS/domains:** `api.kazipay.app`, `*.kazipay.app` (wildcard for tenant subdomains), Caddy/Cloudflare/cert-manager.

---

## 4. Configuration

### 4.1 Profiles
`application.yml` (shared) · `application-dev.yml` · `application-test.yml` · `application-prod.yml`. All secrets via environment variables (or Vault/Secrets Manager). Use `@ConfigurationProperties` + `@Validated` classes — fail fast on missing config.

### 4.2 `application.yml` (core)
```yaml
spring:
  application.name: kazipay
  datasource:
    url: ${DATABASE_URL}                 # app role (restricted, RLS enforced), pooled endpoint OK
    username: ${DATABASE_USER}
    password: ${DATABASE_PASSWORD}
    hikari:
      maximum-pool-size: ${DB_POOL_SIZE:10}
      connection-timeout: 30000
      keepalive-time: 300000
  jpa:
    open-in-view: false                  # IMPORTANT
    hibernate.ddl-auto: validate         # schema owned by Flyway
    properties:
      hibernate.jdbc.time_zone: UTC
      hibernate.jdbc.batch_size: 50
      hibernate.order_inserts: true
  flyway:
    url: ${FLYWAY_URL:${DATABASE_URL}}   # DIRECT connection, owner role
    user: ${FLYWAY_USER}
    password: ${FLYWAY_PASSWORD}
    locations: classpath:db/migration
  jackson:
    default-property-inclusion: non_null
    serialization.write-dates-as-timestamps: false
    deserialization.fail-on-unknown-properties: false
  security.oauth2.resourceserver.jwt:
    public-key-location: ${JWT_PUBLIC_KEY_LOCATION}
  servlet.multipart.max-file-size: 10MB
server:
  forward-headers-strategy: framework     # behind proxy/ingress
  shutdown: graceful
management:
  endpoints.web.exposure.include: health,info,prometheus
  endpoint.health.probes.enabled: true
kazipay:
  base-url: ${APP_BASE_URL}
  jwt: { private-key-location: ${JWT_PRIVATE_KEY_LOCATION}, issuer: ${JWT_ISSUER:https://api.kazipay.app}, access-ttl: PT15M, refresh-ttl: P30D }
  crypto.master-key: ${ENCRYPTION_MASTER_KEY}      # base64 32 bytes; later KMS
  mpesa: { env: ${MPESA_ENV:sandbox}, callback-base-url: ${MPESA_CALLBACK_BASE_URL}, safaricom-ip-allowlist: ${MPESA_IP_ALLOWLIST:} }
  storage: { endpoint: ${S3_ENDPOINT}, bucket: ${S3_BUCKET}, region: ${S3_REGION:auto} }
  rate-limit: { default-per-minute: 100, login-per-minute: 5, payments-per-minute: 10, public-per-minute: 30 }
```

### 4.3 Key generation (dev)
Generate an RSA keypair for RS256; keep private key outside the repo. Provide `scripts/gen-dev-keys.sh`. Support key rotation via `kid` header + JWKS endpoint (`/.well-known/jwks.json`) in Phase 3.

---

## 5. Database Migrations (Flyway)

### 5.1 Conventions (apply to every table)
- Files: `V{n}__{description}.sql` under `db/migration`. One concern per file.
- PK: `UUID` (`gen_random_uuid()` default; Hibernate `@UuidGenerator(style = VERSION_7)` or `TIME` for index-friendly IDs).
- `tenant_id UUID NOT NULL REFERENCES tenants(id)` + index on tenant tables.
- `created_at`, `updated_at` **`TIMESTAMPTZ`** (not `TIMESTAMP`); `deleted_at` for soft delete; `version BIGINT` (optimistic lock) on invoices, payments, time entries.
- Money `NUMERIC(14,2)`, currency `CHAR(3)`, rates/percent `NUMERIC(5,2)`.
- Enums as `VARCHAR` + `CHECK`.
- FKs: **do not** use `ON DELETE CASCADE` from tenants (tenant deletion is a controlled job). Prefer `RESTRICT`; use soft deletes.
- Every tenant table calls `SELECT enable_tenant_rls('table_name');`.

### 5.2 Migration plan (Phase 1 order)
```
V1__roles_and_helpers.sql        -- RLS helper functions
V2__tenants_plans_public_links.sql
V3__identity.sql                 -- users, refresh/reset/verify/magic tokens, invitations
V4__clients.sql
V5__projects_milestones_tasks.sql
V6__time_tracking.sql
V7__invoicing.sql                -- invoices, items, tax_rates, credit_notes
V8__payments.sql                 -- payments, gateway configs, mpesa raw callbacks, ledger
V9__platform.sql                 -- audit_logs, outbox_events, idempotency_keys, shedlock
V10__notifications.sql
V11__seed_plans.sql
```
Later phases add `proposals/contracts`, `expenses`, `files`, `subscriptions`, `webhooks/api_keys`, etc. per spec §8.

### 5.3 `V1__roles_and_helpers.sql`
```sql
-- App roles are created by infra (see infra/db/init.sql); Flyway runs as OWNER role.
-- The app connects as kazipay_app: NOT owner, NOT superuser, NO BYPASSRLS  → RLS applies.

CREATE OR REPLACE FUNCTION app_tenant_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.tenant_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION enable_tenant_rls(tbl regclass) RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);
  EXECUTE format('DROP POLICY IF EXISTS tenant_isolation ON %s', tbl);
  EXECUTE format(
    'CREATE POLICY tenant_isolation ON %s
       USING (tenant_id = app_tenant_id())
       WITH CHECK (tenant_id = app_tenant_id())', tbl);
END $$;

-- Grant defaults so the app role can use future tables
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO kazipay_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO kazipay_app;
```
`infra/db/init.sql` (local docker init): create `kazipay_owner` (owns schema, used by Flyway) and `kazipay_app` (LOGIN, no BYPASSRLS).

### 5.4 `V2__tenants_plans_public_links.sql`
```sql
CREATE TABLE tenants (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                VARCHAR(255) NOT NULL,
  slug                VARCHAR(63)  NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]([a-z0-9-]{1,61}[a-z0-9])$'),
  status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','SUSPENDED','DELETED')),
  logo_url            VARCHAR(500),
  primary_color       VARCHAR(7),
  timezone            VARCHAR(50)  NOT NULL DEFAULT 'Africa/Nairobi',
  default_currency    CHAR(3)      NOT NULL DEFAULT 'KES',
  locale              VARCHAR(10)  NOT NULL DEFAULT 'en',
  business_email      VARCHAR(255),
  business_phone      VARCHAR(50),
  address             TEXT,
  tax_id              VARCHAR(50),                        -- KRA PIN
  invoice_prefix      VARCHAR(10)  NOT NULL DEFAULT 'INV',
  next_invoice_seq    BIGINT       NOT NULL DEFAULT 1,
  default_terms_days  INT          NOT NULL DEFAULT 14,
  created_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ  NOT NULL DEFAULT now(),
  deleted_at          TIMESTAMPTZ
);
-- tenants is GLOBAL (no RLS): needed to resolve tenant from slug before context exists.

CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(20) UNIQUE NOT NULL, name VARCHAR(50) NOT NULL,
  price_minor BIGINT NOT NULL, currency CHAR(3) NOT NULL DEFAULT 'KES',
  limits JSONB NOT NULL, features JSONB NOT NULL, active BOOLEAN NOT NULL DEFAULT TRUE
);

-- Resolves public tokens (invoice/proposal/pay links) to a tenant WITHOUT a tenant context.
-- Global table, no RLS. Only token_hash is stored; raw token is shown once.
CREATE TABLE public_links (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash   CHAR(64) NOT NULL UNIQUE,              -- SHA-256 hex of token
  tenant_id    UUID NOT NULL REFERENCES tenants(id),
  entity_type  VARCHAR(30) NOT NULL CHECK (entity_type IN ('INVOICE','PROPOSAL','CONTRACT','MAGIC_LOGIN')),
  entity_id    UUID NOT NULL,
  expires_at   TIMESTAMPTZ,
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_public_links_entity ON public_links(entity_type, entity_id);
```

### 5.5 `V3__identity.sql`
```sql
CREATE TABLE users (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id),
  email              VARCHAR(255) NOT NULL,
  password_hash      VARCHAR(255),                       -- null for magic-link-only clients
  first_name         VARCHAR(100), last_name VARCHAR(100), phone VARCHAR(30),
  role               VARCHAR(20) NOT NULL CHECK (role IN ('OWNER','ADMIN','MANAGER','MEMBER','CLIENT')),
  client_id          UUID,                               -- FK added in V4; set when role = 'CLIENT'
  default_hourly_rate NUMERIC(10,2),
  email_verified_at  TIMESTAMPTZ,
  is_active          BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_count INT NOT NULL DEFAULT 0, locked_until TIMESTAMPTZ, last_login_at TIMESTAMPTZ,
  totp_secret_enc    BYTEA, totp_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_users_tenant_email UNIQUE (tenant_id, email)
);
CREATE UNIQUE INDEX uq_users_tenant_email_lower ON users (tenant_id, lower(email));

CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id), family_id UUID NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ, replaced_by UUID, user_agent VARCHAR(255), ip INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE one_time_tokens (                          -- password reset, email verify, magic login
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('PASSWORD_RESET','EMAIL_VERIFY','MAGIC_LOGIN')),
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMPTZ NOT NULL, used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  email VARCHAR(255) NOT NULL, role VARCHAR(20) NOT NULL, client_id UUID,
  token_hash CHAR(64) NOT NULL UNIQUE, invited_by UUID NOT NULL REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL, accepted_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_users_tenant ON users(tenant_id);
SELECT enable_tenant_rls('users'); SELECT enable_tenant_rls('refresh_tokens');
SELECT enable_tenant_rls('one_time_tokens'); SELECT enable_tenant_rls('invitations');
```

### 5.6 `V4`–`V6` (clients, projects/tasks, time)
Create exactly per **project spec §8.3, §8.5, §8.6** (clients, client_contacts, projects, project_members, milestones, tasks, task_comments, time_entries, active_timers, timesheets). Add `ALTER TABLE users ADD CONSTRAINT fk_users_client FOREIGN KEY (client_id) REFERENCES clients(id);`, tenant indexes, and `enable_tenant_rls` for each. Include `tenant_id` on **every** table (original draft omitted it on `milestones`, `tasks`, `invoice_items`).

### 5.7 `V7__invoicing.sql` (money-critical — use as written)
```sql
CREATE TABLE tax_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  name VARCHAR(50) NOT NULL, percent NUMERIC(5,2) NOT NULL CHECK (percent >= 0 AND percent <= 100),
  inclusive BOOLEAN NOT NULL DEFAULT FALSE, is_default BOOLEAN NOT NULL DEFAULT FALSE, active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  client_id UUID NOT NULL REFERENCES clients(id), project_id UUID REFERENCES projects(id),
  invoice_number VARCHAR(50) NOT NULL, po_number VARCHAR(50),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'
    CHECK (status IN ('DRAFT','SENT','VIEWED','PARTIALLY_PAID','PAID','OVERDUE','VOID','CANCELLED')),
  currency CHAR(3) NOT NULL, exchange_rate NUMERIC(12,6) NOT NULL DEFAULT 1,
  issue_date DATE NOT NULL, due_date DATE NOT NULL,
  subtotal NUMERIC(14,2) NOT NULL, discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0, total_amount NUMERIC(14,2) NOT NULL,
  wht_amount NUMERIC(14,2) NOT NULL DEFAULT 0,        -- withholding tax expected to be withheld by client
  amount_paid NUMERIC(14,2) NOT NULL DEFAULT 0,
  credited_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  balance_due NUMERIC(14,2) GENERATED ALWAYS AS (total_amount - wht_amount - amount_paid - credited_amount) STORED,
  notes TEXT, terms TEXT, sent_at TIMESTAMPTZ, viewed_at TIMESTAMPTZ, paid_at TIMESTAMPTZ,
  etims_receipt_no VARCHAR(100), etims_qr_url VARCHAR(500),
  version BIGINT NOT NULL DEFAULT 0, created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(), deleted_at TIMESTAMPTZ,
  CONSTRAINT uq_invoice_number UNIQUE (tenant_id, invoice_number),
  CONSTRAINT chk_invoice_amounts CHECK (total_amount >= 0 AND amount_paid >= 0 AND subtotal >= 0)
);
CREATE INDEX idx_invoices_status_due ON invoices(tenant_id, status, due_date);
CREATE INDEX idx_invoices_client ON invoices(tenant_id, client_id);

CREATE TABLE invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id), position INT NOT NULL,
  description VARCHAR(500) NOT NULL, quantity NUMERIC(10,2) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL, tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0, amount NUMERIC(14,2) NOT NULL,
  source_type VARCHAR(10) NOT NULL DEFAULT 'MANUAL' CHECK (source_type IN ('MANUAL','TIME','EXPENSE','MILESTONE')),
  source_id UUID
);
CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);

CREATE TABLE credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id), number VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL, amount NUMERIC(14,2) NOT NULL CHECK (amount > 0), currency CHAR(3) NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(), created_by UUID,
  UNIQUE (tenant_id, number)
);
SELECT enable_tenant_rls('tax_rates'); SELECT enable_tenant_rls('invoices');
SELECT enable_tenant_rls('invoice_items'); SELECT enable_tenant_rls('credit_notes');
```

### 5.8 `V8__payments.sql` (money-critical — use as written)
```sql
CREATE TABLE payment_gateway_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('MPESA','STRIPE','PAYSTACK','FLUTTERWAVE')),
  mode VARCHAR(10) NOT NULL DEFAULT 'SANDBOX' CHECK (mode IN ('SANDBOX','LIVE')),
  credentials_enc BYTEA NOT NULL,                       -- AES-256-GCM(JSON) ; never returned by API
  config JSONB NOT NULL DEFAULT '{}',                   -- shortcode, till/paybill type, callback secret hash…
  callback_secret_hash CHAR(64),
  active BOOLEAN NOT NULL DEFAULT FALSE, verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, provider, mode)
);

CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID NOT NULL REFERENCES invoices(id), client_id UUID NOT NULL REFERENCES clients(id),
  amount NUMERIC(14,2) NOT NULL CHECK (amount > 0), currency CHAR(3) NOT NULL,
  method VARCHAR(20) NOT NULL CHECK (method IN ('MPESA','CARD','BANK_TRANSFER','CASH','CHEQUE')),
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('MPESA','STRIPE','PAYSTACK','MANUAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'INITIATED'
    CHECK (status IN ('INITIATED','PENDING','COMPLETED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED')),
  provider_reference VARCHAR(255),                      -- M-Pesa receipt / charge id; NULL until known
  checkout_request_id VARCHAR(100), merchant_request_id VARCHAR(100),
  idempotency_key VARCHAR(100) NOT NULL,
  payer_phone VARCHAR(20), failure_code VARCHAR(20), failure_reason VARCHAR(255),
  fee_amount NUMERIC(14,2) NOT NULL DEFAULT 0, paid_at TIMESTAMPTZ,
  version BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(), updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_idem UNIQUE (tenant_id, idempotency_key)
);
CREATE UNIQUE INDEX uq_payment_checkout ON payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE UNIQUE INDEX uq_payment_provider_ref ON payments(provider, provider_reference) WHERE provider_reference IS NOT NULL;
CREATE INDEX idx_payments_invoice ON payments(tenant_id, invoice_id);
CREATE INDEX idx_payments_pending ON payments(status, created_at) WHERE status IN ('INITIATED','PENDING');

CREATE TABLE mpesa_callbacks_raw (                      -- store BEFORE processing; never lose a callback
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id),
  checkout_request_id VARCHAR(100), payload JSONB NOT NULL, source_ip INET,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ, process_error TEXT
);
CREATE INDEX idx_mpesa_raw_checkout ON mpesa_callbacks_raw(checkout_request_id);

CREATE TABLE ledger_entries (                           -- APPEND-ONLY
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  invoice_id UUID, payment_id UUID,
  entry_type VARCHAR(20) NOT NULL CHECK (entry_type IN
    ('INVOICE_ISSUED','PAYMENT','REFUND','CREDIT_NOTE','FEE','WHT','ADJUSTMENT')),
  direction VARCHAR(6) NOT NULL CHECK (direction IN ('DEBIT','CREDIT')),
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0), currency CHAR(3) NOT NULL,
  memo VARCHAR(255), created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Enforce append-only: app role gets no UPDATE/DELETE on ledger_entries.
REVOKE UPDATE, DELETE ON ledger_entries FROM kazipay_app;

CREATE TABLE webhook_events_received (                  -- dedupe provider webhooks (Stripe/Paystack)
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), provider VARCHAR(20) NOT NULL,
  event_id VARCHAR(255) NOT NULL, payload JSONB NOT NULL, status VARCHAR(20) NOT NULL DEFAULT 'RECEIVED',
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(), processed_at TIMESTAMPTZ,
  UNIQUE (provider, event_id)
);
SELECT enable_tenant_rls('payment_gateway_configs'); SELECT enable_tenant_rls('payments');
SELECT enable_tenant_rls('ledger_entries');
-- mpesa_callbacks_raw & webhook_events_received: tenant may be unknown at receipt → not RLS-protected;
-- app role may INSERT; reads happen only via system services. Keep out of tenant-facing APIs.
```

### 5.9 `V9__platform.sql`
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID REFERENCES tenants(id),
  actor_id UUID, actor_type VARCHAR(20) NOT NULL DEFAULT 'USER',
  action VARCHAR(80) NOT NULL, entity_type VARCHAR(50), entity_id UUID,
  before JSONB, after JSONB, ip INET, user_agent VARCHAR(255), correlation_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(tenant_id, entity_type, entity_id, created_at DESC);
REVOKE UPDATE, DELETE ON audit_logs FROM kazipay_app;

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(), tenant_id UUID NOT NULL REFERENCES tenants(id),
  aggregate_type VARCHAR(50) NOT NULL, aggregate_id UUID NOT NULL, event_type VARCHAR(80) NOT NULL,
  payload JSONB NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ, attempts INT NOT NULL DEFAULT 0, last_error TEXT
);
CREATE INDEX idx_outbox_unpublished ON outbox_events(created_at) WHERE published_at IS NULL;

CREATE TABLE idempotency_keys (
  tenant_id UUID NOT NULL, key VARCHAR(100) NOT NULL, request_hash CHAR(64) NOT NULL,
  response_status INT, response_body JSONB, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL, PRIMARY KEY (tenant_id, key)
);

CREATE TABLE shedlock (                                  -- distributed scheduler lock
  name VARCHAR(64) PRIMARY KEY, lock_until TIMESTAMPTZ NOT NULL,
  locked_at TIMESTAMPTZ NOT NULL, locked_by VARCHAR(255) NOT NULL
);
SELECT enable_tenant_rls('outbox_events');
SELECT enable_tenant_rls('idempotency_keys');
-- audit_logs: RLS enabled for reads in tenant context; inserts allowed for system via policy:
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON audit_logs FOR SELECT USING (tenant_id = app_tenant_id());
CREATE POLICY audit_insert ON audit_logs FOR INSERT WITH CHECK (tenant_id IS NULL OR tenant_id = app_tenant_id());
```

### 5.10 Schema tests (mandatory)
`SchemaIntegrityTest` (Testcontainers) asserts:
1. Every table with a `tenant_id` column (excluding the explicit global-table allowlist) has `relrowsecurity` **and** `relforcerowsecurity`.
2. The app role is not owner/superuser/BYPASSRLS.
3. `ledger_entries` / `audit_logs` reject UPDATE/DELETE for the app role.

---

## 6. Multi-Tenancy Implementation

### 6.1 TenantContext
```java
public final class TenantContext {
  private static final ThreadLocal<UUID> CURRENT = new ThreadLocal<>();
  public static void set(UUID id) { CURRENT.set(id); }
  public static Optional<UUID> get() { return Optional.ofNullable(CURRENT.get()); }
  public static UUID require() { return get().orElseThrow(() -> new IllegalStateException("No tenant context")); }
  public static void clear() { CURRENT.remove(); }

  public static <T> T runAs(UUID tenantId, Supplier<T> action) {
    UUID prev = CURRENT.get();
    CURRENT.set(tenantId);
    try { return action.get(); }
    finally { if (prev == null) CURRENT.remove(); else CURRENT.set(prev); }
  }
  public static void runAs(UUID tenantId, Runnable action) { runAs(tenantId, () -> { action.run(); return null; }); }
}
```

### 6.2 Setting the DB tenant per connection
Wrap the DataSource so each borrowed connection gets `app.tenant_id` and is **reset on release** (safe with pools):
```java
public class TenantAwareDataSource extends DelegatingDataSource {
  public TenantAwareDataSource(DataSource target) { super(target); }

  @Override public Connection getConnection() throws SQLException {
    Connection c = super.getConnection();
    UUID tenant = TenantContext.get().orElse(null);
    try (Statement st = c.createStatement()) {
      // UUID.toString() is safe from injection; empty string => no rows visible (RLS)
      st.execute("SELECT set_config('app.tenant_id', '" + (tenant == null ? "" : tenant) + "', false)");
    }
    return (Connection) Proxy.newProxyInstance(
      Connection.class.getClassLoader(), new Class[]{Connection.class},
      (proxy, method, args) -> {
        if ("close".equals(method.getName())) {
          try (Statement st = c.createStatement()) { st.execute("RESET app.tenant_id"); } catch (SQLException ignored) {}
        }
        try { return method.invoke(c, args); } catch (InvocationTargetException e) { throw e.getCause(); }
      });
  }
}
```
Register as the primary `DataSource` bean wrapping Hikari. **Tenant must be set before the transaction begins** (filter/`runAs`), because Hibernate acquires the connection at transaction start. Add Hibernate `@TenantId` on the `tenantId` field of base entities as defense in depth (`@TenantId` + `CurrentTenantIdentifierResolver` reading `TenantContext`).

### 6.3 TenantFilter
- Authenticated routes: tenant = JWT claim `tid` (never a client header).
- Public portal routes (`/api/v1/public/**`): resolve by token via `public_links` (global table) → set tenant → continue. Webhook routes: tenant from the signed/secret path segment.
- Subdomain-based tenant resolution (`acme.kazipay.app`) is used **only** for pre-auth routes (login page branding, magic-link request), via `tenants.slug`.
- Always `TenantContext.clear()` in `finally`.

### 6.4 Async, jobs, listeners
Tenant context does **not** propagate to other threads. Wrap `@Async`/executor tasks with a `TaskDecorator` that copies the tenant id; scheduled jobs list tenants from the (global) `tenants` table and call `TenantContext.runAs(tenantId, …)` per tenant. Event listeners read `tenantId` from the event payload and use `runAs`.

### 6.5 Mandatory isolation tests
`TenantIsolationIT`: create tenants A and B with data in every tenant table; as A, assert reads/updates/deletes of B's rows by id return **404/0 rows**; also assert raw JDBC queries as the app role with A's context never return B's rows. Auto-generate a case for each entity/endpoint.

---

## 7. Security

### 7.1 Tokens
- **Access token:** JWT RS256, 15 min. Claims: `sub` (user id), `tid` (tenant id), `role`, `email`, `iss`, `iat`, `exp`, `jti`.
- **Refresh token:** opaque random 256-bit, stored **hashed** (SHA-256) in `refresh_tokens`, 30-day expiry, **rotation with reuse detection** (reuse of a rotated token revokes the whole `family_id`). Delivered as `HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth` cookie; require `X-Requested-With: kazipay` header (or Origin check) on `/auth/refresh` and `/auth/logout` as CSRF defense. Not returned in JSON.
- **Magic links / reset / verify:** single-use, hashed, short TTL (15 / 30 / 1440 min).
- Passwords: **Argon2id** (`Argon2PasswordEncoder`) or BCrypt cost 12 via `DelegatingPasswordEncoder` (allows upgrades). Policy: ≥ 8 chars, upper+lower+digit; reject common passwords.
- Lockout: after 5 failures → exponential `locked_until`; always return generic "Invalid credentials".

### 7.2 Issuing tokens (Nimbus)
```java
@Service @RequiredArgsConstructor
class JwtService {
  private final JwtEncoder encoder; private final KaziPayProperties props;
  String issueAccessToken(AuthUser u) {
    Instant now = Instant.now();
    JwtClaimsSet claims = JwtClaimsSet.builder()
      .issuer(props.jwt().issuer()).subject(u.id().toString())
      .claim("tid", u.tenantId().toString()).claim("role", u.role().name()).claim("email", u.email())
      .id(UUID.randomUUID().toString()).issuedAt(now).expiresAt(now.plus(props.jwt().accessTtl())).build();
    JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(props.jwt().keyId()).build();
    return encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
  }
}
```

### 7.3 Security filter chain (shape)
```java
@Configuration @EnableMethodSecurity
class SecurityConfig {
  @Bean SecurityFilterChain filterChain(HttpSecurity http, TenantFilter tenantFilter, RateLimitFilter rl) throws Exception {
    return http
      .csrf(c -> c.disable())                                  // stateless Bearer API; cookie endpoints guarded separately
      .sessionManagement(s -> s.sessionCreationPolicy(STATELESS))
      .cors(Customizer.withDefaults())                         // allowlist per env
      .headers(h -> h.contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'none'; frame-ancestors 'none'"))
                     .frameOptions(f -> f.deny()).httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000)))
      .authorizeHttpRequests(a -> a
        .requestMatchers("/api/v1/auth/**", "/api/v1/public/**", "/actuator/health/**",
                         "/v3/api-docs/**", "/swagger-ui/**").permitAll()   // swagger: disable or protect in prod
        .requestMatchers("/api/v1/admin/**").hasRole("PLATFORM_ADMIN")
        .anyRequest().authenticated())
      .oauth2ResourceServer(o -> o.jwt(j -> j.jwtAuthenticationConverter(kaziPayJwtConverter())))
      .addFilterBefore(rl, BearerTokenAuthenticationFilter.class)
      .addFilterAfter(tenantFilter, BearerTokenAuthenticationFilter.class)
      .build();
  }
}
```
Public webhook endpoints are `permitAll` but protected by their own verification (secret path token, signature, IP allowlist). Disable Swagger UI in production or protect it.

### 7.4 Permissions (single source of truth)
```java
enum Permission { CLIENT_READ, CLIENT_WRITE, PROJECT_READ, PROJECT_WRITE, TASK_WRITE, TIME_LOG, TIME_APPROVE,
  EXPENSE_APPROVE, INVOICE_READ, INVOICE_WRITE, INVOICE_SEND, INVOICE_VOID, PAYMENT_RECORD, PAYMENT_REFUND,
  REPORT_READ, TEAM_MANAGE, SETTINGS_MANAGE, GATEWAY_MANAGE, BILLING_MANAGE }
// Role→Permission matrix lives in ONE class mirroring spec §9.3 and is unit-tested.
@PreAuthorize("@perm.has('INVOICE_SEND')")
```
Beyond role checks, enforce **resource-level** rules in services: `MEMBER` only sees assigned projects; `CLIENT` only rows where `client_id = currentUser.clientId`. Add tests for each.

### 7.5 Other hardening
- Rate limiting with Bucket4j (per IP + per user/tenant; stricter for login, payments, public token endpoints).
- Input validation on all DTOs; HTML from users sanitized (OWASP Java HTML Sanitizer) before storing/rendering.
- File uploads: size/type allowlist, content sniffing, randomized keys, ClamAV scan (Phase 2).
- Public tokens: 256-bit random, only SHA-256 hash stored, constant-time compare, expiring/revocable.
- Logging: never log passwords, tokens, PINs, full phone numbers (mask `2547****149`), card data, gateway secrets.
- Gateway credentials: AES-256-GCM encryption service; master key from env/KMS; per-record random IV; never serialize to API responses (DTOs have no such fields).
- Dependency & image scanning in CI (OWASP Dependency-Check / Trivy).

---

## 8. API Conventions

| Topic | Rule |
|-------|------|
| Base path | **`/api/v1`** (public/token endpoints under `/api/v1/public/**`) |
| Docs | `/swagger-ui.html`, `/v3/api-docs` (dev/staging; locked down in prod) |
| Format | JSON, UTF-8, `camelCase` |
| IDs | UUID strings |
| **Money** | **String with 2 decimals** + sibling `currency`: `"totalAmount": "440800.00", "currency": "KES"` |
| Dates | `date` = `YYYY-MM-DD`; timestamps = ISO-8601 UTC (`2026-10-07T10:00:00Z`) |
| Pagination | `?page=0&size=20&sort=createdAt,desc` (max size 100) |
| Success envelope (lists) | `{ "data": [...], "page": { "number":0,"size":20,"totalElements":47,"totalPages":3 }, "summary": { … optional } }` |
| Single resource | Returned directly (no wrapper) |
| Errors | **RFC 7807** `application/problem+json` (below) |
| Idempotency | `Idempotency-Key` header **required** on `POST /invoices`, `POST /invoices/generate`, all payment-initiation endpoints, manual payment, refunds |
| Concurrency | `ETag`/`If-Match` (entity `version`) on invoice & payment updates → `412` on mismatch |
| Soft delete | `DELETE` archives/soft-deletes; returns `204`. Sent invoices are never deleted (void / credit note). |
| Filtering | Whitelisted filter params only; reject unknown sort fields |
| Correlation | Accept/echo `X-Request-ID`; included in logs and error bodies |
| Rate limit headers | `RateLimit-Limit`, `RateLimit-Remaining`, `Retry-After` on 429 |

### 8.1 Error format
```json
{
  "type": "https://api.kazipay.app/errors/validation",
  "title": "Validation failed",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "detail": "One or more fields are invalid.",
  "errors": [{ "field": "dueDate", "message": "must be on or after issueDate" }],
  "correlationId": "8f3a2c1e-…",
  "timestamp": "2026-10-07T10:00:00Z"
}
```
Standard `code`s: `VALIDATION_ERROR`, `UNAUTHENTICATED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `PRECONDITION_FAILED`, `PLAN_LIMIT_REACHED` (402), `RATE_LIMITED` (429), `INVOICE_NOT_PAYABLE`, `PAYMENT_AMOUNT_INVALID`, `GATEWAY_UNAVAILABLE` (502/503), `GATEWAY_NOT_CONFIGURED`, `IDEMPOTENCY_KEY_REUSED` (422). Implement in one `@RestControllerAdvice`. Never leak stack traces or SQL.

### 8.2 OpenAPI
Annotate controllers with `@Tag/@Operation/@ApiResponse`; group APIs (`auth`, `core`, `billing`, `public`, `admin`); define a `bearer-jwt` security scheme; generate typed client for the frontend from `/v3/api-docs` (openapi-typescript) in CI.

---

## 9. API Reference (Phase 1 MVP)

Full endpoint inventory = **project spec §12** (adopt it, with the fixes below). The examples here define request/response shapes Cursor must follow.

### 9.1 Fixes vs. the earlier draft
- `POST /invoices/{id}/generate` → **`POST /invoices/generate`** (it creates a new invoice).
- Login needs the **workspace** because email is unique **per tenant**, not globally.
- Payment amount is **computed server-side** (optional partial `amount` is validated against `balanceDue`).
- Money values are strings, not JSON numbers.
- Added `PATCH /projects/{id}/status`, `/invoices/{id}/void`, credit notes, magic-link login, invitations.
- Refresh token moved from JSON body to an HttpOnly cookie.

### 9.2 Auth
```http
POST /api/v1/auth/register-workspace     (public)
POST /api/v1/auth/login                  (public)
POST /api/v1/auth/refresh                (cookie)
POST /api/v1/auth/logout                 (cookie)
POST /api/v1/auth/verify-email           (public, token)
POST /api/v1/auth/forgot-password        (public)   -- always 202, no user enumeration
POST /api/v1/auth/reset-password         (public)
POST /api/v1/auth/magic-link             (public)   -- clients; always 202
POST /api/v1/auth/magic-link/consume     (public)
POST /api/v1/invitations                 INVITE (TEAM_MANAGE)
POST /api/v1/invitations/{token}/accept  (public)
GET  /api/v1/me      PUT /api/v1/me      GET /api/v1/me/sessions     DELETE /api/v1/me/sessions/{id}
```

**`POST /auth/register-workspace`**
```json
// Request
{ "workspaceName": "Acme Consulting", "workspaceSlug": "acme",
  "email": "john@example.com", "password": "SecurePass123!", "firstName": "John", "lastName": "Doe",
  "timezone": "Africa/Nairobi", "currency": "KES" }
// 201 Created  (Set-Cookie: kp_refresh=…; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth)
{ "accessToken": "eyJ…", "expiresIn": 900,
  "user":   { "id": "…", "email": "john@example.com", "role": "OWNER", "emailVerified": false },
  "tenant": { "id": "…", "name": "Acme Consulting", "slug": "acme", "currency": "KES", "timezone": "Africa/Nairobi" } }
```
Single transaction: create tenant (+ default tax rate, invoice settings) → OWNER user → FREE subscription → send verification email → emit `TenantCreated`, `UserRegistered`. Reject reserved slugs. Rate-limit by IP.

**`POST /auth/login`**
```json
{ "workspaceSlug": "acme", "email": "john@example.com", "password": "SecurePass123!" }
```
→ `200` same shape as register (access token in body, refresh in cookie). 2FA-enabled users get `202 { "mfaRequired": true, "mfaToken": "…" }`.

### 9.3 Clients
```http
GET    /api/v1/clients?search=&status=&page=&size=&sort=
POST   /api/v1/clients                      (CLIENT_WRITE; enforces plan limit → 402)
GET    /api/v1/clients/{id}
PUT    /api/v1/clients/{id}
DELETE /api/v1/clients/{id}                 (archive)
POST   /api/v1/clients/{id}/portal-invite   (sends magic-link invitation)
GET    /api/v1/clients/{id}/statement?from=&to=
```
```json
// POST /clients request
{ "name": "Acme Corp", "company": "Acme Corporation", "email": "contact@acme.com",
  "phone": "+254700000000", "billingEmail": "billing@acme.com", "address": "123 Business St, Nairobi",
  "taxId": "A001234567Z", "defaultCurrency": "KES", "paymentTermsDays": 14 }
// 201
{ "id": "…", "name": "Acme Corp", "status": "ACTIVE", "phone": "+254700000000", "createdAt": "…" }
```
List item adds computed `activeProjects` and `totalPaid` (`"450000.00"`) via a read query/projection — not N+1.

### 9.4 Projects, milestones, tasks
```http
GET/POST   /api/v1/projects                   GET/PUT/DELETE /api/v1/projects/{id}
PATCH      /api/v1/projects/{id}/status       GET /api/v1/projects/{id}/progress
GET/POST   /api/v1/projects/{id}/members      DELETE /api/v1/projects/{id}/members/{userId}
GET/POST   /api/v1/projects/{id}/milestones   PUT/DELETE /api/v1/milestones/{id}   POST /api/v1/milestones/{id}/complete
GET/POST   /api/v1/projects/{id}/tasks        GET/PUT/DELETE /api/v1/tasks/{id}
PATCH      /api/v1/tasks/{id}/status          PATCH /api/v1/tasks/{id}/position
GET/POST   /api/v1/tasks/{id}/comments
```
```json
// POST /projects
{ "name": "Website Redesign", "clientId": "…", "billingType": "TIME_AND_MATERIALS",
  "budgetAmount": "500000.00", "currency": "KES", "hourlyRate": "5000.00", "deadline": "2026-11-30",
  "milestones": [{ "title": "Design phase", "dueDate": "2026-10-20" }] }
```
`GET /projects/{id}/progress` returns `{ overallProgress, taskProgress{…}, budget{ amount, invoiced, unbilledWork, remaining }, timeline{ startDate, deadline, daysElapsed, daysRemaining } }` (money as strings). Progress formula is configurable: tasks-done ratio (default) or milestone-weighted.

### 9.5 Time tracking
```http
GET/POST   /api/v1/time-entries              (filters: projectId,userId,status,from,to,billable)
GET/PUT/DELETE /api/v1/time-entries/{id}     (only DRAFT/REJECTED editable; INVOICED immutable)
POST       /api/v1/time-entries/{id}/submit | /approve | /reject {reason}
POST       /api/v1/timer/start  {projectId, taskId?, description?}   → 201
POST       /api/v1/timer/stop                                         → creates time entry
GET        /api/v1/timer/active
GET        /api/v1/timesheets?week=2026-10-05      POST /api/v1/timesheets/{week}/submit | /approve
```
Rules: one active timer per user (unique PK on `active_timers.user_id`); server computes `durationMinutes` from times; **rate snapshot** resolved at creation (override → project member → user default → project → tenant) and stored on the entry; reject overlapping/future entries per tenant setting; `MEMBER` can only edit own entries; approving requires `TIME_APPROVE`.

### 9.6 Invoices
```http
GET    /api/v1/invoices?status=&clientId=&projectId=&from=&to=&search=
POST   /api/v1/invoices                              (Idempotency-Key)
POST   /api/v1/invoices/generate                     (Idempotency-Key)   -- from approved time/expenses
GET    /api/v1/invoices/{id}                         PUT /api/v1/invoices/{id}   (DRAFT only; If-Match)
DELETE /api/v1/invoices/{id}                         (DRAFT only)
POST   /api/v1/invoices/{id}/send | /remind | /void | /duplicate
POST   /api/v1/invoices/{id}/credit-notes
POST   /api/v1/invoices/{id}/payments/manual         (Idempotency-Key)
GET    /api/v1/invoices/{id}/payments
GET    /api/v1/invoices/{id}/pdf
```
```json
// POST /invoices
{ "clientId": "…", "projectId": "…", "currency": "KES",
  "issueDate": "2026-10-07", "dueDate": "2026-10-21",
  "items": [
    { "description": "Website design", "quantity": "40", "unitPrice": "5000.00", "taxRateId": "…" },
    { "description": "Development",    "quantity": "30", "unitPrice": "6000.00", "taxRateId": "…" } ],
  "discount": { "type": "PERCENT", "value": "0" },
  "whtPercent": "5.00", "notes": "Thank you for your business!" }
// 201 — server recomputes everything; client-sent line "amount" is ignored
{ "id": "…", "invoiceNumber": null, "status": "DRAFT", "currency": "KES",
  "subtotal": "380000.00", "discountAmount": "0.00", "taxAmount": "60800.00",
  "totalAmount": "440800.00", "whtAmount": "19000.00", "amountPaid": "0.00", "balanceDue": "421800.00",
  "items": [ … ], "version": 0 }
```
- **Numbering:** drafts have `invoiceNumber = null`; the official gap-free number is assigned on `send` (transactional, Section 11.2).
- `POST /invoices/generate` body: `{ clientId, projectId, from, to, includeTime, includeExpenses, grouping: "BY_USER|BY_TASK|SINGLE_LINE", dueDate }` → creates a **DRAFT** from approved, un-invoiced entries and links them (`INVOICED` on send; released on void/delete-draft).
- `POST /invoices/{id}/send`: validates draft completeness, assigns number, locks lines, creates `public_links` token, enqueues email with PDF + pay link, writes ledger `INVOICE_ISSUED`, emits `InvoiceSent`. Returns `{ status:"SENT", invoiceNumber, payUrl, sentTo }`.
- Sent invoices are immutable → corrections via **credit note** or `void`.

### 9.7 Payments
```http
POST /api/v1/invoices/{id}/payments/mpesa        (Idempotency-Key)  auth'd staff on behalf of client
POST /api/v1/invoices/{id}/payments/card         (Idempotency-Key)  {provider: "STRIPE"|"PAYSTACK"}
POST /api/v1/public/pay/{token}/mpesa            (Idempotency-Key)  client via portal link
POST /api/v1/public/pay/{token}/card
GET  /api/v1/payments        GET /api/v1/payments/{id}        (client polls this: public variant /public/pay/{token}/payments/{id})
POST /api/v1/payments/{id}/refund                (PAYMENT_REFUND)
POST /api/v1/payments/{id}/reconcile             (force STK Query)
GET  /api/v1/payments/unmatched                  POST /api/v1/payments/unmatched/{id}/assign

POST /api/v1/public/webhooks/mpesa/{tenantId}/{secret}          STK callback
POST /api/v1/public/webhooks/mpesa/c2b/{tenantId}/{secret}/validation | /confirmation
POST /api/v1/public/webhooks/stripe        POST /api/v1/public/webhooks/paystack
```
```json
// POST /public/pay/{token}/mpesa
{ "phoneNumber": "0712345678", "amount": "150000.00" }       // amount optional → defaults to balanceDue
// 202 Accepted
{ "paymentId": "…", "status": "PENDING", "message": "Check your phone and enter your M-Pesa PIN.",
  "expiresInSeconds": 90, "pollUrl": "/api/v1/public/pay/{token}/payments/{paymentId}" }
// GET poll → { "paymentId":"…","status":"COMPLETED","providerReference":"QFH1234567","amount":"150000.00","paidAt":"…" }
// or { "status":"FAILED","failureCode":"CANCELLED_BY_USER","message":"You cancelled the request. No money was taken." }
```
Never expose raw Daraja `ResultCode/ResultDesc` to clients; map to friendly codes (Section 10.4).

### 9.8 Reports
```http
GET /api/v1/reports/revenue?period=monthly&from=&to=
GET /api/v1/reports/ar-aging            GET /api/v1/reports/unpaid-invoices
GET /api/v1/reports/project-profitability   GET /api/v1/reports/utilization
GET /api/v1/reports/client-lifetime-value   GET /api/v1/reports/payment-methods
GET /api/v1/reports/cash-flow           GET /api/v1/reports/tax-summary
(all accept ?format=csv|pdf)
```
Reports read from SQL aggregates/read models (never load entities into memory), cached in Redis/Caffeine (key includes tenant + params; evict on `PaymentCompleted`, `InvoiceSent`, etc.). Money fields are strings. Profitability: `revenue = paid + invoiced`, `cost = approved hours × cost rate + approved expenses` (cost rate field on member/user).

### 9.9 Other endpoints (Phase 2+)
Per project spec §12: proposals/contracts, expenses, files (presigned upload flow), notifications & preferences, subscriptions, tenant settings/gateways/templates/API keys/webhooks, search, audit log, admin console.

---

## 10. Payments Implementation (CRITICAL)

### 10.1 Gateway abstraction
```java
public interface PaymentGateway {
  Provider provider();
  InitiationResult initiate(PaymentRequest req);        // STK push / checkout / init transaction
  StatusResult queryStatus(Payment payment);            // reconciliation fallback
  RefundResult refund(RefundRequest req);
}
```
Resolve the implementation + tenant credentials via `GatewayRegistry.forTenant(tenantId, provider)` (decrypts `credentials_enc`). Wrap outbound calls with Resilience4j: timeouts (connect 3s / read 10s), retry **only idempotent reads** (token fetch, status query), circuit breaker per provider.

### 10.2 Payment state machine
```java
enum PaymentStatus {
  INITIATED, PENDING, COMPLETED, FAILED, CANCELLED, REFUNDED, PARTIALLY_REFUNDED;
  private static final Map<PaymentStatus, Set<PaymentStatus>> ALLOWED = Map.of(
    INITIATED, Set.of(PENDING, FAILED, CANCELLED),
    PENDING,   Set.of(COMPLETED, FAILED, CANCELLED),
    COMPLETED, Set.of(REFUNDED, PARTIALLY_REFUNDED),
    PARTIALLY_REFUNDED, Set.of(REFUNDED, PARTIALLY_REFUNDED));
  boolean canTransitionTo(PaymentStatus next) { return ALLOWED.getOrDefault(this, Set.of()).contains(next); }
}
```
All transitions go through `Payment.transitionTo(next)` which throws on invalid moves. Terminal states (`FAILED`, `CANCELLED`, `REFUNDED`) are final. A late callback for an already-terminal payment is stored and logged, **never** re-applied.

### 10.3 M-Pesa (Daraja) implementation

**Config per tenant** (`payment_gateway_configs`, encrypted JSON): `consumerKey`, `consumerSecret`, `shortcode`, `passkey`, `transactionType` (`CustomerPayBillOnline` | `CustomerBuyGoodsOnline`), optional `partyB` (till). Sandbox base `https://sandbox.safaricom.co.ke`, production `https://api.safaricom.co.ke` (configurable).

**Endpoints:** OAuth `GET /oauth/v1/generate?grant_type=client_credentials` (Basic auth); STK `POST /mpesa/stkpush/v1/processrequest`; query `POST /mpesa/stkpushquery/v1/query`; C2B register `POST /mpesa/c2b/v1/registerurl`.

**Token cache:** cache access token per tenant+env for ~55 minutes (Caffeine/Redis); refresh on 401.

**Initiation flow (`PaymentService.initiateMpesa`)**
```java
@Transactional
public PaymentView initiateMpesa(UUID invoiceId, MpesaPayRequest req, String idemKey) {
  // 1. idempotency: same (tenant, key) → return existing payment
  // 2. lock invoice row: invoiceRepo.findByIdForUpdate(invoiceId)  (PESSIMISTIC_WRITE)
  // 3. validate: status in (SENT, VIEWED, PARTIALLY_PAID, OVERDUE), balanceDue > 0, gateway active
  // 4. amount = req.amount() ?? invoice.balanceDue();  validate 1 <= amount <= balanceDue
  //    M-Pesa accepts whole KES only → require integer amount (reject decimals, don't silently round)
  // 5. block duplicate in-flight: no PENDING payment for same invoice+phone in last 2 minutes
  // 6. phone = PhoneNumbers.toMsisdn(req.phoneNumber())  // 07xx/01xx/+2547xx → 2547XXXXXXXX, validate
  // 7. save Payment(INITIATED); COMMIT before calling Safaricom (use TransactionTemplate / separate tx)
  // 8. call gateway.initiate → store checkout_request_id, merchant_request_id → status PENDING
  //    on gateway error → FAILED(failure_code=GATEWAY_ERROR) ; never leave INITIATED forever
}
```
**STK request fields:** `BusinessShortCode`, `Password = base64(shortcode + passkey + timestamp)`, `Timestamp = yyyyMMddHHmmss` (EAT), `TransactionType`, `Amount` (integer), `PartyA`/`PhoneNumber` (MSISDN), `PartyB` (shortcode/till), `CallBackURL` = `{callbackBase}/api/v1/public/webhooks/mpesa/{tenantId}/{secret}`, `AccountReference` (invoice number, truncated to the allowed length), `TransactionDesc` (short, e.g. "Invoice").

**Callback handler (`MpesaCallbackController`)**
1. Validate path `tenantId` + `secret` (constant-time compare against `callback_secret_hash`); optional source-IP allowlist from config. **Daraja callbacks are not signed — do not assume a signature.**
2. Insert full JSON into `mpesa_callbacks_raw` (first, always).
3. **Respond immediately** `200 {"ResultCode":0,"ResultDesc":"Accepted"}`.
4. Process asynchronously (outbox/`@Async` with `TenantContext.runAs`):
   - find payment by `CheckoutRequestID` (unknown → log + alert, ignore);
   - `ResultCode == 0`: read `CallbackMetadata` items (`Amount`, `MpesaReceiptNumber`, `TransactionDate`, `PhoneNumber`); verify `Amount == payment.amount`; if mismatch or suspicious → confirm via STK Query before crediting; unique `provider_reference` prevents double credit; transition `PENDING→COMPLETED`; `InvoiceSettlementService.apply(payment)`;
   - non-zero: map code → `FAILED`/`CANCELLED` with friendly reason.
5. Mark raw row `processed_at`; emit `PaymentCompleted`/`PaymentFailed` via outbox.

**Reconciliation job (every 60s, ShedLock):** for payments `PENDING` older than 90s → `queryStatus` (STK Query); resolves lost callbacks. After 5 minutes still unknown → `FAILED(TIMEOUT)`. Rate-limit queries (Daraja throttles).

**C2B (Phase 2):** register validation/confirmation URLs; customers paying to Paybill with account number = invoice number are auto-matched; others → `unmatched` queue for manual assignment.

### 10.4 Result code mapping (verify against current Daraja docs)

| Daraja code | Internal `failureCode` | Client message |
|-------------|------------------------|----------------|
| 0 | — (success) | — |
| 1032 | `CANCELLED_BY_USER` | You cancelled the request. No money was taken. |
| 1 | `INSUFFICIENT_FUNDS` | Your M-Pesa balance was too low. |
| 2001 | `WRONG_PIN` | The PIN entered was incorrect. |
| 1037 | `TIMEOUT` | We didn't get a response from your phone. |
| other / unknown | `PROVIDER_ERROR` | We couldn't complete the payment. Please try again. |

### 10.5 Invoice settlement (single place)
```java
@Service @RequiredArgsConstructor
class InvoiceSettlementService {
  @Transactional(propagation = MANDATORY)
  public void apply(Payment payment) {
    Invoice inv = invoiceRepo.findByIdForUpdate(payment.getInvoiceId());          // row lock
    inv.addPayment(payment.getAmount());                                          // amountPaid += amount
    inv.recomputeStatus(clock.today());   // balanceDue==0→PAID; >0 & paid>0→PARTIALLY_PAID; else keep; overdue by job
    ledger.append(inv, payment, ENTRY_PAYMENT, CREDIT);
    if (inv.isPaid()) inv.markPaidAt(clock.now());
    outbox.publish(new PaymentCompleted(payment.getId(), inv.getId()));
    audit.log("payment.applied", payment, …);
  }
}
```
- `balance_due` is a generated column: `total - wht - amount_paid - credited`.
- Overpayment: allowed only via manual/C2B; excess recorded as client credit (`ADJUSTMENT` ledger entry) — card/STK amounts are capped at `balanceDue`.
- Refund: reduces `amountPaid`, reopens invoice status, writes `REFUND` ledger entry; gateway refund attempted first, local state updated only on confirmation (or marked `REFUND_PENDING` if async).

### 10.6 Stripe & Paystack (Phase 2)
- **Stripe:** Checkout Session `mode=payment`, `metadata{tenant_id,invoice_id,payment_id}`, `client_reference_id=payment_id`; webhook endpoint verifies `Stripe-Signature` with `Webhook.constructEvent`, dedupes on `event.id` (`webhook_events_received`), handles `checkout.session.completed|expired`, `payment_intent.payment_failed`, `charge.refunded`. **Never** treat the success redirect as proof of payment.
- **Paystack:** initialize transaction → redirect → webhook (`x-paystack-signature` = HMAC-SHA512 of raw body with secret key) + `GET /transaction/verify/{reference}` on return.
- Gateway availability differs by merchant country — keep the abstraction; verify eligibility for Kenyan merchants before committing to Stripe.

### 10.7 Platform fee (optional)
`fee = amount × tenant.platformFeePercent` (HALF_UP, 2dp) → `FEE` ledger entry; never modify the invoice.

---

## 11. Invoicing Domain Logic

### 11.1 Calculation rules (pure, unit-tested `InvoiceCalculator`)
Inputs: lines (`qty`, `unitPrice`, `taxPercent`, `taxInclusive`), discount (`PERCENT|FIXED`), WHT %.
1. `lineNet = round2(qty × unitPrice)` (**HALF_UP**, documented decision).
2. `subtotal = Σ lineNet`.
3. **Discount applied before tax**; `PERCENT` → `subtotal × pct`; `FIXED` → value (≤ subtotal). Allocate discount across lines **proportionally** (largest-remainder to avoid 1-cent drift) so per-line tax is correct.
4. Tax per line on discounted net: exclusive → `tax = round2(net × rate)`; inclusive → `tax = round2(gross − gross/(1+rate))`.
5. `taxAmount = Σ line tax`; `total = subtotal − discount + taxAmount` (exclusive) or `subtotal − discount` (inclusive).
6. **WHT:** `whtAmount = round2(whtBase × whtPercent)` where `whtBase` = net-of-VAT amount (configurable). Rates are tenant/client configurable — **no hardcoded statutory rates**; flag for legal/tax review.
7. Invariants (assert in code and tests): `Σ line amounts == subtotal`, `total ≥ 0`, all values scale 2.

### 11.2 Gap-free invoice numbers
```java
@Transactional
public String nextInvoiceNumber(UUID tenantId) {
  Tenant t = tenantRepo.lockById(tenantId);          // SELECT … FOR UPDATE
  long seq = t.getNextInvoiceSeq();
  t.setNextInvoiceSeq(seq + 1);
  return format(t.getInvoicePrefix(), LocalDate.now(zone).getYear(), seq);   // e.g. INV-2026-0042
}
```
Called **inside the same transaction** as `send`. If the transaction rolls back, the sequence rolls back too (no gaps). Test with 50 concurrent sends → 50 unique consecutive numbers.

### 11.3 Generate from work
`InvoiceGenerationService`: select `APPROVED` & un-invoiced time entries (billable) and approved billable expenses in range → group per request → create DRAFT lines with `source_type/source_id` → mark entries as `RESERVED` (or link by `invoice_item_id`) in the same transaction; on send → `INVOICED`; on void/delete-draft → release. Use `SELECT … FOR UPDATE SKIP LOCKED` to avoid two users double-billing the same entries.

### 11.4 Overdue & reminders (jobs)
- Nightly (tenant timezone aware): `SENT|VIEWED|PARTIALLY_PAID` with `due_date < today` and `balance_due > 0` → `OVERDUE`; emit `InvoiceOverdue`.
- Reminder engine evaluates `reminder_rules`; dedupe via `reminder_log`; respects quiet hours for SMS.
- Recurring invoices: schedule table + job creates drafts (or auto-sends) idempotently using `(schedule_id, run_date)` unique key.

---

## 12. Notifications, Files, Jobs (summary)

- **Email:** `NotificationFacade.send(templateKey, recipient, data, locale)` → outbox → `EmailSender` (SendGrid/SES/SMTP adapter). Templates in DB (tenant override) with fallback to classpath defaults (`en`, `sw`). Log delivery status; honor suppression list; transactional receipts can't be disabled.
- **SMS:** Africa's Talking adapter; respect quiet hours and opt-in.
- **In-app:** `notifications` table + `GET /notifications` (+ SSE stream later).
- **Files (Phase 2):** `POST /files/presign` → client uploads direct to S3 → `POST /files/{id}/complete` → enqueue virus scan → status `CLEAN|INFECTED`. Download via short-lived presigned URLs after authorization check. Keys: `{tenantId}/{kind}/{entityId}/{uuid}`.
- **Jobs:** every scheduler uses ShedLock; handlers are idempotent; failures retried with backoff then dead-lettered and surfaced in the admin console.

---

## 13. Observability

- Logs: JSON, with `correlationId`, `tenantId`, `userId`, `requestId` in MDC; redact secrets/PII.
- Metrics (Micrometer): `http.server.requests`, `payments.initiated|completed|failed{provider}`, `mpesa.callback.latency`, `mpesa.reconcile.recovered`, `invoices.sent`, `jobs.failed{job}`, `outbox.lag`, Hikari pool, cache hit rate.
- Health: `/actuator/health/liveness|readiness` (DB, Redis, storage).
- Alerts: 5xx > 1% (5m); payment failure rate > 10% (10m); **PENDING payments older than 5 min > 0**; unprocessed callbacks; outbox lag; DB pool saturation; job failures.
- Sentry for exceptions (scrub PII).

---

## 14. Testing Strategy

| Layer | Must-have tests |
|-------|-----------------|
| Unit | `InvoiceCalculator` (rounding, inclusive/exclusive tax, discount allocation, WHT), `PaymentStatus` transitions, rate resolution, phone normalization, permission matrix, Money |
| Slice | `@DataJpaTest` w/ Testcontainers (RLS on), `@WebMvcTest` controllers (validation, authz, error format) |
| Integration | Full-stack `@SpringBootTest` + Testcontainers (Postgres, Redis, MinIO): auth flows (refresh rotation & reuse detection), CRUD per module, outbox publishing |
| **Tenant isolation** | `TenantIsolationIT` + `SchemaIntegrityTest` (Section 5.10/6.5) |
| **Payments (WireMock Daraja)** | success; user-cancel (1032); insufficient funds; timeout; **duplicate callback**; **callback before response saved**; amount mismatch; unknown CheckoutRequestID; lost callback → STK Query recovery; two concurrent callbacks; late callback after FAILED |
| Concurrency | 50 parallel invoice sends (numbering), double payment application, double "generate from time", concurrent timer start |
| Security | JWT tamper/expiry/wrong-tenant, role matrix on every endpoint, client-role scoping, rate limits, IDOR attempts, upload abuse |
| Architecture | `ApplicationModules.verify()`, ArchUnit layering rules |
| Contract | OpenAPI snapshot test (breaking-change detector) |
| Performance | k6: 100 concurrent users, p95 < 500 ms; payment endpoints under load |

Targets: ≥ 80% service-layer coverage; ≥ 90% for `invoicing` and `payments`. CI fails below threshold (JaCoCo).

---

## 15. Local Development & CI

### 15.1 Docker Compose (dev)
Services: `postgres:16` (init script creates `kazipay_owner` + `kazipay_app`), `redis:7`, `minio` (+ bucket init), `mailhog`, optional `rabbitmq`, `clamav`, `prometheus`, `grafana`. `make dev` boots infra; `mvn spring-boot:run -Dspring-boot.run.profiles=dev` runs the API. Provide a **seed command** (demo tenant, users per role, clients, projects, time, invoices, payments) and a Postman/Bruno collection.

### 15.2 Daraja in dev
Use the sandbox (test shortcode & passkey from the Daraja portal). Expose your machine with `ngrok`/`cloudflared`, set `MPESA_CALLBACK_BASE_URL` to the tunnel URL. Provide a `MockDarajaServer` (WireMock) profile for fully offline tests.

### 15.3 CI (GitHub Actions)
`lint (spotless/checkstyle) → unit → integration (Testcontainers) → modulith verify → OpenAPI export & diff → dependency scan → build image → push → deploy to staging → smoke test`. Flyway migrations run as a **pre-deploy step** with the owner role; migrations must be backward-compatible (expand → migrate → contract).

### 15.4 Dockerfile (multi-stage)
Build with Maven (JDK 21) → run on a slim JRE image as **non-root**, `-XX:MaxRAMPercentage=75`, health check on `/actuator/health/readiness`, graceful shutdown.

---

## 16. Common Pitfalls (Cursor: avoid these)

1. Using `double/float` for money → always `BigDecimal`; strings in JSON.
2. Trusting amounts or tenant IDs from the client.
3. Relying only on `WHERE tenant_id = ?` — RLS is mandatory; app DB role must not own tables.
4. `spring.jpa.open-in-view=true` (default) → set false.
5. Fetching entities in loops (N+1) → use projections/joins/`@EntityGraph`.
6. Applying a payment inside the HTTP callback thread without storing the raw callback first.
7. Treating the Stripe/Paystack **redirect** as payment confirmation.
8. Forgetting `TenantContext` in `@Async`, schedulers, and listeners.
9. Editing an applied Flyway migration.
10. Returning JPA entities or exposing encrypted credentials in DTOs.
11. Rounding M-Pesa amounts silently — reject non-integer KES amounts.
12. Letting INITIATED/PENDING payments hang forever — the reconciliation job must close them.
13. Hosting the API on a sleeping free tier (callbacks get lost).
14. Using the pooled DB endpoint for Flyway or session-level `SET` without reset.

---

## 17. Implementation Steps (backend — aligned with project spec §19)

Each step = one PR; `mvn verify` green before moving on.

**Step 1 — Foundation:** Maven project, Spring Modulith, Flyway `V1–V2`, Docker Compose, `application*.yml`, global error handling (RFC 7807), correlation-ID filter, `Money`, `PageResponse`, OpenAPI config, health/Prometheus, Testcontainers base class, Modulith + ArchUnit tests.
**Step 2 — Tenancy core:** `TenantContext`, `TenantAwareDataSource`, `TenantFilter`, base entity with `@TenantId`, `enable_tenant_rls`, `SchemaIntegrityTest`, `TenantIsolationIT` harness.
**Step 3 — Platform plumbing:** `V9` (audit, outbox, idempotency, shedlock), `AuditLogger`, outbox publisher job, `IdempotencyFilter`, `AesGcmEncryptor`, rate limiting.
**Step 4 — Identity:** `V3`; register-workspace, login, refresh rotation/reuse detection, logout, verify email, reset password, invitations, magic link, lockout, permission matrix + `@perm`, `/me`.
**Step 5 — Tenant settings:** profile, branding, tax rates, invoice settings, onboarding state; plan seed (`V11`) + `EntitlementService` stub (limits enforced from Step 6 onward).
**Step 6 — Clients:** `V4`; CRUD, archive, contacts, import/export, plan limit (402), portal invite.
**Step 7 — Projects/milestones/tasks:** `V5`; CRUD, members, progress calc, task comments, visibility flag, resource-level authz.
**Step 8 — Time tracking:** `V6`; entries, timer, timesheet, rate resolution, approval, locking, overlap rules.
**Step 9 — Invoicing:** `V7`; `InvoiceCalculator`, CRUD drafts, generate-from-work, numbering on send, credit notes, void, PDF, email send with `public_links`, overdue job, public invoice endpoint.
**Step 10 — Payments (M-Pesa):** `V8`; gateway config + encryption, token cache, STK push, callback pipeline, state machine, settlement, reconciliation job, manual payments, ledger, receipts, polling endpoint. **Heaviest testing here.**
**Step 11 — Client portal APIs:** magic-link sessions, client-scoped queries, public pay endpoints.
**Step 12 — Notifications v1:** `V10`; email templates (en/sw), preferences, delivery log, reminder engine, in-app notifications.
**Step 13 — Reports v1 + dashboard queries:** revenue, A/R aging, unpaid, caching.
**Step 14 — Hardening & CI:** CI pipeline, coverage gates, security tests, seed data, Postman collection, deployment scripts (VPS + Caddy), runbook.

✅ **MVP exit criteria:** signup → client → project → time logged & approved → invoice generated & sent → client pays via M-Pesa (sandbox) → receipt emailed → invoice `PAID`; all isolation, concurrency, and payment tests green.

**Phase 2+ (after MVP):** proposals/contracts/e-signature, expenses, files (+ClamAV), Stripe/Paystack, recurring invoices, C2B reconciliation, subscriptions & entitlements, advanced reports, SMS, admin console, search, data export/deletion, public API/webhooks, white-label, eTIMS adapter, observability stack, Kubernetes.

---

## 18. Definition of Done (per feature)

- [ ] Flyway migration (+ RLS call) and entity/repository
- [ ] Service with correct `@Transactional` boundaries and optimistic/pessimistic locking where needed
- [ ] Controller + DTOs + validation + OpenAPI annotations + RFC 7807 errors
- [ ] Permission checks and resource-level authorization (with tests)
- [ ] Tenant-isolation test for new entities/endpoints
- [ ] Audit log entries & domain events/outbox where relevant
- [ ] Idempotency considered for any money/number/side-effect operation
- [ ] Unit + integration tests; coverage threshold met
- [ ] No secrets/PII in logs; no raw entity exposure
- [ ] `docs/DECISIONS.md` updated for deviations

*End of backend specification — begin with Section 17, Step 1.*
