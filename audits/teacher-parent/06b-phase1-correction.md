# S5 PHASE 1 CORRECTION — schoolId denormalization + isolation mechanism + local DB proof

**Date:** 2026-05-26  
**Amends:** `06-phase1-irr-models.md`

---

## 1. Audit Doc Error (06-phase1-irr-models.md table was wrong)

The Phase 1 audit table marked GoalPeriod and ShortTermGoal as "—" for schoolId, sourced from the context summary rather than the actual files. Reading the code:

| Model | schoolId in model? | schoolId in migration? | Verdict |
|---|---|---|---|
| AssessmentScore | ✗ (missing) | ✗ (missing) | **NEEDS CORRECTION** |
| GoalPeriod | ✅ `GoalPeriod.js:24–29` | ✅ `000006:22–27` | already correct |
| ShortTermGoal | ✅ `ShortTermGoal.js:30–35` | ✅ `000007:27–32` | already correct |
| WeeklyMonitoringEntry | ✅ `WeeklyMonitoringEntry.js:19–24` | ✅ `000009:16–21` | already correct |

**Only AssessmentScore was genuinely missing schoolId.** The corrected isolation table for all 10 ИРР models:

| Model | schoolId | childId | Notes |
|---|---|---|---|
| IRR | ✅ RESTRICT | ✅ SET NULL | |
| AssessmentCriteria | — | — | Seed/lookup table — no tenancy |
| AssessmentSession | ✅ RESTRICT | ✅ SET NULL | |
| **AssessmentScore** | ✅ RESTRICT (added) | — | Scoped by row, not just via sessionId join |
| LongTermGoal | ✅ RESTRICT | ✅ SET NULL | |
| GoalPeriod | ✅ RESTRICT | ✅ SET NULL | Was correct; audit doc table was wrong |
| ShortTermGoal | ✅ RESTRICT | ✅ SET NULL | Was correct; audit doc table was wrong |
| DailyMonitoringEntry | ✅ RESTRICT | ✅ CASCADE | |
| WeeklyMonitoringEntry | ✅ RESTRICT | ✅ CASCADE | Was correct; audit doc table was wrong |
| QuarterlyMonitoringEntry | ✅ RESTRICT | none | Facility-level only |

---

## 2. Fix: schoolId Added to AssessmentScore

**Model** (`backend/models/AssessmentScore.js`): `schoolId` field added after `criterionId`:
```js
schoolId: {
  type: DataTypes.UUID,
  allowNull: false,
  references: { model: 'schools', key: 'id' },
  onDelete: 'RESTRICT',
},
```

**Migration** (`backend/migrations/20260526000011-add-schoolid-to-assessment-scores.js`):
```js
// ADD COLUMN IF NOT EXISTS — idempotent; safe for both local (empty table) and Railway.
// Railway promotion note: assessment_scores will be empty when Phase 2 ships (no
// controller has written rows yet), so NOT NULL is safe at promotion time.
export const up = async (queryInterface, Sequelize) => {
  await queryInterface.sequelize.query(
    `ALTER TABLE assessment_scores ADD COLUMN IF NOT EXISTS "schoolId" UUID NOT NULL REFERENCES schools(id) ON DELETE RESTRICT`
  );
  await queryInterface.addIndex('assessment_scores', ['schoolId'], {
    name: 'idx_assessment_scores_school_id',
  });
};
export const down = async (queryInterface) => {
  await queryInterface.removeIndex('assessment_scores', 'idx_assessment_scores_school_id');
  await queryInterface.sequelize.query(
    `ALTER TABLE assessment_scores DROP COLUMN IF EXISTS "schoolId"`
  );
};
```

**Rationale:** A Phase-2 endpoint that reads a score row by `findByPk(id)` would need to join assessment_sessions → irrs to verify the schoolId — an easy miss that becomes a cross-tenant IDOR. With schoolId on the row, the controller can enforce `WHERE "schoolId" = req.user.schoolId` directly on the table, and a behavioral test can assert the boundary without a multi-table join.

---

## 3. Isolation Mechanism (not the audit hook)

**This codebase enforces tenancy at the controller level, not the model level.**

From `CLAUDE.md`:
> Any endpoint that reads, writes, or deletes a child-scoped resource (Activity, Meal, Media, TherapyUsage) MUST call `validateChildAccess(childId, req)` (or `findChildScopedResource(Model, id, req)` from `utils/schoolValidation.js`) for authorization AFTER the initial PK lookup.

