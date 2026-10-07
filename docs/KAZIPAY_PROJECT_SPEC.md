# KaziPay — Client Portal, Billing & Payments for Consultants

> **Kazi** = "work" (Swahili) · **Pay** = get paid.
> Tagline: *Do the work. Get paid.*

---

## 0. HOW CURSOR MUST USE THIS DOCUMENT (READ FIRST)

This file is the single source of truth. Follow these rules:

1. **Build in the order of Section 19 (Build Order).** Do not jump ahead. Finish, compile, and test each step before starting the next.
2. **Start as a MODULAR MONOLITH, not 8 microservices.** (See Section 5.) Module boundaries must be strict so modules can be extracted later.
3. After each step: run `mvn verify` (backend) / `npm run build && npm test` (frontend). Fix all failures before continuing.
4. Never invent endpoints, tables, or fields that conflict with this spec. If something is ambiguous, choose the simplest option, and add a `// DECISION:` comment explaining it.
5. Every table is tenant-scoped unless marked **GLOBAL**. Every query must be tenant-safe (Section 10).
6. Money is **never** a `double`/`float`. Use `BigDecimal` in Java and `NUMERIC(14,2)` in PostgreSQL. Always store the currency alongside amounts.
7. All payment, webhook, and invoice-number operations must be **idempotent** and **transactional** (Section 11).
8. Secrets are never committed. Gateway credentials stored per tenant are **encrypted at rest** (AES-256-GCM).
9. Write tests alongside code (unit + Testcontainers integration). Target 80% coverage on service layer.
10. Keep a `docs/DECISIONS.md` file logging any deviation from this spec.

### Suggested `.cursorrules` (create this file in repo root)

```
You are building KaziPay per KAZIPAY_PROJECT_SPEC.md.
- Java 21, Spring Boot 3.3+, Spring Modulith, PostgreSQL 16, Flyway, MapStruct, Lombok.
- Package by module (com.kazipay.<module>), not by layer. Modules talk via public API interfaces or domain events only.
- Controllers -> services -> repositories. DTOs at the edge; never expose JPA entities.
- BigDecimal for money. Validate with Jakarta Validation. Global @RestControllerAdvice with RFC 7807 problem+json.
- Every new table gets a Flyway migration. Never edit an applied migration.
- Every tenant table has tenant_id + Row-Level Security policy.
- Write tests with every feature. Do not leave TODOs without a ticket-style comment.
```

---

## 1. Vision & Goals

**Vision:** One professional platform where independent consultants and small agencies run the full client lifecycle — proposal → contract → project delivery → time & expenses → invoice → payment → reporting — with local payment methods (M-Pesa) as a first-class citizen.

**Goals**
- **Consultants:** less unpaid work, faster payment, professional image, automatic reminders.
- **Clients:** clear visibility of progress, easy approval, pay in two taps (M-Pesa / card).
- **Builder:** portfolio-grade Java/Spring Boot project that can also earn revenue via subscriptions + optional payment fees.

**Non-goals:** full ERP/accounting, payroll, inventory, e-commerce, native mobile apps (responsive web + PWA only).

---

## 2. Target Users & Roles

| Role | Description | Scope |
|------|-------------|-------|
| `PLATFORM_ADMIN` | KaziPay staff (super admin) | GLOBAL — all tenants, billing, health |
| `OWNER` | Workspace creator; billing & settings | Tenant |
| `ADMIN` | Manages team, clients, settings | Tenant |
| `MANAGER` | Approves time/expenses, manages projects | Tenant |
| `MEMBER` | Team member / contractor; logs time, works tasks | Tenant (assigned projects) |
| `CLIENT` | External customer using the portal | Only own client record's data |

Permissions are checked with a permission matrix (Section 9.3), not scattered `if role ==` checks.

---

## 3. Feature Modules

Legend: **[P1]** MVP · **[P2]** Enhanced · **[P3]** Advanced · 🆕 = added vs. original spec

### 3.1 Workspace & Tenancy [P1]
- Workspace signup creates tenant + OWNER user + FREE subscription in one transaction.
- Slug/subdomain (`acme.kazipay.app`), reserved-slug blocklist (`www`, `api`, `admin`, `app`, …).
- 🆕 **Onboarding wizard**: business details → logo/colors → tax settings → connect M-Pesa → add first client → create first invoice. Progress persisted.
- 🆕 Custom domain (CNAME) for portal [P3, Business plan].

### 3.2 Authentication & Authorization [P1]
- Email/password, JWT access (15 min) + refresh token rotation (7–30 days), httpOnly secure cookie for refresh.
- Email verification, password reset (single-use, 30-min tokens).
- 🆕 **Team invitations** (token link, role preset, expiry 7 days).
- 🆕 **Client magic-link login** (passwordless, 15-min single-use link) — clients should not need passwords.
- 🆕 Session/device list and "log out everywhere".
- 🆕 Account lockout/backoff after repeated failures.
- OAuth2 Google/GitHub [P2]. TOTP 2FA [P2].

### 3.3 Client Management [P1]
- CRUD, archive (soft delete), contacts (multiple contacts per client), billing details, KRA PIN / tax ID, default currency, default payment terms.
- 🆕 **Client users**: link portal users to a client record.
- 🆕 Client notes & activity timeline.
- 🆕 CSV import/export of clients.

### 3.4 Proposals, Quotes & Contracts [P2]
- Proposal builder (scope items, deliverables, timeline, pricing, terms) with **versions**.
- 🆕 **Quotes/Estimates** (lightweight priced offers that convert to invoices or projects).
- Public tokenized link (`/p/{token}`), tracks `VIEWED` with timestamp/IP.
- 🆕 **Contract e-signature with audit trail**: signer name, email, typed/drawn signature, IP, user-agent, timestamp, document SHA-256 hash, generated signed PDF + certificate page.
- 🆕 **Reusable templates** (proposal/contract clauses, scopes).
- 🆕 Proposal expiry date + auto-expire job.
- Accept → auto-create project (+ milestones from scope) and optional deposit invoice.

### 3.5 Project Management [P1]
- Projects: budget, deadline, status, progress, billing type.
- 🆕 **Billing types per project**: `FIXED_PRICE`, `TIME_AND_MATERIALS`, `RETAINER`, `MILESTONE`.
- Milestones with due dates; 🆕 **milestone-linked invoicing** (completing a milestone can auto-draft its invoice).
- 🆕 **Project members** with per-project billable rate override.
- 🆕 **Deliverable approval requests**: team posts deliverable → client Approves / Requests changes (recorded with timestamp & comment).
- 🆕 Project activity feed.
- 🆕 Project templates (clone project structure).
- Progress auto-computed from tasks/milestones (configurable).

### 3.6 Task Management [P1]
- Tasks with priority, due date, estimate, status (`TODO`, `IN_PROGRESS`, `REVIEW`, `DONE`), assignee.
- Kanban board + list view. Comments, attachments.
- 🆕 **Sub-tasks/checklists**, labels, task ordering (position).
- 🆕 **Visibility flag**: `INTERNAL` vs `CLIENT_VISIBLE`.

### 3.7 Time Tracking [P1]
- Manual entries + **running timer** (one active timer per user; enforced).
- Billable/non-billable, weekly timesheet, approve/reject with reason, lock after approval.
- 🆕 **Rates hierarchy**: per-entry override → project member rate → user default rate → tenant default.
- 🆕 Timesheet submission (user submits week → manager approves).
- 🆕 Prevent overlapping entries (configurable) and future-dated entries.
- 🆕 Entries marked `INVOICED` are immutable and linked to the invoice line.

### 3.8 Expense Tracking [P2]
- Categories (tenant-configurable), receipts, billable flag, approve, optional **markup %** on rebilling.
- 🆕 Expense currency + exchange rate at date of expense.
- 🆕 Mark `INVOICED`, immutable thereafter.

