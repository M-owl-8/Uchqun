# Government Portal — Step 5: Gap Research

**Portal:** Government  
**Date:** 2026-05-21  
**Researcher:** Claude Sonnet 4.6 (read current code — governmentController.js, governmentRoutes.js, aiWarningRoutes.js, adminRoutes.js, adminRestoreController.js, aiWarningController.js, all frontend pages)  
**Scope:** Post-S3 clean state. All 14 S1 findings resolved. Research identifies missing capabilities, not bugs.

---

## 1. Executive Summary

**18 gaps found: 3 Blocker · 9 Important · 6 Nice-to-have**

The Government portal is missing its most critical oversight functions. The most impactful gaps are:

1. **No school archive/reactivate UI (CP-014 — Blocker):** `PUT /government/schools/:id/archive+reactivate` exist in the backend. The frontend has no buttons. Government cannot perform a core administrative function. Compounded by a backend gap: `getSchoolById` filters `isActive: true`, causing 404 on any archived school — government cannot even view an archived school's detail page.

2. **No audit log visibility (Blocker for oversight):** Backend has a comprehensive `audit_log` table written on every school archival, parent suspension, admin approval, bulk import, etc. No GET endpoint exposes it to anyone. A national oversight portal with no audit trail visibility cannot satisfy regulatory accountability requirements.

3. **Students/Teachers/Parents directories not built (Important):** Three backend endpoints (`GET /government/students`, `/teachers`, `/parents`) return paginated cross-school directories. No frontend pages exist. A government official cannot browse the people in the system.

Remaining gaps fall into workflow completeness (warning analysis trigger, filtering, per-school detail), four known CP items, and the blocked restore path (backend route bug precedes any UI work).

---

## 2. Pass 1 — Backend Capability Gap Table

### Government routes (`governmentRoutes.js`)

| Method + Path | Consumed by frontend? | Notes if not consumed |
|---|---|---|
| `GET /government/overview` | ✅ Dashboard.jsx:44 | |
| `GET /government/schools` | ✅ Schools.jsx:14 (with `?limit=999` workaround) | |
| `GET /government/schools/:id` | ✅ SchoolDetail.jsx:12 | Only for `isActive: true` schools — archived → 404 |
| `PUT /government/schools/:id/archive` | ❌ No UI | CP-014. Endpoint: 200/404/409 with `{ success, data: { id, isActive } }` |
| `PUT /government/schools/:id/reactivate` | ❌ No UI | CP-014. Same shape |
| `GET /government/students` | ❌ No page | Returns `{ total, students: [...] }` with school/parent join. No directory page exists. |
| `GET /government/teachers` | ❌ No page | Returns `{ total, teachers: [...] }`. No directory page. |
| `GET /government/parents` | ❌ No page | Returns `{ total, limit, offset, parents: [...] }`. No directory page. |
| `GET /government/ratings` | ✅ Ratings.jsx:249 | |
| `GET /government/ratings/:schoolId` | ✅ Ratings.jsx:80 | |
| `POST /government/stats/generate` | ❌ No UI | Generates + persists a snapshot. `statType` ∈ `{ overview, schools, ratings }`, `period` ∈ `{ daily, weekly, monthly, quarterly, yearly }`. |
| `GET /government/stats` | ❌ No UI | Retrieves saved snapshots. Supports `statType`, `period`, `region`, `district`, `schoolId` filters. |
| `GET /government/admins` | ✅ Platform.jsx:90 | |
| `GET /government/admins/:id` | ✅ AdminDetails.jsx:24 | |
| `POST /government/admins` | ✅ Platform.jsx | |
| `PUT /government/admins/:id` | ✅ Platform.jsx | |
| `DELETE /government/admins/:id` | ✅ Platform.jsx | |
| `GET /government/users` | ✅ Platform.jsx:65 | |
| `POST /government/users` | ✅ Platform.jsx:182 | |
| `PUT /government/users/:id` | ✅ Platform.jsx:205 | |
| `DELETE /government/users/:id` | ✅ Platform.jsx:224 | |
| `GET /government/messages` | ✅ MessagesTab.jsx:48 | |
| `POST /government/messages/:id/reply` | ✅ MessagesTab.jsx | |
| `PUT /government/messages/:id/read` | ✅ MessagesTab.jsx:72 | |
| `DELETE /government/messages/:id` | ✅ MessagesTab.jsx | |
| `GET /government/admin-registrations` | ✅ Platform.jsx:92 (`?status=pending` only) | Approved/rejected history not shown |
| `POST /government/admin-registrations/:id/approve` | ✅ Platform.jsx:245 | |
| `POST /government/admin-registrations/:id/reject` | ✅ Platform.jsx:263 | |

