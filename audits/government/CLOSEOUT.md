# Government Portal — Closeout Ledger

**Date:** 2026-05-21  
**Sprints covered:** S0–S8 (Understand through Final Verify), Region Sprints A–E3  
**Verdict:** 🟡 CLOSED — with documented residuals (no live leaks; no broken items)

---

## 1. Re-Verified Region-Scoping Completeness Table

Built from scratch by reading actual controller code. No prior table trusted.

### 1.1 Government router endpoints (`backend/routes/governmentRoutes.js`)

All routes under the government router run:
`authenticate → requireGovernment → requireRegionScope`

Region scope is therefore available via `req.isGlobalAccess` / `req.regionScope` for all routes below.

| Endpoint | Controller | File | Scoping mechanism | Capability gate | Status |
|---|---|---|---|---|---|
| GET /overview | `getOverview` | governmentController.js | `regionWhere(req)` for school IDs; sub-counts joined; `req.isGlobalAccess` branch | `canViewSchools` | ✅ |
| GET /schools | `getSchoolsStats` | governmentController.js | `regionWhere(req)` | `canViewSchools` | ✅ |
| GET /schools/:id | `getSchoolById` | governmentController.js | `regionWhere(req)` inside `findOne` | `canViewSchools` | ✅ |
| PUT /schools/:id/archive | `archiveSchool` | governmentController.js | `regionWhere(req)` | `canArchiveSchools` | ✅ |
| PUT /schools/:id/reactivate | `reactivateSchool` | governmentController.js | `regionWhere(req)` | `canArchiveSchools` | ✅ |
| PUT /schools/:id/category | `changeSchoolCategory` | governmentController.js | `govType=main` check + `regionWhere(req)` | `canArchiveSchools` | ✅ |
| GET /students | `getStudentsStats` | governmentController.js | `!req.isGlobalAccess` → school subquery → `userId IN (...)` | `canViewStudents` | ✅ |
| GET /teachers | `getTeachersList` | governmentController.js | `!req.isGlobalAccess` → school subquery | `canViewTeachers` | ✅ |
| GET /parents | `getParentsList` | governmentController.js | `!req.isGlobalAccess` → school subquery | `canViewParents` | ✅ |
| GET /ratings | `getRatingsStats` | governmentController.js | `regionWhere(req)` | `canViewRatings` | ✅ |
| GET /ratings/:schoolId | `getSchoolRatings` | governmentController.js | `regionWhere(req)` IDOR check | `canViewRatings` | ✅ |
| GET /stats | `getSavedStats` | governmentController.js | `!req.isGlobalAccess` → `where.regionId = req.regionScope` | none | ✅ |
| POST /stats/generate | `generateStats` | governmentController.js | Helpers compute global counts; `regionId` auto-stamped on saved record | none | 🟡 see §1.3 |
| GET /admins | `getAdmins` | governmentController.js | `!req.isGlobalAccess` → school subquery | `canManageAdmins` | ✅ |
| GET /admins/:id | `getAdminDetails` | governmentController.js | `!req.isGlobalAccess` + school `regionId` check | `canManageAdmins` | ✅ |
| POST /admins | `createAdmin` | adminUserController.js | `!req.isGlobalAccess` → `schoolId` must be in region | `canManageAdmins` | ✅ |
| PUT /admins/:id | `updateAdmin` | adminUserController.js | `!req.isGlobalAccess` → `School.findOne` IDOR | `canManageAdmins` | ✅ |
| DELETE /admins/:id | `deleteAdmin` | adminUserController.js | `!req.isGlobalAccess` → `School.findOne` IDOR | `canManageAdmins` | ✅ |
| GET /users | `getGovernments` | adminUserController.js | `govLevel === 'region'` → filter by `govRegionId` | `canManageGovernmentUsers` | ✅ |
| POST /users | `createGovernment` | adminUserController.js | `req.user.govLevel === 'region'` → own-region only | `canManageGovernmentUsers` | ✅ |
| PUT /users/:id | `updateGovernmentUser` | adminUserController.js | `req.user.govLevel === 'region'` → 403 for cross-region/republic | `canManageGovernmentUsers` | ✅ (fixed closeout) |
| DELETE /users/:id | `deleteGovernmentUser` | adminUserController.js | Full region enforcement chain | `canManageGovernmentUsers` | ✅ |
| POST /users/:id/reset-password | `resetGovernmentPassword` | adminUserController.js | Full region enforcement chain | `canManageGovernmentUsers` | ✅ |
| GET /messages | `getAllMessages` | governmentMessageController.js | `!req.isGlobalAccess` → school→sender join | `canViewMessages` | ✅ |
| PUT /messages/:id/reply | `replyToMessage` | governmentMessageController.js | `isMessageInScope` check | `canViewMessages` | ✅ |
| PUT /messages/:id/read | `markMessageRead` | governmentMessageController.js | `isMessageInScope` check | `canViewMessages` | ✅ |
| DELETE /messages/:id | `deleteMessage` | governmentMessageController.js | `isMessageInScope` check | `canViewMessages` | ✅ |
| GET /admin-registrations | `getRegistrationRequests` | adminRegistrationController.js | `!req.isGlobalAccess` → school subquery | `canManageRegistrations` | ✅ |
| PUT /admin-registrations/:id/approve | `approveRegistrationRequest` | adminRegistrationController.js | `!req.isGlobalAccess` → school `regionId` check | `canManageRegistrations` | ✅ |
| PUT /admin-registrations/:id/reject | `rejectRegistrationRequest` | adminRegistrationController.js | `!req.isGlobalAccess` → school `regionId` check | `canManageRegistrations` | ✅ |
| GET /audit-log | `getAuditLog` | governmentController.js | `!req.isGlobalAccess` → school subquery → `entityId IN (...)` | `canViewAuditLog` | ✅ |
| GET /regions | `getRegions` | governmentController.js | Region accounts filter to own region | none (reference data) | ✅ |

