# Phase 10 — Payment System Removal Audit
## Scope: Was the payment system cleanly removed? What artifacts remain?

> Audit only — no modifications to project files.
> All file references include path + line range.

---

## Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Removal Completeness | 92/100 | Model, routes, controllers, server imports all gone |
| Migration Integrity | 62/100 | Drop migration is correct; two older migrations still reference dropped table |
| Frontend Cleanliness | 96/100 | No payment UI anywhere; `clearPayments` is a rating criterion, not an artifact |
| Dead Code Cleanup | 85/100 | Two stale migration references are the only remaining artifacts |
| Documentation | 35/100 | No docs on why payments were removed, which migration order matters, or that rollback is impossible |
| Test Coverage | 72/100 | Government regression guard is correct; no migration-order tests |
| Risk-on-Touch | 78/100 | Production path is safe; partial-run or test-environment paths can throw |
| Rollback Safety | 20/100 | `down()` is intentionally empty — payment removal is a one-way operation with no documented rationale |
| **Overall** | **68/100** | Cleanest removal audit so far; risks are narrow and migration-ordering-specific |

---

## 1. What Was Removed — Clean

| Artifact | Expected | Status |
|----------|----------|--------|
| `backend/models/Payment.js` | Should not exist | ✅ Absent |
| `backend/routes/paymentRoutes.js` | Should not exist | ✅ Absent |
| `backend/controllers/paymentController.js` | Should not exist | ✅ Absent |
| Payment import in `backend/server.js` | Should not exist | ✅ Absent |
| Payment table | Dropped by migration | ✅ Dropped by `20260506110000-drop-payments.js` |
| Payment-related PostgreSQL ENUMs | Dropped by migration | ✅ All 4 ENUMs dropped |
| Frontend payment UI pages | Should not exist | ✅ None found in any of 5 frontends |
| Payment endpoints in government regression test | Should be blocked | ✅ Blocked — `Platform.test.jsx:82–87` |

The payment system removal is functionally complete. No code path in the backend or any frontend references payment processing, payment records, or transaction state.

---

## 2. Drop Migration — Correct

[`backend/migrations/20260506110000-drop-payments.js`](backend/migrations/20260506110000-drop-payments.js):

```js
async up(queryInterface) {
  await queryInterface.dropTable('payments');
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_payments_paymentMethod"`);
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_payments_paymentType"`);
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_payments_status"`);
  await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "enum_payments_currency"`);
},
async down() {
  // intentional no-op: payment system not being restored
}
```

