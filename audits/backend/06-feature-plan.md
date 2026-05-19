# Backend S6 Feature Plan

**Generated:** 2026-05-19
**Portal:** Backend
**Step:** S6 — Feature Plan
**Predecessor:** `audits/backend/04-gap-research.md` (25 gaps, 6 safeguarding)
**Decisions locked:** DEC-1 through DEC-8 (all LQs resolved)

---

## Section 1 — Tier Overview

Tiers govern when a feature must ship, not when it must be built (see Section 5 for build order).

| Tier | Gate | Items | Est. effort | Definition |
|------|------|-------|-------------|------------|
| **Tier 1** | Teacher portal launch | 7 | ~13 days | Teacher portal is non-functional for attendance, observations, children list, and reflections. Admin/Reception document filters are broken. Bulk import blocks school onboarding. Must ship before any portal launch. |
| **Tier 2** | Government acceptance | 10 | ~16 days | Safeguarding, compliance, and audit requirements. Required before government sign-off but not needed for internal portal access. |
| **Tier 3** | Post-launch polish | 9 | ~12 days | UX enhancements, reporting, operational tooling. No broken screen depends on these. |

**Total estimated S7 effort:** ~41 days
**Critical build-order inversion:** Audit Log (T2-1 / DEC-2) must be built before Bulk Import (T1-7 / DEC-5) even though T1-7 has higher launch priority. See Section 5.

### Gap → Tier mapping

| Gap | Severity (S5) | Tier |
|-----|---------------|------|
| GAP-001 Teacher children list | Blocker | T1-1 |
| GAP-002 Teacher observations | Blocker | T1-2 |
| GAP-003 Attendance | Blocker | T1-1 |
| GAP-004 Child goals / IEP | Blocker | T2-3 (DEC-4 scope) |
| GAP-005 Reflections + Journal | Blocker | T1-3 |
| GAP-006 Admin doc filter | Blocker | T1-4 |
| GAP-007 Reception doc filter | High | T1-5 |
| GAP-008 Teacher child detail | Blocker | T1-6 |
| GAP-009 Admin activity feed | Medium | T3-1 |
| GAP-010 School logo | Low | T3-2 |
| GAP-011 Bulk import | High | T1-7 |
| GAP-012 Reporting / export | Medium | T3-3 |
| GAP-013 Scheduled jobs | Medium | T3-4 |
| GAP-014 Notification preferences | Medium | T3-5 |
| GAP-015 Child school transfer | High | T2-4 |
| GAP-016 Group assignment validation | Medium | T3-6 |
| GAP-017 Restore endpoints | Low | T2-9 |
| GAP-018 Admin doc approval filter | Blocker | T1-4 |
| GAP-019 Child search | Medium | T3-7 |
| GAP-020 Group teacher boundary | Medium | T3-8 |
| GAP-S01 Parent suspension | High | T2-2 |
| GAP-S02 Transfer audit | High | T2-4 |
| GAP-S03 DeletedBy attribution | High | T2-5 |
| GAP-S04 EmotionalMonitoring paranoid | High | T2-6 |
| GAP-S05 School archival | Medium | T2-7 |
| GAP-S06 Progress paranoid | High | T2-8 |
| DEC-7 / LQ-008 Data export | Medium | T2-10 |
| DEC-8 Parent emo summary | Low | T3-9 |
| DEC-6 Notification preferences | Medium | T3-5 |

**Note on GAP-004:** Blocker severity but Tier 2 because DEC-4 requires two new tables and a government-validated ICF-CY taxonomy. `teacher/ChildDetail.jsx` goals section is documented as non-functional until Tier 2 ships.

---

## Section 2 — Tier 1 Plans (11-point breakdown)

---

### T1-1 — Teacher Children List + Attendance System

**Gaps resolved:** GAP-001, GAP-003 | **Decision:** DEC-3 | **Effort:** 3 days

**1. Problem statement**
`GET /teacher/children` and `POST /attendance` return 404. `teacher/Attendance.jsx` calls both on mount — the page is completely non-functional. Teachers cannot list or mark attendance for any child.

**2. Dependent gaps resolved**
GAP-001 (teacher children list), GAP-003 (attendance model + endpoints). T1-6 (GET /teacher/children/:id) shares `teacherController.js` — implement in the same sprint.

**3. New database objects**

Migration `YYYYMMDDHHMMSS-create-child-attendance.js`:
```
child_attendance
  id            UUID PK DEFAULT gen_random_uuid()
  childId       UUID FK → children(id) ON DELETE SET NULL
  teacherId     UUID FK → users(id) ON DELETE SET NULL
  schoolId      UUID FK → schools(id) ON DELETE RESTRICT
  date          DATE NOT NULL
  status        ENUM('present','absent','late','excused') NOT NULL
  note          TEXT
  markedBy      UUID FK → users(id) ON DELETE SET NULL
  childSnapshot JSONB NOT NULL  -- {firstName, lastName, schoolId} at record time
  createdAt     TIMESTAMP
  updatedAt     TIMESTAMP
  deletedAt     TIMESTAMP  -- paranoid
  UNIQUE (childId, date)
```

New Sequelize model: `models/ChildAttendance.js` (paranoid: true)
Associations: `Child.hasMany(ChildAttendance)`, `User.hasMany(ChildAttendance, { foreignKey: 'teacherId' })`

**4. New endpoints**

| Method | Path | Roles |
|--------|------|-------|
| GET | /api/teacher/children | teacher, reception, admin |
| POST | /api/attendance | teacher, reception |
| GET | /api/attendance | teacher, reception, admin |
| PATCH | /api/attendance/:id | teacher, reception |
| DELETE | /api/attendance/:id | admin |

**5. Middleware chain**

```
Teacher children list:  authenticate → requireTeacher → schoolScope → teacherController.getChildren
POST attendance:        authenticate → requireTeacher → schoolScope → attendanceController.create
GET attendance:         authenticate → requireTeacher → schoolScope → attendanceController.list
PATCH attendance/:id:   authenticate → requireTeacher → schoolScope → attendanceController.update
DELETE attendance/:id:  authenticate → requireRole('admin') → schoolScope → attendanceController.delete
```

New controller file: `controllers/attendanceController.js`
New function in `controllers/teacherController.js`: `getChildren`

**6. Request / response contracts (BACKEND-012)**

`GET /teacher/children`:
```json
{ "success": true, "data": [{ "id": "uuid", "firstName": "Aisha", "lastName": "Karimova", "dateOfBirth": "2018-03-12", "schoolId": "uuid" }] }
```

`POST /attendance` request: `{ "childId": "uuid", "date": "2026-05-19", "status": "present", "note": "arrived 10 min late" }`
`POST /attendance` response: `{ "success": true, "data": { "id": "uuid", "childId": "uuid", "date": "2026-05-19", "status": "present", "childSnapshot": {...} } }`

`PATCH /attendance/:id` request: `{ "status": "absent", "note": "sick" }`
`PATCH /attendance/:id` response: `{ "success": true, "data": { ...updated record } }`

**7. Validation rules**

- `date`: required, ISO 8601 YYYY-MM-DD, must not be in the future
- `status`: required, must be `['present','absent','late','excused']`
- `childId`: required, valid UUID
- Duplicate `childId + date`: 409 Conflict (unique constraint)
- PATCH: at least one of `status` or `note` required

**8. Access control / IDOR guards**

- `getChildren`: filter `{ schoolId: req.user.schoolId }` (schoolScope)
- `create`: call `validateChildAccess(req.body.childId, req)` before insert
- `update` / `delete`: fetch record, verify `record.schoolId === req.user.schoolId`
- `childSnapshot`: populated at creation time from resolved Child record

**9. Tests required**

File: `backend/__tests__/controllers/attendanceController.test.js`