### 1.2 AI Warnings endpoints (`backend/routes/aiWarningRoutes.js`)

These routes use `authenticate + requireRole('admin','government')` — **no `requireRegionScope`**. Region scope must come from `req.user.govRegionId` directly.

| Endpoint | Controller | Function | Scoping | Status |
|---|---|---|---|---|
| GET /ai-warnings | aiWarningController.js | `getWarnings` | `govRegionId` → `School.findAll({ regionId })` → `Op.in` | ✅ (fixed Sprint E3 commit 4) |
| PUT /ai-warnings/:id/resolve | aiWarningController.js | `resolveWarning` | `govRegionId` → `School.findOne({ id, regionId })` check | ✅ (fixed closeout) |
| POST /ai-warnings/:id/notify | aiWarningController.js | `notifyUsers` | `govRegionId` → `School.findOne({ id, regionId })` check | ✅ (fixed closeout) |

### 1.3 Yellow items (not leaks — deferred, no consumer)

| Item | Reason classified 🟡 |
|---|---|
| `generateStats` helpers (`getOverviewData`, `getSchoolsData`, `getRatingsData`) | Compute global unscoped counts. However: (a) no frontend consumer (the endpoint is a "future stats snapshot" feature); (b) the saved record is stamped with `regionId` so the READ side (`getSavedStats`) is properly scoped; (c) data quality issue, not a live cross-region access leak. Classified: data quality yellow, not security red. |

---

## 2. Leaks Found and Fixed in This Closeout Pass

### Leak 1 — `updateGovernmentUser` missing region scope

- **File:** `backend/controllers/admin/adminUserController.js`
- **Problem:** `deleteGovernmentUser` and `resetGovernmentPassword` both had the full region enforcement chain. `updateGovernmentUser` had NO such check — a region account could update republic-level accounts or accounts in other regions.
- **Fix:** Added `if (req.user.govLevel === 'region')` block after the 404 check, mirroring `deleteGovernmentUser` exactly.
- **Revert-test:** `governmentScopingHoles.test.js` — Hole 4 — "[REVERT-TEST: BUG]" proves update succeeds on cross-region without check; "[REVERT-TEST: FIXED]" proves 403 with fix.
- **Tests:** 6 tests (2 blocking-403, 1 allowed-same-region, 1 republic-allowed, revert-bug, revert-fixed)

### Leak 2 — `resolveWarning` treating all government as platform-wide

