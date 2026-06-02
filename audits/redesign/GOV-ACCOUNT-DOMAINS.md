# GOV-ACCOUNT-DOMAINS — Strict Email Domain Discipline by Hierarchy

**Date:** 2026-06-02  
**Status:** ✅

---

## Pre-flight findings

### Current state (before)

| Endpoint | Role created | Email handling |
|---|---|---|
| POST /government/users | government | Auto-generated `firstName@regionCode` (e.g. `nodira@r01`) — partially locked |
| POST /government/admins | admin | Free text email — no domain discipline |
| POST /admin/receptions | reception | Free text email |
| POST /reception/teachers | teacher | Free text email |
| POST /reception/parents | parent | Free text email |

**Gov user domain was already partially locked** but using the wrong format: `region.code` (`r01`, `r02`) instead of a human-readable slug, and `respublika` instead of `davlat.uz`.

**No slug fields existed** on School or Region models.

### Existing schools (DB)
| ID | Name | Assigned slug |
|---|---|---|
| `eec19bb5` | Toshkent Maxsus Maktab 1 | `tmm1` |
| `7b27fadd` | Toshkent Maxsus Maktab 2 | `tmm2` |
| `2dac6af4` | Samarqand Maxsus Maktab 1 | `smm1` |
| `5334e23c` | Samarqand Maxsus Maktab 2 | `smm2` |

---

## Hierarchy canonical answer

**Who creates admin (school director) accounts?**
- Region-level government creates admins for schools in their region (primary flow)
- Republic-level government can create admins for any school (override path)
- Admin accounts cannot be created by admin/reception/teacher/parent

**Domain matrix:**

| Creator | Creates | Email domain |
|---|---|---|
| Republic gov | Republic gov peer | `@davlat.uz` |
| Republic gov | Region gov | `@<region.slug>.uz` (e.g. `@toshkent.uz`) |
| Republic gov | Admin | `@<school.slug>.uz` (e.g. `@tmm1.uz`) |
| Region gov (own) | Region gov (same region) | `@<own_region.slug>.uz` |
| Region gov (own) | Admin (school in own region) | `@<school.slug>.uz` |
| Admin | Reception/Teacher | `@<own_school.slug>.uz` |
| Admin | Parent | `@<own_school.slug>.uz` |
| Reception | Parent | `@<own_school.slug>.uz` |

**Cross-scope rejections** — each returns the specific error code:
- Region gov → region peer in different region: `ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE`
- Region gov → admin for school in different region: `ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE`
- Admin → another admin: `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Reception → teacher: `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Any → government (from non-government creator): `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`

---

## STEP 1 — Schema additions

### Migration `20260602000002-account-domain-slugs.js`

**School.slug** (VARCHAR 32, unique, NOT NULL):
- Backfilled 4 existing schools: tmm1, tmm2, smm1, smm2
- Any new school created via the platform must provide a slug

**Region.slug** (VARCHAR 32, unique, NOT NULL):

| Region | Slug |
|---|---|
| Toshkent shahri | `toshkent` |
| Samarqand viloyati | `samarqand` |
| Andijon viloyati | `andijon` |
| Buxoro viloyati | `buxoro` |
| Farg'ona viloyati | `fargona` |
| Jizzax viloyati | `jizzax` |
| Namangan viloyati | `namangan` |
| Navoiy viloyati | `navoiy` |
| Qashqadaryo viloyati | `qashqadaryo` |
| Sirdaryo viloyati | `sirdaryo` |
| Surxondaryo viloyati | `surxondaryo` |
| Toshkent viloyati | `toshkent-viloyati` |
| Qoraqalpog'iston | `qoraqalpogiston` |
| Xorazm viloyati | `xorazm` |

---

## STEP 2 — Backend enforcement

### `backend/utils/accountDomain.js` (new file)

Key exports:
- `REPUBLIC_DOMAIN = 'davlat.uz'`
- `LOCAL_PART_RE` — validates local part format
- `isValidLocalPart(localPart)` — validates format
- `resolveEmailDomain(creator, newRole, context)` — returns enforced domain, throws structured error

### Controller updates

All account creation endpoints now:
1. Accept `localPart` (part before @) — never accept full email
2. Call `resolveEmailDomain(req.user, role, context)` — throws `{ code, detail }` if unauthorized
3. Construct `email = `${localPart}@${domain}``
4. Check uniqueness, create user

**Files changed:**
- `backend/controllers/admin/adminUserController.js`: `createAdmin` (local part + domain), `createGovernment` (region.slug + davlat.uz)
- `backend/controllers/admin/adminReceptionController.js`: `createReception`
- `backend/controllers/receptionTeacherController.js`: `createTeacher`
- `backend/controllers/receptionParentController.js`: `createParent` (accepts `localPart` or legacy `email` field, strips domain from legacy)
- `backend/controllers/governmentController.js`: `getRegions` now exposes `slug` field

