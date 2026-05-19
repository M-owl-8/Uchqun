# Backend S5: Gap Research

**Generated:** 2026-05-19
**Status:** ✅ Complete
**Method:** Frontend portal code survey (4 portals), backend route/controller audit, safeguarding-question checklist, API surface completeness walk
**Evidence standard:** Every gap is cited with file:line from current code. "No evidence" gaps are in Section 7.

---

## Section 1 — Backend's User Model

The Backend serves six consumer types: **Government** (platform-wide oversight, school/admin management), **Admin** (school-level manager; controls reception accounts), **Reception** (school operator; creates parents, teachers, assigns groups), **Teacher** (primary data producer; records activities, meals, media, emotional monitoring), **Parent** (read-only consumer of child data, AI chat, ratings), and **Business** (cross-school aggregate statistics). The seventh consumer is **operational scripts** — the 22 scripts in `scripts/` that cover tasks too sensitive or infrequent for an API.

"Complete" for this Backend means: every screen in every portal can load real data without workarounds; every lifecycle event (enrolment, transfer, departure, safeguarding hold) has a supported API path; admins and government users can perform their duties without needing a developer to run a script; and the data model around vulnerable children preserves an auditable trail.

The current Backend is strong in its core data-recording paths (activities, meals, media, emotional monitoring, therapy) and in its security model (school-scoped access, IDOR guards, JWT rotation). The gaps are almost entirely in: (a) **teacher-portal functionality** — several whole screens call endpoints that simply do not exist; (b) **admin document filtering** — the document approval UI is partially broken; and (c) **child and user lifecycle management** — no audit trail, no suspension mechanism, no transfer workflow.

---

## Section 2 — Workflow Gap Inventory

### Area 1 — Consumer-portal gaps