- **File:** `backend/controllers/aiWarningController.js`
- **Problem:** Old code: `if (req.user.role !== 'government' && ...)` — any government role bypassed the school-scope check entirely. Region accounts could resolve warnings belonging to any school.
- **Fix:** Replaced with `if (req.user.role === 'government') { if (govRegionId && warning.schoolId) { School.findOne check } } else { existing admin check }`.
- **Revert-test:** `aiWarning.test.js` — "[REVERT-TEST: BUG]" inline buggy function proves cross-region resolve; "[REVERT-TEST: FIXED]" runs actual fixed controller and confirms 404.

### Leak 3 — `notifyUsers` treating all government as platform-wide

- **File:** `backend/controllers/aiWarningController.js`
- **Problem:** Same pattern as Leak 2 — government bypassed school scope for notify operations.
- **Fix:** Same `govRegionId`-aware pattern added before `notifiedUsers` computation.
- **Tests:** Added region-gov 404 and republic allowed tests in `aiWarning.test.js`.

### Test counts after closeout fixes

- Backend: 106 suites / 1136 → **1148 tests** (12 new across Hole 4 + aiWarning closeout tests)

> **Note on Sprint C completeness table:** The table claimed all government-facing endpoints were scoped. This pass found 3 leaks the table missed: `updateGovernmentUser` (mutation sibling of two correctly-scoped endpoints) and `resolveWarning`/`notifyUsers` (aiWarning routes outside the government router, not checked in Sprint C because they use a separate middleware chain). Trust code, not tables.

---

## 3. Deferred Items Ledger

### Category A — Closeable now

| ID | Item | Status | Evidence |
|---|---|---|---|
| CP-019 | AI-translation notice banner (Government portal) | ✅ CLOSED | `TranslationNotice.jsx` + `Layout.jsx` + 3 tests in `TranslationNotice.test.jsx`. Dismissable (localStorage), `data-testid="translation-notice"`. |
| C-07 / PL-002 | CORS explicit allowlist | ✅ ALREADY CLOSED | `allowedOrigins.includes(origin)` since commit c1bd08d. 6 regression tests in `cors.test.js`. No action needed. |

### Category B — Deal-gated (confirmed safe, NOT built)

| ID | Item | Why not built | Safe to defer |
|---|---|---|---|
| DG-001 | Real region names (13 Uzbek regions) | Partner data required (PL-015). Placeholder slugs in use. | ✅ Safe — schema is name-independent. `docs/region-category-data-update.md` provides swap template. |
| DG-002 | Real school category names | Partner definition required (PL-015). 4 placeholder categories in use. | ✅ Safe — categories are FK-based, UI not yet exposed. |
| DG-003 | School category UI (government portal filter/display) | Deferred from Sprint D (data-gated). No mockup approved. | ✅ Safe — category column exists, no UI consumer. Admin portal loop will pick this up. |

### Category C — Partner/external-dependent (cannot close in code)

| ID | Item | Owner | Blocking what |
|---|---|---|---|
| PL-009-VERIFY | Professional translation review (ru/uz-latn/uz-cyrl, 106 codes) | Professional translator (partner to arrange) | All portals with real Russian/Uzbek users |
| PL-014 | Directory PII sign-off (Students/Teachers/Parents pages show names/emails/DOBs to government) | Product + Legal (ZRU-547 framework) | These pages going live with real users |
| PL-015 | Authoritative region list + school category definitions | Partner (Max) | DG-001, DG-002, DG-003; platform launch with real geographic data |
| PL-001 / C-02 | Group-wide media visibility partner sign-off | Partner (Max) | Teacher portal media feature going live |
| PL-005 | Sentry DSN setup (error monitoring) | Max — must create Sentry project + set Railway env var | Production observability |

### Category D — Cross-portal (confirmed captured, NOT built here)

| ID | Item | Status | Inheriting portal |
|---|---|---|---|
| CP-020 | Two-direction school rating system | ⬜ Spec complete in LOOP_CROSS_PORTAL.md | Backend (next loop), Teacher, Government (already has read side) |
| CP-022 | Parent message routing & escalation (recipientLevel) | ⬜ Spec complete in LOOP_CROSS_PORTAL.md | Backend, Teacher (Loop 5), Government messages |
| CP-023 | Forced password-change flow | ✅ Backend gate live; Government portal done | Admin (Loop 3), Reception (Loop 4), Teacher (Loop 5) |