| Test | Assertion |
|------|-----------|
| POST valid payload | 201, childSnapshot populated |
| POST duplicate date+childId | 409 |
| POST future date | 400 |
| POST invalid status | 400 |
| POST child from different school | 403 |
| POST DB throws | 500 |
| GET teacher sees own school only | 200, scoped |
| PATCH cross-school record | 403 |
| PATCH DB throws | 500 |
| DELETE non-admin | 403 |
| GET /teacher/children school-scoped | 200 |
| GET /teacher/children DB throws | 500 |

**10. Cross-portal coordination**

- Teacher portal: `Attendance.jsx` consumes `GET /teacher/children` and `POST /attendance`; must confirm response shape matches
- Admin portal: attendance read via `GET /attendance?childId=` (admin schoolScope applies automatically)
- Government portal: `getOverview` attendance aggregation deferred to Tier 3
- Parent portal: attendance visibility to parents deferred to Tier 3

**11. Acceptance criteria**

- [ ] Migration runs clean with no errors
- [ ] `GET /teacher/children` returns children scoped to teacher's `schoolId`
- [ ] `POST /attendance` with valid payload creates record with `childSnapshot` populated
- [ ] Duplicate `childId + date` returns 409
- [ ] Child from another school returns 403
- [ ] All listed tests pass; full suite passes with no regressions
- [ ] Teacher Attendance screen loads and successfully marks attendance (manual smoke test)

---

### T1-2 — Teacher Observations Model

**Gaps resolved:** GAP-002 | **Effort:** 2 days

**1. Problem statement**
`POST /teacher/observations` and `GET /teacher/observations/recent` return 404. `teacher/QuickObservation.jsx:64-65` and `teacher/DailyReflection.jsx:76` call these on load. No `child_observation` model or migration exists.

**2. Dependent gaps resolved**
GAP-002. `GET /teacher/observations/recent` is also consumed by T1-3 (DailyReflection.jsx) — implement once here.

**3. New database objects**

Migration `YYYYMMDDHHMMSS-create-child-observation.js`:
```
child_observation
  id              UUID PK DEFAULT gen_random_uuid()
  childId         UUID FK → children(id) ON DELETE SET NULL
  teacherId       UUID FK → users(id) ON DELETE SET NULL
  schoolId        UUID FK → schools(id) ON DELETE RESTRICT
  observationDate DATE NOT NULL
  domain          ENUM('communication','motor','social','cognitive','self_care') NOT NULL
  note            TEXT NOT NULL
  severity        ENUM('routine','concern','urgent') NOT NULL DEFAULT 'routine'
  childSnapshot   JSONB NOT NULL
  createdAt       TIMESTAMP
  updatedAt       TIMESTAMP
  deletedAt       TIMESTAMP  -- paranoid
```

New Sequelize model: `models/ChildObservation.js` (paranoid: true)

**4. New endpoints**

| Method | Path | Roles |
|--------|------|-------|
| POST | /api/teacher/observations | teacher, reception |
| GET | /api/teacher/observations/recent | teacher, reception, admin |
| GET | /api/teacher/children/:id/observations | teacher, reception, admin |
| GET | /api/admin/children/:id/observations | admin |

**5. Middleware chain**

```
POST:              authenticate → requireTeacher → schoolScope → observationController.create
GET /recent:       authenticate → requireTeacher → schoolScope → observationController.listRecent
GET /children/:id: authenticate → requireTeacher → schoolScope → observationController.listByChild
GET /admin/:id:    authenticate → requireRole('admin') → schoolScope → observationController.listByChild
```

New controller file: `controllers/observationController.js`

**6. Request / response contracts**

`POST /teacher/observations`:
```json
{ "childId": "uuid", "observationDate": "2026-05-19", "domain": "communication", "note": "...", "severity": "routine" }
```
Response: `{ "success": true, "data": { ...observation with childSnapshot } }`

`GET /teacher/observations/recent` query: `?days=7` (default 7, max 30)
Response: `{ "success": true, "data": [...observations ordered by observationDate DESC] }`

**7. Validation rules**

- `observationDate`: required, must not be in the future
- `domain`: required, must be one of the enum values
- `note`: required, min 10 chars, max 2000 chars
- `severity`: optional, defaults to `'routine'`; `'urgent'` severity triggers `logger.warn` (safeguarding signal)
- `?days` param: must be integer 1–30; defaults to 7

**8. Access control / IDOR guards**

- `create`: call `validateChildAccess(req.body.childId, req)` before insert
- `listByChild`: call `validateChildAccess(req.params.id, req)`
- `listRecent`: filter `{ schoolId: req.user.schoolId }` (all staff at school see all observations)

**9. Tests required**

File: `backend/__tests__/controllers/observationController.test.js`

| Test | Assertion |
|------|-----------|
| POST valid | 201, childSnapshot populated |
| POST future date | 400 |
| POST note too short | 400 |
| POST invalid domain | 400 |
| POST child from other school | 403 |
| POST DB throws | 500 |
| GET /recent default 7 days | 200, time-filtered |
| GET /recent ?days=30 | 200 |
| GET /recent DB throws | 500 |
| GET /children/:id cross-school | 403/404 |

**10. Cross-portal coordination**

- Teacher portal: `QuickObservation.jsx` and `DailyReflection.jsx` consume these
- Admin portal: read-only via `GET /admin/children/:id/observations` (add to adminRoutes in same sprint)
- Parent portal: observations NOT visible to parents (LQ-003 resolved: private to staff)
- Government portal: urgent observation aggregation deferred to Tier 3

**11. Acceptance criteria**

- [ ] Migration runs clean
- [ ] `POST /teacher/observations` creates record with `childSnapshot`
- [ ] `GET /teacher/observations/recent` returns last 7 days at teacher's school
- [ ] Cross-school POST returns 403
- [ ] All listed tests pass
- [ ] `teacher/QuickObservation.jsx` submits without 404

---

### T1-3 — Teacher Reflections + Parent Journal

**Gaps resolved:** GAP-005 | **Effort:** 2 days

**1. Problem statement**
`teacher/DailyReflection.jsx` calls `POST /teacher/reflections` (private teacher diary) and `POST /teacher/journal` (parent-visible daily notes) — both 404. LQ-003 and LQ-004 resolved by DEC: reflections are private to the teacher; journal entries are parent-visible, free-text, stored with history per child.

**2. Dependent gaps resolved**
GAP-005. LQ-003 and LQ-004 are closed by the decisions encoded in this plan.

**3. New database objects**

Migration A — `YYYYMMDDHHMMSS-create-teacher-reflection.js`:
```
teacher_reflection
  id        UUID PK
  teacherId UUID FK → users(id) ON DELETE CASCADE
  schoolId  UUID FK → schools(id)
  date      DATE NOT NULL
  content   TEXT NOT NULL
  createdAt TIMESTAMP
  updatedAt TIMESTAMP
  deletedAt TIMESTAMP  -- paranoid
  UNIQUE (teacherId, date)
```

Migration B — `YYYYMMDDHHMMSS-create-child-journal-entry.js`:
```
child_journal_entry
  id                UUID PK
  childId           UUID FK → children(id) ON DELETE SET NULL
  teacherId         UUID FK → users(id) ON DELETE SET NULL
  schoolId          UUID FK → schools(id)
  date              DATE NOT NULL
  content           TEXT NOT NULL
  isVisibleToParent BOOLEAN NOT NULL DEFAULT true
  childSnapshot     JSONB NOT NULL
  createdAt         TIMESTAMP
  updatedAt         TIMESTAMP
  deletedAt         TIMESTAMP  -- paranoid
```

**4. New endpoints**

| Method | Path | Roles |
|--------|------|-------|
| POST | /api/teacher/reflections | teacher |
| GET | /api/teacher/reflections | teacher (own only) |
| POST | /api/teacher/journal | teacher, reception |
| GET | /api/teacher/journal/:childId | teacher, reception, admin |
| GET | /api/parent/children/:id/journal | parent |

**5. Middleware chain**

