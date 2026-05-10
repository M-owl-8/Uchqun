# Phase 03 — Database Audit

**Generated:** 2026-05-07  
**Auditor:** Claude Code (claude-sonnet-4-6)  
**Audit mode:** READ ONLY — no project files were modified.

---

## Executive Summary

The database layer is PostgreSQL 15 with Sequelize 6 ORM, 35 active models, and 38 migrations. The overall schema design is sound: all primary keys are UUIDs, foreign keys with cascade rules are present (added retroactively by migrations), and soft deletes (paranoid mode) are applied to all high-value user-generated content models. JSONB is used thoughtfully for structured but schema-flexible data (emotionalState, months, evaluation, data).

However, several structural problems compound each other: the `Child` model carries three denormalized string columns (`school`, `teacher`, `class`) alongside the proper FK-based references, creating two competing sources of truth. Four newer models (ChildAssessment, ServicePlan, MealPlan, ParentEvaluation) use `underscored: true` with snake_case DB columns while all older models use camelCase — causing a casing split detectable at the raw-SQL layer. The `users.avatar` TEXT column holds multi-megabyte base64 data URIs and is loaded on every authenticated request. A critical migration ordering issue exists where cascade rules are applied to the `payments` table immediately before it is dropped. And a now-stale `notificationPreferences.push` flag persists on all user records even though the push_notifications infrastructure was removed.

---

## Scope

**Inspected:** All 35 model files (`backend/models/*.js`), `models/index.js` (associations + scopes), all 38 migration files.  
**Not inspected:** Live database row counts or index usage (requires direct DB access). Migration execution logs.

---

## 3.1 — Table Inventory

### Active tables (35 models, post-drop)

| Model | Table | Paranoid | Underscored | Notes |
|---|---|---|---|---|
| User | `users` | ✅ | ❌ (camelCase) | Polymorphic by role; avatar TEXT |
| Child | `children` | ✅ | ❌ | Denormalized `school`/`teacher`/`class` strings alongside FKs |
| School | `schools` | ❌ | ❌ | ENUM type: school/kindergarten/both |
| Group | `groups` | ❌ | ❌ | teacherId + schoolId FKs |
| Activity | `activities` | ✅ | ❌ | Denormalized `teacher` STRING; JSONB tasks/services |
| Meal | `meals` | ✅ | ❌ | mealType ENUM TitleCase: Breakfast/Lunch/Snack/Dinner |
| Media | `media` | ✅ | ❌ | Appwrite file URL in `url`; activityId FK optional |
| Progress | `progress` | ❌ | ❌ | One-per-child (childId UNIQUE); academic/social/behavioral JSONB |
| Notification | `notifications` | ❌ | ❌ | Hard delete; no soft delete |
| ChatMessage | `chat_messages` | ❌ | ❌ | senderRole ENUM: parent/teacher only |
| Document | `documents` | ❌ | ❌ | filePath = ephemeral temp path; hard delete |
| TeacherRating | `teacher_ratings` | ✅ | ❌ | UNIQUE(teacherId, parentId) |
| SchoolRating | `school_ratings` | ✅ | ❌ | Three rating formats: stars/numericRating/evaluation |
| SuperAdminMessage | `super_admin_messages` | ❌ | ❌ | Legacy table name for government messages |
| AdminRegistrationRequest | `admin_registration_requests` | ❌ | ❌ | UNIQUE(email) — prevents re-application |
| EmotionalMonitoring | `emotional_monitoring` | ❌ | ❌ | UNIQUE(childId, date); emotionalState JSONB |
| Therapy | `therapies` | ✅ | ❌ | tags ARRAY(STRING); multiple ENUMs |
| TherapyUsage | `therapy_usages` | ✅ | ❌ | 4 FKs (therapy, child, parent, teacher) |
| AIWarning | `ai_warnings` | ❌ | ❌ | targetId UUID without FK; notifiedUsers ARRAY(UUID) |
| GovernmentStats | `government_stats` | ❌ | ❌ | data JSONB snapshot |
| BusinessStats | `business_stats` | ❌ | ❌ | data JSONB snapshot |
| RefreshToken | `refresh_tokens` | ❌ | explicit `field` | snake_case via field mapping; not underscored:true |
| ChildAssessment | `child_assessments` | ❌ | ✅ (snake_case) | UNIQUE(child_id, category, date) |
| ServicePlan | `service_plans` | ✅ | ✅ (snake_case) | months JSONB; UNIQUE(child_id, year, service_type) |
| MealPlan | `meal_plans` | ✅ | ✅ (snake_case) | mealType ENUM lowercase; UNIQUE(child_id, date, meal_type) |
| ParentEvaluation | `parent_evaluations` | ❌ | ✅ (snake_case) | answers JSONB |
| News | `news` | ❌ | ❌ | createdById FK with RESTRICT (cascades block delete) |
| TeacherResource | `teacher_resources` | ❌ | ❌ | teacherId + schoolId FKs |
| ParentActivity | `parent_activities` | ❌ | ❌ | parentId FK only |
| ParentMeal | `parent_meals` | ❌ | ❌ | parentId FK only |
| ParentMedia | `parent_media` | ❌ | ❌ | parentId FK only |
| TeacherResponsibility | `teacher_responsibilities` | ❌ | ❌ | teacherId FK only |
| TeacherTask | `teacher_tasks` | ❌ | ❌ | teacherId FK only |
| TeacherWorkHistory | `teacher_work_history` | ❌ | ❌ | teacherId FK only |
| BusinessStats | `business_stats` | ❌ | ❌ | businessId FK to users |

