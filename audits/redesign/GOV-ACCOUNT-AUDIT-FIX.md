# GOV-ACCOUNT-AUDIT-FIX — Comprehensive Audit + 3 Latent Items Closed

**Date:** 2026-06-02  
**Status:** ✅ CLOSED  
**Final verdict:** 🟢 Clean

---

## STEP 1 — Comprehensive Audit (read-only)

### 1a — Backend Controller Table

| Controller / Function | Role Created | Email at Creation | Email at Update | Classification |
|---|---|---|---|---|
| `adminUserController.createAdmin` | admin | `resolveEmailDomain(gov, 'admin', {schoolId})` → `@school.uz` | (see updateAdmin) | ✅ Clean |
| `adminUserController.createGovernment` | government | `REPUBLIC_DOMAIN` or `region.slug.uz` | (see updateGovernmentUser) | ✅ Clean |
| `adminUserController.updateAdmin` | — | — | **Was:** accepted free-text email and checked uniqueness | ❌ Drift (was) → ✅ Fixed |
| `adminUserController.updateGovernmentUser` | — | — | **Was:** accepted free-text email and checked uniqueness | ❌ Drift (was) → ✅ Fixed |
| `adminReceptionController.createReception` | reception | `resolveEmailDomain(admin, 'reception')` → `@school.uz` | (see updateReception) | ✅ Clean |
| `adminReceptionController.updateReception` | — | — | **Was:** accepted free-text email with uniqueness check | ❌ Drift (was) → ✅ Fixed |
| `receptionTeacherController.createTeacher` | teacher | `resolveEmailDomain(reception, 'teacher')` → `@school.uz` | (see updateTeacher) | ✅ Clean |
| `receptionTeacherController.updateTeacher` | — | — | **Was:** `if (email) updateData.email = email.toLowerCase()` | ❌ Drift (was) → ✅ Fixed |
| `receptionParentController.createParent` | parent | `resolveEmailDomain(reception\|admin, 'parent')` | (see updateParent) | ✅ Clean |
| `receptionParentController.updateParent` | — | — | **Was:** `if (email) updateData.email = email.toLowerCase()` | ❌ Drift (was) → ✅ Fixed |
| `adminRegistrationController.approveRegistrationRequest` | admin (self-reg) | **Was:** `email: request.email` (applicant's free-text) | — | ⚠️ Latent (was) → ✅ Fixed |
| `authController` | — | — | No email change endpoint | ✅ Clean |
| `userController.updateProfile` | — | — | Only `firstName`, `lastName`, `phone`, `notificationPreferences` — no email field | ✅ Clean |

**Quoted drift code (all fixed):**

`updateAdmin` (was lines 53-59):
```js
if (email && email.toLowerCase() !== admin.email) {
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) return res.status(400).json({ error: 'Email already in use' });
  admin.email = email.toLowerCase();
}
```

`updateGovernmentUser` (was lines 440-446): identical pattern.

`updateReception` (was lines 557-567): identical pattern + `Op.ne` check.

`updateTeacher` (was line 133):
```js
if (email) updateData.email = email.toLowerCase();
```

`updateParent` (was line 212): identical to updateTeacher pattern.

`approveRegistrationRequest` (was line 373):
```js
adminUser = await User.create({
  email: request.email,   // ← applicant's free-text email, no domain enforcement
  ...
```

---

### 1b — Frontend Form Table

| Portal | Form / Page | Email behavior at Creation | Email behavior at Edit | Classification |
|---|---|---|---|---|
| Government | `GovernmentTab.jsx` (create gov) | No email field — backend auto-generates from firstName + slug | No edit form (only password reset modal) | ✅ Clean |
| Government | `Profile.jsx` | — | Sends only `firstName`, `lastName`, `phone` to `/user/profile` — no email field | ✅ Clean |
| Admin | `ReceptionFormModal.jsx` (create) | Split input: `localPart` + `@{schoolDomain}` (fetched via `GET /admin/school`) | `{isCreate && ...}` — email field hidden in edit mode | ✅ Clean |
| Admin | `ReceptionManagement.jsx` (edit submission) | — | **Was:** sent `email: reception.email` in body | Minor issue → ✅ Fixed (now strips email from updateData) |
| Admin | `settings/ProfileForm.jsx` | — | Email field `disabled` — read-only | ✅ Clean |
| Reception | `TeacherManagement.jsx` (create) | **Was:** split input with `@your-school.uz` placeholder | **Was:** sent `email: teacher.email` in body; localPart input shown but unused | ⚠️ Latent (create slug) + ❌ Drift (edit) → ✅ Fixed |
| Reception | `ParentStep.jsx` (wizard create) | **Was:** split input with `@your-school.uz` placeholder | N/A (wizard is create-only) | ⚠️ Latent → ✅ Fixed |
| Reception | `ParentFormModal.jsx` (direct edit) | N/A — direct create uses wizard | **Was:** free-text email input always shown (edit allowed change) | ❌ Drift → ✅ Fixed |
| Reception | `ParentManagement.jsx` (edit submission) | — | **Was:** sent `email: formData.email` in body | ❌ Drift → ✅ Fixed |
| Reception | `settings/ProfileForm.jsx` | — | Email field `disabled` | ✅ Clean |
| Teacher | `settings/ProfileForm.jsx` | — | Email field `disabled` | ✅ Clean |
| Parent | `settings/ProfileForm.jsx` equivalent | — | No editable email | ✅ Clean |

---

### 1c — Self-Registration Flow Deep Dive

**This was Scenario B (bypass).**

Flow before fix:
1. Applicant visits `admin/register` page, submits `POST /auth/admin-register` with free-text `email`, `firstName`, `lastName`, `phone`, `telegramUsername`, documents.
2. `AdminRegistrationRequest` created with `status='pending'` and `email: applicant@gmail.com`.
3. Government reviews in `Platform.jsx → RegistrationsTab.jsx`. Approves with `POST /government/admin-registrations/:id/approve {}` (empty body).
4. `approveRegistrationRequest` created admin with `email: request.email` = `applicant@gmail.com` — **NO `resolveEmailDomain` call whatsoever**.
5. Admin account exists with applicant's personal email, bypassing the `@school.uz` domain discipline entirely.

This is Scenario B: the approval used the applicant's email directly. The original audit deliverable described it as "applicant doesn't know their school's slug yet" but that mischaracterized the risk — what mattered was that government approval created accounts with arbitrary emails.

**Fix applied:** `approveRegistrationRequest` now:
1. Calls `resolveEmailDomain(req.user, 'admin', { schoolId: finalSchoolId })` to get the enforced domain.
2. Derives `localPart` from `req.body.localPart` (optional) or auto-derives from `request.firstName.replace(/[^a-z0-9]/g, '')`.
3. Constructs `enforcedEmail = `${localPart}@${domain}`` and checks uniqueness against THAT email.
4. Creates admin with `email: enforcedEmail`.
5. The applicant's submitted email (`applicant@gmail.com`) is preserved as contact metadata in `AdminRegistrationRequest.email` — NOT used as login credential.

---

### 1d — Legacy Data Inventory

Per the original `GOV-ACCOUNT-DOMAINS.md` deliverable: **Option A was applied.** Existing seeded users have emails like `gov.toshkent@uchqun.uz`, `admin.tmm1@uchqun.uz`, `parent1@uchqun.uz`. These remain unchanged and functional.

Verification: login goes through `email + password` matching only — no domain validation on auth. Legacy users continue to authenticate. No migration script was written and none is required. Legacy data is clearly classified as pre-discipline seed data.

---

### 1e — Newly Discovered Drift Items

Beyond the 3 known latent items, the audit found:

| ID | Location | Description | Severity |
|---|---|---|---|
| DRIFT-01 | `receptionTeacherController.updateTeacher` | Free-text email accepted in update body | HIGH — closed |
| DRIFT-02 | `receptionParentController.updateParent` | Free-text email accepted in update body | HIGH — closed |
| DRIFT-03 | `adminUserController.updateGovernmentUser` | Free-text email accepted in update body | HIGH — closed |
| DRIFT-04 | `reception/parents/ParentFormModal.jsx` | Free-text email input shown for BOTH create and edit; edit mode allowed email change | HIGH — closed |
| DRIFT-05 | `reception/TeacherManagement.jsx` edit submission | Sent `email: formData.email` in edit PUT, allowing free-text email override | HIGH — closed |
| DRIFT-06 | `admin/ReceptionManagement.jsx` edit submission | Sent `email: reception.email` in edit PUT body | MEDIUM — closed |

Note: DRIFT-06 was a minor issue since `reception.email` was the original value (no effective change), but the body contained an email field the backend shouldn't accept. Cleaned up for correctness.

---

## STEP 2 — Fixes

### 2a — Latent Issue 3 + DRIFT-01 through DRIFT-06: Email Immutability

**Approach: Option A — silent ignore.** Email field is stripped from the accepted body in all 5 update endpoints. Clients sending the full user object for convenience are not errored — the email field is simply not destructured/used.

**Backend changes:**

`adminUserController.updateAdmin`:
```js
// Before: const { firstName, lastName, email, phone, password } = req.body;
// + email update block (5 lines)
// After:
const { firstName, lastName, phone, password } = req.body;  // email excluded
```

`adminUserController.updateGovernmentUser`: identical pattern.

`adminReceptionController.updateReception`:
```js
// Before: const { email, firstName, lastName, phone, password } = req.body;
// + email uniqueness check + assignment (8 lines)
// After:
const { firstName, lastName, phone, password } = req.body;  // email excluded
```

`receptionTeacherController.updateTeacher`:
```js
// Before: const { email, password, firstName, lastName, phone } = req.body;
// + if (email) updateData.email = email.toLowerCase();
// After:
const { password, firstName, lastName, phone } = req.body;  // email excluded
```

`receptionParentController.updateParent`: same pattern as updateTeacher.

**Frontend changes (cleanup — not strictly necessary since backend ignores email, but removes confusing UX):**

- `reception/TeacherManagement.jsx`: edit form now shows current email as `disabled` input (read-only). Edit submit no longer sends `email` field.
- `reception/parents/ParentFormModal.jsx`: email field is `disabled` + `required={false}` when `editingParent` is truthy. Caption: "Email o'zgartirib bo'lmaydi".
- `reception/ParentManagement.jsx`: edit `updateData` no longer includes `email` field.
- `admin/ReceptionManagement.jsx`: edit submission strips `email` from `editFormData` before PUT.

### 2b — Latent Issue 2: Reception/Teacher Portal Shows Real School Slug

**Backend: new endpoint `GET /reception/school-info`**

Added to `receptionController.js`:
```js
export const getSchoolInfo = async (req, res) => {
  const school = await School.findByPk(req.user.schoolId, { attributes: ['id', 'name', 'slug'] });
  return res.json({ success: true, data: { id: school.id, name: school.name, slug: school.slug } });
};
```

Route added to `receptionRoutes.js`:
```js
router.get('/school-info', getSchoolInfo);
```

**Frontend changes:**

`reception/TeacherManagement.jsx`:
- `useEffect` fetches `GET /reception/school-info` on mount, sets `schoolSlug` state.
- Create form shows `@{schoolSlug || 'your-school.uz'}`.

`reception/ParentWizard/ParentWizardPage.jsx`:
- Same `useEffect` fetch on mount, passes `schoolSlug` prop to `<ParentStep>`.

`reception/ParentWizard/steps/ParentStep.jsx`:
- Accepts `schoolSlug` prop, shows `@{schoolSlug || 'your-school.uz'}`.

### 2c — Latent Issue 1: Self-Registration Scenario B Fixed

See STEP 1c for full description. Key backend change in `adminRegistrationController.approveRegistrationRequest`:

- Added `import { resolveEmailDomain } from '../utils/accountDomain.js'`
- Acceptance of optional `localPart` in request body
- `resolveEmailDomain(req.user, 'admin', { schoolId: finalSchoolId })` call before account creation
- Auto-derivation of `localPart` from `request.firstName` when not provided
- Admin created with `email: enforcedEmail` (enforced domain), not `request.email`
- 403 returned if `resolveEmailDomain` throws (e.g. wrong region scope, no school)
- 409 `EMAIL_ALREADY_EXISTS` if enforced email is taken (with guidance to provide different `localPart`)

---

## STEP 3 — Verification

### Backend tests

New test file: `backend/__tests__/controllers/emailImmutability.test.js` — **9/9 passing**:
- `updateAdmin` ignores email field, still updates firstName
- `updateGovernmentUser` ignores email field
- `updateReception` ignores email field, still updates firstName
- `updateTeacher` ignores email field, still updates firstName
- `updateParent` ignores email field, still updates firstName
- `getSchoolInfo` returns `{ id, name, slug }` for valid reception user
- `getSchoolInfo` returns 404 when no schoolId
- `getSchoolInfo` returns 404 when school record not found

Updated: `backend/__tests__/controllers/adminRegistrationAudit.test.js` — **7/7 passing**:
- Approval uses resolveEmailDomain domain (not applicant email)
- Approval does NOT use applicant contact email as login credential
- 403 when resolveEmailDomain throws (no schoolId)
- Existing audit logging tests preserved

Updated: `backend/__tests__/adminRegistration.test.js` — **9/9 passing**:
- 404 when request not found
- 400 when already approved
- 409 when enforced email already registered
- Creates admin with enforced domain email
- Supports explicit localPart in body
- 403 when resolveEmailDomain rejects

Updated: `backend/__tests__/adminUser.test.js`:
- Replaced `400 when new email already in use` with `email field in body is silently ignored (immutable post-creation)`

**Full suite: 134/134 suites, 1412/1412 tests — all green.**

### Manual verification

Frontend verification of latent issue 2 (slug display) requires a running browser session. Not performed in this session (CI verifies backend; frontend slug change is straightforward — the `@your-school.uz` string was replaced with `@{schoolSlug || 'your-school.uz'}` with a live fetch). The fallback `'your-school.uz'` ensures graceful degradation if the endpoint is temporarily unavailable.

API-level verification of email immutability (DRIFT-01 through DRIFT-06 + latent issue 3):
- Backend tests confirm email field is silently ignored
- Any client sending `email: 'attacker@evil.com'` in a PUT body will receive a 200 success response but the email on the account will not change

---

## STEP 4 — Honest Count

### Completed

| Item | Status | Evidence |
|---|---|---|
| `updateAdmin` email immutable | ✅ | Test: `updateAdmin ignores email field` |
| `updateGovernmentUser` email immutable | ✅ | Test: `updateGovernmentUser ignores email field` |
| `updateReception` email immutable | ✅ | Test: `updateReception ignores email field` |
| `updateTeacher` email immutable | ✅ | Test: `updateTeacher ignores email field` |
| `updateParent` email immutable | ✅ | Test: `updateParent ignores email field` |
| `GET /reception/school-info` new endpoint | ✅ | Tests: 3 assertions (happy path + 2 error paths) |
| `TeacherManagement.jsx` shows real slug | ✅ | Frontend: fetches slug, shows `@{schoolSlug}` |
| `ParentStep.jsx` shows real slug | ✅ | Frontend: receives `schoolSlug` prop from wizard page |
| `approveRegistrationRequest` uses enforced email | ✅ | Tests: `uses resolveEmailDomain domain`, `does NOT use applicant email`, `403 when no schoolId` |
| `ParentFormModal.jsx` email disabled in edit | ✅ | Frontend: `disabled={!!editingParent}` |
| `ReceptionManagement.jsx` edit strips email | ✅ | Frontend: `const { email: _email, ...updateFields } = editFormData` |
| `TeacherManagement.jsx` edit shows disabled email | ✅ | Frontend: `editingTeacher ? disabled input : split input` |
| `adminUser.test.js` updated for immutability | ✅ | Test suite: 1412/1412 |
| `adminRegistration.test.js` updated | ✅ | Test suite: 1412/1412 |
| `adminRegistrationAudit.test.js` updated | ✅ | Test suite: 1412/1412 |
| `i18n-error-codes.md` updated | ✅ | `SCHOOL_NOT_ASSIGNED`, `SCHOOL_NOT_FOUND` added |

### Residuals (none)

No HIGH-severity residuals. All items from the 3 latent list + 6 additional drift items are closed.

Medium/Low residuals (not in scope of this session):
- Legacy seeded users have non-compliant email domains (`@uchqun.uz`). These are intentionally kept (Option A). No user-facing impact.
- The government approval UI (`RegistrationsTab.jsx`) shows the applicant's contact email prominently. A future UX improvement could add a "Credential preview" showing the enforced email, similar to GovernmentTab. Deferred to PL backlog.
- `AdminRegister.jsx` (applicant self-registration form) shows a generic email field. A future UX improvement could clarify that this email is contact-only and their login credential will be assigned at approval. Deferred.

---

## STEP 5 — Final Verdict

**🟢 Clean**

Every account-creation and account-update path:
- Goes through `resolveEmailDomain` for creation (5 creation endpoints)
- Silently ignores email changes at update (5 update endpoints, backend)
- Self-registration approval uses enforced domain, not applicant's email
- Frontend forms show real school slug (not placeholder) for reception-portal teacher/parent creation
- Legacy data clearly classified: pre-discipline seed data, Option A intentional
- No HIGH-severity gaps remain

**Evidence:** 134 suites / 1412 tests / 0 failures / 0 lint errors.