### 3.9 Invoicing [P1]
- Auto-generate from approved, un-invoiced time & expenses (select range/project); manual invoices.
- Per-tenant sequential numbering **without gaps** (format configurable: `INV-{YYYY}-{SEQ:4}`), concurrency-safe.
- Line items, per-line tax, discounts (% or fixed), notes, terms, PO number.
- Statuses: `DRAFT`, `SENT`, `VIEWED`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`, `VOID`, `CANCELLED`.
- 🆕 **Credit notes** (never delete/edit sent invoices; issue credit notes).
- 🆕 **Deposit / advance / retainer invoices** and **payment schedules** (e.g., 50/30/20).
- 🆕 **Late fees** (configurable flat/%), applied by scheduled job.
- 🆕 **Kenya tax support**: VAT (16% default, inclusive/exclusive), **Withholding Tax (WHT)** captured on payment (client withholds %, outstanding balance computed correctly), tax IDs on invoices.
- 🆕 **KRA eTIMS integration hook** [P3, optional, feature-flagged]: adapter interface so compliant e-invoicing can be plugged in; store `etims_receipt_no`, `qr_code_url`.
- 🆕 Multi-currency invoices (KES, USD, EUR, GBP, UGX, TZS …) with stored exchange rate snapshot.
- Recurring invoices (weekly/monthly/quarterly/yearly) via schedule table + scheduled job [P2].
- PDF generation (OpenPDF/Flying Saucer or similar) with tenant branding [P1].
- 🆕 "Pay now" public link per invoice (no login) with secure token.

### 3.10 Payments [P1 M-Pesa · P2 cards]
- **M-Pesa Daraja**: STK Push (P1), STK Query fallback (P1), C2B Paybill/Till reconciliation (P2).
- **Card**: Stripe **and** Paystack (and optionally Flutterwave) behind a common `PaymentGateway` interface. *(Note: Stripe merchant accounts are not available for businesses registered in every country incl. Kenya — verify eligibility; Paystack/Flutterwave are the safer default for Kenyan merchants. Keep the abstraction so gateways are swappable.)*
- Partial payments, overpayment handling (credit balance), refunds.
- 🆕 **Manual payment recording** (cash, bank transfer, cheque) by staff with reference + proof upload.
- 🆕 **Payment gateway config per tenant** (own Paybill/Till/Daraja keys, encrypted).
- 🆕 **Platform fee support** (optional % per transaction; ledger entries for fees).
- 🆕 **Reconciliation view**: unmatched C2B payments → assign to invoice.
- 🆕 **Payment ledger** (append-only) for auditability.
- 🆕 Payout/settlement tracking [P3] (if platform collects funds).
- Receipts emailed (PDF) on success.

### 3.11 Client Portal [P1 basic · P2 full]
- Branded (logo, color, tenant name). Magic-link login.
- Dashboard: active projects, outstanding invoices, pending approvals, recent files.
- View/download proposals, contracts, invoices, receipts; pay invoices; approve deliverables; sign contracts.
- 🆕 **Per-project message thread** (client ↔ team) with email notifications and reply-by-email [P3].
- 🆕 **Client statements** (all invoices/payments for a period).

### 3.12 Notifications & Reminders [P1 email · P2 SMS/in-app prefs]
- Email (SendGrid/Mailgun/SMTP), SMS (Africa's Talking/Twilio), in-app center, WebPush [P3].
- 🆕 **Reminder engine**: rules per tenant (e.g., 3 days before due, on due date, +1/+7/+14 days overdue) with templates, max-send limits, and per-invoice pause.
- 🆕 **Email delivery tracking** (sent/delivered/bounced/opened) via provider webhooks.
- 🆕 **Template editor** with variables (`{{client.name}}`, `{{invoice.number}}`, `{{pay_link}}`) and preview.
- Preferences per user per event type per channel.
- 🆕 Digest emails (daily/weekly summary for owners).

### 3.13 Files [P2]
- S3-compatible storage (MinIO local, R2/S3 prod), pre-signed uploads, size/type allowlist, virus scan (ClamAV) with quarantine status.
- Access control via project membership / client ownership; download URLs are short-lived pre-signed links.
- 🆕 File versions, folders/tags, per-file `CLIENT_VISIBLE` flag.
- 🆕 Tenant storage quota enforced by plan.

### 3.14 Reporting & Analytics [P2]
- Revenue (month/quarter/year), A/R aging (current, 1–30, 31–60, 61–90, 90+), unpaid invoices, project profitability, utilization, client lifetime value, payment-method breakdown.
- 🆕 **Cash-flow forecast** (expected receipts by due date).
- 🆕 **Tax summary** (VAT collected, WHT withheld) for a period.
- Export CSV/PDF. Cached via Redis; recomputed on events.

### 3.15 Subscription & SaaS Billing [P2]
| Plan | Price (KES/mo) | Limits |
|------|---------------|--------|
| Free | 0 | 1 client, 1 active project, basic invoicing, 1 user, 100 MB storage |
| Starter | 1,500 | 5 clients, unlimited projects, 2 users, 2 GB |
| Professional | 4,500 | Unlimited clients, 10 users, payments, reminders, recurring invoices, 20 GB |
| Business | 12,000 | White-label, custom domain, API access, webhooks, priority support, 100 GB |

- 14-day trial for paid plans (no card for M-Pesa-first flow).
- 🆕 **Subscription payment via M-Pesa** (Kenyan consultants rarely have cards): monthly STK Push renewal prompt + grace period, **in addition to** card billing.
- 🆕 **Entitlements service**: a single `EntitlementService.check(tenant, Feature)` used everywhere; returns limits & usage. Enforced in API layer with `402/403` + upgrade hint.
- 🆕 Dunning (failed renewal → retry → grace → downgrade to Free, **never delete data**).
- Annual plans with discount [P3].

### 3.16 Settings & Customization [P1]
- Workspace (name, logo, colors, timezone, currency, locale), tax settings, invoice numbering/template, email templates, gateway config, team management, roles.
- 🆕 **API keys** (hashed, scoped, last-used, revocable) [P3].
- 🆕 **Outbound webhooks** (HMAC-signed, retries with backoff, delivery log, replay) [P3].

### 3.17 🆕 Platform Admin Console [P2]
- Tenants list, plan/status, usage, suspend/reactivate, impersonate (with audit + banner), feature flags, system health, MRR dashboard, failed webhook/job inspector.

### 3.18 🆕 Cross-Cutting Capabilities
| Capability | Priority | Notes |
|-----------|----------|-------|
| **Audit log** | P1 | Who/what/when/before/after for sensitive actions (auth, invoices, payments, settings, role changes). Append-only. |
| **Global search** | P2 | Postgres full-text first; Elasticsearch only if needed [P3]. Searches clients, projects, tasks, invoices, files. |
| **Soft delete & archive** | P1 | `deleted_at` on user-facing entities. |
| **Data export / account deletion** | P2 | Kenya Data Protection Act & GDPR: export all tenant data (ZIP/JSON/CSV), delete on request after retention window. |
| **i18n** | P2 | English + Swahili UI; locale-aware dates/currency. |
| **Idempotency keys** | P1 | `Idempotency-Key` header on POSTs that create money/side-effects. |
| **Outbox pattern** | P1 | Events written in same DB transaction, published asynchronously. |
| **Feature flags** | P2 | Simple table-based flags per tenant/plan. |
| **Background jobs** | P1 | Scheduler + retry/dead-letter (JobRunr or Spring + RabbitMQ). |
| **Rate limiting** | P1 | Per IP/tenant/user; stricter on auth & payments. |
| **Health & readiness** | P1 | Actuator probes. |
| **Accessibility & mobile-first UI** | P1 | WCAG AA, PWA installable [P3]. |

---

## 4. Out of Scope (explicit)
ERP/GL accounting, payroll, inventory, e-commerce checkout, native apps, built-in video calls.

---

## 5. System Architecture

### 5.1 Decision: Modular Monolith First
A solo/small team building 8 microservices with Kafka + RabbitMQ + Elasticsearch on day one will drown in infrastructure. **Build one deployable Spring Boot application with strict module boundaries (Spring Modulith)**, one PostgreSQL database, Redis, and an object store. Extract modules into services *only* when there is a measured need (Phase 4+).

```
                         ┌───────────────────────────────┐
   React SPA (Vite) ───▶ │  NGINX / Ingress / Gateway    │
   Client Portal         └───────────────┬───────────────┘
                                         ▼
        ┌──────────────────────────────────────────────────────────┐
        │              KaziPay Backend (Spring Boot 3, Java 21)     │
        │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌───────┐ ┌─────────┐ │
        │  │identity│ │ tenant │ │ clients │ │projects│ │  time   │ │
        │  └────────┘ └────────┘ └─────────┘ └───────┘ └─────────┘ │
        │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌───────┐ ┌─────────┐ │
        │  │proposal│ │invoicing│ │payments │ │ files │ │notific. │ │
        │  └────────┘ └────────┘ └─────────┘ └───────┘ └─────────┘ │
        │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌───────┐ ┌─────────┐ │
        │  │reports │ │subscr. │ │ audit   │ │ admin │ │ webhooks│ │
        │  └────────┘ └────────┘ └─────────┘ └───────┘ └─────────┘ │
        │         Domain events (Spring ApplicationEvents + Outbox)  │
        └───────┬───────────┬──────────────┬────────────┬──────────┘
                ▼           ▼              ▼            ▼
          PostgreSQL      Redis        S3/MinIO     RabbitMQ (P2)
                                                   (email/SMS/jobs)