### Dropped tables (by migration, no longer active)

| Table | Dropped by | Reason |
|---|---|---|
| `payments` | `20260506110000-drop-payments.js` | Payment system removed |
| `push_notifications` | `20260506100000-drop-push-notifications.js` | Mobile/Expo push removed |

---

## 3.2 — Column-Level Schema Issues

### Child model: dual school/teacher representation (03-001 — High)

`Child` (`backend/models/Child.js`) has **two competing representations** of the same relationships:

| Column | Type | Purpose |
|---|---|---|
| `school` | STRING(500) | **Free-text** school name — written when creating a child |
| `schoolId` | UUID FK → schools | **Relational** school reference — added by migration 20260401000010 |
| `teacher` | STRING(255) | **Free-text** teacher name |
| (no teacherId on Child) | — | Teacher assigned via Child→Group→User path only |
| `class` | STRING(255) | **Free-text** class name |
| `groupId` | UUID FK → groups | **Relational** group reference |

The `school` and `schoolId` fields are simultaneously present and potentially inconsistent. Any query relying on `school` (the string) for filtering would miss the school isolation enforced by `schoolId`. Any new child created with only a `school` text value (not a `schoolId` FK) is invisible to all school-scoped queries. The `receptionController` creates children; if it doesn't populate `schoolId`, the child won't appear in school-filtered list endpoints.

The `child.school` column also contains a hardcoded fallback: `receptionController.js:272,826` uses `'Uchqun School'` as a default when no school name is provided.

### Activity model: denormalized teacher name (03-002 — Medium)

`Activity` (`backend/models/Activity.js`) has:
- `teacher` — STRING(255), the plain-text name of the teacher who performed the activity
- No `teacherId` FK

This means activities cannot be reliably filtered by teacher via a JOIN. The `teacher` field is a write-once snapshot. If the teacher changes their name, all past activities still show the old name.

### Meal mealType vs MealPlan mealType casing (03-003 — Medium)

| Model | ENUM values | Casing |
|---|---|---|
| `Meal.mealType` | 'Breakfast', 'Lunch', 'Snack', 'Dinner' | **TitleCase** |
| `MealPlan.mealType` | 'breakfast', 'lunch', 'snack', 'dinner' | **lowercase** |

