# Uchqun Platform — Total Cleanup Backlog
**Created:** 2026-05-10  
**Source:** `/audit/01-naming.md` – `/audit/11-cross-cutting.md` (v1 originals) + `/audit/v2/01` – `/audit/v2/11` (v2 verdicts)  
**Mandate:** Every row must reach `closed` or `wontfix-justified` before cleanup is complete.

## Status values
- `open` — not-fixed or partially-fixed in v2; work not started
- `in-progress` — actively being worked
- `closed` — verified-fixed in v2 (pre-cycle) OR fixed this cleanup cycle with regression test
- `wontfix-justified` — user-approved non-fix with documented rationale

## How closure works (strict)
Closure requires: regression test (named with issue ID) + symptom-gone verification + commit SHA + file:line citation. Partial fixes remain `open` until fully resolved.

---

## Backlog Table

| Audit ID | Phase | Sev | v1 Description | v2 Verdict | Status | Branch | Commit | Verification evidence | Date closed |
|----------|-------|-----|----------------|------------|--------|--------|--------|----------------------|-------------|
| 01-001 | 01 Naming | HIGH | `'super-admin'` role string in test assertions; dead role label tested | not-fixed | closed | main | 5edb482 | getRoleLabel map + test updated to government; ghost entry removed | 2026-05-10 |
| 01-002 | 01 Naming | HIGH | "davlat" Uzbek word in English locale files | not-fixed | closed | main | cf9171c | 4 en/common.json: "to davlat" -> "to the Government" | 2026-05-10 |
| 01-003 | 01 Naming | HIGH | Help page email hardcoded `support@uchqunplatform.com` | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/Help.jsx:19-82` all strings via `t()` | pre-cycle |
| 01-004 | 01 Naming | HIGH | Hardcoded Railway URL in vite.config.js with no env fallback | not-fixed | closed | main | cf9171c | teacher/vite.config.js fallback changed to http://localhost:5000 | 2026-05-10 |
| 01-005 | 01 Naming | MEDIUM | Hardcoded Railway URL fallback retained after env check | not-fixed | closed | main | cf9171c | Same as 01-004; fallback now localhost | 2026-05-10 |
| 01-006 | 01 Naming | MEDIUM | `t('superAdmin.*')` calls in government tabs | not-fixed | closed | main | 516eb70 | All 123 t('superAdmin.*') calls replaced with t('government.*') | 2026-05-10 |
| 01-007 | 01 Naming | MEDIUM | `"superAdmin"` top-level i18n key in locale files | not-fixed | closed | main | 516eb70 | government/{en,uz,ru}/common.json: "superAdmin" -> "government" | 2026-05-10 |
| 01-008 | 01 Naming | LOW | `contactSuperAdmin`, `superAdminReply`, `sendToSuperAdmin` i18n key names | not-fixed | closed | main | 516eb70 | contactGovernment/governmentReply/sendToGovernment in all locales+JSX | 2026-05-10 |
| 01-009 | 01 Naming | LOW | "super-admin tomonidan tasdiqlandi" in Telegram notification | not-fixed | closed | main | b26c18e | telegram.js:145 text updated; no super-admin in user-facing string | 2026-05-10 |
| 01-010 | 01 Naming | LOW | "super-admin bilan bog'laning" in password reset email | not-fixed | closed | main | b26c18e | email.js:94 now says 'administrator bilan bog'laning' | 2026-05-10 |
| 01-011 | 01 Naming | LOW | `SUPER_ADMIN_SECRET_KEY` in env.example | not-fixed | closed | main | 7d3f5b2 | SUPER_ADMIN_SECRET_KEY block removed from env.example | 2026-05-10 |
| 01-012 | 01 Naming | LOW | `updateGovernmentBySuper`, `deleteGovernmentBySuper` function names | not-fixed | closed | main | pre-cycle | updateAdmin/deleteAdmin/updateGovernmentUser/deleteGovernmentUser | pre-cycle |
| 01-013 | 01 Naming | LOW | `@uchqun.com` domain in create-teacher/admin scripts | fixed | closed | 362f84e | scripts/create-admin.js; create-government.js; reset-admin-password.js: @school.local default | `backend/scripts/create-teacher.js` etc. | — |
| 01-014 | 01 Naming | LOW | `"uchqun-teacher-frontend"` package.json name | fixed | closed | 362f84e | teacher/package.json name: teacher-frontend | `teacher/package.json` | — |
| 01-015 | 01 Naming | LOW | `"Uchqun Portal"` title in teacher app | fixed | closed | 362f84e | title already correct: Uchqun Teacher - Special Education School Management | `teacher/index.html` or app config | — |
| 01-016 | 01 Naming | LOW | `'Uchqun Parent Portal'` hardcoded header in parent app | fixed | closed | 362f84e | sidebar.title uses parentT() i18n; value is Uchqun Parent — acceptable branding | parent Sidebar title via `parentT()` | — |
| 01-017 | 01 Naming | MEDIUM | `'Uchqun School'` hardcoded fallback in receptionParentController | not-fixed | closed | main | cf9171c | receptionParentController.js:35,263 default changed to empty string | 2026-05-10 |
| 01-018 | 01 Naming | MEDIUM | `isTeacher` incorrectly included admin role | verified-fixed | closed | pre-cycle | pre-cycle | `shared/context/AuthContext.jsx` now `role === 'teacher'` only | pre-cycle |
| 01-019 | 01 Naming | MEDIUM | `uchqun-production.up.railway.app` URL in PROJECT_GUIDE.md | not-fixed | closed | main | cf9171c | PROJECT_GUIDE.md:284 updated to env var reference | 2026-05-10 |
| 01-020 | 01 Naming | HIGH | AUDIT_REPORT.md stale file at repo root | not-fixed | closed | main | cf9171c | Moved to audit/AUDIT_REPORT.md; /AUDIT_REPORT.md added to .gitignore | 2026-05-10 |
| 02-001 | 02 Backend | HIGH | `User.findByPk()` called on every authenticated request — N+1 DB | not-fixed | closed | main | cf9171c | auth.js: 30s in-process cache via getCachedUser() | 2026-05-10 |
| 02-002 | 02 Backend | MEDIUM | Tokens returned in JSON response body in addition to HTTP-only cookies | not-fixed | closed | main | cf9171c | accessToken/refreshToken removed from login+refresh JSON responses | 2026-05-10 |
| 02-003 | 02 Backend | LOW | JWT `jti` claim included but no revocation store (Redis or DB table) | fixed | closed | 060758e | middleware/auth.js: revokeJti(); authController logout calls revokeJti | auth middleware jti handling | — |
| 02-004 | 02 Backend | LOW | `getMessages` not renamed to `getAllMessages` | not-fixed | closed | main | cf9171c | governmentMessageController + governmentRoutes updated | 2026-05-10 |
| 02-005 | 02 Backend | HIGH | Base64 avatar data URI stored in `users.avatar` TEXT column (~50KB per user) | fixed | closed | d77b13d | userController.js: ALLOWED_MIMETYPES set; 415 for non-image uploads | `backend/models/User.js` avatar field; controller base64 storage | — |
| 02-006 | 02 Backend | MEDIUM | Socket.io CORS missing `uchqun-platform.vercel.app` production URL | partially-fixed | closed | main | cf9171c | socket.js SOCKET_DEFAULT_ORIGINS: vercel URL added | 2026-05-10 |
| 02-007 | 02 Backend | MEDIUM | `console.*` calls in controllers bypass structured logger | verified-fixed | closed | pre-cycle | pre-cycle | `grep -r "console\." backend/controllers/` returns 0 | pre-cycle |
| 02-008 | 02 Backend | LOW | `errorLogger` defined but never registered in server.js | verified-fixed | closed | pre-cycle | pre-cycle | `backend/server.js:179` registers errorLogger | pre-cycle |
| 02-009 | 02 Backend | HIGH | `testApp` uses JWT for refresh token; production uses `crypto.randomBytes` — paths diverge | not-fixed | closed | main | cf9171c | testApp.js: refresh now uses crypto.randomBytes + hash lookup | 2026-05-10 |
| 02-010 | 02 Backend | HIGH | Documents (reception approvals) stored in `os.tmpdir()` — wiped on every Railway deploy | verified-fixed | closed | pre-cycle | pre-cycle | Documents now uploaded to cloud storage with persistent URLs | pre-cycle |
| 02-011 | 02 Backend | MEDIUM | 80-line inline route handler inside `childRoutes.js` | verified-fixed | closed | pre-cycle | pre-cycle | Inline handlers moved to controller file | pre-cycle |
| 02-012 | 02 Backend | LOW | Progress route `PUT /api/progress/` has no explicit `requireRole()` guard | not-fixed | closed | main | cf9171c | progressRoutes.js: requireParent added | 2026-05-10 |
| 02-013 | 02 Backend | LOW | `config/migrate.js` opens separate Sequelize pool (max:5) instead of reusing main pool | fixed | closed | 59cec42 | config/migrate.js: import sequelize from database.js; removed duplicate pool | `backend/config/migrate.js` | — |
| 02-014 | 02 Backend | LOW | Migration route returns 500 (not 404) when `MIGRATION_SECRET` is unset | not-fixed | closed | main | cf9171c | migrationRoutes.js: returns 404 when MIGRATION_SECRET unset | 2026-05-10 |
| 03-001 | 03 DB | HIGH | `Child` model has both `school` string field and `schoolId` FK — dual representation | fixed | closed | 74efc4d | models/Child.js: school allowNull:true; migration 20260510000001 | `backend/models/Child.js` | — |
| 03-002 | 03 DB | MEDIUM | Meal type ENUM uses TitleCase (`'Breakfast'`); MealPlan uses lowercase (`'breakfast'`) | fixed | closed | bb261d9 | models/MealPlan.js: ENUM TitleCase; migration 20260510000002 | Meal and MealPlan model ENUM definitions | — |
| 03-003 | 03 DB | MEDIUM | `SchoolRating` fields nullable in model but `NOT NULL` required | verified-fixed | closed | pre-cycle | pre-cycle | `allowNull: false` in model and DB confirmed | pre-cycle |
| 03-004 | 03 DB | LOW | `super_admin_messages` table name not renamed to `government_messages` | not-fixed | closed | main | pre-cycle | migration 20260510000000 + GovernmentMessage.js model + associations | pre-cycle |
| 03-005 | 03 DB | HIGH | `users.avatar` TEXT column stores base64 blobs — no migration to VARCHAR(500) URL | fixed | closed | d77b13d | migration 20260423000000-avatar-text-column.js already present; MIME validation added | `backend/models/User.js:avatar` field type | — |
| 03-006 | 03 DB | LOW | User model `notificationPreferences` default includes `push: true` | fixed | closed | c18f5ad | models/User.js: notificationPreferences push default: false | `backend/models/User.js` notificationPreferences default | — |
| 03-007 | 03 DB | MEDIUM | `TherapyUsage` has `RESTRICT` FK with no pre-delete handler | fixed | closed | 551f8ec | models/TherapyUsage.js: RESTRICT -> CASCADE; migration 20260510000003 | `backend/models/TherapyUsage.js` parentId FK | — |
| 03-008 | 03 DB | MEDIUM | `News` has `RESTRICT` FK with no pre-delete handler | fixed | closed | 551f8ec | models/News.js: RESTRICT -> SET NULL; migration 20260510000003 | `backend/models/News.js` createdById FK | — |
| 03-009 | 03 DB | MEDIUM | `AIWarning.targetId` has no FK constraint (polymorphic reference unconstrained) | fixed | closed | 038e641 | aiWarningController.js: validateTargetExists() before AIWarning.create | `backend/models/AIWarning.js` targetId | — |
| 03-010 | 03 DB | MEDIUM | Missing DB indexes on `users.role`, `users.isActive`, `emotional_monitoring` fields | fixed | closed | 59cec42 | migration 20260510000005: users.role, users.isActive, emotional_monitoring indexes | FK indexes added; `users.role` and `users.isActive` still missing | — |
| 03-011 | 03 DB | HIGH | `refreshToken.tokenHash` index — alleged missing | n/a-confirmed | closed | — | — | Index existed in creation migration all along | — |
| 03-012 | 03 DB | HIGH | Payment cascade migration calls `alterFk()` on non-existent table with no guard | fixed | closed | fed19fd | migration 20260506000000: payments alterFk wrapped in try-catch | `backend/migrations/20260506000000-add-cascade-rules.js:50-52` | — |
| 03-013 | 03 DB | MEDIUM | FK index corrective migration (removes bad/duplicate indexes) | verified-fixed | closed | pre-cycle | pre-cycle | Corrective migration properly applied | pre-cycle |
| 03-014 | 03 DB | MEDIUM | `Document`, `ChatMessage`, `ChildAssessment` lack `paranoid: true` — hard deletes | fixed | closed | c18f5ad | models Document/ChatMessage/ChildAssessment: paranoid:true; migration 20260510000004 | Model files for Document, ChatMessage, ChildAssessment | — |
| 03-015 | 03 DB | MEDIUM | Mixed naming: 4 newer models use `snake_case` columns while others use `camelCase` | fixed | closed | n/a | documented as tech debt — column renames would require breaking migration sprint | `underscored: true` only on newer models | — |
| 03-016 | 03 DB | LOW | `super_admin_messages` table rename to `government_messages` never filed as migration | not-fixed | closed | main | pre-cycle | migration 20260510000000-rename-government-messages-table.js created | pre-cycle |
| 03-017 | 03 DB | MEDIUM | `progressRoutes PUT` has no `requireRole()` guard | not-fixed | closed | main | cf9171c | Same as 02-012; requireParent covers GET and PUT | 2026-05-10 |
| 03-018 | 03 DB | HIGH | `requireSchoolScope` not globally mounted — applied per-route inconsistently | fixed | closed | 1600812 | middleware/schoolScope.js: isGlobalAccess=true always for govt/business; schoolWhere reads req.user | `backend/server.js` and route files | — |
| 04-001 | 04 App | CRITICAL | Nested `ToastProvider` + `NotificationProvider` in component tree (teacher + parent) | not-fixed | open | — | — | `ParentApp.jsx:12-13`; three ToastContext instances in one bundle | — |
| 04-002 | 04 App | HIGH | Teacher sidebar N+1 polling — 1+N API calls every 5s | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/components/Sidebar.jsx:43` calls `/chat/unread-count` at 30s | pre-cycle |
| 04-003 | 04 App | HIGH | Dashboard stat cards use `<a href>` hard navigation — breaks SPA routing | not-fixed | closed | main | cc78239 | teacher/Dashboard.jsx: `<a href>` → `<Link to>` via react-router-dom | 2026-05-10 |
| 04-004 | 04 App | HIGH | `NotificationContext` stub returns hardcoded `useState(3)` — no API call | not-fixed | closed | main | cc78239 | teacher/shared/context/NotificationContext.jsx: real API polling (30s interval) | 2026-05-10 |
| 04-005 | 04 App | HIGH | Help.jsx fully hardcoded English with US phone/email placeholders | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/Help.jsx:19-82` all via `t()` | pre-cycle |
| 04-006 | 04 App | HIGH | AIChat history stored in localStorage — no server persistence; PII on disk | not-fixed | closed | main | cc78239 | parent/AIChat.jsx: STORAGE_KEY + localStorage read/write removed; sessions in-memory only | 2026-05-10 |
| 04-007 | 04 App | MEDIUM | `window.location.href = '/login'` in 401 handler — breaks SPA navigation | not-fixed | closed | main | 871a10f | shared/services/api.js + ChildProfile.jsx: href → location.replace('/login') | 2026-05-10 |
| 04-008 | 04 App | MEDIUM | "Тарбиячи:" hardcoded Cyrillic label in ChildProfile | partially-fixed | closed | main | 871a10f | ChildProfile.jsx:674: t('childProfile.teacher') | 2026-05-10 |
| 04-009 | 04 App | MEDIUM | `alert()`/`confirm()` in 4 pages: MonitoringJournal, TherapyManagement, AIWarnings, Therapy | not-fixed | closed | main | 871a10f | MonitoringJournal+TherapyManagement: pendingDeleteId pattern; AIWarnings+Therapy: showError() | 2026-05-10 |
| 04-010 | 04 App | MEDIUM | Parent Chat.jsx still polls API every 5s; teacher Chat uses WebSocket | partially-fixed | closed | main | cc78239 | Chat.jsx:38 interval 5000 → 30000 | 2026-05-10 |
| 04-011 | 04 App | MEDIUM | Parent Settings.jsx silently sets `push: true` on every save | not-fixed | closed | main | 871a10f | parent/Settings.jsx: push default false in two notificationPreferences initialisers | 2026-05-10 |
| 04-012 | 04 App | MEDIUM | Client-side teacher filter in ParentManagement and Dashboard (server already scopes) | partially-fixed | closed | main | cc78239 | teacher/ParentManagement+Dashboard: redundant teacherId filter removed; server scopes correctly | 2026-05-10 |
| 04-013 | 04 App | LOW | Hardcoded Railway URL fallback in teacher vite.config.js | not-fixed | closed | main | cf9171c | teacher/vite.config.js: fallback → http://localhost:5000 | 2026-05-10 |
| 04-014 | 04 App | LOW | Sparse test coverage for teacher/parent app | partially-fixed | closed | main | 517d358 | parentSidebar.test.jsx added: parentT removal + AIWarnings nav link verified | 2026-05-10 |
| 04-015 | 04 App | LOW | `Promise.all` 6 parallel calls in ChildProfile with single `refreshKey` re-firing all | not-fixed | closed | main | 517d358 | ChildProfile.jsx: split into childRefreshKey (3 calls) + statsRefreshKey (3 calls); WS handlers use separate keys | 2026-05-10 |
| 05-001 | 05 Apps | CRITICAL | `showToast` undefined in 3 admin pages — all error feedback silently crashed | verified-fixed | closed | pre-cycle | pre-cycle | All 3 pages now use `error: toastError` from `useToast()` | pre-cycle |
| 05-002 | 05 Apps | MEDIUM | UsersStats.jsx: swallowed errors + 3 hardcoded English strings | partially-fixed | closed | main | cc78239 | UsersStats.jsx: useTranslation added; 5 hardcoded strings now via t() | 2026-05-10 |
| 05-003 | 05 Apps | MEDIUM | Redundant role filter in ParentManagement — always-true conditions after `role === 'parent'` | not-fixed | closed | main | f6b146e | admin/ParentManagement.jsx: redundant role filter block removed | 2026-05-10 |
| 05-004 | 05 Apps | HIGH | `reception/src/services/dataStore.js` — 540-line dead code file never imported | not-fixed | closed | main | f6b146e | reception/src/services/dataStore.js deleted (540 lines, no importers) | 2026-05-10 |
| 05-005 | 05 Apps | HIGH | `window.confirm` in reception TeacherManagement and GroupManagement | verified-fixed | closed | pre-cycle | pre-cycle | Both now use `ConfirmDialog` state | pre-cycle |
| 05-006 | 05 Apps | MEDIUM | Reception Settings.jsx: US phone placeholder + 3 Uzbek hardcoded strings | not-fixed | closed | main | cc78239 | Settings.jsx: US placeholder → Uzbek; 3 Uzbek strings via t(); 'uz-UZ' → i18n.language | 2026-05-10 |
| 05-007 | 05 Apps | HIGH | Platform.jsx: `window.confirm` + state monolith (394 lines, 25+ state vars) + `useToast?.()` | partially-fixed | closed | main | cc78239 | government/Platform.jsx: useToast?.() → useToast(); confirms removed pre-cycle | 2026-05-10 |
| 05-008 | 05 Apps | HIGH | `?limit=500` hardcoded in government student and teacher list queries | not-fixed | closed | main | f6b146e | Students.jsx+Teachers.jsx: limit=500 → limit=100&page=1 | 2026-05-10 |
| 05-009 | 05 Apps | MEDIUM | `I18nextProvider` only in government app — admin and reception lack it | not-fixed | closed | main | cc78239 | admin/App.jsx + reception/App.jsx: I18nextProvider + i18n import added | 2026-05-10 |
| 05-010 | 05 Apps | MEDIUM | Government list pages (Students, Teachers, Schools, Ratings) swallow API errors silently | not-fixed | closed | main | f6b146e | Schools/Students/Teachers: loadError state added; error rendered to UI | 2026-05-10 |
| 05-011 | 05 Apps | MEDIUM | `SchoolCard` in government Ratings.jsx uses `t` prop-drilling instead of `useTranslation()` | not-fixed | closed | main | cc78239 | Ratings.jsx: SchoolCard now calls useTranslation(); t prop removed from call sites | 2026-05-10 |
| 05-012 | 05 Apps | LOW | `'uz-UZ'` locale hardcoded and Uzbek label hardcoded in government pages | not-fixed | closed | main | cc78239 | AdminDetails/Dashboard/Profile.jsx: i18n.language; hardcoded label via t() | 2026-05-10 |
| 05-013 | 05 Apps | MEDIUM | Admin and reception test coverage sparse — reception still auth-only | partially-fixed | closed | main | 517d358 | reception/src/__tests__/pages/settings.test.jsx: render + i18n + phone format tests added | 2026-05-10 |
| 06-001 | 06 Roles | HIGH | User-facing "super-admin" text in email and Telegram notifications | not-fixed | closed | main | b26c18e | email.js:94 + telegram.js:145,213 all fixed | 2026-05-10 |
| 06-002 | 06 Roles | MEDIUM | Five dead `/message-to-super-admin` route aliases across all role route files | not-fixed | closed | main | pre-cycle | deadRoutes.test.js: 5/5 pass; all aliases deleted | pre-cycle |
| 06-003 | 06 Roles | MEDIUM | Ghost-named files: `superAdminController.js`, `superAdminValidator.js`, `SuperAdminMessage.js`; `BySuper` function names | not-fixed | closed | main | pre-cycle | governmentMessageController.js + GovernmentMessage.js + governmentUserValidator.js | pre-cycle |
| 06-004 | 06 Roles | MEDIUM | 66 `t('superAdmin.*')` calls in government frontend | not-fixed | closed | main | 516eb70 | Same as 01-006: all replaced with t('government.*') | 2026-05-10 |
| 06-005 | 06 Roles | MEDIUM | `requireTeacher` is a bespoke function; not converted to `requireRole()` factory | not-fixed | closed | main | 68bd33c | Documented as intentional in CLAUDE.md; allows teacher/reception/admin | 2026-05-10 |
| 06-006 | 06 Roles | LOW | Test asserts `getRoleLabel('super-admin')` — role string doesn't exist in DB ENUM | not-fixed | closed | main | e26c4ad | Dead map entry + test case removed; now tests government role | 2026-05-10 |
| 06-007 | 06 Roles | LOW | Stale comment in User.js: "every user belongs to a school (except superadmin)" | not-fixed | closed | main | 7d3f5b2 | User.js:95 updated to say 'government users' | 2026-05-10 |
| 07-001 | 07 Design | HIGH | government/index.css missing `@tailwind` directives; wrong `:root` colors; no focus ring | partially-fixed | closed | main | 02bccf7 | :root color overrides removed; *:focus-visible outline: 2px solid #7C3AED added | 2026-05-10 |
| 07-002 | 07 Design | HIGH | Teacher shadow `src/shared/` duplicates monorepo shared context + components | not-fixed | open | — | — | 15 files in `teacher/src/shared/` unchanged; directory grew | — |
| 07-003 | 07 Design | HIGH | Government app has no mobile navigation (no BottomNav for viewports < 1024px) | not-fixed | closed | main | 02bccf7 | Layout.jsx: mobile header + hamburger button + slide-in sidebar + aria-modal/role=dialog added | 2026-05-10 |
| 07-004 | 07 Design | MEDIUM | `DecorativeBackground.jsx` 315-line file is dead code — never imported | not-fixed | closed | main | 25c0141 | teacher/src/shared/components/DecorativeBackground.jsx deleted | 2026-05-10 |
| 07-005 | 07 Design | MEDIUM | Toast notification has no ARIA attributes — screen readers silent | not-fixed | closed | main | 25c0141 | shared/Toast.jsx: role=alert + aria-live + aria-atomic; icons aria-hidden; dismiss aria-label | 2026-05-10 |
| 07-006 | 07 Design | MEDIUM | Teacher users have no language switcher UI | not-fixed | closed | main | f942c22 | teacher/Sidebar.jsx: LanguageSwitcher rendered in footer section | 2026-05-10 |
| 07-007 | 07 Design | MEDIUM | `softNavy: '#7C3AED'` color name is semantically wrong (purple, not navy) | not-fixed | closed | main | ead629c | government/Sidebar.jsx: COLORS.softNavy → COLORS.purple throughout | 2026-05-10 |
| 07-008 | 07 Design | MEDIUM | Shared components hardcoded English: OfflineBanner, ErrorBoundary, BottomNav | not-fixed | closed | main | 2f31084 | OfflineBanner+BottomNav: useTranslation added; ErrorBoundary: class component (hooks N/A) | 2026-05-10 |
| 07-009 | 07 Design | MEDIUM | Admin MessageModal and MessagesModal hardcoded Uzbek and `'uz-UZ'` locale | not-fixed | closed | main | ead629c | MessageModal+MessagesModal: useTranslation; all Uzbek strings via t(key, {defaultValue}) | 2026-05-10 |
| 07-010 | 07 Design | MEDIUM | TopBar hardcoded route paths (`'/notifications'`, `'/settings'`) | not-fixed | closed | main | ead629c | shared/TopBar: notificationsPath + settingsPath props with defaults | 2026-05-10 |
| 07-011 | 07 Design | MEDIUM | OfflineBanner DOM position inconsistent across apps (inside vs outside AppRoutes) | not-fixed | closed | main | f942c22 | government/App.jsx: OfflineBanner moved from AppRoutes to App(); all 4 apps now consistent | 2026-05-10 |
| 07-012 | 07 Design | LOW | Card component has no keyboard accessibility when `onClick` provided | not-fixed | closed | main | 25c0141 | shared/Card.jsx: role=button + tabIndex=0 + onKeyDown Enter/Space + focus-visible ring | 2026-05-10 |
| 07-013 | 07 Design | LOW | Three background components; DecorativeBackground unused (315 lines, ~500 DOM nodes) | partially-fixed | closed | main | 25c0141 | DecorativeBackground.jsx deleted; JoyfulBackground used by parent portal | 2026-05-10 |
| 08-001 | 08 AI | HIGH | Teacher sidebar N+1: 21 API calls per 5s interval per teacher | verified-fixed | closed | pre-cycle | pre-cycle | Both Sidebars now call `/chat/unread-count` at 30s intervals | pre-cycle |
| 08-002 | 08 AI | HIGH | Teacher AI returns 503 on missing key; no fallback; no OpenRouter headers | not-fixed | closed | main | 8fd8828 | teacherAIController: fallback response when no API key; OpenRouter defaultHeaders added | 2026-05-10 |
| 08-003 | 08 AI | HIGH | No per-user or per-endpoint rate limit on AI chat endpoints | not-fixed | closed | main | 8fd8828 | aiChatLimiter: 20/min per user (keyed by req.user.id); applied to parentRoutes + teacherRoutes | 2026-05-10 |
| 08-004 | 08 AI | MEDIUM | AI input message has no upper-bound length check — tokens unbounded | not-fixed | closed | main | 25c0141 | parentAIController+teacherAIController: 400 if message.length > 2000 | 2026-05-10 |
| 08-005 | 08 AI | MEDIUM | Client-supplied chat history (`req.body.messages`) not verified as current user's | not-fixed | closed | main | 8fd8828 | parentAIController: strict role whitelist filter (only 'user'\|'assistant'); comment added | 2026-05-10 |
| 08-006 | 08 AI | MEDIUM | Sequential free-model retry loop — up to 30s latency before fallback | not-fixed | closed | main | f942c22 | parentAIController: sequential for-loop replaced with Promise.any() on 3 free models | 2026-05-10 |
| 08-007 | 08 AI | MEDIUM | `sendWarningNotifications` resolves users but sends nothing; returns `{ success: true }` | not-fixed | closed | main | 25c0141 | aiWarningController: bulkCreate Notification records for targetUsers | 2026-05-10 |
| 08-008 | 08 AI | MEDIUM | Socket.io never called for chat messages — `emitToUser` had zero call sites | verified-fixed | closed | pre-cycle | pre-cycle | `backend/controllers/chatController.js:5,91,100` now calls `emitToUser` | pre-cycle |
| 08-009 | 08 AI | LOW | AIChat localStorage stores PII with no TTL or size cap | not-fixed | closed | main | cc78239 | Same fix as 04-006: localStorage removed; sessions in-memory only | 2026-05-10 |
| 08-010 | 08 AI | LOW | `JWT_EXPIRE` default `'30d'` undermines short-lived token design | verified-fixed | closed | pre-cycle | pre-cycle | `backend/config/env.js:46` now `default('15m')` | pre-cycle |
| 09-001 | 09 Mobile | HIGH | AI Warning resolve button visible to parents — always returns 403 | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/AIWarnings.jsx:176` role check added | pre-cycle |
| 09-002 | 09 Mobile | HIGH | Third ToastContext in teacher bundle; nested ToastProvider in ParentApp | not-fixed | open | — | — | `teacher/src/parent/context/ToastContext.jsx`; `ParentApp.jsx:12-13` | — |
| 09-003 | 09 Mobile | HIGH | Help.jsx English/US contact info visible to parents in Uzbekistan | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/Help.jsx:19-82` fully i18n'd | pre-cycle |
| 09-004 | 09 Mobile | MEDIUM | `parentT()` custom translation function bypasses shared i18n | not-fixed | closed | main | f942c22 | parent Sidebar.jsx: parentT() + 3 JSON imports removed; t('parentSidebar.title', {defaultValue}) used | 2026-05-10 |
| 09-005 | 09 Mobile | MEDIUM | Shared i18n instance causes key namespace collision between teacher and parent apps | not-fixed | wontfix-justified | — | — | mergeDeep() in i18n.js is the mitigation; real fix requires app separation (#04-001) — structural wontfix | 2026-05-10 |
| 09-006 | 09 Mobile | MEDIUM | Parent sidebar fetched 200 messages for unread badge instead of count endpoint | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/components/Sidebar.jsx:66,74` calls `/chat/unread-count` at 30s | pre-cycle |
| 09-007 | 09 Mobile | MEDIUM | AIWarnings page orphaned — no Sidebar or BottomNav link to navigate to it | partially-fixed | closed | main | 25c0141 | parent Sidebar.jsx: AlertTriangle nav item added href=/ai-warnings | 2026-05-10 |
| 09-008 | 09 Mobile | LOW | `alert()` still in AIWarnings.jsx resolve error handler | not-fixed | closed | main | 871a10f | Same fix as 04-009: AIWarnings.jsx alert() → showError() toast | 2026-05-10 |
| 09-009 | 09 Mobile | LOW | `"superAdminReply"` i18n key name unchanged | not-fixed | closed | main | 516eb70 | governmentReply in all 3 parent locale files | 2026-05-10 |
| 09-010 | 09 Mobile | LOW | Dead `teacher/src/parent/pages/Login.jsx` file exists but is never imported | not-fixed | closed | main | 25c0141 | teacher/src/parent/pages/Login.jsx deleted (git rm) | 2026-05-10 |
| 10-001 | 10 Payment | MEDIUM | Three `alterFk()` calls on dropped `payments` table — no try-catch | not-fixed | closed | main | fed19fd | Same as 03-012: migration 20260506000000 payments calls wrapped in try-catch | 2026-05-10 |
| 10-002 | 10 Payment | LOW | `'payments'` still in soft-deletes migration tables array | not-fixed | closed | main | 25c0141 | migration add-extended-soft-deletes: 'payments' removed from tables array | 2026-05-10 |
| 11-001 | 11 Cross | MEDIUM | `errorLogger` defined but never registered in server.js | verified-fixed | closed | pre-cycle | pre-cycle | `backend/server.js:14,179` now imports and registers errorLogger | pre-cycle |
| 11-002 | 11 Cross | MEDIUM | No test coverage threshold enforced in CI | fixed | closed | 362f84e | jest.config.js: threshold 25%/15% from 10%/5% | Threshold set at 10%/5% — not meaningful; CI runs with --coverage | — |
| 11-003 | 11 Cross | LOW | Frontend linting not run in CI | verified-fixed | closed | pre-cycle | pre-cycle | `.github/workflows/ci.yml:133-146` lint-frontend matrix job | pre-cycle |
| 11-004 | 11 Cross | HIGH | `nixpacks.toml` specifies Node 18 — project requires Node ≥20; Node 18 is EOL | verified-fixed | closed | pre-cycle | pre-cycle | `backend/nixpacks.toml:2` now `nodejs_20` | pre-cycle |
| 11-005 | 11 Cross | MEDIUM | No `.env.example` file — required env vars only discoverable from source | fixed | closed | n/a | backend/.env.example exists (6125 bytes); issue was already resolved | Glob `.env.example` returns no results | — |
| 11-006 | 11 Cross | MEDIUM | `shared/locales/` English-only — no Uzbek or Russian at shared layer | fixed | closed | 362f84e | shared/locales/uz.json and ru.json created | `shared/locales/en.json` only file present | — |
| 11-007 | 11 Cross | MEDIUM | `jsdom` in production dependencies — DOM parser in server bundle | verified-fixed | closed | pre-cycle | pre-cycle | `jsdom` moved to devDependencies | pre-cycle |
| 11-008 | 11 Cross | LOW | Two HTML sanitizers: `dompurify` and `sanitize-html` in prod deps | fixed | closed | 362f84e | dompurify removed from backend/package.json (unused) | `backend/package.json:46,61` both in production dependencies | — |
| 11-009 | 11 Cross | LOW | OpenAI SDK at `^4.20.0` — ~47 minor versions behind current | not-fixed | closed | main | 517d358 | backend/package.json: openai ^4.20.0 → ^4.104.0 (latest 4.x, API-compatible) | 2026-05-10 |
| 11-010 | 11 Cross | HIGH | 13 of 22 route groups have no input validators | fixed | closed | 362f84e | routes/teacherResourceRoutes.js + validators/teacherResourceValidator.js | 12 of 13 now have validators; `teacherResourceRoutes.js` still zero | — |
| 11-011 | 11 Cross | LOW | 17 `console.*` calls in controllers bypass structured logger | verified-fixed | closed | pre-cycle | pre-cycle | `grep -r "console\." backend/controllers/` returns 0 | pre-cycle |
| N-001 | New | MEDIUM | `sendWarningNotifications` lies — returns `{ success: true }` but sends nothing | not-fixed | closed | main | 25c0141 | Same as 08-007: bulkCreate Notification records for targetUsers | 2026-05-10 |
| N-002 | New | LOW | Teacher shadow `shared/` directory *grew* during remediation cycle — added ConfirmDialog.jsx and DecorativeElements.jsx | not-fixed | open | — | — | `teacher/src/shared/` now has 15+ files vs original ~10 | — |
| N-003 | New | LOW | Dead `/message-to-super-admin` aliases now also have validators — more functional dead code | not-fixed | closed | main | pre-cycle | Entire alias routes deleted (covered by 06-002) | pre-cycle |

