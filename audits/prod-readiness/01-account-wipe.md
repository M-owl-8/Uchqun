# PROD-READINESS-01 — Account Wipe

**Date:** 2026-05-30  
**Status:** ✅ COMPLETE  
**Environments:** LOCAL (no data), RAILWAY (34 users wiped)  
**Commit:** `chore(prod-readiness): wipe all accounts (local + Railway) — preserved seed/reference data, BEFORE→AFTER witnessed`

---

## STEP 1 — Cascade Map

All FK constraints referencing `users` table, from actual DB schema (`information_schema`):

### CASCADE on user delete (rows deleted with user)

| Table | Column | Notes |
|---|---|---|
| children | parentId | → triggers second cascade (see below) |
| refresh_tokens | user_id | 698 tokens wiped |
| notifications | userId | 10 notifications wiped |
| school_ratings | parentId | 2 ratings wiped |
| emotional_monitoring | teacherId | 1 monitoring row wiped |
| teacher_ratings | parentId, teacherId | 2 ratings wiped |
| teacher_reflections | teacherId | 0 rows |
| teacher_resources | teacher_id | 0 rows |
| teacher_responsibilities | teacherId | 0 rows |
| teacher_tasks | teacherId | 0 rows |
| teacher_work_history | teacherId | 0 rows |
| therapy_usages | parentId | 0 rows (also childId→CASCADE from children) |
| parent_activities | parentId | 0 rows |
| parent_meals | parentId | 0 rows |
| parent_media | parentId | 0 rows |
| parent_evaluations | parent_id | 0 rows |
| documents | userId | 0 rows |
| government_messages | senderId | 0 rows |
| child_assessments | teacher_id | 0 rows |

### Second cascade: users → children → (childId)

| Table | Column | onDelete |
|---|---|---|
| activities | childId | CASCADE |
| meals | childId | CASCADE |
| meal_plans | child_id | CASCADE |
| service_plans | child_id | CASCADE |
| media | childId | CASCADE |
| progress | childId | CASCADE |
| therapy_usages | childId | CASCADE |
| emotional_monitoring | childId | CASCADE |
| daily_monitoring_entries | childId | CASCADE |
| weekly_monitoring_entries | childId | CASCADE |
| child_assessments | child_id | CASCADE |
| notifications | childId | CASCADE |
| assessment_sessions | childId | SET NULL |
| child_attendance | childId | SET NULL |
| child_goals | childId | SET NULL |
| child_observations | childId | SET NULL |
| child_journal_entries | childId | SET NULL |
| irrs | childId | SET NULL |
| long_term_goals | childId | SET NULL |
| short_term_goals | childId | SET NULL |
| goal_periods | childId | SET NULL |

### SET NULL on user delete (rows preserved, FK column nulled)

audit_log.actorId, irrs.parentId, irrs.createdBy, assessment_sessions.completedBy,  
admin_registration_requests.approvedUserId, admin_registration_requests.reviewedBy,  
child_attendance.markedBy, child_attendance.teacherId, child_goals.createdBy,  
child_goal_reviews.reviewerId, child_journal_entries.teacherId, child_observations.teacherId,  
daily_monitoring_entries.recordedBy, weekly_monitoring_entries.recordedBy,  
quarterly_monitoring_entries.recordedBy, goal_periods.teacherSignedBy, goal_periods.managerSignedBy,  
government_school_ratings.govUserId, government_stats.generatedBy,  
import_jobs.createdBy, meal_plans.created_by, news.createdById,  
service_plans.created_by, therapies.createdBy, therapy_usages.teacherId

### NO ACTION on user delete (BLOCKERS — must be handled pre-wipe)

| Table | Column | Rows | Resolution |
|---|---|---|---|
| groups | teacherId | **3** | `UPDATE groups SET "teacherId" = NULL` pre-wipe |
| ai_warnings | parentId, resolvedBy | 0 | No action needed |
| business_stats | businessId | 0 | No action needed |
| documents | reviewedBy | 0 | No action needed |

### Non-FK user references (application-level only, no DB constraint)

- `chat_messages.senderId` — no FK, orphans survived wipe, deleted separately
- `users.teacherId` (self-ref) — no DB FK constraint, application-only
- `users.createdBy` (self-ref) — no DB FK constraint, application-only

---

## STEP 2 — Preserve List

| Table | Reason | BEFORE count | AFTER count |
|---|---|---|---|
| assessment_criteria | 17 seeded reference rows | 17 | **17** ✓ |
| regions | 13-region government seed | 13 | **13** ✓ |
| districts | reference data | 0 | **0** ✓ |
| schools | organization records (not accounts) | 2 | **2** ✓ |
| groups | school-owned, teacherId nulled | 3 | **3** ✓ (all teacherId=NULL) |
| SequelizeMeta | migration history | 85 | **85** ✓ |

