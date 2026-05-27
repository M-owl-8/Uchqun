# Database Loop PROMOTE — PL-021 Migration Promotion

**Date:** 2026-05-27  
**Scope:** Promote 3 deferred CP-020/CP-022 migrations to Railway (PL-021). Witnessed BEFORE→AFTER.  
**Mechanism:** `git push origin main` → GitHub Action → `railway up --service Uchqun --detach` → `npm run start:migrate`.

---

## STEP 1 — BEFORE Snapshot (pre-promotion, witnessed via MCP)

| Indicator | Value |
|---|---|
| `SequelizeMeta` count | **82** |
| Last applied migration | `20260526000011-add-schoolid-to-assessment-scores.js` |
| `government_school_ratings` table | **ABSENT** |
| `school_ratings` row count | 2 |
| `school_ratings.indicators` column | ABSENT |
| `school_ratings.comment` nullability | nullable (`is_nullable=YES`) |
| `government_messages` row count | 0 |
| `government_messages.recipientLevel` | ABSENT |
| `government_messages.escalatedFromId` | ABSENT |

**`school_ratings` BEFORE rows (2 total):**

| id | comment | stars |
|---|---|---|
| `04ef775b-1985-40ab-98f2-429b29e475ef` | **NULL** ← backfill target | 4 |
| `414737a4-a538-48eb-a707-173ffb7fb217` | `AUDIT_2026-05-18 test rating` | 4 |

Note: Row `04ef775b` has `comment=NULL` — this is the row the migration 2 backfill targets with `'—'` before enforcing NOT NULL.

---

## STEP 2 — Promotion (dependency-ordered)

Triggered via `git push origin main` (SHA `832b36f`). Railway auto-deploy ran `npm run start:migrate` in order:

**Migration 1:** `20260527000001-create-government-school-rating.js`
- Created `government_school_ratings` table (10 columns: id/schoolId/govUserId/period/stars/indicators/comment/createdAt/updatedAt/deletedAt)
- Added 3 indexes: `idx_gov_school_ratings_school`, `idx_gov_school_ratings_gov_user`, `idx_gov_school_ratings_unique_active` (partial unique on schoolId+govUserId+period WHERE deletedAt IS NULL)
- Result: new table, 0 rows

**Migration 2 (DATA TOUCH):** `20260527000002-update-school-ratings-cp020.js`
- `ADD COLUMN school_ratings.indicators JSONB allowNull: true`
- `UPDATE school_ratings SET comment = '—' WHERE comment IS NULL AND deletedAt IS NULL`
  → Row `04ef775b` comment: NULL → `'—'` ✅
- `CHANGE school_ratings.comment → NOT NULL`
- 2 rows survived; null-comment row backfilled; NOT NULL enforced

**Migration 3:** `20260527000003-add-routing-to-government-messages.js`
- ENUM `enum_government_messages_recipientLevel`('owner','region','republic') created (idempotent DO/EXCEPTION guard)
- `ADD COLUMN government_messages.recipientLevel` ENUM NOT NULL DEFAULT 'republic'
- `ADD COLUMN government_messages.escalatedFromId` UUID nullable self-ref FK (SET NULL on delete)
- Added 2 indexes: `government_messages_recipient_level_idx`, `government_messages_escalated_from_idx`
- 0 rows affected (table was empty)

No migration failures. All 3 applied successfully and logged in SequelizeMeta.

---

## STEP 3 — AFTER Snapshot (post-promotion, witnessed via MCP)

| Indicator | BEFORE | AFTER | ✅ |
|---|---|---|---|
| `SequelizeMeta` count | 82 | **85** | ✅ +3 |
| `government_school_ratings` table | ABSENT | **EXISTS** (10 cols, 3 indexes) | ✅ |
| `school_ratings.indicators` column | ABSENT | **PRESENT** (JSONB, nullable) | ✅ |
| `school_ratings.comment` nullability | nullable | **NOT NULL** | ✅ |
| `school_ratings` row count | 2 | **2** (none lost) | ✅ |
| `government_messages.recipientLevel` | ABSENT | **PRESENT** (ENUM, NOT NULL, default='republic') | ✅ |
| `government_messages.escalatedFromId` | ABSENT | **PRESENT** (UUID, nullable, FK self-ref) | ✅ |

**SequelizeMeta new entries (3):**
```
20260527000001-create-government-school-rating.js
20260527000002-update-school-ratings-cp020.js
20260527000003-add-routing-to-government-messages.js
```

**`school_ratings` AFTER rows (2 total — same 2, zero lost):**

| id | comment | stars | indicators |
|---|---|---|---|
| `04ef775b-1985-40ab-98f2-429b29e475ef` | **`—`** (backfilled from NULL) | 4 | NULL (pre-CP-020 row) |
| `414737a4-a538-48eb-a707-173ffb7fb217` | `AUDIT_2026-05-18 test rating` | 4 | NULL (pre-CP-020 row) |

Backfill confirmed: null-comment row now `'—'`, NOT NULL enforced, 0 rows lost.

**`government_messages` AFTER columns (full):**
`id, senderId, subject, message, isRead, readAt, reply, repliedAt, createdAt, updatedAt, parentMessageId, recipientLevel (NOT NULL DEFAULT 'republic'), escalatedFromId (nullable FK)`

**`government_school_ratings` columns (full):**
`id, schoolId (NOT NULL FK→schools), govUserId (nullable FK→users), period (varchar NOT NULL), stars (int NOT NULL), indicators (jsonb NOT NULL), comment (text NOT NULL), createdAt, updatedAt, deletedAt`

**Indexes confirmed:**
- `idx_gov_school_ratings_school` ON `government_school_ratings(schoolId)` ✅
- `idx_gov_school_ratings_gov_user` ON `government_school_ratings(govUserId)` ✅
- `idx_gov_school_ratings_unique_active` UNIQUE ON `government_school_ratings(schoolId, govUserId, period) WHERE deletedAt IS NULL` ✅
- `government_messages_recipient_level_idx` ON `government_messages(recipientLevel)` ✅
- `government_messages_escalated_from_idx` ON `government_messages(escalatedFromId)` ✅

**BEFORE→AFTER delta = exactly the 3 migrations' intended changes, nothing more.**

---

## STEP 4 — Feature Unblock Confirmation

**CP-020 (5-indicator school rating):**
- `school_ratings.indicators` JSONB column now present on Railway
- `POST /api/v1/parent/school-rating` accepts `{ schoolId, indicators, comment }` — `indicators` field will be stored (not ignored)
- `government_school_ratings` table live — government rating endpoint path unblocked
- CP-020 frontend (TeacherRating.jsx school section) POST path is now end-to-end on Railway

**CP-022 (parent message routing + escalation):**
- `government_messages.recipientLevel` ENUM present with default `'republic'`
- `government_messages.escalatedFromId` FK present
- Both indexes in place
- `POST /api/v1/parent/messages` and `GET /api/v1/admin/owner-messages` both rely on `recipientLevel` column — now live on Railway
- MessageModal 3-level selector, MessagesModal level badges, ChildProfile escalation loop all unblocked

**Schema now fully in sync with codebase.** Zero remaining drift between local migration files and Railway SequelizeMeta.

---

## Correction to S0 Audit

S0 audit (`audits/database/00-live-state-audit.md`) stated "83/86 migrations" — this was a counting error. Correct figures: **82 applied / 85 total local files / 3 deferred**. The 3 deferred files and all conclusions were correct; only the absolute counts were wrong. LOOP_TRACKER.md corrected in the PROMOTE tracker note.
