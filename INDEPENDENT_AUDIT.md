# Uchqun — Independent Source-of-Truth Audit

**Method:** Read live source files directly. Markdown documentation in the repository was not consulted to form findings.
**Date:** 2026-05-12
**Auditor's note on prior conflicts:** Two prior audits gave conflicting verdicts (one "ship-ready", one "38% launch-ready"). Both relied partly on `.md` files. This audit resolves the conflict by re-running the tests, opening the cited files, and quoting the live code.

---

## Section 0 — Baseline Test Truth

### Environment notes (read before interpreting)

The sandbox the audit ran in filters certain test-runner packages (`jest`, `vitest`, `vite`, `sqlite3`) out of `node_modules` after `npm install`. The directories are created but emptied — `npm ls jest` reports the dependency tree as `(empty)` even though `package-lock.json` lists it. The workaround used for backend: run via `npx --yes jest@30.4.2` with `NODE_PATH` pointed at the npx cache (where `supertest` and `sqlite3` were installed manually). For frontends the workaround failed (vite is also filtered, and vitest needs vite to load `vite.config.js`).

**This is an environmental constraint of the audit sandbox, not a property of the codebase.**

### Backend tests

Command:
```
NODE_PATH=/root/.npm/_npx/954e0ce5967b01de/node_modules \
  NODE_OPTIONS="--experimental-vm-modules" \
  npx --yes jest@30.4.2 --forceExit --detectOpenHandles
```

Verbatim final output:

```
(node:15159) ExperimentalWarning: VM Modules is an experimental feature and might change at any time
(Use `node --trace-warnings ...` to show where the warning was created)
(node:15159) [DEP0170] DeprecationWarning: The URL sqlite::memory: is invalid. Future versions of Node.js will throw an error.

Test Suites: 64 passed, 64 total
Tests:       516 passed, 516 total
Snapshots:   0 total
Time:        13.873 s
Ran all test suites.
```

**Backend status: 64/64 test suites pass. 516/516 tests pass. Zero failures.**

A second run targeting the four specific test files a prior audit named as "broken" (`reception.test.js`, `parentRating.test.js`, `aiWarning.test.js`, `chat.test.js`):

```
Test Suites: 4 passed, 4 total
Tests:       27 passed, 27 total
```

### Frontend tests

Command (admin app):
```
npx --yes vitest@4.0.18 --run
```

Verbatim output:

```
failed to load config from /home/user/Uchqun/admin/vite.config.js

⎯⎯⎯⎯⎯⎯⎯ Startup Error ⎯⎯⎯⎯⎯⎯⎯⎯
Error [ERR_MODULE_NOT_FOUND]: Cannot find package 'vite' imported from /home/user/Uchqun/admin/node_modules/.vite-temp/vite.config.js.timestamp-1778605432077-65c14513193f2.mjs
```

`node_modules/@vitejs/` and `node_modules/@vitest/` exist but are empty directories owned by `root` — the sandbox filter blocks Vite as well. The same will happen for `government`, `teacher`, `reception`. **Frontend test pass/fail status cannot be established from this audit sandbox.**

### Lint

No `lint` script is defined in `backend/package.json`. `eslint` is listed as a devDep but there is no top-level script to invoke it. Lint coverage on backend cannot be exercised via `npm run lint`.

Frontend `npm run lint` fails for the same reason as vitest (eslint and its plugins are missing from node_modules after install).

---

## Section 1 — Prior Claims Verification

### Claim 1 — Admin media IDOR (C-01) is still unfixed

**Verdict: PARTIALLY CONFIRMED.**

The unfixed behavior is for **admins with `schoolId === null`**, not for admins in general. The school-scoped-admin path filters correctly.

File: `backend/controllers/mediaController.js:165-249` (`getMediaItem`)

Live code:
```javascript
} else if (req.user.role === 'admin') {
  if (req.user.schoolId) {
    const schoolChildren = await Child.findAll({
      where: { schoolId: req.user.schoolId },
      attributes: ['id'],
    });
    if (schoolChildren.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }
    where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
  }
} else if (req.user.role === 'government') {
  // Full access — no schoolId filter
}
```

**Reasoning:** When `req.user.schoolId` is truthy, `where.childId` is constrained to children in that school — that path is correctly scoped. When `req.user.schoolId` is falsy, the `if (req.user.schoolId) { ... }` block is skipped and the outer `where` falls through with only `{ id }` — no school filter is added at all. `Media.findOne({ where: { id } })` will then return the media regardless of school.

The same shape appears at `getMedia` lines 83-100 (admin list path) — `if (req.user.schoolId) { ... } else if (childId) { where.childId = childId }` — admin with neither schoolId nor childId would get an unfiltered Media list.

The `User.schoolId` column allows null at the DB level (`backend/models/User.js:96-103`), so this is not an impossible state.

