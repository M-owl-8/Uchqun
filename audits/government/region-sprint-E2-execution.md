# Region Model — Sprint E2 Execution Log
**CP-021 · Provisioning UI (account list, create form, delete, reset-password)**
**Date:** 2026-05-21
**Executor:** Claude (claude-sonnet-4-6)

---

## Commits

| # | Hash | Description |
|---|------|-------------|
| 1 | `2f361bf` | feat(government): E2 — GET /regions endpoint scoped to caller's level (CP-021) |
| 2 | `030486a` | feat(government): E2 — provisioning UI (account list + create form + delete + reset-password) |
| 3 | (this doc) | docs(government): region sprint E2 execution — provisioning UI |

---

## Per-Commit Log

### Commit 1 — Backend GET /regions endpoint (`2f361bf`)

**Files changed:**
- `backend/controllers/governmentController.js` — added `Region` import + `getRegions` function
- `backend/routes/governmentRoutes.js` — added `GET /regions` route (no extra capability gate — all gov users need region names for display)
- `backend/__tests__/controllers/governmentRegions.test.js` — 3 new tests

**`getRegions` scoping:**
```js
// republic accounts → all regions (full dropdown for create form)
// region accounts → only their own region (locked in UI — they can only provision within it)
const where = {};
if (req.user.govLevel === 'region') where.id = req.user.govRegionId;
const regions = await Region.findAll({ where, attributes: ['id','code','name','isRepublic'], order: [['name','ASC']] });
```

**Tests:**
| Test | Actor | Expected |
|------|-------|----------|
| republic account sees all regions | republic-main | `where: {}` → all returned |
| region account scoped to own region | region-main, govRegionId=REGION_A | `where: { id: REGION_A }` |
| DB error → 500 REGIONS_FETCH_ERROR | any | 500 with code |

---

### Commit 2 — Provisioning UI (`030486a`)

**Files changed:**
- `government/src/config/govCapabilities.js` — new file; 11-key CAPABILITY_KEYS array
- `government/src/components/tabs/GovernmentTab.jsx` — full rewrite
- `government/src/pages/Platform.jsx` — significant rewrite
- `government/src/locales/{en,uz,ru}/common.json` — `provision.*` section added

---

#### `government/src/config/govCapabilities.js` — New file

Single frontend source of truth for capability keys — mirrors backend `GOV_CAPABILITIES`:
```js
export const CAPABILITY_KEYS = [
  'canViewSchools', 'canArchiveSchools', 'canViewRatings', 'canViewAuditLog',
  'canViewStudents', 'canViewTeachers', 'canViewParents',
  'canManageAdmins', 'canManageGovernmentUsers', 'canViewMessages', 'canManageRegistrations',
];
```
Grant toggles in the create form iterate this array — any backend addition to the capability set is reflected here with a single update.

---

#### `GovernmentTab.jsx` — Full rewrite

**Props interface:**
```
governments, loadingGovernments   — from Platform (useApiCache)
regions, loadingRegions           — from Platform (useApiCache('/government/regions'))
govType, isRepublic, govRegionId  — from Platform via useAuth()
onCreateGovernment(formData)      — async, throws on error; Platform handles API + success toast
onDeleteGovernment(id)            — Platform opens ConfirmDialog
onResetPassword(id, newPassword)  — async, throws on error; Platform handles API + success toast
```

**Account list section:**
- Each card: initials avatar, full name, email (monospace), level badge, type badge, mustChangePassword badge, grants list (secondary accounts only)
- Level badge: Globe icon + purple `Republic` or MapPin + blue `Region name` (resolved from regions prop)
- Type badge: green `Main` or orange `Secondary`
- mustChangePassword badge: yellow `AlertCircle` — `Password change required`
- Grants: active keys shown as gray chips; `No grants` if secondary has zero

**Authorization mirroring:**
- `govType === 'main'` → action buttons (Reset Password + Delete) rendered
- `govType === 'secondary'` → no action buttons, no create form (secondary cannot provision — mirrors backend 403)
- Create form only rendered when `govType === 'main'`