This migration:
- Drops the table before the ENUMs (correct ordering — the ENUM can't be dropped while a column references it if the column still exists)
- Drops all 4 payment-specific PostgreSQL ENUM types
- Explicitly documents that rollback is intentionally omitted

The timestamp `20260506110000` places it **after** the original create (`20260118000000`), after the cascade-rules migration (`20260506000000`), and after the extended-soft-deletes migration (`20260506000001`). In a full sequential migration run, the table exists when both older migrations run and is then dropped. Correct.

---

## 3. Verified Correct: `clearPayments` Is Not a Payment Artifact

Grep for `clearPayments` returns hits in [`backend/utils/governmentLevel.js`](backend/utils/governmentLevel.js) and the parent portal locale files. These are **not payment artifacts**.

`governmentLevel.js` defines 10 school evaluation criteria for the government rating system. `clearPayments` is criterion #9: "payments are clear and not hidden" — a rating dimension assessing financial transparency at the school level. It has no relationship to the removed `payments` table, `Payment` model, or transaction processing.

Similarly, `teacher/src/parent/locales/{uz,ru,en}/common.json` contains a `clearPayments` key as the label for this rating criterion. These locale entries are correct and intentional.

---

## 4. Verified Correct: Government Frontend Regression Guard

[`government/src/__tests__/Platform.test.jsx:82–87`](government/src/__tests__/Platform.test.jsx#L82):

```js
it('does not call any payment or super-admin endpoints', () => {
  const calls = mockApi.get.mock.calls.map(([url]) => url);
  expect(calls.every(url => !url.includes('payments'))).toBe(true);
  expect(calls.every(url => !url.includes('super-admin'))).toBe(true);
});
```

This regression guard explicitly verifies that the government frontend makes no calls to any `/payments` endpoint. It is correctly placed and will catch any future re-introduction of payment API calls in the government app.

---

## 5. Issues Found

### Issue 10-001 — MEDIUM: `add-cascade-rules` Migration Still Calls `alterFk()` on Dropped `payments` Table

[`backend/migrations/20260506000000-add-cascade-rules.js:50–52`](backend/migrations/20260506000000-add-cascade-rules.js#L50):

```js
await alterFk(queryInterface, 'payments', 'parentId', 'users', 'CASCADE', 'SET NULL');
await alterFk(queryInterface, 'payments', 'childId', 'children', 'CASCADE', 'SET NULL');
await alterFk(queryInterface, 'payments', 'schoolId', 'schools', 'CASCADE', 'SET NULL');
```

The `alterFk` function queries `information_schema` for existing FK constraints, then issues:

```sql
ALTER TABLE "payments" ADD CONSTRAINT ... FOREIGN KEY (...) ...
  ON DELETE CASCADE ON UPDATE CASCADE;
```

**In normal sequential production runs this is harmless** — the migration timestamps ensure the payments table exists when this migration runs (`20260506000000` < `20260506110000`). The `ALTER TABLE` succeeds and the table is later dropped.

**The risk surfaces in two scenarios:**

1. **Partial migration state** — if a developer rolls back to `20260118000000-create-payments.js` (the create) but NOT to `20260506000000-add-cascade-rules.js`, then reruns from that point, the cascade-rules migration fires on a table that was re-created without the FK constraints. Still safe because the table exists.

2. **Fresh test environment without ordered setup** — if the migration runner skips the create-payments migration (e.g., test seeds from a schema dump that never included payments) and runs cascade-rules, the `ALTER TABLE "payments"` will throw `ERROR: relation "payments" does not exist`. The cascade-rules migration has no try-catch wrapper around these three `alterFk` calls — the entire migration fails and halts the sequence.

There is no try-catch here, unlike Issue 10-002 below.

---

### Issue 10-002 — LOW: `add-extended-soft-deletes` Still Lists `payments` in Tables Array

[`backend/migrations/20260506000001-add-extended-soft-deletes.js:10`](backend/migrations/20260506000001-add-extended-soft-deletes.js#L10):

```js
const tables = [
  'users', 'children', 'groups', 'schools',
  'payments',  // ← still present
  'activities', ...
];
```

The migration iterates over `tables` and adds `deletedAt`, `deletedBy`, `deleteReason` columns to each. Each individual `addColumn` call is wrapped in a try-catch that catches `"already exists"`:

```js
for (const table of tables) {
  await addColumnSafe(queryInterface, table, 'deletedAt', ...);
  ...
}
```

The `addColumnSafe` helper catches only the "already exists" error, not "table does not exist". If the `payments` table is absent (as in a fresh DB where only the later migrations ran, or after a rollback of the create-payments migration), `addColumn` will throw `ERROR: relation "payments" does not exist` — uncaught — and halt the migration.

**In production sequential runs, this is safe**: `20260506000001` runs before `20260506110000` (the drop), so payments exists. But the entry is dead weight that will confuse developers inspecting the migration.

---

## 6. Issue Summary

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| `add-cascade-rules` still calls `alterFk()` on `payments` | MEDIUM | migrations/20260506000000-add-cascade-rules.js:50–52 | Three `ALTER TABLE "payments"` calls with no try-catch; fails in test/partial environments where table is absent |
| `add-extended-soft-deletes` still lists `payments` in tables array | LOW | migrations/20260506000001-add-extended-soft-deletes.js:10 | Stale entry; `addColumnSafe` catches "already exists" but NOT "table does not exist"; fails in same partial-run scenarios |

**Total: 0 HIGH · 1 MEDIUM · 1 LOW = 2 issues**

---

## 7. What's Actually Good

- **Complete model/route/controller removal**: The payment processing stack is entirely gone — no residual imports, no dead routes, no unreachable code paths.
- **ENUM cleanup**: The drop migration removes all 4 payment-related PostgreSQL ENUM types, not just the table. This avoids orphaned type definitions in the DB schema.
- **Intentional no-rollback**: The `down()` stub documents a deliberate product decision. This is better than having a broken `down()` that partially restores a table with missing dependencies.
- **Government test regression guard**: The explicit `!url.includes('payments')` assertion in `Platform.test.jsx` will catch any accidental re-introduction of payment API calls.
- **`clearPayments` is correctly named**: What looks like a payment artifact is actually a transparency-audit criterion in the school rating system. The naming is appropriate for its domain.
- **Migration timestamp ordering**: The three payment-related migrations are correctly ordered: create (`20260118000000`) → alter (`20260506000000`, `20260506000001`) → drop (`20260506110000`). No inversion in the sequence.
