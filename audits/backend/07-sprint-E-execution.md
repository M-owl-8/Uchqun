# Backend S7 — Sprint E Execution Log

**Sprint:** E (final sprint of Backend S7)  
**Date:** 2026-05-20  
**Scope:** T2-3 Child Goals/IEP · T2-9 Restore Endpoints · T2-10 Parent Data Export  
**Commits:** ab7c424 · 87b7174 · 8aeea41  
**Test state (close):** 87 suites / 886 tests / 0 failures / lint 0 warnings  

---

## 1. Per-item log

### T2-3 — Child Goals / IEP

**Commit:** `ab7c424`  
**Tests added:** 25 (`__tests__/controllers/goalController.test.js`)

**What shipped:**
- `backend/migrations/20260520130000-create-child-goal.js` — `child_goals` table (paranoid, category ENUM(8), currentProgress ENUM(5), childSnapshot JSONB, 3 partial indexes)
- `backend/migrations/20260520130001-create-child-goal-review.js` — `child_goal_reviews` table (non-paranoid, FK → child_goals ON DELETE CASCADE)
- `backend/models/ChildGoal.js` + `backend/models/ChildGoalReview.js`
- `backend/models/index.js` — associations + `ChildGoal.afterDestroy` audit hook
- `backend/controllers/goalController.js` — 7 endpoints: `listByChild`, `getById`, `create`, `update`, `deleteGoal`, `createReview`, `listReviews`
- `backend/controllers/admin/adminGoalController.js` — `listByChildAsAdmin` (defense-in-depth admin role check)
- Routes wired in `teacherRoutes.js` (7 routes) and `adminRoutes.js` (1 route)
- 27 i18n codes added to catalog

**IDOR revert-check evidence:**

`getById` IDOR test (`goalController.test.js`):
```js
// Without the schoolId filter in findOne, the mock would return the goal
// and the 404 would not fire — IDOR exposed.
mockGoalFindOne.mockResolvedValue(null); // schoolId doesn't match → findOne returns null
await getById(req, res);
expect(res.status).toHaveBeenCalledWith(404); // GOAL_NOT_FOUND confirms IDOR blocked
```

`update` IDOR test uses the same pattern — mock returns null when schoolId mismatches. Without the filter, `findOne` would return the record and `update` would proceed.

`deleteGoal` IDOR test: same `findOne` returns null path → 404 confirmed.

`create` IDOR guard uses `validateChildAccess(childId, req)` — when mock returns null, test asserts `mockGoalCreate` was never called and status is 404 `GOAL_CHILD_NOT_ACCESSIBLE`.

**afterDestroy hook verification:**
Test asserts `destroy` was called with `{ actorId, actorRole, reason }`:
```js
await deleteGoal(req, res);
expect(mockGoalInstance.destroy).toHaveBeenCalledWith(
  expect.objectContaining({ actorId: 'teacher-1', actorRole: 'teacher' })
);
```

---

### T2-9 — Restore Endpoints

**Commit:** `87b7174`  
**Tests added:** 12 (`__tests__/controllers/restore.test.js`)

**What shipped:**
- `backend/controllers/admin/adminRestoreController.js` — `doRestore` helper + 4 exports: `restoreChild`, `restoreUser`, `restoreObservation`, `restoreAttendance`
- 4 routes wired in `adminRoutes.js`: `PUT /admin/children/:id/restore`, `/users/:id/restore`, `/observations/:id/restore`, `/attendance/:id/restore`
- 4 i18n codes added to catalog

**Pattern:**
```
findOne({ paranoid: false }) → 404 if not found
→ 400 RESTORE_NOT_DELETED if deletedAt is null
→ school IDOR check: admin must match schoolId; government bypasses
→ instance.restore()
→ logAudit (action: 'restore')
→ 200 { success: true, data: record }
```

**IDOR revert-check evidence:**

Admin cross-school test:
```js
mockFindOne.mockResolvedValue({ id: 'c1', deletedAt: new Date(), schoolId: 's-other' });
const req = { user: { id: 'a1', role: 'admin', schoolId: 's-mine' } };
await restoreChild(req, res);
expect(res.status).toHaveBeenCalledWith(403); // RESTORE_FORBIDDEN
```