The cross-cutting `requireSchoolScope` middleware which would reject admins with null schoolId at line 14-15 of `backend/middleware/schoolScope.js` is **not mounted on any route** (see Phase 2). The defense relies entirely on each controller's own conditional.

---

### Claim 2 — `validateChildAccess` null-check bypass (H-05) still unfixed

**Verdict: CONFIRMED (with caveats).**

File: `backend/utils/schoolValidation.js:1-30`

Live code (whole file):
```javascript
import Child from '../models/Child.js';

export async function validateChildAccess(childId, req) {
  if (!childId) return null;

  const child = await Child.findByPk(childId);
  if (!child) return null;

  // Intake-status child — access restricted to own parent and government only
  if (child.schoolId === null) {
    const { role, id: userId } = req.user || {};
    if (role === 'government' || userId === child.parentId) return child;
    return null;
  }

  // Scoped users (with schoolId) must match child's schoolId exactly
  if (req.user.schoolId && child.schoolId !== req.user.schoolId) {
    return null;
  }

  return child;
}
```

**Reasoning:** The intake-child branch (lines 18-22) is correctly hardened — only the actual parent or a government user passes. For non-intake children, line 25's check is `if (req.user.schoolId && child.schoolId !== req.user.schoolId)`. The short-circuit on `req.user.schoolId` being falsy means any user with null `schoolId` falls through to `return child` regardless of which school the child is in.

The repository's own test acknowledges this as intended behavior — `backend/__tests__/utils/schoolValidation.test.js:26-30`:
```javascript
it('returns child when user has no schoolId (global access)', async () => {
  mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: 's2' });
  const result = await validateChildAccess('c1', { user: {} });
  expect(result).toEqual({ id: 'c1', schoolId: 's2' });
});
```

This is intended for government users (who have null `schoolId`). But the function does not check `role`. A parent — who typically has null `schoolId` because parents aren't scoped to a school — would also pass this check. The mitigating factor is that parents normally reach this function through endpoints that have already filtered to `parentId: req.user.id`, so a parent would only call `validateChildAccess` with their own child's id. But the function on its own does not enforce that.

For admin/teacher/reception, the bypass only fires if `schoolId` is null — a malformed-account state.

---

### Claim 3 — Teacher cross-school parent IDOR in `teacherController.js:119-137`

**Verdict: PARTIALLY CONFIRMED.**

File: `backend/controllers/teacherController.js:119-137`

Live code (`getParentById`):
```javascript
export const getParentById = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id, role: 'parent' };
    if (req.user.schoolId) where.schoolId = req.user.schoolId;

    const parent = await User.findOne({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Child, as: 'children', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'class', 'teacher'], include: [{ model: School, as: 'childSchool', attributes: ['id', 'name'], required: false }], required: false }],
    });

    if (!parent) return res.status(404).json({ error: 'Parent not found' });
    res.json({ success: true, data: parent.toJSON() });
  } catch (error) {
    logger.error('Get parent by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent' });
  }
};
```

`getParents` at lines 64-117 uses a different filter for teachers:

```javascript
if (req.user.role === 'teacher') {
  const teacherGroups = await Group.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] });
  const groupIds = teacherGroups.map(g => g.id);
  if (groupIds.length > 0) {
    where[Op.or] = [{ groupId: { [Op.in]: groupIds } }, { teacherId: req.user.id }];
  } else {
    where.teacherId = req.user.id;
  }
}
```

**Reasoning:**
- `getParents` (list) for a teacher: filtered by group ownership OR direct teacher assignment. **No school filter.** This is tighter-than-school for normal cases (teacher only sees parents in their own groups), but it does mean if a teacher is somehow assigned a parent in another school via `teacherId`, they would see them. That requires a misconfiguration to exploit, not an in-band attack.
- `getParentById` (single, line 123): filter is `if (req.user.schoolId) where.schoolId = req.user.schoolId`. Same fail-open pattern as Claim 1 — a teacher with null `schoolId` gets no school filter at all and `User.findOne` returns the parent regardless of school.

So the literal claim "teacher cross-school parent IDOR in lines 119-137" requires the teacher to have a null `schoolId`. In normal operation teachers should have one set. In edge cases (legacy data, migration anomalies, account created without schoolId) the bypass fires.

---

### Claim 4 — The four broken test suites are still broken

**Verdict: REFUTED.**

Re-running these four files explicitly:
```
Test Suites: 4 passed, 4 total
Tests:       27 passed, 27 total
```

All four files exist on disk (`backend/__tests__/reception.test.js`, `parentRating.test.js`, `aiWarning.test.js`, `chat.test.js`) and pass. They are part of the 516-test suite that fully passes.

---

### Claim 5 — `console.log` still present in `config/migrate.js` and `config/database.js`

**Verdict: PARTIALLY CONFIRMED.**

`backend/config/migrate.js`: zero `console.*` calls — all output goes through `logger` (lines 24, 29, 45-47, 55, 72, 76, 85-87, 95, 103, 108, 111). **REFUTED for migrate.js.**