```

### 5.2 Module Boundaries (Spring Modulith)

| Module | Owns | Exposes (public API) | Listens to events |
|--------|------|---------------------|-------------------|
| `identity` | users, roles, tokens, invitations, sessions | `CurrentUser`, `AuthFacade` | — |
| `tenant` | tenants, settings, branding, domains | `TenantContext`, `TenantSettings` | `SubscriptionChanged` |
| `clients` | clients, contacts, client_users | `ClientQuery` | — |
| `proposals` | proposals, versions, contracts, signatures, templates | `ProposalFacade` | — |
| `projects` | projects, members, milestones, tasks, comments, approvals | `ProjectQuery`, `BillableWorkQuery` | `ProposalAccepted`, `InvoicePaid` |
| `time` | time entries, timers, timesheets | `BillableTimeQuery` | — |
| `expenses` | expenses, categories | `BillableExpenseQuery` | — |
| `invoicing` | invoices, items, credit notes, numbering, schedules, templates | `InvoiceFacade` | `PaymentCompleted`, `PaymentRefunded`, `MilestoneCompleted` |
| `payments` | payments, gateway configs, ledger, mpesa txns | `PaymentFacade` | `InvoiceSent` |
| `files` | files, versions, scan status | `FileFacade` | — |
| `notifications` | notifications, templates, prefs, reminder rules, delivery log | `NotificationFacade` | most domain events |
| `reports` | read models/materialized views | `ReportFacade` | domain events |
| `subscriptions` | plans, subscriptions, usage, entitlements | `EntitlementService` | — |
| `audit` | audit_logs | `AuditLogger` | all sensitive events |
| `webhooks` | endpoints, deliveries, api_keys | — | domain events |
| `admin` | platform admin APIs | — | — |

**Rule:** modules may only call each other via the listed facades/events. Enforce with `ApplicationModules.of(App.class).verify()` in a test.

### 5.3 Domain Events (outbox-backed)
`UserRegistered`, `TenantCreated`, `ClientCreated`, `ProposalSent`, `ProposalViewed`, `ProposalAccepted`, `ProposalRejected`, `ContractSigned`, `ProjectCreated`, `MilestoneCompleted`, `TaskAssigned`, `TaskCompleted`, `TimeEntrySubmitted`, `TimeEntryApproved`, `ExpenseApproved`, `InvoiceCreated`, `InvoiceSent`, `InvoiceViewed`, `InvoiceOverdue`, `PaymentInitiated`, `PaymentCompleted`, `PaymentFailed`, `PaymentRefunded`, `CreditNoteIssued`, `SubscriptionUpgraded`, `SubscriptionPastDue`, `FileUploaded`, `FileInfected`.

### 5.4 When to add Kafka / Elasticsearch (Phase 4, only if justified)
- Kafka: when multiple independent consumers need replayable event streams (analytics pipeline, extraction of services).
- Elasticsearch: when Postgres full-text search is measurably insufficient.

---

## 6. Technology Stack

**Backend:** Java 21, Spring Boot 3.3+, Spring Modulith, Spring Security 6 (JWT/OAuth2 resource server), Spring Data JPA/Hibernate 6, Flyway, MapStruct, Lombok, Springdoc OpenAPI, Jakarta Validation, Resilience4j (retry/circuit breaker for external APIs), Bucket4j (rate limiting), JobRunr or Spring `@Scheduled` + ShedLock (distributed scheduler lock), OpenPDF (PDF), Micrometer.

**Data:** PostgreSQL 16 (RLS), Redis 7 (cache, rate limits, sessions blacklist), S3-compatible object store (MinIO/R2/S3), RabbitMQ 3.12 [P2].

**Frontend:** React 18 + TypeScript 5 + Vite, Tailwind CSS, shadcn/ui or Radix, TanStack Query (server state), Zustand or Redux Toolkit (UI state), React Router, React Hook Form + Zod, Recharts, i18next, date-fns.

**Payments:** Safaricom Daraja (STK Push, STK Query, C2B), Stripe, Paystack, (optional) Flutterwave.
**Messaging:** SendGrid/Mailgun/SMTP (email), Africa's Talking (SMS; Twilio fallback).
**DevOps:** Docker, Docker Compose, GitHub Actions, Kubernetes (P3), Prometheus + Grafana, Loki or ELK, Sentry.
**Testing:** JUnit 5, Mockito, Testcontainers, Rest Assured, WireMock (Daraja/Stripe stubs), Vitest + RTL, Playwright, k6.

---

## 7. Repository Structure

```
kazipay/
├── backend/
│   ├── pom.xml
│   └── src/main/java/com/kazipay/
│       ├── KaziPayApplication.java
│       ├── common/            (errors, money, pagination, idempotency, outbox, security utils)
│       ├── identity/
│       ├── tenant/
│       ├── clients/
│       ├── proposals/
│       ├── projects/
│       ├── time/
│       ├── expenses/
│       ├── invoicing/
│       ├── payments/
│       │   ├── mpesa/
│       │   ├── stripe/
│       │   ├── paystack/
│       │   └── gateway/       (PaymentGateway interface)
│       ├── files/
│       ├── notifications/
│       ├── reports/
│       ├── subscriptions/
│       ├── audit/
│       ├── webhooks/
│       └── admin/
│   └── src/main/resources/
│       ├── application.yml, application-dev.yml, application-prod.yml
│       └── db/migration/V1__init.sql ...
├── frontend/                  (Vite React TS app: /app for staff, /portal for clients)
├── infra/
│   ├── docker-compose.yml
│   ├── k8s/
│   └── grafana/ prometheus/
├── docs/
│   ├── DECISIONS.md
│   └── API.md
├── .github/workflows/
├── .cursorrules
└── KAZIPAY_PROJECT_SPEC.md
```

Package layout inside each module: `api` (controllers, DTOs) · `domain` (entities, domain services) · `infra` (repositories, adapters) · `events`.

---

## 8. Database Schema

**Conventions:** UUID v7 (or `gen_random_uuid()`) primary keys · `tenant_id UUID NOT NULL` + index on every tenant table · `created_at`, `updated_at` (`TIMESTAMPTZ`) · `deleted_at` for soft delete · `version BIGINT` for optimistic locking on invoices, payments, time entries · money `NUMERIC(14,2)` · currency `CHAR(3)` · enums as `VARCHAR` with `CHECK`.

### 8.1 GLOBAL tables
```sql
tenants(
  id, name, slug UNIQUE, status ('ACTIVE','SUSPENDED','DELETED'),
  logo_url, primary_color, secondary_color, timezone DEFAULT 'Africa/Nairobi',
  default_currency CHAR(3) DEFAULT 'KES', locale DEFAULT 'en',
  business_email, business_phone, address, tax_id, -- KRA PIN
  invoice_prefix, invoice_number_format, next_invoice_seq BIGINT DEFAULT 1,
  default_payment_terms_days INT DEFAULT 14,
  created_at, updated_at, deleted_at)

tenant_domains(id, tenant_id, domain UNIQUE, verified BOOL, verified_at)

plans(id, code UNIQUE, name, price_minor, currency, interval, limits JSONB, features JSONB, active)

platform_admins(id, email UNIQUE, password_hash, totp_secret, created_at)

feature_flags(id, key, tenant_id NULL, plan_code NULL, enabled)
```

### 8.2 Identity
```sql
users(
  id, tenant_id, email, password_hash NULL, first_name, last_name, phone,
  role CHECK IN ('OWNER','ADMIN','MANAGER','MEMBER','CLIENT'),
  client_id NULL REFERENCES clients(id),   -- set when role = CLIENT
  default_hourly_rate NUMERIC(10,2), avatar_url,
  email_verified_at, is_active, last_login_at, totp_secret NULL, totp_enabled,
  failed_login_count, locked_until,
  created_at, updated_at, deleted_at,
  UNIQUE(tenant_id, email))                  -- NOT globally unique

refresh_tokens(id, user_id, token_hash, family_id, expires_at, revoked_at, replaced_by, user_agent, ip, created_at)
password_reset_tokens(id, user_id, token_hash, expires_at, used_at)
email_verification_tokens(id, user_id, token_hash, expires_at, used_at)
magic_link_tokens(id, tenant_id, user_id, token_hash, expires_at, used_at)
invitations(id, tenant_id, email, role, client_id NULL, token_hash, invited_by, expires_at, accepted_at)
```

### 8.3 Clients
```sql
clients(
  id, tenant_id, name, company, email, phone, billing_email, address, country,
  tax_id, default_currency, payment_terms_days, notes, status ('ACTIVE','ARCHIVED'),
  created_at, updated_at, deleted_at)

