# Region Model — Sprint B Execution Log
**CP-021 · Provisioning backend**
**Date:** 2026-05-21
**Executor:** Claude (claude-sonnet-4-6)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `a209afe` | feat(backend): government capability config and grant-set validation |
| 2 | `bb7f862` | feat(backend): government account provisioning with hierarchical authorization (CP-021) |
| 3 | `ce00574` | feat(backend): platform-wide forced-password-change gate for provisioned accounts (CP-021) |

---

## Commit 1 — `backend/config/govCapabilities.js`

**Files changed:** `backend/config/govCapabilities.js` (new), `backend/middleware/regionScope.js`, `backend/__tests__/config/govCapabilities.test.js` (new)

### Capability key set (11 keys, CP-021 §1.4)
```
canViewSchools, canArchiveSchools, canViewRatings, canViewAuditLog,
canViewStudents, canViewTeachers, canViewParents,
canManageAdmins, canManageGovernmentUsers, canViewMessages, canManageRegistrations
```

### Helpers exported
- `GOV_CAPABILITIES` — canonical array
- `isValidGrantSet(grants)` — validates all keys are known capabilities AND all values are boolean; rejects null
- `unknownGrantKeys(grants)` — returns unknown keys for error messages

### `requireGovAccess` hardened
Now throws at factory call time (route-definition time) for unknown keys, making misconfigured routes a startup crash rather than a silent runtime bug.

### Issue resolved
Sprint prompt proposed `viewSchools` / `archiveSchools` naming; Sprint A tests and design doc §1.4 use `canViewSchools` / `canArchiveSchools`. Used the `can...` prefix to match existing code.

---

## Commit 2 — Provisioning controller + i18n

**Files changed:**
- `backend/controllers/admin/adminUserController.js` — createGovernment, getGovernments, deleteGovernmentUser, resetGovernmentPassword
- `backend/routes/governmentRoutes.js` — requireRegionScope middleware, new routes
- `backend/controllers/governmentController.js` — audit allowlist +1
- `backend/i18n/ru.json`, `uz-latn.json`, `uz-cyrl.json` — 13 new error codes
- `audits/backend/i18n-error-codes.md` — catalog updated
- `backend/__tests__/controllers/governmentProvisioning.test.js` (new)
- `backend/__tests__/adminUser.test.js` — updated mocks + new provisioning tests
- `backend/__tests__/controllers/adminUserAudit.test.js` — updated createGovernment test
- `backend/__tests__/governmentAuditLog.test.js` — allowlist count 10→11
- `backend/__tests__/i18n.test.js` — code count 110→123

### Authorization matrix implemented

| Actor | Can provision? | Scope |
|-------|---------------|-------|
| secondary | ❌ 403 PROVISION_FORBIDDEN | — |
| republic-main | ✅ | any level/region |
| region-main | ✅ | own region only |
| region-main → republic acct | ❌ 403 PROVISION_FORBIDDEN | — |

### Guards
- `REPUBLIC_MAIN_EXISTS` — 409 if body requests `govLevel=republic, govType=main` (single super-admin invariant, Q2)
- `PROVISION_REGION_REQUIRED` — 400 if region account missing `govRegionId`
- `PROVISION_REGION_OUT_OF_SCOPE` — 403 if region-main targets another region
- `DELETE_LAST_REPUBLIC_MAIN` — 403 on any republic-main deletion attempt
- `RESET_OUT_OF_SCOPE` — 403 for region-main trying to reset accounts outside their region

### Credential generation
`firstName.toLowerCase().replace(/[^a-z0-9]/g, '')@{regionCode|respublika}`
Email is auto-generated; body-supplied email is ignored. Conflict returns 409 `PROVISION_CREDENTIAL_TAKEN`.

### `mustChangePassword=true` on all provisioned accounts
Every `User.create` in `createGovernment` sets `mustChangePassword: true`.

