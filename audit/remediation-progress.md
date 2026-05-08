# Remediation Progress

## Real-Time Scorecard

```
Closed: 0 / 136 (0%)
  CRITICAL: 0 / 2
  HIGH:     0 / 33
  MEDIUM:   0 / 62
  LOW:      0 / 39

Launch blockers closed: 0 / 10
```

## Baseline (recorded Phase 0)

| App | Suites | Tests | Passed | Failed | Runtime |
|-----|--------|-------|--------|--------|---------|
| backend | 54 | 449 | 449 | 0 | 30.7s |
| admin | 3 | 28 | 28 | 0 | 4.9s |
| teacher | 2 | 23 | 23 | 0 | 2.4s |
| reception | 2 | 23 | 23 | 0 | 2.5s |
| government | 5 | 52 | 52 | 0 | 5.4s |

**Total baseline: 66 suites, 575 tests, 575 passing, 0 failing**
Baseline tag: `pre-remediation-baseline` (pushed to origin)

---

## Issue Tracking

| ID | Phase | Severity | Title | Status | Branch | Commit | Test File | Verified | Notes |
|----|-------|----------|-------|--------|--------|--------|-----------|----------|-------|
| 00-001 | 00 | HIGH | `nixpacks.toml` specifies Node 18 (project requires >=20, Node 18 EOL) | open | | | | | |
| 00-002 | 00 | LOW | Teacher package name has `-frontend` suffix; all other apps omit it | open | | | | | |
| 00-003 | 00 | MEDIUM | Payme/Click env vars in `.env.example` are dead (payment system removed) | open | | | | | |
| 00-004 | 00 | MEDIUM | Model/table `SuperAdminMessage`/`super_admin_messages` — legacy name for government messages | open | | | | | |
| 00-005 | 00 | LOW | `superAdminController.js` filename references defunct role | open | | | | | |
| 00-006 | 00 | LOW | `superAdminValidator.js` filename references defunct role | open | | | | | |
| 00-007 | 00 | LOW | Route alias `/message-to-super-admin` — legacy path; references defunct role | open | | | | | |
| 00-008 | 00 | MEDIUM | `shared/` has no `package.json` — cannot be versioned independently | open | | | | | |
| 00-009 | 00 | HIGH | Teacher app has three layers of shared code (`teacher/src/shared/`, `teacher/src/parent/`, root `shared/`) | open | | | | | |
| 00-010 | 00 | MEDIUM | Reception locale files in `public/` vs. `src/` in other apps — inconsistent i18n loading | open | | | | | |
| 00-011 | 00 | MEDIUM | `AUDIT_REPORT.md` references pre-pivot code — not updated | open | | | | | |
| 00-012 | 00 | LOW | Migration adds FK constraints to `payments` table before drop migration removes it | open | | | | | |
| 00-013 | 00 | LOW | Root-level `vercel.json` may conflict with per-app `vercel.json` files | open | | | | | |
| 00-014 | 00 | MEDIUM | `/api/migrations/run` endpoint reachable without `authenticate` middleware | open | | | | | |
| 01-001 | 01 | HIGH | Test asserts `getRoleLabel('super-admin')` → 'Super Admin' — role string not a valid DB ENUM | open | | | | | |
| 01-002 | 01 | MEDIUM | English locale `admin/src/locales/en/common.json` contains Uzbek word "davlat" | open | | | | | |
| 01-003 | 01 | HIGH | Support email shown to parents is `support@uchqunplatform.com` — domain likely non-existent | open | | | | | |
| 01-004 | 01 | HIGH | Hardcoded fallback Railway URL `uchqun-production-2d8a` differs from env.example and PROJECT_GUIDE | open | | | | | |
| 01-005 | 01 | MEDIUM | Stale Railway URL hardcoded in `parentAIController.js` as HTTP-Referer header (×3) | open | | | | | |
| 01-006 | 01 | MEDIUM | Government app uses `t('superAdmin.xxx')` i18n namespace — should be `government` | open | | | | | |
| 01-007 | 01 | MEDIUM | Locale files define `"superAdmin"` top-level key block — references defunct role | open | | | | | |
| 01-008 | 01 | LOW | i18n keys `contactSuperAdmin`, `sendToSuperAdmin`, `superAdminReply` have wrong key names | open | | | | | |
| 01-009 | 01 | LOW | Telegram notification says "super-admin tomonidan tasdiqlandi" | open | | | | | |
| 01-010 | 01 | LOW | Email body says "super-admin bilan bog'laning" | open | | | | | |
| 01-011 | 01 | LOW | `SUPER_ADMIN_SECRET_KEY` env var documented but no code reads it | open | | | | | |
| 01-012 | 01 | LOW | Functions `updateGovernmentBySuper` and `deleteGovernmentBySuper` have misleading "BySuper" suffix | open | | | | | |
| 01-013 | 01 | LOW | Default email addresses use `@uchqun.com` while all other infra uses `@uchqun.uz` | open | | | | | |
| 01-014 | 01 | LOW | Package name `uchqun-teacher-frontend` uniquely uses `-frontend` suffix | open | | | | | |
| 01-015 | 01 | LOW | Teacher public locale title is "Uchqun Portal" — inconsistent | open | | | | | |
| 01-016 | 01 | LOW | `X-Title` OpenRouter header is "Uchqun Parent Portal" — inconsistent | open | | | | | |
| 01-017 | 01 | MEDIUM | Hardcoded fallback string `'Uchqun School'` used as default school name | open | | | | | |
| 01-018 | 01 | MEDIUM | `isTeacher: user?.role === 'teacher' || user?.role === 'admin'` — admin treated as teacher | open | | | | | |
| 01-019 | 01 | MEDIUM | Railway URL in `docs/internal/PROJECT_GUIDE.md` does not match code URL | open | | | | | |
| 01-020 | 01 | HIGH | `AUDIT_REPORT.md` references mobile screens, payment controller, super-admin app — actively misleading | open | | | | | |
| 02-001 | 02 | HIGH | `User.findByPk` on every authenticated request — N+1 DB hit per API call | open | | | | | |
| 02-002 | 02 | MEDIUM | Tokens returned in response body AND set as cookies — dual storage | open | | | | | |
| 02-003 | 02 | LOW | `jti` in access token but no revocation store; logout doesn't invalidate tokens | open | | | | | |
| 02-004 | 02 | LOW | `getMessages` is unscoped — misleadingly named | open | | | | | |
| 02-005 | 02 | HIGH | Avatar stored as base64 data URI in `users.avatar` TEXT column (~2MB per avatar) | open | | | | | |
| 02-006 | 02 | MEDIUM | Socket.io CORS origin missing 4 frontend ports and Netlify/Vercel domains | open | | | | | |
| 02-007 | 02 | MEDIUM | 19 `console.*` calls bypass Winston logger | open | | | | | |
| 02-008 | 02 | LOW | `errorLogger` defined but never registered — dead code | open | | | | | |
| 02-009 | 02 | HIGH | Integration tests use JWT refresh tokens; production uses random-hex — different behaviors | open | | | | | |
| 02-010 | 02 | HIGH | Document `filePath` stores temp filesystem path — wiped on container restart | open | | | | | |
| 02-011 | 02 | MEDIUM | 80+ lines of business logic in `childRoutes.js:79–133` — not a controller; no test coverage | open | | | | | |
| 02-012 | 02 | LOW | `PUT /api/progress/` has no role guard | open | | | | | |
| 02-013 | 02 | LOW | Separate Sequelize instance in `migrate.js` with pool max 5 — migrations compete for connections | open | | | | | |
| 02-014 | 02 | INFO | `POST /api/migrations/run` returns 500 not 404 when `MIGRATION_SECRET` unset | open | | | | | |
| 03-001 | 03 | HIGH | `Child` model has dual school/teacher representation: `school` STRING and `schoolId` FK coexist | open | | | | | |
| 03-002 | 03 | MEDIUM | `Activity` model has denormalized `teacher` STRING; no `teacherId` FK | open | | | | | |
| 03-003 | 03 | MEDIUM | `Meal.mealType` ENUM uses TitleCase; `MealPlan.mealType` uses lowercase — ENUM mismatch | open | | | | | |
| 03-004 | 03 | MEDIUM | `SchoolRating.stars` — migration NOT NULL, model allowNull:true — schema diverged | open | | | | | |
| 03-005 | 03 | HIGH | `users.avatar` TEXT column holds ~2MB base64; loaded on every `User.findByPk()` | open | | | | | |
| 03-006 | 03 | LOW | `notificationPreferences.push` is stale — push_notifications table was dropped | open | | | | | |
| 03-007 | 03 | MEDIUM | `TherapyUsage.parentId` FK uses RESTRICT — cannot delete parent with therapy usage | open | | | | | |
| 03-008 | 03 | MEDIUM | `News.createdById` FK uses RESTRICT — cannot delete admin who created news | open | | | | | |
| 03-009 | 03 | MEDIUM | `AIWarning.targetId` has no FK constraint — polymorphic reference without enforcement | open | | | | | |
| 03-010 | 03 | MEDIUM | Missing indexes on `users.role`, `users.isActive`, `emotional_monitoring`, `ai_warnings`, `notifications` | open | | | | | |
| 03-011 | 03 | HIGH | No index on `RefreshToken.tokenHash` — primary lookup is a full table scan | open | | | | | |
| 03-012 | 03 | HIGH | Migration `20260506000000` applies FK constraints to `payments` — fails on fresh DB | open | | | | | |
| 03-013 | 03 | MEDIUM | FK index migration `20260330000000` silently failed (snake_case column names) | open | | | | | |
| 03-014 | 03 | MEDIUM | Hard delete on notifications, documents, chat_messages, child_assessments, emotional_monitoring | open | | | | | |
| 03-015 | 03 | MEDIUM | Four newer models use `underscored: true` vs camelCase in all other models — inconsistent | open | | | | | |
| 03-016 | 03 | LOW | Legacy table name `super_admin_messages` — should be `government_messages` | open | | | | | |
| 03-017 | 03 | MEDIUM | `PUT /api/progress/` has no role guard or ownership check | open | | | | | |
| 03-018 | 03 | HIGH | School-scope filtering manually applied per controller — no DB-level enforcement | open | | | | | |
| 04-001 | 04 | CRITICAL | Duplicate `ToastProvider` + `NotificationProvider` — nested providers conflict | open | | | | | |
| 04-002 | 04 | HIGH | N+1 API calls every 5 seconds for chat badge — `getUnreadTotalForPrefix` loads all parents | open | | | | | |
| 04-003 | 04 | HIGH | SPA using `<a href>` instead of `<Link>` — full page reloads blow away React state | open | | | | | |
| 04-004 | 04 | HIGH | Teacher `NotificationContext` hardcoded to 3 notifications — badge always wrong | open | | | | | |
| 04-005 | 04 | HIGH | `Help.jsx` 100% hardcoded English with `+1 (555) 123-4567` fake US phone | open | | | | | |
| 04-006 | 04 | HIGH | AI Chat history stored only in `localStorage` — lost on cache clear | open | | | | | |
| 04-007 | 04 | MEDIUM | `window.location.href` for 401 redirect destroys React state | open | | | | | |
| 04-008 | 04 | MEDIUM | Hardcoded Cyrillic text in `ChildProfile.jsx` — nine labels bypass i18n | open | | | | | |
| 04-009 | 04 | MEDIUM | `alert()` and `confirm()` used in four pages | open | | | | | |
| 04-010 | 04 | MEDIUM | Chat polls every 5 seconds instead of using Socket.io | open | | | | | |
| 04-011 | 04 | MEDIUM | Stale `push: true` preference silently saved on every Settings profile update | open | | | | | |
| 04-012 | 04 | MEDIUM | Client-side teacher filter after fetching all parents — data over-fetch | open | | | | | |
| 04-013 | 04 | LOW | `vite.config.js` hardcoded Railway URL as proxy fallback | open | | | | | |
| 04-014 | 04 | LOW | Near-zero test coverage: 6 unit tests for 26-page dual app | open | | | | | |
| 04-015 | 04 | LOW | `ChildProfile.jsx` makes 6 parallel API calls on mount, re-fired on every WebSocket event | open | | | | | |
| 05-001 | 05 | CRITICAL | `useToast()` does NOT export `showToast` — three admin pages call undefined function | open | | | | | |
| 05-002 | 05 | MEDIUM | `UsersStats.jsx` hardcoded English labels; error silently swallowed | open | | | | | |
| 05-003 | 05 | MEDIUM | Redundant client-side role filter logic in `ParentManagement.jsx` | open | | | | | |
| 05-004 | 05 | HIGH | `dataStore.js` — 540-line dead code localStorage CRUD system | open | | | | | |
| 05-005 | 05 | HIGH | `window.confirm()` in two reception pages — inconsistent with custom dialog pattern | open | | | | | |
| 05-006 | 05 | MEDIUM | Three hardcoded Uzbek strings in `reception/Settings.jsx`; US phone placeholder | open | | | | | |
| 05-007 | 05 | HIGH | `Platform.jsx` state monolith — 25+ state vars, 4 useEffect hooks, prop-drilling | open | | | | | |
| 05-008 | 05 | HIGH | `?limit=500` in two government list pages — all records loaded into browser memory | open | | | | | |
| 05-009 | 05 | MEDIUM | `I18nextProvider` only in government — admin/reception do not wrap it | open | | | | | |
| 05-010 | 05 | MEDIUM | Errors silently swallowed in government list pages | open | | | | | |
| 05-011 | 05 | MEDIUM | `t` prop-drilled to `SchoolCard` — prevents extraction | open | | | | | |
| 05-012 | 05 | LOW | Hardcoded Uzbek label and `'uz-UZ'` locale in date formatting in government | open | | | | | |
| 05-013 | 05 | MEDIUM | Admin/Reception near-zero test coverage | open | | | | | |
| 06-001 | 06 | HIGH | User-facing notifications (email/Telegram) still say "super-admin" | open | | | | | |
| 06-002 | 06 | MEDIUM | Five dead `/message-to-super-admin` route aliases | open | | | | | |
| 06-003 | 06 | MEDIUM | Backend file names, model names, function names still use SuperAdmin/superAdmin | open | | | | | |
| 06-004 | 06 | MEDIUM | Frontend i18n namespace `superAdmin.*` (~40 calls) in government app | open | | | | | |
| 06-005 | 06 | MEDIUM | `requireTeacher` is bespoke function allowing reception/admin; inconsistent with role guard factory | open | | | | | |
| 06-006 | 06 | LOW | Dead test for non-existent `'super-admin'` role in `utils.test.js` | open | | | | | |
| 06-007 | 06 | LOW | Stale comment in User model: "except superadmin" should be "except government/business" | open | | | | | |
| 07-001 | 07 | HIGH | `government/index.css` uses Vite default template — missing focus ring, wrong base colors | open | | | | | |
| 07-002 | 07 | HIGH | Teacher app `src/shared/` duplicates root `shared/` — fixes must be applied twice | open | | | | | |
| 07-003 | 07 | HIGH | Government mobile navigation missing — no `BottomNav` below 1024px | open | | | | | |
| 07-004 | 07 | MEDIUM | `DecorativeBackground.jsx` renders ~170 DOM nodes; currently unused | open | | | | | |
| 07-005 | 07 | MEDIUM | Toast lacks ARIA live region; icons use plain emoji instead of lucide-react | open | | | | | |
| 07-006 | 07 | MEDIUM | `LanguageSwitcher` placement inconsistent across apps | open | | | | | |
| 07-007 | 07 | MEDIUM | `softNavy` variable is purple in government; Logout button only in government sidebar | open | | | | | |
| 07-008 | 07 | MEDIUM | Shared components have hardcoded English strings | open | | | | | |
| 07-009 | 07 | MEDIUM | `MessageModal` and `MessagesModal` bypass i18n — all strings hardcoded Uzbek | open | | | | | |
| 07-010 | 07 | MEDIUM | `shared/TopBar.jsx` hardcodes `/notifications` and `/settings` routes | open | | | | | |
| 07-011 | 07 | MEDIUM | `OfflineBanner` DOM position differs across apps | open | | | | | |
| 07-012 | 07 | LOW | `Card.jsx` lacks keyboard accessibility when `onClick` provided | open | | | | | |
| 07-013 | 07 | LOW | Three background variants for teacher app, one used — dead code | open | | | | | |
| 08-001 | 08 | HIGH | Sidebar `getUnreadTotalForPrefix` makes N API calls every 5 seconds | open | | | | | |
| 08-002 | 08 | HIGH | Teacher AI has no fallback — 503 when key absent; missing OpenRouter headers | open | | | | | |
| 08-003 | 08 | HIGH | No rate limiting on AI endpoints — unbounded token spend per user | open | | | | | |
| 08-004 | 08 | MEDIUM | AI input has no max length guard before building prompt | open | | | | | |
| 08-005 | 08 | MEDIUM | Client-supplied chat history unverified — prompt injection risk | open | | | | | |
| 08-006 | 08 | MEDIUM | OpenRouter free-model retry loop adds multi-second latency | open | | | | | |
| 08-007 | 08 | MEDIUM | "AI Warnings" applies hardcoded thresholds; `sendWarningNotifications` is a stub | open | | | | | |
| 08-008 | 08 | MEDIUM | Socket.io running but chat uses REST polling — Socket layer wasted | open | | | | | |
| 08-009 | 08 | LOW | AIChat `localStorage` stores PII with no expiry | open | | | | | |
| 08-010 | 08 | LOW | `JWT_EXPIRE` env default is 30d — access tokens live 30 days if env not set | open | | | | | |
| 09-001 | 09 | HIGH | Parent can see "Mark as Resolved" button that always fails — endpoint admin-only | open | | | | | |
| 09-002 | 09 | HIGH | Third `ToastContext` in one Vite bundle — nested `ToastProvider` silent state divergence | open | | | | | |
| 09-003 | 09 | HIGH | `Help.jsx` 100% English + US placeholder phone/email — parent help page | open | | | | | |
| 09-004 | 09 | MEDIUM | Parent sidebar uses custom `parentT` function bypassing i18n reactivity | open | | | | | |
| 09-005 | 09 | MEDIUM | Shared i18n namespace collision between teacher and parent apps | open | | | | | |
| 09-006 | 09 | MEDIUM | Parent sidebar polls full message history (200 messages) for unread count every 5 seconds | open | | | | | |
| 09-007 | 09 | MEDIUM | `AIWarnings.jsx` orphaned — not routed or linked | open | | | | | |
| 09-008 | 09 | LOW | `AIWarnings.jsx` uses `alert()` for errors | open | | | | | |
| 09-009 | 09 | LOW | Parent locale has `superAdminReply` key — stale from super_admin migration | open | | | | | |
| 09-010 | 09 | LOW | Parent `Login.jsx` file is dead code — never routed | open | | | | | |
| 10-001 | 10 | MEDIUM | `add-cascade-rules` migration calls `alterFk()` on dropped `payments` table | open | | | | | |
| 10-002 | 10 | LOW | `add-extended-soft-deletes` still lists `payments` in tables array | open | | | | | |
| 11-001 | 11 | MEDIUM | `errorLogger` middleware defined but never registered | open | | | | | |
| 11-002 | 11 | MEDIUM | No test coverage threshold enforced in CI | open | | | | | |
| 11-003 | 11 | LOW | Frontend linting not run in CI | open | | | | | |
| 11-004 | 11 | HIGH | `nixpacks.toml` specifies Node 18 — Railway deploys on Node 18; Node 18 EOL | open | | | | | |
| 11-005 | 11 | MEDIUM | No `.env.example` file | open | | | | | |
| 11-006 | 11 | MEDIUM | `shared/locales/` contains only English — no Uzbek/Russian in shared layer | open | | | | | |
| 11-007 | 11 | MEDIUM | `jsdom` in production dependencies — should be devDependencies | open | | | | | |
| 11-008 | 11 | LOW | Two HTML sanitizers (`sanitize-html` and `dompurify`) — redundant | open | | | | | |
| 11-009 | 11 | LOW | OpenAI SDK ~47 minor versions behind | open | | | | | |
| 11-010 | 11 | HIGH | 13 of 22 route groups have no input validators | open | | | | | |
| 11-011 | 11 | LOW | 17 `console.*` calls bypass structured logger | open | | | | | |
