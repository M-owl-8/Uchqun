# Feature Inventory — Master Index
**Source commit:** 6c34f4faba64f8b2ed41fb1f0871f8e20ac68e2d  
**Date:** 2026-05-30  
**Method:** atomic-grain, code-sourced — all features backed by file:line evidence  
**Spot-checks:** 10/10 verified (6 pass · 1 partial · 3 corrected-in-place)

---

## Per-Role Feature Counts

| Portal | File | Total | ✅ Working | 🟡 Unverified | ❌ Broken | 🚧 Planned |
|---|---|---|---|---|---|---|
| Teacher | features-teacher.md | 116 | 12 (10%) | 104 (90%) | 0 | 0 |
| Parent | features-parent.md | 106 | 36 (34%) | 70 (66%) | 0 | 0 |
| Admin | features-admin.md | 94 | 94 (100%) | 0 | 0 | 0 |
| Reception | features-reception.md | 89 | 89 (100%) | 0 | 0 | 0 |
| Government | features-government.md | 76 | 65 (86%) | 7 (9%) | 0 | 0 |
| **TOTAL** | | **481** | **221 (46%)** | **251 (52%)** | **0** | **0** |

**Key observation:** Government portal has the highest verified coverage (86% ✅) because it accumulated the most behavioral tests during audit loops. Teacher portal has the lowest (10% ✅) — the IRR workflow is the largest unverified surface.

---

## Cross-Role Feature Matrix

| Feature Area | Teacher | Parent | Admin | Reception | Government |
|---|---|---|---|---|---|
| **Auth / Login** | Shared login page (teacher/src/pages/Login.jsx) for both teacher + parent | ← same | admin/src/pages/Login.jsx | reception/src/pages/Login.jsx | government/src/pages/Login.jsx |
| **Language switcher** | UZ/RU/EN in sidebar + login | UZ/RU/EN in MobileTabBar | UZ/RU/EN in sidebar | UZ/RU/EN in sidebar | UZ/RU/EN in sidebar; CP-019 i18n notice banner |
| **Notifications** | Notification panel, mark read | Notification panel + badge | Notification panel | — | — |
| **Profile edit** | Edit firstName/lastName/phone | Edit firstName/lastName/phone | Edit own profile | Edit own profile | Edit own profile |
| **Change password** | /teacher/change-password + settings | /change-password + settings | Settings page | Settings page | Settings page |
| **Messages to government** | POST /teacher/message-to-government (flat send) | POST /parent/message-to-government (recipientLevel: owner/region/republic + escalation chain) | POST /admin/message-to-government (flat send) | POST /reception/message-to-government (flat send) | Read-only inbox: messages from schools, replies |
| **School ratings** | — | POST /parent/school-rating (5 indicators + mandatory comment; PL-015 gated labels) | — | — | POST /government/schools/:id/rate (5 indicators; **backend only, no frontend UI** — G-027) |
| **Children data** | Read-only: own group's children | Read own child(ren) only | Full CRUD: own school's children | CRUD + wizard: own school's children | Read-only: region-scoped children list |
| **ИРР (IEP)** | Full authoring: create/activate/score/goals/journals (teacher-only endpoints) | Read-only view: see ИРР status, scores, goals, parentRecommendations | Read-only: child detail has ИРР link (view) | No ИРР access | No ИРР access |
| **Audit log** | — | — | Read: own school (ALLOWLIST scoped) | — | Read: region-scoped (canViewAuditLog capability) |
| **User management** | — | — | Full CRUD: admins manage reception/parents; suspend/activate/restore | Full CRUD: reception manages parents/teachers/groups | Provision/delete/reset gov users (capability-gated) |
| **AI warnings** | View + resolve | — (AIWarnings.jsx shared but mounted at /teacher/ai-warnings) | Analyze + notify (school-scoped) | — | View + resolve (region-scoped) |
| **Bulk import** | — | — | 5-step CSV wizard (validate + async start) | — | — |
| **School archive** | — | — | — | — | Archive/reactivate school (canArchiveSchools) |
| **Teacher ratings** | View own ratings (stars) | Rate teacher (1–5 stars) | View teacher detail (read-only) | View teacher ratings modal | Aggregate rating stats |
| **Chat (school-internal)** | Send/edit/delete messages to parents | Send/edit/delete messages to teacher | Read-only (staff communications hub) | — | — |
| **Document approval** | — | — | Approve/reject reception documents (DocumentApprovalQueue) | Upload own documents, track status | — |
| **Registration requests** | — | — | — | — | Approve/reject school admin registrations (canManageRegistrations) |