### AI warning routes (`aiWarningRoutes.js`, `requireRole('admin', 'government')`)

| Method + Path | Consumed? | Notes |
|---|---|---|
| `GET /ai-warnings` | ✅ AIWarnings.jsx:94, Dashboard.jsx:45 | |
| `PUT /ai-warnings/:id/resolve` | ✅ AIWarnings.jsx:114 | |
| `POST /ai-warnings/analyze` | ❌ No UI | Triggers a new analysis for a school. Body: `{ schoolId }`. Returns `{ warnings: created[] }`. Government can call this but there is no button. |
| `POST /ai-warnings/:id/notify` | ❌ No UI | Notifies users referenced in a warning. Government can call this but there is no button. |

### Restore endpoints (`adminRoutes.js`) — **government is BLOCKED**

| Method + Path | Government accessible? | Notes |
|---|---|---|
| `PUT /admin/children/:id/restore` | ❌ Blocked | Route uses `requireAdmin` middleware (`requireRole('admin')`). Government is rejected before reaching controller. Controller has a government bypass (`if (req.user.role !== 'admin' && req.user.role !== 'government')`) but it never runs. **This is an incidental backend bug.** CP-016 states government can restore cross-school, but the route middleware prevents it. |
| `PUT /admin/users/:id/restore` | ❌ Blocked | Same issue |
| `PUT /admin/observations/:id/restore` | ❌ Blocked | Same issue |
| `PUT /admin/attendance/:id/restore` | ❌ Blocked | Same issue |

### No audit log read endpoints exist (anywhere)

There is no `GET /audit-log` or equivalent route in any route file. The `audit_log` table is write-only from the API surface — nothing exposes it to any portal. `backend/routes/` has 26 route files; none mount an audit log reader.

---

## 3. Pass 2 — Oversight Completeness

### 2.1 School monitoring

| Function | Exists | What's missing |
|---|---|---|
| List all schools | ✅ `Schools.jsx` with search + type filter | No region/district filter; no archived schools tab; `?limit=999` workaround will break at scale (CP-001) |
| Drill into school detail | ✅ `SchoolDetail.jsx` — name, type, address, stats, rating | No archive/reactivate buttons (CP-014); `getSchoolById` filters `isActive: true` so archived school → 404 |
| See all archived schools | ❌ No UI | No archived-schools list or filter. `getSchoolsStats` also filters `isActive: true`. Government has no way to see which schools it has archived. |
| Archive a school | ❌ No UI | `PUT /government/schools/:id/archive` exists, no button |
| Reactivate a school | ❌ No UI | `PUT /government/schools/:id/reactivate` exists, no button |
| See school's AI warnings | ❌ No UI | `GET /ai-warnings?schoolId=X` would work but SchoolDetail has no warnings section |
| Export school data | ✅ Schools.jsx CSV export | Works; warns if truncated (GOV-010 ✅ closed) |
| Filter by region | ❌ No UI | Backend `getOverview`/`getSchoolsStats` accept `?region=` but frontend has no region picker |

### 2.2 Safeguarding (AI warnings)

| Function | Exists | What's missing |
|---|---|---|
| View all active warnings | ✅ AIWarnings.jsx | Flat list; no per-school, per-severity, or date-range filters |
| View resolved warnings | ✅ filter tab | |
| Resolve a warning | ✅ with required note | |
| Filter by severity | ❌ No UI | Backend `getWarnings` accepts `?severity=` — no UI control |
| Filter by school | ❌ No UI | Backend accepts `?schoolId=` — no UI control |
| Filter by date | ❌ No UI | Backend accepts `?startDate=`/`?endDate=` — no UI |
| Trigger new warning analysis | ❌ No UI | `POST /ai-warnings/analyze` exists — no button |
| Notify users about a warning | ❌ No UI | `POST /ai-warnings/:id/notify` exists — no button |
| See warning trend over time | ❌ No UI | Backend has timestamps but no trend chart or date-range filtering |

### 2.3 Admin registration approval

| Function | Exists | What's missing |
|---|---|---|
| View pending requests | ✅ Platform.jsx RegistrationsTab — only `?status=pending` | |
| Approve request (creates admin) | ✅ shows credentials modal post-approval | |
| Reject request with reason | ✅ modal with optional reason | |
| View approved/rejected history | ❌ No UI | Platform.jsx loads only `?status=pending`. History of approvals is implicitly visible via the Admins tab (approved → admin created) but rejected requests are never shown. |
| Re-send credentials | ❌ No UI | Once the credential modal is dismissed, the set-password link is gone. No way to regenerate/resend. |

