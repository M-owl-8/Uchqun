# Region Sprint A — Execution Log

**CP-021 · Data Model + Authorization Core**
**Date:** 2026-05-21
**Branch:** main
**Status:** ✅ Complete

---

## Commits

| # | SHA | Message |
|---|-----|---------|
| 1 | 2a9bf77 | feat(backend): region model data layer — regions/districts tables, user gov columns, school region FKs (additive migration + backfill) |
| 2 | 7217eac | feat(backend): Region and District models with associations |
| 3 | 8f45b51 | feat(backend): region authorization middleware — requireRegionScope, regionWhere, requireGovAccess |
| 4 | fc55bc3 | test(backend): region isolation + access-grant proof tests with revert evidence |

---

## Commit 1 — Migration (`2a9bf77`)

**File:** `backend/migrations/20260521100000-region-model-data-layer.js`

Steps performed by `up`:
1. Create `regions` table — UUID PK, `code` UNIQUE, `name`, `isRepublic` BOOLEAN, timestamps. Index on `code`.
2. Create `districts` table — UUID PK, `regionId` FK→regions ON DELETE RESTRICT, `code`, `name`, timestamps.
3. Add `schools.regionId` FK→regions (nullable, ON DELETE SET NULL) + index. Add `schools.districtId` FK→districts (nullable, ON DELETE SET NULL).
4. Add `users.govLevel` STRING(20) + DB CHECK('republic','region'). Add `users.govType` STRING(20) + CHECK('main','secondary'). Add `users.govRegionId` FK→regions (nullable, ON DELETE SET NULL). Add `users.govAccessGrants` JSONB nullable. Add `users.mustChangePassword` BOOLEAN DEFAULT false.
5. Seed 13 placeholder regions (stable UUIDs `000…0001`–`000…000d`): 12 viloyats + Karakalpakstan (isRepublic=true). Code pattern: `r01`–`r13`. Real names TBD in Sprint D (PL-015).
6. Backfill: all existing `role='government'` users → `govLevel='republic'`, `govType='main'`, `govRegionId=NULL`, `govAccessGrants=NULL`, `mustChangePassword=false`. Preserves backward compat; provisioning flow (Sprint B) prevents NEW republic-main creation.

CHECK constraint DDL uses `DO $$ BEGIN … EXCEPTION WHEN duplicate_object THEN NULL; END $$` for idempotency.

`down` reverses in FK-safe order: user gov columns → school region/district columns → districts → regions.

---

## Commit 2 — Models (`7217eac`)

### New: `backend/models/Region.js`
`sequelize.define('Region', …)` — UUID PK, code (STRING 50, unique), name (STRING 255), isRepublic (BOOLEAN, default false). `timestamps: true, paranoid: false`.

### New: `backend/models/District.js`
`sequelize.define('District', …)` — UUID PK, regionId (UUID, NOT NULL), code (STRING 50, nullable), name (STRING 255). `timestamps: true, paranoid: false`.

### Updated: `backend/models/User.js`
Added 5 fields before the teacher-rating block:
- `govLevel` STRING(20) + Sequelize `isIn` validate
- `govType` STRING(20) + Sequelize `isIn` validate
- `govRegionId` UUID nullable
- `govAccessGrants` JSONB nullable
- `mustChangePassword` BOOLEAN default false

### Updated: `backend/models/School.js`
Added after `isActive`:
- `regionId` UUID nullable (CP-021 isolation FK)
- `districtId` UUID nullable (metadata-only)

### Updated: `backend/models/index.js`
- Imports: `Region`, `District`
- Associations block `=== CP-021 Region model ===`:
  - `Region.hasMany(District)` / `District.belongsTo(Region)` — with FK RESTRICT in migration
  - `Region.hasMany(School)` / `School.belongsTo(Region)` — `constraints: false` (null-safe)
  - `District.hasMany(School)` / `School.belongsTo(District)` — `constraints: false`
  - `Region.hasMany(User, { as: 'govUsers' })` / `User.belongsTo(Region, { as: 'govRegion' })` — `constraints: false`
- Named exports: `Region`, `District`

---

## Commit 3 — Middleware (`8f45b51`)

### New: `backend/middleware/regionScope.js`

**`requireRegionScope(req, res, next)`**
- Reads `govLevel`, `govType`, `govRegionId`, `govAccessGrants` from `req.user` (set by `authenticate`)
- `govLevel=null` → 403 `GOV_ACCOUNT_NOT_CONFIGURED` (fail-closed; protects against un-backfilled accounts)
- `govLevel='republic'` → `req.isGlobalAccess=true`, `req.regionScope=null`
- `govLevel='region'` → `req.isGlobalAccess=false`, `req.regionScope=govRegionId`
- Always forwards `req.govType` and `req.govAccessGrants`

**`regionWhere(req)`**
- `isGlobalAccess=true` → `{}` (no filter; Sequelize spreads into no restriction)
- `isGlobalAccess=false` → `{ regionId: req.regionScope }`
- `isGlobalAccess=false` + `regionScope=null` → throws (programming error guard)