Two different PostgreSQL ENUM types exist for the same semantic domain with different casing. Any application code joining or comparing meal types across these tables will get mismatches without explicit `LOWER()` calls.

### SchoolRating model: three rating formats; stars model vs DB mismatch (03-004 — Medium)

`SchoolRating` has three simultaneous rating columns:
- `stars` — INTEGER 1–5 (legacy)
- `numericRating` — INTEGER 1–10 (intermediate)
- `evaluation` — JSONB with 10 boolean criteria (current)

Migration `20260203000000` made `stars` NOT NULL (with a default of 3 for existing NULLs). But the current `SchoolRating.js` model definition has `stars: { allowNull: true }`. The migration and model are out of sync. If Sequelize ever syncs the schema (e.g., `FORCE_SYNC=true` in dev), it would make `stars` nullable again.

### users.avatar: TEXT blob in main table (03-005 — High)

Migration `20260423000000` changed `users.avatar` from VARCHAR(255) to TEXT specifically to accommodate base64 data URIs. This is deliberately baking multi-megabyte BLOBs into the primary lookup table. Every `User.findByPk()` (called on every authenticated request) fetches this column. No lazy-loading exists in Sequelize by default.

### notificationPreferences.push is a stale field (03-006 — Low)

`users.notificationPreferences` JSONB has default `{ email: true, push: true }`. The `push` key is the preference for push notifications. The `push_notifications` table was dropped (migration 20260506100000). The `push` preference on all user records now points to non-existent functionality. It will not cause errors, but it will mislead any UI that reads this preference.

---

## 3.3 — Relationships & Foreign Keys

All FK → cascade relationships, per `models/index.js` associations and `20260506000000-add-cascade-rules.js`:

### Critical association paths

```
User (1) ──< Child (n)                         CASCADE DELETE
User (1) ──< RefreshToken (n)                  CASCADE DELETE
Child (1) ──< Activity (n)                     CASCADE DELETE
Child (1) ──< Meal (n)                         CASCADE DELETE
Child (1) ──< Media (n)                        CASCADE DELETE
Child (1) ── Progress (1)                      CASCADE DELETE  [unique FK]
Child (1) ──< TherapyUsage (n)                 CASCADE DELETE
Child (1) ──< ChildAssessment (n)              CASCADE DELETE
Child (1) ──< ServicePlan (n)                  CASCADE DELETE
Child (1) ──< MealPlan (n)                     CASCADE DELETE
Child (1) ──< EmotionalMonitoring (n)          CASCADE DELETE
User (1) ──< Document (n)                      CASCADE DELETE
User (1) ──< Notification (n)                  CASCADE DELETE
User (1) ──< TeacherRating (n) [teacherId]     CASCADE DELETE
User (1) ──< TeacherRating (n) [parentId]      CASCADE DELETE
School (1) ──< SchoolRating (n)                CASCADE DELETE
User (1) ──< SchoolRating (n) [parentId]       CASCADE DELETE
User → SuperAdminMessage [senderId]             SET NULL
User → Therapy [createdBy]                     SET NULL
TherapyUsage → User [parentId]                 RESTRICT (cannot delete parent with active therapy)
News → User [createdById]                      RESTRICT (cannot delete news creator)
```

**Issue (03-007):** `TherapyUsage.parentId` uses `onDelete: 'RESTRICT'`. A parent user with existing therapy usage records **cannot be deleted** without first removing all therapy usage records. This creates a hidden constraint: `DELETE /api/admin/receptions/:id` (which deletes reception users) and any future parent deletion route would fail silently or with a 500 if therapy usages exist.

**Issue (03-008):** `News.createdById` uses `onDelete: 'RESTRICT'`. An admin who created news items cannot be deleted until their news items are deleted or reassigned. No such pre-delete check or cascade exists in the controller.

**Issue (03-009):** `AIWarning.targetId` is a UUID column with no FK constraint — `targetType` can be 'school', 'parent', 'teacher', or 'child', and `targetId` stores the relevant entity's UUID. This is a polymorphic association without a real FK. If the target entity is deleted, the `targetId` UUID becomes a dangling reference with no DB-level enforcement.

