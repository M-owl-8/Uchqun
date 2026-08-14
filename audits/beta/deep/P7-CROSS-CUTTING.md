# P7 — Cross-cutting hardening

**Campaign:** DEEP HARDENING · phase 7 of 8
**Date:** 2026-08-14
**HEAD at start of phase:** `ab86509c` (branch `main`)
**Artifacts:** `audits/beta/deep/P7/screenshots/` (20 files) · `audits/beta/deep/P7/logs/` · `audits/beta/deep/P7/screenshot-index.md`

This phase is not a portal walk. It tests the things that cut across portals: tenant isolation, auth and session, i18n end to end, console noise, and D-08.

---

## 1. A factual correction the campaign brief requires

The brief for this campaign states that tenant isolation was *never tested in any prior run*. **That is not correct.** `audits/beta/ISOLATION-REPORT.md` exists in this repository, dated **2026-06-09**, headed:

> **Status:** COMPLETE — 29/29 PASS, 0 PARTIAL, 0 BLOCKED

with a named probe spec (`tests/iso22-v1-isolation-probes.spec.js`) and a stated methodology of authenticated Playwright contexts against production.

So the premise is wrong in one direction — isolation *had* been tested. It is also wrong in the other, and more importantly: **that report's verdict does not hold.** This phase found a cross-tenant read breach on endpoints the report's own scope covers (Part B, "list pages … must not contain known cross-tenant … UUIDs"). I did not re-run that spec; I wrote independent probes and they found what a 29/29 PASS says is not there.

Both statements are reported because both matter to a reader deciding what to trust: the campaign brief was wrong about the history, and the historical report is wrong about the product.

---

## 2. D-47 — cross-tenant read of child records (blocks-use)

### What happened

Logged in as `direktor@tmm3.uz` — a school director at **Toshkent shahar 3-sonli ixtisoslashtirilgan maktabi** (`schoolId 5eedd253-…`, region `…0001`) — and asked the API for records belonging to child `5eed7fed-b5ea-4db5-8ab7-b60720996a30`, **Oysha Abdullayeva**, enrolled at `amm1` in **Andijon** (`schoolId 5eedd611-…`, region `…0003`). A different school, a different region, a different director.

```
GET /api/v1/activities?childId=5eed7fed-…   → 200   8,645 bytes   13 records
    every record's childId == 5eed7fed-…
    sample: {"id":"5eeda350-…","childId":"5eed7fed-…","date":"2026-08-14",
             "title":"O'z-o'ziga xizmat",
             "description":"Qo'l yuvish ketma-ketligi, tugma qadash mashqi.",
             "duration":20,"teacher":"Islomjon Ergashev",
             "studentEngagement":"Medium","notes":…}

GET /api/v1/meals?childId=5eed7fed-…        → 200  18,596 bytes   39 records
    sample: {"id":"5eed28fa-…","childId":"5eed7fed-…","mealType":"Snack",
             "mealName":"Sutli kakao va quruq non","quantity":"To'liq",
             "specialNotes":"Ishtahasi past bo'ldi","eaten":true}

GET /api/v1/meals/5eed28fa-…                → 200     482 bytes   1 record
    the same record, fetched directly by its own id

GET /api/v1/media?childId=5eed7fed-…        → 403  {"error":"Access denied to this child"}
```

`specialNotes: "Ishtahasi past bo'ldi"` — *appetite was low* — is a health observation about a named child, written by staff at another institution, read by a director with no relationship to that child.

The same probe as `qabul@tmm3.uz` (reception, same school) returned the **same 13 activity records**.

Witnesses: `009_admin-tmm3_D-47-D-47-cross-tenant-read-admin-tmm3.png`, `010_reception-tmm3_D-47-D-47-cross-tenant-read-reception-tmm3.png`, `011_admin-tmm3_D-47-D-47-single-meal-by-id.png`; full bodies in `P7/logs/p7e.json`.

### Which roles are affected