| ID | Area | Description | Evidence | Affected portals | Severity | Effort |
|---|---|---|---|---|---|---|
| BACKEND-GAP-001 | 1 | `GET /teacher/children` does not exist. Teacher portal Dashboard and Attendance pages both call this endpoint to list the teacher's group children. | `teacher/src/pages/Dashboard.jsx:150,163` — `api.get('/teacher/children', ...)` both marked `TODO(phase-2)`; `teacher/src/pages/Attendance.jsx:33` — `api.get('/teacher/children')`. `teacherRoutes.js` has no `/children` route. | Teacher | Blocker | S |
| BACKEND-GAP-002 | 1 | No observations model or endpoints. Teacher portal DailyReflection page calls `GET /teacher/observations/recent` and `POST /teacher/observations`. Dashboard calls `GET /teacher/observations/recent?limit=8`. No Observation model exists and `teacherRoutes.js` has no `/observations` route. | `teacher/src/pages/DailyReflection.jsx:76` — `api.get('/teacher/observations/recent?limit=20')` marked `TODO(phase-2)`; `teacher/src/pages/Dashboard.jsx:151,164` — same endpoint marked `TODO(phase-2)`; `teacher/src/components/QuickObservation.jsx:65,78` — `GET /teacher/children/:id/goals` + `POST /teacher/observations`. `teacherRoutes.js:1-84` — no observations route. | Teacher | Blocker | M |
| BACKEND-GAP-003 | 1 | No attendance recording endpoint. Teacher portal Attendance page calls `POST /attendance` to submit daily attendance records. No attendance model, route, or controller exists in the backend. | `teacher/src/pages/Attendance.jsx:70` — `api.post('/attendance', { records })`. `teacher/src/App.jsx:95` — route `attendance` exists in the app. No `/attendance` route in any of the 25 backend route files. | Teacher | Blocker | M |
| BACKEND-GAP-004 | 1 | No child goals/IEP endpoint. Teacher portal ChildDetail and QuickObservation call `GET /teacher/children/:id/goals`. No Goal or IEP model exists. | `teacher/src/pages/ChildDetail.jsx:151` — `api.get('/teacher/children/${id}/goals')` marked `TODO(phase-2)`; `teacher/src/components/QuickObservation.jsx:64-65` — same endpoint. `teacherRoutes.js:1-84` — no `/children/:id/goals` route. `childRoutes.js` has no goals sub-route. | Teacher | Blocker | L |
| BACKEND-GAP-005 | 1 | No teacher reflections/journal endpoints. Teacher DailyReflection page posts private journal entries to `POST /teacher/reflections` and public parent-visible journal entries to `POST /teacher/journal`. Neither endpoint exists. | `teacher/src/pages/DailyReflection.jsx:102` — `api.post('/teacher/reflections', ...)`. `:115` — `api.post('/teacher/journal', payload)`. `teacherRoutes.js:1-84` — no `/reflections` or `/journal` routes. | Teacher | Blocker | M |
| BACKEND-GAP-006 | 1 | Admin document status filter missing. Admin portal DocumentApprovalQueue calls `GET /admin/documents?status=approved` and `GET /admin/documents?status=rejected` to populate the Approved and Rejected tabs. `adminRoutes.js` only has `GET /documents/pending` (status hard-coded as `'pending'` in `getPendingDocuments`). The Approved and Rejected tabs always fail silently. | `admin/src/pages/DocumentApprovalQueue.jsx:127-129` — three parallel calls; only the pending one maps to a real route. `adminRoutes.js:61-64` — no generic `GET /documents` with status param. `adminReceptionController.js:72-78` — `getPendingDocuments` has `where: { status: 'pending' }` hard-coded. | Admin | Blocker | S |
| BACKEND-GAP-007 | 1 | Reception document status filter missing. Reception portal Dashboard calls `/reception/my-documents?status=pending` (noted in a TODO comment) for the pending count, but falls back to fetching all documents and filtering client-side. `getMyDocuments` ignores any `status` query param. | `reception/src/pages/Dashboard.jsx:44-45` — `api.get('/reception/my-documents', {...}).catch(...)` with TODO comment about `?status=pending`. `receptionController.js:55-63` — `getMyDocuments` only queries `{ userId: req.user.id }`, no status filter. | Reception | Medium | S |
| BACKEND-GAP-008 | 1 | No `GET /teacher/children/:id` endpoint. Teacher portal ChildDetail page calls `/teacher/children/:id` to fetch a single child's data. No such route exists; the closest is `GET /child/:id` (unauthenticated role-check). The frontend uses the wrong namespace. | `teacher/src/pages/ChildDetail.jsx:150` — `api.get('/teacher/children/${id}')`. `teacherRoutes.js` has no `/children/:id` route. `childRoutes.js:14` has `GET /:id` with no teacher-specific scoping. | Teacher | High | S |
| BACKEND-GAP-009 | 1 | Admin activity/task feed is mocked. Admin portal Dashboard uses a hardcoded `MOCK_ACTIVITY` array with TODOs for `/admin/me/tasks` and `/admin/me/activity`. These endpoints do not exist. | `admin/src/pages/Dashboard.jsx:41-47` — `MOCK_ACTIVITY` array. `:192` — `TODO(phase-2): wire to a real /admin/me/tasks endpoint`. `:405` — `TODO(phase-2): wire to /api/v1/admin/me/activity once backend supports it`. `adminRoutes.js:1-79` — no `/me/tasks` or `/me/activity` route. | Admin | Medium | S |
| BACKEND-GAP-010 | 1 | No school logo upload. Admin portal Sidebar has a TODO for replacing the placeholder logo with a real school logo upload. Schools have no logo field and there is no file upload endpoint for schools. | `admin/src/components/Sidebar.jsx:103` — `TODO(phase-2): replace with actual school logo once upload feature exists`. `School.js` model — no `logo` or `avatarUrl` field. No school file-upload route in `adminRoutes.js`. | Admin | Low | S |

### Area 3 — Operational and admin tooling gaps