```
POST /reflections:   authenticate → requireRole('teacher') → schoolScope → reflectionController.create
GET /reflections:    authenticate → requireRole('teacher') → schoolScope → reflectionController.list
POST /journal:       authenticate → requireTeacher → schoolScope → journalController.create
GET /journal/:id:    authenticate → requireTeacher → schoolScope → journalController.listByChild
GET /parent/journal: authenticate → requireRole('parent') → parentController.getChildJournal
```

New controller files: `controllers/reflectionController.js`, `controllers/journalController.js`
Add to `controllers/parentController.js`: `getChildJournal`

**6. Request / response contracts**

`POST /teacher/reflections`: `{ "date": "2026-05-19", "content": "..." }`
`POST /teacher/journal`: `{ "childId": "uuid", "date": "2026-05-19", "content": "...", "isVisibleToParent": true }`

`GET /parent/children/:id/journal` response:
```json
{ "success": true, "data": [{ "date": "2026-05-19", "content": "...", "teacherFirstName": "Dilnoza", "teacherLastName": "Yusupova" }] }
```
Teacher identity included for parent transparency.

**7. Validation rules**

- Reflections `date`: max one per teacher per day (unique constraint); past dates allowed
- Reflections `content`: min 20 chars, max 5000 chars
- Journal `content`: min 10 chars, max 2000 chars
- Journal `date`: must not be in the future
- `isVisibleToParent`: defaults true; teacher may set false (draft mode)

**8. Access control / IDOR guards**

- Reflections: filter by `teacherId = req.user.id` — teachers cannot read each other's reflections
- Journal create: call `validateChildAccess(childId, req)`
- Journal read (teacher/admin): filter by `schoolId = req.user.schoolId`
- Parent journal read: `Child.findOne({ where: { id, parentId: req.user.id } })`; return only `isVisibleToParent: true` entries

**9. Tests required**

| Test | Assertion |
|------|-----------|
| POST /reflections valid | 201 |
| POST /reflections duplicate date | 409 |
| POST /reflections reception role | 403 |
| POST /reflections DB throws | 500 |
| GET /reflections: teacher A cannot see teacher B's | 200, filtered to own |
| POST /journal child from other school | 403 |
| POST /journal valid | 201, childSnapshot populated |
| GET /parent/journal: parent sees only own child | 200 |
| GET /parent/journal: other child | 404 |
| GET /parent/journal: isVisibleToParent=false excluded | 200, filtered |

**10. Cross-portal coordination**

- Teacher portal: `DailyReflection.jsx` consumes all three endpoints
- Parent portal: `GET /parent/children/:id/journal` — new route in `routes/parentRoutes.js`
- Admin portal: `GET /admin/children/:id/journal` for safeguarding oversight — deferred to Tier 2
- Government portal: no access to reflections or journal (private staff data)

**11. Acceptance criteria**

- [ ] Both migrations run clean
- [ ] POST /reflections creates record visible only to the creating teacher
- [ ] Duplicate date returns 409
- [ ] POST /journal creates entry with `childSnapshot`; `isVisibleToParent` defaults true
- [ ] `GET /parent/children/:id/journal` returns only own child's visible entries
- [ ] Cross-school journal POST returns 403
- [ ] All listed tests pass

---

### T1-4 — Admin Document Status Filter

**Gaps resolved:** GAP-006, GAP-018 | **Effort:** 1 day

**1. Problem statement**
`admin/DocumentApprovalQueue.jsx:127-129` calls filter endpoints for approved and rejected documents that return 404. `adminReceptionController.getPendingDocuments` has `status: 'pending'` hardcoded and no general-purpose document list endpoint exists.

**2. Dependent gaps resolved**
GAP-006 and GAP-018 share the same root cause — both closed by this item.

**3. New database objects**
None. Uses existing `Document` and `User` models.

**4. New endpoints**

| Method | Path | Roles |
|--------|------|-------|
| GET | /api/admin/documents | admin |

Query param: `?status=pending|approved|rejected` (optional; omit to return all).
Existing `GET /api/admin/documents/pending` is left unchanged for backward compatibility.

New function `getDocuments` added to `controllers/admin/adminReceptionController.js`.

**5. Middleware chain**

```
authenticate → requireRole('admin') → schoolScope → adminReceptionController.getDocuments
```

**6. Request / response contracts**

`GET /admin/documents?status=approved`:
```json
{ "success": true, "data": [{ "id": "uuid", "fileName": "...", "status": "approved", "user": { "id": "...", "firstName": "...", "role": "reception" } }] }
```

**7. Validation rules**

- `status`: if provided, must be one of `['pending','approved','rejected']`; 400 otherwise
- All results scoped to receptions created by `req.user.id` (join on `User.createdBy`)

**8. Access control / IDOR guards**

Scope via join: `Document.findAll({ include: [{ model: User, where: { createdBy: req.user.id } }], where: statusFilter })`. Same pattern as existing `getPendingDocuments`.

**9. Tests required**

Extend `backend/__tests__/controllers/adminReceptionController.test.js`:

| Test | Assertion |
|------|-----------|
| GET /documents no status | 200, all statuses |
| GET /documents?status=approved | 200, only approved |
| GET /documents?status=rejected | 200, only rejected |
| GET /documents?status=invalid | 400 |
| Cross-admin isolation | 200, only own school's docs |
| DB throws | 500 |

**10. Cross-portal coordination**

- Admin portal: `DocumentApprovalQueue.jsx` must align on exact query param name (`?status=`) and path (`/api/admin/documents`)
- Existing `GET /admin/documents/pending` must remain untouched

**11. Acceptance criteria**

- [ ] `GET /admin/documents?status=approved` returns approved docs scoped to admin's school
- [ ] Invalid `status` returns 400
- [ ] Existing `/admin/documents/pending` is unchanged
- [ ] All listed tests pass

---

### T1-5 — Reception Document Status Filter

**Gaps resolved:** GAP-007 | **Effort:** 0.5 days

**1. Problem statement**
`receptionController.getMyDocuments` queries all documents for the user with no status filter. The Reception portal needs to filter by status to separate pending from approved/rejected.

**2. Dependent gaps resolved**
GAP-007 only.

**3. New database objects**
None.

**4. New endpoints**
No new endpoint. Extend existing `getMyDocuments` in `controllers/receptionController.js` to accept `?status=` query param.

**5. Middleware chain**
Unchanged: `authenticate → requireRole('reception') → receptionController.getMyDocuments`

**6. Request / response contracts**
`GET /reception/documents?status=pending`: `{ "success": true, "data": [...documents] }`

**7. Validation rules**
- `status`: optional; if provided, must be `['pending','approved','rejected']`; 400 otherwise
- No `status` param returns all documents for `req.user.id` (existing behavior preserved)

**8. Access control / IDOR guards**
Always `userId: req.user.id` — cannot change. Status filter is additive.

**9. Tests required**

| Test | Assertion |
|------|-----------|
| GET ?status=approved | 200, only approved |
| GET ?status=pending | 200, only pending |
| GET ?status=invalid | 400 |
| GET no status | 200, all |
| GET DB throws | 500 |

**10. Cross-portal coordination**
Reception portal document list page only. No other portals affected.

**11. Acceptance criteria**

- [ ] `?status=approved` filters correctly
- [ ] Invalid status returns 400
- [ ] No-status behavior unchanged
- [ ] All listed tests pass

---

### T1-6 — GET /teacher/children/:id Endpoint

**Gaps resolved:** GAP-008 | **Effort:** 0.5 days

**1. Problem statement**
`teacher/ChildDetail.jsx` calls `GET /teacher/children/:id` and receives 404. T1-1 covers the list; this covers individual child detail.

**2. Dependent gaps resolved**
GAP-008. Must be implemented in the same PR as T1-1 to avoid double-touching `teacherController.js`.

**3. New database objects**
None. Uses existing `Child` model.

**4. New endpoints**

| Method | Path | Roles |
|--------|------|-------|
| GET | /api/teacher/children/:id | teacher, reception, admin |

**5. Middleware chain**