client_contacts(id, tenant_id, client_id, name, email, phone, role_title, is_primary)
```

### 8.4 Proposals & Contracts
```sql
proposals(
  id, tenant_id, client_id, number, title, summary, currency, total_amount,
  valid_until DATE, status ('DRAFT','SENT','VIEWED','ACCEPTED','REJECTED','EXPIRED'),
  public_token_hash, current_version INT, sent_at, viewed_at, accepted_at, rejected_at,
  rejection_reason, created_by, created_at, updated_at, deleted_at)

proposal_versions(id, tenant_id, proposal_id, version_no, content JSONB, total_amount, created_by, created_at)
-- content = { scope:[{title,description,deliverables[],price}], timeline_days, terms_html, payment_schedule:[...] }

contract_templates(id, tenant_id, name, body_html, variables JSONB)

contracts(
  id, tenant_id, client_id, proposal_id NULL, project_id NULL, title, body_html,
  status ('DRAFT','SENT','SIGNED','DECLINED','VOID'), document_hash,
  signed_pdf_file_id NULL, sent_at, signed_at)

contract_signatures(
  id, tenant_id, contract_id, signer_name, signer_email, signature_data, -- typed or base64 drawn
  ip_address, user_agent, signed_at, document_hash)
```

### 8.5 Projects, Tasks
```sql
projects(
  id, tenant_id, client_id, proposal_id NULL, name, description, code,
  billing_type ('FIXED_PRICE','TIME_AND_MATERIALS','RETAINER','MILESTONE'),
  budget_amount, budget_hours NULL, currency, hourly_rate NULL,
  start_date, deadline, status ('ACTIVE','ON_HOLD','COMPLETED','CANCELLED'),
  progress NUMERIC(5,2) DEFAULT 0, created_at, updated_at, deleted_at)

project_members(id, tenant_id, project_id, user_id, role, hourly_rate_override NULL, UNIQUE(project_id,user_id))

milestones(id, tenant_id, project_id, title, description, due_date, amount NULL,
  status ('PENDING','IN_PROGRESS','COMPLETED'), completed_at, position INT,
  invoice_id NULL, created_at)

tasks(
  id, tenant_id, project_id, milestone_id NULL, parent_task_id NULL, assigned_to NULL,
  title, description, priority ('LOW','MEDIUM','HIGH','URGENT'),
  status ('TODO','IN_PROGRESS','REVIEW','DONE'), estimated_hours, due_date, position INT,
  visibility ('INTERNAL','CLIENT_VISIBLE') DEFAULT 'INTERNAL',
  created_by, created_at, updated_at, deleted_at)

task_comments(id, tenant_id, task_id, author_id, body, created_at, edited_at)
task_labels(id, tenant_id, name, color) ; task_label_links(task_id, label_id)

deliverables(id, tenant_id, project_id, milestone_id NULL, title, description, file_id NULL,
  status ('SUBMITTED','APPROVED','CHANGES_REQUESTED'), submitted_by, submitted_at)
deliverable_reviews(id, tenant_id, deliverable_id, reviewer_user_id, decision, comment, decided_at)

project_messages(id, tenant_id, project_id, author_id, body, created_at)
activity_events(id, tenant_id, project_id NULL, actor_id, type, payload JSONB, created_at)
```

### 8.6 Time & Expenses
```sql
time_entries(
  id, tenant_id, project_id, task_id NULL, user_id, description,
  work_date DATE, start_time, end_time, duration_minutes INT NOT NULL,
  billable BOOL, hourly_rate NUMERIC(10,2),         -- rate snapshot at entry time
  status ('DRAFT','SUBMITTED','APPROVED','REJECTED','INVOICED'),
  approved_by, approved_at, rejection_reason, invoice_item_id NULL,
  version, created_at, updated_at)

active_timers(user_id PRIMARY KEY, tenant_id, project_id, task_id, started_at, description)

timesheets(id, tenant_id, user_id, week_start DATE, status, submitted_at, approved_by, approved_at, UNIQUE(user_id, week_start))

expense_categories(id, tenant_id, name, active)
expenses(
  id, tenant_id, project_id, user_id, category_id, description, expense_date DATE,
  amount, currency, exchange_rate NUMERIC(12,6) DEFAULT 1, billable BOOL, markup_percent,
  receipt_file_id NULL, status ('DRAFT','SUBMITTED','APPROVED','REJECTED','INVOICED'),
  approved_by, approved_at, invoice_item_id NULL, created_at, updated_at)
```

### 8.7 Invoicing
```sql
invoices(
  id, tenant_id, client_id, project_id NULL, invoice_number, po_number,
  status ('DRAFT','SENT','VIEWED','PARTIALLY_PAID','PAID','OVERDUE','VOID','CANCELLED'),
  currency, exchange_rate NUMERIC(12,6) DEFAULT 1,
  issue_date, due_date, subtotal, discount_type, discount_value, discount_amount,
  tax_amount, total_amount, amount_paid, wht_amount DEFAULT 0, balance_due,
  notes, terms, public_token_hash, sent_at, viewed_at, paid_at,
  etims_receipt_no NULL, etims_qr_url NULL,
  recurring_schedule_id NULL, version, created_by, created_at, updated_at, deleted_at,
  UNIQUE(tenant_id, invoice_number))

invoice_items(
  id, tenant_id, invoice_id, position, description, quantity NUMERIC(10,2), unit_price,
  tax_rate_id NULL, tax_percent, tax_amount, amount,
  source_type ('MANUAL','TIME','EXPENSE','MILESTONE'), source_id NULL)

tax_rates(id, tenant_id, name, percent NUMERIC(5,2), inclusive BOOL, is_default, active)

credit_notes(id, tenant_id, invoice_id, number, reason, amount, currency, issued_at, created_by)

payment_schedules(id, tenant_id, invoice_id, label, due_date, amount, paid_amount)

recurring_schedules(
  id, tenant_id, client_id, project_id NULL, template JSONB, frequency
  ('WEEKLY','MONTHLY','QUARTERLY','YEARLY'), next_run_date, end_date NULL,
  auto_send BOOL, status ('ACTIVE','PAUSED','ENDED'))

invoice_templates(id, tenant_id, name, config JSONB, is_default)
```

### 8.8 Payments
```sql
payment_gateway_configs(
  id, tenant_id, provider ('MPESA','STRIPE','PAYSTACK','FLUTTERWAVE'),
  mode ('SANDBOX','LIVE'), credentials_encrypted BYTEA, config JSONB, -- shortcode, till/paybill type, etc.
  active, verified_at)

payments(
  id, tenant_id, invoice_id, client_id, amount, currency,
  method ('MPESA','CARD','BANK_TRANSFER','CASH','CHEQUE'),
  provider ('MPESA','STRIPE','PAYSTACK','MANUAL'),
  status ('INITIATED','PENDING','COMPLETED','FAILED','CANCELLED','REFUNDED','PARTIALLY_REFUNDED'),
  provider_reference NULL,         -- M-Pesa receipt / Stripe charge id (null until known)
  checkout_request_id NULL UNIQUE, merchant_request_id NULL,
  idempotency_key UNIQUE, payer_phone, failure_reason, failure_code,
  fee_amount DEFAULT 0, paid_at, version, created_at, updated_at)

mpesa_callbacks_raw(id, tenant_id NULL, payload JSONB, received_at, source_ip, processed BOOL)
mpesa_c2b_transactions(id, tenant_id, trans_id UNIQUE, trans_time, amount, bill_ref_number, msisdn, matched_invoice_id NULL, status)

payment_refunds(id, tenant_id, payment_id, amount, reason, provider_reference, status, created_by, created_at)

ledger_entries(                       -- append-only, never updated/deleted
  id, tenant_id, invoice_id NULL, payment_id NULL, entry_type
  ('INVOICE_ISSUED','PAYMENT','REFUND','CREDIT_NOTE','FEE','WHT','ADJUSTMENT'),
  amount, currency, direction ('DEBIT','CREDIT'), created_at)

webhook_events_received(id, provider, event_id UNIQUE, payload JSONB, processed_at, status)  -- dedupe
```

### 8.9 Files, Notifications, Subscription
```sql
files(id, tenant_id, project_id NULL, owner_type, owner_id, uploaded_by, file_name, storage_key,
  size_bytes, mime_type, checksum_sha256, version_no, parent_file_id NULL,
  scan_status ('PENDING','CLEAN','INFECTED','FAILED'), client_visible BOOL, created_at, deleted_at)