| ID | Area | Description | Evidence | Affected portals | Severity | Effort |
|---|---|---|---|---|---|---|
| BACKEND-GAP-011 | 3 | No bulk parent/teacher import. Reception creates parents one at a time via `POST /reception/parents`. For schools with 100+ parents to onboard, there is no CSV or batch-import endpoint. The 22 scripts include `create-reception.js`, `create-teacher.js` as one-off dev tools, not importable APIs. | `receptionRoutes.js:43-50` — only single-record `POST /parents`. `scripts/create-reception.js` exists as a manual script but has no API wrapper. | Reception | High | M |
| BACKEND-GAP-012 | 3 | No data export (CSV/PDF). Government and Admin portals display statistics and lists but have no way to export data. Every report requires a developer to write a SQL query. No `/export` route or CSV-generating controller exists. | No `export` or `csv` pattern found in any of the 25 route files (confirmed via full route file grep). `scripts/cleanup-audit.js` and `cleanup-audit-v2.js` are read-only audit tools but produce no downloadable output. | Government, Admin | High | M |
| BACKEND-GAP-013 | 3 | No scheduled background jobs. No cron or job scheduler exists. Operations that should run on schedule — weekly parent digest, document-approval reminders, auto-deactivation of idle accounts, monthly stats snapshot — require either manual API calls or no mechanism at all. | `package.json` — no `node-cron`, `bull`, `agenda`, or similar scheduler dependency. `scripts/` directory contains only one-off tools, no recurring jobs. | All | Medium | L |
| BACKEND-GAP-014 | 3 | No notification preferences. Users receive all socket events with no ability to configure which notification types they want or via what channel (in-app vs email). The `Notification` model has `type` and `message` fields but no user preference table. | `notificationController.js` — `createNotification` called by 4+ controllers without checking user preferences. No `notification_preferences` table in any of the 55 migrations. | All | Low | M |

### Area 4 — API surface completeness gaps

| ID | Area | Description | Evidence | Affected portals | Severity | Effort |
|---|---|---|---|---|---|---|
| BACKEND-GAP-015 | 4 | No child-transfer-between-schools endpoint. `PUT /child/:id` can technically update `schoolId` but there is no dedicated transfer endpoint, no validation that the new school exists and is active, and no audit record of the transfer. | `childRoutes.js:28-35` — `PUT /:id` routes through `updateChild`. `childController.js` — no mention of schoolId transfer validation or pre/post school audit. | Admin, Reception | High | S |
| BACKEND-GAP-016 | 4 | No child-to-group assignment endpoint. `Child.groupId` is a FK but there's no `PUT /child/:id/group` or `PUT /groups/:id/children` endpoint. Group assignment happens inline via child update, with no check that the target group belongs to the same school. | `groupRoutes.js:24-53` — GET/POST/PUT/DELETE for groups but no `/groups/:id/children` sub-route. `childRoutes.js` — no `/group` sub-route. `receptionParentController.js` — handles groupId inline during parent creation. | Reception | Medium | S |
| BACKEND-GAP-017 | 4 | No restore endpoint for soft-deleted records. Paranoid models (`User`, `Child`, `Activity`, `Meal`, `Media`, `Document`, `ChatMessage`, `Therapy`, `TherapyUsage`, `ChildAssessment`, `ServicePlan`, `MealPlan`) all support Sequelize `.restore()` but no controller exposes a restore endpoint. Accidental deletions require direct DB surgery. | `activityRoutes.js`, `mealRoutes.js`, `mediaRoutes.js`, `childRoutes.js` — all have DELETE but no `PUT /:id/restore`. Sequelize docs confirm `Model.restore()` is available for paranoid models. | Admin, Reception | Medium | S |
| BACKEND-GAP-018 | 4 | No generic admin document list. `GET /admin/documents/pending` is status-hardcoded. There is no `GET /admin/documents` with optional `?status=` filter that returns all documents across all statuses with pagination. | `adminRoutes.js:61-64` — only `GET /documents/pending` and `GET /receptions/:id/documents`. `adminReceptionController.js:72-78` — `getPendingDocuments` hardcodes `where: { status: 'pending' }`. | Admin | Blocker | S |
| BACKEND-GAP-019 | 4 | No child search endpoint. Reception and admin can view a parent's children but cannot search for a child by name, disability type, or group across the school. The only child lookup is by `parentId` (via `GET /parent/children`) or direct `GET /child/:id`. | `childRoutes.js:13` — `GET /` is parent-only. `receptionParentController.js` — returns parent list with nested children but no standalone child search. `adminRoutes.js` — no `/children` route at all. | Admin, Reception | Medium | S |
| BACKEND-GAP-020 | 4 | Teacher group assignment not validated for school boundary. `Group.teacherId` can be set via `PUT /groups/:id` but `groupController.js` does not verify the new teacher is in the same school as the group. | `groupRoutes.js:45-52` — `PUT /:id` routes to `updateGroup`. `groupController.js` — update path does not call `schoolWhere()` or validate `teacher.schoolId === group.schoolId`. | Reception, Admin | Medium | S |

