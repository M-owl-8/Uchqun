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
| 01-001 | 01 Naming | HIGH | `'super-admin'` role string in test assertions; dead role label tested | not-fixed | open | — | — | `admin/src/__tests__/utils.test.js:34,113` | — |
| 01-002 | 01 Naming | HIGH | "davlat" Uzbek word in English locale files | not-fixed | open | — | — | English locale files contain Uzbek words | — |
| 01-003 | 01 Naming | HIGH | Help page email hardcoded `support@uchqunplatform.com` | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/Help.jsx:19-82` all strings via `t()` | pre-cycle |
| 01-004 | 01 Naming | HIGH | Hardcoded Railway URL in vite.config.js with no env fallback | not-fixed | open | — | — | `teacher/vite.config.js` | — |
| 01-005 | 01 Naming | MEDIUM | Hardcoded Railway URL fallback retained after env check | not-fixed | open | — | — | `teacher/vite.config.js` VITE_API_URL fallback | — |
| 01-006 | 01 Naming | MEDIUM | `t('superAdmin.*')` calls in government tabs | not-fixed | open | — | — | AdminsTab: 29, Platform: 25, MessagesTab: 12 calls | — |
| 01-007 | 01 Naming | MEDIUM | `"superAdmin"` top-level i18n key in locale files | not-fixed | open | — | — | locale files en/ru/uz under `"superAdmin"` key | — |
| 01-008 | 01 Naming | LOW | `contactSuperAdmin`, `superAdminReply`, `sendToSuperAdmin` i18n key names | not-fixed | open | — | — | parent/teacher/admin locale files | — |
| 01-009 | 01 Naming | LOW | "super-admin tomonidan tasdiqlandi" in Telegram notification | not-fixed | open | — | — | `backend/utils/telegram.js:145` | — |
| 01-010 | 01 Naming | LOW | "super-admin bilan bog'laning" in password reset email | not-fixed | open | — | — | `backend/utils/email.js:94` | — |
| 01-011 | 01 Naming | LOW | `SUPER_ADMIN_SECRET_KEY` in env.example | not-fixed | open | — | — | env.example / env.js | — |
| 01-012 | 01 Naming | LOW | `updateGovernmentBySuper`, `deleteGovernmentBySuper` function names | not-fixed | open | — | — | `backend/controllers/adminUserController.js:30,70,285,332` | — |
| 01-013 | 01 Naming | LOW | `@uchqun.com` domain in create-teacher/admin scripts | not-fixed | open | — | — | `backend/scripts/create-teacher.js` etc. | — |
| 01-014 | 01 Naming | LOW | `"uchqun-teacher-frontend"` package.json name | not-fixed | open | — | — | `teacher/package.json` | — |
| 01-015 | 01 Naming | LOW | `"Uchqun Portal"` title in teacher app | not-fixed | open | — | — | `teacher/index.html` or app config | — |
| 01-016 | 01 Naming | LOW | `'Uchqun Parent Portal'` hardcoded header in parent app | not-fixed | open | — | — | parent Sidebar title via `parentT()` | — |
| 01-017 | 01 Naming | MEDIUM | `'Uchqun School'` hardcoded fallback in receptionParentController | not-fixed | open | — | — | `backend/controllers/receptionParentController.js:35` | — |
| 01-018 | 01 Naming | MEDIUM | `isTeacher` incorrectly included admin role | verified-fixed | closed | pre-cycle | pre-cycle | `shared/context/AuthContext.jsx` now `role === 'teacher'` only | pre-cycle |
| 01-019 | 01 Naming | MEDIUM | `uchqun-production.up.railway.app` URL in PROJECT_GUIDE.md | not-fixed | open | — | — | `docs/internal/PROJECT_GUIDE.md` | — |
| 01-020 | 01 Naming | HIGH | AUDIT_REPORT.md stale file at repo root | not-fixed | open | — | — | `AUDIT_REPORT.md` at repo root | — |
| 02-001 | 02 Backend | HIGH | `User.findByPk()` called on every authenticated request — N+1 DB | not-fixed | open | — | — | `backend/middleware/auth.js:18` | — |
| 02-002 | 02 Backend | MEDIUM | Tokens returned in JSON response body in addition to HTTP-only cookies | not-fixed | open | — | — | `backend/controllers/authController.js` login response | — |
| 02-003 | 02 Backend | LOW | JWT `jti` claim included but no revocation store (Redis or DB table) | not-fixed | open | — | — | auth middleware jti handling | — |
| 02-004 | 02 Backend | LOW | `getMessages` not renamed to `getAllMessages` | not-fixed | open | — | — | backend controller function name | — |
| 02-005 | 02 Backend | HIGH | Base64 avatar data URI stored in `users.avatar` TEXT column (~50KB per user) | not-fixed | open | — | — | `backend/models/User.js` avatar field; controller base64 storage | — |
| 02-006 | 02 Backend | MEDIUM | Socket.io CORS missing `uchqun-platform.vercel.app` production URL | partially-fixed | open | — | — | `backend/config/socket.js:14` — port 5177 added; vercel URL still missing | — |
| 02-007 | 02 Backend | MEDIUM | `console.*` calls in controllers bypass structured logger | verified-fixed | closed | pre-cycle | pre-cycle | `grep -r "console\." backend/controllers/` returns 0 | pre-cycle |
| 02-008 | 02 Backend | LOW | `errorLogger` defined but never registered in server.js | verified-fixed | closed | pre-cycle | pre-cycle | `backend/server.js:179` registers errorLogger | pre-cycle |
| 02-009 | 02 Backend | HIGH | `testApp` uses JWT for refresh token; production uses `crypto.randomBytes` — paths diverge | not-fixed | open | — | — | test helper vs production auth divergence | — |
| 02-010 | 02 Backend | HIGH | Documents (reception approvals) stored in `os.tmpdir()` — wiped on every Railway deploy | verified-fixed | closed | pre-cycle | pre-cycle | Documents now uploaded to cloud storage with persistent URLs | pre-cycle |
| 02-011 | 02 Backend | MEDIUM | 80-line inline route handler inside `childRoutes.js` | verified-fixed | closed | pre-cycle | pre-cycle | Inline handlers moved to controller file | pre-cycle |
| 02-012 | 02 Backend | LOW | Progress route `PUT /api/progress/` has no explicit `requireRole()` guard | not-fixed | open | — | — | `backend/routes/progressRoutes.js` | — |
| 02-013 | 02 Backend | LOW | `config/migrate.js` opens separate Sequelize pool (max:5) instead of reusing main pool | not-fixed | open | — | — | `backend/config/migrate.js` | — |
| 02-014 | 02 Backend | LOW | Migration route returns 500 (not 404) when `MIGRATION_SECRET` is unset | not-fixed | open | — | — | migration auth handler | — |
| 03-001 | 03 DB | HIGH | `Child` model has both `school` string field and `schoolId` FK — dual representation | not-fixed | open | — | — | `backend/models/Child.js` | — |
| 03-002 | 03 DB | MEDIUM | Meal type ENUM uses TitleCase (`'Breakfast'`); MealPlan uses lowercase (`'breakfast'`) | not-fixed | open | — | — | Meal and MealPlan model ENUM definitions | — |
| 03-003 | 03 DB | MEDIUM | `SchoolRating` fields nullable in model but `NOT NULL` required | verified-fixed | closed | pre-cycle | pre-cycle | `allowNull: false` in model and DB confirmed | pre-cycle |
| 03-004 | 03 DB | LOW | `super_admin_messages` table name not renamed to `government_messages` | not-fixed | open | — | — | `backend/models/SuperAdminMessage.js` table name | — |
| 03-005 | 03 DB | HIGH | `users.avatar` TEXT column stores base64 blobs — no migration to VARCHAR(500) URL | not-fixed | open | — | — | `backend/models/User.js:avatar` field type | — |
| 03-006 | 03 DB | LOW | User model `notificationPreferences` default includes `push: true` | not-fixed | open | — | — | `backend/models/User.js` notificationPreferences default | — |
| 03-007 | 03 DB | MEDIUM | `TherapyUsage` has `RESTRICT` FK with no pre-delete handler | not-fixed | open | — | — | `backend/models/TherapyUsage.js` parentId FK | — |
| 03-008 | 03 DB | MEDIUM | `News` has `RESTRICT` FK with no pre-delete handler | not-fixed | open | — | — | `backend/models/News.js` createdById FK | — |
| 03-009 | 03 DB | MEDIUM | `AIWarning.targetId` has no FK constraint (polymorphic reference unconstrained) | not-fixed | open | — | — | `backend/models/AIWarning.js` targetId | — |
| 03-010 | 03 DB | MEDIUM | Missing DB indexes on `users.role`, `users.isActive`, `emotional_monitoring` fields | partially-fixed | open | — | — | FK indexes added; `users.role` and `users.isActive` still missing | — |
| 03-011 | 03 DB | HIGH | `refreshToken.tokenHash` index — alleged missing | n/a-confirmed | closed | — | — | Index existed in creation migration all along | — |
| 03-012 | 03 DB | HIGH | Payment cascade migration calls `alterFk()` on non-existent table with no guard | not-fixed | open | — | — | `backend/migrations/20260506000000-add-cascade-rules.js:50-52` | — |
| 03-013 | 03 DB | MEDIUM | FK index corrective migration (removes bad/duplicate indexes) | verified-fixed | closed | pre-cycle | pre-cycle | Corrective migration properly applied | pre-cycle |
| 03-014 | 03 DB | MEDIUM | `Document`, `ChatMessage`, `ChildAssessment` lack `paranoid: true` — hard deletes | not-fixed | open | — | — | Model files for Document, ChatMessage, ChildAssessment | — |
| 03-015 | 03 DB | MEDIUM | Mixed naming: 4 newer models use `snake_case` columns while others use `camelCase` | not-fixed | open | — | — | `underscored: true` only on newer models | — |
| 03-016 | 03 DB | LOW | `super_admin_messages` table rename to `government_messages` never filed as migration | not-fixed | open | — | — | No `ALTER TABLE super_admin_messages RENAME` migration exists | — |
| 03-017 | 03 DB | MEDIUM | `progressRoutes PUT` has no `requireRole()` guard | not-fixed | open | — | — | `backend/routes/progressRoutes.js` | — |
| 03-018 | 03 DB | HIGH | `requireSchoolScope` not globally mounted — applied per-route inconsistently | not-fixed | open | — | — | `backend/server.js` and route files | — |
| 04-001 | 04 App | CRITICAL | Nested `ToastProvider` + `NotificationProvider` in component tree (teacher + parent) | not-fixed | open | — | — | `ParentApp.jsx:12-13`; three ToastContext instances in one bundle | — |
| 04-002 | 04 App | HIGH | Teacher sidebar N+1 polling — 1+N API calls every 5s | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/components/Sidebar.jsx:43` calls `/chat/unread-count` at 30s | pre-cycle |
| 04-003 | 04 App | HIGH | Dashboard stat cards use `<a href>` hard navigation — breaks SPA routing | partially-fixed | open | — | — | Dashboard cards and chat button still use `<a href>`; Help fixed | — |
| 04-004 | 04 App | HIGH | `NotificationContext` stub returns hardcoded `useState(3)` — no API call | not-fixed | open | — | — | `teacher/src/shared/context/NotificationContext.jsx:14` | — |
| 04-005 | 04 App | HIGH | Help.jsx fully hardcoded English with US phone/email placeholders | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/Help.jsx:19-82` all via `t()` | pre-cycle |
| 04-006 | 04 App | HIGH | AIChat history stored in localStorage — no server persistence; PII on disk | not-fixed | open | — | — | `teacher/src/parent/pages/AIChat.jsx:15,45` localStorage calls | — |
| 04-007 | 04 App | MEDIUM | `window.location.href = '/login'` in 401 handler — breaks SPA navigation | not-fixed | open | — | — | Axios interceptor 401 handler in api.js | — |
| 04-008 | 04 App | MEDIUM | "Тарбиячи:" hardcoded Cyrillic label in ChildProfile | partially-fixed | open | — | — | Most labels now i18n; `teacher/src/parent/pages/ChildProfile.jsx:674` still hardcoded | — |
| 04-009 | 04 App | MEDIUM | `alert()`/`confirm()` in 4 pages: MonitoringJournal, TherapyManagement, AIWarnings, Therapy | not-fixed | open | — | — | All 4 files unchanged | — |
| 04-010 | 04 App | MEDIUM | Parent Chat.jsx still polls API every 5s; teacher Chat uses WebSocket | partially-fixed | open | — | — | `teacher/src/parent/pages/Chat.jsx:38` setInterval 5s unchanged | — |
| 04-011 | 04 App | MEDIUM | Parent Settings.jsx silently sets `push: true` on every save | not-fixed | open | — | — | Settings push preference handling | — |
| 04-012 | 04 App | MEDIUM | Client-side teacher filter in ParentManagement and Dashboard (server already scopes) | partially-fixed | open | — | — | Chat.jsx filter removed; ParentManagement and Dashboard still filter client-side | — |
| 04-013 | 04 App | LOW | Hardcoded Railway URL fallback in teacher vite.config.js | not-fixed | open | — | — | `teacher/vite.config.js` VITE_API_URL fallback value | — |
| 04-014 | 04 App | LOW | Sparse test coverage for teacher/parent app | partially-fixed | open | — | — | Test files increased 2→5; parent portal still zero tests | — |
| 04-015 | 04 App | LOW | `Promise.all` 6 parallel calls in ChildProfile with single `refreshKey` re-firing all | not-fixed | open | — | — | `teacher/src/parent/pages/ChildProfile.jsx` Promise.all | — |
| 05-001 | 05 Apps | CRITICAL | `showToast` undefined in 3 admin pages — all error feedback silently crashed | verified-fixed | closed | pre-cycle | pre-cycle | All 3 pages now use `error: toastError` from `useToast()` | pre-cycle |
| 05-002 | 05 Apps | MEDIUM | UsersStats.jsx: swallowed errors + 3 hardcoded English strings | partially-fixed | open | — | — | Error now surfaced; "Users Statistics", "Track user growth", "All Roles" still hardcoded | — |
| 05-003 | 05 Apps | MEDIUM | Redundant role filter in ParentManagement — always-true conditions after `role === 'parent'` | not-fixed | open | — | — | `admin/src/pages/ParentManagement.jsx:49-55` | — |
| 05-004 | 05 Apps | HIGH | `reception/src/services/dataStore.js` — 540-line dead code file never imported | not-fixed | open | — | — | `reception/src/services/dataStore.js` exists (540 lines); no imports | — |
| 05-005 | 05 Apps | HIGH | `window.confirm` in reception TeacherManagement and GroupManagement | verified-fixed | closed | pre-cycle | pre-cycle | Both now use `ConfirmDialog` state | pre-cycle |
| 05-006 | 05 Apps | MEDIUM | Reception Settings.jsx: US phone placeholder + 3 Uzbek hardcoded strings | not-fixed | open | — | — | `reception/src/pages/Settings.jsx:232,419,529,545` | — |
| 05-007 | 05 Apps | HIGH | Platform.jsx: `window.confirm` + state monolith (394 lines, 25+ state vars) + `useToast?.()` | partially-fixed | open | — | — | Confirms replaced; monolith and `useToast?.()` unchanged | — |
| 05-008 | 05 Apps | HIGH | `?limit=500` hardcoded in government student and teacher list queries | not-fixed | open | — | — | `government/src/pages/Students.jsx:21`; `Teachers.jsx:21` | — |
| 05-009 | 05 Apps | MEDIUM | `I18nextProvider` only in government app — admin and reception lack it | not-fixed | open | — | — | `government/src/App.jsx:77` has I18nextProvider; others don't | — |
| 05-010 | 05 Apps | MEDIUM | Government list pages (Students, Teachers, Schools, Ratings) swallow API errors silently | not-fixed | open | — | — | All 4 catch blocks set empty state with no user feedback | — |
| 05-011 | 05 Apps | MEDIUM | `SchoolCard` in government Ratings.jsx uses `t` prop-drilling instead of `useTranslation()` | not-fixed | open | — | — | `government/src/pages/Ratings.jsx:74,337` | — |
| 05-012 | 05 Apps | LOW | `'uz-UZ'` locale hardcoded and Uzbek label hardcoded in government pages | not-fixed | open | — | — | `government/src/pages/AdminDetails.jsx:150,304`; `Dashboard.jsx:177` | — |
| 05-013 | 05 Apps | MEDIUM | Admin and reception test coverage sparse — reception still auth-only | partially-fixed | open | — | — | Admin has showToast regression test; reception still 2 auth files | — |
| 06-001 | 06 Roles | HIGH | User-facing "super-admin" text in email and Telegram notifications | not-fixed | open | — | — | `backend/utils/email.js:94`; `backend/utils/telegram.js:145,213` | — |
| 06-002 | 06 Roles | MEDIUM | Five dead `/message-to-super-admin` route aliases across all role route files | not-fixed | open | — | — | adminRoutes:49, teacherRoutes:70, receptionRoutes:58, parentRoutes:73, userRoutes:21 | — |
| 06-003 | 06 Roles | MEDIUM | Ghost-named files: `superAdminController.js`, `superAdminValidator.js`, `SuperAdminMessage.js`; `BySuper` function names | not-fixed | open | — | — | 3 files + 4 function names in adminUserController.js | — |
| 06-004 | 06 Roles | MEDIUM | 66 `t('superAdmin.*')` calls in government frontend | not-fixed | open | — | — | AdminsTab:29, Platform:25, MessagesTab:12 | — |
| 06-005 | 06 Roles | MEDIUM | `requireTeacher` is a bespoke function; not converted to `requireRole()` factory | not-fixed | open | — | — | `backend/middleware/auth.js:65` | — |
| 06-006 | 06 Roles | LOW | Test asserts `getRoleLabel('super-admin')` — role string doesn't exist in DB ENUM | not-fixed | open | — | — | `admin/src/__tests__/utils.test.js:34,113` | — |
| 06-007 | 06 Roles | LOW | Stale comment in User.js: "every user belongs to a school (except superadmin)" | not-fixed | open | — | — | `backend/models/User.js:95` | — |
| 07-001 | 07 Design | HIGH | government/index.css missing `@tailwind` directives; wrong `:root` colors; no focus ring | partially-fixed | open | — | — | Tailwind directives added; `:root` still `rgba(0,0,0,0.87)` / `#fff`; no `*:focus-visible` | — |
| 07-002 | 07 Design | HIGH | Teacher shadow `src/shared/` duplicates monorepo shared context + components | not-fixed | open | — | — | 15 files in `teacher/src/shared/` unchanged; directory grew | — |
| 07-003 | 07 Design | HIGH | Government app has no mobile navigation (no BottomNav for viewports < 1024px) | not-fixed | open | — | — | `government/src/components/Layout.jsx` (45 lines); no BottomNav import | — |
| 07-004 | 07 Design | MEDIUM | `DecorativeBackground.jsx` 315-line file is dead code — never imported | not-fixed | open | — | — | `teacher/src/shared/components/DecorativeBackground.jsx` | — |
| 07-005 | 07 Design | MEDIUM | Toast notification has no ARIA attributes — screen readers silent | not-fixed | open | — | — | `shared/components/Toast.jsx:23-26` emoji icons; no role/aria-live | — |
| 07-006 | 07 Design | MEDIUM | Teacher users have no language switcher UI | not-fixed | open | — | — | Teacher Layout/Sidebar has no LanguageSwitcher component | — |
| 07-007 | 07 Design | MEDIUM | `softNavy: '#7C3AED'` color name is semantically wrong (purple, not navy) | not-fixed | open | — | — | `government/src/components/Sidebar.jsx:16` | — |
| 07-008 | 07 Design | MEDIUM | Shared components hardcoded English: OfflineBanner, ErrorBoundary, BottomNav | not-fixed | open | — | — | `shared/components/OfflineBanner.jsx:12`; `ErrorBoundary.jsx:30`; `BottomNav.jsx:5-9` | — |
| 07-009 | 07 Design | MEDIUM | Admin MessageModal and MessagesModal hardcoded Uzbek and `'uz-UZ'` locale | not-fixed | open | — | — | `admin/src/components/MessageModal.jsx:45,59,88,103`; `MessagesModal.jsx:13` | — |
| 07-010 | 07 Design | MEDIUM | TopBar hardcoded route paths (`'/notifications'`, `'/settings'`) | not-fixed | open | — | — | `shared/components/TopBar.jsx:33,49` | — |
| 07-011 | 07 Design | MEDIUM | OfflineBanner DOM position inconsistent across apps (inside vs outside AppRoutes) | not-fixed | open | — | — | `government/src/App.jsx:44`; `admin/src/App.jsx:80` | — |
| 07-012 | 07 Design | LOW | Card component has no keyboard accessibility when `onClick` provided | not-fixed | open | — | — | `shared/components/Card.jsx` | — |
| 07-013 | 07 Design | LOW | Three background components; DecorativeBackground unused (315 lines, ~500 DOM nodes) | partially-fixed | open | — | — | JoyfulBackground now used by parent portal; DecorativeBackground still dead | — |
| 08-001 | 08 AI | HIGH | Teacher sidebar N+1: 21 API calls per 5s interval per teacher | verified-fixed | closed | pre-cycle | pre-cycle | Both Sidebars now call `/chat/unread-count` at 30s intervals | pre-cycle |
| 08-002 | 08 AI | HIGH | Teacher AI returns 503 on missing key; no fallback; no OpenRouter headers | not-fixed | open | — | — | `backend/controllers/teacherAIController.js:47-54` | — |
| 08-003 | 08 AI | HIGH | No per-user or per-endpoint rate limit on AI chat endpoints | not-fixed | open | — | — | No AI-specific rate limiter in parentRoutes or teacherRoutes | — |
| 08-004 | 08 AI | MEDIUM | AI input message has no upper-bound length check — tokens unbounded | not-fixed | open | — | — | `backend/controllers/parent/parentAIController.js:8`; `teacherAIController.js:7` | — |
| 08-005 | 08 AI | MEDIUM | Client-supplied chat history (`req.body.messages`) not verified as current user's | not-fixed | open | — | — | `backend/controllers/parent/parentAIController.js:36-40` | — |
| 08-006 | 08 AI | MEDIUM | Sequential free-model retry loop — up to 30s latency before fallback | not-fixed | open | — | — | `backend/controllers/parent/parentAIController.js:159-219` | — |
| 08-007 | 08 AI | MEDIUM | `sendWarningNotifications` resolves users but sends nothing; returns `{ success: true }` | not-fixed | open | — | — | `backend/controllers/aiWarningController.js:292-340` | — |
| 08-008 | 08 AI | MEDIUM | Socket.io never called for chat messages — `emitToUser` had zero call sites | verified-fixed | closed | pre-cycle | pre-cycle | `backend/controllers/chatController.js:5,91,100` now calls `emitToUser` | pre-cycle |
| 08-009 | 08 AI | LOW | AIChat localStorage stores PII with no TTL or size cap | not-fixed | open | — | — | `teacher/src/parent/pages/AIChat.jsx:15,45` | — |
| 08-010 | 08 AI | LOW | `JWT_EXPIRE` default `'30d'` undermines short-lived token design | verified-fixed | closed | pre-cycle | pre-cycle | `backend/config/env.js:46` now `default('15m')` | pre-cycle |
| 09-001 | 09 Mobile | HIGH | AI Warning resolve button visible to parents — always returns 403 | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/AIWarnings.jsx:176` role check added | pre-cycle |
| 09-002 | 09 Mobile | HIGH | Third ToastContext in teacher bundle; nested ToastProvider in ParentApp | not-fixed | open | — | — | `teacher/src/parent/context/ToastContext.jsx`; `ParentApp.jsx:12-13` | — |
| 09-003 | 09 Mobile | HIGH | Help.jsx English/US contact info visible to parents in Uzbekistan | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/pages/Help.jsx:19-82` fully i18n'd | pre-cycle |
| 09-004 | 09 Mobile | MEDIUM | `parentT()` custom translation function bypasses shared i18n | not-fixed | open | — | — | `teacher/src/parent/components/Sidebar.jsx:43-56,106` | — |
| 09-005 | 09 Mobile | MEDIUM | Shared i18n instance causes key namespace collision between teacher and parent apps | not-fixed | open | — | — | `teacher/src/parent/i18n.js`; shared namespace with teacher | — |
| 09-006 | 09 Mobile | MEDIUM | Parent sidebar fetched 200 messages for unread badge instead of count endpoint | verified-fixed | closed | pre-cycle | pre-cycle | `teacher/src/parent/components/Sidebar.jsx:66,74` calls `/chat/unread-count` at 30s | pre-cycle |
| 09-007 | 09 Mobile | MEDIUM | AIWarnings page orphaned — no Sidebar or BottomNav link to navigate to it | partially-fixed | open | — | — | Route wired at `App.jsx:99`; no UI navigation link exists | — |
| 09-008 | 09 Mobile | LOW | `alert()` still in AIWarnings.jsx resolve error handler | not-fixed | open | — | — | `teacher/src/parent/pages/AIWarnings.jsx:46` | — |
| 09-009 | 09 Mobile | LOW | `"superAdminReply"` i18n key name unchanged | not-fixed | open | — | — | `teacher/src/parent/locales/uz/common.json:38` | — |
| 09-010 | 09 Mobile | LOW | Dead `teacher/src/parent/pages/Login.jsx` file exists but is never imported | not-fixed | open | — | — | File exists; `App.jsx` routes to teacher-level Login | — |
| 10-001 | 10 Payment | MEDIUM | Three `alterFk()` calls on dropped `payments` table — no try-catch | not-fixed | open | — | — | `backend/migrations/20260506000000-add-cascade-rules.js:50-52` | — |
| 10-002 | 10 Payment | LOW | `'payments'` still in soft-deletes migration tables array | not-fixed | open | — | — | `backend/migrations/20260506000001-add-extended-soft-deletes.js:10` | — |
| 11-001 | 11 Cross | MEDIUM | `errorLogger` defined but never registered in server.js | verified-fixed | closed | pre-cycle | pre-cycle | `backend/server.js:14,179` now imports and registers errorLogger | pre-cycle |
| 11-002 | 11 Cross | MEDIUM | No test coverage threshold enforced in CI | partially-fixed | open | — | — | Threshold set at 10%/5% — not meaningful; CI runs with --coverage | — |
| 11-003 | 11 Cross | LOW | Frontend linting not run in CI | verified-fixed | closed | pre-cycle | pre-cycle | `.github/workflows/ci.yml:133-146` lint-frontend matrix job | pre-cycle |
| 11-004 | 11 Cross | HIGH | `nixpacks.toml` specifies Node 18 — project requires Node ≥20; Node 18 is EOL | verified-fixed | closed | pre-cycle | pre-cycle | `backend/nixpacks.toml:2` now `nodejs_20` | pre-cycle |
| 11-005 | 11 Cross | MEDIUM | No `.env.example` file — required env vars only discoverable from source | not-fixed | open | — | — | Glob `.env.example` returns no results | — |
| 11-006 | 11 Cross | MEDIUM | `shared/locales/` English-only — no Uzbek or Russian at shared layer | not-fixed | open | — | — | `shared/locales/en.json` only file present | — |
| 11-007 | 11 Cross | MEDIUM | `jsdom` in production dependencies — DOM parser in server bundle | verified-fixed | closed | pre-cycle | pre-cycle | `jsdom` moved to devDependencies | pre-cycle |
| 11-008 | 11 Cross | LOW | Two HTML sanitizers: `dompurify` and `sanitize-html` in prod deps | not-fixed | open | — | — | `backend/package.json:46,61` both in production dependencies | — |
| 11-009 | 11 Cross | LOW | OpenAI SDK at `^4.20.0` — ~47 minor versions behind current | not-fixed | open | — | — | `backend/package.json:58` | — |
| 11-010 | 11 Cross | HIGH | 13 of 22 route groups have no input validators | partially-fixed | open | — | — | 12 of 13 now have validators; `teacherResourceRoutes.js` still zero | — |
| 11-011 | 11 Cross | LOW | 17 `console.*` calls in controllers bypass structured logger | verified-fixed | closed | pre-cycle | pre-cycle | `grep -r "console\." backend/controllers/` returns 0 | pre-cycle |
| N-001 | New | MEDIUM | `sendWarningNotifications` lies — returns `{ success: true }` but sends nothing | not-fixed | open | — | — | `backend/controllers/aiWarningController.js:292-340` | — |
| N-002 | New | LOW | Teacher shadow `shared/` directory *grew* during remediation cycle — added ConfirmDialog.jsx and DecorativeElements.jsx | not-fixed | open | — | — | `teacher/src/shared/` now has 15+ files vs original ~10 | — |
| N-003 | New | LOW | Dead `/message-to-super-admin` aliases now also have validators — more functional dead code | not-fixed | open | — | — | `adminRoutes.js:49`, `teacherRoutes.js:70` with validator middleware | — |

