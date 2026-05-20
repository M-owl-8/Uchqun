# Backend S7 Sprint B Execution Log

**Sprint:** B — Teacher Portal Foundations  
**Closed:** 2026-05-20  
**Commits:** 5bd03ae (T1-2), 93a22a2 (T1-3)

---

## Section 1: Sprint B Items

### T1-2 — Teacher Observations Model

**Commit:** `5bd03ae`  
**Files created/modified:**
- `backend/migrations/20260520100002-create-child-observation.js` — creates `child_observations` table with UUID PK, 5-value domain ENUM, 3-value severity ENUM, JSONB `childSnapshot`, 4 indexes (schoolId+date, childId+date, teacherId+date, partial urgent WHERE deletedAt IS NULL)
- `backend/models/ChildObservation.js` — Sequelize model, paranoid
- `backend/models/index.js` — added imports, associations, afterDestroy hook
- `backend/controllers/observationController.js` — 3 endpoints: create, listRecent, listByChild
- `backend/routes/teacherRoutes.js` — POST /observations, GET /observations/recent, GET /children/:id/observations
- `backend/routes/adminRoutes.js` — GET /children/:id/observations (read-only)
- `backend/__tests__/controllers/observationController.test.js` — 18 tests
- `backend/__tests__/childAuditHook.test.js` — +4 tests for ChildObservation hook

**Test count:** 18 controller + 4 hook = 22 new tests  
**Revert-test IDOR evidence (3 tests):**

PRE-FIX (validateChildAccess removed from create and listByChild):
```
× create › 404 IDOR guard → received 201 (bypass accepted cross-school childId)
× create › 201 childSnapshot → {firstName:'X',lastName:'Y',schoolId:'other-school',dateOfBirth:null} (stub)
× listByChild › 404 IDOR guard → res.status never called; findAll executed unguarded
```
POST-FIX: 18/18 passed.

**Design notes:**
- `childSnapshot` populated synchronously from `validateChildAccess` return value — no extra DB query
- `severity: 'urgent'` triggers `logger.warn` for immediate visibility in log aggregation
- afterDestroy hook includes `severity` in meta — urgent observation deletion has heightened safeguarding implications
- `listRecent` schoolId-scoped with limit 200 safety cap; days 1–30 default 7

---

### T1-3 — Teacher Reflections + Parent Journal

**Commit:** `93a22a2`  
**Files created/modified:**
- `backend/migrations/20260520100003-create-teacher-reflection.js` — `teacher_reflections` table; teacherId ON DELETE CASCADE (private to teacher; hard-delete removes reflections); UNIQUE(teacherId, date)
- `backend/migrations/20260520100004-create-child-journal-entry.js` — `child_journal_entries` table; childId/teacherId ON DELETE SET NULL (journal survives teacher deletion — institutional record); `isVisibleToParent BOOLEAN NOT NULL DEFAULT true`; JSONB `childSnapshot`
- `backend/models/TeacherReflection.js` — Sequelize model, paranoid
- `backend/models/ChildJournalEntry.js` — Sequelize model, paranoid
- `backend/models/index.js` — associations, afterDestroy hooks for both
- `backend/controllers/reflectionController.js` — create (409 on duplicate date, role check teacher-only), list (teacherId-scoped)
- `backend/controllers/journalController.js` — create (validateChildAccess), listByChild (teacher), getChildJournal (parent endpoint, maps response shape)
- `backend/routes/teacherRoutes.js` — reflections with requireRole('teacher') strict; journal with requireTeacher
- `backend/routes/parentRoutes.js` — GET /children/:id/journal
- `backend/__tests__/controllers/reflectionController.test.js` — 9 tests
- `backend/__tests__/controllers/journalController.test.js` — 14 tests (includes ChildJournalEntry hook test)
- `backend/__tests__/childAuditHook.test.js` — +4 tests for TeacherReflection hook

**Test count:** 9 reflection + 14 journal controller + 4 TeacherReflection hook = 27 new tests  
**Revert-test IDOR/visibility evidence (4 guards):**

PRE-FIX (all 4 guards simultaneously removed):
```
× reflection list teacherId filter removed
  → call.where.teacherId undefined (received undefined, expected 'teacher-1') — IDOR: teacher A sees all
× journal create validateChildAccess removed
  → received 201; childSnapshot shows stub {X,Y,other-school,null} — cross-school write accepted
× journal getChildJournal parentId check removed
  → Child.findOne without parentId filter — any parent reads any child's journal
× journal getChildJournal isVisibleToParent filter removed
  → call.where.isVisibleToParent undefined — draft entries (isVisibleToParent=false) leak to parents
```
POST-FIX: All 23 targeted tests passed (35/35 across the 3 test files).

**Design notes — CASCADE vs SET NULL decision:**
- `teacher_reflections.teacherId` uses `ON DELETE CASCADE`: reflections are a private diary. If a teacher account is hard-deleted (not paranoid soft-delete), the reflections are personal data with no institutional value — cascading deletion is appropriate and avoids orphaned records with no owner.
- `child_journal_entries.teacherId` uses `ON DELETE SET NULL`: journal entries are an institutional record about the child, not about the teacher. The entry remains meaningful after the teacher leaves — the childSnapshot and content are the important data.

**Response shape audit — parent endpoint:**
- `GET /parent/children/:id/journal` maps each entry to `{ id, date, content, teacherFirstName, teacherLastName }`.
- `teacherId` UUID is never included in the response. Verified by test: "response shape excludes teacherId UUID — only firstName/lastName exposed."