---

## Section 3 — Safeguarding Gaps

These gaps directly affect vulnerable children in a special-education environment.

| ID | Description | Evidence | Severity | Effort | Safeguarding impact |
|---|---|---|---|---|---|
| BACKEND-GAP-S01 | **Parent account suspension without deletion.** No endpoint exists to set `isActive = false` on a parent account. The only option is paranoid-delete, which destroys the parent's relationship with the child record. | `middleware/auth.js:95` — parent `isActive` check bypassed (intentional design). `adminReceptionController.js:256,338` — `deactivateReception` exists for receptions but no equivalent for parents. LQ-001 in `LOOP_QUESTIONS.md`. `adminRoutes.js` — no `/parents/:id/deactivate`. | High | S | In custody disputes, court orders, or abuse investigations, an admin may need to suspend a parent's portal access immediately without deleting their account or child data. Soft-delete removes the parent permanently — no safe "pause" option. Real-world scenario: court grants emergency custody change; the non-custodial parent's account must be locked without losing historical activity logs. |
| BACKEND-GAP-S02 | **Child transfer between schools leaves no audit trail.** `PUT /child/:id` allows `schoolId` to be changed with no record of who made the change, why, or when. | `childController.js` — `updateChild` does not record `updatedBy` or log the school change specifically. `Child.js` model — no `previousSchoolId`, `transferredAt`, or `transferredBy` field. No migration adds audit columns to `children`. | High | S | Children in special education move between schools for reasons including family relocation, program fit, and safeguarding interventions. Without an audit trail, it is impossible to reconstruct a child's school history or verify that a transfer was authorized. |
| BACKEND-GAP-S03 | **Paranoid deletes record `deletedAt` but not `deletedBy`.** No controller logs who deleted a sensitive record (child, activity, therapy usage, emotional monitoring). | All paranoid controllers (`activityController.js`, `mediaController.js`, `therapyController.js`, `childController.js`) call `record.destroy()` without writing `deletedBy = req.user.id` anywhere. No `deletedBy` column exists in any migration. | High | M | If a teacher or admin deletes activity records or emotional monitoring entries for a child, there is no record of who did it. In safeguarding investigations, this gap prevents accountability. |
| BACKEND-GAP-S04 | **`EmotionalMonitoring` is NOT paranoid — records can be hard-deleted.** The `emotional_monitoring` table has no `deletedAt` column. `deleteMonitoring` calls `record.destroy()`, permanently deleting the record with no possibility of recovery. | `EmotionalMonitoring.js` — `paranoid: false` (from 00-understanding.md, confirmed: no `deletedAt` in `20260115000000-create-emotional-monitoring.js`). `emotionalMonitoringController.js` — `deleteMonitoring` at approx. line 390 calls `record.destroy()`. | High | S | Emotional monitoring records track a child's psychological states over time. Hard deletion destroys this history permanently. In a safeguarding context (suspected emotional abuse), a teacher or admin who is themselves under investigation could delete evidence. |
| BACKEND-GAP-S05 | **No school archival state.** `School.isActive` exists but there's no "archived" school state that prevents new enrollments while preserving existing records. No API endpoint enforces a school-closing workflow. | `School.js` — `isActive: { type: DataTypes.BOOLEAN, defaultValue: true }`. No `archivedAt`, `archivedBy`, or `archivalReason` field. `adminUserController.js` — manages user accounts but no school lifecycle endpoint. No migration ever adds an `archivedAt` column. | Medium | M | When a school closes, children need to be transferred. Without a formal archive state, the only options are: (a) delete the school (destroying child records) or (b) leave it active (new data can still be created). Children left in a "closed" school become invisible to the new school's admin. |
| BACKEND-GAP-S06 | **`Progress` record has no soft-delete.** The `Progress` model stores a child's academic/social/behavioral progress summary. It is NOT paranoid — `progress.destroy()` is a hard delete. | `Progress.js` — `paranoid: false` (from 00-understanding.md). No `deletedAt` in `20260401000000-expand-child-profile.js`. | Medium | S | A child's development progress record is clinically significant. Hard deletion destroys it without trace. |