notifications(id, tenant_id, user_id, type, title, body, link_url, is_read, read_at, created_at)
notification_preferences(id, tenant_id, user_id, event_type, email BOOL, sms BOOL, in_app BOOL DEFAULT TRUE)
notification_templates(id, tenant_id NULL, event_type, channel, subject, body, locale, is_custom)
notification_deliveries(id, tenant_id, channel, recipient, template_key, provider_message_id,
  status ('QUEUED','SENT','DELIVERED','BOUNCED','FAILED','OPENED'), error, created_at)
reminder_rules(id, tenant_id, offset_days INT, channel, template_key, enabled)  -- negative = before due
reminder_log(id, tenant_id, invoice_id, rule_id, sent_at)

subscriptions(id, tenant_id UNIQUE, plan_code, status ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED'),
  billing_provider ('MPESA','STRIPE'), provider_customer_id, provider_subscription_id,
  trial_ends_at, current_period_start, current_period_end, cancel_at_period_end, grace_ends_at)
subscription_invoices(id, tenant_id, subscription_id, amount, currency, status, paid_at, provider_reference)
usage_counters(tenant_id, metric ('CLIENTS','ACTIVE_PROJECTS','USERS','STORAGE_BYTES'), value, updated_at)
```

### 8.10 Platform
```sql
audit_logs(id, tenant_id, actor_id, actor_type, action, entity_type, entity_id,
  before JSONB, after JSONB, ip, user_agent, correlation_id, created_at)   -- append-only

outbox_events(id, tenant_id, aggregate_type, aggregate_id, event_type, payload JSONB,
  created_at, published_at NULL, attempts)

idempotency_keys(key, tenant_id, request_hash, response_status, response_body JSONB, created_at, expires_at)

api_keys(id, tenant_id, name, prefix, key_hash, scopes TEXT[], last_used_at, revoked_at, created_by)
webhook_endpoints(id, tenant_id, url, secret_encrypted, events TEXT[], active)
webhook_deliveries(id, tenant_id, endpoint_id, event_type, payload JSONB, status, attempts, next_retry_at, last_response_code)

