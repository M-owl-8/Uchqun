# Region/Hierarchy Authorization Model — Design Document (CP-021)
## APPROVED — Implementation may begin. Sprint A is next.

**Date:** 2026-05-21  
**Status:** APPROVED (2026-05-21) — all §7 questions resolved or defaulted; PL-015 reclassified as pre-demo data-swap. Sprint A may begin.  
**Captures:** The full authorization model for region-scoped government accounts  
**Precedes:** All CP-021-dependent work (CP-020 aggregation, CP-022 routing, government directories)

**Resolved decisions (2026-05-21):**
- ✅ Q1 — Isolation boundary: **region-level** (12 viloyats + Karakalpakstan = 13 regions). District = metadata only.
- ✅ Q2 — Republic-main: **exactly one** super-admin root account. No second republic-main can be created.
- ✅ Q3 — Credential suffix: **`regions.code` lowercased** (e.g. `ali@tas`, `sarvar@fer`). Republic accounts use `@respublika`. Full slug rule in §3.2.
- ✅ Q4 — Secondary grants: **deny-by-default.** New secondary accounts start with `{}` (zero access). Creator explicitly selects each grant. `null` is reserved for main accounts.
- ✅ Q5 — Deletion cascade: **orphan secondaries** (they remain active; republic-main manages them). No cascade delete.
- ✅ Q6 — Tashkent city/region count: **implementation non-blocker.** Table is data-driven; final count comes from PL-015. Code is count-agnostic.
- ✅ Q7 — Republic-main password reset: **migration approach** (CLAUDE.md pattern). No in-app mechanism needed.
- ✅ Q8 — Grant granularity: **per-feature boolean** is sufficient. No row-level granularity.
- ✅ Q9 — Archive/reactivate: **republic-main** unrestricted (any school) + **region-main** own region only. Secondary requires `canArchiveSchools` grant.
- ✅ Q10 — Audit log for region accounts: **all governance events for schools in their region** (not only self-initiated).

---

## Baseline: current state (as of Sprint 1)

Before designing the new model, here is what exists today so the design can be read against reality.

**`User` model** (`backend/models/User.js`):
- `role: ENUM('admin','reception','teacher','parent','government','business')` — a single flat `government` role; no level, no type, no region.
- `schoolId` — nullable UUID. Government users have `schoolId = null`.
- No `govLevel`, `govType`, `govRegionId`, `govAccessGrants`, or `mustChangePassword` fields.

**`School` model** (`backend/models/School.js`):
- `region: STRING(255)` — free-text string. Not a FK to any regions table.
- `city: STRING(255)` — free-text. No `regionId`, no `districtId` FK.

**Auth middleware** (`backend/middleware/auth.js`):
- `requireGovernment = requireRole('government')` — checks only that `user.role === 'government'`. No level/type/region check.

**`requireSchoolScope`** (`backend/middleware/schoolScope.js`):
- For `role === 'government'`: sets `req.isGlobalAccess = true`, bypasses all school-scope checks.
- `schoolWhere(req)` returns `{}` for government — no WHERE filter applied.

**Government routes** (`backend/routes/governmentRoutes.js`):
- All protected routes use `router.use(authenticate); router.use(requireGovernment)`.
- No per-route access grant checks. Any `government` account reaches any endpoint.
- 18 active endpoints, none have region filtering.

**Current government user creation** (`backend/controllers/admin/adminUserController.js:createGovernment`):
- Accepts only `firstName`, `lastName`, `email`, `password`. No level/type/region/grants.
- Any `government` account created this way gets global access to everything.

**Conclusion:** today, `government` is a single flat role with no scope, no level distinction, and no provisioning hierarchy. The new model adds two axes (level + type), a region dimension, and access grants — while keeping backward compat for the one existing account.

---

## Section 1 — Data Model

### 1.1 Region table (data-driven)

```
Table: regions
  id          UUID PK
  name_en     VARCHAR(255) NOT NULL
  name_uz     VARCHAR(255) NOT NULL   -- Uzbek Latin
  name_ru     VARCHAR(255) NOT NULL   -- Russian
  code        VARCHAR(50) UNIQUE NOT NULL  -- e.g. 'TAS', 'SAM', 'FER', 'KAR'
  createdAt   TIMESTAMP
  updatedAt   TIMESTAMP
```

**No regions are hardcoded.** For development and testing, Sprint A seeds **13 placeholder rows** — `{ name_en: 'Region 01', name_uz: 'Region 01', name_ru: 'Region 01', code: 'R01' }` through `R13`. Region accounts can be provisioned against placeholder regions immediately. Real region names and codes replace the placeholders when the partner delivers PL-015 — this is a pre-demo data-swap, not an implementation gate.

**Expected rows:** 13 placeholder rows in development. Final count (13 or 14, depending on Tashkent city/region treatment — Q6, resolved as non-blocker) is determined by PL-015 data. The schema is count-agnostic. The `code` field is the stable machine identifier; `name_*` fields are the display labels.