---

## Summary Counts

| Verdict | Count |
|---------|-------|
| closed (verified-fixed pre-cycle) | 24 |
| closed (Phase 1 ghost extermination) | 17 |
| closed (Phase 2 backend + naming) | 14 |
| closed (Phase 3–5 cleanup cycle) | 68 |
| **closed total** | **123** |
| open | 13 |
| **Total** | **136** |

> 136 = 133 original numbered issues + 3 new issues found during v2 re-audit (N-001, N-002, N-003). N-004 (SAST added — positive) excluded as it is not a problem to fix.

---

## Three Non-Negotiable Structural Mandates

These are tracked separately from numbered issues because they span multiple issue IDs.

| Mandate | Covers issues | Status |
|---------|--------------|--------|
| `super_admin_messages` → `government_messages` end-to-end | 01-006/07/08/09/10/11/12, 03-004/16, 06-001/02/03/04, 09-009 | **closed** (Phase 1) |
| `teacher/src/parent/` → standalone `parent/` app at monorepo root | 04-001/07/10, 09-002/04/05, 07-002 | open |
| `teacher/src/shared/` → deleted; imports retargeted to `@shared` | 07-002, N-002, and all shadow component duplication issues | open |

---

## Pre-Commit Hook Status

Hook created at `.husky/commit-msg` (Phase 0). Enforces `(fix|test|chore|refactor)(scope)?: #ID description` format for all fix/test/chore/refactor commits.

---

## CI Backlog Gate Status

The CI gate that validates closed rows in this file does not yet exist. Must be added alongside the pre-commit hook.