**`requireGovAccess(grantKey)`** — returns middleware factory
- `govType='main'` → `next()` unconditionally
- `govType='secondary'` → checks `(govAccessGrants || {})[grantKey] === true`; deny returns 403 `GOV_ACCESS_DENIED`
- `|| {}` fallback: misconfigured secondary (null grants) gets 403, not elevated access (deny-by-default)

### i18n additions
Added to catalog (`audits/backend/i18n-error-codes.md`) and all 3 lang files:
- `GOV_ACCOUNT_NOT_CONFIGURED` (403)
- `GOV_ACCESS_DENIED` (403)

`verify-i18n.js`: 108 → 110 codes, all 3 files pass.

---

## Commit 4 — Tests (`fc55bc3`)

**New:** `backend/__tests__/middleware/regionScope.test.js` — 21 tests

### `requireRegionScope` (4 tests)
- republic account → `isGlobalAccess=true`, `regionScope=null`, `govType='main'`
- region account → `isGlobalAccess=false`, `regionScope=REGION_A`
- secondary account → `govAccessGrants` forwarded
- `govLevel=null` → 403 `GOV_ACCOUNT_NOT_CONFIGURED`

### `regionWhere` (4 tests)
- republic → `{}`
- region → `{ regionId: REGION_A }`
- `isGlobalAccess=false` + null scope → throws 'regionScope not set'
- different regions produce different fragments

### Region isolation — revert-test pair (5 tests)
- `[REVERT-TEST: BUG]` buggy `regionWhere = () => ({})` — region B account sees region A school. Test asserts the LEAK (proves test would fail with bug present)
- `[REVERT-TEST: FIXED]` correct `regionWhere` — region B sees only region B school, region A hidden
- republic `{}` filter → sees all schools (count=2)
- IDOR via UUID: region B queries region A school ID → `findOne` returns undefined → 404 (404-not-403 posture)
- null-region school: invisible to region account (null !== REGION_B), visible to republic (`{}` = no restriction)

### `requireGovAccess` (8 tests)
- main passes any grant key (including absent keys)
- secondary + explicit `true` grant passes
- secondary missing key → 403
- secondary `false` grant value → 403
- secondary empty grants object → 403 (deny-by-default)
- `[REVERT-TEST: BUG]` secondary null grants without `|| {}` → 403 (correct outcome shown)
- `[REVERT-TEST: FIXED]` secondary null grants with `|| {}` fallback → 403 (cannot escalate to main)

### Collateral fixes (same commit)
- `backend/__tests__/i18n.test.js`: `EXPECTED_CODE_COUNT` 108→110
- `backend/__tests__/childAuditHook.test.js`: added `define: jest.fn()` to database mock
- `backend/__tests__/controllers/journalController.test.js`: same fix

Root cause of two collateral failures: `models/index.js` now imports `Region.js` + `District.js`, both of which call `sequelize.define(...)`. Tests that mocked `database.js` with only `{ authenticate, sync }` started throwing `TypeError: sequelize.define is not a function`. Fix: add `define: jest.fn().mockReturnValue(mockModel())` to the mock.

---

## Post-sprint verification

| Check | Result |
|-------|--------|
| Migration up | ✅ Applied cleanly |
| Migration down | ✅ Reversed cleanly |
| Migration up (re-run) | ✅ Idempotent (DO $$ EXCEPTION on CHECK constraints) |
| Full test suite | ✅ 94 suites / 967 tests / 0 failures |
| Lint | ✅ 0 errors |
| verify-i18n | ✅ 110 codes, 3 files match catalog |

---

## Design decisions recorded

**Super-admin reconciliation:** migration grandfathers ALL existing `role='government'` accounts as `republic+main`. Sprint B provisioning controller will prevent NEW republic-main creation. Deletion guard = "cannot delete LAST republic-main" (not "any").

**Null-region schools:** tolerated. Republic sees them (filter `{}` = no restriction). Region accounts don't (filter `{ regionId: X }` where `null !== X`). No special null-handling needed.

**STRING(20)+CHECK vs ENUM:** consistent with existing `status` column pattern. Avoids Postgres ENUM type management complexity.

**constraints: false on Region↔School, Region↔User:** existing rows have null FKs; Sequelize constraint validation at the association level would reject them. `constraints: false` delegates FK integrity to the DB-level migration constraint.

**404-not-403 posture for IDOR:** controller uses `School.findOne({ where: { id, ...regionWhere(req) } })`. Wrong-region ID returns null → 404. Resource "does not exist" to the attacker. Full endpoint tests in Sprint C.

---

## Remaining sprints

| Sprint | Scope | Status |
|--------|-------|--------|
| Sprint B | Provisioning: createGovernment, deleteGovernmentUser, password-reset, mustChangePassword gate | ⬜ |
| Sprint C | Endpoint scoping retrofit: all 10 government endpoints + Sprint 1 endpoints | ⬜ |
| Sprint D | Real region data swap (PL-015 — after partner delivers) | ⬜ |
| Sprint E | Government portal UI updates | ⬜ |