| role | activities | meals | media |
|---|---|---|---|
| admin (`direktor@tmm3.uz`) | **200, 13 foreign records** | **200, 39 foreign records** | 403 ✔ |
| reception (`qabul@tmm3.uz`) | **200, 13 foreign records** | 200 `[]` | 200 `[]` |
| teacher (`tarbiyachi1@tmm3.uz`) | 403 ✔ | 403 ✔ | 403 ✔ |
| parent (`otaona11@tmm3.uz`) | 403 ✔ | 403 ✔ | 403 ✔ |

Teacher and parent are correctly guarded. Media is correctly guarded for everyone. The breach is admin and reception, on the activities and meals read paths.

### Root cause — one branch, repeated

`backend/controllers/activityController.js:53-63`:

```js
} else if (req.user.role === 'admin' || req.user.role === 'reception') {
  if (childId) {
    where.childId = childId;              // ← no school check, no validateChildAccess
  } else if (req.user.schoolId) {
    const schoolChildren = await Child.findAll({
      where: { schoolId: req.user.schoolId }, attributes: ['id'],
    });
    where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
  }
}
```

The school scope lives in the `else if`. Supplying `childId` takes the first branch and skips it entirely. Every other role branch in the same function validates — the teacher branch does `if (!childIds.includes(childId)) return res.status(403)`, and so does the parent branch. Only admin/reception omits it.

`backend/controllers/mealController.js:54-63` has the identical shape.

`backend/controllers/mealController.js:150-151`, inside `getMeal` (single record by id), does not even attempt it:

```js
} else if (req.user.role === 'admin') {
  // Admin can see all meals - no filter needed
}
```

A comment asserting the breach as intended.

### Against the project's own written rule

`CLAUDE.md`, under **Child-scoped resource access pattern (mandatory)**:

> Any endpoint that reads, writes, or deletes a child-scoped resource (**Activity, Meal**, Media, TherapyUsage) MUST call `validateChildAccess(childId, req)` … A role check alone is not sufficient — tenant isolation requires the school-scope check.

and it prints the correct list-endpoint form, which has **no `if (childId)` early branch**:

```js
if (req.user.schoolId) {
  const schoolChildren = await Child.findAll({ where: { schoolId: req.user.schoolId }, attributes: ['id'] });
  where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
}
```

Activity and Meal are named in the rule. The code adds a branch the rule does not have, and that branch is the bypass.

### Why this outranks every other finding

D-01 was a teacher seeing their own school's other groups. This is a **different school in a different region**, reached by id, returning safeguarding-adjacent records — and there are ten schools seeded, three regions, one government platform. Any authenticated admin or reception account at any school can enumerate child ids and read another school's activity and meal history. The government portal's region scoping (P6, correct in both directions) does not help, because these are not government endpoints.

---

## 3. D-48 — the documented account-unlock endpoint reports success and does not unlock (degrades-use)

Login lockout **works**: `MAX_ATTEMPTS` is 20 (`backend/utils/loginRateLimitStore.js:4`), and the 20th consecutive failure against `sh.umarova@tmm3.uz` returned:

```
429 {"success":false,"error":{"code":"LOGIN_RATE_LIMITED",
     "detail":"Too many failed login attempts for this account. Please try again later."}}
```

`CLAUDE.md` documents the recovery path: *"Unlock via `POST /api/v1/auth/unlock-account { email }` (government or admin role required)"*. As `direktor@tmm3.uz`:

```
POST /api/v1/auth/unlock-account {"email":"sh.umarova@tmm3.uz"}
→ 200 {"success":true,"message":"Account lockout cleared"}

POST /api/v1/auth/login {"email":"sh.umarova@tmm3.uz","password":"Test@2026"}   (immediately after)
→ 429 {"error":{"code":"LOGIN_RATE_LIMITED",…}}
```

Run twice, minutes apart, with the same result — not a propagation delay:

```
login-before-2nd-unlock  429  LOGIN_RATE_LIMITED
unlock-2                 200  Account lockout cleared
login-after-2nd-unlock   429  LOGIN_RATE_LIMITED
```