### 1.2 District table (optional finer grain)

```
Table: districts
  id          UUID PK
  name_en     VARCHAR(255) NOT NULL
  name_uz     VARCHAR(255) NOT NULL
  name_ru     VARCHAR(255) NOT NULL
  code        VARCHAR(50) UNIQUE NOT NULL
  regionId    UUID FK → regions.id NOT NULL
  createdAt   TIMESTAMP
  updatedAt   TIMESTAMP
```

Districts are designed in from the start so the schema can support district-level isolation if the product later requires it. The isolation boundary is **region-level** (Q1 confirmed). `requireRegionScope` reads `govRegionId → regions.id` exclusively — there is no `govDistrictId` field and districts play no role in auth enforcement. If district isolation is ever required it is a future scope expansion; these rows sit unused until then.

### 1.3 School model changes

Add two new nullable columns to `schools`:

```
regionId    UUID FK → regions.id    NULL  (nullable during migration; populated from PL-015 data)
districtId  UUID FK → districts.id  NULL  (optional, for finer-grain classification)
```

Keep the existing `region: STRING(255)` column as a free-text fallback. Do NOT drop it at migration time — it serves as the human-readable region name until `regionId` is backfilled and verified. The `region` string field can be retired in a Database portal sprint once FK population is complete.

The scoping middleware uses `regionId` exclusively for authorization. The `region` string field is display-only.

### 1.4 User model additions (government role)

Add five new nullable columns to `users`. All are meaningful only when `role = 'government'`; they are `NULL` for every other role.

```
govLevel           ENUM('republic', 'region')   NULL  -- null for non-government roles
govType            ENUM('main', 'secondary')     NULL
govRegionId        UUID FK → regions.id          NULL  -- null = republic-level
govAccessGrants    JSONB                         NULL  -- null = full access within scope
mustChangePassword BOOLEAN NOT NULL DEFAULT false
```

**govLevel:**
- `republic` — this account sees all regions (within the constraints of `govType`).
- `region` — this account sees only schools whose `regionId = govRegionId`.

**govType:**
- `main` — full control within their scope. Can create, delete, and reset passwords of other government accounts within scope.
- `secondary` — restricted. Access is defined by `govAccessGrants`.

**govRegionId:**
- `null` when `govLevel = 'republic'` (they see everything).
- Set to a `regions.id` UUID when `govLevel = 'region'`.

**govAccessGrants** (JSONB structure for secondary accounts):
```json
{
  "canViewSchools": true,
  "canArchiveSchools": false,
  "canViewRatings": true,
  "canViewAuditLog": false,
  "canViewStudents": false,
  "canViewTeachers": false,
  "canViewParents": false,
  "canManageAdmins": false,
  "canManageGovernmentUsers": false,
  "canViewMessages": false,
  "canManageRegistrations": false
}
```

**Value semantics (Q4 resolved — deny-by-default):**
- `null` — full access within scope. Used only for main accounts and backfilled legacy accounts. The `requireGovAccess` middleware short-circuits via the `govType === 'main'` check before ever reading this field. Never set `null` on a secondary account.
- `{}` (empty object) — zero access. This is the starting state for every newly-created secondary account. The provisioning flow requires the creator to explicitly enable each grant needed; nothing is on by default.
- `{ "canViewSchools": true, ... }` — explicit grants. A missing key and a `false` value are both treated as denied.

The `|| {}` fallback in `requireGovAccess` (`const grants = req.govAccessGrants || {}`) ensures that a secondary account with `null` grants (a provisioning bug) gets zero access rather than escalating to full access.

**mustChangePassword:**
- Set to `true` when a creating account provisions a new account (they set the password on behalf of the new user).
- Set back to `false` after the user completes a password change.
- Default `false` ensures existing accounts are not affected.

### 1.5 Migration of existing government accounts

All existing `role = 'government'` users must be backfilled. A dedicated migration runs after the column-addition migration:

```
UPDATE users
SET "govLevel" = 'republic',
    "govType" = 'main',
    "govRegionId" = NULL,
    "govAccessGrants" = NULL,
    "mustChangePassword" = false
WHERE role = 'government';
```

Effect: all existing government users become republic-level main accounts. Their behavior is unchanged — they see everything, with full management rights. This is the correct migration because the existing account (`Murodbekshamsiddinov2004@gmail.com`) is the platform owner.

### 1.6 Model associations to add

In `backend/models/index.js`:
```js
Region.hasMany(School,  { foreignKey: 'regionId', as: 'schools' });
School.belongsTo(Region, { foreignKey: 'regionId', as: 'region', constraints: false });

Region.hasMany(District, { foreignKey: 'regionId', as: 'districts' });
District.belongsTo(Region, { foreignKey: 'regionId', as: 'region' });

User.belongsTo(Region, { foreignKey: 'govRegionId', as: 'govRegion', constraints: false });
```

