# P2 — Audit-log integrity sweep

**Campaign:** CONSOLIDATION AND HARDENING II · phase 2 of 9
**Date:** 2026-08-14 · **HEAD at phase start:** `ed503021` · **fix commit:** `776cfe32`
**Machine outputs:** `auditsites.json` (75 call sites) · `audit-rows.json` (production) · `P2/logs/`
**Scripts:** `auditsites.mjs` · `p2-exercise.mjs` · `p2-exercise2.mjs` · `p2-export500.mjs` · `p2-restore.mjs`

D-27's fix returned 201, passed its unit test, and wrote nothing, because
`logAudit` swallows write errors by design. One call site was repaired. The class
was not. This phase takes the class.

---

## 1. Every call site

**75 `logAudit` call sites across 17 files.** Machine output in `auditsites.json`;
`auditsites.mjs` regenerates it, extracting `action`, `entity` and the expression
passed as `entityId`, then testing that expression against the shape a `uuid`
column can accept.

```
backend/models/index.js                                33   (afterDestroy hooks, 33 paranoid models)
backend/controllers/admin/adminUserController.js        7
backend/controllers/admin/adminReceptionController.js   6
backend/controllers/teacher/irrController.js            6
backend/controllers/receptionParentController.js        3
backend/controllers/receptionTeacherController.js       3
backend/controllers/goalController.js                   3
backend/controllers/governmentController.js             3
backend/controllers/admin/adminParentController.js      2
backend/controllers/adminRegistrationController.js      2
… 7 more files with 1 each
```

`audit_log.entityId` is `uuid` (nullable). Of the 75 sites, **74 pass a plain
identifier expression** — `instance.id`, `child.id`, `reception.id`, `req.params.id`
— which is uuid-shaped. One is flagged:

| site | action | entityId | disposition |
|---|---|---|---|
| `adminReceptionController.js:496` | `create` | *omitted* | **allowed** — defaults to `null`, and the column is nullable. 18 of the 186 existing production rows have a null `entityId`, so this is established behaviour, not a break. |

**No call site currently passes a composite string.** The D-27 shape
(`` `${childId}:${date}` ``) was the only one and it was corrected in Campaign I
`ed2579f7`. The static risk is therefore closed — but static shape was never the
real problem. The real problem was that nothing would have told anyone if it broke.

---

## 2. What production had actually recorded

`audit_log` holds **186 rows** across 36 (action, entity) pairs. Full output in
`audit-rows.json`.

Comparing the 20 distinct actions the code can emit against the actions production
has ever recorded:

```
=== actions the code can emit but production has NEVER recorded ===
    data_export
    deactivate
    reject
    transfer
count: 4 of 20
```

A zero count is not itself a failure — it may mean the feature was never used. The
only way to tell is to use it and read the row back.

---

## 3. Exercising all four, and reading the rows back

Per L13, the response code is not the evidence. Every action below was driven
through the deployed API under a real session, then the row was read out of
production Postgres.

| action | exercised | HTTP | audit row read back |
|---|---|---|---|
| `deactivate` | `PUT /admin/receptions/b10facdf-…/deactivate` | **200** | ✅ 2 rows, `entityId b10facdf-…`, `actorRole admin` |
| `reject` | `PUT /admin/documents/5eedf20f-…/reject` | **200** | ✅ 1 row, `entityId 5eedf20f-…` |
| `transfer` | `PUT /admin/children/925f570f-…/transfer` | **200** | ✅ 1 row, `entityId 925f570f-…` |
| `data_export` | `GET /parent/me/export` | **500** | ❌ **none — the handler dies before its logAudit call.** See D-51 |

```
=== audit rows in the last 20 minutes ===
 action      | entity     | actorRole | entityId                             | occurredAt
 deactivate  | receptions | admin     | b10facdf-f447-4b57-9e4b-e16b2b7e8455 | 2026-08-14 12:27:48.28+00
 deactivate  | receptions | admin     | b10facdf-f447-4b57-9e4b-e16b2b7e8455 | 2026-08-14 12:28:51.711+00
 reject      | documents  | admin     | 5eedf20f-e6f8-4b9d-8feb-4a71d0e0e27d | 2026-08-14 12:30:01.071+00
 transfer    | children   | admin     | 925f570f-51a3-4424-88d1-594bd49bf674 | 2026-08-14 12:30:02.376+00
```

