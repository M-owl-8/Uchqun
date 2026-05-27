# Database Loop Summary

**Dates:** 2026-05-27  
**Status:** ✅ CLOSED

---

## What the Database Loop Delivered

### S0 — Live-State Audit

Read-only inspection of the live Railway database (postgres-uchqun MCP) vs. the local migration file set.

| Finding | Detail |
|---|---|
| Migration gap | 82 applied on Railway / 85 local files → 3 deferred (PL-021) |
| Last applied | `20260526000011-add-schoolid-to-assessment-scores.js` |
| Drift — `government_messages` | Missing `recipientLevel` ENUM + `escalatedFromId` FK (CP-022) |
| Drift — `school_ratings` | Missing `indicators` JSONB; `comment` nullable (CP-020) |
| Drift — `government_school_ratings` | Table absent (CP-020) |
| All other tables | Schema-matched exactly — no unexpected gaps |
| Extensions | Only `plpgsql` — no non-standard extensions |

Deliverable: `audits/database/00-live-state-audit.md`

### PROMOTE — PL-021 Promotion (the one mutation step)

Three deferred CP-020/CP-022 migrations promoted to Railway, dependency-ordered, with witnessed BEFORE→AFTER snapshots.

| Migration | Change | Data outcome |
|---|---|---|
| `20260527000001` | Created `government_school_ratings` table (10 cols, 3 indexes) | New table, 0 rows |
| `20260527000002` | Added `school_ratings.indicators` JSONB; backfilled null comment → `'—'`; enforced NOT NULL | 2 rows survived; `04ef775b` comment NULL→`'—'` |
| `20260527000003` | Added `government_messages.recipientLevel` ENUM + `escalatedFromId` FK + 2 indexes | 0 rows (empty table) |

**BEFORE→AFTER delta = exactly the 3 migrations, nothing more.**

Post-promotion: SequelizeMeta 82 → **85**. Zero drift between local migration files and Railway. CP-020 and CP-022 features are end-to-end on Railway.

Deliverable: `audits/database/01-promote.md`

### Consolidation Axis — No Action

Two "unification" questions evaluated on inspection and closed with no action required:

**ChildGoal → ShortTermGoal:** NOT the same concept. `child_goals` (Sprint D T2-3) is a service-plan goal tracker (category ENUM, child snapshot, review cycle). `short_term_goals` is an ИРР-period-linked curriculum goal (periodId FK, skillAreaCode, 9 curriculum columns). Both tables have active controllers and routes. Both empty on Railway. **No unification — keep separate.** This item will not be re-raised as open work.

**EmotionalMonitoring:** Active table (`emotional_monitoring`, singular naming per original convention) with 1 live row. Used in `parentRoutes.js` + `teacherRoutes.js`. C-01 (CLAUDE.md) marks it as resolved inline. **No consolidation — no action.**

### UzCloud Portability Scan

Result: the platform is broadly portable to UzCloud Postgres with 5 flagged items (not blockers — pre-procurement and cutover checklist items).

| Flag | Type | Summary |
|---|---|---|
| PL-UZ-01 | ⚠️ PROCUREMENT | Postgres ≥ 13 required (`gen_random_uuid()` built-in since 13) |
| PL-UZ-02 | ⚠️ PROCUREMENT | Appwrite for file storage — self-hosted on UzCloud infra |
| PL-UZ-03 | CUTOVER | Redis for multi-instance (in-memory fallback OK single-instance) |
| PL-UZ-04 | CUTOVER (low) | AI egress — disable if UzCloud restricts outbound |
| PL-UZ-05 | CUTOVER | `DB_SSL` env flag needed in `database.js` |

PL-UZ-01 and PL-UZ-02 have procurement lead time — surfaced to partner now (Otabek).

---

## End State

| Item | Status |
|---|---|
| Railway SequelizeMeta | **85** — fully in sync with local migration files |
| Schema drift | **Zero** — all 3 deferred migrations applied |
| school_ratings (2 rows) | Intact; null-comment row backfilled to `'—'`; NOT NULL enforced |
| government_school_ratings | Created and live |
| government_messages CP-022 columns | recipientLevel + escalatedFromId present |
| ChildGoal/ShortTermGoal consolidation | No action — distinct product surfaces |
| EmotionalMonitoring consolidation | No action — 1 live row, active routes |
| UzCloud portability | 5 flags logged as PL-UZ-01→05 in checklist |
| PL-021 | ✅ Resolved |

---

## What the Database Loop Did NOT Do

- No schema changes beyond PL-021 (deliberate — the loop's scope was read-mostly + one targeted promotion)
- No ChildGoal→ShortTermGoal migration (correct — they are distinct)
- No EmotionalMonitoring restructuring (correct — active with live data)
- No UzCloud infrastructure provisioning (out of scope — logged as cutover items for partner)