---

## 3.4 — Index Coverage

### Indexes confirmed present (from model definitions + 20260506130000)

| Table | Indexed columns |
|---|---|
| `users` | email (unique), teacherId, groupId, schoolId, createdBy |
| `children` | schoolId, groupId |
| `groups` | teacherId, name |
| `schools` | name, type, isActive |
| `activities` | childId, (childId+date) |
| `meals` | (childId+date) |
| `media` | (childId+date), type, activityId |
| `therapies` | therapyType, ageGroup, difficultyLevel, isActive, createdBy |
| `therapy_usages` | therapyId, childId, parentId, teacherId, startTime |
| `ai_warnings` | warningType, severity, (targetType+targetId), schoolId, parentId, isResolved, createdAt |
| `super_admin_messages` | senderId, isRead, createdAt |
| `admin_registration_requests` | email, status, reviewedBy, createdAt |
| `notifications` | (userId+isRead), createdAt |
| `school_ratings` | schoolId, UNIQUE(schoolId+parentId) |
| `teacher_ratings` | teacherId, UNIQUE(teacherId+parentId) |
| `child_assessments` | child_id, teacher_id, UNIQUE(child_id+category+date) |
| `service_plans` | child_id, UNIQUE(child_id+year+service_type) |
| `meal_plans` | child_id, (child_id+date+meal_type) UNIQUE, date |
| `government_stats` | region, district, schoolId, statType, period, (periodStart+periodEnd) |
| `business_stats` | businessId, statType, period, (periodStart+periodEnd), isPublic |
| `chat_messages` | conversationId, senderId, (conversationId+createdAt) |
| `teacher_responsibilities` | teacherId |
| `teacher_tasks` | teacherId |
| `teacher_work_history` | teacherId |
| `documents` | userId, reviewedBy |
| `parent_activities` | parentId |
| `parent_meals` | parentId |
| `parent_media` | parentId |

### Missing indexes (03-010 — Medium)

| Table | Column | Why it matters |
|---|---|---|
| `users` | role | Frequent filter: `User.findAll({ where: { role: 'teacher' } })` |
| `users` | isActive | Frequent filter in getTeachers, getParents |
| `emotional_monitoring` | childId | FK with unique constraint but no explicit index in migration |
| `emotional_monitoring` | teacherId | FK, queried in getAllMonitoring |
| `ai_warnings` | resolvedBy | FK, queried when resolving warnings |
| `refresh_tokens` | (tokenHash) | **Critical** — primary lookup path for refresh; model has no explicit index on tokenHash |
| `chat_messages` | senderId | Already in model index definition; may not be in 20260506130000 migration |
| `notifications` | childId | FK, queried in notifications for child-specific events |

### RefreshToken missing index on tokenHash (03-011 — High)

`RefreshToken` model at `backend/models/RefreshToken.js` defines no `indexes` array. The only lookup in production is by `tokenHash` (via `RefreshToken.findOne({ where: { tokenHash, revoked, expiresAt } })`). Without an index on `tokenHash`, this is a full table scan on what will become a high-volume table (one or more records per user per session, only revoked records cleaned up by logout).

---

## 3.5 — Migration Order & Chronology

### Timeline

