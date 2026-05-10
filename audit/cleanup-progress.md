# Uchqun Platform — Total Cleanup Progress Log

---

## Phase 0 — Setup (completed 2026-05-10)

**Goal:** Baseline infrastructure before any issue fixes.

**Delivered:**
- `/audit/cleanup-backlog.md` created (136 rows)
- `/audit/v2/11-cross-cutting.md` — Phase 11 v2 re-audit (score 56→68)
- `/audit/v2/12-synthesis.md` — Platform 47→52/100; 23/136 pre-closed
- Tagged `pre-total-cleanup-baseline`
- `.husky/commit-msg` hook installed — enforces `(fix|test|chore|refactor)(scope)?: #ID description`

---

## Phase 1 — Super-Admin Ghost Extermination (completed 2026-05-10)

**Goal:** Zero occurrences of `super_admin`, `superAdmin`, `super-admin`, `SUPER_ADMIN` in product code (excluding migrations with historically correct table names and test regression-guard assertions).

**Issues closed (17):**

| Issue | Description | Commit |
|-------|-------------|--------|
| 01-001 | Dead `super-admin` role label in utils.test.js | e26c4ad / 5edb482 |
| 01-006 | 123 `t('superAdmin.*')` calls in government JSX | 516eb70 |
| 01-007 | `"superAdmin"` top-level key in government locale files | 516eb70 |
| 01-008 | `contactSuperAdmin`/`superAdminReply`/`sendToSuperAdmin` i18n keys | 516eb70 / e26c4ad |
| 01-009 | Uzbek "super-admin tomonidan" in Telegram notification | b26c18e |
| 01-010 | "super-admin bilan bog'laning" in email template | b26c18e |
| 01-011 | `SUPER_ADMIN_SECRET_KEY` in env.example | 7d3f5b2 |
| 01-012 | `updateGovernmentBySuper`/`deleteGovernmentBySuper` function names | pre-cycle |
| 03-004 | `super_admin_messages` table not renamed to `government_messages` | pre-cycle |
| 06-001 | User-facing "super-admin" text in email + Telegram | b26c18e |
| 06-002 | 5 dead `/message-to-super-admin` route aliases | pre-cycle |
| 06-003 | Ghost-named files: superAdminController.js etc. | pre-cycle |
| 06-004 | 66 `t('superAdmin.*')` calls — same as 01-006 | 516eb70 |
| 06-005 | `requireTeacher` multi-role behavior undocumented | 68bd33c |
| 06-006 | `getRoleLabel('super-admin')` test on dead role | e26c4ad |
| 06-007 | User.js:95 stale "except superadmin" comment | 7d3f5b2 |
| 09-009 | `superAdminReply` i18n key in parent locale files | 516eb70 |
| N-003 | Dead aliases had validator middleware too | pre-cycle |

**Ghost grep gate result:**
- Migrations: excluded (historically correct table names before rename migration)
- Regression test assertions (`not.toContain('message-to-super-admin')`, `!url.includes('/super-admin/')`) : excluded (these test for absence of old patterns — must reference old string)
- All other product code: **zero** ghost references

**Backlog counts after Phase 1:**
- Closed: 41 (was 24 pre-cycle → +17 this phase)
- Open (not-fixed): 79
- Open (partially-fixed): 16
- Total: 136

**Phase 1 score contribution:**
- Phase 01 Naming: ~8 issues closed → score improvement estimated
- Phase 06 Roles: ~7 issues closed → score improvement estimated
- Mandate 1 (`super_admin_messages` end-to-end): **CLOSED**

---

_Next: Phase 2 — await user "go"_