There is no schoolId-injecting `beforeCreate` hook on any ИРР model. The `afterDestroy` hooks registered in `models/index.js` are **audit hooks only** — they write to `audit_log`, they do not enforce tenancy.

**The enforcement contract for Phase 2:**  
Every ИРР mutation endpoint MUST:
1. Look up the resource by PK
2. Verify `resource.schoolId === req.user.schoolId` (or call `validateChildAccess`/`isTeacherAssignedToChild` from `utils/schoolValidation.js`)
3. Return 404 (not 403) on mismatch — the same pattern established by V1/wider-class remediation

The schoolId column on each row is what makes step 2 enforceable on the row itself without a join, and what makes the behavioral test (two-school seed → cross-school 404) expressible directly.

---

## 4. Local DB Migration Results

**DB:** `uchqun_irr_test` on local PostgreSQL 18 (`localhost:5432`)  
**Runner:** focused script running only migrations `20260526000001–000011`  
**Prerequisite tables created:** `schools`, `children`, `users` (minimal stubs; IRR FKs all reference these three)

```
Connected to local DB
Prerequisite tables: schools, children, users — OK

Found 11 IRR migrations
  20260526000001-create-assessment-criteria.js ... OK
  20260526000002-create-irr.js ... OK
  20260526000003-create-assessment-session.js ... OK
  20260526000004-create-assessment-score.js ... OK
  20260526000005-create-long-term-goal.js ... OK
  20260526000006-create-goal-period.js ... OK
  20260526000007-create-short-term-goal.js ... OK
  20260526000008-create-daily-monitoring-entry.js ... OK
  20260526000009-create-weekly-monitoring-entry.js ... OK
  20260526000010-create-quarterly-monitoring-entry.js ... OK
  20260526000011-add-schoolid-to-assessment-scores.js ... OK

Up result: 11 ran, 0 failed

Tables created: 10/10
   assessment_criteria, assessment_scores, assessment_sessions,
   daily_monitoring_entries, goal_periods, irrs, long_term_goals,
   quarterly_monitoring_entries, short_term_goals, weekly_monitoring_entries

assessment_scores.schoolId present: YES ✓

── Rollback test for 000011 ──
  down (remove schoolId) ... OK
  schoolId removed: YES ✓
  up (re-add schoolId) ... OK
  schoolId restored: YES ✓

SequelizeMeta entries: 11 (expected 11)

✓ IRR migration proof complete
```

**Note on full migration set + local Postgres:** The pre-existing migrations (pre-20260526) have locale-dependent error message checks inside their catch blocks (`error.message.includes('already exists')`) that break on Russian-locale Postgres. This is a pre-existing issue unrelated to the ИРР work — Railway is Linux with English locale. The IRR migrations themselves have no locale-dependent checks and run clean.

---

## 5. Seeder — Local Verification

```
Database connected.
Seeder complete:
  Created: 0
  Updated: 17
  Total in DB: 17 (expected: 17)
  Max score: 68

✅ Assessment criteria seed verified: 17 criteria, max score = 68.
```

---

## 6. Railway Promotion Plan (deferred)

**Current state:** Railway has assessment_scores without schoolId (migration 000004 applied, 000011 not yet).

**Promotion plan (run once Phases 1–2 are proven locally):**
1. Railway auto-applies migration 000011 on next `main` push (via `npm run start:migrate` in Railway Dockerfile)
2. `assessment_scores` will be empty at promotion time — no Phase 2 controller has written rows; NOT NULL is safe without a backfill
3. After 000011 runs, all 11 IRR tables on Railway will match local schema

**Do NOT push migration 000011 to Railway until Phase 2 controllers pass their behavioral tests locally.**

---

## 7. Test Suite

**120/120 suites, 1269/1269 tests — all green** after AssessmentScore model change.

---

## 8. Verdict

**S5 PHASE 1 CORRECTION = ✅ COMPLETE**

- Audit doc table error: documented + corrected
- AssessmentScore schoolId: model + corrective migration both in place
- GoalPeriod / ShortTermGoal / WeeklyMonitoringEntry: confirmed already correct
- Isolation mechanism: controller-level (`validateChildAccess` / `findChildScopedResource`) — NOT model hooks; afterDestroy hooks are audit-only
- Local DB: 11/11 migrations up + rollback clean; seeder 17/17 criteria
- Railway: 000011 ready, promotion deferred until Phase 2 proven locally
- 120/120 tests green