| Date | Migration | Action |
|---|---|---|
| 2024-01-01 | initial-schema | Create users/children/activities/meals/media/progress |
| 2024-01-02 | update-role-based-schema | Add Teacher-/Parent-specific fields |
| 2024-01-03 | create-refresh-tokens | refresh_tokens table |
| 2025-01-15 | add-telegram-username | telegram_username to admin_registration_requests |
| 2026-01-08 | create-teacher-ratings | teacher_ratings table |
| 2026-01-10 | create-chat-messages | chat_messages table |
| 2026-01-11 | add-individual-plan-fields | Expand child profile |
| 2026-01-12 | create-super-admin-messages | super_admin_messages table |
| 2026-01-13 | create-admin-registration-requests | admin_registration_requests table |
| 2026-01-14 | update-admin-registration-requests | Add fields to registration requests |
| 2026-01-15 | create-emotional-monitoring | emotional_monitoring table |
| 2026-01-16 | create-therapies | therapies + therapy_usages tables |
| 2026-01-17 | add-government-business-roles | ENUM: add government/business/reception |
| 2026-01-17 | create-schools | schools table |
| 2026-01-18 | create-payments | payments table (subsequently dropped) |
| 2026-02-01 | add-rating-fields-to-users | Add rating/totalRatings to users |
| 2026-02-02 | add-numeric-rating-to-school-ratings | Add numericRating column |
| 2026-02-03 | make-stars-required-in-school-ratings | Make stars NOT NULL (contradicts model) |
| 2026-02-04 | create-school-ratings | Create school_ratings table if not exists |
| 2026-02-05 | add-evaluation-to-school-ratings | Add evaluation JSONB column |
| 2026-03-30 | add-missing-fk-indexes | **Silently failed** (snake_case column names) |
| 2026-03-30 | add-soft-deletes | Add deletedAt to users and children |
| 2026-04-01 | expand-child-profile | Add parent info fields, emergencyContact |
| 2026-04-01 | create-child-assessments | child_assessments table |
| 2026-04-01 | create-service-plans | service_plans table |
| 2026-04-01 | create-meal-plans | meal_plans table |
| 2026-04-01 | add-school-id-to-users-groups | Add schoolId FK to users and groups |
| 2026-04-01 | add-school-id-to-registration-requests | Add schoolId to admin registration |
| 2026-04-02 | create-teacher-resources | teacher_resources table |
| 2026-04-22 | create-parent-evaluations | parent_evaluations table |
| 2026-04-23 | avatar-text-column | Change users.avatar VARCHAR→TEXT for base64 |
| 2026-05-06 | add-cascade-rules | Apply ON DELETE CASCADE to all FKs (inc. payments) |
| 2026-05-06 | add-extended-soft-deletes | Add deletedAt to activities/meals/media/therapies/etc + payments |
| 2026-05-06 | drop-push-notifications | DROP TABLE push_notifications |
| 2026-05-06 | drop-payments | DROP TABLE payments |
| 2026-05-06 | promote-super-admin-to-government | UPDATE users SET role='government' WHERE email=SUPER_ADMIN_EMAIL |
| 2026-05-06 | add-camel-case-fk-indexes | **Corrective** — adds FK indexes that 20260330000000 failed to add |

### Critical migration ordering issue (03-012 — High)

Migration `20260506000000-add-cascade-rules.js` applies CASCADE rules to columns on the `payments` table (lines 50–52):
```js
await alterFk(queryInterface, 'payments', 'parentId', 'users', 'id', 'RESTRICT');
await alterFk(queryInterface, 'payments', 'childId', 'children', 'id', 'SET NULL');
await alterFk(queryInterface, 'payments', 'schoolId', 'schools', 'id', 'SET NULL');
```

Migration `20260506000001-add-extended-soft-deletes.js` adds `deletedAt` to `payments`.

Migration `20260506110000-drop-payments.js` then drops the `payments` table.

This sequence is correct for upgrading an existing DB (payments still exists during the cascade run). However, on a **fresh DB setup** running all migrations from scratch, if `20260118000000-create-payments.js` was run but payments has no data, the alterFk calls in `20260506000000` will find the table but find no rows and no constraints to update — still correct.

More critically: on a fresh DB where `20260506110000` has run before any payments FK constraints were set, `alterFk()` queries `information_schema.table_constraints` and finds zero rows (no existing FK to drop), then tries to `ADD CONSTRAINT fk_payments_parentId` — but `payments` doesn't exist. This will throw an error, aborting the whole migration batch.