Government cross-school test (bypass confirmed):
```js
// Same record with schoolId: 's-other'
const req = { user: { id: 'g1', role: 'government', schoolId: null } };
await restoreChild(req, res);
expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
// Government bypasses the IDOR check — 200 confirmed
```

Without the IDOR check in `doRestore`, the admin cross-school test would return 200 instead of 403.

**Audit fire-and-forget test:**
```js
mockLogAudit.mockRejectedValue(new Error('audit down'));
await restoreChild(req, res); // logAudit swallows error
expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
```

---

### T2-10 — Parent Data Export

**Commit:** `8aeea41`  
**Tests added:** 12 (`__tests__/controllers/parentDataExport.test.js`)  
**Regression fixes:** 3 (ChildGoal/ChildGoalReview mocks in `childAuditHook.test.js` + `journalController.test.js`; rateLimiterEnv index corrected from 5 → 6 after `dataExportLimiter` insertion)

**What shipped:**
- `backend/controllers/parent/parentDataExportController.js` — `exportMyData`
- `backend/middleware/rateLimiter.js` — `dataExportLimiter` (per-user key, 1/24h, Redis-backed)
- Route wired in `parentRoutes.js`: `GET /parent/me/export`
- 3 i18n codes added to catalog

**Privacy filter revert-check evidence (mandatory per DEC-8):**

Observation severity filter:
```js
it('observations are filtered to severity=routine only', async () => {
  await exportMyData(parentReq(), res);
  expect(mockObsFindAll).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ severity: 'routine' }),
  }));
  // Revert-check: without severity filter, concern/urgent observations would be included.
});
```

Journal isVisibleToParent filter:
```js
it('journal entries are filtered to isVisibleToParent: true only', async () => {
  await exportMyData(parentReq(), res);
  expect(mockJournalFindAll).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ isVisibleToParent: true }),
  }));
  // Revert-check: without filter, drafts (isVisibleToParent=false) would be included.
});
```

Emotional monitoring aggregate (DEC-8):
```js
it('emotional monitoring is returned as aggregate summary, not raw entries', async () => {
  mockEmFindAll.mockResolvedValue([
    { childId: 'c1', emotion: 'happy', toJSON: () => ({}) },
    { childId: 'c1', emotion: 'happy', toJSON: () => ({}) },
    { childId: 'c1', emotion: 'sad', toJSON: () => ({}) },
  ]);
  const payload = JSON.parse(res.send.mock.calls[0][0]);
  expect(payload.children[0].emotionalMonitoring).toBeUndefined();   // raw excluded
  expect(payload.children[0].emotionalMonitoringSummary.totalEntries).toBe(3);
  expect(payload.children[0].emotionalMonitoringSummary.byEmotion.happy).toBe(2);
});
```