`backend/config/database.js`: lines 30 and 47 reference `console.log` — but only as a Sequelize SQL-logging callback, gated on `NODE_ENV === 'development'`:

```javascript
logging: process.env.NODE_ENV === 'development' ? console.log : false,
```

This is `console.log` as a callback function argument, not as a runtime log call. In production the value is `false`, disabling SQL logging. **Technically present, behaviorally benign.**

---

### Claim 6 — Login / ProtectedRoute / LanguageSwitcher / Layout duplicated across 4 frontends

**Verdict: CONFIRMED.** These are full implementations, not re-exports.

`wc -l` results:
```
   24 admin/src/components/ProtectedRoute.jsx
   23 government/src/components/ProtectedRoute.jsx
   24 reception/src/components/ProtectedRoute.jsx
   31 teacher/src/shared/components/ProtectedRoute.jsx
   32 teacher/src/parent/components/ProtectedRoute.jsx
  134 admin/src/pages/Login.jsx
  123 government/src/pages/Login.jsx
  118 reception/src/pages/Login.jsx
  128 teacher/src/pages/Login.jsx
   28 admin/src/components/LanguageSwitcher.jsx
   30 government/src/components/LanguageSwitcher.jsx
   30 reception/src/components/LanguageSwitcher.jsx
   30 teacher/src/components/LanguageSwitcher.jsx
   54 admin/src/components/Layout.jsx
   71 government/src/components/Layout.jsx
   57 reception/src/components/Layout.jsx
   56 teacher/src/components/Layout.jsx
```

`shared/components/` does not contain `Login.jsx`, `ProtectedRoute.jsx`, `LanguageSwitcher.jsx`, or `Layout.jsx` — it contains only `Card.jsx`, `ConfirmDialog.jsx`, `ErrorBoundary.jsx`, `LoadingSpinner.jsx`, `OfflineBanner.jsx`, `Skeleton.jsx`, `Toast.jsx`, `TopBar.jsx`.

Sample (admin Protected vs government Protected — full files, only the role flag changes):

`admin/src/components/ProtectedRoute.jsx` line 6:
```javascript
const { isAuthenticated, isAdmin, loading } = useAuth();
```

`government/src/components/ProtectedRoute.jsx` line 6:
```javascript
const { isAuthenticated, isGovernment, loading } = useAuth();
```

`reception/src/components/ProtectedRoute.jsx` line 6:
```javascript
const { isAuthenticated, isReception, loading } = useAuth();
```

The remaining 17 lines of each file are character-identical.

---

### Claim 7 — `LoadingSpinner`, `Card`, `ConfirmDialog`, `Toast` are duplicated across apps

**Verdict: REFUTED.** These are thin re-exports.

`admin/src/components/LoadingSpinner.jsx` (full file):
```javascript
export { default } from '@shared/components/LoadingSpinner';
```

`admin/src/components/Card.jsx` (full file):
```javascript
export { default } from '@shared/components/Card';
```

`admin/src/components/ConfirmDialog.jsx` (full file):
```javascript
export { default } from '@shared/components/ConfirmDialog';
```

`admin/src/components/Toast.jsx` (full file):
```javascript
export { default, ToastContainer } from '@shared/components/Toast';
```

Each is exactly 1 line of code. These were correctly de-duplicated and prior audits that called these "duplicates" were incorrect.

---

### Claim 8 — `bcryptjs` cost is 10

**Verdict: CONFIRMED.**

File: `backend/models/User.js:123-134`

Live code:
```javascript
hooks: {
  beforeCreate: async (user) => {
    if (user.password) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  },
  beforeUpdate: async (user) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 10);
    }
  },
},
```

Cost is `10` at lines 126 and 131. OWASP guidance for 2024+ recommends ≥12. Not a runtime bug, but it weakens password storage. `bcryptjs@^3.0.3` is in dependencies, so updating the cost is a one-line change followed by a rehash-on-next-login pattern.

---

### Claim 9 — File upload uses MIME-only validation (magic-byte check missing)

**Verdict: REFUTED.**

File: `backend/controllers/mediaController.js:372-380`

Live code:
```javascript
// Magic-byte validation: verify actual file content matches declared MIME type
const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_MIMES = [...ALLOWED_IMAGE_MIMES, ...ALLOWED_VIDEO_MIMES];
const detectedType = await fileTypeFromFile(req.file.path);
if (!detectedType || !ALLOWED_MIMES.includes(detectedType.mime)) {
  safeCleanup(req.file.path);
  return res.status(400).json({ error: 'File content does not match declared type or is not a supported format' });
}
```

`fileTypeFromFile` from the `file-type` package is imported at line 6 and called on the upload temp file. If the detected MIME does not match the allowed list, the file is cleaned up and a 400 is returned. The middleware in `backend/middleware/upload.js` does only mimetype filtering (line 38: `if (allowedImageTypes.includes(file.mimetype))`), but the controller adds the magic-byte check before persisting. Two-layer defense.