### New error codes
| Code | Meaning |
|---|---|
| `EMAIL_LOCAL_PART_INVALID` | Local part fails format validation |
| `EMAIL_ALREADY_EXISTS` | Full constructed email already in DB |
| `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY` | Creator role cannot create that target role |
| `ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE` | Creator's region/school doesn't contain target |

---

## STEP 3 — Frontend updates

### GovernmentTab.jsx (government portal)
- `credentialPreview` updated: republic uses `@davlat.uz` (was `@respublika`), region uses `@region.slug.uz` (was `@region.code`) with `.uz` suffix added

### ReceptionFormModal.jsx + ReceptionManagement.jsx (admin portal)
- Email field changed to split input: `[localPart input] @[school.slug.uz (locked)]`
- Admin portal fetches school slug via `GET /admin/school` on mount
- Submit sends `localPart` instead of full email

### TeacherManagement.jsx (reception portal)
- Email field changed to split input: `[localPart input] @your-school.uz`
- Submit sends `localPart`

### ParentStep.jsx + ParentWizardPage.jsx (reception portal)
- Email field changed to split `localPart` input with `@your-school.uz` suffix
- `defaultParent` uses `localPart` instead of `email`

**Note:** Reception portal shows `@your-school.uz` as a static placeholder. The actual domain is enforced by the backend. A follow-up can improve this to show the real slug by fetching from an endpoint.

---

## STEP 4 — Behavioral tests

**File:** `backend/__tests__/accountDomain.test.js`  
**Tests:** 33 tests — 100% pass

### Valid paths verified
- Republic creates republic gov → `davlat.uz`
- Republic creates region gov (Toshkent) → `toshkent.uz`
- Republic creates region gov (Samarqand) → `samarqand.uz`
- Republic creates admin for TMM1 → `tmm1.uz`
- Region-Toshkent creates region peer (same region) → `toshkent.uz`
- Region-Toshkent creates admin for TMM1 → `tmm1.uz`
- Admin creates reception → `tmm1.uz`
- Admin creates teacher → `tmm1.uz`
- Admin creates parent → `tmm1.uz`
- Reception creates parent → `tmm1.uz`

### Rejected paths verified (each returns specific error code)
- Region-Toshkent → region peer in Samarqand → `ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE`
- Region-Toshkent → admin for school in Samarqand → `ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE`
- Admin → admin → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Admin → government → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Reception → teacher → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Reception → admin → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Region gov → republic account → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Non-government → government → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Missing govRegionId for region level → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Missing schoolId for admin creation → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`
- Admin with no schoolId → `ACCOUNT_CREATE_FORBIDDEN_HIERARCHY`

---

## STEP 5 — Test results

- **Backend:** 133/133 suites, 1398/1398 tests — all passing (up from 132/132, 1365/1365)
- **Government portal:** 17/17 suites, 120/120 tests — all passing
- **accountDomain.test.js:** 33/33 — full matrix green

**Tests updated** (10 files): adminUser, adminUserAudit, governmentProvisioning, governmentScopingHoles, receptionTeacherScope, receptionLifecycle, receptionLifecycleBehavioral, receptionChildController, reception, receptionParent — all updated to use `localPart` in bodies and mock `accountDomain.js` where needed.

---

## Honest count

| Item | Status |
|---|---|
| School slug field + backfill | ✅ (tmm1/tmm2/smm1/smm2) |
| Region slug field + backfill | ✅ (14 regions) |
| `accountDomain.js` utility | ✅ |
| `createAdmin` domain enforcement | ✅ |
| `createGovernment` domain enforcement | ✅ |
| `createReception` domain enforcement | ✅ |
| `createTeacher` domain enforcement | ✅ |
| `createParent` domain enforcement | ✅ |
| GovernmentTab credentialPreview | ✅ `davlat.uz` + `region.slug.uz` |
| ReceptionFormModal split email | ✅ |
| TeacherManagement split email | ✅ |
| ParentWizard split email | ✅ |
| Behavioral test matrix (33 tests) | ✅ all pass |
| Existing user accounts unchanged | ✅ Option A applied |

**Latent issues noted:**
- `adminRegistrationController.js` (self-registration): still accepts free-text email. This is the "apply to be admin" flow — applicant doesn't know their school's slug yet. Left as-is, noted as follow-up.
- Reception portal shows `@your-school.uz` placeholder instead of real slug. Backend enforces correct domain regardless. Follow-up: add `GET /reception/school-info` to expose slug to reception frontend.
- `updateAdmin`, `updateReception` etc. still allow free-text email changes post-creation. Follow-up: lock email changes to the enforced domain.
