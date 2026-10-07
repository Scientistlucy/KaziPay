

# KaziPay — Testing, Commits & GitHub Actions Guide

**File Path:** `docs/TESTING_AND_CI.md`

**Related Specs:** `docs/KAZIPAY_BACKEND_SPEC.md` (Section 14), `docs/ERROR_LOG.md`

**Commit Timeline Rule:** All repository commits and development steps for this repository must be chronologically tracked and demonstrated between **1 September and 28 September**.

---

## 1. Commit Rules & Honest History

* **Timeline Execution:** Commit history must reflect active development between **1 September and 28 September**.
* **Commit Frequency:** Commit after every working step or sub-feature using real dates within the specified window.
* **Git Restrictions:** Never set `GIT_AUTHOR_DATE`, `GIT_COMMITTER_DATE`, or use `--date`. Never rewrite history on `main`.
* **Atomic Commits:** One logical change per commit. Tests must go in the same commit as the code they test (or immediately following).
* **Conventional Commits Format:**
* `feat:` — New features (e.g., `feat(invoicing): add InvoiceCalculator with VAT and discounts`)
* `fix:` — Bug fixes (e.g., `fix(payments): ignore duplicate M-Pesa callbacks (see ERROR_LOG #004)`)
* `test:` — Tests only (e.g., `test(tenancy): add TenantIsolationIT for clients`)
* `docs:` — Documentation updates (e.g., `docs: add ERROR_LOG and TESTING_AND_CI`)
* `refactor:` — Code changes without behavior changes (e.g., `refactor(identity): extract JwtService`)
* `chore:` / `ci:` — Tooling and pipeline updates (e.g., `ci: add GitHub Actions workflow`)


* **Branching Strategy:** Work on a dedicated branch per step (e.g., `step-02-tenancy-core`), open a pull request into `main`, wait for CI to pass, then merge.
* **Pre-commit Check:** Run `mvn verify` before each commit. Never commit failing tests or secrets (`.env`, keys, passwords).

### Rule to add to `.cursorrules`

```text
Commit rules:
- Do not run git commit/push yourself unless I ask. When a step is done, suggest a Conventional Commit message.
- Ensure commit timelines align with the 1 Sep to 28 Sep window.
- Never use --date, GIT_AUTHOR_DATE, GIT_COMMITTER_DATE, rebase -i on pushed commits, or force-push.
- Never commit secrets or .env files.
Testing rules:
- Every feature ships with tests as described in docs/TESTING_AND_CI.md.
- Run `mvn verify` and fix failures before saying a step is complete.

```

---

## 2. Test Types, Names, and Directory Structure

All tests are located under `backend/src/test/java/com/kazipay/<module>/…` mirroring the main source code layout.

| Test Type | Name Suffix | Executed By | Speed | Needs Docker? | Purpose |
| --- | --- | --- | --- | --- | --- |
| **Unit** | `*Test` | Maven Surefire (`mvn test`) | Milliseconds | No | Pure logic, no Spring, no database |
| **Slice** | `*WebTest`, `*JpaTest` | Maven Surefire | Seconds | `*JpaTest`: Yes | One layer: controller (`@WebMvcTest`) or repository (`@DataJpaTest`) |
| **Integration** | `*IT` | Maven Failsafe (`mvn verify`) | Seconds | Yes (Testcontainers) | Full app + real PostgreSQL |
| **Architecture** | `*ArchitectureTest`, `*ModularityTest` | Maven Surefire | Seconds | No | Module boundaries and layering rules |
| **Contract/API** | `*ApiIT` | Maven Failsafe | Seconds | Yes | HTTP behavior verification with Rest Assured |

### 2.1 Folder Layout

