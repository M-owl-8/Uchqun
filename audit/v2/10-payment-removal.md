# Phase 10 v2 — Payment System Removal Verification
**Date:** 2026-05-09  
**Baseline:** `/audit/10-payment-removal.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 2 issues, **0 are verified-fixed** and **2 are not-fixed**. No tracker item was targeted at either Phase 10 issue. The `C-06` tracker entry ("payment routes/controller deleted — commit ca2039b") addressed the frontend/backend removal that was already clean in Phase 10 v1 — it did not address the stale migration references.

The clean removal baseline is unchanged and intact: no `Payment.js`, `paymentRoutes.js`, or `paymentController.js` at HEAD; no payment import in `server.js`; government regression test still present at `Platform.test.jsx:82,87`. The drop migration has a minor improvement (`DROP TABLE IF EXISTS ... CASCADE` vs the original `dropTable()` call) but this does not affect either tracked issue.

**Phase 10 v2 score: 68/100** (unchanged from 68/100).

---

## Scope

Verification of all 2 issues from `/audit/10-payment-removal.md`, plus re-confirmation of the clean-removal items. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 10-001 | MEDIUM | **not-fixed** | `backend/migrations/20260506000000-add-cascade-rules.js:50-52` | Three `alterFk()` calls on `payments` table unchanged; no try-catch wrapping; `alterFk` signature updated but payments entries remain |
| 10-002 | LOW | **not-fixed** | `backend/migrations/20260506000001-add-extended-soft-deletes.js:10` | `'payments'` still in tables array; catch only covers "already exists" — `throw err` re-raises "table does not exist" |

**Verdict distribution: 0 verified-fixed · 0 partially-fixed · 2 not-fixed**

---

## Detailed Findings

### 10-001 — `add-cascade-rules` Migration (not-fixed)

`backend/migrations/20260506000000-add-cascade-rules.js:50-52` (current):
```js
await alterFk(queryInterface, 'payments',             'parentId',   'users',    'id', 'RESTRICT');
await alterFk(queryInterface, 'payments',             'childId',    'children', 'id', 'SET NULL');
await alterFk(queryInterface, 'payments',             'schoolId',   'schools',  'id', 'SET NULL');
```

The three `alterFk()` calls on the `payments` table remain. The `alterFk` function signature has changed since the original audit (now takes a `referencedColumn` argument + a single delete-rule rather than delete+update rules separately), but the payments entries are present and uncovered by any try-catch.

No wrapper guards these calls. If the `payments` table is absent (partial rollback or fresh test DB without the create-payments migration), `ALTER TABLE "payments"` throws `ERROR: relation "payments" does not exist` — uncaught — and halts the entire migration sequence.

---

### 10-002 — `add-extended-soft-deletes` Migration (not-fixed)

`backend/migrations/20260506000001-add-extended-soft-deletes.js:6-17` (current):
```js
const tables = [
  'activities',
  'meals',
  'media',
  'payments',   // ← still present
  'therapies',
  'therapy_usages',
  'service_plans',
  'meal_plans',
  'teacher_ratings',
  'school_ratings',
];
```

The catch block at line 27-33:
```js
} catch (err) {
  if (err.message && err.message.includes('already exists')) {
    // Already added — skip
  } else {
    throw err;   // ← re-throws "table does not exist"
  }
}
```

The `'payments'` entry is unchanged. The catch only swallows "already exists" and re-throws everything else — including `ERROR: relation "payments" does not exist`. Stale dead weight that breaks in partial-run and fresh-DB scenarios.

---

## Clean Removal — Re-confirmed Intact

| Item | Status |
|------|--------|
| `backend/models/Payment.js` | ✅ Still absent |
| `backend/routes/paymentRoutes.js` | ✅ Still absent |
| `backend/controllers/paymentController.js` | ✅ Still absent |
| Payment import in `backend/server.js` | ✅ Still absent |
| `20260506110000-drop-payments.js` | ✅ Present; `down()` now documented: "Payments removed — no rollback. Restore from backup if needed." |
| `government/src/__tests__/Platform.test.jsx:82,87` | ✅ Regression guard unchanged: `!url.includes('payments')` assertion active |

**Drop migration improvement (not a tracked issue):** The drop migration now uses `DROP TABLE IF EXISTS payments CASCADE` (raw SQL) instead of `queryInterface.dropTable('payments')`. The `IF EXISTS` makes it idempotent; `CASCADE` drops any dependent constraints. This is a minor defensive improvement but does not affect 10-001 or 10-002.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Removal Completeness | 92% | 92% | 0 | Clean removal still intact; no new payment artifacts |
| Migration Integrity | 62% | 62% | 0 | Both stale migration entries unchanged |
| Frontend Cleanliness | 96% | 96% | 0 | No payment UI in any frontend |
| Dead Code Cleanup | 85% | 85% | 0 | Two stale migration entries still present |
| Documentation | 35% | 36% | +1 | Drop migration `down()` now has an explicit comment explaining no-rollback rationale |
| Test Coverage | 72% | 72% | 0 | Government regression guard unchanged; no migration-order tests added |
| Risk-on-Touch | 78% | 79% | +1 | `IF EXISTS` + `CASCADE` on drop migration slightly reduces edge-case failure risk |
| Rollback Safety | 20% | 20% | 0 | Intentional empty `down()` unchanged |
| **Overall** | **68%** | **68%** | **0** | |

---

## Open Questions (from v1, unchanged)

1. **10-001 fix path:** The three `alterFk` calls in `add-cascade-rules.js` should be wrapped in a try-catch that skips on "relation does not exist", or removed entirely since the table is dropped in a later migration.
2. **10-002 fix path:** Remove `'payments'` from the `tables` array in `add-extended-soft-deletes.js:10`. One-line delete.
3. **Migration documentation:** No docs on the migration ordering requirement or that the `20260506110000-drop-payments.js` migration is irreversible.

---

## What I Did NOT Look At

- `alterFk` helper function implementation (confirmed payments calls remain; function signature updated but not re-read in full)
- Whether any seed files or test factories reference `payments`
- The full `add-cascade-rules.js` content beyond the relevant payment lines