email_suppression(tenant_id, email, reason, created_at)
```

### 8.11 Indexes (minimum)
```sql
CREATE INDEX ON users(tenant_id, email);
CREATE INDEX ON clients(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX ON projects(tenant_id, client_id);
CREATE INDEX ON tasks(project_id, status);
CREATE INDEX ON time_entries(tenant_id, project_id, status, work_date);
CREATE INDEX ON time_entries(user_id, work_date);
CREATE INDEX ON invoices(tenant_id, status, due_date);
CREATE INDEX ON invoices(tenant_id, client_id);
CREATE INDEX ON payments(invoice_id);
CREATE UNIQUE INDEX ON payments(checkout_request_id) WHERE checkout_request_id IS NOT NULL;
CREATE INDEX ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX ON audit_logs(tenant_id, entity_type, entity_id, created_at DESC);
CREATE INDEX ON outbox_events(published_at) WHERE published_at IS NULL;
-- Add GIN/tsvector indexes for search on clients, projects, tasks, invoices.
```

### 8.12 Invoice number generation (must be gap-free & race-safe)
Inside the same transaction as invoice creation: `SELECT next_invoice_seq FROM tenants WHERE id=? FOR UPDATE;` → format number → increment. Never use an in-memory counter. Drafts may use a temporary number and get the official number on `SEND` if the tenant prefers gap-free numbering (configurable).

---

## 9. Security & Authentication

### 9.1 JWT
```json
{ "sub":"user-uuid", "tid":"tenant-uuid", "email":"…", "role":"ADMIN",
  "perms_v":3, "iat":…, "exp":… }
```
- Access token 15 min (RS256 preferred; keys rotatable). Refresh token rotation with reuse detection (revoke the whole family on reuse).
- Tenant is taken **only from the verified token (or tenant-resolved subdomain for public portal routes)**, never from a client-supplied header on authenticated routes.

### 9.2 Hardening
- Password: ≥ 8 chars with upper/lower/digit; bcrypt/Argon2id; breached-password check optional.
- Rate limits: login 5/min/IP+email, payments 10/min/user, default 100/min/user; public token endpoints 30/min/IP.
- Security headers (CSP, `X-Content-Type-Options`, `X-Frame-Options: DENY`, HSTS, Referrer-Policy). *(Do not rely on the deprecated `X-XSS-Protection`.)*
- CORS allowlist per environment. CSRF protection for cookie-based refresh endpoint.
- Input validation everywhere; output encoding in emails/PDF; HTML in proposals/contracts sanitized (OWASP Java HTML Sanitizer).
- File uploads: MIME sniffing + extension allowlist, max size per plan, virus scan, randomized storage keys.
- PII & secrets redacted from logs. Encrypt gateway credentials with envelope encryption (KMS/Vault-managed key).
- Public tokens (proposal/invoice links): 256-bit random, stored hashed, expiring, revocable.

### 9.3 Permission Matrix (implement as `Permission` enum + `@PreAuthorize("@perm.has('INVOICE_SEND')")`)

| Action | OWNER | ADMIN | MANAGER | MEMBER | CLIENT |
|--------|:---:|:---:|:---:|:---:|:---:|
| Manage billing/subscription | ✅ | ❌ | ❌ | ❌ | ❌ |
| Manage team/roles/settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Manage gateway credentials | ✅ | ✅ | ❌ | ❌ | ❌ |
| CRUD clients | ✅ | ✅ | ✅ | read | ❌ |
| CRUD projects | ✅ | ✅ | ✅ | read assigned | read own |
| Manage tasks | ✅ | ✅ | ✅ | assigned/own | comment on visible |
| Log own time | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve time/expenses | ✅ | ✅ | ✅ | ❌ | ❌ |
| Create/send invoices | ✅ | ✅ | ✅ | ❌ | ❌ |
| Void invoice / credit note | ✅ | ✅ | ❌ | ❌ | ❌ |
| View/pay own invoices | ✅ | ✅ | ✅ | ❌ | ✅ |
| Record manual payment / refund | ✅ | ✅ | ❌ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | own utilization | ❌ |
| Sign contracts / approve deliverables | — | — | — | — | ✅ |

---

## 10. Multi-Tenancy

### Strategy: **Shared schema + `tenant_id` + PostgreSQL Row-Level Security (RLS)**
(*Schema-per-tenant was in the original draft; it complicates migrations, pooling, and reporting for thousands of small tenants. Shared schema + RLS gives strong isolation with far less operational cost.*)

Implementation:
1. `TenantContext` (ThreadLocal, cleared in a filter `finally`) set from the JWT `tid` or from the subdomain for public portal routes. Propagate into `@Async`/scheduled jobs explicitly (`TenantContext.runAs(tenantId, () -> …)`).
2. On each DB connection checkout set `SET LOCAL app.tenant_id = '<uuid>'` (Hibernate `StatementInspector` / connection-prepare hook, or a Spring `DataSource` wrapper inside the transaction).
3. RLS on every tenant table:
   ```sql
   ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
   ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
   CREATE POLICY tenant_isolation ON invoices
     USING (tenant_id = current_setting('app.tenant_id')::uuid)
     WITH CHECK (tenant_id = current_setting('app.tenant_id')::uuid);
   ```
   The app DB role must **not** be a superuser/table owner (or RLS is bypassed). Use a separate migration role.
4. Also add Hibernate `@TenantId` / `@Filter` as defence in depth.
5. Object storage keys: `{tenant_id}/…`. Cache keys: `t:{tenant_id}:…`. Queue messages & outbox events carry `tenant_id`.
6. **Mandatory test:** an integration test that creates two tenants and asserts tenant A can never read/update tenant B's rows across every repository (generate this test for every entity).

---

## 11. Payment Integration (Critical Section)

### 11.1 Common Gateway Abstraction
```java
public interface PaymentGateway {
  Provider provider();
  InitiationResult initiate(PaymentRequest req);         // STK push / checkout session
  PaymentStatusResult queryStatus(String providerRef);   // reconciliation fallback
  RefundResult refund(RefundRequest req);
}
```
All gateways are wrapped with Resilience4j (timeout, retry only on idempotent calls, circuit breaker).

### 11.2 Payment State Machine
`INITIATED → PENDING → COMPLETED | FAILED | CANCELLED` ; `COMPLETED → REFUNDED | PARTIALLY_REFUNDED`.
Transitions are validated in one place (`PaymentStateMachine`); invalid transitions throw. Applying a payment to an invoice happens **once** (guarded by unique `provider_reference`/`checkout_request_id` and optimistic locking).

### 11.3 M-Pesa (Daraja)

**Environments:** sandbox `https://sandbox.safaricom.co.ke`, production `https://api.safaricom.co.ke`. Configurable base URL.

**Auth:** `GET /oauth/v1/generate?grant_type=client_credentials` with Basic auth (key:secret). Cache token in Redis for ~55 minutes.

**STK Push** `POST /mpesa/stkpush/v1/processrequest`
- `Password = base64(BusinessShortCode + Passkey + Timestamp)`, `Timestamp = yyyyMMddHHmmss` (EAT).
- `TransactionType`: `CustomerPayBillOnline` (Paybill) or `CustomerBuyGoodsOnline` (Till).
- `PartyA`/`PhoneNumber`: normalized MSISDN `2547XXXXXXXX` (accept `07…`, `01…`, `+254…`, validate).
- `Amount`: integer KES (M-Pesa does not accept decimals; round per policy and block amounts < 1).
- `AccountReference`: invoice number (≤ 12 chars; truncate/short-code mapping), `TransactionDesc` ≤ 13 chars.
- `CallBackURL`: `https://<host>/api/public/webhooks/mpesa/{tenantId}/{secretPathToken}` (must be HTTPS & publicly reachable; use ngrok/cloudflared in dev).

**Flow**
1. `POST /api/invoices/{id}/payments/mpesa` (auth'd) or `POST /api/public/pay/{token}/mpesa` (portal) with `Idempotency-Key`.
2. Validate: invoice payable, amount ≤ balance, tenant gateway active, no other `PENDING` payment for same invoice+phone in the last 2 minutes.
3. Persist payment `INITIATED` → call Daraja → store `CheckoutRequestID`/`MerchantRequestID` → `PENDING`.
4. Respond immediately; frontend polls `GET /api/payments/{id}` (or SSE) until terminal.
5. Callback arrives → store raw payload in `mpesa_callbacks_raw` first, **always respond HTTP 200 `{"ResultCode":0,"ResultDesc":"Accepted"}`**, then process async.
6. Processing: look up payment by `CheckoutRequestID`; `ResultCode == 0` → read `CallbackMetadata` (`Amount`, `MpesaReceiptNumber`, `TransactionDate`, `PhoneNumber`), verify amount equals expected, mark `COMPLETED`, apply to invoice, write ledger, emit `PaymentCompleted`. Non-zero code → `FAILED`/`CANCELLED` with mapped reason (e.g., `1032` cancelled by user, `1` insufficient funds, `1037` timeout, `2001` wrong PIN).
7. **Timeout safety net:** scheduled job (every 1–2 min) finds `PENDING` payments older than 90 s and calls **STK Query** (`/mpesa/stkpushquery/v1/query`); resolves lost callbacks. Mark `FAILED` after 5 min if still unknown.

**Callback security** (Daraja callbacks are *not* signed — do not assume a signature):
- Secret random token in callback URL path (per tenant/payment).
- Optional IP allowlist of Safaricom source IPs (configurable, not hardcoded).
- Match on stored `CheckoutRequestID`; reject unknown.
- Verify amount & shortcode; confirm unknown/suspicious callbacks via STK Query before crediting.
- Dedupe on `MpesaReceiptNumber` (unique).

**C2B (Paybill reconciliation)** [P2]: register validation/confirmation URLs; customers pay with `AccountNumber = invoice number`; auto-match to invoice, otherwise land in "Unmatched payments" queue.

**B2C/Reversals** [P3]: refunds via Daraja Reversal API or manual; log everything.

### 11.4 Stripe [P2]
- Checkout Session (mode `payment`) with `metadata: {tenant_id, invoice_id, payment_id}`; `client_reference_id = payment_id`.
- Webhook `POST /api/public/webhooks/stripe` with **signature verification** (`Stripe-Signature`), dedupe by `event.id` in `webhook_events_received`. Handle `checkout.session.completed`, `checkout.session.expired`, `payment_intent.payment_failed`, `charge.refunded`, plus subscription events (`invoice.paid`, `invoice.payment_failed`, `customer.subscription.updated|deleted`).
- Do **not** trust redirect `success_url` as proof of payment — only the webhook.
- Use Stripe Connect only if/when platform collects on behalf of tenants (P3).

### 11.5 Paystack [P2]
- Initialize transaction → redirect → verify via webhook (`x-paystack-signature` HMAC-SHA512) **and** `GET /transaction/verify/:reference` on return. Supports KES, M-Pesa channel & cards in supported countries.

### 11.6 Invoice Settlement Logic
```
balance_due = total_amount - amount_paid - wht_amount - credit_notes
status:  balance_due == 0 → PAID (paid_at=now)
         0 < paid < total → PARTIALLY_PAID
         due_date < today and balance_due > 0 → OVERDUE (nightly job)
```
- Overpayment → recorded as client credit balance (`ledger_entries` ADJUSTMENT) and surfaced in UI.
- Refund reduces `amount_paid`, re-opens invoice status.
- All updates inside one transaction with `SELECT … FOR UPDATE` on invoice (or optimistic lock + retry).

### 11.7 Platform Fees (optional)
`fee = round(amount * tenant.fee_percent, 2)` recorded as `FEE` ledger entry; never mutate the invoice amount.

### 11.8 Money Rules
`Money` value object (amount + currency, `BigDecimal`, scale 2, `RoundingMode.HALF_EVEN` for tax, documented); no arithmetic across currencies; formatting via locale.

---

## 12. API Design

**Conventions:** base `/api/v1`; JSON; RFC 7807 errors; cursor or `page,size,sort` pagination; `Idempotency-Key` header on POSTs creating invoices/payments; `ETag/If-Match` on invoice/payment updates; OpenAPI at `/swagger-ui`. Public (token-based) endpoints live under `/api/v1/public/**`.

### Auth & Identity
```
POST /auth/register-workspace      POST /auth/login          POST /auth/refresh
POST /auth/logout                  POST /auth/verify-email   POST /auth/forgot-password
POST /auth/reset-password          POST /auth/magic-link     POST /auth/magic-link/consume
POST /auth/2fa/setup | /verify | /disable
GET/PUT /me                        GET /me/sessions          DELETE /me/sessions/{id}
POST /invitations                  POST /invitations/{token}/accept
GET/PUT/DELETE /users[/{id}]       PATCH /users/{id}/role
```

### Tenant & Settings
```
GET/PUT /tenant                POST /tenant/logo
GET/PUT /tenant/tax-rates[/{id}]
GET/PUT /tenant/invoice-settings
GET/PUT /tenant/email-templates[/{key}]     POST /tenant/email-templates/{key}/preview
GET/PUT /tenant/reminder-rules
GET/POST/DELETE /tenant/api-keys
GET/POST/PUT/DELETE /tenant/webhooks[/{id}]   POST /tenant/webhooks/{id}/test
GET/PUT /tenant/gateways/{provider}    POST /tenant/gateways/{provider}/verify
```

### Clients
```
GET/POST /clients          GET/PUT/DELETE /clients/{id}     POST /clients/{id}/archive
GET/POST /clients/{id}/contacts[/…]     POST /clients/{id}/portal-invite
GET /clients/{id}/statement?from=&to=   POST /clients/import   GET /clients/export
```

### Proposals / Contracts
```
GET/POST /proposals     GET/PUT/DELETE /proposals/{id}
GET /proposals/{id}/versions    POST /proposals/{id}/send    POST /proposals/{id}/duplicate
GET /public/proposals/{token}   POST /public/proposals/{token}/accept | /reject
GET/POST/PUT /contract-templates[/{id}]
GET/POST /contracts   GET /contracts/{id}   POST /contracts/{id}/send
GET /public/contracts/{token}   POST /public/contracts/{token}/sign
GET /contracts/{id}/signed-pdf
```

### Projects / Tasks / Time / Expenses
```
GET/POST /projects  GET/PUT/DELETE /projects/{id}  GET /projects/{id}/progress  GET /projects/{id}/activity
GET/POST/DELETE /projects/{id}/members[/{userId}]
GET/POST /projects/{id}/milestones   PUT/DELETE /milestones/{id}   POST /milestones/{id}/complete
GET/POST /projects/{id}/tasks   GET/PUT/DELETE /tasks/{id}   PATCH /tasks/{id}/status   PATCH /tasks/{id}/position
GET/POST /tasks/{id}/comments
GET/POST /projects/{id}/deliverables   POST /deliverables/{id}/review
GET/POST /projects/{id}/messages

GET/POST /time-entries   GET/PUT/DELETE /time-entries/{id}
POST /time-entries/{id}/submit | /approve | /reject
POST /timer/start   POST /timer/stop   GET /timer/active
GET /timesheets?week=   POST /timesheets/{week}/submit | /approve

GET/POST /expenses  GET/PUT/DELETE /expenses/{id}  POST /expenses/{id}/approve | /reject
GET/POST/PUT /expense-categories[/{id}]
```

### Invoices
```
GET/POST /invoices        GET/PUT/DELETE /invoices/{id}  (DELETE only drafts)
POST /invoices/generate   (body: projectId, from, to, include time/expenses, grouping)
POST /invoices/{id}/send  POST /invoices/{id}/remind  POST /invoices/{id}/void  POST /invoices/{id}/duplicate
POST /invoices/{id}/credit-notes     GET /invoices/{id}/pdf    GET /invoices/{id}/payments
POST /invoices/{id}/payments/manual
GET/POST/PUT/DELETE /recurring-invoices[/{id}]   POST /recurring-invoices/{id}/pause | /resume
GET /public/invoices/{token}   GET /public/invoices/{token}/pdf
```

### Payments
```
POST /invoices/{id}/payments/mpesa          POST /invoices/{id}/payments/card (stripe|paystack)
POST /public/pay/{token}/mpesa              POST /public/pay/{token}/card
GET  /payments   GET /payments/{id}   POST /payments/{id}/refund   POST /payments/{id}/reconcile
GET  /payments/unmatched   POST /payments/unmatched/{id}/assign
POST /public/webhooks/mpesa/{tenantId}/{secret}      (STK callback)
POST /public/webhooks/mpesa/c2b/validation | /confirmation
POST /public/webhooks/stripe    POST /public/webhooks/paystack
```

### Files, Notifications, Reports, Subscription, Admin
```
POST /files/presign   POST /files/{id}/complete   GET /files/{id}/download-url   DELETE /files/{id}
GET/PUT /notifications/preferences   GET /notifications   PATCH /notifications/{id}/read   PATCH /notifications/read-all
GET /reports/revenue | /ar-aging | /unpaid-invoices | /project-profitability | /utilization
GET /reports/client-lifetime-value | /payment-methods | /cash-flow | /tax-summary    (all support ?format=csv|pdf)
GET /search?q=
GET /subscription  GET /subscription/plans  POST /subscription/checkout  POST /subscription/cancel  GET /subscription/usage
GET /audit-logs
GET /admin/tenants  PATCH /admin/tenants/{id}/status  POST /admin/tenants/{id}/impersonate  GET /admin/metrics   (PLATFORM_ADMIN only)
GET /actuator/health
```

---

## 13. Key Workflows

### 13.1 Proposal → Project
`Send → Client views (token) → Accept` ⇒ in one transaction: mark ACCEPTED, create project (+ milestones from scope, billing type from proposal), optionally create deposit invoice, emit `ProposalAccepted` + `ProjectCreated`, notify consultant, audit log. Duplicate "accept" clicks are idempotent.

### 13.2 Time → Invoice
`Log → Submit → Manager approves (locks entry) → Generate invoice (select un-invoiced approved entries/expenses) → entries marked INVOICED & linked to invoice_items → Send`. Voiding a draft/invoice releases linked entries back to `APPROVED`.

### 13.3 Invoice Lifecycle
`DRAFT → SENT → (VIEWED) → PARTIALLY_PAID → PAID` ; `OVERDUE` set by nightly job; `VOID` for cancelled-after-sent (with ledger reversal); sent invoices are immutable (corrections via credit note).

### 13.4 Reminder Engine
Nightly (and hourly) job: for each tenant (in tenant context, with ShedLock) evaluate `reminder_rules` against invoices not PAID/VOID; skip if already in `reminder_log`; honor quiet hours (no SMS 21:00–07:00 tenant TZ); emit notification commands.

### 13.5 Subscription (M-Pesa-first)
Trial → day 12 reminder → renewal STK push prompt on `current_period_end` → success extends period; fail → `PAST_DUE` + 7-day grace (daily retries/reminders) → downgrade to Free (read-only on over-limit resources; no data loss).

### 13.6 Client Portal Auth
Consultant invites client → client gets magic link → session scoped to `client_id` → all queries automatically filtered by `client_id` for role `CLIENT`.

---

## 14. Notifications Catalog

| Event | Email | SMS | In-app | Recipient |
|-------|:---:|:---:|:---:|-----------|
| Team invitation | ✅ | | | invitee |
| Proposal sent / viewed / accepted / rejected | ✅ | | ✅ | client / consultant |
| Contract signed (with PDF) | ✅ | | ✅ | both |
| Task assigned / due soon | ✅ | | ✅ | assignee |
| Deliverable awaiting approval | ✅ | | ✅ | client |
| Time/expense awaiting approval | ✅ | | ✅ | managers |
| Invoice sent / viewed | ✅ | | ✅ | client / consultant |
| Payment reminder (-3d, 0d, +1d, +7d, +14d) | ✅ | ✅ | | client |
| Payment received (receipt PDF) | ✅ | ✅ | ✅ | client + consultant |
| Payment failed | ✅ | | ✅ | client / consultant |
| Subscription trial ending / renewal / past due | ✅ | ✅ | ✅ | owner |
| Milestone completed | ✅ | | ✅ | client |

All templates support `en` and `sw`. Delivery tracked in `notification_deliveries`; respect suppression list and user preferences (transactional receipts cannot be disabled).

---

## 15. Frontend Requirements

**Apps in one codebase:** `/app` (staff) and `/portal` (client, tenant-branded; theme from tenant settings via CSS variables).

**Pages — Staff:** onboarding wizard · dashboard (revenue, A/R, overdue, hours this week, pending approvals) · clients (list/detail/timeline) · proposals (builder with live preview, versions) · contracts · projects (overview, board, list, milestones, files, time, expenses, messages, activity) · timesheet (weekly grid + timer widget in top bar) · expenses · invoices (list, editor, generate-from-work wizard, PDF preview, payments tab) · recurring invoices · payments & reconciliation · reports · notifications center · settings (workspace, branding, tax, invoice, templates, gateways, team, API keys, webhooks) · subscription & usage · audit log.

**Pages — Portal:** magic-link login · dashboard · projects (progress, milestones, deliverables w/ approve/request changes, messages, files) · proposals & contracts (view/sign) · invoices (list/detail/PDF/pay with M-Pesa phone prompt + status polling, card) · statements · profile.

**UX rules:** mobile-first responsive; skeleton loaders; optimistic updates for tasks/timer; global error boundary; form validation with Zod mirroring backend rules; accessible components; empty states with guidance; dark mode [P3]; M-Pesa pay dialog shows steps ("Check your phone → enter PIN"), a 60-s countdown, and retry/cancel; currency & date formatting by tenant locale.

---

## 16. Observability, Logging, Ops

- **Logging:** structured JSON, `correlationId` + `tenantId` + `userId` in MDC, secrets/PII redaction.
- **Metrics (Micrometer → Prometheus):** HTTP latency (p50/p95/p99), error rates, DB pool, cache hit rate, queue depth, job failures, payment success/failure rate **by provider**, STK timeouts, callback lag, webhook retry counts, active tenants, MRR.
- **Tracing:** OpenTelemetry optional.
- **Alerts:** 5xx > 1% (5 min); payment failure > 10% (10 min); callbacks not received while payments pending; DB pool exhaustion; disk > 80%; job backlog; webhook delivery failures.
- **Backups:** daily PostgreSQL backups + PITR, tested restore monthly; object storage versioning.
- **Error tracking:** Sentry (backend + frontend).

---

## 17. Deployment

**Local (`infra/docker-compose.yml`):** postgres:16, redis:7, minio (+ bucket init), mailhog (dev email), rabbitmq (P2), clamav (P2), prometheus, grafana, backend, frontend. Provide `make dev`, seed script with demo tenant/users/data, and `ngrok`/`cloudflared` instructions for Daraja callbacks.

**Production:** Docker multi-stage images (non-root, distroless/temurin-jre); Kubernetes (or a single VPS with Docker Compose + Caddy for the first launch) with HPA, Ingress + cert-manager TLS, ConfigMaps/Secrets (External Secrets/Vault); managed PostgreSQL/Redis; blue-green or rolling deploys with Flyway migrations run as a pre-deploy job (backward-compatible migrations only).

**CI/CD (GitHub Actions):** lint → unit tests → integration tests (Testcontainers) → `modulith verify` → dependency & image scan (Trivy, OWASP Dependency-Check) → build → push → deploy staging → smoke tests → manual promote to prod.

**Environment variables (illustrative):**
```env
SPRING_PROFILES_ACTIVE=prod
DATABASE_URL= DATABASE_USER= DATABASE_PASSWORD=
REDIS_URL=
JWT_PRIVATE_KEY= JWT_PUBLIC_KEY= JWT_ACCESS_TTL=900 JWT_REFRESH_TTL=2592000
ENCRYPTION_MASTER_KEY=            # for gateway credentials (or KMS key id)
APP_BASE_URL=https://kazipay.app  PORTAL_BASE_DOMAIN=kazipay.app
MPESA_ENV=sandbox|production   MPESA_CALLBACK_BASE_URL=
STRIPE_SECRET_KEY= STRIPE_WEBHOOK_SECRET=
PAYSTACK_SECRET_KEY=
SENDGRID_API_KEY=  MAIL_FROM=no-reply@kazipay.app
AFRICASTALKING_USERNAME= AFRICASTALKING_API_KEY= AFRICASTALKING_SENDER_ID=
S3_ENDPOINT= S3_BUCKET= S3_ACCESS_KEY= S3_SECRET_KEY= S3_REGION=
CLAMAV_HOST=
SENTRY_DSN=
```

---

## 18. Testing Strategy

| Level | What | Tooling |
|-------|------|---------|
| Unit | Services, mappers, validators, `Money`, tax/WHT math, state machines, invoice numbering | JUnit 5, Mockito |
| Module | Spring Modulith `@ApplicationModuleTest`, boundary verification | Spring Modulith |
| Integration | Repositories + RLS, REST endpoints, Flyway migrations, outbox | Testcontainers (Postgres, Redis, MinIO, RabbitMQ) |
| **Tenant isolation** | Two-tenant cross-access tests for every entity & endpoint | Rest Assured |
| Payments | Daraja/Stripe/Paystack stubs: success, cancel, timeout, duplicate callback, amount mismatch, lost callback → STK Query recovery, concurrent callbacks | WireMock |
| Concurrency | Invoice number race (50 parallel), double payment application, double accept | JUnit + executor |
| Security | AuthZ matrix, JWT expiry/tampering, refresh reuse, rate limits, file-upload abuse, OWASP ZAP baseline | Rest Assured, ZAP |
| Frontend | Components, forms, hooks | Vitest + RTL |
| E2E | Signup → onboarding → client → project → time → invoice → M-Pesa (mocked) pay → receipt; client magic-link flow | Playwright |
| Performance | 100 concurrent users, p95 < 500 ms; payment endpoints under load | k6 |

Coverage: ≥ 80% service layer; payment & invoicing modules ≥ 90%.

---

## 19. BUILD ORDER FOR CURSOR (follow strictly)

> After **each** step: compile, run tests, commit. Do not proceed with failing tests.

### Phase 0 — Foundation (Step 1–3)
1. **Scaffold**: Maven multi-package Spring Boot 3 project, Spring Modulith, Flyway baseline, Docker Compose (Postgres, Redis, MinIO, MailHog), `.cursorrules`, global error handling (RFC 7807), `Money`, pagination, correlation-ID filter, health endpoints, OpenAPI. Vite React TS app with Tailwind, router, auth shell, API client (axios/fetch + TanStack Query).
2. **Tenancy core**: `tenants`, `TenantContext`, RLS migration pattern, connection-level `app.tenant_id`, base entity with `tenant_id`, **tenant isolation test harness**.
3. **Audit & outbox**: `audit_logs`, `outbox_events` + publisher job, `idempotency_keys` + filter.

### Phase 1 — MVP
4. **Identity**: workspace registration, login, refresh rotation, email verify, reset, invitations, roles/permissions, rate limits, lockout. Frontend auth + team page.
5. **Tenant settings & onboarding wizard**, branding, tax rates.
6. **Clients** (+ contacts, archive, import/export).
7. **Projects, members, milestones**.
8. **Tasks** (board, comments, subtasks, visibility).
9. **Time tracking** (manual, timer, timesheet, approvals, rate hierarchy).
10. **Invoicing** (numbering, items, taxes incl. VAT/WHT, generate-from-time, PDF, send by email, public pay link, statuses, overdue job, credit notes).
11. **M-Pesa STK Push** (OAuth cache, push, callback, polling, STK Query reconciliation job, manual payment recording, ledger, receipts). *Heaviest testing here.*
12. **Client portal v1** (magic link, projects, invoices, pay).
13. **Email notifications** (templates, preferences, delivery log, reminder engine v1).
14. **Staff dashboard v1** + CI pipeline.
✅ **MVP exit criteria:** a consultant can sign up, add a client, run a project, log & approve time, issue an invoice, the client pays via M-Pesa, both receive receipts, and the invoice flips to PAID — with tenant isolation tests green.

### Phase 2 — Enhanced
15. Proposals (versions, public link, accept → project), quotes, templates.
16. Contracts + e-signature with audit trail + signed PDF.
17. Expenses (+ receipts via Files).
18. Files module (presign, ClamAV scan via RabbitMQ, quotas, versions).
19. Stripe + Paystack gateways, refunds, webhooks dedupe.
20. Recurring invoices, payment schedules, late fees, deposit invoices, milestone invoicing.
21. C2B reconciliation + unmatched payments UI.
22. Subscriptions & entitlements (plans, trial, M-Pesa + card renewal, dunning, usage counters).
23. Reports (revenue, A/R aging, profitability, utilization, CLV, tax summary, cash flow) + Redis cache + CSV/PDF export.
24. SMS (Africa's Talking), in-app notification center, notification preferences, deliverable approvals, project messages.
25. Platform admin console, feature flags, data export/account deletion, i18n (en/sw), global search (Postgres FTS).

### Phase 3 — Advanced
26. Public API (API keys, scopes) + outbound webhooks.
27. White-label + custom domains.
28. KRA eTIMS adapter (feature-flagged), multi-currency FX handling.
29. Observability stack (Prometheus/Grafana/Loki), Sentry, alerts.
30. Kubernetes manifests/Helm, ArgoCD, load tests, security hardening pass, backup/restore drills.
31. Optional: Kafka/Elasticsearch, WebPush, PWA, dark mode, annual plans, reply-by-email, payouts/settlement.

### Phase 4 — Launch
Beta with 10–20 consultants, feedback loop, pricing validation, support tooling, status page, legal pages (Terms, Privacy — Kenya DPA compliant, register as data controller/processor with the ODPC), marketing site.

---

## 20. Acceptance Criteria (Definition of Done per Feature)

- [ ] Migration + entity + repository + service + controller + DTO + validation
- [ ] RLS policy + tenant-isolation test
- [ ] Permission checks per Section 9.3 + authorization tests
- [ ] Audit log entries for state-changing sensitive actions
- [ ] OpenAPI docs accurate
- [ ] Unit + integration tests passing; coverage threshold met
- [ ] Frontend screen with loading, empty, error, and success states; responsive; accessible
- [ ] Idempotency & concurrency considered for any money/number-generating operation
- [ ] No secrets or PII in logs
- [ ] `docs/DECISIONS.md` updated

---

## 21. Success Metrics

**Technical:** p95 API < 500 ms · uptime > 99.5% · error rate < 1% · coverage > 80% · weekly (or better) deploys · M-Pesa callback processing p95 < 3 s · zero cross-tenant data leaks.

**Business:** 100+ active tenants in 6 months · MRR KES 500,000+ in 12 months · payment success rate > 95% · monthly churn < 5% · NPS > 50 · average days-to-pay reduced ≥ 30% vs. tenants' baseline · activation (first invoice sent within 7 days of signup) > 60%.

---

## 22. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Lost/duplicate M-Pesa callbacks | Raw callback store, STK Query job, unique receipt numbers, idempotent processing |
| Cross-tenant leakage | RLS + `@TenantId` + mandatory isolation tests + non-owner DB role |
| Stripe not available for Kenyan merchants | Gateway abstraction; Paystack/Flutterwave as defaults; verify eligibility before launch |
| Over-engineering infra | Modular monolith; Kafka/ES deferred until justified |
| Regulatory (KRA eTIMS, Data Protection Act, WHT/VAT) | Tax model with VAT/WHT now; eTIMS adapter; export/delete tooling; legal review before launch |
| Gateway credential theft | Envelope encryption, least-privilege, no logging, rotation support |
| Email deliverability | SPF/DKIM/DMARC per sending domain, suppression list, bounce handling |

---

## 23. License & Contact
MIT License. Contact via GitHub issues.

*End of specification — begin with Section 19, Step 1.*