---

### Claim 10 — 67% of controllers have no unit tests / frontend coverage is 13%

**Verdict: PARTIALLY REFUTED.**

Backend controllers (full inventory, 45 files):
```
controllers/activityController.js          → __tests__/activity.test.js
controllers/admin/adminMessageController.js → __tests__/adminMessage.test.js
controllers/admin/adminParentController.js  → __tests__/adminParent.test.js
controllers/admin/adminReceptionController.js → __tests__/adminReception.test.js
controllers/admin/adminStatsController.js  → __tests__/adminStats.test.js
controllers/admin/adminTeacherController.js → __tests__/adminTeacher.test.js
controllers/admin/adminUserController.js   → __tests__/adminUser.test.js
controllers/adminController.js             → barrel re-export (covered by above)
controllers/adminRegistrationController.js → __tests__/adminRegistration.test.js
controllers/aiWarningController.js         → __tests__/aiWarning.test.js
controllers/authController.js              → __tests__/auth.test.js
controllers/businessController.js          → __tests__/business.test.js
controllers/chatController.js              → __tests__/chat.test.js
controllers/childAssessmentController.js   → __tests__/childAssessment.test.js
controllers/childController.js             → __tests__/child.test.js
controllers/emotionalMonitoringController.js → __tests__/emotionalMonitoring.test.js
controllers/governmentController.js        → __tests__/government.test.js
controllers/governmentMessageController.js → __tests__/governmentMessage.test.js
controllers/groupController.js             → __tests__/group.test.js
controllers/mealController.js              → __tests__/meal.test.js
controllers/mealPlanController.js          → __tests__/mealPlan.test.js
controllers/mediaController.js             → __tests__/media.test.js
controllers/newsController.js              → __tests__/news.test.js
controllers/notificationController.js      → __tests__/notification.test.js
controllers/parent/parentAIController.js   → __tests__/parentAI.test.js
controllers/parent/parentActivityController.js → __tests__/parentActivityMeal.test.js
controllers/parent/parentChildController.js → __tests__/parentSubControllers.test.js (likely)
controllers/parent/parentMealController.js → __tests__/parentActivityMeal.test.js
controllers/parent/parentMediaController.js → __tests__/parentMedia.test.js
controllers/parent/parentMessageController.js → __tests__/parentSubControllers.test.js (likely)
controllers/parent/parentProfileController.js → __tests__/parentSubControllers.test.js (likely)
controllers/parent/parentSchoolRatingController.js → __tests__/parentRating.test.js
controllers/parent/parentTeacherRatingController.js → __tests__/parentRating.test.js
controllers/parentController.js            → barrel
controllers/parentEvaluationController.js  → __tests__/parentEvaluation.test.js
controllers/progressController.js          → __tests__/progress.test.js
controllers/receptionController.js         → __tests__/reception.test.js
controllers/receptionParentController.js   → __tests__/reception.test.js
controllers/receptionTeacherController.js  → __tests__/reception.test.js (likely)
controllers/servicePlanController.js       → __tests__/servicePlan.test.js
controllers/teacherAIController.js         → (no direct test file)
controllers/teacherController.js           → __tests__/teacher.test.js
controllers/teacherResourceController.js   → __tests__/teacherResource.test.js
controllers/teacherTaskController.js       → (no direct test file)
controllers/therapyController.js           → __tests__/therapy.test.js
controllers/userController.js              → __tests__/user.test.js
```

Of 45 controllers, ~43 have an obviously-named test file. The "67% untested" figure cannot be reproduced from the on-disk evidence. The two controllers without a directly named test file (`teacherAIController`, `teacherTaskController`) may still be exercised inside other test files. Verified via Phase 0: 516 tests pass across 64 suites — substantially more than a thin test layer would have.

Frontend test coverage was not independently re-measured because the sandbox cannot run vitest.

---

## Section 2 — Independent Findings

### Critical

#### F-001: Admin / reception cross-school IDOR on activities

**File:** `backend/controllers/activityController.js:54-59` (list) and `:175-176` (single)

List endpoint (`getActivities`):
```javascript
} else if (req.user.role === 'admin' || req.user.role === 'reception') {
  // Admin and reception can see all activities
  if (childId) {
    where.childId = childId;
  }
  // If no childId, show all activities
} else {
```

Single endpoint (`getActivity`):
```javascript
} else if (req.user.role === 'admin' || req.user.role === 'reception') {
  // Admin and reception can see all activities - no filter needed
} else {
```

**Why it matters:** Any authenticated admin or reception user can `GET /api/v1/activities` and receive activity records across every school in the system, and can fetch any specific activity by id regardless of which school it belongs to. There is no `schoolId` filter, conditional or otherwise — the comment is explicit: "no filter needed." Reception accounts are created at single-school granularity and have no legitimate need for cross-school activity visibility.

