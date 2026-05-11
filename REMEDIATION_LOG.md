# Remediation Log

Tracks findings from `AUDIT.md` as they are resolved. Each entry links the fix
to a specific commit and records the verification command output.

---

## Stage 0 — Broken Tests / Lint Errors

### C-02a — `reception.test.js` imported functions that don't exist on `receptionController.js`
- **Status:** CLOSED
- **Commit:** 1684bba
- **Root cause:** `createTeacher` and `deleteParent` were destructured from the
  controller barrel; both live in separate sub-controllers.
- **Fix:** Split import → `receptionTeacherController.js` / `receptionParentController.js`
- **Verification:** `npm test -- __tests__/reception.test.js` → PASS

---

### C-02b — `parentRating.test.js` imported from a file that never existed
- **Status:** CLOSED
- **Commit:** a7ace53
- **Root cause:** `parentRatingController.js` was never created; the real file is
  `parentTeacherRatingController.js`.
- **Fix:** Corrected import path.
- **Verification:** `npm test -- __tests__/parentRating.test.js` → PASS

---

### C-02c — `aiWarning.test.js` `SyntaxError: 'Sequelize' not exported by mock`
- **Status:** CLOSED
- **Commit:** 2921596
- **Root cause:** `Notification` model not mocked → transitive load of `database.js`
  which does `import { Sequelize } from 'sequelize'` against a mock that only had `{ Op }`.
- **Fix:** Added `Notification` mock + added `Sequelize: class {}` to sequelize mock.
- **Verification:** `npm test -- __tests__/aiWarning.test.js` → PASS

---

### C-02d — Five test suites with wrong imports or broken cookie-based auth
- **Status:** CLOSED
- **Commit:** b4f2656
- **Files fixed:**
  - `adminUser.test.js` — renamed `updateAdminBySuper`/`deleteAdminBySuper` → `updateAdmin`/`deleteAdmin`
  - `chat.test.js` — mock `../config/socket.js` to prevent `models/index.js` associations running against mock objects
  - `child.test.js` — removed `addChild` (function was deleted; child creation moved to reception)
  - `teacher.test.js` — split `updateTaskStatus` import to `teacherTaskController.js`
  - `integration/child.integration.test.js` — switch from `supertest(app)` to `supertest.agent(app)` so cookies persist across requests; remove `accessToken` body extraction (server uses HTTP-only cookies)
- **Verification:** Full backend suite 61/61 PASS, 481 tests

---

### M-08 — `government/Platform.test.jsx` failed to resolve `react-i18next` from shared component
- **Status:** CLOSED
- **Commit:** 1529590
- **Root cause:** `@shared/components/ConfirmDialog.jsx` imports `react-i18next`;
  Vite couldn't find it when transforming from the shared folder's context.
  Same pattern as the pre-existing `axios` alias workaround.
- **Fix:** Added `'react-i18next': path.resolve(__dirname, 'node_modules/react-i18next')`
  to `government/vite.config.js` resolve aliases.
- **Verification:** `npm test -- --run` in government → 5/5 suites PASS

---

### M-09 — `reception/settings.test.jsx` `container.querySelector('h1')` returned null
- **Status:** CLOSED
- **Commit:** 1529590
- **Root cause:** `Settings.jsx` initializes `loading: true` and renders a spinner
  until `loadUserProfile()` resolves. The test called `querySelector` synchronously
  before the async state update.
- **Fix:** Wrap assertion in `waitFor(...)`.
- **Verification:** `npm test -- --run` in reception → 3/3 PASS

---

### H-04 — ESLint `no-undef` errors in `vite.config.js` and `server.js` files
- **Status:** CLOSED
- **Commits:** 1529590, b090b49
- **Root cause:** Node.js globals (`process`, `__dirname`, `Buffer`) not declared
  in ESLint config for files that run in Node context.
- **Fix:** Add `/* eslint-env node */` to all four `vite.config.js` and `server.js`
  files; import `beforeAll`/`afterAll` explicitly in `SharedComponents.test.jsx`;
  remove unused `eslint-disable` directive in `teacher/src/i18n.js`.
- **Verification:** `npx eslint vite.config.js server.js` exits 0 in all 4 apps.

---

## Discovered Issues (not in original AUDIT.md)

### N-001 — ~140 pre-existing ESLint warnings fail `--max-warnings 0` CI gate
- **Status:** OPEN (pre-existing, out of scope for Stage 0)
- **Root cause:** All four frontend apps use `eslint . --max-warnings 0`, meaning
  any warning fails lint. There are ~140 `no-unused-vars` and
  `react-hooks/exhaustive-deps` warnings across source files that were never fixed.
- **Affected:** admin (31), teacher (67), reception (15), government (30)
- **Impact:** `npm run lint` has never exited 0 in CI for any frontend app.
- **Recommendation:** Either fix all warnings (large scope), or switch to
  `--max-warnings 50` as an interim gate and add a separate ticket to clear warnings.

---

## Stages 1–8

*(pending — to be filled as each stage completes)*