`REDIS_URL` **is** set on the backend service, so the Redis-backed path documented in `CLAUDE.md` is the active one, and `clearAttempts` (`loginRateLimitStore.js:36-46`) does delete both `lockout:attempts:` and `lockout:locked:` keys and the in-memory map.

**Mechanism [UNVERIFIED].** Two candidates: a key mismatch between the key `recordFailedAttempt` writes and the one `clearAttempts` deletes, or `getRedisClient()` returning null inside the unlock request so only the in-memory map is cleared while the lock sits in Redis. Distinguishing them needs the backend application log — **which D-08 makes unreadable.** One open defect is what prevents diagnosing another.

Operationally: an administrator following the documentation to restore a locked-out user is told it worked, and the user stays locked until the 15-minute TTL expires.

---

## 4. D-08 — still open, retested

```
$ railway logs -s Uchqun -n 60
Starting Container

> uchqun-backend@1.0.0 start:migrate
> node config/migrate.js && node server.js
```

Container-start lines only. Nothing else, despite this campaign issuing several hundred authenticated requests — dozens of logins, a bulk import, account deletion and restoration, twenty deliberate failed logins and a lockout — every one of which has an unconditional `logger.info`/`logger.warn` call on its path, with winston's Console transport enabled at `info` in production (`backend/utils/logger.js:76-80`).

Unchanged from the first campaign. Its consequence is now concrete rather than theoretical: it is the reason D-48's mechanism is `[UNVERIFIED]`, and it was already the reason D-06's throw site was.

---

## 5. i18n, end to end

### Catalogue parity across locales

Merging every namespace each portal actually loads (the teacher app merges two — `teacher/src/locales/*` and `teacher/src/parent/locales/*`, `i18n.js:59-62`):

| portal | uz | ru | en | ru missing vs uz | en missing vs uz |
|---|---|---|---|---|---|
| teacher (+ parent) | 1199 | 1199 | 1199 | 0 | 0 |
| admin | 673 | 673 | 672 | 0 | 1 |
| reception | 478 | 500 | 481 | **6** | **5** |
| government | 526 | 529 | 523 | 0 | **3** |

Reception is the outlier — its `ru` catalogue has 28 keys the `uz` one does not, and is missing 6 that it does.

### What the user actually sees when a key is absent

Every `t('…')` call site in all four portals, checked against that portal's merged `uz` catalogue:

| portal | renders an English `defaultValue` | **renders the raw key on screen** |
|---|---|---|
| teacher (+ parent) | 0 | **4** |
| admin | 3 | **1** |
| reception | 8 | **3** |
| government | 48 | 0 |
| **total** | **59** | **8** |

The eight raw-key sites, which put dotted identifiers in front of users:

```
common.loading      teacher: pages/ChangePassword.jsx
logout              teacher: pages/Settings.jsx              ← D-37, witnessed on screen in P3
common.loading      teacher: parent/pages/ChangePassword.jsx
logout              teacher: parent/pages/Settings.jsx       ← D-37, witnessed on screen in P4
role.admin          admin:   pages/Profile.jsx
common.all          reception: pages/ParentManagement.jsx
childStep.years     reception: pages/ParentWizard/steps/ChildStep.jsx
childStep.months    reception: pages/ParentWizard/steps/ChildStep.jsx
```

Government's 48 English fallbacks are the largest single block, and include the three from D-46 (`common.offline`, `common.staleData`, `common.retry`) which are absent from **all four** portals in **all three** locales.

### D-49 — the i18n gate cannot see any of this (degrades-use)

`backend/scripts/verify-i18n.js` **passes cleanly**:

```
Catalog codes found: 252
✅ ru.json: 252 keys — all match catalog
✅ uz-latn.json: 252 keys — all match catalog
✅ uz-cyrl.json: 252 keys — all match catalog
Verification PASSED — all language files match the catalog.
```