```text
backend/src/test/java/com/kazipay/
├── support/
│   ├── AbstractIntegrationTest.java      # Testcontainers + Spring Boot, shared by all *IT
│   ├── TestData.java                     # builders: tenant, user, client, invoice…
│   ├── WithTenant.java                   # helper/annotation to set TenantContext in tests
│   └── MockDarajaServer.java             # WireMock stubs for M-Pesa
├── ModularityTest.java                   # ApplicationModules.verify()
├── ArchitectureTest.java                 # ArchUnit layering rules
├── common/
│   ├── money/MoneyTest.java
│   └── api/GlobalExceptionHandlerWebTest.java
├── tenant/
│   ├── TenantContextTest.java
│   ├── SchemaIntegrityTest.java          # RLS enabled on every tenant table (integration)
│   └── TenantIsolationIT.java
├── identity/
│   ├── PasswordPolicyTest.java
│   ├── PermissionMatrixTest.java
│   ├── JwtServiceTest.java
│   ├── AuthServiceTest.java
│   ├── AuthFlowIT.java                   # register → login → refresh rotation → reuse detection
│   └── AuthorizationIT.java              # role matrix per endpoint
├── clients/
│   ├── ClientServiceTest.java
│   └── ClientApiIT.java
├── projects/
│   ├── ProgressCalculatorTest.java
│   ├── ProjectServiceTest.java
│   └── ProjectApiIT.java
├── time/
│   ├── RateResolverTest.java
│   ├── TimeEntryServiceTest.java
│   ├── TimerApiIT.java
│   └── TimeApprovalIT.java
├── invoicing/
│   ├── InvoiceCalculatorTest.java        # rounding, VAT incl/excl, discount allocation, WHT
│   ├── InvoiceNumberServiceTest.java
│   ├── InvoiceNumberingConcurrencyIT.java# 50 parallel sends → 50 consecutive numbers
│   ├── InvoiceGenerationIT.java          # approved time → draft invoice, no double-billing
│   └── InvoiceApiIT.java
└── payments/
    ├── PaymentStatusTest.java            # state machine transitions
    ├── PhoneNumbersTest.java             # 07xx / 01xx / +2547xx → 2547XXXXXXXX
    ├── MpesaResultCodeMapperTest.java
    ├── InvoiceSettlementServiceTest.java
    ├── MpesaInitiationIT.java            # WireMock Daraja: STK push request/response
    ├── MpesaCallbackIT.java              # success, cancel, duplicate, unknown id, amount mismatch
    ├── MpesaReconciliationIT.java        # lost callback → STK Query recovery
    └── PaymentConcurrencyIT.java         # two concurrent callbacks, double apply

```

### 2.2 Naming Convention for Test Methods

Follow the pattern: `should_<expectedResult>_when_<condition>` to ensure test names read as clear English sentences.

```java
@Test void should_round_half_up_when_line_total_has_three_decimals() { … }
@Test void should_reject_callback_when_amount_does_not_match_payment() { … }
@Test void should_return_404_when_client_belongs_to_another_tenant() { … }

```

* Use `@DisplayName("…")` for human-friendly reports.
* Structure tests using **Arrange – Act – Assert**.
* Strictly avoid `Thread.sleep` (use Awaitility instead). Tests must be independent and executable in any order.

### 2.3 Base Class for Integration Tests

```java
@SpringBootTest(webEnvironment = RANDOM_PORT)
@ActiveProfiles("test")
public abstract class AbstractIntegrationTest {

  static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:16")
      .withInitScript("db/test-roles.sql");          // creates kazipay_owner + kazipay_app
  static { POSTGRES.start(); }                       // singleton: shared across all IT classes

  @DynamicPropertySource
  static void props(DynamicPropertyRegistry r) {
    r.add("spring.datasource.url", POSTGRES::getJdbcUrl);   // app role
    r.add("spring.datasource.username", () -> "kazipay_app");
    r.add("spring.datasource.password", () -> "app_pw");
    r.add("spring.flyway.url", POSTGRES::getJdbcUrl);       // owner role
    r.add("spring.flyway.user", () -> "kazipay_owner");
    r.add("spring.flyway.password", () -> "owner_pw");
  }
}

```

---

## 3. Build Step Test Requirements (Sep 1 – Sep 28)

