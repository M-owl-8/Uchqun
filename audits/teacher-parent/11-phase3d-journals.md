# S5 PHASE 3d — ИРР Daily + Weekly Monitoring Journals

**Commit:** (pending)
**Date:** 2026-05-26
**Status:** ✅ COMPLETE

---

## 1. What was built

Phase 3d adds per-child monitoring journals to `IrrShell.jsx`:

1. **Daily monitoring journal** — 27 checklist items in 3 sections (hygiene 9, health 11, GI 7), data-driven from `DAILY_JOURNAL_ITEMS` config. JSONB stored as `{ code: boolean }` per section field. POST to `/teacher/children/:childId/daily-entries`.
2. **Weekly monitoring journal** — 18 checklist items in 2 sections (emotional 9, environment 9), data-driven from `WEEKLY_JOURNAL_ITEMS` config. JSONB stored in `emotionalData`/`environmentData`. POST to `/teacher/children/:childId/weekly-entries`.
3. **Quarterly monitoring** — NOT built (OQ-3 decision). This is manager/раҳбар only, facility-level, ~55 items per IRR-SPECIFICATION.md Part A-6c. Tracked as **CP-024** in LOOP_CROSS_PORTAL.md.

---

## 2. OQ decisions preserved

| OQ | Decision |
|---|---|
| OQ-3 | Quarterly = manager-only. NOT in teacher portal. CP-024. |
| OQ-5 | Journals are OPTIONAL. No forcing; skipped days are gaps, not blocks. |
| OQ-6 | PER-CHILD (not group). Entries are always scoped to childId from useParams. |

---

## 3. Config items reused (PL-009)

Uzbek Cyrillic labels (`textUz`) come directly from the seed configs — not re-translated. The configs are the source of truth. Russian/English labels in configs are AI-generated/unverified (PL-009-VERIFY required before launch).

| Config | Items | Sections |
|---|---|---|
| `shared/config/dailyJournalItems.js` | 27 (DAILY_ITEM_COUNT) | hygiene: 9, health: 11, gi: 7 |
| `shared/config/weeklyJournalItems.js` | 18 (WEEKLY_ITEM_COUNT) | emotional: 9, environment: 9 |

---

## 4. irrId nullable

Both journal endpoints use `childId` (from `useParams('id')`), which is always available. The `irrId` field in the POST body is sent as `irr?.id || null` — journals work whether or not an active ИРР exists for the child.

The loaders (`loadDailyEntries`, `loadWeeklyEntries`) fire in a `useEffect([id, ...])` on component mount — NOT in the irrId-dependent useEffect.

---

## 5. Duplicate handling (legible errors)

| Code | Condition | UI message |
|---|---|---|
| `DAILY_ENTRY_DUPLICATE` | Unique constraint (childId, entryDate) violated | 'Бу сана учун кундалик мониторинг аллақачон мавжуд' shown in `daily-error-banner` |
| `WEEKLY_ENTRY_DUPLICATE` | Unique constraint (childId, weekStart) violated | 'Бу ҳафта учун мониторинг аллақачон мавжуд' shown in `weekly-error-banner` |

---

## 6. useEffect load order (critical — test mock sequence)

On component mount, React fires effects in declaration order:

1. `useEffect([load])` → GET `/teacher/children/:id/irr` (GET#1)
2. `useEffect([id, loadDailyEntries, loadWeeklyEntries])` → GET daily (GET#2), GET weekly (GET#3)
3. irrId effect: not fired yet (irrId=null on mount)

After irr loaded → irrId changes → irrId effect fires:
4. GET sessions (GET#4), GET LTGs (GET#5), GET periods (GET#6)

**Test mock sequence (when irr exists):** irr → daily → weekly → sessions → LTGs → periods

`mockIrrLoad` updated to 6 mocks (was 4). All Phase 3a/3b tests updated accordingly (+2 mocks each).

---

## 7. State added to IrrShell.jsx (Phase 3d additions)

| State | Type | Purpose |
|---|---|---|
| `dailyEntries` | array | Recent daily entries (GET on mount, prepend on POST) |
| `loadingDaily` | bool | Daily entries loading state |
| `dailyDate` | string | Date input — defaults to today (ISO) |
| `dailyChecks` | object | code→boolean map for all 27 daily items |
| `dailyNotes` | string | Free-text notes for daily entry |
| `savingDaily` | bool | Daily POST in-flight |
| `dailyError` | string\|null | Duplicate or save error |
| `weeklyEntries` | array | Recent weekly entries |
| `loadingWeekly` | bool | Weekly loading state |
| `weekStart` | string | Week start date — defaults to Monday of current week |
| `weeklyChecks` | object | code→boolean map for all 18 weekly items |
| `weeklyNotes` | string | Free-text notes for weekly entry |
| `savingWeekly` | bool | Weekly POST in-flight |
| `weeklyError` | string\|null | Duplicate or save error |

---

## 8. API endpoints wired (Phase 3d)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/teacher/children/:childId/daily-entries?limit=30` | Load recent daily entries (on mount) |
| `POST` | `/teacher/children/:childId/daily-entries` | Create daily entry |
| `GET` | `/teacher/children/:childId/weekly-entries?limit=12` | Load recent weekly entries (on mount) |
| `POST` | `/teacher/children/:childId/weekly-entries` | Create weekly entry |

---

## 9. data-testid attributes (Phase 3d additions)

| testid | Element |
|---|---|
| `daily-section` | Daily monitoring journal container |
| `daily-date-input` | Date input (default today) |
| `daily-hygiene-section` | Hygiene items block |
| `daily-health-section` | Health items block |
| `daily-gi-section` | GI items block |
| `daily-check-{code}` | Each checkbox (27 total, data-driven) |
| `daily-notes` | Notes textarea |
| `daily-error-banner` | Error message (duplicate / save failure) |
| `daily-submit-btn` | Submit daily entry button |
| `daily-entry-row-{id}` | Each row in recent entries list |
| `weekly-section` | Weekly monitoring journal container |
| `weekly-date-input` | Week start date input (default current Monday) |
| `weekly-emotional-section` | Emotional items block |
| `weekly-environment-section` | Environment items block |
| `weekly-check-{code}` | Each checkbox (18 total, data-driven) |
| `weekly-notes` | Notes textarea |
| `weekly-error-banner` | Error message |
| `weekly-submit-btn` | Submit weekly entry button |
| `weekly-entry-row-{id}` | Each row in recent weekly entries list |

---

## 10. Cross-portal items added (STEP 0)

Added to LOOP_CROSS_PORTAL.md:
- **CP-024** — Manager ИРР surface: goal-period manager signature + quarterly facility-level monitoring (OQ-3). Portal/role to be resolved. NOT in teacher portal.
- **CP-025** — Parent ИРР view-only surface. Read endpoints exist from Phase 2; no parent UI yet. Build after teacher-side ИРР is complete.

---

## 11. Test results

**File:** `teacher/src/__tests__/pages/IrrShell.test.jsx`

**32 tests total, all green:**

### Phase 3a tests (7) — updated mock sequences (+2 mocks each)
All 7 Phase 3a tests updated: irr → **daily → weekly** → sessions → LTGs → periods.

### Phase 3b tests (8) — updated mock sequences (+2 mocks each)
All 8 Phase 3b tests updated. Tests with post-action reloads also updated (session submit reload: +2 prepended).

### Phase 3c tests (10) — `mockIrrLoad` updated
`mockIrrLoad` now 6 mocks (was 4). All Phase 3c tests using `mockIrrLoad()` automatically updated.

### Phase 3d tests (7, all new)

| Test | Assertion |
|---|---|
| renders daily-section with 27 checkboxes data-driven from DAILY_JOURNAL_ITEMS | All 27 `daily-check-{code}` testids present; `DAILY_ITEM_COUNT === 27` |
| submits daily entry via POST with correct JSONB shape | POST body has `hygieneData`, `healthData`, `giData` objects with toggled code=true |
| shows DAILY_ENTRY_DUPLICATE error legibly on 409 | `daily-error-banner` contains 'аллақачон мавжуд' |
| renders weekly-section with 18 checkboxes data-driven from WEEKLY_JOURNAL_ITEMS | All 18 `weekly-check-{code}` testids; `WEEKLY_ITEM_COUNT === 18` |
| submits weekly entry via POST with correct JSONB shape | POST body has `emotionalData`, `environmentData` with toggled code=true |
| shows WEEKLY_ENTRY_DUPLICATE error legibly on 409 | `weekly-error-banner` contains 'аллақачон мавжуд' |
| daily and weekly sections render without an active ИРР (irrId nullable) | Both sections visible when irr load returns 404 |

---

## 12. What is NOT built (Phase 3e / cross-portal)

- Quarterly monitoring journal (OQ-3 — manager-only, CP-024)
- Parent ИРР view-only surface (CP-025)
- Daily/weekly entry edit/delete (entries are append-only; backend has unique constraint per day/week)
- STG reorder drag UI (deferred from Phase 3c)