**The `20260506000000` migration will fail on a fresh DB install if payments was already dropped by a prior migration run.**

### Silently-failed FK index migration (03-013 — Medium)

Migration `20260330000000-add-missing-fk-indexes.js` used snake_case column names (`school_id`, `group_id`, etc.) in `addIndex()` calls. The Sequelize `addIndex` silently swallowed "column does not exist" errors (the try/catch checks `includes('already exists') || includes('does not exist')`). Result: zero indexes were actually created. This was discovered and corrected by migration `20260506130000-add-camel-case-fk-indexes.js`, which uses the correct camelCase names. But there is no verification that the corrective migration succeeded — it uses the same try/catch pattern.

---

## 3.6 — Paranoid Mode (Soft Deletes)

**11 models have `paranoid: true`:**
User, Child, Activity, Meal, Media, Therapy, TherapyUsage, TeacherRating, SchoolRating, ServicePlan, MealPlan

**24 models do NOT have `paranoid: true`** (hard delete):
School, Group, Progress, Notification, ChatMessage, Document, SuperAdminMessage, AdminRegistrationRequest, EmotionalMonitoring, AIWarning, GovernmentStats, BusinessStats, RefreshToken, ChildAssessment, ParentEvaluation, News, TeacherResource, ParentActivity, ParentMeal, ParentMedia, TeacherResponsibility, TeacherTask, TeacherWorkHistory, BusinessStats

**Issue (03-014 — Medium):** The non-paranoid policy is inconsistent. `Notification`, `ChatMessage`, `Document`, `EmotionalMonitoring`, and `ChildAssessment` are all user-visible, operationally sensitive records that are hard-deleted. Deleting a `Document` permanently removes the verification evidence. Deleting a `ChatMessage` permanently removes the conversation. Deleting `ChildAssessment` records removes diagnostic history. None of these have soft-delete protection.

---

## 3.7 — JSONB Column Usage

JSONB is used in 10 models:

| Table | Column | Content |
|---|---|---|
| `users` | notificationPreferences | `{ email: bool, push: bool }` — `push` is stale |
| `children` | emergencyContact | Emergency contact details (schema-free) |
| `activities` | tasks | Array of task objects |
| `activities` | services | Array of service objects |
| `emotional_monitoring` | emotionalState | 9 boolean criteria (fixed keys) |
| `school_ratings` | evaluation | 10 boolean criteria (fixed keys) |
| `service_plans` | months | 12 boolean fields (jan–dec) |
| `parent_evaluations` | answers | Questionnaire answers (schema-free) |
| `government_stats` | data, summary | Snapshot stats (schema-free) |
| `business_stats` | data, summary | Snapshot stats (schema-free) |

`emotionalState`, `evaluation`, and `months` all have fixed schemas stored as JSONB — they would benefit from proper columns or at minimum a CHECK constraint, but the JSONB approach is acceptable for this scale.

`emergencyContact` and `answers` are truly schema-free and appropriate for JSONB.

`data`/`summary` in stats models are append-only snapshots; JSONB is appropriate.

---

## 3.8 — Naming Inconsistencies

### Column naming: camelCase vs snake_case (03-015 — Medium)

| Model group | DB column casing | Example |
|---|---|---|
| Most models (30) | camelCase | `childId`, `schoolId`, `createdAt` |
| ChildAssessment, ServicePlan, MealPlan, ParentEvaluation | snake_case | `child_id`, `service_type`, `submitted_at` |
| RefreshToken | explicit field mapping | `tokenHash` → `token_hash`, `userId` → `user_id` |

This split makes raw SQL inspection inconsistent. Developers querying via `psql` will see some tables with `childId` columns and others with `child_id`. Joins across the boundary require careful aliasing.

### `super_admin_messages` table name (03-016 — Low)

Table name `super_admin_messages` reflects the pre-rename era. The model is `SuperAdminMessage`. The table should be `government_messages` or `platform_messages`. A rename migration is required (recreate or rename with `ALTER TABLE`), which is low-risk but requires coordination with any direct SQL queries.