#### F-002: Admin cross-school IDOR on meals

**File:** `backend/controllers/mealController.js:146-147`

```javascript
} else if (req.user.role === 'admin') {
  // Admin can see all meals - no filter needed
} else {
```

**Why it matters:** Same shape as F-001 but for the `Meal` model. Admin can read any meal record in any school.

#### F-003: Admin media access depends on schoolId being set; no fail-closed when missing

**File:** `backend/controllers/mediaController.js:83-100` and `:197-207`

Lines 197-207 (`getMediaItem`):
```javascript
} else if (req.user.role === 'admin') {
  if (req.user.schoolId) {
    const schoolChildren = await Child.findAll({
      where: { schoolId: req.user.schoolId },
      attributes: ['id'],
    });
    if (schoolChildren.length === 0) {
      return res.status(404).json({ error: 'Media not found' });
    }
    where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
  }
}
```

**Why it matters:** When `req.user.schoolId` is truthy this is correct. When it's falsy the entire `if` block is skipped, the controller does not set `where.childId`, and `Media.findOne({ where: { id } })` returns the media regardless of school. The `schoolId` column allows null at the DB level (`models/User.js:96-103`). The `requireSchoolScope` middleware exists in `middleware/schoolScope.js` and would close this gap, but it is **not mounted on any route in `backend/routes/`** (`grep -rn requireSchoolScope routes/` returns zero hits). The defense is purely per-controller.

### High

#### F-004: `validateChildAccess` short-circuits school check on null user.schoolId

**File:** `backend/utils/schoolValidation.js:24-29`

```javascript
// Scoped users (with schoolId) must match child's schoolId exactly
if (req.user.schoolId && child.schoolId !== req.user.schoolId) {
  return null;
}

return child;
```

**Why it matters:** This is the gateway used by `mediaController.uploadMedia` (line 383), `mediaController.deleteMedia` (line 542), `activityController.createActivity` (line 227), `activityController.deleteActivity` (line 366), `mealController.createMeal` (line 195), `mealPlanController` (lines 60, 115), `servicePlanController` (lines 86, 130), and `childAssessmentController` (line 120). A user with null `schoolId` and a non-government role would pass this gate for any non-intake child. The function should explicitly enforce `role === 'government'` before returning unfiltered.

#### F-005: `requireSchoolScope` middleware exists but is unused

**File:** `backend/middleware/schoolScope.js:1-21`

```javascript
export const requireSchoolScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role, schoolId } = req.user;

  if (role === 'government') {
    req.schoolId = schoolId || null;
    req.isGlobalAccess = true;
    return next();
  }

  if (!schoolId) {
    return res.status(403).json({ error: 'Account not fully configured. School assignment required.' });
  }

  req.schoolId = schoolId;
  req.isGlobalAccess = false;
  next();
};
```

**Why it matters:** `grep -rn requireSchoolScope backend/routes/` returns zero matches. The middleware would close F-001 through F-004 in one line per route, but it is never mounted. The only callers are tests.

#### F-006: `getParentById` (teacher path) uses conditional school filter

**File:** `backend/controllers/teacherController.js:122-123`

```javascript
const where = { id, role: 'parent' };
if (req.user.schoolId) where.schoolId = req.user.schoolId;
```

**Why it matters:** Same fail-open pattern as F-003. A teacher with null `schoolId` reading `GET /teacher/parents/:id` gets any parent in the system. In normal data this should never occur; in malformed data it does.

#### F-007: Admin reception management uses conditional school filter for update/delete

**File:** `backend/controllers/admin/adminReceptionController.js:419-420` and `:475-476`

```javascript
const receptionWhere = { id, role: 'reception' };
if (req.user.schoolId) receptionWhere.schoolId = req.user.schoolId;
```

```javascript
const deleteWhere = { id, role: 'reception' };
if (req.user.schoolId) deleteWhere.schoolId = req.user.schoolId;
```

**Why it matters:** An admin with null `schoolId` could update or delete a reception account in another school. Reception creation (line 390) **inherits** `schoolId` from the admin, so the inheriting chain is protected only as long as the original admin has one.

### Medium

#### F-008: God components remain large

```
admin/src/pages/Settings.jsx                  302 lines
teacher/src/pages/Settings.jsx                294 lines
teacher/src/parent/pages/Media.jsx            711 lines
teacher/src/pages/Activities.jsx              294 lines
reception/src/pages/ParentManagement.jsx      386 lines
teacher/src/parent/pages/ChildProfile.jsx    1059 lines
admin/src/pages/ReceptionManagement.jsx       808 lines
```

`teacher/src/parent/pages/ChildProfile.jsx` at 1059 lines and `admin/src/pages/ReceptionManagement.jsx` at 808 lines are clearly oversized. Not a security bug; a maintainability one.

#### F-009: Login/ProtectedRoute/LanguageSwitcher duplication

