# Government Portal — Step 6: Feature Plan

**Portal:** Government  
**Date:** 2026-05-21  
**Planner:** Claude Sonnet 4.6  
**Input:** `05-gap-research.md` (18 gaps, 6 PQs), product decisions from Max (PQ-1 through PQ-4 locked above)

---

## 1. Summary

| | Sprint 1 | Sprint 2 | Sprint 3 | Total |
|---|---|---|---|---|
| **Theme** | Blockers / Demo-critical | Directories + Core oversight | Workflow completeness | |
| **Items** | 2 | 5 | 5 | **12** |
| **Backend changes** | 3 | 1 | 0 | **4** |
| **Effort** | M+M+L+S+S+S = ~L | M+S+S+M+M = ~L | S+M+S+S+S = ~M | ~3L |

**Deferred (not planned):** GAP-G014 (stats snapshots), GAP-G015 (per-school warnings in SchoolDetail), GAP-G016 (warning notify button), GAP-G017 (credential re-send), GAP-G018 (initiate-message to admin) — tracked at end of this document.

**Pre-launch addition:** PL-014 (Directory PII sign-off) added to `LOOP_PRE_LAUNCH_CHECKLIST.md` in this step's commit.

---

## 2. Backend Changes (4 total)

Backend changes follow Backend loop discipline: new shape `{ success, data }`, tests shipped with the change, and revert-tests for authorization changes and privacy-boundary changes.

---

### BC-01 — IB-001 Fix: `getSchoolById` archived-school visibility

**File:** `backend/controllers/governmentController.js`

**Change:** `getSchoolById` currently queries `{ where: { id, isActive: true } }`. This causes a 404 for any archived school, making archive/reactivate a dead-end workflow — government cannot view a school it just archived.

**Fix:** Change to `{ where: { id } }` (no isActive filter). Government role has global scope; it must be able to view all schools regardless of status. The `getSchoolsStats` list view already filters `isActive: true` and can remain that way (archived schools are not part of the active platform summary). Only the single-school detail view needs the filter removed.