**Create form fields:**
| Field | Behavior |
|-------|----------|
| Level (republic/region) | republic-main: both options; region-main: `disabled`, locked to `region` |
| Type (main/secondary) | all main accounts; clearing grants on type change to main |
| Region dropdown | visible only when level=region; republic-main: all regions; region-main: `disabled`, pre-selected |
| First name + Last name | name fields |
| Credential preview | live: `slug@regioncode` or `slug@respublika`; only shown when slug non-empty |
| Password | show/hide toggle; min-8 hint |
| Grant toggles | visible only when type=secondary; 11 checkboxes from CAPABILITY_KEYS |
| Error display | inline; specific messages for PROVISION_CREDENTIAL_TAKEN, REPUBLIC_MAIN_EXISTS |

**Credential preview logic:**
```js
const slug = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
if (!slug) return '';
if (level === 'republic') return `${slug}@respublika`;
const reg = regions.find(r => r.id === regionId);
return reg ? `${slug}@${reg.code.toLowerCase()}` : '';
```
Matches exactly what the backend generates in `createGovernment`. User sees the credential before submitting.

**Reset-password modal:**
- Opens with `setResetTarget(gov)`; shows account name in title
- New password field with show/hide toggle
- Client-side strength validation: `^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$`
- Error shown inline; modal stays open on API error
- On success: `closeReset()` + Platform's `success()` toast + `refreshGovernments()`

---

#### `Platform.jsx` — Significant rewrite

**Added:**
```js
const { govType, isRepublic, govRegionId } = useAuth();
const [regions, , loadingRegions] = useApiCache('/government/regions', 'platform:regions');
```

**New handlers:**
```js
// Create: accepts new form shape — no email (auto-generated by backend)
const handleCreateGovernment = async (formData) => {
  await api.post('/government/users', formData);
  success(t('provision.success.created'));
  await refreshGovernments();
};

// Delete: handles DELETE_LAST_REPUBLIC_MAIN specifically
const handleDeleteGovernment = (id) => {
  setConfirmDialog({ message: t('provision.actions.confirmDelete'), onConfirm: async () => {
    try {
      await api.delete(`/government/users/${id}`);
      ...
    } catch (error) {
      const code = error.response?.data?.error?.code;
      if (code === 'DELETE_LAST_REPUBLIC_MAIN') {
        showError(t('provision.errors.deleteLastRepublicMain'));
      } else { ... }
    }
  }});
};

// Reset password: throws to let GovernmentTab handle modal error display
const handleResetPassword = async (id, newPassword) => {
  await api.put(`/government/users/${id}/reset-password`, { newPassword });
  success(t('provision.success.passwordReset'));
  await refreshGovernments();
};
```

**Removed dead state:**
`govEmail`, `setGovEmail`, `editingGovernment`, `editGovFirstName`, `editGovLastName`, `editGovEmail`, `editGovPassword`, `editGovSaving`, `startEditGovernment`, `handleUpdateGovernment`

The old edit modal (firstName/lastName/email/password update) has been removed. The new paradigm:
- Name/email cannot be changed after creation (credential is identity)
- Password change is done via "Reset Password" (which forces mustChangePassword=true on the target)

---

#### i18n — `provision.*` section

**Keys added** (en canonical; uz/ru UNVERIFIED):
- `provision.title`, `provision.subtitle`, `provision.createTitle`
- `provision.form.*` (12 keys: level, type, region selectors, name fields, credentialPreview, password, grants, grantsHint, create)
- `provision.errors.*` (7 keys: allRequired, selectRegion, passwordStrength, credentialTaken, republicMainExists, deleteLastRepublicMain, createFailed)
- `provision.success.*` (3 keys: created, deleted, passwordReset)
- `provision.list.*` (6 keys: empty, mustChangePassword, republic, region, main, secondary, noGrants)
- `provision.actions.*` (6 keys: resetPassword, delete, confirmDelete, resetPasswordTitle, newPassword, resetSubmit)
- `provision.grants.*` (11 keys: one per CAPABILITY_KEY with human-readable label)