```
authenticate → requireTeacher → schoolScope → teacherController.getChildById
```

**6. Request / response contracts**

```json
{ "success": true, "data": { "id": "uuid", "firstName": "Aisha", "lastName": "Karimova", "dateOfBirth": "2018-03-12", "schoolId": "uuid", "parentId": "uuid" } }
```

**7. Validation rules**
- `id`: valid UUID; 400 if malformed
- 404 if child not found at teacher's school

**8. Access control / IDOR guards**
Call `validateChildAccess(req.params.id, req)` — returns 404 if child not in teacher's school.

**9. Tests required**

| Test | Assertion |
|------|-----------|
| GET valid child | 200, child data |
| GET child from other school | 404 |
| GET non-existent | 404 |
| GET DB throws | 500 |

**10. Cross-portal coordination**
Teacher portal `ChildDetail.jsx` primary data fetch. Admin portal has a separate scoped endpoint already.

**11. Acceptance criteria**

- [ ] Returns child data for child at teacher's school
- [ ] Cross-school request returns 404
- [ ] All listed tests pass
- [ ] Teacher ChildDetail page loads without 404

---

### T1-7 — Bulk Import System

**Gaps resolved:** GAP-011 | **Decision:** DEC-5 | **Effort:** 4 days
**Build-order note:** Must be built AFTER T2-1 (Audit Log) — bulk import writes audit_log entries per created record.

**1. Problem statement**
No mechanism exists to onboard a school's children in bulk. Individual `POST /children` does not scale for schools with 100+ records. GAP-011 blocks initial school onboarding.

**2. Dependent gaps resolved**
GAP-011. Requires T2-1 (audit log) to be merged first in S7.

**3. New database objects**

Migration `YYYYMMDDHHMMSS-create-import-jobs.js`:
```
import_jobs
  id               UUID PK DEFAULT gen_random_uuid()
  schoolId         UUID FK → schools(id)
  createdBy        UUID FK → users(id)
  type             ENUM('children','users') NOT NULL
  status           ENUM('validating','valid','invalid','processing','completed','failed') NOT NULL DEFAULT 'validating'
  inputFileUrl     TEXT NOT NULL
  totalRows        INTEGER
  validRows        INTEGER
  invalidRows      INTEGER
  processedRows    INTEGER DEFAULT 0
  validationErrors JSONB
  errorFileUrl     TEXT
  startedAt        TIMESTAMP
  completedAt      TIMESTAMP
  createdAt        TIMESTAMP
  updatedAt        TIMESTAMP
```

New Sequelize model: `models/ImportJob.js`
New worker: `workers/importWorker.js` (same Node process via `setImmediate` — no separate queue for Tier 1)

**4. New endpoints**

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| POST | /api/admin/import/validate | admin | Sync CSV validation; returns preview + errors; does NOT persist |
| POST | /api/admin/import/start | admin | Creates ImportJob; enqueues background processor; returns jobId |
| GET | /api/admin/import/:jobId/status | admin | Poll job progress |
| GET | /api/admin/import/:jobId/errors | admin | Download error report (JSON) |

**5. Middleware chain**

```
All: authenticate → requireRole('admin') → schoolScope → adminImportController.*
```

New controller file: `controllers/admin/adminImportController.js`

**6. Request / response contracts**

`POST /admin/import/validate` — multipart/form-data with `file` (CSV) and `type=children`:
```json
{ "success": true, "data": { "totalRows": 87, "validRows": 85, "invalidRows": 2, "preview": [...first 5 valid rows], "errors": [{ "row": 3, "field": "dateOfBirth", "message": "Invalid date format" }] } }
```

`POST /admin/import/start` — body: `{ "type": "children", "fileUrl": "..." }`:
```json
{ "success": true, "data": { "jobId": "uuid", "status": "processing" } }
```

`GET /admin/import/:jobId/status`:
```json
{ "success": true, "data": { "jobId": "uuid", "status": "processing", "processedRows": 43, "totalRows": 85 } }
```

**7. Validation rules**

CSV columns for `type=children`: `firstName` (required), `lastName` (required), `dateOfBirth` (required, YYYY-MM-DD), `parentEmail` (optional, valid email if present)
Max file size: 5 MB; max rows: 500; file must be CSV (400 otherwise)

**8. Access control / IDOR guards**

- `schoolId` on ImportJob always set from `req.user.schoolId`
- Status poll / error report: verify `importJob.schoolId === req.user.schoolId`; 403 otherwise

**9. Tests required**

File: `backend/__tests__/controllers/adminImportController.test.js`

| Test | Assertion |
|------|-----------|
| POST /validate valid CSV | 200, preview + error counts |
| POST /validate rows with errors | 200, errors populated |
| POST /validate non-CSV file | 400 |
| POST /validate >500 rows | 400 |
| POST /start valid | 201, jobId returned |
| GET /status valid jobId | 200, status + progress |
| GET /status cross-school jobId | 403 |
| GET /errors valid jobId | 200, error array |
| POST /start DB throws | 500 |

**10. Cross-portal coordination**

- Admin portal: validate → preview → confirm → poll until done → show errors
- Government portal: no direct access; import history visible via audit log (Tier 2)
- Audit log (T2-1): each created record gets `logAudit({ action: 'bulk_import', entity: 'children', ... })`

**11. Acceptance criteria**

- [ ] `POST /validate` returns preview of first 5 rows and validation errors
- [ ] Non-CSV or oversized file returns 400
- [ ] `POST /start` returns jobId; job processes records in background
- [ ] `GET /status` reflects live `processedRows`
- [ ] Cross-school status poll returns 403
- [ ] All listed tests pass; migration runs clean

---

## Section 3 — Tier 2 Plans (8-point breakdown)

---

### T2-1 — Audit Log Infrastructure

**Decision:** DEC-2 | **Effort:** 2 days | **Build first in S7**

**1. Problem statement + gaps resolved**
No append-only audit trail exists. Paranoid deletes record `deletedAt` but not the actor. This infrastructure is required by T1-7 (bulk import) and T2-5 (deletedBy attribution).

**2. New database objects**

Migration `YYYYMMDDHHMMSS-create-audit-log.js`:
```
audit_log
  id         BIGSERIAL PK   (integer — high volume, not UUID)
  actorId    UUID FK → users(id) ON DELETE SET NULL
  actorRole  VARCHAR(30) NOT NULL
  action     VARCHAR(100) NOT NULL   -- 'delete','suspend','bulk_import','transfer','archive'
  entity     VARCHAR(100) NOT NULL   -- table name, e.g. 'children','users'
  entityId   UUID                     -- PK of affected record (nullable for bulk)
  schoolId   UUID FK → schools(id) ON DELETE SET NULL
  meta       JSONB                    -- reason, old values, etc.
  occurredAt TIMESTAMP NOT NULL DEFAULT NOW()
  -- NO createdAt/updatedAt/deletedAt — immutable by design
```

Sequelize model `models/AuditLog.js` (`timestamps: false`).
Override `AuditLog.update` and `AuditLog.destroy` to throw unconditionally.

**3. New endpoints or hooks**

No public HTTP endpoint in Tier 2.

Helper utility `utils/auditLogger.js`:
```js
export const logAudit = async ({ actorId, actorRole, action, entity, entityId, schoolId, meta }) => {
  await AuditLog.create({ actorId, actorRole, action, entity, entityId, schoolId, meta, occurredAt: new Date() });
};
```

Sequelize `afterDestroy` hooks added to: `Child`, `User`, `ChildObservation`, `ChildAttendance`, `ChildJournalEntry`, `TeacherReflection`. Hook reads `actorId` from destroy options: `instance.destroy({ actorId: req.user.id })`.

**4. Access control**
Internal write only. No HTTP read endpoint until Tier 3.
DB grants: `REVOKE UPDATE, DELETE ON audit_log FROM backend_user` — added as migration step.

**5. Tests required**

File: `backend/__tests__/utils/auditLogger.test.js`