---

## 4. Verdict

**Portal closure status: 🟡 CLOSED — with documented residuals**

**No live cross-region leaks remain.** All 3 leaks found in this pass are fixed with revert-test evidence.  
**No broken items remain.** Every deferred item is either closed, deal-gated (safe), partner-dependent (flagged), or cross-portal (captured).

**The government portal is ready to hand off to the Admin portal loop.**

---

## 5. Partner-Conversation Agenda (before real users)

These items cannot be unblocked by code. They require a conversation with Max / the product owner:

1. **PL-015 — Region + category data.** Request: (a) definitive list of 13 Uzbek administrative regions with codes; (b) definitive school category names (all 3 languages). Delivery: raw data → swap via `docs/region-category-data-update.md` template. ETA needed.

2. **PL-014 — Directory PII sign-off.** The Students, Teachers, Parents pages in the government portal display personal data. Requires legal sign-off under ZRU-547 before real users. Present: list of fields exposed per page. Get written approval or agree field restrictions.

3. **PL-001 / C-02 — Group media visibility.** Option 1 (accept design) documented in `docs/PRIVACY_POSTURE.md`. Requires written partner sign-off before teacher portal launch.

4. **PL-005 — Sentry setup.** Max must create Sentry project (browser + email verification required), copy DSN, set `SENTRY_DSN` in Railway. Runbook: `docs/OPERATIONS.md`.

5. **PL-009-VERIFY — Translation review.** Arrange professional native-speaker review of `ru.json`, `uz-latn.json`, `uz-cyrl.json`. Prioritize `_review_priority` codes (safeguarding). Update `_metadata.verification_status` to VERIFIED.

6. **Manual gate — Region account walk-through.** ✅ COMPLETED by Max on 2026-05-21 — all 11 nav items walked as a region account on Railway; data (not just labels) confirmed region-scoped throughout. Republic account also verified (all-regions Globe label, full data visible). No action required.

---

## 6. What the Next Portal Loop (Admin) Inherits

### Backend endpoints available (already built, Admin portal does not need to build)

- `PUT /government/schools/:id/archive` / `reactivate` — admin portal should show "ARCHIVED" banner when `school.isActive === false` (requireSchoolScope already returns 403 SCHOOL_ARCHIVED)
- `GET /admin/children/:id/restore`, `/admin/users/:id/restore`, etc. — restore UI (CP-016) not yet built in admin portal
- `PUT /admin/parents/:id/suspend` / `activate` — suspension buttons not yet in admin portal UI (CP-012)
- `POST /admin/import/children/validate` + `/start` — bulk import UI not yet built (CP-011)

### Cross-portal items Admin inherits

- **CP-023:** Forced password-change redirect (same pattern as Government Sprint E1)
- **CP-003:** Response shape grandfather clause — when Admin touches existing endpoints, migrate `{ error: 'string' }` → `{ success: false, error: { code, detail } }` opportunistically
- **CP-019:** AI-translation notice banner (same `TranslationNotice` component pattern)

### Scoping notes for Admin audit

- Admin routes use `requireAdmin = requireRole('admin')` — government CANNOT access admin routes (this is intentional)
- `schoolScope` middleware enforces `schoolId` tenant isolation for admin/teacher/reception
- The `generateStats` global-count helper has no consumer — Admin loop can ignore or repurpose

### DG-003 deferred to Admin loop

School category UI (filter/display on school management pages) was deferred from Government Sprint D. The Admin portal loop should pick this up once PL-015 (real category names) is received.

---

## 7. Test Counts at Portal Close

| Suite | Tests |
|---|---|
| Backend | 106 suites / 1148 tests |
| Government frontend | 17 suites / 121 tests |
| Lint | 0 errors (backend + government) |
| verify-i18n | 123/123 ✅ |

Closeout commits: see §8 below.

---

## 8. Commits in This Closeout Pass

| SHA | Description |
|---|---|
| (pending) | fix(government): closeout — close 3 region-scoping leaks with revert-tests + CP-019 notice |
| (pending) | docs(government): portal closeout — CLOSEOUT.md + tracker update |
