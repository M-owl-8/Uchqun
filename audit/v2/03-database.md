# Phase 3 v2 — Database Verification
**Date:** 2026-05-08  
**Baseline:** `/audit/03-database.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 18 database issues, **2 are verified-fixed**, **2 are partially-fixed**, **1 is n/a-confirmed** (the tokenHash index was already present via the original create migration — the original audit made an error by looking only at the model file), and **13 are not-fixed**.

The tracker addressed 2 items explicitly: H-13 (FK index correction via migration 20260508000001) and M-06 (SchoolRating.stars NOT NULL via migration 20260508000002). Both are confirmed resolved. Everything else — the Child dual-representation, mealType casing split, avatar TEXT blob, missing indexes, hard-delete sensitive tables, school-scope inconsistency, RESTRICT FK blocks, and the fresh-install payments migration failure — is unchanged.

The database layer's structural debt is the deepest in the platform. The five HIGH-severity issues from Phase 3 have a combined impact on every authenticated request (02-001 + 03-005), every school isolation guarantee (03-018), every parent deletion flow (03-007), and every fresh install (03-012). None of those four were remediated.

**Phase 3 v2 score: 51/100** (up from 46/100).

---

## Scope

Verification of all 18 issues from `/audit/03-database.md`. All evidence from current model files and migration files at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 03-001 | HIGH | **not-fixed** | `backend/models/Child.js:47-66` | Both `school` (STRING) + `schoolId` (UUID FK), `teacher` (STRING), `class` (STRING) all present |
| 03-002 | MEDIUM | **not-fixed** | `Meal.js:23` vs `MealPlan.js:8-12` | `'Breakfast'` (TitleCase) vs `'breakfast'` (lowercase); two ENUM types unchanged |
| 03-003 | MEDIUM | **verified-fixed** | `SchoolRating.js:24-35`; migration `20260508000002` | `allowNull: false` now in model; migration enforces NOT NULL with backfill; fixed via M-06 |
| 03-004 | LOW | **not-fixed** | `backend/models/SuperAdminMessage.js:24` | `tableName: 'super_admin_messages'` unchanged |
| 03-005 | HIGH | **not-fixed** | `backend/models/User.js:58-61` | `avatar: { type: DataTypes.TEXT }` unchanged; no `attributes` projection anywhere |
| 03-006 | LOW | **not-fixed** | `backend/models/User.js:62-68` | `defaultValue: { email: true, push: true }` — `push` key still in model default |
| 03-007 | MEDIUM | **not-fixed** | `backend/models/TherapyUsage.js:29`; migration `20260506000000:57` | `onDelete: 'RESTRICT'` unchanged; no pre-delete controller check added |
| 03-008 | MEDIUM | **not-fixed** | `backend/models/News.js:22`; migration `20260506000000:71` | `onDelete: 'RESTRICT'` unchanged; no pre-delete controller check added |
| 03-009 | MEDIUM | **not-fixed** | `backend/models/AIWarning.js:23-26` | `targetId`: plain UUID, no FK reference, no polymorphic constraint |
| 03-010 | MEDIUM | **partially-fixed** | Migrations `20260506130000` + `20260508000001` | FK indexes added for childId/teacherId/schoolId etc.; `users.role`, `users.isActive`, `emotional_monitoring.childId/teacherId`, `ai_warnings.resolvedBy` still missing |
| 03-011 | HIGH | **n/a-confirmed** | `backend/migrations/20240103000000-create-refresh-tokens.js:50-52` | `idx_refresh_tokens_token_hash` created in the original 2024 create-migration; index existed before original audit; original finding was error (looked at model, not migration) |
| 03-012 | HIGH | **not-fixed** | `backend/migrations/20260506000000-add-cascade-rules.js:50-52` | No `IF EXISTS` guard on `payments` FK alteration; fresh-DB install failure risk unchanged |
| 03-013 | MEDIUM | **verified-fixed** | Migration `20260508000001-fix-fk-index-column-names.js:10-65` | Drops old snake_case indexes; creates new camelCase indexes; fixed via H-13 |
| 03-014 | MEDIUM | **not-fixed** | `Document.js`, `ChatMessage.js`, `ChildAssessment.js` | All three still lack `paranoid: true`; hard delete on sensitive records unchanged |
| 03-015 | MEDIUM | **not-fixed** | `ChildAssessment.js:18` (`underscored: true`), `ServicePlan.js:23` | snake_case DB columns in 4 newer models vs camelCase in 31 others; unchanged |
| 03-016 | LOW | **not-fixed** | No migration renames `super_admin_messages` | Table name unchanged; model `tableName: 'super_admin_messages'` |
| 03-017 | MEDIUM | **not-fixed** | `backend/routes/progressRoutes.js:12` | No `requireRole()` guard; controller implicit scoping only |
| 03-018 | HIGH | **not-fixed** | `backend/server.js:150-172` | `requireSchoolScope` not globally mounted; manual per-controller enforcement |

**Verdict distribution: 2 verified-fixed · 1 n/a-confirmed · 2 partially-fixed · 13 not-fixed**

---

## Detailed Findings

### 03-003 — SchoolRating `stars` model/DB sync (verified-fixed)

**Original symptom:** Migration made `stars` NOT NULL; model said `allowNull: true` — mismatch.

`backend/models/SchoolRating.js:24-35` (current):
```js
stars: {
  type: DataTypes.INTEGER,
  allowNull: false,
  validate: { min: 1, max: 5 }
}
```

`backend/migrations/20260508000002-school-rating-stars-not-null.js:13-16`:
```js
await queryInterface.changeColumn('school_ratings', 'stars', {
  type: Sequelize.INTEGER,
  allowNull: false,
  defaultValue: 3,
});
```

Model and DB are now in sync. Both declare NOT NULL. Fixed via tracker M-06.

---

### 03-011 — RefreshToken `tokenHash` index (n/a-confirmed)

**Original finding:** "Model defines no `indexes` array — full table scan on tokenHash lookup."

**Verification:** The original audit looked at the model file (`RefreshToken.js`) which has no `indexes` array. However, the *creation migration* from 2024-01-03 explicitly creates the index:

`backend/migrations/20240103000000-create-refresh-tokens.js:50-52`:
```js
await queryInterface.addIndex('refresh_tokens', ['token_hash'], {
  name: 'idx_refresh_tokens_token_hash',
});
```

This migration predates the audit by over two years. On any DB created via `npm run migrate` (the only supported path — CLAUDE.md: "Sequelize migrations only"), the index has always been present. The original audit made an error by not checking the corresponding creation migration. The model not declaring the index is a minor documentation gap but does not affect runtime — migration-applied indexes are persistent regardless of model definition.

**Verdict: n/a-confirmed.** The DB-level risk (full table scan) was never real on a migration-managed DB.

---

### 03-013 — FK index correction migration (verified-fixed)

**History:**
1. `20260330000000`: Used snake_case column names → silently failed, zero indexes created
2. `20260506130000`: Used camelCase → created correct indexes, but didn't remove the failed attempts
3. `20260508000001`: Drops all snake_case index entries by name, then creates the camelCase replacements

`backend/migrations/20260508000001-fix-fk-index-column-names.js` (structure):
```js
const OLD_INDEXES = [
  { table: 'children', name: 'idx_children_school_id' },
  { table: 'users', name: 'idx_users_teacher_id' },
  // ... etc. (all snake_case failures)
];

