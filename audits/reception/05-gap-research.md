# Reception Portal — Step 5: Gap Research

**Date:** 2026-05-23
**Branch:** main
**Portal scope:** Reception (front-desk operational role)

---

## 0. Framing

Reception is a **narrow operational role**, not a management cockpit. Its daily job:
1. Onboard new parents/children (intake wizard)
2. Manage teachers and groups
3. Upload own credentials for admin approval
4. Send messages to government

The question is: *can a receptionist do their actual daily job end-to-end without hitting a wall?*
The admin comparison: Admin S5 had 9 wirable gaps + 3 backend-first gaps. Reception's surface is much smaller.

---

## 1. Inverse-Gap Inventory

Backend reception-reachable endpoints with no or partial frontend consumer.

### IG-1 — `GET /reception/verification-status` (no frontend consumer)

**What it does:** Returns `{ isVerified, documentsApproved, isActive, documentsCount, pendingCount, approvedCount, rejectedCount }` for the authenticated reception user.

**Frontend status:** Not called anywhere in `reception/src/`. The Documents.jsx page derives the same counts directly from the document list returned by `GET /reception/documents`.

**Is it a real workflow need?** Marginal. The Documents.jsx status counts cover the same ground. The `documentsApproved` flag would be useful for a sidebar badge (e.g. "⚠️ documents pending") but the sidebar has no such indicator today. Low-value standalone wiring.

**Verdict:** Optional nice-to-have (sidebar badge). Not a workflow blocker.

---

### IG-2 — `GET /reception/documents?status=` (CP-010, backend built, frontend ignores param)

**What it does:** `getMyDocuments` accepts `?status=pending|approved|rejected` filter (built in Backend Sprint A — cp-010). Returns filtered list.

**Frontend status:** `Documents.jsx:25` calls `api.get('/reception/documents')` with no params, loads all docs, and derives counts client-side. The status filter is never sent.

**Is it a real workflow need?** No. The current behavior (load all, filter client-side) works identically. The endpoint accepts the param — if the doc list ever grows large, switching to server-side filter is a 1-line change. Not a gap.

**Verdict:** Backend leftover. Not a gap.

---

### IG-3 — `GET /groups/:id` (general route, no reception page calls it directly)

**What it does:** Returns a single group with teacher include.

**Frontend status:** No reception page calls `GET /groups/:id`. GroupManagement uses `GET /groups` (list). Individual group detail is not needed for reception's current CRUD flow.

**Is it a real workflow need?** No reception workflow requires a group detail page.

**Verdict:** Backend leftover. Not a gap.

---

### IG-4 — Dashboard pending-docs URL is still broken (`/reception/my-documents`)

**File:** `reception/src/pages/Dashboard.jsx:40`

```js
// CURRENT — still wrong (S3 fixed Documents.jsx but not Dashboard):
api.get('/reception/my-documents', { signal }).catch(() => ({ data: { documents: [] } }))
// Line 45 also uses old shape accessor:
Array.isArray(docsRes.value.data?.documents)   // should be .data
```

**Impact:** The "Tasdiq kutayotgan hujjatlarim" (pending docs) card on the Dashboard always shows empty — the catch returns `{ data: { documents: [] } }` silently. Reception staff cannot see pending documents from the Dashboard. Documents.jsx itself is fixed; the Dashboard is a separate regression.

**Verdict:** **BUG — real workflow impact.** Should be fixed in S6 (2-line change, no new backend work). Classify as **RG-001 (High)**.

---

## 2. Workflow-Completeness Gaps

### 2a. Parent/Child Intake

**Assessment: COMPLETE.** The 3-step wizard (`ParentWizardPage` → `GroupStep`) covers the full intake:
- Parent data (email, password, name, phone)
- Child data (name, DOB, gender, disability type, photo)
- Group assignment (with teacher)
- Single `POST /reception/parents` submits all at once

Post-intake CRUD on ParentManagement: edit parent/child, add more children, delete — all wired.

No gap here. Reception can complete the intake end-to-end.

---

### 2b. Document Workflow

**Assessment: MOSTLY COMPLETE, one Dashboard bug.**

`Documents.jsx` (fixed in S3):
- Upload via `POST /reception/documents` with `file` field + `documentType` ✅
- List via `GET /reception/documents` (correct URL, correct shape) ✅
- Delete pending via `DELETE /reception/documents/:id` (ownership + pending-only guard) ✅
- Status counts (approved/pending/rejected) shown inline ✅
- Fetch error banner shown ✅

Dashboard (`Dashboard.jsx:40`): still calls `/reception/my-documents` → silent fail → pending-docs card always empty. **→ RG-001.**

`GET /reception/verification-status` is not wired. The docs page already shows equivalent info. **Not a gap.**

---

### 2c. Scheduling / Attendance

**Assessment: OUT OF SCOPE FOR RECEPTION — CORRECT.**