| Test | Assertion |
|------|-----------|
| `logAudit` writes a record | `AuditLog.count` increases by 1 |
| `AuditLog.update()` | throws `Error('audit_log is immutable')` |
| `AuditLog.destroy()` | throws `Error('audit_log is immutable')` |
| `afterDestroy` hook on Child | audit_log entry created with `action='delete'` |

**6. Cross-portal impact**
No portal-facing changes. Bulk import (T1-7) and DeletedBy (T2-5) depend on it.

**7. Risk / rollback**
`afterDestroy` hook MUST NOT throw — wrap in try/catch, log error to application logger, proceed with delete. Rollback: migration down drops the table; hooks are code-level and removed on revert.

**8. Acceptance criteria**

- [ ] Migration creates `audit_log` with no `updatedAt`/`deletedAt` columns
- [ ] `AuditLog.update()` throws unconditionally
- [ ] `AuditLog.destroy()` throws unconditionally
- [ ] `afterDestroy` on Child creates audit_log entry; hook failure does not block delete
- [ ] All listed tests pass

---

### T2-2 — Parent Suspension

**Gaps resolved:** GAP-S01 | **Decision:** DEC-1 | **Effort:** 2 days

**1. Problem statement + gaps resolved**
No mechanism exists to suspend a parent account without deleting it (LQ-001, LQ-002). In safeguarding scenarios, an admin must block portal access without destroying account history. `middleware/auth.js:95` contains an intentional `isActive` bypass for parents that must be removed simultaneously.

**2. New database objects**

Migration: `ALTER TABLE users ADD COLUMN "status" VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','archived'));`
Backfill: all existing rows default to `'active'` via column DEFAULT.
Update `User` model: `status: { type: DataTypes.ENUM('active','suspended','archived'), defaultValue: 'active' }`

**3. New endpoints or hooks**

| Method | Path | Roles |
|--------|------|-------|
| PUT | /api/admin/parents/:id/suspend | admin |
| PUT | /api/admin/parents/:id/activate | admin |

New controller: `controllers/admin/adminParentController.js`

`middleware/auth.js:95` change:
```js
// Remove: if (!isParent && !isGovernment && !user.isActive) { return 401 }
// Replace with:
if (user.status !== 'active') { return res.status(401).json({ error: 'Account suspended' }); }
```

Update CLAUDE.md: remove the "Parent isActive bypass" note; document the `status` field.

**4. Access control**
Suspend/activate: verify `parent.schoolId === req.user.schoolId`; 403 if mismatch.
Write `logAudit({ action: 'suspend', entity: 'users', entityId: id, ... })`.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| PUT /suspend parent at admin's school | 200, `status='suspended'` |
| PUT /suspend parent at other school | 403 |
| PUT /suspend non-parent user | 404 |
| Auth middleware: suspended parent | 401 |
| Auth middleware: active parent | passes |
| PUT /activate suspended parent | 200, `status='active'` |
| Auth middleware: `status='archived'` | 401 |
| PUT /suspend DB throws | 500 |

**6. Cross-portal impact**
Admin portal: Suspend/Activate buttons on parent detail page.
Parent portal: suspended parent receives 401 on all API calls immediately.
CLAUDE.md must be updated before merge.

**7. Risk / rollback**
Migration ADD COLUMN with DEFAULT is zero-downtime on Postgres. Removing the `isActive` bypass is a behavioral change — test coverage must be complete before merge. Rollback: restore bypass, DROP COLUMN (data loss on rollback — document this).

**8. Acceptance criteria**

- [ ] Migration adds `status` column; existing rows have `status='active'`
- [ ] Suspended parent gets 401 from auth middleware
- [ ] Admin at same school can suspend/activate; cross-school returns 403
- [ ] `isActive` bypass removed from auth.js
- [ ] CLAUDE.md note updated
- [ ] All listed tests pass

---

### T2-3 — Goals / IEP Model

**Gaps resolved:** GAP-004 | **Decision:** DEC-4 | **Effort:** 3 days

**1. Problem statement + gaps resolved**
`teacher/ChildDetail.jsx:151` calls `GET /teacher/children/:id/goals` — returns 404. Goals are short-term instructional objectives aligned to WHO ICF-CY categories, distinct from `ServicePlan` (annual therapy billing). No model or migration exists.

**2. New database objects**

Migration A — `child_goal`:
```
child_goal
  id           UUID PK
  childId      UUID FK → children(id) ON DELETE SET NULL
  schoolId     UUID FK → schools(id)
  createdBy    UUID FK → users(id)
  icfCode      VARCHAR(20)   -- e.g. 'd110'; format validated only
  domain       VARCHAR(100)
  targetText   TEXT NOT NULL
  metric       TEXT
  targetDate   DATE
  status       ENUM('active','achieved','paused','cancelled') DEFAULT 'active'
  childSnapshot JSONB NOT NULL
  createdAt    TIMESTAMP
  updatedAt    TIMESTAMP
  deletedAt    TIMESTAMP  -- paranoid
```

Migration B — `child_goal_review`:
```
child_goal_review
  id         UUID PK
  goalId     UUID FK → child_goal(id) ON DELETE CASCADE
  reviewerId UUID FK → users(id)
  reviewDate DATE NOT NULL
  note       TEXT NOT NULL
  progress   ENUM('on_track','behind','achieved','regressed') NOT NULL
  createdAt  TIMESTAMP
  updatedAt  TIMESTAMP
```

**3. New endpoints or hooks**

| Method | Path | Roles |
|--------|------|-------|
| GET | /api/teacher/children/:id/goals | teacher, reception, admin |
| POST | /api/teacher/children/:id/goals | teacher |
| PATCH | /api/teacher/goals/:goalId | teacher |
| POST | /api/teacher/goals/:goalId/reviews | teacher |
| GET | /api/admin/children/:id/goals | admin |

**4. Access control**
Teacher endpoints: `validateChildAccess(childId, req)` for all writes and reads.
Admin endpoints: filter `schoolId = req.user.schoolId`.
Reviews: verify `goal.schoolId === req.user.schoolId` before writing.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| GET /goals valid child | 200, goals list |
| GET /goals cross-school | 404 |
| POST /goals valid | 201, childSnapshot |
| POST /goals invalid icfCode format | 400 |
| POST /reviews valid | 201 |
| PATCH /goals/:id status change | 200 |
| GET /goals DB throws | 500 |

**6. Cross-portal impact**
Teacher portal: ChildDetail.jsx goals section becomes functional.
Admin portal: read-only goals for safeguarding oversight.
Parent portal: goal visibility deferred to Tier 3.

**7. Risk / rollback**
Two new tables with FK to children — use ON DELETE SET NULL on `childId` to preserve goal history after child paranoid-delete. ICF-CY code validation: format only (letter + digits), not full taxonomy.

**8. Acceptance criteria**

- [ ] Both migrations run clean
- [ ] `GET /teacher/children/:id/goals` returns goals; cross-school returns 404
- [ ] Goal created with `childSnapshot`
- [ ] Goal review creates entry linked to goal
- [ ] All listed tests pass; teacher ChildDetail goals section loads

---

### T2-4 — Child School Transfer + Audit Trail

**Gaps resolved:** GAP-015, GAP-S02 | **Effort:** 2 days

**1. Problem statement + gaps resolved**
No transfer endpoint exists. Changing `child.schoolId` directly leaves no record of who authorized the transfer or when. GAP-S02 requires an immutable audit trail via T2-1.

**2. New database objects**
None — uses `audit_log` (T2-1). `schoolId` column already exists on `children`.

**3. New endpoints or hooks**

| Method | Path | Roles |
|--------|------|-------|
| PUT | /api/admin/children/:id/transfer | admin |

Request: `{ "toSchoolId": "uuid", "reason": "..." }`

Controller logic: (1) verify child at `req.user.schoolId`; (2) verify `toSchoolId` is a different valid school; (3) capture `fromSchoolId`; (4) write `logAudit` FIRST; (5) update `child.schoolId`.

