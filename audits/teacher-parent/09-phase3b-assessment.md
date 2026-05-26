# S5 PHASE 3b — ИРР Assessment Screen + Live Scoring + Progression

**Commit:** 6be937b
**Date:** 2026-05-26
**Status:** ✅ COMPLETE

---

## 1. What was built

Phase 3b adds the full assessment session flow to `IrrShell.jsx`:

1. **17-criterion assessment screen** — data-driven from `@shared/config/assessmentCriteria` (no hardcoded criteria in the frontend)
2. **Live score display** — running `X / 68` updated on every button click
3. **Submit gate** — submit button disabled until all 17 criteria are scored
4. **Session form** — session type selector + date picker + isHearingImpaired checkbox + notes
5. **Progression table** — Вақти / Баллар / Сана from GET `/teacher/irr/:irrId/assessment-sessions`
6. **Error handling** — ASSESSMENT_SESSION_EXISTS (409) and ASSESSMENT_INCOMPLETE (400) surfaced legibly

---

## 2. STEP 0 — additionalInfo decision recorded

Added to `audits/teacher-parent/IRR-DECISIONS.md`:

> `additionalInfo` (Қўшимча маълумотлар) is **MANDATORY** for ИРР activation.
> It is in `HEADER_FIELDS` in `backend/controllers/teacher/irrController.js` **by design**, per partner/standard requirements. This is **NOT** an oversight, despite `childStrengths` and `riskFactors` being advisory.
> Do not make `additionalInfo` optional. Do not remove it from `HEADER_FIELDS`.

---

## 3. Scoring direction (CRITICAL — verified by explicit test)

| Direction | Detail |
|---|---|
| Software | 0 = worst / can't-do, 4 = best / can-do |
| Config keys | `assessmentCriteria.js` levelDescriptions keyed in SOFTWARE direction: `'4'` = best text, `'0'` = worst text |
| UI rendering | Buttons displayed 4→3→2→1→0 left-to-right (best→worst). Button VALUE = software score sent to backend |
| No inversion in UI | The config already inverted from printed standard at seed time. The UI reads `levelDescriptions[String(score)].uz` directly |

**Explicit test:** `selecting best option (score btn 4) stores software score 4 — explicit scoring direction test`
- Clicks `score-btn-SELF_FEEDING-4` → live score becomes `4 / 68` (NOT 0)
- Clicks `score-btn-SELF_FEEDING-0` → live score returns to `0 / 68`

This confirms: selecting the BEST button gives software score 4 (highest).

---

## 4. Criterion 9 (SIGN_COMMUNICATION) — OQ-1

`isHearingSpecific: true` is present on criterion 9, but it is displayed and scored for **ALL children** per OQ-1 resolution. The flag is used only to render a note label `(ОQ-1: барча болалар учун)`. No exclusion logic — max score always = 68.

---

## 5. State added to IrrShell.jsx

New state variables (Phase 3b additions):

| State | Type | Purpose |
|---|---|---|
| `sessions` | array | Session list from GET assessment-sessions |
| `loadingSessions` | bool | Session loading skeleton |
| `scores` | number[]\|null[] | 17 values (null = unscored, 0–4 = scored) |
| `sessionType` | string | 'intake'|'3mo'|'6mo'|'9mo'|'12mo'|'custom' |
| `completedAt` | string | YYYY-MM-DD (defaults to today) |
| `isHearingImpaired` | bool | Checkbox for hearing impairment flag |
| `sessionNotes` | string | Optional notes textarea |
| `submittingSession` | bool | Disables submit during POST |
| `sessionError` | string\|null | Error banner (session-error-banner testid) |

Derived values:
```js
const liveScore = scores.reduce((sum, s) => sum + (s !== null ? s : 0), 0);
const allScored  = scores.every(s => s !== null);
```

---

## 6. New functions

### `loadSessions(irrId)` — useCallback, dep: `[]`
- `GET /teacher/irr/${irrId}/assessment-sessions`
- `setSessions(Array.isArray(res.data?.data) ? res.data.data : [])` — Array.isArray guard prevents wrong-shape mock from breaking existing tests
- Silently catches all errors (sessions are secondary to main IRR)

Sessions useEffect uses derived `irrId = irr?.id`:
```js
useEffect(() => {
  if (irrId) loadSessions(irrId);
}, [irrId, loadSessions]);
```

### `handleScoreChange(criterionIndex, score)` — useCallback
- Updates `scores[criterionIndex]` to `score` (0–4)
- Clears `sessionError` if set

### `handleSubmitSession()` — useCallback
- `POST /teacher/irr/${irr.id}/assessment-sessions` with `{ sessionType, scores, isHearingImpaired, notes: sessionNotes, completedAt }`
- On success: shows toast, resets scores to `Array(17).fill(null)`, clears notes, calls `loadSessions(irr.id)`
- On 409 `ASSESSMENT_SESSION_EXISTS`: sets `sessionError` (Uzbek message)
- On 400 `ASSESSMENT_INCOMPLETE`: sets `sessionError`
- On other error: sets generic `sessionError`