Reception has no scheduling or attendance endpoints in `receptionRoutes.js`. Attendance marking is a teacher responsibility (`POST /api/v1/teacher/attendance/...` via `teacherRoutes.js` + `requireTeacher`). Reception does not need an attendance workflow.

No gap.

---

### 2d. Search / Filtering at Scale

**Assessment: ADEQUATE FOR THE ROLE.**

ParentManagement: client-side search (`useMemo` filter on `searchQuery`) + client-side pagination (`PAGE_SIZE` chunks). Backend `getParents` returns all school parents with no pagination or search param support.

TeacherManagement: client-side search only. Backend `getTeachers` returns all school teachers.

For a special education school context (dozens to low hundreds of parents/children), client-side is fine. This is not a school-district directory with thousands of records. No server-side search is needed for S6.

No gap.

---

### 2e. RE-9 — The Dead "Activate" Button

**File:** `reception/src/pages/Dashboard.jsx:248`

```jsx
<button className="h-7 px-2.5 rounded-md bg-brand-600 ...">
  {t('dashboard.activate', { defaultValue: 'Faollashtirish' })}
</button>
```

This button has **no `onClick` handler**. It renders for parents where `p.isActive === false`.

**Is parent activation a reception responsibility?**

The backend `PUT /admin/parents/:id/activate` is in `adminRoutes.js` — admin-only. There is no `PUT /reception/parents/:id/activate` endpoint. Parent suspension/activation is part of the T2-2 admin workflow (`status: suspended|active`).

The `isActive` field on parents is a **legacy flag** — per CLAUDE.md, "parent suspension is handled via the `users.status` field (T2-2)... The T2-2 status gate at `auth.js:96` covers all roles including parents." The `isActive` check for parents is bypassed intentionally (`auth.js:102` skips it for `role === 'parent'`).

**Resolution:** The button is misleading dead UI. **Remove it in S6 — this is admin responsibility, not reception.** A reception user has no API to activate parents, and the concept of `isActive` for parents is legacy. The card can still show pending-status parents as informational (without the button), or be replaced with the pending-docs card using the fixed URL.

**→ RG-002 (Medium — UX cleanup).**

---

## 3. Cross-Portal Items

| CP | Reception involvement | Status |
|---|---|---|
| **CP-019** (translation notice) | Reception is end-user-facing — notice required | ✅ DONE — `TranslationNotice` in `Layout.jsx:60` (S3 U-8) |
| **CP-023** (forced password change) | Reception must redirect to change-password | ✅ DONE — `App.jsx:38` redirect + `ChangePassword.jsx` (S3 U-5) |
| **CP-020** (two-direction rating) | Reception reads teacher ratings (`GET /reception/teachers/:id/ratings`) — view-only. Reception is NOT a school rater. | Reception OUT of rating production. No work needed. |
| **CP-022** (parent message routing) | Reception sends messages to government (`POST /reception/message-to-government`) — this is the STAFF-level channel. CP-022 is about PARENT message routing. Reception is not a participant. | Reception OUT of CP-022. No work needed. |
| **CP-003** (groups shape migration) | All reception group consumers use `res.data.groups` (old shape). Migration deferred under grandfather clause. | See §4 below. |
| **CP-010** (docs status filter) | Backend built (Sprint A). Frontend doesn't use it — not needed (client-side sufficient). | No reception work needed. |

---

## 4. RE-3 / CP-003 — Groups Shape Deferred Decision

S3 deferred `GET /groups` old shape (`{ groups, total }`) under CP-003. S5 decision:

**S6/S7 will touch groups** — GroupManagement CRUD is a candidate for test coverage (RG-004), and the ParentWizard GroupStep also consumes groups. When adding tests, the test mocks will encode the current old shape. If we migrate the shape during S6/S7, we break those mocks simultaneously.

**Decision: Bundle the shape migration with S6/S7 group test work.** When adding `GroupManagement.test.jsx` (RG-004), migrate the mock to new shape AND update all 4 consumers (Dashboard, GroupManagement, GroupStep, ParentManagement) in the same commit. Opportunistic migration, not a standalone PR.

---

## 5. Gap Catalog

### RG-001 — Dashboard pending-docs URL still wrong
**Severity: HIGH | Type: Bug fix | Backend needed: NO**

`Dashboard.jsx:40` calls `/reception/my-documents` (old broken URL) with shape `.documents`. Reception staff sees zero pending docs on Dashboard even if they have docs waiting for approval.

**Fix:** Change to `api.get('/reception/documents')` and accessor to `res.data.data`. 2-line change. Also update the pending-activation card logic (see RG-002).

**Effort:** 30 min | Demo-critical: ✅ YES (the first thing a reception user sees)

---

### RG-002 — Remove dead Activate button from Dashboard
**Severity: MEDIUM | Type: UX cleanup | Backend needed: NO**