* **Step 1:** ModularityTest, ArchitectureTest, MoneyTest, GlobalExceptionHandlerWebTest, ApplicationBootIT
* **Step 2:** TenantContextTest, SchemaIntegrityTest, TenantIsolationIT
* **Step 3:** IdempotencyFilterIT, AesGcmEncryptorTest, OutboxPublisherIT, RateLimitIT
* **Step 4:** PasswordPolicyTest, JwtServiceTest, PermissionMatrixTest, AuthFlowIT, AuthorizationIT, lockout test
* **Step 6:** ClientServiceTest, ClientApiIT (CRUD, plan limit 402, cross-tenant 404)
* **Step 7:** ProgressCalculatorTest, ProjectApiIT, member/client visibility tests
* **Step 8:** RateResolverTest, TimerApiIT (one active timer), TimeApprovalIT (locking)
* **Step 9:** InvoiceCalculatorTest, InvoiceNumberingConcurrencyIT, InvoiceGenerationIT, InvoiceApiIT
* **Step 10:** All payments tests listed in section 2.1 (Target: $\ge 90\%$ coverage)
* **Step 11+:** Portal scoping tests, notification template tests, report query tests.

**Coverage Targets:** $\ge 80\%$ service layer; $\ge 90\%$ invoicing and payments. Start the JaCoCo gate at $60\%$ and raise it incrementally as development progresses.

---

## 4. Maven Setup (`backend/pom.xml`)

```xml
<build>
  <plugins>
    <!-- Unit tests: *Test -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-surefire-plugin</artifactId>
      <configuration>
        <includes><include>**/*Test.java</include></includes>
        <excludes><exclude>**/*IT.java</exclude></excludes>
      </configuration>
    </plugin>
    <!-- Integration tests: *IT (run on `mvn verify`) -->
    <plugin>
      <groupId>org.apache.maven.plugins</groupId>
      <artifactId>maven-failsafe-plugin</artifactId>
      <configuration>
        <includes><include>**/*IT.java</include></includes>
      </configuration>
      <executions>
        <execution>
          <goals><goal>integration-test</goal><goal>verify</goal></goals>
        </execution>
      </executions>
    </plugin>
    <!-- Coverage -->
    <plugin>
      <groupId>org.jacoco</groupId>
      <artifactId>jacoco-maven-plugin</artifactId>
      <version>0.8.12</version>
      <executions>
        <execution><goals><goal>prepare-agent</goal></goals></execution>
        <execution><id>report</id><phase>verify</phase><goals><goal>report</goal></goals></execution>
        <execution>
          <id>check</id><phase>verify</phase><goals><goal>check</goal></goals>
          <configuration>
            <rules><rule>
              <element>BUNDLE</element>
              <limits><limit>
                <counter>LINE</counter><value>COVEREDRATIO</value><minimum>0.60</minimum>
              </limit></limits>
            </rule></rules>
          </configuration>
        </execution>
      </executions>
    </plugin>
  </plugins>
</build>

```

### Useful Commands

```bash
mvn test                             # Unit tests only (fast, no Docker)
mvn verify                           # Unit + integration tests + coverage check (needs Docker)
mvn -Dtest=InvoiceCalculatorTest test # Run a single unit test class
mvn -Dit.test=MpesaCallbackIT verify  # Run a single integration test class

```

---

## 5. GitHub Actions Configuration

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read

jobs:
  backend:
    name: Backend – build & test
    runs-on: ubuntu-latest
    timeout-minutes: 20
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4

      - name: Set up JDK 21
        uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: '21'
          cache: maven

      - name: Build, unit tests, integration tests, coverage
        run: ./mvnw -B -ntp verify

      - name: Upload test reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: backend-test-reports
          path: |
            backend/target/surefire-reports
            backend/target/failsafe-reports
          retention-days: 7

      - name: Upload coverage report
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: jacoco-report
          path: backend/target/site/jacoco
          retention-days: 7

```

---