### 2.4 Platform statistics

| Function | Exists | What's missing |
|---|---|---|
| Total counts (schools, students, teachers, parents) | ✅ Dashboard KPI strip | Via `GET /government/overview` |
| Rating overview | ✅ Dashboard + Ratings page | |
| Regional breakdown | ✅ Dashboard regional table | Client-side computed from school list |
| Active warnings count | ✅ Dashboard KPI card | |
| Per-school student/teacher counts | ✅ Schools page and SchoolDetail | |
| Filter overview by region | ❌ No UI | Backend supports `?region=` on `/government/overview` |
| Generate + save a stats snapshot | ❌ No UI | `POST /government/stats/generate` / `GET /government/stats` are both unconsumed |
| Historical trend charts | ❌ No UI | No charting library; no time-series data exposed |
| Students/teachers/parents directory | ❌ No pages | 3 backend endpoints exist with no frontend pages |

### 2.5 Audit trail visibility

**Verdict: Government has zero audit trail visibility.**

The `audit_log` table is populated on: school archival, parent suspension, admin account suspension, bulk child imports (per row), child transfers, ChildObservation/TeacherReflection/etc. destroys. Backend S7 Sprint A created this table and the `logAudit()` helper.

**No GET endpoint exists for audit_log at any role.** There is no route to read it. Government oversight of who-did-what is completely absent. For a national government portal overseeing special-needs school compliance, this is arguably the most significant structural gap.

Evidence:
- `backend/routes/` — 26 files, grep for `audit` returns zero route definitions
- `backend/controllers/` — `logAudit` is called in 20+ locations; no `readAuditLog` controller exists
- `backend/models/AuditLog.js` — model exists with immutability overrides; no read endpoint

**Product question:** Should government be able to read the full audit log? Or only events scoped to their region? Or only school-archival and admin-management events? This is a privacy/product decision before any endpoint can be built.

### 2.6 Messaging

| Function | Exists | What's missing |
|---|---|---|
| Receive messages from admins/teachers/parents | ✅ MessagesTab.jsx | |
| Reply to messages | ✅ inline reply form | |
| Mark messages as read | ✅ "Mark read" button | |
| Delete messages | ✅ ConfirmDialog pattern | |
| Search messages | ✅ debounced search input | |
| Load more (pagination) | ✅ "Load more" button | |
| Initiate message to specific admin/school | ❌ No UI | The `POST /government/messages` endpoint allows any authenticated user to send TO government. There is no endpoint for government to send an unsolicited message TO an admin or school. This may be intentional (government only receives; all conversations are inbound). **Product question:** should government be able to initiate a message? |

---

## 4. Pass 3 — The Four CP Gaps Detailed

### CP-001 — Schools pagination

**What's missing:** Pagination controls on the Schools page. The current workaround passes `?limit=999` to the backend (from `Schools.jsx:14`), which effectively fetches all schools in one call. The backend caps at `Math.min(limit, 200)` (note: the backend uses a default of 50 but allows up to 200 via parsePagination; the `?limit=999` is capped to 200 server-side). With the current Uzbekistan deployment (likely under 50 schools), this is not an acute problem, but will fail silently at 201+ schools.

**Backend endpoint shape:**
```
GET /government/schools?limit=N&offset=M
→ { success: true, data: { schools: [...], total: N, totalReviews, globalAverageRating, limit, offset } }
```
`total` is already returned; the frontend reads `data?.total` correctly (`Schools.jsx:16`).

**Intended UX:** "Load more" button or page controls below the table. On first load, fetch default page (20–50 schools). Show "showing X of Y" badge (already partially present). Export CSV warns if not all pages loaded.

**Dependencies:** None. Backend ready. i18n functional.

**Effort:** S — table already has the pagination data; needs load-more state + button.

**Priority:** Important. The `?limit=999` workaround works now but is fragile. Should be built in S6.

---

### CP-014 — School archive/reactivate UI

**What's missing:** Archive and Reactivate buttons on `SchoolDetail.jsx`. Plus: `getSchoolById` (`governmentController.js:265`) filters `isActive: true`, so after archiving a school, navigating to its detail page returns 404. Government cannot view the school it just archived.

**Backend endpoints:**
```
PUT /government/schools/:id/archive    → { success: true, data: { id, isActive: false } }
   errors: 404 SCHOOL_NOT_FOUND, 409 SCHOOL_ALREADY_ARCHIVED
PUT /government/schools/:id/reactivate → { success: true, data: { id, isActive: true } }
   errors: 404 SCHOOL_NOT_FOUND, 409 SCHOOL_ALREADY_ACTIVE
```