**4. Access control**
Only the source school's admin can initiate transfer. Cannot pull children into your school. `child.schoolId !== req.user.schoolId` → 403.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| PUT valid transfer | 200, schoolId updated |
| PUT same-school transfer | 400 |
| PUT child from other school | 403 |
| PUT invalid toSchoolId | 404 |
| Audit log entry written | `logAudit` called with correct fields |
| PUT DB throws | 500 |

**6. Cross-portal impact**
Admin portal: Transfer button on child detail.
Teacher portal: teacher loses access after transfer (child no longer in their school).
Government portal: transfer history via audit log (Tier 3 read endpoint).

**7. Risk / rollback**
Write audit log BEFORE updating schoolId. If update fails, misleading audit entry is preferable to silent data change with no trace. Reverse transfer via another PUT call.

**8. Acceptance criteria**

- [ ] Transfer updates `child.schoolId`
- [ ] Audit log entry created with `fromSchoolId`, `toSchoolId`, `reason`
- [ ] Cross-school initiation returns 403
- [ ] All listed tests pass

---

### T2-5 — DeletedBy Attribution

**Gaps resolved:** GAP-S03 | **Decision:** uses DEC-2 | **Effort:** 1 day
**Dependency:** T2-1 must be complete.

**1. Problem statement + gaps resolved**
Paranoid deletes record `deletedAt` but not the actor. "Who deleted this record?" is unanswerable. GAP-S03 closes this via `afterDestroy` hooks writing to `audit_log`.

**2. New database objects**
None — uses `audit_log` (T2-1).

**3. New endpoints or hooks**
Extend T2-1 `afterDestroy` hooks to all paranoid models: `Child`, `User`, `ChildObservation`, `ChildAttendance`, `ChildJournalEntry`, `TeacherReflection`, `ChildGoal`, `EmotionalMonitoring` (after T2-6), `Progress` (after T2-8).

Controllers must pass `actorId` in destroy options: `instance.destroy({ actorId: req.user.id })`.

**4. Access control**
Write-side only. No new endpoint.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| `Child.destroy({ actorId })` | audit_log entry has `actorId` set |
| `Child.destroy()` without actorId | audit_log entry has `actorId = null` (not error) |
| Hook failure | delete proceeds; error logged |

**6. Cross-portal impact**
Backend-only. Enables safeguarding audits to answer "who deleted this?"

**7. Risk / rollback**
Hook failures must not block delete — catch and log only. Remove hook registrations to rollback.

**8. Acceptance criteria**

- [ ] Deleting Child creates audit_log entry with `action='delete'`, `actorId` set
- [ ] Hook failure does not block delete
- [ ] All listed tests pass

---

### T2-6 — EmotionalMonitoring Paranoid

**Gaps resolved:** GAP-S04 | **Effort:** 1 day

**1. Problem statement + gaps resolved**
`EmotionalMonitoring` is not paranoid — `destroy()` hard-deletes with no recovery. In safeguarding investigations, deletion of a child's emotional monitoring record is unrecoverable.

**2. New database objects**
Migration: `ALTER TABLE emotional_monitorings ADD COLUMN "deletedAt" TIMESTAMP;`
Model: `EmotionalMonitoring.js` — add `paranoid: true`.

**3. New endpoints or hooks**
None. Existing delete endpoints automatically become soft-delete.

**4. Access control**
Unchanged.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| `EmotionalMonitoring.destroy()` | `deletedAt` set; hard-delete does not occur |
| `EmotionalMonitoring.findAll()` | excludes soft-deleted |
| `restore()` | record recoverable |

**6. Cross-portal impact**
No portal-visible change. Deleted records stop appearing in lists (same UX, now recoverable).

**7. Risk / rollback**
ADD COLUMN is safe on Postgres. Rollback: DROP COLUMN (soft-deleted records lost — document this).

**8. Acceptance criteria**

- [ ] Migration adds `deletedAt` to `emotional_monitorings`
- [ ] `destroy()` soft-deletes; `findAll()` excludes soft-deleted
- [ ] All listed tests pass

---

### T2-7 — School Archival Mechanism

**Gaps resolved:** GAP-S05 | **Effort:** 1 day

**1. Problem statement + gaps resolved**
No workflow exists for archiving a closed school. LQ-009 decision: archival sets `isActive = false`, leaving children and records intact but removing the school from active queries. Bulk child transfer is a separate manual operation.

**2. New database objects**
None — `School.isActive` already exists. Audit log entry written on archival.

**3. New endpoints or hooks**

| Method | Path | Roles |
|--------|------|-------|
| PUT | /api/government/schools/:id/archive | government |
| PUT | /api/government/schools/:id/reactivate | government |

**4. Access control**
Government role only. Admin cannot archive their own school.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| PUT /archive: government | 200, `isActive=false` |
| PUT /archive: admin role | 403 |
| PUT /archive: non-existent school | 404 |
| Audit log written | `logAudit` called with `action='archive'` |
| PUT /reactivate | 200, `isActive=true` |

**6. Cross-portal impact**
Admin portal: archived school's admin receives 403 on school-scoped routes (schoolScope checks `school.isActive`).
Children at archived school remain queryable by government.

**7. Risk / rollback**
Reversible via reactivate. No child data affected.

**8. Acceptance criteria**

- [ ] Archived school has `isActive = false`
- [ ] Admin at archived school gets 403 on school-scoped routes
- [ ] Audit log entry created with `action='archive'`
- [ ] All listed tests pass

---

### T2-8 — Progress Paranoid Fix

**Gaps resolved:** GAP-S06 | **Effort:** 1 day

**1. Problem statement + gaps resolved**
`Progress` model is not paranoid — hard-deletes remove a child's development trajectory. Same safeguarding risk as T2-6.

**2. New database objects**
Migration: `ALTER TABLE progress ADD COLUMN "deletedAt" TIMESTAMP;`
Model: `Progress.js` — add `paranoid: true`.

**3. New endpoints or hooks**
None.

**4. Access control**
Unchanged.

**5. Tests required**
Identical pattern to T2-6 (substitute `Progress` for `EmotionalMonitoring`).

**6. Cross-portal impact**
No portal-visible change.

**7. Risk / rollback**
Same as T2-6.

**8. Acceptance criteria**

- [ ] Migration adds `deletedAt` to `progress`
- [ ] `destroy()` soft-deletes; `findAll()` excludes soft-deleted
- [ ] All listed tests pass

---

### T2-9 — Restore Endpoints for Paranoid Models

**Gaps resolved:** GAP-017 | **Effort:** 1 day

**1. Problem statement + gaps resolved**
No admin restore mechanism for accidentally soft-deleted records. Admins and government need to recover: `Child`, `User`, `ChildObservation`, `ChildAttendance`.

**2. New database objects**
None.

**3. New endpoints or hooks**

| Method | Path | Roles | Model |
|--------|------|-------|-------|
| PUT | /api/admin/children/:id/restore | admin, government | Child |
| PUT | /api/admin/users/:id/restore | admin | User |
| PUT | /api/admin/observations/:id/restore | admin | ChildObservation |
| PUT | /api/admin/attendance/:id/restore | admin | ChildAttendance |

Pattern: `Model.findOne({ where: { id }, paranoid: false })` → verify `record.schoolId === req.user.schoolId` → `instance.restore()` → `logAudit({ action: 'restore', ... })`.

**4. Access control**
School-scope check on every restore.

**5. Tests required**

| Test | Assertion |
|------|-----------|
| PUT /restore valid soft-deleted | 200, `deletedAt=null` |
| PUT /restore non-deleted record | 400 |
| PUT /restore cross-school | 403 |
| PUT /restore non-existent | 404 |

**6. Cross-portal impact**
Admin portal: restore UI is Tier 3 polish — endpoints built now, UI deferred.

**7. Risk / rollback**
Low risk. Restore is a reverse soft-delete.