---

## Section 4 — Cross-Portal Coordination Implications

| Gap ID | Capability needed | Portals that would consume it |
|---|---|---|
| BACKEND-GAP-001 | `GET /teacher/children` | Teacher (Dashboard, Attendance, ChildDetail) |
| BACKEND-GAP-002 | Observation model + CRUD endpoints | Teacher (Dashboard, DailyReflection, QuickObservation) |
| BACKEND-GAP-003 | Attendance model + `POST /attendance` + `GET /attendance` | Teacher (Attendance page); potentially Admin/Government for reporting |
| BACKEND-GAP-004 | Child goals/IEP model + CRUD | Teacher (ChildDetail, QuickObservation); Parent (to view child goals) |
| BACKEND-GAP-005 | Teacher reflections model + journal model | Teacher (DailyReflection); potentially Admin read-only |
| BACKEND-GAP-006, BACKEND-GAP-018 | Generic `GET /admin/documents?status=X` | Admin (DocumentApprovalQueue) |
| BACKEND-GAP-007 | `?status=` filter on `GET /reception/documents` | Reception (Dashboard, Documents page) |
| BACKEND-GAP-008 | `GET /teacher/children/:id` scoped endpoint | Teacher (ChildDetail); or fix frontend to use `GET /child/:id` |
| BACKEND-GAP-009 | Admin activity feed + tasks endpoints | Admin (Dashboard) |
| BACKEND-GAP-010 | School logo upload | Admin (Sidebar, profile); Government (school listings) |
| BACKEND-GAP-011 | Bulk parent/teacher import | Reception; potentially Admin |
| BACKEND-GAP-012 | CSV/PDF export | Government (analytics); Admin (reports); potentially Reception (parent list) |
| BACKEND-GAP-015 | Child school-transfer endpoint | Admin, Reception |
| BACKEND-GAP-017 | Restore endpoint for paranoid models | Admin, Reception (accidental delete recovery) |
| BACKEND-GAP-019 | Child search by name/type/group | Admin, Reception |
| BACKEND-GAP-S01 | Parent suspension | Admin (parent management page) |
| BACKEND-GAP-S02 | Child transfer audit trail | Government (audit views); Admin |
| BACKEND-GAP-S03 | `deletedBy` on paranoid deletes | Government audit; Admin; Internal operations |
| BACKEND-GAP-S04 | `EmotionalMonitoring` paranoid + restore | Teacher, Admin, Government audit |

---

## Section 5 — Prioritized Top 10

Ranked by: severity × user impact ÷ effort.

