# Database Loop S0 — Live State Audit

**Date:** 2026-05-27  
**Scope:** Read-only Railway schema audit — drift check, deferred-promotion inventory, model-consolidation scope, UzCloud portability scan.  
**DB access:** postgres-uchqun MCP (SELECT-only, Railway Postgres 15).

---

## STEP 1 — Drift Check (Live Schema vs. Migration History)

### SequelizeMeta summary

83 migrations applied on Railway. Last applied: `20260526000011-add-schoolid-to-assessment-scores.js`

### Local migration files: 86 total

3 local files NOT in SequelizeMeta (all three are the deliberately deferred PL-021 migrations):

| File | Purpose |
|---|---|
| `20260527000001-create-government-school-rating.js` | Creates `government_school_ratings` table (CP-020) |
| `20260527000002-update-school-ratings-cp020.js` | Adds `indicators` JSONB + tightens `comment` NOT NULL in `school_ratings` (CP-020) |
| `20260527000003-add-routing-to-government-messages.js` | Adds `recipientLevel` ENUM + `escalatedFromId` FK to `government_messages` (CP-022) |

No other gaps. All 83 SequelizeMeta entries match local migration files exactly.

### Live schema drift

**`government_messages`** — MISSING 2 columns and 2 indexes (CP-022 migration not yet applied):
- `recipientLevel` ENUM('owner','region','republic') NOT NULL DEFAULT 'republic'
- `escalatedFromId` UUID nullable self-ref FK → SET NULL on delete
- Indexes: `government_messages_recipient_level_idx`, `government_messages_escalated_from_idx`
- **Impact:** The CP-022 frontend (MessageModal 3-level selector, MessagesModal level badges, ChildProfile escalation loop) sends `recipientLevel` in POST body and reads `recipientLevel`/`escalatedFromId` from GET responses. Both will fail on Railway until migration runs.

**`school_ratings`** — MISSING 1 column + NOT NULL not yet enforced (CP-020 migration not yet applied):
- `indicators` JSONB (allowNull: true — legacy rows pre-date indicator structure)
- `comment` currently nullable (the NOT NULL change + '—' backfill not yet applied; 2 live rows exist, 1 has a null comment)
- **Impact:** CP-020 frontend (TeacherRating.jsx school section) POSTs `{schoolId, indicators, comment}` — `indicators` field ignored (column absent) until migration runs.

**`government_school_ratings`** — table does NOT exist yet (created by `20260527000001`):
- **Impact:** Any government-facing school rating submission endpoint will return a DB error until migration runs.

**All other tables confirmed present and schema-matched.** Key IRR tables verified:
- `irrs`: all 14 columns present including `status` ENUM, `additionalInfo`, paranoid `deletedAt` ✅
- `goal_periods`: all columns including `teacherSignedAt`, `managerSignedAt`, `managerSignedBy` ✅
- `short_term_goals`: all 9 curriculum columns + `skillAreaCode`, `periodId` FK ✅
- `assessment_criteria`: 17 rows seeded ✅
- `child_goals`: present (see STEP 3)

---

## STEP 2 — Deferred-Promotion Inventory (PL-021)

Three migrations pending Railway promotion. Must run in this exact order (FK dependency chain):

| Order | Migration | Change | Data risk |
|---|---|---|---|
| 1 | `20260527000001-create-government-school-rating.js` | New table `government_school_ratings` + 3 indexes (school, gov_user, partial unique active) | None — new table |
| 2 | `20260527000002-update-school-ratings-cp020.js` | ADD `indicators` JSONB; UPDATE NULLs; CHANGE `comment` NOT NULL | 2 live rows, 1 null comment → backfill '—'. Reviewed and safe. |
| 3 | `20260527000003-add-routing-to-government-messages.js` | ADD `recipientLevel` ENUM (idempotent DO/EXCEPT block); ADD `escalatedFromId` FK; 2 indexes | 0 rows in `government_messages`. Safe. |

**Risk assessment:** All three are safe to run immediately. `20260527000002` has a deliberate '—' backfill guard for the NOT NULL change. `20260527000003` uses an idempotent `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object` guard for ENUM creation.

**Live data counts at audit time:**
- `government_messages`: 0 rows
- `school_ratings`: 2 rows (both safe for backfill)
- `government_school_ratings`: does not exist yet

---

## STEP 3 — Parked Model-Consolidation Scope

### ChildGoal → ShortTermGoal ("unification question")

**Finding: NOT the same concept. No unification warranted.**

| Dimension | ChildGoal (`child_goals`) | ShortTermGoal (`short_term_goals`) |
|---|---|---|
| Purpose | Service-plan goals (Sprint D T2-3) | ИРР-period-linked curriculum goals |
| FK anchor | `childId` (direct) | `periodId` → `goal_periods` → `irrs` |
| Category | ENUM (communication/motor/cognitive/etc.) | `skillAreaCode` free text |
| Review model | Separate `child_goal_reviews` table | Inline progress/observations text columns |
| Controller | `goalController.js` + `adminGoalController.js` | `irrController.js` |
| Live rows | 0 | 0 |
| Paranoid | Yes (deletedAt) | No |

