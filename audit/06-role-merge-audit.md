# Phase 6 — Role Merge Audit
## Scope: Every code path branching on `government` vs `super_admin`

> Audit only — no modifications to project files.
> All file references include path + line range.

---

## Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Migration Completeness | 58/100 | Role ENUM is clean; naming debt is extensive |
| User-Facing Accuracy | 45/100 | Two notification channels still say "super-admin" to real users |
| Code Coherence | 52/100 | `requireTeacher` factory inconsistency; BySuper function names |
| Dead-Code Cleanup | 40/100 | 5 dead alias routes; test for non-existent role; naming artifacts |
| Documentation Accuracy | 35/100 | User.js comment says "except superadmin"; telegram/email templates stale |
| **Overall** | **46/100** | Migration is functionally complete; the cleanup work is ≈50% done |

---

## 1. What the Migration Did

The platform originally had a `super_admin` concept — a special admin account identified by email (`SUPER_ADMIN_EMAIL`). A rename was performed to the `government` role. The migration record is:

- **`backend/migrations/20260117000000-add-government-business-roles.js`** — added `government` and `business` to the `enum_users_role` PostgreSQL type
- **`backend/migrations/20260506120000-promote-super-admin-to-government.js`** — promoted any user with `email = SUPER_ADMIN_EMAIL AND role = 'admin'` to `role = 'government'`