### `enum_users_role` ENUM type name (info)

The PostgreSQL ENUM is named `enum_users_role`. This is Sequelize's auto-generated name pattern and cannot easily be changed without dropping and recreating.

---

## 3.9 — Data Integrity Issues

### Progress: no role guard on PUT (03-017 — Medium)

`progress` has `childId` as a UNIQUE key (one record per child). The `PUT /api/progress/` endpoint has no role guard — any authenticated user can update progress. There is no check that the requesting user is the child's assigned teacher or admin.

### School-scoped queries inconsistently enforced (03-018 — High)

The `schoolScope.js` middleware exports `schoolWhere(req)` and `requireSchoolScope` but they are NOT globally applied. Controllers must manually call `schoolWhere()` or filter by `req.schoolId`. Several controllers (activityController, mealController, mediaController) have manual school-scope filtering; others do not. The `Child.school` string field (denormalized) makes it possible to query children by the wrong field, bypassing the FK-based isolation.

There is no automated test asserting that users from School A cannot access School B's data — the `schoolIsolation.test.js` exists but only tests specific controller paths.

### AIWarning.targetId: no FK constraint (03-009 re-cited)

`ai_warnings.targetId` stores UUIDs of entities from `schools`, `users`, or `children` depending on `targetType`, but with no FK constraint. A deleted school/parent/teacher/child will leave dangling targetId values in ai_warnings with no DB-level detection.

---

## 3.10 — Seed Data

No seed files found in `backend/` for non-script seeding (no `seeders/` directory). Seeding is done via scripts:

- `backend/scripts/seed.js` — creates initial data
- `backend/scripts/create-admin.js`, `create-government.js`, `create-teacher.js`, `create-reception.js`, `create-demo-accounts.js` — role-specific account creation

All scripts hardcode `@uchqun.com` email domains (not `@uchqunedu.uz`). The `create-government.js` uses `government@uchqun.com`; the migration `20260506120000` looks for `superadmin@uchqun.uz`. These are different emails — running the seed scripts then the migration would not promote the seeded government user.

---

## 3.11 — Special Observations

### Progress is a single-row-per-child JSONB store

`progress.childId` has `unique: true`. There is one `Progress` record per child, containing three JSONB blobs (`academic`, `social`, `behavioral`). This is a flat object store, not a time-series. Historical progress data is overwritten, not accumulated. There is no timestamp on individual progress updates within the JSONB.

### Therapy model has denormalized usageCount and ratingCount

`Therapy.usageCount` and `Therapy.ratingCount` are INTEGER counters maintained in application code, not computed from `therapy_usages` counts. If a therapy_usage record is deleted without updating the counter (e.g., via CASCADE delete), the counter becomes inaccurate.

### Parent-to-teacher FK via User.teacherId

`users.teacherId` stores a self-referencing FK — a parent user has their assigned teacher's userId stored. This means the `users` table is used as a many-to-many junction between parents and teachers via a single FK column, which supports only one teacher per parent. Reassigning a parent to a different teacher just updates this column.

---

## 3.12 — Issue Catalog