### 13 new i18n codes (106→123 total)
`PROVISION_FORBIDDEN`, `PROVISION_INVALID_LEVEL_TYPE`, `PROVISION_REGION_REQUIRED`,
`PROVISION_REGION_OUT_OF_SCOPE`, `PROVISION_GRANTS_REQUIRED`, `PROVISION_INVALID_GRANTS`,
`REPUBLIC_MAIN_EXISTS`, `PROVISION_CREDENTIAL_TAKEN`, `DELETE_FORBIDDEN`,
`DELETE_LAST_REPUBLIC_MAIN`, `RESET_FORBIDDEN`, `RESET_OUT_OF_SCOPE`, `PASSWORD_CHANGE_REQUIRED`

### Revert-test pairs (all in `governmentProvisioning.test.js`)
Each pair proves the guard is load-bearing:
- Secondary provisioning gate
- Republic-main guard (second super-admin creation)
- Region-main cross-region provisioning scope
- Delete last-republic-main guard
- Delete cross-region scope
- Reset cross-region scope

### Test fixes made during green-run
1. `governmentProvisioning.test.js:489` — `mockUserFindOne.mock.results[0].value` returns a Promise, not the resolved object. Fixed by holding a direct reference to the target object.
2. `adminUserAudit.test.js:134` — old `createGovernment` test sent no `govLevel`/`govType`, hitting 400 before `logAudit`. Updated req to use `govLevel: republic, govType: secondary` plus `govAccessGrants: {}`.
3. `governmentAuditLog.test.js:101` — allowlist count assertion updated 10→11 for new `reset_password:government_users` entry.

---

## Commit 3 — Forced-password-change gate

**Files changed:**
- `backend/middleware/auth.js` — gate added after `req.user = user;`
- `backend/controllers/userController.js` — `changePassword` clears `mustChangePassword=false`
- `backend/__tests__/middleware/passwordChangeGate.test.js` (new)

### Gate logic
```js
if (user.mustChangePassword) {
  const url = (req.originalUrl || req.path || '').split('?')[0];
  const ALLOWED_PATHS = ['/api/v1/user/password', '/api/v1/auth/logout'];
  if (!ALLOWED_PATHS.includes(url)) {
    return res.status(403).json({
      success: false,
      error: { code: 'PASSWORD_CHANGE_REQUIRED' },
      mustChangePassword: true,
    });
  }
}
```

### No-surprise-lockout
Three explicit assertions in `passwordChangeGate.test.js` confirm that users with `mustChangePassword=false`, `null`, or `undefined` (field absent) pass the gate without any change in behavior. All pre-existing accounts are unaffected.

### Revert-test pair
`[REVERT-TEST: BUG]` — buggy authenticate (no gate) shows provisioned account reaches `next()`.
`[REVERT-TEST: FIXED]` — real authenticate blocks with 403.

---

## Verification

| Check | Result |
|-------|--------|
| Test suites | 97 passed / 0 failed |
| Total tests | 1025 passed / 0 failed |
| Lint | 0 errors, 0 warnings |
| verify-i18n | 123 codes · ru ✅ · uz-latn ✅ · uz-cyrl ✅ |

---

## Decisions recorded

| Decision | Rationale |
|----------|-----------|
| Single super-admin (Q2) | REPUBLIC_MAIN_EXISTS blocks new creation; grandfathered multiples from Sprint A tolerated |
| Deny-by-default grants | `{}` for secondary (zero access), `null` for main (not applicable) |
| Credential auto-generation | Removes provisioner from choosing usernames; prevents credential guessing |
| `mustChangePassword` platform-wide | All provisioned accounts must change password on first login |
| Gate allows logout | Users must be able to exit even when locked into password-change mode |

---

## Open items (carry to Sprint C+)

- **FRONTEND**: Government portal provisioning UI — create, list, delete, reset-password flows
- **CP-019**: UI notice for AI-generated translations (all portals)
- **PL-009-VERIFY**: Professional translation review before launch