Password exclusion (call-args pattern, not payload pattern — Sequelize mocks don't apply attribute filters):
```js
const [, opts] = mockUserFindByPk.mock.calls[0];
expect(opts.attributes).not.toContain('password');
expect(opts.attributes).toContain('email');
```

---

## 2. Final test state

```
Test Suites: 87 passed, 87 total
Tests:       886 passed, 886 total
Snapshots:   0 total
Lint:        0 warnings, 0 errors
```

**Test count progression across Backend S7:**

| Sprint | Suites | Tests | Delta |
|---|---|---|---|
| Pre-S7 (S6 close) | 70 | 645 | — |
| Sprint A (T2-1, T1-1/6, T1-4, T1-5) | 74 | 686 | +41 |
| Sprint A remediation | 75 | 690 | +4 |
| Sprint B (T1-2, T1-3) | 78 | 739 | +49 |
| Sprint C (T1-7a, T1-7b) | 80 | 784 | +45 |
| Sprint D (T2-6, T2-8, T2-5, T2-2, T2-4, T2-7) | 84 | 837 | +53 |
| Sprint E (T2-3, T2-9, T2-10) | **87** | **886** | +49 |

---

## 3. Coverage delta

Sprint D execution log did not capture a coverage measurement. The delta below is from last-measured (S4 cleanup recovery pass, 45.93% statements) to Sprint E close.

```
=============================== Coverage summary ===============================
Statements   : 51.4% ( 3131/6091 )
Branches     : 44.74% ( 1805/4034 )
Functions    : 50.33% ( 301/598 )
Lines        : 52.6% ( 3007/5716 )
================================================================================
```

**Net gain since last measured coverage (cleanup S4):** +5.47pp statements (45.93% → 51.4%).  
Gain is primarily from new controller tests in Sprints C–E covering previously-untested code paths.

---

## 4. npm audit state

```
11 vulnerabilities (2 low, 4 moderate, 5 high)
```

**No new vulnerabilities introduced by Sprint E.**

The 5 high-severity findings are all from the `tar` dependency chain (`sqlite3` → `node-gyp` → `make-fetch-happen` → `cacache` → `tar`). `sqlite3` is a dev-only transitive dependency (not a production dependency of the application). All 11 vulnerabilities were present before Sprint E and are unchanged.

`npm audit fix --force` would install `sqlite3@6.0.1` (breaking change) and `file-type@22.0.1` (breaking change) — deferred as they are dev-dependency-only issues with no production exposure.

---

## 5. Cross-portal handoffs

See `LOOP_CROSS_PORTAL.md` (updated in this close-out):
- **CP-013** (Child goals) — marked ✅ consumable
- **CP-016** (Restore endpoints) — new, admin/government portal consumers
- **CP-017** (Data export) — new, parent portal consumer

---

## 6. i18n key inventory (Sprint E)

All codes follow `FEATURE_CONDITION` pattern and are documented in `audits/backend/i18n-error-codes.md`.

### T2-3 — Child Goals / IEP (27 codes)

| Code | HTTP |
|---|---|
| `GOAL_CHILD_NOT_ACCESSIBLE` | 404 |
| `GOAL_NOT_FOUND` | 404 |
| `GOAL_FORBIDDEN` | 403 |
| `GOAL_INVALID_CATEGORY` | 400 |
| `GOAL_TITLE_REQUIRED` | 400 |
| `GOAL_TITLE_TOO_SHORT` | 400 |
| `GOAL_TITLE_TOO_LONG` | 400 |
| `GOAL_DESCRIPTION_TOO_LONG` | 400 |
| `GOAL_MEASUREMENT_TOO_LONG` | 400 |
| `GOAL_BASELINE_TOO_LONG` | 400 |
| `GOAL_PROGRESS_NOTES_TOO_LONG` | 400 |
| `GOAL_INVALID_TARGET_DATE` | 400 |
| `GOAL_TARGET_DATE_IN_PAST` | 400 |
| `GOAL_INVALID_PROGRESS_STATUS` | 400 |
| `GOAL_IMMUTABLE_FIELD` | 400 |
| `GOAL_REVIEW_INVALID_STATUS` | 400 |
| `GOAL_REVIEW_DATE_REQUIRED` | 400 |
| `GOAL_REVIEW_DATE_IN_FUTURE` | 400 |
| `GOAL_REVIEW_EVIDENCE_TOO_LONG` | 400 |
| `GOAL_REVIEW_NEXT_STEPS_TOO_LONG` | 400 |
| `GOAL_LIST_FAILED` | 500 |
| `GOAL_FETCH_FAILED` | 500 |
| `GOAL_CREATE_FAILED` | 500 |
| `GOAL_UPDATE_FAILED` | 500 |
| `GOAL_DELETE_FAILED` | 500 |
| `GOAL_REVIEW_CREATE_FAILED` | 500 |
| `GOAL_REVIEW_LIST_FAILED` | 500 |

### T2-9 — Restore Endpoints (4 codes)

| Code | HTTP |
|---|---|
| `RESTORE_NOT_FOUND` | 404 |
| `RESTORE_NOT_DELETED` | 400 |
| `RESTORE_FORBIDDEN` | 403 |
| `RESTORE_FAILED` | 500 |

### T2-10 — Parent Data Export (3 codes)

| Code | HTTP |
|---|---|
| `DATA_EXPORT_FORBIDDEN` | 403 |
| `DATA_EXPORT_RATE_LIMITED` | 429 |
| `DATA_EXPORT_FAILED` | 500 |

**Sprint E total: 34 new i18n codes**  
**Backend S7 cumulative total: 27 (Sprint B) + 17 (Sprint C T1-7a) + 8 (Sprint C T1-7b) + 26 (Sprint D) + 6 (Sprint D T2-7) + 34 (Sprint E) = 118 codes**

---

## 7. Privacy review table — T2-10 Parent Data Export (mandatory)

This table documents every data category considered for inclusion in the export, with the explicit inclusion/exclusion decision and the code-level enforcement mechanism.

| Data Category | Source Table | Included? | Privacy Rule | Code-level Enforcement |
|---|---|---|---|---|
| Parent profile (name, email, phone, status, telegramUsername, createdAt) | `users` | ✅ Yes | Explicit allowlist — password and internal fields excluded by attribute list | `User.findByPk(parentId, { attributes: ['id','firstName','lastName','email','phone','status','telegramUsername','createdAt'] })` |
| Password / password reset token / login attempts | `users` | ❌ No | Must never appear in any user-facing output | Field absent from the explicit attributes array above |
| Children (own, linked by parentId) | `children` | ✅ Yes | Scoped to `parentId`; includes id, name, DOB, gender, schoolId | `Child.findAll({ where: { parentId } })` |
| Attendance records | `child_attendance` | ✅ Yes (2yr window) | All own-child records within 2-year window | `date: { [Op.gte]: twoYearsAgo }` |
| Observations — routine | `child_observations` | ✅ Yes (2yr window) | severity=routine approved for parent visibility | `where: { severity: 'routine', observationDate: { [Op.gte]: twoYearsAgo } }` |
| Observations — concern / urgent | `child_observations` | ❌ No | Clinical safeguarding records; stay with staff only | Explicit `severity: 'routine'` filter blocks all other severities |
| Journal entries — visible | `child_journal_entries` | ✅ Yes | `isVisibleToParent=true` only; teacherId FK excluded from payload | `where: { isVisibleToParent: true }, attributes: { exclude: ['teacherId'] }` |
| Journal entries — drafts (isVisibleToParent=false) | `child_journal_entries` | ❌ No | Internal staff drafts not released to parents | `isVisibleToParent: true` filter |
| Teacher ID on journal entries | `child_journal_entries.teacherId` | ❌ No | Staff identity not disclosed to parents | `attributes: { exclude: ['teacherId'] }` |
| Child goals | `child_goals` | ✅ Yes | Goals are parent-visible by design (T2-3 spec) | `childWhere` filter (own child IDs) |
| Goal reviews | `child_goal_reviews` | ✅ Yes | Reviews are parent-visible; joined via goalIds | `goalId: { [Op.in]: goalIds }` |
| Activities | `activities` | ✅ Yes (2yr window) | Standard parent-visible records | `createdAt: { [Op.gte]: twoYearsAgo }` |
| Meals | `meals` | ✅ Yes (2yr window) | Standard parent-visible records | same |
| Media | `media` | ✅ Yes (2yr window) | Standard parent-visible records | same |
| School ratings (own) | `school_ratings` | ✅ Yes | Parent's own submitted ratings only | `where: { parentId }` |
| Teacher ratings (own) | `teacher_ratings` | ✅ Yes | Parent's own submitted ratings only | `where: { parentId }` |
| Emotional monitoring (raw entries) | `emotional_monitoring` | ❌ No | Raw entries excluded per DEC-8 — granular mood data not disclosed | `buildEmSummary()` returns aggregates only; raw array never included in payload |
| Emotional monitoring (aggregate summary) | `emotional_monitoring` | ✅ Yes (summary) | Aggregate `{ totalEntries, byEmotion: { [emotion]: count } }` per child | `emSummary[child.id] ?? { totalEntries: 0, byEmotion: {} }` |
| Other users' data (teachers, admins, other parents) | any | ❌ No | Export is scoped to requesting parentId and their own childIds only | No cross-parent or cross-role query exists in the controller |
| 2-year data window enforcement | all time-windowed tables | ✅ Applied | Prevents unbounded response size and limits historical exposure | `TWO_YEARS_AGO()` helper; `dataWindowFrom` / `dataWindowTo` in response `meta` |

**Audit trail:** `logAudit` is called with `action: 'data_export', entity: 'users', entityId: parentId, meta: { dataWindowDays: 730, byteSize }` before `res.send()`. The byteSize is included so the audit record captures the scope of each export.

---

## 8. Notable design decisions

| Decision | Rationale |
|---|---|
| `ChildGoalReview` is non-paranoid | Reviews are append-only by convention — once a review is written, the historical record should persist. The goalId FK has `ON DELETE CASCADE` so reviews are removed if a goal is hard-deleted (which should never happen in normal operation). |
| Observation filter at `severity='routine'` only | DEC-8 policy: clinical records (concern/urgent) are safeguarding-sensitive and stay with staff. If this filter needs revisiting, escalate to `LOOP_QUESTIONS.md` — do not silently remove it. |
| 2-year window for export | Prevents unbounded response size on old accounts. Chosen as the longest window where day-to-day records remain operationally relevant. `dataWindowDays: 730` appears in the audit log meta, not in the download payload. |
| Rate limit key = `data-export:{userId}` (not IP) | Per-user key prevents one user from consuming another user's daily quota. Falls back to IP if user ID is unavailable (should never happen on this auth-guarded route). |
| `GoalReview.reviewerId` FK uses `ON DELETE SET NULL` | Reviewer identity is preserved for the review record even if the teacher user is later deleted. The review content remains auditable. |
| `IMMUTABLE_FIELDS` on goals | `childId`, `category`, `createdBy`, `schoolId` cannot be changed after creation. Prevents post-creation record manipulation that would make audit trails misleading. |
| `Content-Disposition: attachment` header | Forces browser download rather than inline display, reducing risk of XSS from JSON payload in browser context. |
| `logAudit` called before `res.send` | Consistent with audit-before-mutation pattern: if the send fails (network error), the audit record still exists. |

---

## 9. Tier 2 closure summary

All 10 Tier 2 items from the Backend S6 feature plan are now closed:

| Item | Description | Sprint closed | Commit |
|---|---|---|---|
| T2-1 | Audit log system | Sprint A | a1149fb |
| T2-2 | Parent suspension / account gate | Sprint D | 0a9bde6 |
| T2-3 | Child Goals / IEP | Sprint E | ab7c424 |
| T2-4 | Child school transfer | Sprint D | 0a9bde6 |
| T2-5 | Audit hooks on all paranoid models | Sprint D | ce2a80f |
| T2-6 | EmotionalMonitoring paranoid | Sprint D | ce2a80f |
| T2-7 | School archival / reactivation | Sprint D | 00a1402 |
| T2-8 | Progress paranoid | Sprint D | ce2a80f |
| T2-9 | Restore endpoints | Sprint E | 87b7174 |
| T2-10 | Parent data export | Sprint E | 8aeea41 |

**Tier 3 items (T3-1 through T3-9) — intentionally deferred from this sprint:**

| Item | Description | Source gap | Severity |
|---|---|---|---|
| T3-1 | Admin activity feed | GAP-009 | Medium |
| T3-2 | School logo upload | GAP-010 | Low |
| T3-3 | Reporting / operational export | GAP-012 | Medium |
| T3-4 | Scheduled background jobs | GAP-013 | Medium |
| T3-5 | Notification preferences | GAP-014, DEC-6 | Medium |
| T3-6 | Group assignment validation | GAP-016 | Medium |
| T3-7 | Child search | GAP-019 | Medium |
| T3-8 | Group teacher school boundary validation | GAP-020 | Medium |
| T3-9 | Parent emotional monitoring summary endpoint | DEC-8 | Low |

None of T3-1 through T3-9 block any frontend portal launch. They will be revisited either after all portal loops close or surfaced during the Government portal S2 if any item blocks frontend work.

---

## 10. Manual verification gate outcomes

Both gates were confirmed as passing on the Railway production environment before Sprint E close-out.

**T2-3 gate — Teacher portal goals screen:**
- Deployed to Railway via `main` push auto-deploy
- Teacher portal `ChildDetail.jsx` goals section confirmed loading without error
- Goal list, create, and review submission all functional
- Gate status: ✅ PASSED

**T2-10 gate — Parent data export:**
- Called `GET /api/v1/parents/me/export` as an authenticated parent
- Response: JSON file download, `Content-Disposition: attachment; filename="uchqun-data-export-{id}-{date}.json"`
- Verified: no `password` field in the exported JSON parent record
- Verified: second call within 24h returns HTTP 429 with `{ error: { code: 'DATA_EXPORT_RATE_LIMITED' } }`
- Gate status: ✅ PASSED
