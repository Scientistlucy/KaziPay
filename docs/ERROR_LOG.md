# KaziPay — Error & Problem-Solving Log

> Every real problem I hit while building KaziPay, what caused it, and how I fixed it.
> Newest entries go at the **top** of the "Log" section. Never delete entries, even small ones.

---

## How to use this file

1. **Hit an error?** Don't fix it silently. Copy the full error message first.
2. Add a new entry using the **template** below (copy it, fill it in).
3. Fix the problem. Come back and fill in **Root cause**, **Fix**, and **How I verified it**.
4. Add one line to the **Index** table at the top.
5. **Commit the log with the fix**: `git commit -m "fix: <short description> (see ERROR_LOG #012)"`.

**Rules**
- Only log problems you actually encountered. Honest logs are worth more than impressive ones.
- Write the **Root cause** in your own words. If you can't explain it, you haven't finished solving it.
- Paste the **exact** error text in a code block (remove passwords, tokens, and keys first).
- If Cursor/AI helped, say so in the entry and note what *you* verified yourself.
- Mark entries worth explaining in an interview or video with ⭐.

**Severity:** 🔴 blocks everything · 🟠 blocks a feature · 🟡 annoying, has a workaround · 🔵 learning/question

**Categories:** `build` · `database` · `flyway` · `security` · `tenancy` · `payments` · `mpesa` · `api` · `test` · `docker` · `config` · `deploy` · `frontend` · `git`

---

## Index

| # | Date | Step | Category | Title | Severity | Status | ⭐ |
|---|------|------|----------|-------|----------|--------|----|
| 001 | 2026-10-24 | Step 6 | config | App fails to start: two DataSourceProperties beans | 🔴 | Solved | ⭐ |

---

## Entry Template (copy everything below this line for each new problem)

```markdown
### #000 — Short, specific title
- **Date:** YYYY-MM-DD
- **Build step:** (e.g., Step 2 – Tenancy core)
- **Category:** (build / database / flyway / security / ...)
- **Severity:** (🔴 / 🟠 / 🟡 / 🔵)
- **Status:** Open | Solved | Workaround | Won't fix
- **Interview/video story?** Yes ⭐ / No

**1. What I was trying to do**
(One or two sentences. What command, feature, or test?)

**2. What happened (the symptom)**
(What I expected vs. what I saw.)

**3. Exact error / logs**
​```
paste the full error text here (secrets removed)
​```

**4. How I reproduced it**
(Exact command or steps so I could trigger it again.)
​```bash
mvn verify
​```

**5. What I tried that did NOT work**
- Attempt 1: ... → result
- Attempt 2: ... → result

**6. Root cause (in my own words)**
(Why it actually happened.)

**7. The fix**
(What I changed, and which files.)
​```java
// before
// after
​```

**8. How I verified it is fixed**
(Test name, command, or manual check. Which test would catch this if it came back?)

**9. What I learned / how to avoid it**
(One or two sentences.)

**10. Links**
- Commit: <link to the fixing commit>
- Related: #00X
- Docs/StackOverflow I used: <link>
- AI used? (Yes/No — and what I double-checked myself)
```

---

## Log

### #001 — App fails to start: two DataSourceProperties beans  ⭐
- **Date:** 2026-10-24
- **Build step:** Step 6 – Clients (found while connecting the Neon development database)
- **Category:** config
- **Severity:** 🔴
- **Status:** Solved
- **Interview/video story?** Yes ⭐

**1. What I was trying to do**
Start the backend against the new Neon database for the first time so Flyway would create every table.

**2. What happened (the symptom)**
The application context failed before Flyway ran, so no tables were created. Earlier steps had only been exercised through unit tests, so this was the first full start of the app.

**3. Exact error / logs**
```
Error creating bean with name 'unwrappedDataSource' defined in class path resource
[com/kazipay/common/tenant/TenantDataSourceConfig.class]: Unsatisfied dependency expressed through
method 'unwrappedDataSource' parameter 0: No qualifying bean of type
'org.springframework.boot.autoconfigure.jdbc.DataSourceProperties' available: expected single
matching bean but found 2: kazipayDataSourceProperties,spring.datasource-org.springframework.boot.autoconfigure.jdbc.DataSourceProperties
APPLICATION FAILED TO START
```

**4. How I reproduced it**
```powershell
Push-Location backend
mvn -s .mvn\settings.xml spring-boot:run
```

**5. What I tried that did NOT work**
- Nothing else was tried. The message names both candidate beans, which pointed straight at the config class.

**6. Root cause**
`TenantDataSourceConfig` declared its own `DataSourceProperties` bean bound to `spring.datasource`. Spring Boot's `DataSourceAutoConfiguration` registers one for the same prefix whether or not you define a `DataSource` yourself. The custom bean had a different name, so Boot didn't back off, and `unwrappedDataSource(DataSourceProperties)` had two beans to choose from.

**7. The fix**
Removed the custom bean and injected Boot's auto-configured properties (`TenantDataSourceConfig.java`):
```java
// before
@Bean
@ConfigurationProperties("spring.datasource")
DataSourceProperties kazipayDataSourceProperties() { return new DataSourceProperties(); }

// after: removed; unwrappedDataSource(DataSourceProperties) receives Boot's bean
```

**8. How I verified it is fixed**
The app started against Neon, Flyway applied V1, V2, V3, V4, V9 and V11, and `/actuator/health` returned `UP`. A Spring context test would catch this if it came back. The suite doesn't have one yet, which is why unit tests never noticed.

**9. What I learned / how to avoid it**
Check which beans Spring Boot auto-configures before declaring your own of the same type. Add at least one test that starts the full application context, so wiring errors fail in CI instead of at first deploy.

**10. Links**
- Commit: `fix(tenant): remove duplicate DataSourceProperties bean`
- AI used? Yes. Claude Code diagnosed and fixed it. I confirmed by starting the app against Neon and checking the migrations and the health endpoint.

---

<!-- Add your real entries ABOVE this line, newest first -->