**Answer to the phase's question: one call site was silently failing — `data_export`
— and it fails because the endpoint it lives in is broken, not because the audit
write is.** The other three had simply never been used. Three of the four are now
proven working end to end, from HTTP request to database row.

The two failed first attempts are recorded rather than hidden: `reject` returned
`400 rejectionReason is required` and `transfer` returned
`400 CHILD_TRANSFER_TARGET_REQUIRED` because I guessed the field names
(`reason`, `groupId`) instead of reading `childController.js:409`. Corrected in
`p2-exercise2.mjs`.

---

## 4. D-51 — `GET /api/v1/parent/me/export` returns 500 (blocks-use)

```
GET /api/v1/parent/me/export      (authenticated parent, deployed build)
→ 500  {"success":false,"error":{"code":"DATA_EXPORT_FAILED"}}
```

Reproduced on three separate parent accounts (`otaona11`, `otaona12`, `otaona13`
@tmm3.uz), so it is not account-specific. Witness
`018_parent3_D-51-D-51-parent-data-export-500.png`.

This is a parent's right-of-access export — every record the platform holds about
their child, on a platform holding minors' health and safeguarding data. It is the
one endpoint a data-protection request would exercise, and it has never once
succeeded in production: `audit_log` has zero `data_export` rows across the
platform's entire history.

`parentDataExportController.js:23` catches and returns the coded error, so the
actual exception exists only in the backend application log — **which D-08 makes
unreadable.** D-51 is now the third defect whose diagnosis D-08 blocks, after D-06
and D-48. Carried into P4 as the concrete test case for the observability build.

## 5. D-52 — document rejection is a one-way door (degrades-use)

Found while restoring state. After `PUT /admin/documents/:id/reject` succeeds, the
approve endpoint refuses:

```
PUT /admin/documents/5eedf20f-…/approve
→ 400 {"error":"Document is not pending approval"}
```

`adminReceptionController.js:207` gates approval on `document.status !== 'pending'`.
There is no un-reject path and no route that returns a rejected document to
pending. An admin who rejects the wrong document has no way back through the UI;
the reception whose identification was rejected is blocked, and per `CLAUDE.md`
reception access requires `documentsApproved`. I restored the row by direct SQL
(disclosed in §7) because the product offers no way to.

---

## 6. Closing the swallow

`CLAUDE.md` is right that an audit failure must not break a feature. What was wrong
is that the failure then vanished entirely. The swallow stays; the failure becomes
durable.

`backend/utils/auditLogger.js` now keeps a process-lifetime record — failure count,
success count, last error, last action, last failure timestamp — and
`backend/routes/health.js` reports it:

```js
res.status(audit.healthy ? 200 : 503).json({
  status: audit.healthy ? 'ready' : 'degraded',
  checks: { database: 'healthy', auditLog: audit.healthy ? 'healthy' : 'degraded' },
  audit: { writes, failures, lastAction, lastFailureAt,
           lastError: process.env.NODE_ENV === 'production' ? undefined : audit.lastError },
});
```

**Why `/health/readiness` and not somewhere else.** `docs/OPERATIONS.md:112` calls
it "the canonical monitor". `railway.toml:8` health-checks `/health`, a different
path — so a degraded audit trail raises an operator alert without pulling the
service out of rotation. `lastError` is withheld in production because it can
contain record identifiers.

### Fail-first

`backend/__tests__/utils/auditLoggerFailure.test.js`

```
RED (pre-fix)                              GREEN (post-fix)
× a healthy logger reports healthy         √ a healthy logger reports healthy
× a rejected write is counted              √ a rejected write is counted
× the failure still does not cascade       √ the failure still does not cascade
× failures accumulate across calls         √ failures accumulate across calls
× a uuid-shaped entityId is distinguish…   √ a uuid-shaped entityId is distinguish…
Tests: 5 failed, 5 total                   Tests: 5 passed, 5 total
```