**8. Acceptance criteria**

- [ ] All restore endpoints return 200 and clear `deletedAt`
- [ ] Restoring a non-deleted record returns 400
- [ ] Cross-school restore returns 403
- [ ] All listed tests pass

---

### T2-10 — Parent Data Export

**Gaps resolved:** LQ-008 | **Decision:** DEC-7 | **Effort:** 2 days

**1. Problem statement + gaps resolved**
LQ-008: whether ZRU-547 requires machine-readable personal data export. DEC-7 decision: implement JSON export endpoint covering the parent's own data and their children's records. Hard-delete beyond paranoid deferred pending legal confirmation.

**2. New database objects**
None. Reads from existing models.

**3. New endpoints or hooks**

| Method | Path | Roles |
|--------|------|-------|
| GET | /api/parent/me/export | parent |

Response: JSON file download (`Content-Disposition: attachment; filename="my-data.json"`) containing: parent user record (password excluded), linked children, children's observations (last 2 years), attendance (last 2 years), journal entries (all), emotional monitoring (all).

**4. Access control**
`req.user.role === 'parent'` only — own data only.
Rate-limited to 1 request per 24 hours (track `lastExportAt` on User or via Redis key).

**5. Tests required**

| Test | Assertion |
|------|-----------|
| GET /parent/me/export | 200, JSON includes parent + children |
| No cross-parent data leakage | scoped to own children |
| Second request within 24h | 429 |
| DB throws | 500 |

**6. Cross-portal impact**
Parent portal: "Download my data" button on account settings.

**7. Risk / rollback**
2-year cutoff for child records prevents unbounded response size. Stream response if payload exceeds 10 MB (Tier 3 enhancement).

**8. Acceptance criteria**

- [ ] Export includes parent record and all linked children's data
- [ ] No cross-parent data leakage
- [ ] 429 on second request within 24h
- [ ] All listed tests pass

---

## Section 4 — Tier 3 Plans (4-point outline)

### T3-1 — Admin Activity Feed

**1. Problem statement**
`admin/Dashboard.jsx:192,405` has TODOs for `GET /admin/me/tasks` and `GET /admin/me/activity`. Dashboard shows mock data.

**2. Planned endpoints / changes**
- `GET /api/admin/me/tasks` — pending document approvals + task count for logged-in admin
- `GET /api/admin/me/activity` — last 20 audit_log entries where `actorId = req.user.id`

**3. Tests required**
- GET /me/tasks returns pending document count; DB throws → 500
- GET /me/activity returns audit log entries scoped to admin

**4. Acceptance criteria**
- [ ] Dashboard mock data replaced with real API data
- [ ] Activity feed shows recent admin actions from audit_log

---

### T3-2 — School Logo Upload

**1. Problem statement**
`admin/Sidebar.jsx:103` has a TODO for school logo upload. No endpoint or storage mechanism exists.

**2. Planned endpoints / changes**
- `POST /api/admin/school/logo` — multipart upload, store via existing media storage, update `School.logoUrl`
- `GET /api/admin/school` — include `logoUrl` in response

**3. Tests required**
- POST valid image → 200, `logoUrl` set
- POST non-image → 400
- DB throws → 500

**4. Acceptance criteria**
- [ ] Uploaded logo URL appears in admin sidebar
- [ ] Non-image upload rejected

---

### T3-3 — Reporting / Export (operational)

**1. Problem statement**
Government and admin need CSV exports of attendance and enrollment statistics. DEC-7 covers personal data export (T2-10); this covers operational reporting.

**2. Planned endpoints / changes**
- `GET /api/government/reports/attendance?schoolId=&month=` — CSV of attendance aggregates
- `GET /api/admin/reports/overview` — school summary (enrollment, active teachers, attendance rate)

**3. Tests required**
- GET /reports/attendance: returns CSV with correct columns; cross-school government access works; admin scoped to own school

**4. Acceptance criteria**
- [ ] Government can export school-level attendance as CSV
- [ ] Admin can export school summary

---

### T3-4 — Scheduled Background Jobs

**1. Problem statement**
No scheduler exists. Needed for: import job cleanup, audit log archival, future attendance reminders.

**2. Planned endpoints / changes**
- Add `node-cron` scheduler in `app.js` startup
- Job: daily 00:00 — purge import_jobs records older than 30 days
- Job: daily — flag audit_log entries older than 7 years for archival

**3. Tests required**
- Scheduler registers jobs without crash on startup
- Purge job: records older than 30 days are removed

**4. Acceptance criteria**
- [ ] Scheduler starts with app without crashing
- [ ] Import cleanup job registered and testable in isolation

---

### T3-5 — Notification Preferences

**1. Problem statement**
Parents and teachers cannot configure notification preferences. DEC-6 adds a per-user JSONB preferences store.

**2. Planned endpoints / changes**
Migration: `ALTER TABLE users ADD COLUMN "notificationPreferences" JSONB DEFAULT '{}'`
- `GET /api/parent/me/preferences` / `PUT /api/parent/me/preferences`
- `GET /api/teacher/me/preferences` / `PUT /api/teacher/me/preferences`
PUT validates against an explicit allowlist of keys; unknown keys return 400.

**3. Tests required**
- GET returns current prefs (empty default)
- PUT valid key → 200; unknown key → 400

**4. Acceptance criteria**
- [ ] Migration adds column cleanly
- [ ] Teacher and parent can read/write preferences
- [ ] Unknown preference keys rejected

---

### T3-6 — Group Assignment Validation

**1. Problem statement**
Assigning a teacher from a different school to a group is not blocked at the API level.

**2. Planned endpoints / changes**
In existing group assignment controller: add `teacher.schoolId === group.schoolId` check → 403 if mismatch.

**3. Tests required**
- Same school → 200; different school → 403

**4. Acceptance criteria**
- [ ] Cross-school teacher-group assignment returns 403

---

### T3-7 — Child Search

**1. Problem statement**
`GET /admin/children` has no search filter. Admin and government navigate full paginated lists manually.

**2. Planned endpoints / changes**
Add `?search=` query param to `GET /api/admin/children` and `GET /api/government/children` — case-insensitive ILIKE on `firstName || ' ' || lastName`.

**3. Tests required**
- `?search=aisha` → returns matching children
- `?search=nonexistent` → empty list (not 404)

**4. Acceptance criteria**
- [ ] Search returns case-insensitive matches on first or last name
- [ ] Empty search returns all (existing behavior unchanged)

---

### T3-8 — Group Teacher School Boundary Validation

**1. Problem statement**
Group-teacher association writes do not verify the teacher belongs to the same school as the group.

**2. Planned endpoints / changes**
Extend group controller group-teacher association logic: `teacher.schoolId === group.schoolId`; 403 if mismatch.

**3. Tests required**
- Same school → 200; different school → 403

**4. Acceptance criteria**
- [ ] Cross-school group-teacher write returns 403

---

### T3-9 — Parent Emotional Monitoring Summary

**1. Problem statement**
Parents cannot see a summary of their child's emotional monitoring history. DEC-8 adds a summary endpoint.

**2. Planned endpoints / changes**
- `GET /api/parent/children/:id/emotional-monitoring/summary` — last 30 days aggregated by emotion type
- Response: `{ "success": true, "data": { "counts": { "happy": 12, "sad": 3 }, "trend": "improving" } }`

**3. Tests required**
- Parent sees own child → 200 with counts; other child → 404; empty period → zero counts

**4. Acceptance criteria**
- [ ] Summary returns counts per emotion type for last 30 days
- [ ] Cross-parent child access returns 404

---

## Section 5 — Build Order vs. Tier Priority

Tier = when the feature must be live. Build order in S7 = when it must be written.