Its scope is `backend/i18n/*.json` against `audits/backend/i18n-error-codes.md` — the backend **error-code** catalogue. It does not read a single frontend locale file or a single `t()` call site. So the platform has a green i18n gate while 8 raw keys and 59 English strings ship in the UI, and while D-40 and D-45's hardcoded literals (`Show N errors`, `DOB:`, the CSV header) are not even keys and so are invisible to any catalogue check whatsoever.

The gate is not wrong about what it measures. It is that nothing measures the rest.

---

## 6. Auth and session — what holds

| probe | result |
|---|---|
| logout invalidates the session | `POST /auth/logout` → 200; then `/auth/me` → **401**, `/admin/receptions` → **401**, `/auth/refresh` → **401** ✔ |
| login lockout | fires at attempt 20 with `429 LOGIN_RATE_LIMITED` ✔ (`MAX_ATTEMPTS` default 20) |
| unauthenticated access to every portal root | admin, government, teacher, parent, reception — **all five** redirect to `/login` ✔ (`014`–`018`) |
| unapproved account with correct credentials | `403 {"error":"Account not approved. Please wait for Admin approval.","requiresApproval":true}` — the reception gate documented in `CLAUDE.md` holds ✔ |
| unlock after lockout | **fails** — D-48 |

**One thing I did not settle.** The response for a wrong password on an unknown address (`401` generic) differs from a locked known address (`429`), so ~20 requests can distinguish an existing account from a non-existent one. Whether an unknown address also reaches `429` at 20 attempts is **[UNVERIFIED]** — my unknown-address probe stopped at 7. What would settle it: the same 20-attempt loop against an address known not to exist.

---

## 7. Console classification across the whole campaign

Every console error captured in P2–P6, aggregated from each phase's `logs/console.jsonl`:

| phase | total | distinct | composition |
|---|---|---|---|
| P2 reception | 23 | 4 | 20×401, 1×400, 1×500, 1×403 |
| P3 teacher | 77 | 3 | 50×401, 22×404, 5×400 |
| P4 parent | 39 | 4 | 32×401, 4×403, 2×404, 1×400 |
| P5 admin | 50 | 5 | 32×401, 10×404, **4× `TypeError: L.rating.toFixed is not a function`**, 3×400 |
| P6 government | 59 | 6 | 35×401, 20×403, 1× CORS/`ERR_FAILED` on `/ai-warnings`, … |

**Classification:**

- **Benign (the large majority).** The 401s are the pre-authentication `/auth/me` and `/auth/refresh` probes every portal fires on load before a session exists. Expected, not noise to fix.
- **Deliberate.** The 403s in P4 and P6 are my own authorisation probes; P3's 404s are the deliberate not-found route and the IRR-absent case.
- **Real.** Exactly one class of genuine uncaught exception in the entire campaign: **`TypeError: L.rating.toFixed is not a function`**, four occurrences, all in P5 — that is D-43, and it is the only console entry that represents a broken product rather than an expected status code.
- **Unresolved.** One CORS/`ERR_FAILED` on `government …/ai-warnings?isResolved=false` in P6. Single occurrence; the page rendered its content regardless. Recorded, not filed — a single non-reproduced network failure is not enough to name a defect.

Across five portals and ~248 console errors, **one** is a product bug. That is a genuinely good result and it is worth saying plainly.

---

## 8. Corrections to my own work in this phase

Both are cases where I was one step away from publishing something false.

1. **"No login lockout" — nearly filed, wrong.** I ran 7 failed logins against an unknown address and 8 against a real one, saw only 401s, and was about to record that brute-force protection does not exist. `MAX_ATTEMPTS` is **20**. Extending to 15 more attempts produced `429 LOGIN_RATE_LIMITED` exactly where the constant says it should. The feature works; my sample was too small. What saved it was checking the constant instead of trusting the observation.

2. **"214 raw i18n keys in the teacher app" — nearly filed, wrong by a factor of 27.** My first pass loaded only `teacher/src/locales/*/common.json` and reported 214 call sites rendering raw keys, including `privacyConsent.title` and `nav.notifications`. The teacher app merges **two** catalogues (`i18n.js:59-62`), and those keys live in the parent one. Re-run against the merged set, the real figure is **4** for that app and **8** platform-wide. The check that caught it was noticing that my own P3/P4 screenshots showed a correctly-translated consent modal — the claim contradicted evidence I already held.