---

## 7. API endpoints wired

| Method | Endpoint | Purpose |
|---|---|---|
| `POST` | `/teacher/irr/:irrId/assessment-sessions` | Submit new session |
| `GET` | `/teacher/irr/:irrId/assessment-sessions` | Load progression table |
| `GET` | `/teacher/assessment-sessions/:sessionId` | Per-criterion detail (available, no UI yet) |

---

## 8. Session type Uzbek labels

| Key | Uzbek |
|---|---|
| `intake` | Кундузги парвариш хизматига қабул қилинганда |
| `3mo` | 3 ойдан кейин |
| `6mo` | 6 ойдан кейин |
| `9mo` | 9 ойдан кейин |
| `12mo` | 12 ойдан кейин |
| `custom` | Бошқа сана |

---

## 9. data-testid attributes (Phase 3b additions)

| testid | Element |
|---|---|
| `assessment-section` | Assessment section container |
| `progression-table` | Sessions history table |
| `session-type-select` | Session type dropdown |
| `completed-at-input` | Date picker |
| `hearing-impaired-check` | Hearing impairment checkbox |
| `live-score` | Live score display (`X / 68`) |
| `criterion-row-{code}` | Each criterion row (17 total, keyed by ASSESSMENT_CRITERIA code) |
| `score-btn-{code}-{score}` | Each score button per criterion (5 × 17 = 85 buttons total) |
| `session-error-banner` | Error display (409/400 errors) |
| `submit-session-btn` | Session submit button (disabled until all 17 scored) |

---

## 10. i18n

`assessment` subsection added to `irr` section in all three locale files:

| File | Keys added |
|---|---|
| `teacher/src/locales/en/common.json` | 22 keys (verified English) |
| `teacher/src/locales/uz/common.json` | 22 keys (⚠️ PL-009: AI-generated, unverified) |
| `teacher/src/locales/ru/common.json` | 22 keys (⚠️ PL-009: AI-generated, unverified) |

Keys cover: section title/note, session type labels, form field labels, live score, submit button, error messages, progression table columns, toast messages.

---

## 11. Test results

**File:** `teacher/src/__tests__/pages/IrrShell.test.jsx`

14 tests, all green:

### Phase 3a tests (updated — mock sequences corrected for sessions load)

| Test | Change |
|---|---|
| renders create state when no IRR exists (404 — no toast) | No change needed (no sessions load when irr=null) |
| shows error toast on non-404 load failure | No change needed |
| renders draft IRR with activate button and status badge | Added sessions mock (`mockResolvedValueOnce({ data: { data: [] } })`) |
| calls POST to create new IRR when none exists | Added sessions mock (after POST, irr.id set, sessions load triggers) |
| calls PATCH on save when IRR already exists | Added sessions mock (irr load + sessions load + reload after PATCH = 3 GETs) |
| shows Uzbek field labels in error banner on 400 IRR_HEADER_INCOMPLETE | No change — uses `mockResolvedValue` (all GETs); Array.isArray guard handles wrong-shape sessions response |
| calls success toast and reloads on successful activation | Added sessions mock (irr load + sessions load + reload after activate = 3 GETs) |

### Phase 3b tests (new)

| Test | Assertion |
|---|---|
| renders assessment section when IRR exists | `assessment-section` visible; `submit-session-btn` and `live-score` present |
| renders all 17 criteria from config (data-driven, not hardcoded) | `criterion-row-{code}` for all 17 ASSESSMENT_CRITERIA codes |
| selecting best option (score btn 4) stores software score 4 — explicit scoring direction test | Click `score-btn-SELF_FEEDING-4` → live score = "4 / 68"; click `score-btn-SELF_FEEDING-0` → live score = "0 / 68" |
| submit session button disabled until all 17 criteria are scored | Initially disabled; disabled after 16/17 scored; enabled after 17/17 |
| submits session POST with correct endpoint and scores array | POST `/teacher/irr/irr-1/assessment-sessions` with `{ scores: Array(17).fill(4) }` |
| shows ASSESSMENT_SESSION_EXISTS error on 409 | `session-error-banner` visible; contains "аллақачон мавжуд" |
| renders progression table when sessions exist | `progression-table` visible; contains score "45" and max score |

**Pattern:** Vitest + stable mock handles + `vi.resetModules()` in `beforeEach` + dynamic `await import()` inside each test + static import of `ASSESSMENT_CRITERIA, MAX_SCORE` at file top.

---

## 12. What is NOT built (Phase 3c–3d)

- Long-term goals / goal periods / short-term goals UI — Phase 3c
- Daily / weekly / quarterly monitoring journals — Phase 3d
- Per-criterion detail view (GET /assessment-sessions/:sessionId available, no UI)
- Archive action (no UI, backend endpoint exists)
- ИРР status transition from active → archived (admin/manager action per OQ-12)