**Backend fix needed (before or alongside UI):** Change `getSchoolById` to not filter by `isActive` for government role — or add a separate `GET /government/schools/:id/archived` endpoint. The most elegant fix is to remove the `isActive: true` filter for government in `getSchoolById`. Government should be able to see any school.

**Intended UX:** In SchoolDetail.jsx header area, show "Archive School" button (danger variant) if `school.isActive === true`, or "Reactivate School" button (primary variant) if `school.isActive === false`. Confirm dialog (required — irreversible operational action). On success, update `school.isActive` and show toast. Add "Archived" badge to SchoolDetail when `school.isActive === false`.

**Dependencies:** Backend `getSchoolById` must also serve archived schools to government.

**Effort:** M — ConfirmDialog pattern already established. Two API calls + state update + badge. Plus a small backend change.

**Priority:** Blocker. This is a core government function with no workaround.

---

### CP-016 — Restore UI

**What's missing:** Any UI to restore soft-deleted records (children, users, observations, attendance).

**Backend state (incidental bug):** The restore controller (`adminRestoreController.js:9`) has a government role check — `if (req.user.role !== 'admin' && req.user.role !== 'government')` — but the routes are mounted under `/admin` with `router.use(requireAdmin)` (`adminRoutes.js:54`). Government users are rejected at the middleware layer before reaching the controller. **CP-016 as documented ("Government portal can restore across schools") is currently broken at the backend level.**

**Fix order required:**
1. First fix backend: either mount restore routes under `/government` OR change `requireAdmin` to `requireRole('admin', 'government')` on the four restore routes.
2. Then build frontend UI.

**Intended UX (once backend fixed):** A "Restore" action visible to government on soft-deleted record views. Exact placement depends on whether government gets a deleted-records list view (none exists yet). Could be a standalone "Restore Records" management page.

**Dependencies:** Backend route fix must precede any frontend work.

**Effort:** L — backend fix is S; frontend requires designing a soft-deleted records discovery UX.

**Priority:** Important, but blocked. Cannot build without backend fix.

**Product question:** Does government actually need restore UI? CP-016 says yes ("Government portal can restore across schools"), but it has never been used. Is this a day-1 requirement?

---

### CP-019 — AI translation notice

**What's missing:** A one-time dismissible banner on first login informing the government user that platform translations (Russian, Uzbek) are AI-generated and unverified.

**Backend state:** No backend endpoint needed. The notice is client-only (localStorage flag for dismissal).

**Intended UX:** On first authenticated load (after login, not on every page), show a dismissible banner or modal: "Ushbu platformaning tarjimalari AI tomonidan yaratilgan va professional tekshiruvdan o'tmagan. Noto'g'ri tarjimalar uchun uzr so'raymiz." Dismiss persists in `localStorage` (key: `gov_translation_notice_dismissed`). Remove the banner once PL-009-VERIFY (professional review) is complete and the `_metadata.verification_status` is updated from `UNVERIFIED`.

**Dependencies:** None. i18n is functional (post-S3). Can be implemented immediately.

**Effort:** S — small component, localStorage flag check.

**Priority:** Important. Launch-blocking per pre-launch checklist (PL-009-VERIFY). All five portals must implement this.

---

## 5. Pass 4 — Prioritized Gap List