---

## Authorization-Mirroring Verification

| Backend rule | UI mirror |
|---|---|
| `secondary` → 403 `PROVISION_FORBIDDEN` | Create form not rendered when `govType==='secondary'` |
| `secondary` → 403 `DELETE_FORBIDDEN` | Delete button not rendered when `govType==='secondary'` |
| `secondary` → 403 `RESET_FORBIDDEN` | Reset Password button not rendered when `govType==='secondary'` |
| `region-main` → `PROVISION_REGION_OUT_OF_SCOPE` | Region dropdown disabled for region-main; `govRegionId` pre-set and uneditable |
| Level selector | republic-main: both options; region-main: disabled on `region` |
| `REPUBLIC_MAIN_EXISTS` | Inline error with specific message |
| `PROVISION_CREDENTIAL_TAKEN` | Inline error "Try a different first name" |
| `DELETE_LAST_REPUBLIC_MAIN` | Error toast with specific message (not generic delete error) |

---

## Capability Gate Coverage

| Capability | Frontend source | Backend mirror |
|-----------|-----------------|----------------|
| CAPABILITY_KEYS (11) | `government/src/config/govCapabilities.js` | `backend/config/govCapabilities.js` GOV_CAPABILITIES |
| i18n labels | `provision.grants.*` (11 keys) | — |
| Grant toggles iterate CAPABILITY_KEYS | GovernmentTab.jsx create form | — |

The frontend config is a mirror, not an import of backend code. A new backend capability key requires adding to `government/src/config/govCapabilities.js` and `provision.grants.*` i18n — both in one place.

---

## Honest Status

| Item | State |
|------|-------|
| `GET /api/government/regions` — scoped | ✅ Implemented + 3 tests |
| Account list — level/type/region/mustChangePassword badges | ✅ Implemented |
| Grants display for secondary accounts | ✅ Implemented |
| Create form — level/type/region/grants/credential-preview | ✅ Implemented |
| Authorization mirroring — secondary blocked from all actions | ✅ Implemented |
| Authorization mirroring — region-main locked to own region | ✅ Implemented (dropdown disabled, pre-set) |
| Delete — ConfirmDialog + DELETE_LAST_REPUBLIC_MAIN error | ✅ Implemented |
| Reset-password modal — strength validation + error display | ✅ Implemented |
| CAPABILITY_KEYS — frontend single source of truth | ✅ `government/src/config/govCapabilities.js` |
| i18n: provision.* section | ✅ en canonical · uz/ru UNVERIFIED |
| Government test suite | ✅ 15 suites / 98 tests / lint 0 (unchanged) |
| Backend test suite | ✅ 106 suites / 1133 tests / lint 0 (+3 getRegions) |

**Yellow gates:**
- No React component tests for GovernmentTab provisioning form (same yellow as E1 binding — integration test would require jsdom + many mocks). The authorization mirroring is logic in JSX conditionals; the `hasCapability` / `govType` logic is tested in `GovAuthContext.test.js` and `SidebarCapability.test.jsx`.
- i18n uz/ru: UNVERIFIED (PL-009-VERIFY).

**Manual gate required (Max on Railway):**
Max must walk the full path:
1. Login as republic-main → Platform → Government tab → see account list with badges
2. Create a region-main account for any region → verify credential preview matches login email
3. Create a secondary account with 2-3 grants → verify grants shown in list
4. Login as new region-main → verify Platform tab visible, Government subtab shows only own-region accounts
5. Login as secondary with `canManageGovernmentUsers` → verify no create form, no action buttons
6. Reset a password as republic-main → target gets mustChangePassword badge → forced password change on next login
7. Attempt delete of republic-main → error toast (cannot delete last super-admin)

This gate is NOT complete yet — Sprint E2 is 🟡 until Max confirms.

---

## Deal-Gated Items

DG-003 (category assignment UI) still pending — Sprint E3/E4 scope. Not affected.

No new deal-gated items introduced in Sprint E2.