---

## Summary Counts

| Verdict | Count |
|---------|-------|
| closed (verified-fixed pre-cycle) | 24 |
| open (not-fixed) | 96 |
| open (partially-fixed) | 16 |
| **Total** | **136** |

> 136 = 133 original numbered issues + 3 new issues found during v2 re-audit (N-001, N-002, N-003). N-004 (SAST added — positive) excluded as it is not a problem to fix.

---

## Three Non-Negotiable Structural Mandates

These are tracked separately from numbered issues because they span multiple issue IDs.

| Mandate | Covers issues | Status |
|---------|--------------|--------|
| `super_admin_messages` → `government_messages` end-to-end | 01-006/07/08/09/10/11/12, 03-004/16, 06-001/02/03/04, 09-009 | open |
| `teacher/src/parent/` → standalone `parent/` app at monorepo root | 04-001/07/10, 09-002/04/05, 07-002 | open |
| `teacher/src/shared/` → deleted; imports retargeted to `@shared` | 07-002, N-002, and all shadow component duplication issues | open |

---

## Pre-Commit Hook Status

The pre-commit hook enforcing commit message format `(fix|test|chore|refactor)(.+)?: #(ID) .+` does not yet exist in `.husky/`. This must be created as part of Phase 0 setup before any issue commits begin.

---

## CI Backlog Gate Status

The CI gate that validates closed rows in this file does not yet exist. Must be added alongside the pre-commit hook.