Both tables are empty on Railway, but both have active controllers and routes. They serve distinct product surfaces. **Decision: keep separate. Database Loop has no consolidation work here.**

### EmotionalMonitoring

**Finding: Active, 1 live row. No consolidation needed.**

- Table: `emotional_monitoring` (singular — pre-Sequelize-convention naming, not a drift issue)
- Columns: `id, childId, teacherId, date, emotionalState (JSONB), notes, teacherSignature, createdAt, updatedAt, deletedAt`
- Row count: **1 live row** — cannot drop or restructure without data migration
- Routes: `parentRoutes.js` + `teacherRoutes.js` (active, C-01 resolved — consumed inline)
- **Decision: no action in Database Loop. If surface is retired later, data migration required.**

---

## STEP 4 — UzCloud Portability Scan

### Postgres extensions

```
plpgsql  1.0   (only extension — standard, always present)
```

No non-standard extensions (`pgvector`, `postgis`, `pg_trgm`, `uuid-ossp`, `pgcrypto`). ✅

### gen_random_uuid() dependency

All UUID primary key defaults use `gen_random_uuid()` (Postgres built-in since v13, no extension required). Railway runs Postgres 15. UzCloud must provision **Postgres ≥ 13**. If procured on Postgres 12 or below, all 83 migrations fail at the first UUID default.

**Flag PL-UZ-01:** Confirm UzCloud managed Postgres version ≥ 13 in procurement spec.

### Environment variable coupling

| Env var(s) | Platform coupling | UzCloud status |
|---|---|---|
| `DATABASE_URL` / `DATABASE_PUBLIC_URL` | Railway convention | env.js falls back to individual `DB_*` vars — portable ✅ |
| `REDIS_URL` | Optional | Falls back to in-memory (single-instance only) ✅ |
| `APPWRITE_ENDPOINT` + 3 APPWRITE vars | External service | Points to any Appwrite instance — self-hosted on UzCloud infra is viable ✅ |
| `FRONTEND_URL` | Comma-separated list | Easy to update for UzCloud domains ✅ |
| `OPENAI_BASE_URL` | OpenRouter/OpenAI | Optional — if UzCloud restricts outbound internet, AI features disabled gracefully ✅ |
| `SENTRY_DSN` | Optional | Omittable ✅ |

No Railway-specific SDK calls, no Railway environment detection in application code.

### File storage (media uploads)

Storage driver: **Appwrite** (`backend/config/storage.js`) with local disk fallback (dev/non-production only).

- Production with no Appwrite config → throws immediately (no silent local fallback in prod)
- UzCloud deploy requires either:
  - Self-hosted Appwrite instance (recommended — data stays in country)
  - An S3-compatible proxy rewritten in storage.js (future work if Appwrite not approved)
- Files served via proxy URL pattern: `APPWRITE_ENDPOINT/storage/buckets/{id}/files/{fileId}/view?project={projectId}`

**Flag PL-UZ-02:** Appwrite must be configured for UzCloud deploy. Self-hosted Appwrite is the path of least resistance (open-source, Docker-compatible, keeps media within UzCloud infrastructure boundary).

### Other portability flags

**PL-UZ-03:** Redis recommended for multi-instance (login lockout, JTI revocation, Socket.io). Single-instance works with in-memory fallback. Documented in CLAUDE.md.

**PL-UZ-04:** OpenAI/OpenRouter outbound access — if UzCloud restricts egress, government AI-analysis features (`POST /ai-warnings/analyze`) become unavailable. The route is optional — disable via OPENAI_API_KEY absent. Low severity.

**PL-UZ-05:** SSL handling — `backend/config/database.js` has Railway-specific SSL detection logic. UzCloud managed Postgres may need explicit `ssl: { rejectUnauthorized: false }` or a CA cert. Review `database.js` before UzCloud deploy and add an env flag (`DB_SSL=true`) for explicit control.

---

## Summary Table

| Area | Status | Action required |
|---|---|---|
| SequelizeMeta vs. local files | 3 deferred (PL-021) | Promote `20260527000001→002→003` to Railway (next step) |
| `government_messages` drift | Missing 2 columns | Fixed by PL-021 promotion |
| `school_ratings` drift | Missing `indicators` + comment nullable | Fixed by PL-021 promotion |
| `government_school_ratings` | Table absent | Created by PL-021 promotion |
| ChildGoal consolidation | Not warranted | Keep separate (distinct product surfaces) |
| EmotionalMonitoring | Active, 1 live row | No action |
| Postgres extensions | Only plpgsql | ✅ Portable |
| gen_random_uuid() | Postgres 13+ required | PL-UZ-01: confirm UzCloud version |
| File storage | Appwrite-dependent | PL-UZ-02: self-hosted Appwrite on UzCloud |
| Redis | Optional, in-memory fallback | PL-UZ-03: provision for multi-instance |
| AI outbound | Optional feature | PL-UZ-04: disable if egress restricted |
| DB SSL | Railway-auto-detected | PL-UZ-05: add DB_SSL env flag before UzCloud deploy |