| ID | Severity | Location | Description |
|---|---|---|---|
| 03-001 | High | `models/Child.js` | `child.school` (STRING), `child.teacher` (STRING), `child.class` (STRING) coexist with FK-based `schoolId`/`groupId` — dual source of truth |
| 03-002 | Medium | `models/Meal.js`, `models/MealPlan.js` | `mealType` ENUM uses TitleCase in Meal ('Breakfast') but lowercase in MealPlan ('breakfast') — ENUM type mismatch same semantic domain |
| 03-003 | Medium | `models/SchoolRating.js` | Migration made `stars` NOT NULL; model says `allowNull: true` — schema and model diverged |
| 03-004 | Low | `models/SuperAdminMessage.js` | Table name `super_admin_messages` is legacy; should be `government_messages` |
| 03-005 | High | `models/User.js` | `avatar` TEXT column holds up to ~2MB base64 data URI; loaded on every `User.findByPk()` call |
| 03-006 | Low | `models/User.js` | `notificationPreferences.push` is a stale key — push_notifications table was dropped |
| 03-007 | Medium | `models/TherapyUsage.js:29` | `parentId` FK uses RESTRICT — cannot delete parent with therapy usage records; no pre-delete check in controllers |
| 03-008 | Medium | `models/News.js:22` | `createdById` FK uses RESTRICT — cannot delete admin who created news; no pre-delete handling |
| 03-009 | Medium | `models/AIWarning.js` | `targetId` has no FK constraint — polymorphic reference without enforcement |
| 03-010 | Medium | various | Missing indexes on `users.role`, `users.isActive`, `emotional_monitoring.childId/teacherId`, `ai_warnings.resolvedBy`, `notifications.childId` |
| 03-011 | High | `models/RefreshToken.js` | No index on `tokenHash` — primary lookup path is a full table scan as sessions scale |
| 03-012 | High | `migrations/20260506000000` | Applies FK constraints to `payments` table; will fail on fresh DB where payments was never created or was already dropped |
| 03-013 | Medium | `migrations/20260330000000` | FK index migration silently failed (snake_case column names); corrected by 20260506130000 but no verification |
| 03-014 | Medium | `notifications`, `documents`, `chat_messages`, `child_assessments`, `emotional_monitoring` | Hard delete on sensitive operational data — no soft delete protection |
| 03-015 | Medium | `ChildAssessment`, `ServicePlan`, `MealPlan`, `ParentEvaluation` | snake_case DB columns vs camelCase in all other models — raw-SQL queries and joins need different column names |
| 03-016 | Low | `super_admin_messages` | Legacy table name remains; should be renamed to government_messages |
| 03-017 | Medium | `routes/progressRoutes.js` | `PUT /api/progress/` has no role guard or ownership check — any authenticated user can update progress |
| 03-018 | High | Multiple controllers | School-scope filtering is manually applied per controller; no DB-level enforcement and no consistent middleware application |

---

## Scorecard

| Metric | Score | Observations |
|---|---|---|
| Messiness | 48% | Dual school/teacher fields on Child; mealType casing split; table name legacy |
| Technical Debt | 45% | Avatar TEXT column; stale push pref; denormalized teacher strings; missing tokenHash index |
| Health | 60% | FK cascade rules applied; UUID PKs throughout; JSONB used well; migrations tracked |
| Coherence | 52% | 4 newer models use underscored:true; remaining 31 use camelCase; no documented policy |
| Documentation Coverage | 40% | Some model comments exist; no schema diagram; no ERD; no data dictionary |
| Test Coverage | 35% | No migration tests; no schema validation tests; school isolation test only covers some paths |
| Risk-on-Touch | 42% | Fresh DB install fails on payments FK migration; tokenHash unindexed; RESTRICT FKs block deletes |
| **Overall** | **46%** | |

---

## Open Questions

1. **Child.school string vs Child.schoolId FK:** Is the `school` STRING field still being written by any client, or is it dead write-only legacy? Can it be dropped after confirming all queries use `schoolId`?

2. **SchoolRating.stars NOT NULL vs model allowNull: true:** Should the model be corrected to match the DB (allowNull: false), or should the migration be reversed to allow NULL (since evaluation now replaces stars)?

3. **tokenHash index:** Should migration `20260506130000` be extended to add an index on `refresh_tokens.tokenHash`, or should a new migration be filed?

4. **super_admin_messages rename:** Is there appetite to rename the table to `government_messages` now, accepting the migration complexity (ALTER TABLE IF EXISTS / RENAME), or defer to Phase 6 role merge work?

5. **Documents on ephemeral disk (from 02-010):** Should document files be migrated to Appwrite storage? The `documents.filePath` column currently points to temp paths — what should it point to if files are moved?