| Rank | Gap ID | Why it ranks here | What closing it unlocks | Dependencies |
|---|---|---|---|---|
| 1 | BACKEND-GAP-006 + BACKEND-GAP-018 | Admin DocumentApprovalQueue shows only the Pending tab — Approved and Rejected tabs call routes that don't exist and silently fail. This is a **current production bug** (Blocker, S effort). | Full document audit trail visible to admin. Approved/rejected tabs functional. | None |
| 2 | BACKEND-GAP-001 | Teacher Dashboard and Attendance page both call `GET /teacher/children`. Without it the Dashboard child-list section is empty and the Attendance page is completely non-functional. S effort — one controller function + one route. | Teacher Dashboard populated; Attendance page functional. | Depends on group → children query already available in `groupController.js`. |
| 3 | BACKEND-GAP-003 | Teacher Attendance page calls `POST /attendance` to a non-existent endpoint. The page exists, has a full UI, and is completely broken. M effort (needs Attendance model + migration + controller). | Attendance recording live; feeds into government reporting and parent visibility. | Needs BACKEND-GAP-001 first (need child list to mark attendance against). |
| 4 | BACKEND-GAP-S01 | Parent suspension is a safeguarding gap with real-world legal implications (custody, court orders). S effort — add `PUT /admin/parents/:id/deactivate`, remove the auth middleware bypass if `isActive` is to be enforceable for parents. | Admins can act on safeguarding concerns without deleting data. LQ-001 closed. | Requires product decision on whether parent `isActive` bypass in `middleware/auth.js:95` should be removed. See BACKEND-GAP-SQ-001. |
| 5 | BACKEND-GAP-S04 | EmotionalMonitoring records are hard-deleted with no recovery path. Fix is a migration to add `deletedAt` (S effort) + update `EmotionalMonitoring.js` to `paranoid: true`. | Emotional monitoring records become recoverable; deletion actor can be logged. | None — self-contained model change. |
| 6 | BACKEND-GAP-S03 | Adding `deletedBy` to paranoid deletes is M effort (model field + migration + controller updates) but protects all sensitive records from unattributed deletion. | Accountability for deletion of child records, activities, therapy records. | Sequelize doesn't support `deletedBy` natively — requires hooks or manual controller updates. |
| 7 | BACKEND-GAP-002 | Teacher DailyReflection page calls 3 non-existent endpoints. The page exists and is visible in the nav but partially non-functional. M effort (new model + controller + routes). | DailyReflection page fully functional; teacher documentation workflow live. | Requires product decision on observation data model (BACKEND-GAP-SQ-002). |
| 8 | BACKEND-GAP-011 | Bulk import is the highest-impact operational gap. Onboarding a 30-parent school takes 90 manual form submissions. M effort for CSV import with validation. | Dramatically faster school onboarding; reduces human error. | None. |
| 9 | BACKEND-GAP-019 | Child search across a school is needed by both reception (finding a specific child quickly) and admin (verifying enrollments). S effort — add `GET /admin/children?search=&groupId=&disabilityType=`. | Children are discoverable without scrolling a full parent list. | None. |
| 10 | BACKEND-GAP-017 | Soft-delete restore endpoints are S effort each and prevent permanent data loss from accidental admin action. | Recovery path for accidentally deleted activities, children, documents. | None — Sequelize `.restore()` is already available, just needs a route + controller. |

---

## Section 6 — Items That Need User/Product Input

Added to `LOOP_QUESTIONS.md` as LQ-002 through LQ-009.