**Response shape after fix:** unchanged — the existing flat object plus `studentsCount`/`teachersCount`/etc. The `isActive` field is already returned (it's part of `school.toJSON()`) so the frontend can read it to render the archived badge and archive/reactivate buttons.

**Tests (new):**
```
describe('BC-01 getSchoolById archived-school visibility')
it('returns 200 with isActive=false for an archived school')
it('still returns 404 for a non-existent school ID')
it('still returns 200 for an active school')
```

**Revert-test:** Not required — this is a scoping fix (makes an endpoint less restrictive). The revert test for a restriction fix would be: confirm that the OLD behavior (404 on archived) is gone — but there's no security regression here since government is already authenticated and government-role-only.

**Effort:** S  
**Sprint:** 1  
**Dependency:** None

---

### BC-02 — New endpoint: `GET /government/audit-log`

**Purpose:** Give government role visibility into governance-relevant audit events only. The `audit_log` table contains events from all roles and actions. This endpoint applies a server-side allowlist so only safe, governance-scoped event types are ever returned.

**Allowlisted event tuples `(action, entity)`:**

| action | entity | Source |
|---|---|---|
| `archive` | `schools` | `governmentController.js` archiveSchool |
| `reactivate` | `schools` | `governmentController.js` reactivateSchool |
| `restore` | `children` | `adminRestoreController.js` (once IB-002 is fixed) |
| `restore` | `users` | same |
| `restore` | `child_observations` | same |
| `restore` | `child_attendance` | same |
| `approve_registration` | `admin_registrations` | new logAudit in approveRegistrationRequest (BC-02a) |
| `reject_registration` | `admin_registrations` | new logAudit in rejectRegistrationRequest (BC-02a) |
| `create` | `admins` | new logAudit in createAdmin (BC-02a) |
| `update` | `admins` | new logAudit in updateAdmin (BC-02a) |
| `delete` | `admins` | new logAudit in deleteAdmin (BC-02a) |
| `create` | `government_users` | new logAudit in createGovernment (BC-02a) |
| `update` | `government_users` | new logAudit in updateGovernmentUser (BC-02a) |
| `delete` | `government_users` | new logAudit in deleteGovernmentUser (BC-02a) |

**BC-02a (prerequisite):** Add `logAudit` calls to 8 functions that currently do not log:
- `approveRegistrationRequest` in `adminRegistrationController.js` — action: `approve_registration`, entity: `admin_registrations`, entityId: request.id, meta: `{ email: adminUser.email, adminUserId: adminUser.id }`
- `rejectRegistrationRequest` — action: `reject_registration`, entity: `admin_registrations`, entityId: request.id, meta: `{ reason: reason || null }`
- `createAdmin` in `adminController.js` — action: `create`, entity: `admins`, entityId: admin.id, meta: `{ email }`
- `updateAdmin` — action: `update`, entity: `admins`, entityId: id
- `deleteAdmin` — action: `delete`, entity: `admins`, entityId: id
- `createGovernment` — action: `create`, entity: `government_users`, entityId: user.id
- `updateGovernmentUser` — action: `update`, entity: `government_users`, entityId: id
- `deleteGovernmentUser` — action: `delete`, entity: `government_users`, entityId: id

Note: All logAudit calls use the `logAudit` helper which swallows errors — audit failures must never fail the request.

**Endpoint spec:**

```
GET /api/v1/government/audit-log
Auth: requireGovernment
Query params:
  action    — string, optional, must be in allowlist or 400
  entity    — string, optional, must be in allowlist or 400
  startDate — ISO date string, optional
  endDate   — ISO date string, optional
  page      — integer, optional (default 1)
  limit     — integer, optional (default 20, max 100)

Response 200:
{
  "success": true,
  "data": {
    "entries": [
      {
        "id": bigint,
        "actorId": uuid | null,
        "actorRole": string,
        "action": string,
        "entity": string,
        "entityId": uuid | null,
        "schoolId": uuid | null,
        "meta": object | null,
        "occurredAt": ISO datetime
      }
    ],
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  }
}
```

The `actorId` can be joined to the User table to get actor name. Plan: include `actor: { id, firstName, lastName, role }` via a LEFT JOIN on User. `actorId` may be null for system actions.

**Route:** mount in `governmentRoutes.js` under `router.use(requireGovernment)`:
```js
router.get('/audit-log', getAuditLog);
```
`getAuditLog` in `governmentController.js`.

**Privacy boundary test (revert-testable):**

```
describe('BC-02 audit-log server-side allowlist')
it('returns 200 with only allowlisted event types — bulk_import and parent suspension are absent')
  // seed: create an archive event AND a bulk_import event AND a parent suspension event
  // GET /government/audit-log
  // assert: entries contain archive event; do NOT contain bulk_import or parent suspension
it('returns 200 and empty list when no allowlisted events exist')
it('returns 400 when requesting an out-of-allowlist action directly')
it('returns 403 for non-government role')
it('pagination: page 2 returns different results from page 1 when total > limit')
it('filters by startDate and endDate correctly')
```

Revert-test for the allowlist: comment out the `where[Op.in]` filter, re-run — out-of-scope events would appear, test fails. That is the revert evidence.

**i18n error code:** Add `AUDIT_LOG_INVALID_FILTER` to backend i18n catalog for 400 response.

**Effort:** M (BC-02a: adding logAudit calls is S; endpoint + tests is M)  
**Sprint:** 1  
**Dependency:** None — can proceed before BC-01; both in Sprint 1

---

### BC-03 — IB-002 Fix: Restore route authorization

**File:** `backend/routes/adminRoutes.js`

**Problem:** The four restore routes are guarded by `router.use(requireAdmin)` which equals `requireRole('admin')`. Government users are rejected at the route middleware level even though `adminRestoreController.js:9` has an explicit government bypass. CP-016 as documented ("Government portal can restore across schools") is currently broken.

**Fix option chosen:** Change the four individual restore routes from the shared `requireAdmin` guard to explicit `requireRole('admin', 'government')`. Do NOT change `router.use(requireAdmin)` globally (that would expose all admin routes to government). Instead, mount the four restore routes BEFORE the global `requireAdmin` use, with their own role check:

```js
// backend/routes/adminRoutes.js — before router.use(requireAdmin)
router.put('/children/:id/restore', authenticate, requireRole('admin', 'government'), requireSchoolScope, restoreChild);
router.put('/users/:id/restore', authenticate, requireRole('admin', 'government'), requireSchoolScope, restoreUser);
router.put('/observations/:id/restore', authenticate, requireRole('admin', 'government'), requireSchoolScope, restoreObservation);
router.put('/attendance/:id/restore', authenticate, requireRole('admin', 'government'), requireSchoolScope, restoreAttendance);
```

The controller's own check (`if (req.user.role !== 'admin' && req.user.role !== 'government')`) remains as the defense-in-depth second layer per CLAUDE.md convention.

Note on `requireSchoolScope`: government role bypasses schoolScope (per CLAUDE.md — "Government role bypasses the check entirely"). So government reaches the controller; the controller enforces that government is not school-scoped (`req.user.role !== 'government'` skips the schoolId check, allowing cross-school restore).

**Tests (revert-testable):**

```
describe('BC-03 restore route authorization')
it('government user can restore a child from any school (cross-school)')
  — REVERT: comment out requireRole change → government receives 403 (pre-fix behavior)
  — RESTORE: fix back → 200
it('admin user can restore a child from their own school')
it('admin user receives 403 when restoring a child from another school')
it('teacher/reception role receives 403 (not in allowlist)')
it('unauthenticated request receives 401')
```

**Effort:** S  
**Sprint:** 2  
**Dependency:** None

---

## 3. Sprint 1 — Blockers (Demo-critical)

**Green-gate criteria:** All new tests pass; ESLint exit 0; full existing test suite still green; both new frontend pages visible in browser with correct data.

---

### S1-F01 — School archive/reactivate UI + archived badge (CP-014 + IB-001)

**What it is:** Add archive and reactivate buttons to `SchoolDetail.jsx`. Show an "Archived" badge when `school.isActive === false`. Handle the post-archive navigation correctly (government can now view the detail of an archived school after BC-01 backend fix).

**Backend dependency:** BC-01 (getSchoolById must serve archived schools). Both endpoints exist:
- `PUT /government/schools/:id/archive` → `{ success: true, data: { id, isActive: false } }` — errors: 409 SCHOOL_ALREADY_ARCHIVED
- `PUT /government/schools/:id/reactivate` → `{ success: true, data: { id, isActive: true } }` — errors: 409 SCHOOL_ALREADY_ACTIVE

**Frontend work:**

_`SchoolDetail.jsx` additions:_

1. **Archive/Reactivate button** — in the page header area, right of the school name. Conditionally rendered:
   - If `school.isActive === true`: "Maktabni arxivlash" (Archive) button, `variant="danger"`, opens ConfirmDialog
   - If `school.isActive === false`: "Maktabni qayta faollashtirish" (Reactivate) button, `variant="primary"`, opens ConfirmDialog

2. **Archived badge** — already partially present (the `isActive` badge exists from the S3 cleanup — the `span` at SchoolDetail.jsx:59-67 shows "Faol"/"Nofaol"). Verify it renders correctly for archived schools.

3. **ConfirmDialog for archive** — uses existing `@shared/components/ConfirmDialog` pattern:
   - Archive: `dialog.message = t('schoolDetail.confirmArchive', { defaultValue: "Bu maktabni arxivlashni tasdiqlaysizmi? Maktab o'qituvchi va ota-onalar uchun blokirovka qilinadi." })`
   - Reactivate: `dialog.message = t('schoolDetail.confirmReactivate', { defaultValue: 'Bu maktabni qayta faollashtirishni tasdiqlaysizmi?' })`

4. **State management:**
   - `const [archiving, setArchiving] = useState(false)`
   - `const [archiveTarget, setArchiveTarget] = useState(null)` — `'archive' | 'reactivate' | null`
   - On confirm: call `api.put(\`/government/schools/${id}/archive\`)` or `.../reactivate`
   - On success: update local `school` state (`school.isActive`) — or navigate back to `/government/schools` (simpler; user can re-enter the school detail to confirm)
   - 409 SCHOOL_ALREADY_ARCHIVED/ACTIVE: show toast with specific message

5. **Error normalization:** use `err.response?.data?.error?.detail ?? err.response?.data?.error?.code ?? t('schoolDetail.archiveError')`

**Routing note:** The `getSchoolById` fix (BC-01) must be deployed before the UI lands, otherwise archived schools still 404 in SchoolDetail. Sequence: deploy BC-01 backend → deploy UI. In practice this is one commit batch.

**UX states:**

| State | Behavior |
|---|---|
| Loading | SchoolDetail loading spinner (existing) |
| Active school | Shows "Archive" button (danger) |
| Archived school | Shows "Archived" badge + "Reactivate" button (primary) |
| Confirming | ConfirmDialog shown; buttons disabled |
| Success — archive | Toast "Maktab arxivlandi"; school.isActive flips to false |
| Success — reactivate | Toast "Maktab qayta faollashtirildi"; school.isActive flips to true |
| Error — 409 | Toast "Maktab allaqachon arxivlangan/faol" |
| Error — 5xx | Toast generic error |

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `schoolDetail.confirmArchive` | Confirm archiving this school? It will become inaccessible to teachers and parents. | Bu maktabni arxivlashni tasdiqlaysizmi? Maktab o'qituvchi va ota-onalar uchun blokirovka qilinadi. | Подтвердить архивирование школы? Учителям и родителям будет закрыт доступ. |
| `schoolDetail.confirmReactivate` | Confirm reactivating this school? | Bu maktabni qayta faollashtirishni tasdiqlaysizmi? | Подтвердить реактивацию школы? |
| `schoolDetail.archiveSchool` | Archive School | Maktabni arxivlash | Архивировать школу |
| `schoolDetail.reactivateSchool` | Reactivate School | Maktabni qayta faollashtirish | Реактивировать школу |
| `schoolDetail.archiveSuccess` | School archived | Maktab arxivlandi | Школа архивирована |
| `schoolDetail.reactivateSuccess` | School reactivated | Maktab qayta faollashtirildi | Школа реактивирована |
| `schoolDetail.archiveError` | Failed to update school status | Maktab holatini o'zgartirib bo'lmadi | Не удалось изменить статус школы |
| `schoolDetail.alreadyArchived` | School is already archived | Maktab allaqachon arxivlangan | Школа уже архивирована |
| `schoolDetail.alreadyActive` | School is already active | Maktab allaqachon faol | Школа уже активна |

**Tests (`src/__tests__/SchoolDetail.test.jsx`):**

```
it('shows Archive button for an active school')
it('shows Reactivate button for an archived school')
it('shows Archived badge for an archived school')
it('clicking Archive opens ConfirmDialog')
it('confirming archive calls PUT /government/schools/:id/archive and shows success toast')
it('confirming reactivate calls PUT /government/schools/:id/reactivate and shows success toast')
it('409 SCHOOL_ALREADY_ARCHIVED shows specific error toast')
```

Revert-test for `SchoolDetail` archive action: comment out the `api.put(.../archive)` call — clicking confirm does nothing. Test that asserts `PUT` is called fails. Restore and test passes.

**Effort:** M  
**Sprint:** 1  
**Dependencies:** BC-01 (backend fix must land first or simultaneously)

---

### S1-F02 — Government audit-log viewer page

**What it is:** A new `/government/audit-log` page in the government portal showing governance-relevant audit events with timestamp, actor, action, entity, and metadata. Paginated, filterable by action type and date range.

**Backend dependency:** BC-02 (new endpoint + BC-02a logAudit additions). The endpoint returns:
```json
{ "success": true, "data": { "entries": [...], "total", "page", "limit", "totalPages" } }
```
Each entry: `{ id, actorId, actorRole, action, entity, entityId, schoolId, meta, occurredAt, actor: { firstName, lastName, role } }`.

**Route:** New page at `/government/audit-log`. Add to `App.jsx`:
```jsx
<Route path="audit-log" element={<ErrorBoundary><AuditLog /></ErrorBoundary>} />
```
Add to `Sidebar.jsx` nav links (between Warnings and Profile, or after Warnings).

**Frontend work:**

New file: `src/pages/AuditLog.jsx`

_State:_
- `entries`, `loading`, `error`, `pagination`
- `filterAction` (string | '') — dropdown of allowlisted actions
- `filterEntity` (string | '') — dropdown of allowlisted entities
- `startDate`, `endDate` — date inputs
- `page` (integer)

_Data fetch:_ manual `useEffect` + `api.get('/government/audit-log', { params: { action, entity, startDate, endDate, page, limit: 20 } })` — same pattern as `AIWarnings.jsx`.

_Table columns:_ Date/time · Actor (name + role badge) · Action (human-readable label) · Entity + ID (abbreviated) · School (if present) · Details (expandable `meta` JSON)

_Action labels (i18n):_
- `archive` / `schools` → "Maktab arxivlandi"
- `reactivate` / `schools` → "Maktab qayta faollashtirildi"
- `approve_registration` / `admin_registrations` → "Admin ro'yxatga olish tasdiqlandi"
- `reject_registration` / `admin_registrations` → "Admin ro'yxatga olish rad etildi"
- `create` / `admins` → "Admin yaratildi"
- `update` / `admins` → "Admin yangilandi"
- `delete` / `admins` → "Admin o'chirildi"
- `create` / `government_users` → "Davlat foydalanuvchisi yaratildi"
- `update` / `government_users` → "Davlat foydalanuvchisi yangilandi"
- `delete` / `government_users` → "Davlat foydalanuvchisi o'chirildi"
- `restore` / `children` → "Bola tiklandi"
- `restore` / `users` → "Foydalanuvchi tiklandi"
- `restore` / `child_observations` → "Kuzatuv tiklandi"
- `restore` / `child_attendance` → "Davomat tiklandi"

_Empty state:_ "Hozircha audit yozuvlari yo'q" with a lock icon.

_Error state:_ retry button (pattern from AIWarnings.jsx).

_Pagination:_ "Load more" button (same pattern as MessagesTab).

_Meta expand:_ Click on a row to expand and show the `meta` JSONB as a formatted key-value list.

**Sidebar link:** Add `{ name: t('nav.auditLog', ...), href: '/government/audit-log', icon: ClipboardList }` to Sidebar.jsx nav.

**i18n keys (new, subset — add to common.json all three locales):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `auditLog.title` | Audit Log | Audit jurnali | Журнал аудита |
| `auditLog.subtitle` | Governance events — school lifecycle and account changes | Boshqaruv hodisalari | События управления |
| `auditLog.noEntries` | No audit entries found | Yozuvlar topilmadi | Записи не найдены |
| `auditLog.loadError` | Failed to load audit log | Journalni yuklashda xatolik | Не удалось загрузить журнал |
| `auditLog.filterAction` | Filter by action | Harakat bo'yicha | По действию |
| `auditLog.filterEntity` | Filter by entity | Ob'ekt bo'yicha | По объекту |
| `auditLog.colTime` | Time | Vaqt | Время |
| `auditLog.colActor` | Actor | Foydalanuvchi | Пользователь |
| `auditLog.colAction` | Action | Harakat | Действие |
| `auditLog.colEntity` | Entity | Ob'ekt | Объект |
| `auditLog.colSchool` | School | Maktab | Школа |
| `nav.auditLog` | Audit Log | Audit | Аудит |

(Full action-label keys listed in implementation; abbreviated here for planning.)

**Tests (`src/__tests__/AuditLog.test.jsx`):**

```
it('renders audit log entries from API response')
it('shows actor name and role badge')
it('renders human-readable action label for archive/schools')
it('filter by action sends correct query param')
it('load more fetches page 2 and appends results')
it('empty state shown when entries=[]')
it('error state shown on API failure with retry button')
```

**Effort:** M  
**Sprint:** 1  
**Dependencies:** BC-02 (endpoint + logAudit additions)

---

## 4. Sprint 2 — Directories + Core Oversight

**Green-gate criteria:** All Sprint 2 tests pass; full test suite green; ESLint exit 0; 3 new directory pages navigate correctly; pagination working on Schools; warning filters working.

---

### S2-F03 — Schools pagination (CP-001)

**What it is:** Replace the `?limit=999` workaround on Schools.jsx with proper pagination controls. The backend cap is `Math.min(limit, 200)` — `?limit=999` is silently capped to 200. This fix makes pagination explicit and user-visible.

**Backend dependency:** None — backend already returns `total`, `limit`, `offset` in the response.

**Frontend work (`Schools.jsx`):**

1. Change `useFetch('/government/schools?limit=999')` to local state + manual fetch with `page` state.
2. Show "Load more" button (simpler UX than page controls for a list view):
   - If `schools.length < total`: show "Ko'proq yuklash" button
   - Clicking appends next page (`offset = schools.length`)
3. The school count badge (`schools.length < total ? \`${schools.length}/${total}\` : total`) is already correct — it becomes accurate once `total` reflects the true server total.
4. The CSV export already warns if `schools.length < total` (GOV-010 ✅). No change needed there.

**State changes:**
```js
const [schools, setSchools] = useState([]);
const [total, setTotal] = useState(0);
const [offset, setOffset] = useState(0);
const [loading, setLoading] = useState(true);
const [loadingMore, setLoadingMore] = useState(false);
const LIMIT = 50; // fetch 50 at a time
```

**i18n keys:** Reuse existing `t('government.loadMore')` or add `t('schools.loadMore')` — S effort.

**Tests (`src/__tests__/Schools.test.jsx` — new file):**

```
it('shows school list from first API page')
it('shows "X/Y" badge when schools.length < total')
it('clicking Load More fetches page 2 and appends')
it('Load More button hidden when all schools loaded')
it('search filters the currently loaded schools client-side')
```

**Effort:** S  
**Sprint:** 2  
**Dependencies:** None

---

### S2-F04 — Students directory page

**What it is:** A new `/government/students` page listing all students across all schools with search, school filter, and pagination.

**Backend dependency:** `GET /government/students?limit=N&offset=M&schoolId=X` already exists.
Response: `{ success: true, data: { total, students: [{ id, firstName, lastName, dateOfBirth, schoolId, schoolName, parentName, ... }] } }`

**Frontend work:**

New file: `src/pages/Students.jsx`

_Columns:_ # · Name · Date of birth · School name · Parent name  
_Filters:_ Search (firstName/lastName), School selector (populated from schools list via `/government/schools?limit=999` for now, or loaded separately)  
_Pagination:_ Load-more pattern (50 per page)  
_Row click:_ No detail page for students in government portal — for now, no action on click  
_Empty state:_ "O'quvchilar topilmadi"

Route: `/government/students` → add to `App.jsx`. Add to Sidebar.

**PII note:** This page exposes student names, DOBs, and parent names to central government. **PL-014 (directory PII sign-off) is the launch blocker.** Build and demo OK; real-user launch requires sign-off.

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `students.title` | Students | O'quvchilar | Ученики |
| `students.subtitle` | All enrolled students | Barcha ro'yxatdagi o'quvchilar | Все зарегистрированные ученики |
| `students.colName` | Name | Ismi | Имя |
| `students.colDob` | Date of birth | Tug'ilgan sana | Дата рождения |
| `students.colSchool` | School | Maktab | Школа |
| `students.colParent` | Parent | Ota-ona | Родитель |
| `students.notFound` | No students found | O'quvchilar topilmadi | Ученики не найдены |
| `nav.students` | Students | O'quvchilar | Ученики |

**Tests (`src/__tests__/Students.test.jsx`):**

```
it('renders student list from API response')
it('shows total count badge')
it('Load More fetches next page and appends')
it('search input passes query correctly')
```

**Effort:** M  
**Sprint:** 2  
**Dependencies:** None (backend endpoint exists)

---

### S2-F05 — Teachers directory page

**What it is:** A new `/government/teachers` page listing all teachers across all schools.

**Backend dependency:** `GET /government/teachers?limit=N&offset=M` already exists.
Response: `{ success: true, data: { total, teachers: [{ id, firstName, lastName, email, phone, schoolId, ... }] } }` (password excluded).

**Frontend work:** Same pattern as Students.

_Columns:_ # · Name · School name (note: backend returns `schoolId` but not `schoolName` — may need to cross-reference from schools list, or accept schoolId display) · Email · Phone  
_Pagination:_ Load-more (50/page)

**Backend note:** `getTeachersList` (`governmentController.js:356`) returns teachers without a school name join. For the directory to show school names, either (a) the frontend cross-references loaded schools, or (b) the backend adds a school include. Plan: frontend does a schools load first (cache from Dashboard or secondary fetch) then maps schoolId → name. If schools are not loaded, show the raw schoolId. This is acceptable for the initial build.

**PII note:** Same PL-014 blocker applies.

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `teachers.title` | Teachers | O'qituvchilar | Учителя |
| `teachers.subtitle` | All teaching staff | Barcha o'qituvchilar | Весь педагогический состав |
| `teachers.colName` | Name | Ismi | Имя |
| `teachers.colSchool` | School | Maktab | Школа |
| `teachers.colEmail` | Email | Email | Email |
| `teachers.colPhone` | Phone | Telefon | Телефон |
| `teachers.notFound` | No teachers found | O'qituvchilar topilmadi | Учителя не найдены |
| `nav.teachers` | Teachers | O'qituvchilar | Учителя |

**Tests:** Same pattern as Students.

**Effort:** S (reuses Students pattern)  
**Sprint:** 2  
**Dependencies:** None

---

### S2-F06 — Parents directory page

**What it is:** A new `/government/parents` page listing all parents across all schools.

**Backend dependency:** `GET /government/parents?limit=N&offset=M` already exists.
Response: `{ success: true, data: { total, limit, offset, parents: [...] } }` (password excluded).

**PII note:** Same PL-014 blocker applies. Parents' personal data (email, phone) is particularly sensitive.

_Columns:_ # · Name · Email · Phone · Status (active/suspended)

**Tests:** Same pattern as Students.

**Effort:** S (reuses Students pattern)  
**Sprint:** 2  
**Dependencies:** None

---

### S2-F07 — AI warning filtering (school, severity, date)

**What it is:** Add filter controls to `AIWarnings.jsx` for school, severity, and date range. The backend `getWarnings` already accepts `?schoolId=`, `?severity=`, `?startDate=`, `?endDate=` — the frontend does not pass them.

**Backend dependency:** Existing `GET /ai-warnings` with optional query params. No changes needed.

**Frontend work (`AIWarnings.jsx`):**

Add a filter panel above the existing active/resolved tab bar:

1. **Severity filter** — dropdown: All / Critical / High / Medium / Low → maps to `{ critical, high, medium, low }` or empty
2. **School filter** — dropdown populated from `/government/schools?limit=999` (same call as used on Dashboard). Maps to `?schoolId=`
3. **Date range** — two date inputs: "From" and "To" → maps to `?startDate=` / `?endDate=`

When any filter changes, refetch with current `filter` (active/resolved) AND the new params.

_State additions:_
```js
const [severityFilter, setSeverityFilter] = useState('');
const [schoolFilter, setSchoolFilter] = useState('');
const [dateFrom, setDateFrom] = useState('');
const [dateTo, setDateTo] = useState('');
const [schools, setSchools] = useState([]); // for school dropdown
```

_Fetch schools_ on mount (once) via a separate `api.get('/government/schools?limit=999')` for the dropdown.

_The `load` callback_ gains `severityFilter`, `schoolFilter`, `dateFrom`, `dateTo` as additional params. They join `isResolved` in the params object.

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `warnings.filterSeverity` | Severity | Jiddiylik | Серьёзность |
| `warnings.filterSchool` | School | Maktab | Школа |
| `warnings.filterFrom` | From | Dan | С |
| `warnings.filterTo` | To | Gacha | По |
| `warnings.filterAll` | All | Barchasi | Все |
| `warnings.allSeverities` | All severities | Barcha jiddiyliklar | Все уровни |
| `warnings.allSchools` | All schools | Barcha maktablar | Все школы |

**Tests (additions to `src/__tests__/AIWarnings.test.jsx` or new file):**

```
it('passes severity param to API when severity filter selected')
it('passes schoolId param to API when school filter selected')
it('passes startDate param to API when dateFrom set')
it('refetches when filter changes')
```

**Effort:** M  
**Sprint:** 2  
**Dependencies:** BC-03 is in Sprint 2 but S2-F07 has no dependency on it

---

## 5. Sprint 3 — Workflow Completeness

**Green-gate criteria:** All Sprint 3 tests pass; full test suite green; ESLint exit 0.

---

### S3-F08 — AI warning analysis trigger

**What it is:** Add a "Run Analysis" button on `AIWarnings.jsx` that calls `POST /ai-warnings/analyze` for a selected school. Government can manually trigger a fresh analysis rather than waiting for the backend to generate warnings passively.

**Backend dependency:** `POST /ai-warnings/analyze` exists (requireRole admin/government). Body: `{ schoolId }`.
Response: `{ success: true, data: { warnings: [...created warnings] } }`.

**Frontend work (`AIWarnings.jsx`):**

Add a "Tahlil o'tkazish" (Run Analysis) button in the page header. Clicking opens a small dialog:
- School selector (required) — same schools dropdown as S2-F07
- Submit button → `api.post('/ai-warnings/analyze', { schoolId })`
- On success: show toast "Tahlil tugallandi. N ta yangi ogohlantirish yaratildi." then reload warnings list.
- On error: show error toast.

**State additions:**
```js
const [analyzeModal, setAnalyzeModal] = useState(false);
const [analyzeSchool, setAnalyzeSchool] = useState('');
const [analyzing, setAnalyzing] = useState(false);
```

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `warnings.runAnalysis` | Run Analysis | Tahlil o'tkazish | Запустить анализ |
| `warnings.analyzeTitle` | Analyze School Ratings | Maktab reytinglarini tahlil qilish | Анализ рейтингов школы |
| `warnings.analyzeSchoolRequired` | Please select a school | Maktabni tanlang | Выберите школу |
| `warnings.analyzing` | Analyzing... | Tahlil qilinmoqda... | Анализируется... |
| `warnings.analyzeSuccess` | Analysis complete. {count} new warning(s) created. | Tahlil tugallandi. {count} ta yangi ogohlantirish yaratildi. | Анализ завершён. Создано {count} предупреждений. |
| `warnings.analyzeError` | Failed to run analysis | Tahlil o'tkazib bo'lmadi | Не удалось запустить анализ |

**Tests:**

```
it('Run Analysis button is present in page header')
it('clicking Run Analysis opens dialog with school selector')
it('submitting without a school shows validation message')
it('submitting with a school calls POST /ai-warnings/analyze with schoolId')
it('on success, shows success toast with count and reloads warnings')
```

**Effort:** S  
**Sprint:** 3  
**Dependencies:** S2-F07 (shares school dropdown; load separately if S2-F07 not landed, or reuse its state)

---

### S3-F09 — Restore UI

**What it is:** A new "Restore Records" section accessible to government — allows restoring soft-deleted children, users, observations, or attendance records by UUID. Initially a minimal power-user form (enter UUID + select entity type → restore), not a full browse UI.

**Backend dependency:** BC-03 (IB-002 fix — restore routes must accept government role). Without BC-03, this UI would always 403.

**Frontend work:**

New page `src/pages/RestoreRecords.jsx` at route `/government/restore`.

_Form:_
- Entity type selector: Child / User / Observation / Attendance
- UUID input (free-form text, with basic UUID format validation)
- "Tiklash" (Restore) button
- Success: "Yozuv tiklandi" toast + clear form
- Error 404 RESTORE_NOT_FOUND: "Ushbu ID bilan yozuv topilmadi"
- Error 400 RESTORE_NOT_DELETED: "Yozuv o'chirilmagan — tiklanishi kerak emas"
- Error 403: "Ruxsat yo'q"

This is a minimal power-user tool. A full "deleted records browser" (listing soft-deleted records to pick from) is deferred as a nice-to-have; the UUID form is sufficient for Sprint 3.

Add to Sidebar as a link under Platform (or a sub-item of Platform).

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `restore.title` | Restore Records | Yozuvlarni tiklash | Восстановление записей |
| `restore.subtitle` | Restore soft-deleted records by ID | ID bo'yicha o'chirilgan yozuvlarni tiklash | Восстановление удалённых записей по ID |
| `restore.entityType` | Record type | Yozuv turi | Тип записи |
| `restore.entityChild` | Child | Bola | Ребёнок |
| `restore.entityUser` | User | Foydalanuvchi | Пользователь |
| `restore.entityObservation` | Observation | Kuzatuv | Наблюдение |
| `restore.entityAttendance` | Attendance | Davomat | Посещаемость |
| `restore.idLabel` | Record ID (UUID) | Yozuv IDsi (UUID) | ID записи (UUID) |
| `restore.submit` | Restore | Tiklash | Восстановить |
| `restore.success` | Record restored | Yozuv tiklandi | Запись восстановлена |
| `restore.notFound` | Record not found | Yozuv topilmadi | Запись не найдена |
| `restore.notDeleted` | Record is not deleted | Yozuv o'chirilmagan | Запись не удалена |
| `nav.restore` | Restore | Tiklash | Восстановить |

**Tests (`src/__tests__/RestoreRecords.test.jsx`):**

```
it('renders form with entity type selector and ID input')
it('submitting child restore calls PUT /admin/children/:id/restore')
it('submitting user restore calls PUT /admin/users/:id/restore')
it('shows success toast on 200')
it('shows RESTORE_NOT_FOUND message on 404 error')
it('shows RESTORE_NOT_DELETED message on 400 error')
it('invalid UUID format shows validation error before API call')
```

**Effort:** M  
**Sprint:** 3  
**Dependencies:** BC-03 (IB-002 fix must land in Sprint 2)

---

### S3-F10 — Rejected registration history

**What it is:** Add status filter tabs to the Registrations section of Platform.jsx so government can see approved and rejected requests alongside pending.

**Backend dependency:** `GET /government/admin-registrations?status=approved|rejected` already works — Platform.jsx just always passes `?status=pending`. The backend returns `status`, `rejectionReason`, `reviewedAt`, `reviewedBy` fields on each request.

**Frontend work (`Platform.jsx` → `RegistrationsTab.jsx`):**

1. Add a `statusFilter` state to Platform.jsx: `'pending' | 'approved' | 'rejected'` (default `'pending'`)
2. Pass it down to RegistrationsTab: `registrationFilter={statusFilter}` with a setter
3. In RegistrationsTab: add three filter tabs at the top: "Kutilayotgan" / "Tasdiqlangan" / "Rad etilgan"
4. When filter is `approved` or `rejected`: the list is read-only (no Approve/Reject buttons)
5. For `approved` entries: show the created admin's email and the approval date
6. For `rejected` entries: show the rejection reason and rejection date

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `registrations.filterPending` | Pending | Kutilayotgan | Ожидающие |
| `registrations.filterApproved` | Approved | Tasdiqlangan | Одобренные |
| `registrations.filterRejected` | Rejected | Rad etilgan | Отклонённые |
| `registrations.rejectionReason` | Rejection reason | Rad etish sababi | Причина отказа |
| `registrations.approvedAt` | Approved at | Tasdiqlangan vaqt | Дата одобрения |
| `registrations.rejectedAt` | Rejected at | Rad etilgan vaqt | Дата отказа |
| `registrations.noApproved` | No approved requests | Tasdiqlangan so'rovlar yo'q | Нет одобренных заявок |
| `registrations.noRejected` | No rejected requests | Rad etilgan so'rovlar yo'q | Нет отклонённых заявок |

**Tests (additions to `src/__tests__/RegistrationsTab.test.jsx`):**

```
it('shows filter tabs: Pending / Approved / Rejected')
it('switching to Approved tab calls API with status=approved')
it('switching to Rejected tab calls API with status=rejected')
it('approved list is read-only — no Approve/Reject buttons')
it('rejected entries show rejection reason')
```

**Effort:** S  
**Sprint:** 3  
**Dependencies:** None (backend already supports it)

---

### S3-F11 — Region/district filter on overview

**What it is:** Add a region picker to the Dashboard and Schools page that filters both the overview stats and the school list to a specific region. The backend `getOverview` already accepts `?region=` and `?district=`.

**Backend dependency:** Existing support — `getOverview` and `getSchoolsStats` both accept `?region=`. No backend change needed.

**Frontend work:**

_Dashboard.jsx:_
- Add a region selector (dropdown, populated from unique regions derived from the loaded schools list — `[...new Set(schools.map(s => s.region).filter(Boolean))]`)
- When region changes, refetch overview (`GET /government/overview?region=X`) and schools (`GET /government/schools?region=X&limit=999`)
- "All regions" as default empty option

_Schools.jsx:_
- Add region and type filters (type filter already exists; region filter is new)
- Region list derived from loaded schools (same client-side set derivation)
- Since Schools.jsx loads all schools anyway (S2-F03 load-more), region filtering can be done client-side without an extra API call. Only re-fetch if server-side filtering of the initial page is needed.

Given that Schools.jsx will load in pages after S2-F03, the simplest approach for S3 is client-side region filtering on already-loaded schools (same as the existing type filter and search). This avoids API roundtrips for filter changes.

Dashboard region filter DOES need a server refetch (overview counts are computed server-side).

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `dashboard.filterByRegion` | Filter by region | Viloyat bo'yicha | По региону |
| `dashboard.allRegions` | All regions | Barcha viloyatlar | Все регионы |
| `schools.filterByRegion` | Region | Viloyat | Регион |
| `schools.allRegions` | All regions | Barcha viloyatlar | Все регионы |

**Tests:**

```
it('Dashboard region selector triggers refetch of overview with region param')
it('Schools region filter narrows client-side filtered results')
```

**Effort:** S  
**Sprint:** 3  
**Dependencies:** S2-F03 (load-more schools lands first for the Schools client-side filter to work on a full dataset)

---

### S3-F12 — CP-019: AI translation notice

**What it is:** A one-time dismissible banner shown on first authenticated page load informing government users that the platform's Russian and Uzbek translations are AI-generated and may contain errors.

**Backend dependency:** None. Client-only via `localStorage`.

**Frontend work:**

New component: `src/components/TranslationNotice.jsx`

```jsx
const NOTICE_KEY = 'gov_translation_notice_dismissed';

const TranslationNotice = () => {
  const [visible, setVisible] = useState(() => !localStorage.getItem(NOTICE_KEY));
  if (!visible) return null;
  const dismiss = () => { localStorage.setItem(NOTICE_KEY, '1'); setVisible(false); };
  return (
    <div role="alert" className="...amber banner...">
      <p>{t('translationNotice.body', { defaultValue: "Ushbu platformaning tarjimalari sun'iy intellekt tomonidan yaratilgan va professional tekshiruvdan o'tmagan. Noto'g'ri tarjimalar uchun uzr so'raymiz." })}</p>
      <button onClick={dismiss}>{t('translationNotice.dismiss', { defaultValue: 'Tushunarli' })}</button>
    </div>
  );
};
```

Mount in `Layout.jsx` above the `<Outlet />`.

**Dismiss logic:** One-time; stores to `localStorage`. Banner does not reappear across page navigations within the session, nor on subsequent sessions. When PL-009-VERIFY is complete (translations professionally reviewed), remove the component and delete the localStorage key in a migration-like cleanup step.

**i18n keys (new):**

| Key | en | uz (UNVERIFIED) | ru (UNVERIFIED) |
|---|---|---|---|
| `translationNotice.body` | Platform translations (Russian, Uzbek) are auto-generated and may contain errors. We apologize for any inconvenience. | Ushbu platformaning tarjimalari sun'iy intellekt tomonidan yaratilgan va professional tekshiruvdan o'tmagan. Noto'g'ri tarjimalar uchun uzr so'raymiz. | Переводы этой платформы (русский, узбекский) созданы искусственным интеллектом и могут содержать ошибки. Приносим извинения за неудобство. |
| `translationNotice.dismiss` | Understood | Tushunarli | Понятно |

**Tests:**

```
it('shows banner when localStorage key is not set')
it('dismissing banner sets localStorage key and hides banner')
it('banner does not appear on remount when localStorage key is set')
```

**Effort:** S  
**Sprint:** 3  
**Dependencies:** None

---

## 6. Dependency Graph

```
BC-01 ──────────────────────────────────────────► S1-F01 (archive UI)
BC-02a (logAudit additions) ──► BC-02 (endpoint) ► S1-F02 (audit viewer)

BC-03 (IB-002 restore auth) ────────────────────► S3-F09 (restore UI)

S2-F07 (warning filters: schools dropdown) ──────► S3-F08 (analyze trigger, shares dropdown)

S2-F03 (Schools load-more) ─────────────────────► S3-F11 (region filter client-side)
```

Items with no predecessor: S2-F03, S2-F04, S2-F05, S2-F06, S2-F07, S3-F10, S3-F12 — can start immediately within their sprint.

BC-02 and S1-F02 can be committed in either order as long as both land before the sprint is tagged green (backend endpoint must exist before frontend calls it in tests).

---

## 7. i18n Summary

All new `uz` and `ru` values are **UNVERIFIED** (AI-generated per PL-009). They must be labeled in the locale files with the existing `_metadata.verification_status: "UNVERIFIED"` pattern. The `en` values are canonical.

Total new i18n keys across all 12 features: approximately 80 keys (rough count). Each sprint's implementation step must add the keys to all three locale files and run `npm run verify-i18n` to confirm 0 missing keys before the sprint is marked green.

---

## 8. Deferred (Not Planned)

| Gap | Reason for deferral |
|---|---|
| GAP-G014: Stats snapshots (`POST/GET /government/stats`) | No defined use case; backend is pre-built infrastructure. Revisit after launch. |
| GAP-G015: Per-school AI warnings in SchoolDetail | Nice-to-have enhancement to SchoolDetail. Defer to polish pass. |
| GAP-G016: Warning notify button (`POST /ai-warnings/:id/notify`) | Notification workflow not yet defined. Defer to polish pass. |
| GAP-G017: Credential re-send after registration approval | Set-password token is 24h valid. Re-generation requires new authController endpoint. Defer to polish pass. |
| GAP-G018: Government-initiated messages to admin | GovernmentMessage model is unidirectional by design. Changing direction requires product decision and new endpoint. Defer. |

---

## 9. Pre-Launch Checklist Additions

**PL-014** (added to `LOOP_PRE_LAUNCH_CHECKLIST.md` in this step's commit):

> **PL-014: Directory PII sign-off** — The Students, Teachers, and Parents directory pages (S2-F04/05/06) expose personal data (names, emails, phones, dates of birth) of students, teachers, and parents to central government users. Before these directories are used with real users, product and legal sign-off is required under ZRU-547 (the same framework as PL-001 group-wide media visibility). Directories may be built and demonstrated in the government portal UI; real-user launch with real PII requires sign-off. Status: ⬜ Not started.

---

## 10. Open Risks

| Risk | Mitigation |
|---|---|
| BC-01 changes server behavior for archived schools — if any other consumer of `getSchoolById` expects the old 404-on-archived behavior, that would break | `getSchoolById` is only called from `GET /government/schools/:id` (government-only route). No other route uses it. Risk is low. |
| BC-02 logAudit additions to adminController/adminRegistrationController may interfere with existing tests if tests check exact DB state | logAudit is a fire-and-forget helper; it swallows errors and does not affect response shape. Existing tests should be unaffected. |
| Sprint 2 adds 3 new routes and Sidebar links — Sidebar may become crowded | Plan a "secondary navigation" grouping or a collapsible section in Sidebar.jsx for the directory pages. |
| Sidebar navigation with 3+ new items (audit-log, students, teachers, parents, restore) — 5 new nav entries | Group directory pages under a collapsible "Directories" section in Sidebar or add them as subitems under an existing section. Plan this in S7 implementation. |
| CP-019 notice localStorage key persists after PL-009-VERIFY completes — stale keys on existing browsers | When PL-009-VERIFY is marked done, remove the component AND reset the localStorage key via a `localStorage.removeItem(NOTICE_KEY)` in the app init. Track this as a PL-009-VERIFY closure task. |