---

## STEP 3 — BEFORE Snapshot

### LOCAL (docker-compose Postgres)

**Docker Desktop: NOT running.** No `uchqun` database exists on native PostgreSQL (port 5432).  
Only `uchqun_irr_test` present — a Jest test artifact, no production accounts.  
**LOCAL has zero accounts to wipe.**

### RAILWAY (`hopper.proxy.rlwy.net:44423/railway`)

**Users by role:**

| Role | Count |
|---|---|
| admin | 2 |
| business | 1 |
| government | 2 |
| parent | 21 |
| reception | 2 |
| teacher | 6 |
| **TOTAL** | **34** |

**Cascade-affected tables:**

| Table | BEFORE |
|---|---|
| users | 34 |
| children | 22 |
| activities | 3 |
| meals | 7 |
| meal_plans | 72 |
| service_plans | 0 |
| media | 0 |
| emotional_monitoring | 1 |
| school_ratings | 2 |
| teacher_ratings | 2 |
| notifications | 10 |
| chat_messages | 6 |
| refresh_tokens | 698 |
| government_messages | 0 |

---

## STEP 4 — Wipe Execution

### LOCAL
**SKIPPED.** No `uchqun` database exists. Docker Desktop not running. Zero accounts to wipe.

### RAILWAY

```sql
BEGIN;

-- Pre-step: NULL out NO ACTION blocker (groups.teacherId)
UPDATE groups SET "teacherId" = NULL WHERE "teacherId" IS NOT NULL;
-- Result: UPDATE 3

-- Hard-delete all users (CASCADE + SET NULL handles all downstream rows)
DELETE FROM users;
-- Result: DELETE 34

COMMIT;
```

**Transaction output:**
```
BEGIN
UPDATE 3
DELETE 34
COMMIT
```

**Post-wipe cleanup (chat_messages — no FK, orphaned):**
```sql
DELETE FROM chat_messages;
-- Result: DELETE 6
```

No errors. Transaction committed cleanly.

---

## STEP 5 — AFTER Snapshot + Verification

### RAILWAY

**Wiped rows (must be 0):**

| Table | AFTER |
|---|---|
| users | **0** ✓ |
| children | **0** ✓ |
| activities | **0** ✓ |
| meals | **0** ✓ |
| meal_plans | **0** ✓ |
| media | **0** ✓ |
| emotional_monitoring | **0** ✓ |
| school_ratings | **0** ✓ |
| teacher_ratings | **0** ✓ |
| notifications | **0** ✓ |
| chat_messages | **0** ✓ |
| refresh_tokens | **0** ✓ |
| teacher_reflections | **0** ✓ |
| teacher_responsibilities | **0** ✓ |
| teacher_tasks | **0** ✓ |
| teacher_work_history | **0** ✓ |
| teacher_resources | **0** ✓ |
| parent_activities | **0** ✓ |
| parent_meals | **0** ✓ |
| parent_media | **0** ✓ |
| parent_evaluations | **0** ✓ |
| government_messages | **0** ✓ |
| service_plans | **0** ✓ |

**Preserved rows (must match BEFORE):**

| Table | BEFORE | AFTER |
|---|---|---|
| assessment_criteria | 17 | **17** ✓ |
| regions | 13 | **13** ✓ |
| districts | 0 | **0** ✓ |
| schools | 2 | **2** ✓ |
| groups | 3 | **3** ✓ |
| groups (teacherId=NULL) | — | **3/3** ✓ |
| SequelizeMeta | 85 | **85** ✓ |

**Sample login test:**
```
POST /api/v1/auth/login  { email: "admin@uchqun.uz", password: "Admin@2026" }
→ HTTP 401  { "success": false, "error": "Invalid email or password" }
```
✅ 401 confirmed — user no longer exists.

---

## STEP 6 — Post-Wipe Seed Decision

**Decision: NO seed script.** Testing workflow starts from genuinely-empty state.  
Accounts will be created via the real onboarding and signup flows:
1. Government account via direct DB migration (one-off, per `CLAUDE.md` credential reset procedure)
2. Admin + school setup via government portal
3. Teacher/reception accounts via admin portal
4. Parent accounts via reception portal + registration flow

This validates the full onboarding chain, which is a prod-readiness requirement.

---

## Summary

| Environment | Result |
|---|---|
| LOCAL | No wipe needed — no `uchqun` database existed |
| RAILWAY | ✅ 34 users wiped + 22 children + all cascade rows. Reference data intact. |

**PROD-READINESS-01 = ✅**