| LQ ID | Question | Raised by | Impact if not decided |
|---|---|---|---|
| LQ-002 | Should parent accounts be suspendable without deletion? If yes, does the `isActive` bypass in `middleware/auth.js:95` need to be removed simultaneously? | BACKEND-GAP-S01 | Cannot design parent suspension endpoint until the auth middleware change is approved. |
| LQ-003 | Teacher reflections (`POST /teacher/reflections`) — are these private to the teacher, or visible to the admin/government? If visible, to what level of detail? | BACKEND-GAP-005 | Cannot determine access control for the reflections model. |
| LQ-004 | Teacher journal (`POST /teacher/journal`) sent to parents — is this a free-text message or a structured daily summary? Should parents see a history or only the latest entry? | BACKEND-GAP-005 | Cannot determine the data model (message vs structured entry) or retention rules. |
| LQ-005 | Child goals/IEP (`GET /teacher/children/:id/goals`) — what is the data model? Who can set goals (teacher only, teacher + admin)? Are goals tied to the annual service plan (already modelled as `ServicePlan`) or are they a separate concept? | BACKEND-GAP-004 | Cannot design the goals endpoint without knowing if it maps to `ServicePlan` or needs a new model. |
| LQ-006 | Attendance — is attendance a daily present/absent binary, or a richer record (late, excused, reason)? Is attendance visible to parents? Is it reported to government? | BACKEND-GAP-003 | Cannot design the Attendance model without knowing the required fields and visibility rules. |
| LQ-007 | Audit log retention — how long should deletion audit records (deletedBy, deletedAt, resource type, resource ID) be kept? Is a Postgres table sufficient or is a separate append-only audit service needed? | BACKEND-GAP-S03 | Cannot decide between a simple `deletedBy` column approach vs a dedicated audit log table. |
| LQ-008 | Personal data export / deletion rights — does Uzbekistan's ZRU-547 or any applicable data protection law require: (a) a machine-readable export of a parent's personal data on request, and (b) a hard-delete option beyond paranoid soft-delete? | BACKEND-GAP-S01, BACKEND-GAP-S03 | Cannot determine if soft-delete satisfies legal data deletion requirements. |
| LQ-009 | School archival — when a school closes, what happens to its children? Are they transferred to another school in bulk? Are their records frozen? Who authorizes the archival? | BACKEND-GAP-S05 | Cannot design the school-closing workflow without knowing the business rules. |

---

## Section 7 — Out of Scope

The following look like Backend gaps but are not — they belong to other portals or require strategic decisions that aren't engineering decisions.

1. **Government school comparison endpoint** — The government portal shows one school at a time. "Compare two schools side by side" is not evidenced in current frontend code — there is no such screen. If this is a future feature, it belongs to a Government S6 (Feature Plan), not a Backend gap.

2. **Parent data visibility into teacher reflections** — Whether parents can read teacher observations/reflections is a product decision (LQ-003, LQ-004). Until decided, this is not an engineering gap.

3. **Avatar migration (CP-002)** — Base64 avatars in DB is a known deferred fix (BACKEND-010), not a gap. It is tracked in `LOOP_CROSS_PORTAL.md`.

4. **Response shape inconsistency (CP-003)** — A known deferred fix (BACKEND-012), not a gap.

5. **Swagger documentation coverage** — The Swagger spec is served but likely unpopulated (no JSDoc seen in route files). This is a documentation gap, not a functional API gap. Belongs in a developer-experience sprint.

6. **`Child.class` and `Child.teacher` string fields** — These are suspected dead columns (OQ-002 from S0 understanding). Verified as still-referenced in `receptionParentController.js:108`. Not a gap — a deferred cleanup item (BACKEND-019, already deferred).

7. **Multi-instance scaling** — Socket.IO Redis adapter is configured but the `userSockets` in-memory map is per-instance. This is an infrastructure concern, not a gap in the API surface.

8. **AI chat quality / model selection** — The AI chat endpoints exist and work. Quality of responses is not an API gap.

---

## Gap Summary

| Category | Blocker | High | Medium | Low | Total |
|---|---|---|---|---|---|
| Consumer-portal (Area 1) | 6 | 1 | 2 | 1 | **10** |
| Operational/tooling (Area 3) | 0 | 2 | 1 | 1 | **4** |
| API surface (Area 4) | 1 | 1 | 3 | 0 | **5** (incl. BACKEND-GAP-018 merged with GAP-006) |
| Safeguarding (Section 3) | 0 | 3 | 2 | 0 | **6 (BACKEND-GAP-S01 to S06)** |
| **Total** | **7** | **7** | **8** | **2** | **25** |

**Most urgent:** 7 Blocker-severity gaps, all grounded in current frontend calls to non-existent backend endpoints. The teacher portal has the most broken screens (Attendance, DailyReflection, Dashboard degraded). Admin document filtering is a current production bug. 3 safeguarding gaps are High severity and affect vulnerable children directly.