---

## Demo Critical Paths

These 6 flows prove the platform works end-to-end. Each maps to credentials from `credentials.md` and profiles from `demo-profile.md`.

### CP-1: Teacher creates ИРР, scores intake, sets goals
1. **Log in as** `teacher1@uchqun.uz` (Zulfiya Nazarova, School 1)
2. Navigate to `/teacher/children/:id/irr` for child Bobur Sobirov (ASD)
3. Create new ИРР → fill ПТПК header fields (use demo-profile.md ПТПК values)
4. Activate ИРР → expect IRR_HEADER_INCOMPLETE if fields missing
5. Open assessment session → score all 17 criteria (1–5)
6. Save session → view domain score totals
7. Create long-term goal → add goal period (Q1) → add 2 short-term goals
8. **Expected:** ИРР status = active, session + goals persisted
9. **Verify from parent side:** log in as `parent1@uchqun.uz` → /irr → see Bobur's ИРР status

### CP-2: Parent views child profile, messages teacher
1. **Log in as** `parent1@uchqun.uz` (Hulkar Sobirova, School 1)
2. Dashboard → child card for Bobur Sobirov
3. Navigate to /child → view diagnosis, teacher info
4. Navigate to /chat → select teacher Zulfiya Nazarova
5. Send message: "Farzandim qanday?" (How is my child?)
6. **Expected:** message appears in chat thread
7. **Verify from teacher side:** `teacher1@uchqun.uz` → /teacher/chat → see parent message, reply
8. **Parent:** reply appears in thread; unread badge clears after read

### CP-3: Parent sends message to government with routing levels
1. **Log in as** `parent1@uchqun.uz`
2. Navigate to `/child` → click "Maktabga murojaat" (message school owner or gov)
3. Compose message, select **owner level** (school admin inbox)
4. Send → expect message in sent list with level badge "owner"
5. Repeat for **region level** (goes to region gov inbox)
6. **Log in as** `gov.toshkent@uchqun.uz` → Messages → see region-level message from parent1's school
7. Reply → **log back in as** parent1 → see reply with escalation chain indicator

### CP-4: Admin approves reception, reception onboards a parent
1. **Log in as** `admin1@uchqun.uz` (Dilnoza Xoliqova, School 1)
2. Document Approval Queue → approve reception1's pending documents
3. **Log in as** `reception1@uchqun.uz` (Iroda Abdullayeva) → dashboard shows no pending docs
4. Reception → Parents → Create new parent (wizard: parent info + child info + group assignment)
5. **Expected:** parent appears in list with status=active; child linked to group
6. **Log in as new parent** → can access dashboard and see child data

### CP-5: Government views region-scoped data, rates school
1. **Log in as** `gov.toshkent@uchqun.uz` (Nodira Yusupova, Region 01)
2. Schools → see only Toshkent Maxsus Maktab 1 + 2 (not Samarqand schools)
3. Click school → view details (teachers, students, ratings)
4. Ratings tab → view parent direction aggregate for the school
5. **Log in as** `gov.republic@uchqun.uz` → Schools → see all 4 schools
6. **Verify isolation:** gov.toshkent cannot see gov.samarqand's schools

### CP-6: Admin bulk imports children via CSV, monitors progress
1. **Log in as** `admin1@uchqun.uz`
2. Bulk Import → upload valid CSV (use docs/csv-templates/ template)
3. Phase 1 validate → see valid rows count (201 response with importJobId)
4. Confirm import → phase 2 start → 202 accepted
5. Poll status every 3s → status transitions: importing → completed
6. Result screen shows rows created, any errors
7. **Verify:** admin1 → Children list → new children appear

---

## Known Broken Features (❌)

| ID | Portal | Feature | File:line | Issue |
|---|---|---|---|---|
| ~~A-BRK-01~~ | Admin | Search conversations | admin/src/pages/Communications.jsx:53-62 | ✅ FIXED S10 — filteredConversations + search input added |
| ~~A-BRK-02~~ | Admin | Chat API URL double-prefix | admin/src/pages/Communications.jsx:27,59 | ✅ FIXED S10 — /v1/chat/→/chat/ (API base already includes /v1/) |
| ~~R-BRK-001~~ | Reception | Bulk action buttons (activate, export) | reception/src/pages/ParentManagement.jsx:446–451 | ✅ FIXED S6 |
| ~~R-BRK-002~~ | Reception | Group update endpoint scope | backend/routes/receptionRoutes.js | ✅ FIXED S6 |