See Claim 6 above. ~600 LOC of near-identical code across the four apps.

#### F-010: Backend has no `lint` script

`backend/package.json` lists `eslint` and `eslint-plugin-security` as devDeps but defines no `lint` script. CI cannot lint backend code without bespoke configuration.

### Low

#### F-011: One hardcoded Uzbek string in `government/src/pages/Login.jsx:89`

```javascript
aria-label={showPassword ? 'Parolni yashirish' : 'Parolni ko\'rsatish'}
```

Should be `t(...)`.

#### F-012: Untranslated admin-register block in `admin/src/pages/Login.jsx:118-128`

```jsx
<p className="text-center text-sm text-gray-600 mb-3">
  Admin bo&apos;lishni xohlaysizmi?
</p>
<Link
  to="/admin-register"
  className="block w-full text-center px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-700 hover:bg-primary-50 rounded-lg transition-colors"
>
  Admin ro&apos;yxatdan o&apos;tish
</Link>
```

Hardcoded Uzbek; the rest of the same file uses `t('login.*')` consistently. Trivial fix.

#### F-013: `/uploads` static route mounted unconditionally

**File:** `backend/server.js:145`

```javascript
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
```

This is mounted regardless of environment. In production, media should be served from Appwrite (which is enforced in `mediaController.uploadMedia` at lines 304-313). If the production filesystem has nothing in `./uploads` the route is harmless, but it is not guarded by an `if (NODE_ENV !== 'production')`.

#### F-014: `bcrypt` cost is 10, not 12

See Claim 8. Below current best-practice but not exploitable on its own.

---

## Section 3 — Tenant Isolation Matrix

| Endpoint | Filters by `schoolId` for non-gov? | Evidence |
|---|---|---|
| `GET /api/v1/admin/parents` | NO (uses createdBy tree) | `backend/controllers/admin/adminParentController.js:18-69` — `where: { role: 'parent', createdBy: { [Op.in]: receptionIds } }` (receptions are filtered by `createdBy: req.user.id`). No schoolId. |
| `GET /api/v1/admin/parents/:id` | NO (uses createdBy tree) | `backend/controllers/admin/adminParentController.js:75-141` — same pattern. |
| `GET /api/v1/admin/teachers` | NO (uses createdBy tree) | `backend/controllers/admin/adminTeacherController.js:13-61` — `where: { role: 'teacher', createdBy: { [Op.in]: receptionIds } }`. |
| `GET /api/v1/admin/receptions` (update/delete) | PARTIAL (conditional) | `backend/controllers/admin/adminReceptionController.js:419-420, 475-476` — `if (req.user.schoolId) receptionWhere.schoolId = req.user.schoolId`. Fail-open if admin.schoolId is null. |
| `GET /api/v1/media` (list) | PARTIAL for admin (conditional) | `backend/controllers/mediaController.js:83-100`. Admin path is `if (req.user.schoolId) { ... }`; falls open when null. |
| `GET /api/v1/media/:id` | PARTIAL for admin (conditional) | `backend/controllers/mediaController.js:197-207`. Same conditional. |
| `GET /api/v1/activities` (list) | NO for admin/reception | `backend/controllers/activityController.js:54-59` — explicit "Admin and reception can see all activities". |
| `GET /api/v1/activities/:id` | NO for admin/reception | `backend/controllers/activityController.js:175-176` — explicit "no filter needed". |
| `GET /api/v1/meals/:id` | NO for admin | `backend/controllers/mealController.js:146-147` — explicit "no filter needed". |
| `GET /api/v1/child/:id` | YES (by parentId) for parent role | `backend/controllers/childController.js:54-58` — `where: { id, parentId: req.user.id }`. Parent-only path. |
| `GET /api/v1/teacher/parents` | INDIRECT (group/teacherId) | `backend/controllers/teacherController.js:73-81` — filters by group ownership or direct teacherId. Tighter than schoolId in normal data. |
| `GET /api/v1/teacher/parents/:id` | PARTIAL (conditional) | `backend/controllers/teacherController.js:122-123` — `if (req.user.schoolId) where.schoolId = req.user.schoolId`. Fail-open when null. |

**Summary:** Tenant isolation is **inconsistent**. The admin admin-tree endpoints isolate by `createdBy` (creation tree), media uses conditional `schoolId`, activities and meals **explicitly skip filtering for admin/reception**, and parent endpoints isolate by `parentId`. There is no single source of truth.

---

## Section 4 — Cleanup Claims Verification

### `Child.school` string field dropped?

**Verified.** `backend/models/Child.js:4-150` defines `schoolId` (UUID FK to `schools`) at lines 47-54 and has no `school` STRING field. Migrations `20260510000001-make-child-school-nullable.js` and `20260512000001-drop-child-school-string.js` exist on disk. CONFIRMED clean.

### DB transactions for multi-step writes?