The DB schema is clean: `User.role` ENUM is `('admin', 'reception', 'teacher', 'parent', 'government', 'business')` with no `super_admin` value ([backend/models/User.js:36](backend/models/User.js#L36)).

---

## 2. What Is Fully Correct

These paths are clean — no further action needed:

| Item | Location | Status |
|------|----------|--------|
| Role ENUM | `User.js:36` | ✅ `government` only, no `super_admin` |
| `requireGovernment` middleware | `middleware/auth.js:77` | ✅ Clean factory |
| `isActive` bypass | `middleware/auth.js:24–26` | ✅ Government + parent skip `isActive` check intentionally |
| School scope bypass | `middleware/schoolScope.js:8` | ✅ `role === 'government'` gets global access |
| Government route guard | `routes/governmentRoutes.js:57` | ✅ `router.use(requireGovernment)` applied correctly |
| Government login path | `controllers/authController.js` | ✅ No special email-gated login — standard JWT |
| Frontend message calls | All 5 frontend apps | ✅ All call `/message-to-government`, not the old path |
| Government test regression guard | `government/src/__tests__/Platform.test.jsx:82–86` | ✅ Explicitly verifies no `/super-admin/*` endpoints called |

---

## 3. Issues Found

### Issue 06-001 — HIGH: User-Facing Notifications Still Say "super-admin"

Two outbound notification templates still use the old role name, reaching real users:

**Email template** — [`backend/utils/email.js:94`](backend/utils/email.js#L94):
```
Havola muddati o'tib ketsa, super-admin bilan bog'laning.
```
This line is inside the admin registration approval email sent to new admins when the government approves their request. The user-facing Uzbek text tells admins to contact "super-admin" — a concept that no longer exists in the UI.

**Telegram notification** — [`backend/utils/telegram.js:145`](backend/utils/telegram.js#L145):
```
Sizning admin ro'yxatdan o'tish so'rovingiz super-admin tomonidan tasdiqlandi.
```
This is the Telegram bot message sent to admins on approval. Same problem — "super-admin" is the visible actor name.

Both should use "hukumat" (government) or "Uchqun hukumat" to match the role concept.

---

### Issue 06-002 — MEDIUM: Five Dead `/message-to-super-admin` Route Aliases

Each of the five role-specific route files defines both the new canonical path and an old alias:

| Route file | New path | Old alias |
|-----------|----------|-----------|
| `routes/adminRoutes.js:44,46` | `POST /admin/message-to-government` | `POST /admin/message-to-super-admin` |
| `routes/teacherRoutes.js:79,81` | `POST /teacher/message-to-government` | `POST /teacher/message-to-super-admin` |
| `routes/receptionRoutes.js:67,69` | `POST /reception/message-to-government` | `POST /reception/message-to-super-admin` |
| `routes/parentRoutes.js:67,69` | `POST /parent/message-to-government` | `POST /parent/message-to-super-admin` |
| `routes/userRoutes.js:19,21` | `POST /user/message-to-government` | `POST /user/message-to-super-admin` |

All 5 old aliases are labeled "backward-compatible" in comments. **No frontend currently calls them** — every frontend page calls the `-government` path. The aliases are dead code. They also expose a confusing API surface and could trip up future API consumers.

---

### Issue 06-003 — MEDIUM: Backend Naming Debt (Files, Model, Functions)

**File names that still use `SuperAdmin`/`superAdmin`:**
- [`backend/controllers/superAdminController.js`](backend/controllers/superAdminController.js) — handles government message CRUD; should be `governmentMessageController.js`
- [`backend/validators/superAdminValidator.js`](backend/validators/superAdminValidator.js) — already has `createGovernmentValidator` etc. inside; should be `governmentValidator.js`
- [`backend/models/SuperAdminMessage.js`](backend/models/SuperAdminMessage.js) — model class `SuperAdminMessage`, table `super_admin_messages`; model rename is a refactor; table rename requires a new migration

**Exported function names using `BySuper` suffix** ([`backend/controllers/admin/adminUserController.js`](backend/controllers/admin/adminUserController.js)):
- `updateAdminBySuper` (line 30) — should be `updateAdminByGovernment`
- `deleteAdminBySuper` (line 70) — should be `deleteAdminByGovernment`
- `updateGovernmentBySuper` (line 285) — should be `updateGovernmentAccount`
- `deleteGovernmentBySuper` (line 332) — should be `deleteGovernmentAccount`

These are imported and used in [`backend/routes/governmentRoutes.js:18–24`](backend/routes/governmentRoutes.js#L18).

The test file [`backend/__tests__/superAdmin.test.js`](backend/__tests__/superAdmin.test.js) still imports from `superAdminController.js` and describes the suite as `'superAdminController'` (line 29). When the controller is renamed, this test file must be renamed and updated too.

---

### Issue 06-004 — MEDIUM: Frontend i18n Namespace Is Still `superAdmin.*`

The government frontend uses `t('superAdmin.*')` translation keys throughout two tab components:

- [`government/src/components/tabs/AdminsTab.jsx`](government/src/components/tabs/AdminsTab.jsx) — ~25 calls to `t('superAdmin.*')` (lines 29–249)
- [`government/src/components/tabs/MessagesTab.jsx`](government/src/components/tabs/MessagesTab.jsx) — ~10 calls to `t('superAdmin.*')` (lines 16–94)
- [`government/src/pages/Platform.jsx`](government/src/pages/Platform.jsx) — 6 calls to `t('superAdmin.*')` (lines 120–151)

The shared locale [`shared/locales/en.json:12`](shared/locales/en.json#L12) retains the key:
```json
"superAdmin": {
  "title": "Super Admin",
  ...
}
```

This means the government app's admin management panel is internally labeled "Super Admin" in the English locale. The admin/reception locales have `"superAdminReply"` i18n keys for the message reply label (visible to admin and reception users when they view government replies).

---

### Issue 06-005 — MEDIUM: `requireTeacher` Is a Bespoke Function, Not a Factory Call

[`backend/middleware/auth.js:65–73`](backend/middleware/auth.js#L65):

```js
export const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (['teacher', 'reception', 'admin'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions' });
};
```

Every other role-guard is created via the `requireRole()` factory (e.g. `requireGovernment = requireRole('government')`). `requireTeacher` is the only hand-rolled guard, and it allows **three** roles: `teacher`, `reception`, and `admin`.

It is applied at [`backend/routes/teacherRoutes.js:45`](backend/routes/teacherRoutes.js#L45) as a blanket router middleware — meaning every teacher route is accessible to any `admin` or `reception` user. This is likely intentional (admins need to see teacher views), but it is undocumented and the pattern breaks the uniform factory convention. It is also directly relevant to the role-merge audit since it represents residual from the old privilege model.

This is not a security bug given that admin has higher privilege than teacher in the role hierarchy — but it should be explicitly documented (or replaced with `requireRole('teacher', 'reception', 'admin')`).

---

### Issue 06-006 — LOW: Dead Test for Non-Existent Role

[`admin/src/__tests__/utils.test.js:34,113`](admin/src/__tests__/utils.test.js#L34):

```js
const labels = {
  ...
  'super-admin': 'Super Admin',
  ...
};
// line 113:
expect(getRoleLabel('super-admin')).toBe('Super Admin');
```

The test helper `getRoleLabel()` handles `'super-admin'` as a valid role label. This role does not exist in the User ENUM and never appears in the live system. The test asserts behavior for a dead value.

Similarly, [`backend/__tests__/auth.test.js:250`](backend/__tests__/auth.test.js#L250) creates a request with `role: 'superAdmin'` (camelCase) — this is actually correct behavior (testing that the invalid role is rejected), but the test description should make clear this is an invalid/deprecated role test.

---

### Issue 06-007 — LOW: Stale Comment in User Model

[`backend/models/User.js:95`](backend/models/User.js#L95):
```js
// School assignment — every user belongs to a school (except superadmin)
```
Should read "except government and business" to match the actual ENUM.

---

## 4. Architecture Note: `isActive` Bypass Is Correct

`auth.js:24–26`:
```js
const isGovernment = user.role === 'government';
if (!isParent && !isGovernment && !user.isActive) {
  return res.status(403).json({ error: 'Account is not active' });
}
```

Government users bypass the `isActive` check. This is intentional and correct — the government user is the platform owner and should never be locked out by the same activation flow that applies to admin/reception. However, this behavior is currently documented nowhere except this audit. It should be noted in `CLAUDE.md` or `auth.js` as an explicit design decision.

---

## 5. Issue Summary

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| User-facing email/Telegram still say "super-admin" | HIGH | email.js:94, telegram.js:145 | Visible to real users during admin onboarding |
| 5 dead `/message-to-super-admin` route aliases | MEDIUM | 5 route files | Never called by any frontend; confusing dead paths |
| File/model/function naming debt | MEDIUM | superAdminController.js, superAdminValidator.js, SuperAdminMessage.js, 4 function names | Cognitive load; misleads future devs |
| Frontend i18n namespace `superAdmin.*` (~40 calls) | MEDIUM | AdminsTab.jsx, MessagesTab.jsx, Platform.jsx, locales | "Super Admin" appears in English locale |
| `requireTeacher` bespoke (non-factory) guard | MEDIUM | middleware/auth.js:65–73 | Allows reception/admin into teacher routes; undocumented |
| Dead test for non-existent `'super-admin'` role | LOW | admin/__tests__/utils.test.js:34,113 | Tests a value not in the ENUM |
| Stale User model comment | LOW | models/User.js:95 | "except superadmin" should be "except government/business" |

**Total: 1 HIGH · 4 MEDIUM · 2 LOW = 7 issues**

No security vulnerabilities found. The functional migration is complete — there is no code path that gates access on `user.role === 'super_admin'`. All issues are naming debt or stale documentation.