`constraints: false` on School→Region and User→Region because during the migration period, `regionId` may be null for existing rows — FK constraints would reject nulls depending on DB version.

---

## Section 2 — Authorization Enforcement (the security core)

### 2.1 The region-scope middleware chain

The middleware chain for government routes becomes:

```
authenticate → requireGovernment → requireRegionScope → [requireGovAccess(key)] → controller
```

**`requireRegionScope`** (new file: `backend/middleware/regionScope.js`):
```
1. Read req.user.govLevel, govType, govRegionId, govAccessGrants
2. If govLevel === 'republic':
     req.regionScope = null        // null = global, see all schools
     req.isGlobalAccess = true
3. If govLevel === 'region':
     req.regionScope = govRegionId // UUID, filter to this region
     req.isGlobalAccess = false
4. req.govType = govType
5. req.govAccessGrants = govAccessGrants
6. next()
```

If a `government` user somehow has `govLevel = null` (pre-migration account that wasn't backfilled): **fail closed** — treat as no access, return 403 `GOV_ACCOUNT_NOT_CONFIGURED`.

**`regionWhere(req)`** (helper, exported from `regionScope.js`):
```js
export const regionWhere = (req) => {
  if (req.isGlobalAccess) return {};                // republic accounts: no filter
  if (!req.regionScope)   throw new Error('regionScope not set');
  return { regionId: req.regionScope };             // region accounts: filter by regionId
};
```

Every government controller that queries schools calls `regionWhere(req)` to get its WHERE clause. This is the single point of region enforcement for school-level queries. Data that flows through schools (students, teachers, parents) is implicitly scoped because schools are the root anchor.

**`requireGovAccess(grantKey)`** (middleware factory):
```js
export const requireGovAccess = (grantKey) => (req, res, next) => {
  // main accounts always have full access within their scope
  if (req.govType === 'main') return next();
  const grants = req.govAccessGrants || {};
  if (!grants[grantKey]) {
    return res.status(403).json({ success: false, error: { code: 'GOV_ACCESS_DENIED' } });
  }
  next();
};
```

Used per-route in `governmentRoutes.js`:
```js
router.get('/schools',         requireGovAccess('canViewSchools'),        getSchoolsStats);
router.put('/schools/:id/archive', requireGovAccess('canArchiveSchools'), archiveSchool);
// etc.
```

**Defense-in-depth controller check** (per CLAUDE.md policy for sensitive endpoints):
For archive/reactivate, government user creation, deletion, and password reset — the controller also checks directly:
```js
if (req.govType === 'secondary' && !req.govAccessGrants?.canArchiveSchools) {
  return res.status(403).json({ success: false, error: { code: 'GOV_ACCESS_DENIED' } });
}
```

### 2.2 The hard isolation guarantee

**Claim:** a region account can never read or mutate data belonging to another region.

**Mechanism:**

All data in the system is anchored to a school. The school has a `regionId`. Region accounts carry their `regionId` in `req.regionScope`. Every query through a government endpoint that touches school data goes through `regionWhere(req)`, which injects `WHERE schools.regionId = req.regionScope`.

For direct school queries:
```js
const schools = await School.findAll({ where: { ...regionWhere(req), isActive: true } });
```

For data joined through schools (students, teachers, parents):
```js
// Students: Child has schoolId; join to School filtered by regionId
const schoolsInRegion = await School.findAll({ where: regionWhere(req), attributes: ['id'] });
const schoolIds = schoolsInRegion.map(s => s.id);
const students = await Child.findAll({ where: { schoolId: { [Op.in]: schoolIds } } });
```

For single-resource access (e.g. `GET /government/schools/:id`):
```js
const school = await School.findOne({ where: { id, ...regionWhere(req) } });
if (!school) return res.status(404).json(...); // looks like "not found" to attacker
```

A region B account requesting a region A school by UUID gets 404, not 403 — the resource appears not to exist. This is the correct security posture (don't confirm existence of out-of-scope resources).

**Audit log scoping** (the hard case):

The audit_log table stores `entityId` but not `regionId`. For region accounts, the audit log must show only events for schools in their region. The WHERE clause becomes:

```sql
WHERE (action, entity) IN (allowlist)
AND (
  -- School-related events: entity='schools', entityId must be a school in our region
  (entity = 'schools' AND "entityId" IN (
    SELECT id FROM schools WHERE "regionId" = req.regionScope
  ))
  OR
  -- Non-school events (admin registrations, account management) are republic-only
  entity != 'schools'
)
```

For region accounts, non-school events (admin registrations, account CRUD) are excluded from the audit log — those are republic-level governance events. This is the correct design because region accounts don't manage admin registrations or government users of other regions.

**Q10 confirmed (2026-05-21):** Region accounts see ALL governance events for schools in their region, regardless of which government actor performed them. The subquery approach above is the implementation path.

### 2.3 Test strategy for isolation guarantee

Every government endpoint that queries data needs an IDOR-style revert-test:

**Pattern for each endpoint:**
```
Test: region B account cannot see region A's school

Setup:
  - Create region A, region B
  - Create schoolA with regionId=regionA.id
  - Create regionB government account with govRegionId=regionB.id

Test 1 (revert-test — prove filter works):
  - Remove regionWhere from the controller temporarily
  - regionB account GET /government/schools → schoolA appears in results → TEST FAILS
  - Restore regionWhere
  - regionB account GET /government/schools → schoolA does NOT appear → TEST PASSES

Test 2 (IDOR via ID):
  - regionB account GET /government/schools/:schoolA.id → 404
  - Verify the query includes regionId=regionB.id in the WHERE clause
```

Minimum set of endpoints requiring isolation tests:
1. `GET /government/schools` — school list
2. `GET /government/schools/:id` — school detail (IDOR by UUID)
3. `PUT /government/schools/:id/archive` — mutation across region boundary
4. `PUT /government/schools/:id/reactivate` — mutation across region boundary
5. `GET /government/students` — students anchored to schools
6. `GET /government/teachers` — teachers anchored to schools
7. `GET /government/parents` — parents anchored to schools
8. `GET /government/audit-log` — audit events for schools
9. `GET /government/admins` — admin accounts for schools in region
10. `GET /government/ratings` — school ratings

### 2.4 How the republic bypass works without being exploitable

Republic-level accounts get `req.isGlobalAccess = true` and `req.regionScope = null`. `regionWhere(req)` returns `{}` (no filter). This bypass is:

1. **Set only in middleware** — `requireRegionScope` reads it from `req.user.govLevel` which comes from the DB. Not from a query param or header that an attacker can forge.
2. **Sourced from the DB record** — `authenticate` middleware loads the user from DB (with 30s cache). The `govLevel` field is set by the provisioning flow, not by the user.
3. **Impossible to escalate** — a region account with `govLevel='region'` cannot change its own `govLevel`. Only a republic-main account (or its creator) can provision accounts, and provisioning checks `req.user.govLevel` server-side.

The attack surface is: could a region account forge `govLevel`? No — `govLevel` is a DB column read by `authenticate`. There is no client-controlled input that sets it.

---

## Section 3 — Account Provisioning Flows

### 3.1 Create-account flow

**Case 1: Republic-main creates a republic-secondary account**

Authorization: `req.user.govLevel === 'republic' && req.user.govType === 'main'`

**Q2 constraint:** A republic-main CANNOT create another republic-main. There is exactly one republic-main super-admin. The controller enforces: if `body.govType === 'main'` and `body.govLevel === 'republic'`, return 403 `GOV_CANNOT_CREATE_SECOND_SUPER_ADMIN`.

Request body:
```json
{
  "firstName": "...", "lastName": "...",
  "email": "ali@respublika",
  "password": "...",
  "govLevel": "republic",
  "govType": "secondary",
  "govAccessGrants": { ... } | null
}
```

Created account: `govRegionId = null`, `mustChangePassword = true`.

---

**Case 2: Republic-main creates a region account**

Same auth check. Body adds `govRegionId`:
```json
{
  "govLevel": "region",
  "govType": "main | secondary",
  "govRegionId": "<uuid of a valid region>",
  "govAccessGrants": { ... } | null
}
```

Created account: `govRegionId = <given UUID>`, `mustChangePassword = true`.

Validation: `govRegionId` must exist in `regions` table (FK check at service layer, not just DB constraint, to return a meaningful error code `GOV_INVALID_REGION`).

---

**Case 3: Region-main creates an account for their own region**

Authorization: `req.user.govLevel === 'region' && req.user.govType === 'main'`

Enforced constraints (server-side, not just client-honoring):
- `govLevel` is always forced to `'region'` — a region main cannot create republic accounts.
- `govRegionId` is always forced to `req.user.govRegionId` — cannot create accounts for other regions.

Body can specify: `govType`, `govAccessGrants`, credentials.

---

**Defense in depth:** provisioning controller also checks at the body level (not just relying on middleware):
```js
// Prevent region-main from escalating to republic
if (req.user.govLevel === 'region') {
  if (body.govLevel !== 'region') {
    return res.status(403).json({ error: { code: 'GOV_CANNOT_CREATE_REPUBLIC_ACCOUNT' } });
  }
  body.govRegionId = req.user.govRegionId; // force their own region
}
```

### 3.2 Credential format (Q3 resolved)

**Slug rule:** `name@{regions.code.toLowerCase()}`

The `regions.code` field (e.g. `TAS`, `SAM`, `FER`, `KAR`) is already the stable machine identifier and is UNIQUE by DB constraint. Lowercased, it gives a short, unambiguous, collision-free suffix with no transliteration logic needed:

| Account | Email format |
|---|---|
| Region account, Tashkent (code `TAS`) | `ali@tas` |
| Region account, Samarqand (code `SAM`) | `sarvar@sam` |
| Region account, Farg'ona (code `FER`) | `nilufar@fer` |
| Region account, Qoraqalpog'iston (code `KAR`) | `jasur@kar` |
| Republic-level account | `name@respublika` |
| Placeholder accounts (Sprint A) | `name@r01`, `name@r02`, … `name@r13` |

The `@regionname` suffix is a convention, not a technical constraint. The actual `email` field stores the full string (e.g. `ali@tas`). This mirrors the teacher/parent pattern (`name@schoolname`).

**Republic suffix `@respublika`** — fixed literal string, not derived from a code. There is exactly one republic-main super-admin (Q2), so no collision risk.

**On PL-015 data-swap:** when real region codes arrive, existing placeholder accounts (if any) have their emails updated by the data-swap migration. The slug changes from `@r01` to the real code (e.g. `@tas`). This is an expected side-effect of using placeholder codes during development. Document it in the Sprint D migration.

Password: set manually by the creating account at provisioning time. No auto-generation. The new account receives the password out-of-band (e.g., face-to-face or secure channel). `mustChangePassword = true` is set on creation.

### 3.3 Forced-password-change gate

In `authenticate` middleware, after user is loaded:
```js
if (user.role === 'government' && user.mustChangePassword) {
  // Allow only the change-password endpoint
  if (req.path !== '/auth/change-password') {
    return res.status(403).json({
      success: false,
      error: { code: 'GOV_MUST_CHANGE_PASSWORD' },
      mustChangePassword: true,
    });
  }
}
```

The frontend receives `mustChangePassword: true` and redirects to the change-password screen. After change, backend sets `mustChangePassword = false` and clears the user cache.

New endpoint: `PUT /api/auth/change-password` (already exists? — check; if not, add). This endpoint must not require `mustChangePassword = false` as a precondition.

### 3.4 Deletion flow

**Who can delete whom:**

| Actor | Can delete |
|---|---|
| Republic-main | Any `role='government'` account except themselves — and the republic-main account itself cannot be deleted by anyone (single super-admin, Q2 resolved) |
| Region-main | Any `role='government'` account with `govRegionId = req.user.govRegionId` except themselves |
| Secondary accounts | Cannot delete anyone |

**Q2 implication:** The republic-main account has no deletion path. The controller blocks it:

Controller-level check (defense in depth, not just middleware):
```js
const target = await User.findByPk(id);
if (!target || target.role !== 'government') return res.status(404)...;
if (target.id === req.user.id) return res.status(400)... // CANNOT_DELETE_SELF

// Block deletion of the single super-admin
if (target.govLevel === 'republic' && target.govType === 'main') {
  return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE_SUPER_ADMIN' } });
}

// Region-main can only delete accounts in their region
if (req.user.govLevel === 'region' && target.govRegionId !== req.user.govRegionId) {
  return res.status(403)...
}
```

**What happens to accounts created by the deleted account (Q5 resolved — orphan):** Secondary accounts created by the deleted main remain active and accessible. They are not cascade-deleted. A republic-main (who can manage all government accounts) is responsible for reassigning or deleting orphaned secondaries. This is the least-destructive default — accidental main-account deletion cannot silently wipe secondary accounts. No `createdById` FK is needed; republic-main has visibility into all accounts regardless of creator.

### 3.5 Password-reset delegation chain

New endpoint: `PUT /api/government/users/:id/reset-password`  
Body: `{ newPassword: "..." }`

Authorization chain:
- Republic-main → can reset password of any government account
- Region-main → can reset password of government accounts with `govRegionId = req.user.govRegionId`
- Secondary → cannot reset anyone's password (this is a management action)

On success: hash new password, set `mustChangePassword = true` on target account, invalidate target's JTI (force re-login with new password), return 200.

The chain is: region-account's password is reset by region-main. Region-main's password is reset by republic-main. Republic-main's own password is reset via the CLAUDE.md migration approach (pre-compute bcrypt hash locally, deploy one-off UPDATE migration via Railway) — there is no in-app mechanism, since Q2 established there is exactly one republic-main and no peer account exists to reset it. Q7 (formally asks about this) can be closed: the migration approach is the canonical answer; no new mechanism needed.

---

## Section 4 — What in the Closed Backend Must Reopen

All items are security-critical. All authorization changes require IDOR-style revert-tests.

### New files

| File | Type | Notes |
|---|---|---|
| `backend/models/Region.js` | New model | Region entity |
| `backend/models/District.js` | New model | Optional finer grain |
| `backend/middleware/regionScope.js` | New middleware | `requireRegionScope`, `regionWhere`, `requireGovAccess` |
| `backend/migrations/YYYYMMDD-add-regions-table.js` | New migration | |
| `backend/migrations/YYYYMMDD-add-districts-table.js` | New migration | |
| `backend/migrations/YYYYMMDD-add-schools-region-fk.js` | New migration | `regionId`, `districtId` nullable columns |
| `backend/migrations/YYYYMMDD-add-users-gov-fields.js` | New migration | 5 new columns on users |
| `backend/migrations/YYYYMMDD-backfill-existing-gov-accounts.js` | New migration | Set republic+main on all existing government users |
| `backend/__tests__/middleware/regionScope.test.js` | New tests | Isolation proofs, revert-tests |
| `backend/__tests__/controllers/governmentRegionIsolation.test.js` | New tests | IDOR tests for all 10 endpoints listed in §2.3 |

### Modified existing files

| File | Change | Revert-test required |
|---|---|---|
| `backend/models/User.js` | Add 5 new columns | No (additive) |
| `backend/models/School.js` | Add `regionId`, `districtId` | No (additive) |
| `backend/models/index.js` | Add 3 new associations | No |
| `backend/middleware/auth.js` | Add `mustChangePassword` gate | Yes — prove gate blocks requests |
| `backend/middleware/schoolScope.js` | Update `schoolWhere` for region-aware government (currently returns `{}` for all government) | Yes |
| `backend/routes/governmentRoutes.js` | Add `requireRegionScope` + `requireGovAccess` per route | Yes (all routes) |
| `backend/controllers/governmentController.js` | Add `regionWhere(req)` to ALL 10 data endpoints | Yes (all endpoints) |
| `backend/controllers/admin/adminUserController.js` | `createGovernment`: add level/type/region/grants; provisioning auth. `getGovernments`: scope to region. `deleteGovernmentUser`: auth chain. `updateGovernmentUser`: scope check. | Yes |
| `backend/validators/governmentUserValidator.js` | Add validation for new fields | No |
| `backend/__tests__/adminUser.test.js` | Update for new provisioning fields | No |

### Authorization changes requiring revert-tests (summary)

Every item in §2.3 (10 endpoints) + provisioning (3 cases) + deletion + password-reset = at minimum 15 new IDOR/scope revert-tests.

---

## Section 5 — Impact on Already-Built Government Work

### Sprint 1 (committed, not yet retrofitted)

**BC-01 — `getSchoolById`** (`governmentController.js:259`):
- Current: `School.findOne({ where: { id } })` — any government user, any school.
- After retrofit: `School.findOne({ where: { id, ...regionWhere(req) } })` — region accounts get 404 for out-of-scope schools.
- **Honest assessment:** the fix is one line change plus a revert-test. The BC-01 work is not wasted — the core fix (removing `isActive: true`) stands; only scoping is added.

**`archiveSchool` / `reactivateSchool`** (`governmentController.js:930, 961`):
- Current: `School.findByPk(id)` — no region check. A region account could archive any school globally.
- After retrofit: `School.findOne({ where: { id, ...regionWhere(req) } })` or equivalent — region accounts get 404 for out-of-scope schools, which prevents the mutation.
- The audit log calls remain correct (they record the actor's ID, which is already the region account's ID).
- **Q9 confirmed (2026-05-21):** Republic-main can archive/reactivate any school. Region-main can archive/reactivate schools in their own region only. Secondary accounts require the `canArchiveSchools` grant. The `requireGovAccess('canArchiveSchools')` middleware gate + controller check together enforce this.

**`getAuditLog`** (`governmentController.js:1012`):
- Current: returns all governance events regardless of what region's schools are involved.
- After retrofit: for region accounts, additionally filters `action='archive'/'reactivate'` events by checking that `entityId` is a school in the account's region. Non-school events (admin registrations, account CRUD) are excluded for region accounts — those are republic-level governance.
- This is the most complex retrofit because it requires a subquery join (audit_log.entityId → schools.id → schools.regionId).

**Sprint 1 audit-log viewer (S1-F02 frontend):**
- The `AuditLog.jsx` page will show fewer entries for region accounts after scoping lands. This is correct behavior — no frontend changes needed beyond possibly displaying the account's region name as a filter chip.

### Sprint 2 (not yet built)

Schools pagination, Students/Teachers/Parents directory pages — ALL are currently planned without region scoping (because CP-021 wasn't designed yet). When these are built in Sprint 2, they MUST incorporate `regionWhere(req)` from the start. Do not build Sprint 2 before Sprint A of the CP-021 implementation is merged.

The directories are already blocked on PL-014 (PII sign-off) anyway, giving time to land CP-021 first.

---

## Section 6 — Migration & Rollout

### Migration order (strict, enforced by sequential migration files)

1. **Add `regions` table** — no data dependency; runs cleanly on empty table.
2. **Add `districts` table** — depends on `regions`; FK constraint is safe if regions table exists.
3. **Add `schools.regionId` and `schools.districtId`** — nullable FKs; existing schools are not broken (they get `regionId = null`).
4. **Add user government columns** — `govLevel`, `govType`, `govRegionId`, `govAccessGrants` nullable; `mustChangePassword` defaults to `false`. No existing row breaks.
5. **Backfill existing government accounts** — UPDATE sets republic+main on all current `role='government'` users. Since step 4 already set defaults, this is a no-op for new columns that were null — but makes the intent explicit in the migration log.
6. **Seed placeholder region data (Sprint A)** — 13 placeholder rows (`R01`…`R13`, `name_* = 'Region 01'`…`'Region 13'`) inserted in the same Sprint A migration batch. Region accounts can be provisioned immediately against placeholder regions. No PL-015 dependency. Tests run against placeholder data throughout Sprints A–C.
7. **Pre-demo data-swap (Sprint D — after PL-015)** — when partner delivers the authoritative region list, a replacement migration: (a) UPDATE placeholder rows with real names and codes; (b) backfill `schools.regionId` by matching existing `schools.region` free-text field against `regions.name_uz` / `regions.name_en`; (c) update placeholder account email suffixes from `@r01` etc. to real codes. Any school without a match keeps `regionId = null` (treated as unassigned). An admin script or UI handles residual assignments.

### Rollout safety analysis

Steps 1–5 are **purely additive**: no existing column is modified, no behavior changes. The app can be deployed with steps 1–5 applied while the current `requireGovernment` middleware is still in place — the new columns simply exist and do nothing until `requireRegionScope` is added to routes.

`requireRegionScope` middleware is only added to routes in a SEPARATE COMMIT after steps 1–5 are complete AND all existing government accounts are confirmed backfilled. This prevents a window where a government account with `govLevel = null` hits the new middleware and gets 403.

Step 6 (placeholder seed) runs in Sprint A alongside steps 1–5 — it is part of the initial migration batch, not a later gate. Step 7 (real data swap) runs in Sprint D, independently of code sprints.

**No real users are affected** — Railway production has no real users yet. The migration is safe to run anytime.

### The `region` string field on School

Keep it. Do not drop it. It serves as the display label until `regionId` FK is verified accurate. The scoping middleware ignores it. The frontend can display it as a human-readable fallback when `regionId` is null. Deprecation is a Database portal S2 task.

---

## Section 7 — Questions (all resolved)

All questions are now resolved or defaulted. Implementation of Sprint A may begin.

**Q1 — Isolation boundary: region or district?** ✅ RESOLVED (2026-05-21)  
**Answer:** Region-level. 13 regions (12 viloyats + Karakalpakstan). Districts are metadata only — no auth enforcement at district level. `requireRegionScope` uses `govRegionId → regions.id` exclusively.

**Q2 — Multiple republic-main accounts?** ✅ RESOLVED (2026-05-21)  
**Answer:** Exactly one republic-main super-admin. No second republic-main can be created. The super-admin account cannot be deleted. Password reset for this account uses the CLAUDE.md migration approach (see §3.5). Q7 is implicitly answered by this decision.

**Q3 — Credential format: which region identifier?** ✅ RESOLVED (2026-05-21)  
**Answer:** `regions.code` lowercased (e.g. `ali@tas`, `sarvar@sam`). Code is already UNIQUE by DB constraint — no transliteration logic needed. Republic accounts: `name@respublika`. Full slug table and PL-015 data-swap note in §3.2.

**Q4 — Secondary account default grants:** ✅ RESOLVED (2026-05-21)  
**Answer:** Deny-by-default. New secondary accounts start with `govAccessGrants = {}` (empty object = zero access). Creator must explicitly enable each grant. `null` is reserved for main accounts (full access). See §1.4 for the null/`{}`/explicit distinction.

**Q5 — Deleting a main account that has created secondaries:** ✅ RESOLVED (2026-05-21, defaulted)  
**Answer:** Orphan — secondaries remain active. No cascade delete. Republic-main manages orphaned accounts. Least-destructive default; overridable by Max if cascade is later preferred. See §3.4.

**Q6 — Tashkent city vs Tashkent region:** ✅ RESOLVED (2026-05-21, non-blocker)  
**Answer:** Implementation non-blocker. The regions table accommodates 13 or 14 rows equally. Sprint A seeds 13 placeholder rows. Final count is determined by PL-015 data (Sprint D). Code is count-agnostic.

**Q7 — Republic-main password reset:** ✅ RESOLVED (2026-05-21, by Q2 decision)  
**Answer:** Migration approach from CLAUDE.md is the canonical fallback. No in-app mechanism needed. Since Q2 established exactly one republic-main with no peer account, the migration approach is the only viable path anyway. See §3.5.

**Q8 — Access grant granularity:** ✅ RESOLVED (2026-05-21, recommended default confirmed)  
**Answer:** Per-feature boolean is sufficient. No row-level field filtering. The 11-key `govAccessGrants` JSONB structure in §1.4 is the full grant schema.

**Q9 — Archive/reactivate authorization level:** ✅ RESOLVED (2026-05-21)  
**Answer:** Republic-main can archive/reactivate any school (unrestricted). Region-main can archive/reactivate schools in their own region only. Secondary accounts require the `canArchiveSchools` grant. See §5 and §2.1 for implementation path.

**Q10 — Audit log scope for region accounts:** ✅ RESOLVED (2026-05-21)  
**Answer:** Option (a) — region accounts see ALL governance events for schools in their region, regardless of which government actor performed them. The subquery join (`entityId IN (SELECT id FROM schools WHERE regionId = req.regionScope)`) is the implementation path. See §2.2.

---

## Section 8 — Implementation Sequencing

Confirmed. All §7 questions resolved; sequencing is valid and approved. Sprint A may begin immediately.

**Sprint A — Data model + auth core (Backend reopens)**
- `Region`, `District` models + migrations
- **13 placeholder rows seeded** (`R01`…`R13`) in the same migration batch — tests run against these immediately
- Add 5 government columns to User + migration
- Add `regionId`, `districtId` to School + migration
- Backfill existing government accounts (republic + main)
- `requireRegionScope` + `regionWhere` + `requireGovAccess` middleware
- `mustChangePassword` gate in auth.js
- Full isolation test suite (§2.3) with revert-tests
- Routes wired up with `requireRegionScope` — region accounts provisioned against placeholder regions are fully operational

**Sprint B — Endpoint scoping retrofit**
- Retrofit all 10 government endpoints with `regionWhere(req)` 
- Retrofit Sprint 1 endpoints: `getSchoolById`, `archiveSchool`, `reactivateSchool`, `getAuditLog`
- All revert-tests for each retrofitted endpoint

**Sprint C — Provisioning flows**
- `createGovernment`: full level/type/region/grants validation + authorization chain
- `getGovernments`: scoped list
- `deleteGovernmentUser`: auth chain
- `updateGovernmentUser`: scope check
- New `PUT /government/users/:id/reset-password` endpoint
- Provisioning tests (3 creation cases + deletion + password-reset)

**Sprint D — Real region data swap (pre-demo, after PL-015)**
- UPDATE placeholder rows (`R01`…`R13`) with real names and codes from PL-015
- Backfill `schools.regionId` by matching free-text `schools.region` against `regions.name_uz`/`name_en`
- Update email suffixes on any placeholder-era government accounts (`@r01` → `@tas` etc.)
- Smoke test: region accounts now operate against real geographic data

**Sprint E — Government portal UI updates**
- Government portal shows region badge in header for region accounts
- Republic accounts get a region-filter dropdown on the Schools, Ratings, and Directory pages
- Region accounts see their region pre-selected, cannot switch to other regions
- `mustChangePassword` flow: on login 403 `GOV_MUST_CHANGE_PASSWORD`, redirect to change-password screen

Shape of work: ~5 sprints, sequentially dependent. Sprint A is the prerequisite for all others. **PL-015 does not gate any code sprint** — Sprint D is a data-swap that runs independently once partner data arrives. Sprint E can start in parallel with Sprint C once Sprint B is merged.

---

## APPROVED — Implementation may begin.

All design decisions are resolved. No migration files, model changes, or middleware have been written yet. Sprint A is the next prompt.

**Full decision checklist:**

- [x] Q1: Isolation boundary → **region-level** (13 regions, districts dormant)
- [x] Q2: Republic-main → **single super-admin** (no second republic-main, no deletion path)
- [x] Q3: Credential suffix → **`regions.code` lowercased** (`ali@tas`). Republic: `@respublika`. See §3.2.
- [x] Q4: Secondary grants → **deny-by-default** (`{}` = zero access; `null` reserved for main accounts). See §1.4.
- [x] Q5: Deletion of main → **orphan secondaries** (remain active; republic-main manages). See §3.4.
- [x] Q6: Tashkent city/region count → **implementation non-blocker** (data-driven; Sprint A uses 13 placeholders; PL-015 determines final count).
- [x] Q7: Republic-main password reset → **migration approach** (CLAUDE.md pattern). No in-app mechanism.
- [x] Q8: Grant granularity → **per-feature boolean** (11 keys in `govAccessGrants`). No row-level filtering.
- [x] Q9: Archive/reactivate → **region-main own region**; secondary needs `canArchiveSchools` grant.
- [x] Q10: Audit log scope → **option (a)** (all events for schools in region, regardless of actor).

**PL-015 status:** reclassified as pre-demo data-swap (Sprint D). Does NOT block Sprints A, B, C, or E. Development and testing use 13 placeholder regions seeded in Sprint A.