The third test matters as much as the second: it asserts that `logAudit` still
**resolves rather than throwing**, so the fix cannot have reintroduced a cascade.

### Verified live, not just deployed

The deploy for `776cfe32` reported success while `/health/readiness` was still
serving the old body. Polling until the behaviour actually changed:

```
{"status":"ready","checks":{"database":"healthy","auditLog":"healthy"},
 "audit":{"writes":0,"failures":0,"lastAction":null,"lastFailureAt":null}}      HTTP 200
```

and after the four probes in §3:

```
 "audit":{"writes":4,"failures":0, …}                                            HTTP 200
```

`writes` moved 0 → 4, matching exactly the four rows read out of the database. The
counter is not a claim about the code; it is corroborated by the table.

Full backend suite after the change: **152 suites, 1576 tests, all passing.**

---

## 7. Tenant state — changed and restored

| change | restored | proof |
|---|---|---|
| `SIM-Malika` (`925f570f-…`, a child created by Campaign I's own import) transferred tmm3 → smm3 | **yes** | `schoolId 5eedd253-…`, `slug tmm3` |
| document `5eedf20f-…` rejected | **yes**, by direct SQL — the product has no un-reject path (D-52) | `status pending`, `rejectionReason null` |
| `sh.umarova@tmm3.uz` deactivated ×2 | **no change needed** — the account was already `isActive: false` before the probe |

A `SIM-` child was used for the transfer rather than a seed child precisely so that
no row carrying Campaign I evidence would move. Direct SQL was used only where the
product offers no reversal, and only on `5eed`-scoped rows (L12).

---

## 8. Per L6 — what this phase's green is blind to

`checks.auditLog: healthy` now means "no audit write has thrown since this process
started". It does **not** mean:

- **that the right events are being audited.** Nothing detects a mutation that
  never calls `logAudit` at all. `createAttendance` had no audit call for the
  platform's entire life and no counter would have shown it — only the
  code-vs-production comparison in §2 found that class.
- **that the counter survives a restart.** It is process-lifetime. Railway restarts
  on every deploy, so a failure burst before a deploy is erased. A durable count
  needs a row or a metrics sink; that is P4's territory.
- **that a *successful* write is a *correct* write.** A row with the wrong
  `actorId` counts as a success here. D-27's false attribution would not have
  moved this number.

The honest summary: this closes silent *write failure*. It does not close silent
*omission*, and omission is the larger class.

---

## 9. Close conditions

| # | condition | verdict | basis |
|---|---|---|---|
| C1 | every call site enumerated with entityId type vs column type | **MET** | 75 sites in `auditsites.json`, each with its `entityId` expression tested against the `uuid` column; 74 uuid-shaped, 1 null-by-omission on a nullable column |
| C2 | every call site confirmed by reading production, not by status code | **PARTIALLY MET** | the four never-recorded actions were each driven and read back (§3); the other 16 actions are confirmed by 186 existing production rows across 36 (action, entity) pairs. **Not every one of the 75 individual sites was individually driven** — 33 are `afterDestroy` hooks on paranoid models, and firing all 33 would mean deleting one row of every entity type in production. Stated rather than claimed. |
| C3 | the swallow is closed and the closure is tested fail-first | **MET** | §6 — RED 0/5 → GREEN 5/5, deployed, and the counter corroborated 0 → 4 against four rows read from the database |

C2 is marked PARTIALLY MET rather than MET. What would close it: a seeded
throwaway row per paranoid model, destroyed and its audit row read back — 33
create/destroy cycles against production. That is a defensible piece of work and it
is not this phase's.

---

## 10. Defect ledger delta

| id | severity | one line |
|---|---|---|
| **D-51** | **blocks-use** | `GET /parent/me/export` returns 500 on every parent tested; the right-of-access export has never succeeded in production, and its exception is unreadable because of D-08 |
| **D-52** | degrades-use | document rejection is irreversible — `approve` refuses anything not `pending`, and no un-reject route exists; a mis-rejected document blocks a reception permanently |

D-27 escalated from "one call site fixed" to "the class is instrumented". D-08's
cost rises again: it now blocks D-06, D-48 **and** D-51.