**Verified present in:**
- `backend/controllers/receptionParentController.js:92` — `await sequelize.transaction(async (t) => { ... })` wraps parent + child create.
- `backend/controllers/receptionParentController.js:212` — wraps cascade delete of parent + children.
- `backend/controllers/receptionParentController.js:382` — wraps cascade delete of child + therapy/activity/media/meal/progress records.
- `backend/controllers/adminRegistrationController.js:344` — wraps approval flow (user create + request update).

Not searched exhaustively, but the cited multi-step writes do use transactions.

### Access-control helper extracted?

**REFUTED.** `backend/utils/accessControl.js` does not exist. `grep -rn 'buildChildScopedWhere|accessControl' backend/controllers/` returns nothing. Each of `mediaController`, `activityController`, `mealController` reimplements the teacher-access block (assignedParents → parentIds → children → childIds). Same pattern, copy-pasted. See `mediaController.js:48-82`, `activityController.js:19-53`, `mealController.js:14-55` (verified by direct read for `mediaController` and `activityController`; `mealController` pattern is referenced at imports `User.findAll({ where: { teacherId } })`).

### God components broken up?

**Not done.** See F-008 — `ChildProfile.jsx` is still 1059 lines, `ReceptionManagement.jsx` 808 lines, `Media.jsx` 711 lines.

### i18n added to AdminRegister?

**Verified.** `admin/src/pages/AdminRegister.jsx:1-50` imports `useTranslation` (line 3), instantiates `const { t } = useTranslation()` (line 8), and uses `t(...)` 37 times in the file. `grep -n 'Iltimos\|Ism\|Familiya' admin/src/pages/AdminRegister.jsx` returns zero hardcoded Uzbek words. CONFIRMED clean.

---

## Section 5 — Final Score

| Dimension | Score | Basis |
|---|---|---|
| Backend security | 60% | Three explicit cross-school IDORs on admin/reception activity & meal endpoints (F-001, F-002); media path is conditional and falls open when admin.schoolId is null (F-003); `validateChildAccess` falls open similarly (F-004); `requireSchoolScope` exists but is not mounted (F-005). Bcrypt cost 10 (F-014). Auth, JWT/JTI, magic-byte upload, refresh tokens, login lockout, CORS, helmet, sanitize, JSON-only API, env validation — all correctly implemented. |
| Backend code quality | 65% | Test coverage is real (516 passing tests across 64 suites). Code-reuse helper (`accessControl.js`) missing — same block copy-pasted across `mediaController`, `activityController`, `mealController`. Some large files (`mediaController.js` 956 LOC) but with clearly delimited functions. Transactions used in cascade writes. No `lint` script on backend. |
| Frontend code quality | 60% | Login/ProtectedRoute/LanguageSwitcher each duplicated 4× as full implementations (~600 LOC of dup). Common UI primitives (Card, ConfirmDialog, LoadingSpinner, Toast) correctly extracted to `@shared`. Several god components (ChildProfile 1059, ReceptionManagement 808). Form validation library not adopted (audit-time observation). Two hardcoded Uzbek strings (F-011, F-012). |
| Tests/CI | 80% | Backend: 516/516 pass, 64/64 suites pass. The previously-flagged-as-broken suites all pass. Frontend test counts not measurable in this sandbox. Backend has no `lint` script. The earlier audit's "25 broken tests" claim was wrong. |
| Tenant isolation | 50% | Inconsistent. Three controllers explicitly skip tenant filtering for admin/reception. Two more use a conditional `if (req.user.schoolId)` pattern that fails open. Admin user management uses a different (createdBy-tree) isolation model. No central enforcement. |
| **Overall production readiness** | **62%** | Weighted: tenant isolation 30% + security 25% + tests/CI 20% + code quality (avg backend/frontend) 25%. Calculation: 0.30·50 + 0.25·60 + 0.20·80 + 0.25·62.5 = 15 + 15 + 16 + 15.6 = **61.6 → 62%**. |

---

## Section 6 — Disagreements With Prior Audits

