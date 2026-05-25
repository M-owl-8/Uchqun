# S5 PHASE 1 — ИРР Backend Models, Seed Config, Migrations

**Date:** 2026-05-26  
**Scope:** Data layer only — 10 models, 5 seed config files, 10 migrations, 1 idempotent seeder. No controllers, no endpoints, no scoring logic, no frontend.

---

## 1. Seed Config Files (shared/config/)

| File | Contents | Notes |
|---|---|---|
| `assessmentCriteria.js` | 17 criteria, full Uz Cyrillic text, levelDescriptions, scoringType, isHearingSpecific | PL-009 warning at top — unverified AI translations |
| `skillAreas.js` | 5 skill areas: SELF_CARE_FEEDING, SELF_CARE_HYGIENE, COMMUNICATION, SOCIAL_EMOTIONAL, PHYSICAL | |
| `dailyJournalItems.js` | 27 items in 3 sections: hygiene(9), health(11), gi(7) | |
| `weeklyJournalItems.js` | 18 items: emotional(9), environment(9) | |
| `quarterlyJournalItems.js` | ~52 items: infoSystem(2), parentWork(14), documentation(9), careQuality(17), conditions(10) | OQ-10 pending on parentWork |

**Key design decisions encoded in assessmentCriteria.js:**
- Scoring inversion: `softwareScore = 4 − printedScore`. levelDescriptions stored in SOFTWARE direction (key "4"=best, key "0"=worst).
- `scoringType`: criteria 1–13 = `'ability'`, 14–15 = `'frequency'`, 16–17 = `'participation'`
- Only criterion 9 (`SIGN_COMMUNICATION`) has `isHearingSpecific: true` — **metadata only, not an exclusion** (OQ-1: max always = 68)
- `CRITERIA_COUNT = 17`, `MAX_SCORE = 68`

---

## 2. Models (backend/models/)

All 10 models are ES Module files. All registered in `models/index.js` with associations and `afterDestroy` audit hooks.

### Isolation columns (two-axis tenancy)

| Model | schoolId | childId | Notes |
|---|---|---|---|
| IRR | ✅ RESTRICT | ✅ SET NULL | Axis 1 + Axis 2 via teacher assignment |
| AssessmentSession | ✅ RESTRICT | ✅ SET NULL | |
| AssessmentScore | — | — | scoped transitively via sessionId → IRR |
| LongTermGoal | ✅ RESTRICT | ✅ SET NULL | |
| GoalPeriod | — | — | scoped via irrId |
| ShortTermGoal | — | — | scoped via irrId + periodId |
| DailyMonitoringEntry | ✅ RESTRICT | ✅ CASCADE | Per-child journal |
| WeeklyMonitoringEntry | — | ✅ CASCADE | Per-child journal |
| QuarterlyMonitoringEntry | ✅ RESTRICT | **none** | Facility-level only (OQ-3/OQ-6) |
| AssessmentCriteria | — | — | Seed/lookup table — no tenancy |

### Paranoid models

Only `IRR` uses `paranoid: true`. All others `paranoid: false` (journal entries and scores are append-only facts, not soft-deletable).

### IRR.js — key fields
- `status: ENUM('draft', 'active', 'archived')` — partial unique index: `(childId, status) WHERE deletedAt IS NULL`
- `parentId, createdBy` → SET NULL on delete
- All 9 mandatory header fields from СТАНДАРТ: `irrDate`, `irrNumber`, `childFullName`, `childDateOfBirth`, `diagnosisCode`, `diagnoses`, `physicalStampAgency`, `schoolName`, `schoolYear`

### AssessmentScore.js — DB constraint
- `score INTEGER` with Sequelize `validate: { min: 0, max: 4 }` AND migration-level `CHECK (score >= 0 AND score <= 4)`

### ShortTermGoal.js — skill area
- `skillAreaCode: STRING(50)` — data-driven string, not ENUM (changing skill areas requires only seed update, no migration)

### QuarterlyMonitoringEntry.js — no childId (OQ-3/OQ-6)
- Facility-level aggregate. No `childId` column. `departures: JSONB` stores array of departed children for the quarter.

---

## 3. Tenancy-Hook Registrations (models/index.js)

All 10 models registered with `afterDestroy` hooks. Quoted from `models/index.js`:

```js
// === ИРР model afterDestroy audit hooks ===
IRR.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'irrs', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: instance.schoolId, detail: options?.reason ?? 'destroyed' });
});
AssessmentCriteria.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'assessment_criteria', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: null, detail: options?.reason ?? 'destroyed' });
});
AssessmentSession.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'assessment_sessions', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: instance.schoolId, detail: options?.reason ?? 'destroyed' });
});
AssessmentScore.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'assessment_scores', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: null, detail: options?.reason ?? 'destroyed' });
});
LongTermGoal.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'long_term_goals', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: instance.schoolId, detail: options?.reason ?? 'destroyed' });
});
GoalPeriod.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'goal_periods', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: null, detail: options?.reason ?? 'destroyed' });
});
ShortTermGoal.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'short_term_goals', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: null, detail: options?.reason ?? 'destroyed' });
});
DailyMonitoringEntry.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'daily_monitoring_entries', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: instance.schoolId, detail: options?.reason ?? 'destroyed' });
});
WeeklyMonitoringEntry.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'weekly_monitoring_entries', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: null, detail: options?.reason ?? 'destroyed' });
});
QuarterlyMonitoringEntry.afterDestroy(async (instance, options) => {
  await logAudit({ entity: 'quarterly_monitoring_entries', entityId: instance.id, action: 'delete',
    actorId: options?.actorId ?? null, actorRole: options?.actorRole ?? null,
    schoolId: instance.schoolId, detail: options?.reason ?? 'destroyed' });
});
```

---

## 4. Migrations

| # | File | Table | Key constraints |
|---|---|---|---|
| 1 | 20260526000001-create-assessment-criteria.js | assessment_criteria | unique(code), idx(sortOrder), idx(isActive) |
| 2 | 20260526000002-create-irr.js | irrs | deletedAt (paranoid), partial unique(childId, status) WHERE deletedAt IS NULL |
| 3 | 20260526000003-create-assessment-session.js | assessment_sessions | partial unique(irrId, sessionType) WHERE sessionType != 'custom' |
| 4 | 20260526000004-create-assessment-score.js | assessment_scores | CHECK(score >= 0 AND score <= 4), unique(sessionId, criterionId) |
| 5 | 20260526000005-create-long-term-goal.js | long_term_goals | |
| 6 | 20260526000006-create-goal-period.js | goal_periods | |
| 7 | 20260526000007-create-short-term-goal.js | short_term_goals | |
| 8 | 20260526000008-create-daily-monitoring-entry.js | daily_monitoring_entries | unique(childId, entryDate) |
| 9 | 20260526000009-create-weekly-monitoring-entry.js | weekly_monitoring_entries | unique(childId, weekStart) |
| 10 | 20260526000010-create-quarterly-monitoring-entry.js | quarterly_monitoring_entries | unique(schoolId, quarterStart) |

**Dependency order rationale:**
- assessment_criteria first (no FK dependencies)
- irrs second (references children, schools, users, parents — all pre-existing)
- assessment_sessions third (references irrs)
- assessment_scores fourth (references assessment_sessions, assessment_criteria)
- long_term_goals fifth (references irrs)
- goal_periods sixth (references irrs)
- short_term_goals seventh (references goal_periods, irrs)
- daily/weekly/quarterly monitoring last (reference children, irrs, schools — all exist)

---

## 5. Seeder Result

**Script:** `backend/scripts/seedAssessmentCriteria.js`  
**Command:** `npm run seed:criteria` (against Railway DB)

```
Database connected.

Seeder complete:
  Created: 0
  Updated: 17
  Total in DB: 17 (expected: 17)
  Max score: 68

✅ Assessment criteria seed verified: 17 criteria, max score = 68.
```

Seeder is idempotent: uses `AssessmentCriteria.upsert(criterion, { conflictFields: ['code'] })`. Re-runnable when criteria change (update `shared/config/assessmentCriteria.js` and re-run seeder — no migration needed).

---

## 6. Test Suite

**All 120 suites / 1269 tests passing** after models/index.js additions. No regressions.

---

## 7. PL-009 Flag

`shared/config/assessmentCriteria.js` contains `textRu` and `textEn` fields with AI-generated translations. These are **unverified** and marked with `// PL-009: AI-generated — unverified` at the top of the file. Professional Uzbek/Russian review required before beta launch.

---

## 8. Open Questions Carried Forward to Phase 2

- **OQ-10:** parentWork section of quarterly journal — pending product decision on 14 items
- **OQ-2:** Physical stamp agency field — pending regional agency sign-off
- **OQ-4/OQ-5/OQ-7/OQ-8/OQ-9/OQ-11/OQ-12:** Documented in `IRR-SPECIFICATION.md`, resolved in Phase 1 design. Phase 2 controllers will enforce.

---

## 9. Verdict

**S5 PHASE 1 = ✅ COMPLETE**

- 5 seed config files: ✅
- 10 models with isolation columns: ✅
- 10 `afterDestroy` hooks registered (no dead hooks): ✅
- 10 migrations applied to Railway DB: ✅
- Seeder: 17 criteria verified in Railway: ✅
- 120/120 test suites green: ✅