`Dashboard.jsx:248` renders a button with no onClick. Parent activation is admin-only. Button is misleading and erodes trust in the UI.

**Fix:** Remove the `onClick`-less Activate button. The parent card can remain as informational (showing pending status) or be repurposed once RG-001 is fixed to show pending-docs correctly.

**Effort:** 15 min | Demo-critical: ✅ YES (dead button on the first page)

---

### RG-003 — Wire `GET /reception/verification-status` as sidebar badge (Optional)
**Severity: LOW | Type: Nice-to-have UX | Backend needed: NO**

The endpoint exists and returns `documentsApproved`. A sidebar badge ("⚠️ documents pending") would guide new receptions to upload docs before they can use the portal fully. Currently there's no visual cue outside the Documents page.

**Fix:** Call `GET /reception/verification-status` in Layout/Sidebar on mount; show a badge on the Documents nav item when `documentsApproved === false`.

**Effort:** 1h | Demo-critical: ❌ NO | Workflow value: Medium

---

### RG-004 — Test coverage gaps (TeacherManagement, GroupManagement, Dashboard)
**Severity: HIGH | Type: Test discipline | Backend needed: NO**

| Page | Gap | Priority |
|---|---|---|
| `TeacherManagement` | 0 tests — CRUD create/edit/delete + ratings modal | High |
| `GroupManagement` | 0 tests — CRUD create/edit/delete + teacher assignment | High |
| `Dashboard` | 0 tests — counts render, pending-docs card, pending-parents card | Medium |
| `Profile` | 0 tests — gov message compose (Settings has coverage, Profile doesn't) | Low |
| `ParentWizardPage` | 0 tests — 3-step flow, draft restore | Low |

TeacherManagement and GroupManagement are the core reception workflows after parent intake. No test coverage means regressions from S6 changes won't be caught.

**Effort:** ~4h for TeacherManagement + GroupManagement + Dashboard | Demo-critical: ✅ YES (CI gate)

---

### RG-005 — Profile/Settings duplication (no action needed, document only)
**Severity: INFO | Type: Code smell**

`Profile.jsx` and `Settings.jsx` both implement the government message compose+history UI. This is duplicated code (~identical). Not a bug. When CP-022 (parent message routing) eventually ships, both pages would need updating. Flag as pre-CP-022 tech debt. No S6 action needed.

---

## 6. Questions for Max

**Q1 — Activate button (RG-002):** Confirm that parent activation is exclusively admin responsibility, so the Activate button on reception's Dashboard should be removed entirely (not wired). Reception cannot and should not activate parents — correct?

**Q2 — Any planned reception features beyond current CRUD?** The reception portal is operationally complete for intake, documents, and group management. Is there any planned feature (e.g., calendar/scheduling, child detail view, attendance oversight, reports) that reception should have in the near term?

Both questions are binary — no extended product design needed.

---

## 7. Honest Assessment and S6 Recommendation

**Reception is nearly feature-complete for its intended role.** All core workflows (intake, CRUD, documents, groups, messaging) are built and functional after S3. The gap list is genuinely short.

**What S6/S7 should be:**

| Item | Priority |
|---|---|
| RG-001: Fix Dashboard pending-docs URL | **Must-do — 30 min** |
| RG-002: Remove dead Activate button | **Must-do — 15 min** |
| RG-004: Tests for TeacherManagement + GroupManagement + Dashboard | **Must-do — ~4h** |
| RE-3/CP-003: Groups shape migration (bundle with tests) | **Must-do — bundle** |
| RG-003: Verification status sidebar badge | Optional (cut if time-pressured) |
| Profile/Settings dedup | Deferred (pre-CP-022 tech debt, no S6 action) |

**Total S6/S7 scope estimate:** ~6–8h including tests. This is a **light sprint** compared to Admin's buildout. That's the correct outcome — Reception is a narrow role and its core job is done.

---

## 8. Gap Count Summary

| ID | Description | Severity | Type |
|---|---|---|---|
| RG-001 | Dashboard pending-docs URL broken | HIGH | Bug |
| RG-002 | Dead Activate button (remove) | MEDIUM | UX |
| RG-003 | Verification-status sidebar badge | LOW | Nice-to-have |
| RG-004 | Test gaps: TeacherManagement, GroupManagement, Dashboard | HIGH | Test |
| RG-005 | Profile/Settings duplication | INFO | Tech debt |

**CP items:** CP-019 ✅ CP-023 ✅ CP-020 N/A CP-022 N/A CP-003 → bundle with S6.

**Inverse-gap count:** 3 endpoints with no/partial frontend consumer, all confirmed as backend leftovers or already-served-differently. No new backend work needed for S6.

**Verdict: Reception needs a SHORT S6/S7 sprint** — 2 bug fixes, 1 feature (tests), 1 migration (groups shape). Then final verify and done.