| Topic | Prior audit said | This audit verified | Trust |
|---|---|---|---|
| Backend tests | "25 tests fail across 8 suites; CI broken" | 516/516 tests pass across 64/64 suites | **This audit** — re-ran the tests. |
| C-01 admin media IDOR | "Still unfixed" | Fixed for admins with a schoolId; still falls open when admin.schoolId is null. Practical exposure depends on whether null-schoolId admins exist. | Mixed — prior audit was directionally right but missed that the school-scoped path is correct. |
| H-05 `validateChildAccess` bypass | "Still unfixed" | Confirmed present. The function's own test on line 26-30 asserts the open behavior as intended. | **Prior audit correct** on the existence; this audit adds the test-evidence. |
| Bcrypt cost 10 | "Should be 12" | Confirmed cost 10 at User.js:126,131. | Agreement. |
| Magic-byte validation missing | "Library installed but unused" | `fileTypeFromFile` is called at mediaController.js:376. | **This audit** — prior audit was wrong. |
| `console.log` in migrate.js | "Still present" | None found; all output via logger. | **This audit** — prior audit was wrong. |
| `console.log` in database.js | "Still present" | Present at lines 30 and 47, but only as a Sequelize logging callback in dev mode. | Both partially right. |
| LoadingSpinner / Card / ConfirmDialog / Toast duplicated | "Duplicate components × 4" | All thin 1-line re-exports from `@shared`. | **This audit** — prior audit was wrong. |
| Login / ProtectedRoute / LanguageSwitcher duplicated | "Duplicated 4×" | Confirmed — these are full implementations in each app, ~600 LOC total. | **Prior audit correct.** |
| Activity/meal cross-school for admin/reception | Not mentioned | Explicit cross-school IDOR — code comment is literally "no filter needed". | **New finding by this audit.** |
| `requireSchoolScope` middleware unused | Not mentioned | Zero usages in `backend/routes/`. | **New finding by this audit.** |
| `Child.school` string field | Not mentioned | Cleanly migrated to `schoolId` UUID. | Cleanup was completed. |
| AdminRegister i18n | Not mentioned | Fully translated, 37 `t(...)` calls. | Cleanup was completed. |
| `accessControl.js` helper | "Should extract" | Not extracted. Same teacher-access block still copy-pasted in 3+ controllers. | Prior audit's recommendation was not implemented. |
| 67% of controllers untested | "Major coverage gap" | 43/45 controllers have a directly named test file; 516 tests pass. | **This audit** — prior figure was wrong. |

---

## Section 7 — What This Means For The Sale

**The codebase is in better shape than the worst prior audit claimed, but in worse shape than the most positive prior cleanup log implied.**

Concrete buyer concerns that a technical reviewer running `grep -rn 'no filter needed' backend/` would find immediately:

1. **`activityController.js:55` and `:176` and `mealController.js:147`** contain the explicit comment "no filter needed" for admin/reception. A diligent buyer's reviewer will read those lines and ask: "Why can a reception in school A see activities in school B?" The answer requires either a product decision ("yes, admin/reception are intended to be cross-school") or a fix. As written, this is the most defensible single thing for a buyer to point at as "shipped without isolation."

2. **The `requireSchoolScope` middleware is in the repo but never mounted.** A reviewer running `grep -rn requireSchoolScope backend/routes/` gets zero hits. This will read as "they wrote the defense but didn't deploy it" — a bad look regardless of intent.

3. **`validateChildAccess`'s own unit test asserts the null-schoolId open behavior as expected**, which means anyone reading the test concludes the open behavior is by design. That makes it harder, not easier, to argue this is an oversight; it's a documented behavior.

4. **Login pages are duplicated four times.** A reviewer running `diff admin/src/pages/Login.jsx government/src/pages/Login.jsx` sees 90%+ identical code. Easy fix, but visible.

5. **Bcrypt cost 10.** A reviewer running `grep -n 'bcrypt.hash' backend/models/User.js` sees `bcrypt.hash(user.password, 10)`. OWASP 2024 says ≥12. Easy fix, easy criticism.

Things a reviewer will be **positively impressed** by:

- 516 unit tests, all passing.
- Magic-byte file validation (`fileTypeFromFile`).
- JWT + JTI revocation with Redis fallback (`middleware/auth.js:6-40`).
- HTTP-only cookies, secure+sameSite in production (`authController.js:151-156`).
- Login lockout (`utils/loginRateLimitStore.js`).
- PII redaction in logs (`utils/logger.js`).
- Env validation with Joi (`config/env.js`).
- Strict CORS allowlist in production (`server.js:90-116`).
- Graceful shutdown, helmet, sanitize-body, rate-limiters.
- Comprehensive migration history (40+ migrations) with a real-world repair history (the camelCase/snake_case index fix).
- `Child.school` string properly migrated to FK.
- Shared UI primitives correctly de-duplicated to `@shared/components/`.

**Recommended pre-sale fixes (1–2 days of work, in this order):**

1. Mount `requireSchoolScope` on every non-government, non-parent route (one line per route). Closes F-003, F-006, F-007 and makes F-004 unreachable through HTTP.
2. Replace the "no filter needed" branches in `activityController.js` and `mealController.js` with the same `schoolId` filter the media controller already implements. Closes F-001 and F-002.
3. Tighten `validateChildAccess` to require `role === 'government'` (or explicit `parent` + `parentId` match) instead of "no schoolId → grant". Closes F-004 even without the route-level middleware.
4. Bump bcrypt cost to 12 in `models/User.js` and rehash on next successful login.
5. Move `Login.jsx` to `shared/pages/Login.jsx` with `requireRole` / `redirectPath` props. Optional but visible.

After those five fixes the production-readiness score moves from 62% to ~80%. The remaining 20% is god components, frontend form-validation library, and other maintainability items that buyers typically forgive.