**Role gate — reflections:**
- `requireRole('teacher')` is applied per-route (not `requireTeacher` which allows reception/admin).
- The controller also enforces `req.user.role !== 'teacher' → 403` as defense-in-depth.
- Verified by tests: 403 for role=reception, 403 for role=admin.

---

## Section 2: Final Test Suite State

**Suite:** 78 suites / 739 tests / 0 failures  
**Sprint A baseline:** 75 suites / 690 tests  
**Sprint B delta:** +3 suites / +49 tests  
**Lint:** 0 errors, 0 warnings

---

## Section 3: Coverage Delta

| Metric | Sprint A close (47.65%) | Sprint B close |
|---|---|---|
| Statements | 47.65% | 48.64% |
| Branches | — | 41.91% |
| Functions | — | 49.43% |
| Lines | — | 49.66% |

Delta: +0.99% statements. New endpoints add coverage; the absolute delta is modest because controllers are statement-heavy and the mock-based tests cover the happy and error paths.

---

## Section 4: npm audit

Pre-existing findings (unchanged from Sprint A): 13 vulnerabilities (2 low, 6 moderate, 5 high).  
All are in transitive dependencies (ws, socket.io). No new CVEs introduced by Sprint B.  
No critical vulnerabilities.

---

## Section 5: Cross-Portal Handoffs Now Consumable

All three Sprint B CP items are now backend-complete:

| ID | Endpoint(s) | Frontend target |
|---|---|---|
| **CP-006** | POST /teacher/observations, GET /teacher/observations/recent, GET /teacher/children/:id/observations | teacher/QuickObservation.jsx, teacher/DailyReflection.jsx |
| **CP-007** | POST /teacher/reflections, GET /teacher/reflections | teacher/DailyReflection.jsx |
| **CP-008** | POST /teacher/journal, GET /parent/children/:id/journal | teacher/DailyReflection.jsx (write), parent portal (read) |

Integration notes for teacher portal:
- Observation `create`: POST body `{ childId, observationDate, domain, note, severity }`. Domain values: `communication|motor|social|cognitive|self_care`. Severity: `routine|concern|urgent`. Note 10–2000 chars.
- Reflection `create`: POST body `{ date, content }`. Content 20–5000 chars. 409 on duplicate date — use the 409 to show "already written today" UI state.
- Journal `create`: POST body `{ childId, date, content, isVisibleToParent? }`. Content 10–2000 chars. `isVisibleToParent` defaults true.
- Parent journal `read`: Response shape `{ id, date, content, teacherFirstName, teacherLastName }[]`. Only entries with `isVisibleToParent=true` returned.

---

## Section 6: i18n Key Inventory (Sprint B)

**Observations (T1-2):**
- `OBSERVATION_CHILD_ID_REQUIRED`
- `OBSERVATION_INVALID_DATE`
- `OBSERVATION_DATE_IN_FUTURE`
- `OBSERVATION_INVALID_DOMAIN`
- `OBSERVATION_NOTE_TOO_SHORT`
- `OBSERVATION_NOTE_TOO_LONG`
- `OBSERVATION_INVALID_SEVERITY`
- `OBSERVATION_CHILD_NOT_ACCESSIBLE`
- `OBSERVATION_DAYS_OUT_OF_RANGE`
- `OBSERVATION_CREATE_FAILED`
- `OBSERVATION_LIST_FAILED`

**Reflections (T1-3):**
- `REFLECTION_FORBIDDEN`
- `REFLECTION_INVALID_DATE`
- `REFLECTION_DATE_IN_FUTURE`
- `REFLECTION_CONTENT_TOO_SHORT`
- `REFLECTION_CONTENT_TOO_LONG`
- `REFLECTION_ALREADY_EXISTS_FOR_DATE`
- `REFLECTION_CREATE_FAILED`
- `REFLECTION_LIST_FAILED`

**Journal (T1-3):**
- `JOURNAL_CHILD_NOT_ACCESSIBLE`
- `JOURNAL_INVALID_DATE`
- `JOURNAL_DATE_IN_FUTURE`
- `JOURNAL_CONTENT_TOO_SHORT`
- `JOURNAL_CONTENT_TOO_LONG`
- `JOURNAL_NOT_FOUND_FOR_PARENT`
- `JOURNAL_CREATE_FAILED`
- `JOURNAL_LIST_FAILED`

---

## Section 7: Notable Design Decisions

1. **Error code format override**: Sprint B new endpoints use `{ success: false, error: { code: 'OBSERVATION_...' } }` (object with code) instead of BACKEND-012's `{ success: false, error: '<string>' }`. This is intentional — the frontend needs i18n keys, not English strings. Existing endpoints are unchanged (BACKEND-012 grandfather clause).

2. **CASCADE vs SET NULL** (documented in Section 1 T1-3 design notes above).

3. **Controller-level role check on reflections**: The `reflectionController.js` creates/list functions check `req.user.role !== 'teacher'` and return 403 in addition to the route-level `requireRole('teacher')` middleware. This defense-in-depth means the IDOR protection holds even if the route is accidentally mounted under a different middleware chain.

4. **listRecent limit 200**: At 7-day default a busy school could approach ~350 records. The 200 cap prevents pathological queries without breaking normal use. Documented in comments.

5. **afterDestroy hook placement**: All afterDestroy hooks live in `models/index.js`, not in model files. This was established in Sprint A for Child and continued for ChildObservation (T1-2), TeacherReflection, and ChildJournalEntry (T1-3). The pattern keeps model files pure data-shape definitions.
