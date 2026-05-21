# Region/Hierarchy Authorization Model — Design Document (CP-021)
## DESIGN ONLY — No implementation. Pending Max approval.

**Date:** 2026-05-21  
**Status:** AWAITING APPROVAL — no implementation until Max confirms  
**Captures:** The full authorization model for region-scoped government accounts  
**Precedes:** All CP-021-dependent work (CP-020 aggregation, CP-022 routing, government directories)

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

**No regions are hardcoded.** The table is seeded by a migration once the partner delivers the authoritative list (PL-015). Until then, the table is empty and no region-scoping enforcement is possible for region accounts.

**Expected rows:** ~14 (12 viloyats + Karakalpakstan + Tashkent city — confirmed by partner). The `code` field is the stable machine identifier; `name_*` fields are the display labels.

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

Districts are designed in from the start so the schema can support district-level isolation if the product later requires it. Whether the isolation boundary is region or district is an open question (Section 7, Q1). The model accommodates both — if district isolation is never needed, these rows simply sit unused.

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

`null` value means the account has full access within its region scope (i.e., it's a main account or a secondary account that was given blanket access). A `false` value for a specific key means that feature is explicitly denied.

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

**Case 1: Republic-main creates another republic account**

Authorization: `req.user.govLevel === 'republic' && req.user.govType === 'main'`

Request body:
```json
{
  "firstName": "...", "lastName": "...",
  "email": "ali@respublika",
  "password": "...",
  "govLevel": "republic",
  "govType": "main | secondary",
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

### 3.2 Credential format

`name@regionname` — where `regionname` is the `regions.code` (lowercase) of the account's region. For republic accounts: `name@respublika` (placeholder — confirm with Max, see Q3).

The `@regionname` suffix is a convention, not a technical constraint. The actual `email` field stores the full string (e.g. `ali@toshkent`). This mirrors the teacher/parent pattern (`name@schoolname`).

Password: set manually by the creating account at provisioning time. No auto-generation. The new account receives the password out-of-band (e.g., face-to-face or secure channel).

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
| Republic-main | Any `role='government'` account except themselves |
| Region-main | Any `role='government'` account with `govRegionId = req.user.govRegionId` except themselves |
| Secondary accounts | Cannot delete anyone |

Controller-level check (defense in depth, not just middleware):
```js
const target = await User.findByPk(id);
if (!target || target.role !== 'government') return res.status(404)...;
if (target.id === req.user.id) return res.status(400)... // CANNOT_DELETE_SELF

// Region-main can only delete accounts in their region
if (req.user.govLevel === 'region' && target.govRegionId !== req.user.govRegionId) {
  return res.status(403)...
}
```

**What happens to accounts created by the deleted account:** open question for Max (Section 7, Q5).

### 3.5 Password-reset delegation chain

New endpoint: `PUT /api/government/users/:id/reset-password`  
Body: `{ newPassword: "..." }`

Authorization chain:
- Republic-main → can reset password of any government account
- Region-main → can reset password of government accounts with `govRegionId = req.user.govRegionId`
- Secondary → cannot reset anyone's password (this is a management action)

On success: hash new password, set `mustChangePassword = true` on target account, invalidate target's JTI (force re-login with new password), return 200.

The chain is: region-account's password is reset by region-main. Region-main's password is reset by republic-main. Republic-main's password is reset by... another republic-main (open question Q7 if there's only one).

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
6. **Seed region data** — runs only after partner delivers PL-015 authoritative list. Until then, `regions` table is empty and region-level account provisioning is impossible (FK constraint prevents creating accounts with invalid `govRegionId`).
7. **Backfill `schools.regionId`** — after region data is seeded. Strategy: match existing `schools.region` free-text field against `regions.name_uz` or `regions.name_en` (fuzzy match algorithm or manual assignment). Any school that doesn't match keeps `regionId = null` (treated as unassigned). A separate admin script or UI handles the assignment.

### Rollout safety analysis

Steps 1–5 are **purely additive**: no existing column is modified, no behavior changes. The app can be deployed with steps 1–5 applied while the current `requireGovernment` middleware is still in place — the new columns simply exist and do nothing until `requireRegionScope` is added to routes.

`requireRegionScope` middleware is only added to routes in a SEPARATE COMMIT after steps 1–5 are complete AND all existing government accounts are confirmed backfilled. This prevents a window where a government account with `govLevel = null` hits the new middleware and gets 403.

Steps 6–7 can run weeks after steps 1–5. No user-visible behavior changes until region data is seeded.

**No real users are affected** — Railway production has no real users yet. The migration is safe to run anytime.

### The `region` string field on School

Keep it. Do not drop it. It serves as the display label until `regionId` FK is verified accurate. The scoping middleware ignores it. The frontend can display it as a human-readable fallback when `regionId` is null. Deprecation is a Database portal S2 task.

---

## Section 7 — Open Questions for Max/Partner

These must be answered before implementation begins. No code is written until Section 8's Sprint A is approved, and Sprint A cannot fully complete until Q1 and Q2 are resolved.

**Q1 — Isolation boundary: region or district?**  
Is the hard isolation boundary at region level, district level, or both? (i.e., can an account be scoped to a district rather than a whole region?) The design supports district as a column on School and on User (`govRegionId` could be replaced with `govScopeId` pointing to either a region or district) but this changes the middleware significantly. **Recommended default:** region-level only, district is classification only. But need confirmation.

**Q2 — Multiple republic-main accounts?**  
Can there be multiple republic-main accounts, or is it a single super-account? If there's only one, what happens if it's deleted (no one can create new republic accounts)? **Recommended:** allow multiple republic-main accounts; protect against deletion of the last one with a guard (`CANNOT_DELETE_LAST_REPUBLIC_MAIN`).

**Q3 — Credential format: which region identifier?**  
`name@regionname` — which field is `regionname`? The `regions.code` (e.g. `TAS`), the `regions.name_uz` (e.g. `toshkent`), or something else? Also: what is the equivalent suffix for republic-level accounts? `@respublika`? `@republic`?

**Q4 — Secondary account default grants:**  
When creating a secondary account, is any access defaulted to `true`? Or must the creator explicitly grant everything (empty grants = zero access)? **Recommended:** empty grants = zero access, creator explicitly enables what the secondary account needs. Safest default.

**Q5 — Deleting a main account that has created secondaries:**  
When a main account is deleted, what happens to the secondary accounts it created? Options: (a) cascade delete all dependents, (b) orphan them (they remain active), (c) transfer to another main account in the same scope. Option (b) is the safest for data continuity; option (a) is safer for security. Need Max's decision.

**Q6 — Tashkent city vs Tashkent region:**  
In Uzbekistan's administrative structure, Tashkent city (`Toshkent shahar`) is administratively separate from Tashkent region (`Toshkent viloyati`). Does the platform treat these as two separate regions (14 total) or merge them (13 total)? The partner's region list (PL-015) resolves this, but flag it explicitly.

**Q7 — Republic-main password reset:**  
Who resets a republic-main account's password if it's forgotten? Options: (a) another republic-main account (requires at least 2 republic-main accounts — see Q2), (b) a special "owner" mechanism outside the app (e.g., a one-off migration as documented in CLAUDE.md's "Credential Reset" section). **Recommended:** document the migration approach from CLAUDE.md as the fallback; encourage having at least 2 republic-main accounts.

**Q8 — Access grant granularity:**  
Is per-feature boolean sufficient, or do grants need row-level granularity? (e.g., a secondary account that can view schools but only their names, not ratings or student counts.) Per-feature boolean is simpler to implement and sufficient for most cases. Row-level granularity would require field-level filtering in every response serializer — significantly more complex.

**Q9 — Archive/reactivate authorization level:**  
Currently `archiveSchool` / `reactivateSchool` are available to any `government` account. In the new model: should region-main accounts be able to archive schools in their region, or is archival republic-main-only? (High-impact action — may warrant restriction to republic scope only.)

**Q10 — Audit log scope for region accounts:**  
When a region account views the audit log, do they see: (a) all governance events for schools in their region regardless of which government actor performed the action, or (b) only events they themselves performed? Option (a) gives region accounts visibility into republic-level actors operating in their region (useful for oversight). Option (b) is more restrictive. **Recommended:** option (a) — regional oversight should see all events in their scope.

---

## Section 8 — Implementation Sequencing Proposal

This is a proposal, not a plan. Max confirms or adjusts before implementation prompts are written.

**Sprint A — Data model + auth core (Backend reopens)**
- `Region`, `District` models + migrations (empty tables)
- Add 5 government columns to User + migration
- Add `regionId`, `districtId` to School + migration
- Backfill existing government accounts
- `requireRegionScope` + `regionWhere` + `requireGovAccess` middleware
- `mustChangePassword` gate in auth.js
- Full isolation test suite (§2.3) with revert-tests
- Routes wired up with `requireRegionScope` (but no region data yet → all region accounts fail with `GOV_ACCOUNT_NOT_CONFIGURED` until data is seeded)

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

**Sprint D — Region data + school backfill (after PL-015)**
- After partner delivers region list: seed migration
- School `regionId` backfill (matching algorithm or admin script)
- Smoke test: region accounts can now be provisioned and their scoping works against real data

**Sprint E — Government portal UI updates**
- Government portal shows region badge in header for region accounts
- Republic accounts get a region-filter dropdown on the Schools, Ratings, and Directory pages
- Region accounts see their region pre-selected, cannot switch to other regions
- `mustChangePassword` flow: on login 403 `GOV_MUST_CHANGE_PASSWORD`, redirect to change-password screen

Shape of work: ~5 sprints, sequentially dependent. Sprint A is the prerequisite for all others. Sprint D cannot start until PL-015 is resolved. Sprint E can start in parallel with Sprint C once Sprint B is merged.

---

## AWAITING APPROVAL — no implementation until Max confirms.

The above is a design document only. No migration files, no model changes, no middleware have been written. Implementation of Sprint A begins only after Max reviews this document and approves (or amends) the following decisions:

- [ ] Section 7 Q1: Isolation boundary (region only, or district too?)
- [ ] Section 7 Q2: Multiple republic-main accounts allowed?
- [ ] Section 7 Q3: Credential suffix format
- [ ] Section 7 Q4: Secondary account default grants (zero access default)
- [ ] Section 7 Q5: Deletion cascade vs orphan
- [ ] Section 7 Q6: Tashkent city vs region (resolved by PL-015 list)
- [ ] Section 7 Q9: Archive/reactivate — region-main or republic-only?
- [ ] Section 7 Q10: Audit log scope for region accounts

Questions Q7 (republic-main password reset) and Q8 (grant granularity) have recommended answers that can proceed with the recommendation if Max has no objection.