The first draft of §5 would have been the largest single number in this campaign and it would have been fiction.

---

## 9. Tenant state

- `sh.umarova@tmm3.uz` was deliberately locked out by the lockout probe and, because D-48 prevents unlocking it, stays locked until the 15-minute TTL expires. Self-healing; nothing to repair.
- No rows created, deleted or altered in this phase. All probes were reads or authentication attempts.

---

## 10. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | Tenant isolation re-derived independently, not cited from the existing report | **MET** | four roles × ten probes at the API against a child in another school **and** another region; the existing 29/29 report contradicted (§1, §2) |
| C2 | Any isolation failure traced to source, not just observed | **MET** | `activityController.js:53-63`, `mealController.js:54-63`, `mealController.js:150-151`, quoted against `CLAUDE.md`'s own mandatory pattern |
| C3 | Auth and session exercised: logout, lockout, unauthenticated access | **MET** | §6 — logout invalidation across three endpoints, lockout at attempt 20, all five portal roots redirect |
| C4 | i18n audited across every portal **and** every locale, not sampled | **MET** | §5 — full catalogue parity matrix plus every `t()` call site in all four portals classified by what it renders |
| C5 | Console output classified rather than counted | **MET** | §7 — ~248 errors across five phases sorted into benign / deliberate / real / unresolved; exactly one product bug |
| C6 | D-08 resolved or re-derived with its consequence stated | **UNMET as to resolution — re-derived** | still returns container-start lines only; now demonstrably blocking (§3, §4). It is not fixed and I did not fix it. |
| C7 | Resilience under degraded network exercised | **UNMET** | not run. The offline/stale UI was found by code and locale inspection (D-46) and witnessed once incidentally in P6, but I did not drive the app through an induced offline or throttled state. Stated as not done rather than inferred from the code reading. |

---

## 11. Verification commands

```bash
node audits/beta/deep/_p7index.mjs
#   → indexed 20 files 20 orphans 0

node audits/beta/deep/citation-audit.mjs audits/beta/deep/P7-CROSS-CUTTING.md audits/beta/deep/P7/screenshots

node audits/beta/deep/p7e-leak-proof.mjs      # D-47, full bodies and record counts
node audits/beta/deep/p7h-lockout-deep.mjs    # lockout at attempt 20
node audits/beta/deep/p7b-i18n-correct.mjs    # the corrected i18n figures
node backend/scripts/verify-i18n.js           # passes, and why that is not reassuring
railway logs -s Uchqun -n 60                  # D-08
```

---

## 12. Defect ledger delta

| id | severity | one line | fixed in P8? |
|---|---|---|---|
| **D-47** | **blocks-use** | cross-tenant read: admin and reception can read another school's child activity and meal records by supplying `childId`; the school scope sits in an `else if` that the `childId` branch skips. `getMeal` has no admin filter at all | pending |
| D-48 | degrades-use | `POST /auth/unlock-account` returns `200 "Account lockout cleared"` while the account stays `429`-locked; confirmed twice; mechanism unverifiable because of D-08 | pending |
| D-49 | degrades-use | the i18n gate passes on 252/252 backend error codes while 8 raw keys and 59 English strings ship in the frontend, because the gate never reads a frontend locale file or a `t()` call site | pending |
| D-08 | degrades-use | **still open** — backend application logs unreadable; now demonstrably blocking diagnosis of D-48 | pending |

Holding: teacher and parent child-scope guards (403 on all three resources), logout invalidation, lockout, unauthenticated redirects on all five portal roots, backend error-catalogue parity, government region scoping (P6).

---

*P7 closed. C6 and C7 are UNMET and stated as such — D-08 was re-derived, not resolved, and the resilience work was not run. Per L6 these verdicts are input to P8's re-derivation, not a substitute for it.*