| Build step | Item | Tier | Reason |
|-----------|------|------|--------|
| 1 | T2-1 Audit Log | 2 | Required by T1-7 (bulk import) and T2-5 (deletedBy). Must exist before any write-side features that log actions. |
| 2 | T1-1 Children List + Attendance | 1 | Unblocked. Foundation for T1-6 (same PR). |
| 3 | T1-6 Teacher Child Detail | 1 | Shares `teacherController.js` with T1-1 — same PR. |
| 4 | T1-2 Observations | 1 | Depends on Child model (exists). |
| 5 | T1-3 Reflections + Journal | 1 | Depends on Child model; shares `observations/recent` with T1-2. |
| 6 | T1-4 Admin Doc Filter | 1 | Isolated. |
| 7 | T1-5 Reception Doc Filter | 1 | Isolated. |
| 8 | T1-7 Bulk Import | 1 | Requires T2-1 audit log complete. |
| 9 | T2-2 Parent Suspension | 2 | Auth middleware change — after Tier 1 ships. |
| 10 | T2-6 EmotionalMonitoring Paranoid | 2 | Simple migration; no dependencies. |
| 11 | T2-8 Progress Paranoid | 2 | Simple migration; no dependencies. |
| 12 | T2-5 DeletedBy Attribution | 2 | Requires T2-1 + T2-6 + T2-8 (all paranoid models must exist). |
| 13 | T2-3 Goals / IEP | 2 | Requires T1-6 (child accessible via teacher endpoint). |
| 14 | T2-4 Child Transfer | 2 | Requires T2-1 audit log. |
| 15 | T2-7 School Archival | 2 | Government routes exist. |
| 16 | T2-9 Restore Endpoints | 2 | Requires T2-6 + T2-8 paranoid migrations complete. |
| 17 | T2-10 Data Export | 2 | Requires all child-linked models to exist. |
| 18–26 | T3-1 through T3-9 | 3 | Post-launch; no strict ordering among themselves. |

**Rule for S7:** Build T2-1 (Audit Log) first on day 1. No feature that writes audit entries can be merged until T2-1 is complete.

---

## Section 6 — Cross-Portal Handoffs

New entries extending `LOOP_CROSS_PORTAL.md` (existing: CP-001, CP-002, CP-003).

| CP# | Handoff | Backend produces | Portal consumes | Notes |
|-----|---------|-----------------|-----------------|-------|
| CP-004 | Teacher children list | GET /teacher/children | teacher/Attendance.jsx, teacher/ChildDetail.jsx | schoolId-scoped; `{ success, data: [...] }` shape |
| CP-005 | Attendance marking | POST /attendance, GET /attendance, PATCH /attendance/:id | teacher/Attendance.jsx | Returns `childSnapshot`; PATCH for corrections |
| CP-006 | Child observations | POST /teacher/observations, GET /teacher/observations/recent, GET /teacher/children/:id/observations | teacher/QuickObservation.jsx, teacher/DailyReflection.jsx | Private to staff; not visible to parents |
| CP-007 | Teacher reflections | POST /teacher/reflections, GET /teacher/reflections | teacher/DailyReflection.jsx | Filtered by `teacherId` — cross-teacher invisible |
| CP-008 | Parent journal | POST /teacher/journal (write), GET /parent/children/:id/journal (read) | teacher/DailyReflection.jsx (write), parent portal (read) | `isVisibleToParent` flag controls visibility |
| CP-009 | Admin doc filter | GET /admin/documents?status= | admin/DocumentApprovalQueue.jsx | Keep GET /admin/documents/pending unchanged |
| CP-010 | Reception doc filter | GET /reception/documents?status= | reception portal doc list | Additive query param — non-breaking |
| CP-011 | Bulk import | POST /admin/import/validate, POST /admin/import/start, GET /admin/import/:id/status | admin portal import UI | Frontend polls every ~3s until `status='completed'` |
| CP-012 | Parent suspension | PUT /admin/parents/:id/suspend, PUT /admin/parents/:id/activate | admin portal parent detail | Suspended parent gets 401 immediately on next request |
| CP-013 | Child goals | GET /teacher/children/:id/goals, POST /teacher/children/:id/goals | teacher/ChildDetail.jsx | ICF-CY codes — frontend displays only; no taxonomy picker in Tier 1 |
| CP-014 | School archival | PUT /government/schools/:id/archive | government portal school management | schoolScope middleware enforces `isActive` check for admin |
| CP-015 | Data export | GET /parent/me/export | parent portal account settings | JSON file download; rate-limited 1 request/24h |

---

## Section 7 — Deferred or Descoped Items

| Item | Reason deferred |
|------|----------------|
| Notification delivery (email/SMS) | DEC-6 covers preferences only. Delivery infrastructure (SMTP, SMS gateway) is DevOps work outside backend scope. Carry to Phase 3. |
| Hard-delete for personal data (ZRU-547) | LQ-008 — pending legal confirmation. Block on legal sign-off. |
| Attendance visibility to parents | Endpoints scaffolded with schoolScope; parent access control added Tier 3. |
| ICF-CY full taxonomy validation | Goals endpoint validates format only (letter + digits). Full 1,800-code taxonomy is Tier 3. |
| Goal visibility to parents | Staff access only in Tier 2. Parent view deferred. |
| Government audit log read endpoint | GET /government/audit-log deferred to Tier 3. Audit log written in Tier 2, queryable via DB until then. |
| Observation aggregation for government | `governmentController.getOverview` attendance/observation aggregates deferred to Tier 3 reporting sprint. |
| Multi-instance Socket.io | Redis adapter for Socket.io scaling listed in CLAUDE.md. Not in S7 scope. |
| Streaming data export | T2-10 returns synchronous JSON. Streaming for large payloads is Tier 3. |
| Admin journal safeguarding view | GET /admin/children/:id/journal deferred to Tier 2 secondary sprint. |
| C-02 media visibility | CLAUDE.md notes C-02 requires product/legal sign-off. Not in S7 scope. |

---

## Section 8 — Implementation Order Recommendation

Recommended sprint groupings for S7:

**Sprint A (Days 1–3): Foundation**
- Day 1 morning: T2-1 Audit Log — builds shared infrastructure; nothing else merges until complete
- Days 1–2: T1-1 + T1-6 Children List + Attendance + Teacher Child Detail — unblock teacher portal
- Day 3: T1-4 + T1-5 Document filters — quick wins

**Sprint B (Days 4–6): Teacher Portal Completion**
- Day 4: T1-2 Observations
- Days 5–6: T1-3 Reflections + Journal

**Sprint C (Days 7–10): Bulk Import**
- Days 7–10: T1-7 Bulk Import — highest Tier 1 complexity; audit log ready

**Sprint D (Days 11–16): Safeguarding & Compliance**
- Day 11: T2-6 EmotionalMonitoring Paranoid + T2-8 Progress Paranoid
- Day 12: T2-5 DeletedBy Attribution
- Days 13–14: T2-2 Parent Suspension — auth middleware change; test coverage must be complete before merge
- Day 15: T2-4 Child Transfer
- Day 16: T2-7 School Archival

**Sprint E (Days 17–20): Data Completeness**
- Days 17–19: T2-3 Goals / IEP
- Day 20: T2-9 Restore Endpoints + T2-10 Data Export

**Sprint F (Days 21–26): Post-Launch Polish (Tier 3)**
- Day 21: T3-6 + T3-8 Group validation
- Day 22: T3-7 Child Search
- Day 23: T3-1 Admin Activity Feed
- Day 24: T3-2 School Logo
- Day 25: T3-5 Notification Preferences
- Day 26: T3-3 Reporting (skeleton), T3-9 Parent Emo Summary, T3-4 Scheduled Jobs

**Verification gates:**
- After Sprint A: full test suite; teacher Attendance screen loads
- After Sprint C: full test suite; Tier 1 marked ready for teacher portal launch
- After Sprint E: full test suite; produce Tier 2 sign-off list for government acceptance
- After Sprint F: full test suite; S8 Final Verification begins

---

*Deliverable complete. 25 gaps + DEC-1 through DEC-8 covered across 26 planning items in 3 tiers. Estimated S7 effort: ~41 days.*
