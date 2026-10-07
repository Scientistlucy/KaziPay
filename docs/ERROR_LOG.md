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
| 001 | 2026-10-08 | Step 1 | flyway | EXAMPLE — Flyway fails: permission denied for schema public | 🔴 | Solved | ⭐ |

> Delete the EXAMPLE row and the EXAMPLE entry below once you have your own real entries.

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

### #001 — EXAMPLE — Flyway fails: permission denied for schema public  ⭐
> ⚠️ **This is a sample entry showing the format. It is NOT my real work. Delete it before submitting anything.**

- **Date:** 2026-10-08
- **Build step:** Step 1 – Foundation
- **Category:** flyway
- **Severity:** 🔴
- **Status:** Solved
- **Interview/video story?** Yes ⭐

**1. What I was trying to do**
Start the app for the first time so Flyway would create the V1 and V2 tables in Postgres.

**2. What happened (the symptom)**
The app crashed on startup. I expected the tables to be created; instead Flyway failed before running any migration.

**3. Exact error / logs**
```
org.flywaydb.core.internal.exception.FlywaySqlException:
Unable to create schema history table "public"."flyway_schema_history"
ERROR: permission denied for schema public
```

**4. How I reproduced it**
```bash
docker compose up -d
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

**5. What I tried that did NOT work**
- Re-ran `docker compose down -v && up -d` → same error.
- Granted ALL on the database to `kazipay_app` → still failed (wrong role).

**6. Root cause (in my own words)**
Flyway was connecting with the restricted `kazipay_app` role, which can't create tables. The spec says Flyway must use the *owner* role over a separate connection, while the app uses the restricted role so Row-Level Security still applies. My `application-dev.yml` only had `spring.datasource.*` and no `spring.flyway.user/password`, so Flyway fell back to the app role.

**7. The fix**
Added dedicated Flyway credentials in `application-dev.yml`:
```yaml
spring:
  flyway:
    url: ${FLYWAY_URL}
    user: ${FLYWAY_USER}      # kazipay_owner
    password: ${FLYWAY_PASSWORD}
```

**8. How I verified it is fixed**
App started, Flyway applied V1 and V2, and `SchemaIntegrityTest` confirmed the app role is not the table owner.

**9. What I learned / how to avoid it**
Schema ownership and runtime permissions are separate concerns. RLS only works if the app role is *not* the owner of the tables.

**10. Links**
- Commit: <add link>
- AI used? Yes — Cursor generated the config; I diagnosed the wrong-role cause myself by checking which user Flyway logged.

---

<!-- Add your real entries ABOVE this line, newest first -->