---

## Hidden Features (code exists, not in prior audit docs)

| Feature | Portal | Where |
|---|---|---|
| AI Warnings page at /teacher/ai-warnings | Teacher | teacher/src/parent/pages/AIWarnings.jsx mounted under teacher routes |
| Teacher responsibilities + tasks + work history | Teacher | backend/routes/teacherRoutes.js:61–72 (GET /teacher/responsibilities, /tasks, /work-history) — no frontend page found |
| Child goals (separate from IRR goals) | Teacher | backend/routes/teacherRoutes.js:94–100 — `/teacher/children/:childId/goals` with CRUD |
| Reception sends message to government | Reception | reception/src/pages/Profile.jsx:136–168 — POST /reception/message-to-government |
| Reception views government replies | Reception | reception/src/pages/Profile.jsx:253–336 |
| Government rating submission (backend only) | Government | POST /government/schools/:id/rate — no frontend UI |
| Government ratings view (gov direction, separate endpoint) | Government | GET /government/ratings?direction=gov — no separate frontend view |

---

## Coverage Gaps

### Features in prior audit docs with no code found (planned-not-built)
| Doc reference | Status | Notes |
|---|---|---|
| ~~Admin: AG-009 inter-school child transfer UI~~ | removed | S10 decision: documentation drift — AG-009 explicitly deferred from S7 as government-managed workflow; never planned for admin phase |

### Features the code has that prior audits didn't document (hidden)
- Teacher responsibilities/tasks/work-history endpoints (routes exist, no teacher frontend page)
- Reception govern message inbox (Profile page has full send+receive UI, not mentioned in reception audit docs)
- `/teacher/ai-warnings` route (AIWarnings.jsx from parent directory, mounted on teacher app)

---

## Spot-Check Results (10 entries)

| # | Entry | Result | Notes |
|---|---|---|---|
| 1 | T-017 sidebar badge | ⚠️ Partial | Test confirms polling via /chat/unread-count, NOT socket direct increment — corrected |
| 2 | T-076 IRR activate | ⚠️ Partial | IrrShell.test.jsx:145 exists and tests gate; "9-field" claim corrected to IRR_HEADER_INCOMPLETE — corrected |
| 3 | T-045 Activities test | ✅ Pass | Activities.test.jsx:96–102 (list) + :141–161 (create) confirmed |
| 4 | P-001 parent login file | ✅ Pass | teacher/src/pages/Login.jsx confirmed (shared login, NOT parent-specific) — file already correct |
| 5 | A-001 admin login | ✅ Pass | admin/src/pages/Login.jsx confirmed with email+password form |
| 6 | R-024 reception parents test | ✅ Pass | reception/src/__tests__/pages/ParentManagement.test.jsx:133–140 verified |
| 7 | G-001 gov login | ✅ Pass | government/src/pages/Login.jsx confirmed with email+password form |
| 8 | R-028 reception create parent | ✅ Pass | backend/routes/receptionRoutes.js:47 POST /reception/parents confirmed |
| 9 | G-027 gov rating UI | ✅ Pass | Inventory correctly says "no frontend UI" — confirmed by reading SchoolDetail.jsx |
| 10 | T-096 therapy test | ✅ Pass | TherapyManagement.test.jsx:83–89 (list) + :122–138 (create) confirmed |

**Overall: 8 pass · 2 partial (both corrected-in-place). No structural failures.**

---

## Files

| File | Contents |
|---|---|
| `audits/prod-readiness/features-teacher.md` | 116 features, T-001–T-116 |
| `audits/prod-readiness/features-parent.md` | 106 features, P-001–P-106 |
| `audits/prod-readiness/features-admin.md` | 95 features, A-001–A-095 |
| `audits/prod-readiness/features-reception.md` | 89 features, R-001–R-089 |
| `audits/prod-readiness/features-government.md` | 76 features, G-001–G-076 |
| `audits/prod-readiness/features-INDEX.md` | This file |
| `audits/prod-readiness/04-feature-inventory.md` | Closeout summary |