| ID | Description | Priority | Who feels it | When it bites |
|---|---|---|---|---|
| GAP-G001 | No school archive/reactivate UI (CP-014) | **Blocker** | Government user trying to manage school lifecycle | Day 1 of real use |
| GAP-G002 | Archived school returns 404 to government (backend `getSchoolById` isActive filter) | **Blocker** | Government user immediately after archiving a school | Same moment as archive |
| GAP-G003 | No audit log visibility anywhere | **Blocker** (for regulatory accountability) | Ministry oversight audit; any accountability review | First compliance review |
| GAP-G004 | Students directory not built (`GET /government/students`) | **Important** | Government official wanting to see enrolled population | Regular oversight use |
| GAP-G005 | Teachers directory not built (`GET /government/teachers`) | **Important** | Government official reviewing school staffing | Regular oversight use |
| GAP-G006 | Parents directory not built (`GET /government/parents`) | **Important** | Government official checking parent engagement | Regular oversight use |
| GAP-G007 | CP-001: Schools pagination (currently `?limit=999` workaround) | **Important** | Schools count > 200 | Growth to second region |
| GAP-G008 | AI warnings lack school/severity/date filtering | **Important** | Government user with many warnings trying to triage | > 20 active warnings |
| GAP-G009 | No AI warning analysis trigger (`POST /ai-warnings/analyze`) | **Important** | Government user wanting fresh analysis after new ratings | After new rating intake |
| GAP-G010 | CP-016: Restore UI — blocked by backend route bug | **Important** (blocked) | Government needing to recover accidentally deleted records | Accidental deletion event |
| GAP-G011 | CP-019: No translation notice | **Important** | All non-Uzbek government users | First login |
| GAP-G012 | No region/district filter on overview/schools | **Important** | Ministry filtering by oblast (regional office) | Multi-region deployment |
| GAP-G013 | Rejected registration history not visible | **Important** | Audit of who was rejected and why | Dispute or review |
| GAP-G014 | Stats snapshots not exposed (`POST/GET /government/stats`) | **Nice-to-have** | Government wanting historical trend comparison | Quarterly reporting |
| GAP-G015 | SchoolDetail missing school-specific AI warnings section | **Nice-to-have** | Government drilling into a school expecting to see its alerts | Deep-dive reviews |
| GAP-G016 | No AI warning notification button (`POST /ai-warnings/:id/notify`) | **Nice-to-have** | Wanting to formally notify a school of a safeguarding alert | Formal notification workflow |
| GAP-G017 | No credential re-send on registration approval | **Nice-to-have** | Approved admin who lost the set-password link | Set-password token expiry |
| GAP-G018 | No initiate-message capability (government → admin) | **Nice-to-have** | Government wanting to proactively reach an admin | Proactive communication need |

---

## 6. Open Product Questions

These questions require Max's decision before S6 can plan the corresponding features:

| # | Question | Blocks |
|---|---|---|
| PQ-1 | **Audit log access:** Should government be able to read audit events? If yes: all events, or scoped to government-role actions (school archival, admin approval), or school-scoped events? This is a privacy/regulatory decision. The backend has no read endpoint; building one requires deciding scope. | GAP-G003 |
| PQ-2 | **CP-016 necessity:** Does government actually need restore UI at launch? CP-016 documents it as needed but it has never been exercised. If yes, the backend route bug (requireAdmin blocking government) must be fixed first. | GAP-G010 |
| PQ-3 | **Students/Teachers/Parents directories scope:** Should these directories exist at all in the government portal? If yes, what columns are shown? Are they searchable, filterable by school/region, exportable? PII implications (teacher/parent personal data visible to central government) need sign-off. | GAP-G004/5/6 |
| PQ-4 | **Messaging direction:** Should government be able to initiate a message TO a specific admin or school, or is government messaging receive-only by design? The current `GovernmentMessage` model is unidirectional (others send TO government). | GAP-G018 |
| PQ-5 | **Archived schools list:** Should government have an "archived schools" tab/page, or is it sufficient to see archived status on a school's detail page (requiring knowing the ID)? The current Schools list always filters `isActive: true`. | CP-014 detail |
| PQ-6 | **Stats snapshots:** Is the `POST /government/stats/generate` feature intended for this phase, or is it deferred infrastructure? The backend exists but was built without a defined frontend use case. | GAP-G014 |

---

## 7. Incidental Bugs Found During Research

(Not S1 findings — discovered during S5 code reads. Not gaps in capability; bugs in existing code.)

| ID | Location | Issue |
|---|---|---|
| IB-001 | `backend/controllers/governmentController.js:265` | `getSchoolById` uses `{ where: { id, isActive: true } }`. Government should be able to view archived schools but gets 404. This is both a bug (breaks post-archive navigation) and the blocker for CP-014 full implementation. |
| IB-002 | `backend/routes/adminRoutes.js:54` + `adminRestoreController.js:9` | `router.use(requireAdmin)` blocks government from `/admin/*` routes. The restore controller has `government` bypass but it is unreachable. CP-016 is documented as government-accessible but is currently broken at the route layer. |

---

## 8. Summary Statistics

| Metric | Count |
|---|---|
| Backend endpoints with no frontend surface | 9 |
| Uncovered government-accessible endpoints | 6 (archive, reactivate, students, teachers, parents, stats/generate, stats, ai-analyze, ai-notify) |
| Broken backend route (government blocked) | 4 (restore endpoints) |
| Missing audit log read endpoint | — (does not exist at all) |
| Blocker gaps | 3 |
| Important gaps | 9 |
| Nice-to-have gaps | 6 |
| Open product questions | 6 |
| Incidental backend bugs | 2 |