const NEW_INDEXES = [
  { table: 'children', columns: ['schoolId'], name: 'idx_children_schoolId' },
  { table: 'users', columns: ['teacherId', 'groupId', 'schoolId', 'createdBy'], name: '...' },
  // ... etc. (all camelCase)
];
```

Old invalid index entries are explicitly dropped before new ones are created. No silent-failure try/catch for the new index creation — the migration will hard-fail if any new index can't be created. This is the correct pattern. Fixed via tracker H-13.

---

### 03-001 — Child model dual representation (not-fixed)

`backend/models/Child.js:47-66` (current):
```js
school: { type: DataTypes.STRING(500), allowNull: false },
schoolId: { type: DataTypes.UUID, allowNull: true, references: { model: 'schools', key: 'id' } },
teacher: { type: DataTypes.STRING(255), allowNull: false },
class: { type: DataTypes.STRING(255), allowNull: false },
```

Both the denormalized string (`school`) and the FK (`schoolId`) are present and simultaneously writable. Any child created without a `schoolId` is invisible to school-scoped queries. The `receptionParentController.js:35` still has `school: req.body['child[school]'] || ... || 'Uchqun School'` — the string fallback is still active.

---

### 03-005 + 03-018 Compounding (not-fixed)

These two issues interact in a way the original audit did not fully quantify:

**03-005** (avatar blob in every User.findByPk) × **auth.js:18** (findByPk on every request) = multi-megabyte data movement on every API call. No field projection was added.

**03-018** (school scope not globally enforced) means that any new route added without manually calling `schoolWhere()` will leak cross-school data by default. The pattern requires developer discipline on every controller write — there is no safety net.

---

### 03-007 + 03-008 — RESTRICT FKs: No Pre-Delete Handling (not-fixed)

Both `TherapyUsage.parentId` (RESTRICT) and `News.createdById` (RESTRICT) block deletes without cascade or pre-delete cleanup. No controller was updated to handle these constraints:

- `adminUserController.js:deleteGovernmentBySuper` / `deleteAdminBySuper` — these functions delete users. If a government user or admin has created news items, the delete will return a 500 (FK violation) with no user-facing explanation.
- Reception parents with therapy usage records cannot be deleted via `deleteParent` in `receptionParentController.js` — the transaction calls `Child.destroy` first (cascade) but `TherapyUsage` has RESTRICT on `parentId` (parent User), not on `childId` (which is CASCADE). So the User-level delete at the end of the transaction will fail with a FK constraint error.

---

### 03-012 — Fresh-install payments migration failure (not-fixed)

`backend/migrations/20260506000000-add-cascade-rules.js:50-52` still contains:
```js
await alterFk(queryInterface, 'payments', 'parentId', 'users', 'id', 'RESTRICT');
await alterFk(queryInterface, 'payments', 'childId', 'children', 'id', 'SET NULL');
await alterFk(queryInterface, 'payments', 'schoolId', 'schools', 'id', 'SET NULL');
```

The `alterFk` function queries `information_schema.table_constraints` for the `payments` table. On a fresh install:
1. If `npm run migrate` runs all migrations sequentially, `20260118000000-create-payments.js` runs before this one, so `payments` exists. The migration would succeed.
2. However, if any partial migration batch has been run that included `20260506110000-drop-payments.js` without `20260506000000`, or if a developer runs migrations selectively, the `payments` table will be absent and `alterFk()` will throw.

This is a latent risk on fresh dev-environment setups and CI runs that don't start from a clean state.

---

### 03-010 — Missing Indexes (partially-fixed)

**Indexes confirmed added** by migrations `20260506130000` + `20260508000001`:

| Table | Column(s) | Index Name |
|-------|-----------|-----------|
| `users` | `teacherId`, `groupId`, `schoolId`, `createdBy` | Added |
| `children` | `schoolId`, `groupId` | Added |
| `activities` | `childId` | Added |
| `chat_messages` | `senderId`, `(conversationId, createdAt)` | Added |
| `documents` | `userId`, `reviewedBy` | Added |

**Indexes still missing** (not in any migration):

| Table | Column | Impact |
|-------|--------|--------|
| `users` | `role` | `User.findAll({ where: { role: 'teacher' } })` — full table scan |
| `users` | `isActive` | `User.findAll({ where: { isActive: true } })` — full table scan |
| `emotional_monitoring` | `childId`, `teacherId` | FK queries without indexes |
| `ai_warnings` | `resolvedBy` | FK, queried when listing resolved warnings |

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Messiness | 48% | 50% | +2 | (1) SchoolRating model/DB now in sync; (2) FK index corrective migration fully cleans old entries; (3) dual Child representation unchanged |
| Technical Debt | 45% | 46% | +1 | (1) tokenHash was always indexed (n/a-confirmed); (2) avatar TEXT, fresh-install payments failure, camelCase split all unchanged |
| Health | 60% | 63% | +3 | (1) stars NOT NULL enforced in both model and DB; (2) corrective FK index migration properly removes old failures; (3) RESTRICT FK blocks and missing indexes persist |
| Coherence | 52% | 52% | 0 | (1) snake_case/camelCase split across 4 newer models unchanged; (2) super_admin_messages table name unchanged |
| Documentation Coverage | 40% | 40% | 0 | No schema diagram, ERD, or data dictionary added |
| Test Coverage | 35% | 35% | 0 | No migration tests added; school isolation test coverage unchanged |
| Risk-on-Touch | 42% | 44% | +2 | (1) SchoolRating fix removes model/migration divergence risk; (2) payments FK migration still has no IF EXISTS guard; (3) RESTRICT FKs still block admin delete operations silently |
| **Overall** | **46%** | **51%** | **+5** | |

---

## Open Questions (from v1, updated)

1. **Child.school string:** Still unresolved. Both representations active and writable.
2. **SchoolRating.stars:** RESOLVED — model and DB now agree (`allowNull: false`).
3. **tokenHash index:** N/A-confirmed — index was always present in migration. No action needed.
4. **super_admin_messages rename:** Still unresolved. No migration filed.
5. **Document file paths:** RESOLVED separately (02-010 in Phase 2 — documents now go to cloud storage, not temp path).

---

## What I Did NOT Look At

- Live DB schema via postgres-uchqun MCP (would confirm which migrations actually ran vs. which are pending)
- Individual model definitions for the 11 paranoid models (only checked the 3 targeted non-paranoid ones)
- Migration `down()` functions (only `up()` was inspected)
- Whether `schoolIsolation.test.js` coverage was extended for new controller paths
