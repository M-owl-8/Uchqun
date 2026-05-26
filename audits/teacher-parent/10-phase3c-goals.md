# S5 PHASE 3c — ИРР Goals (Long-term + Periods + Short-term + Review)

**Commit:** 0458433
**Date:** 2026-05-26
**Status:** ✅ COMPLETE

---

## 1. What was built

Phase 3c adds the full goals layer to `IrrShell.jsx`:

1. **Long-term goals (LTG)** — up to 5 free-text goals (OQ-11: NO skill-area tag). CRUD: POST/PATCH/DELETE wired to `/teacher/irr/:irrId/long-term-goals` and `/teacher/long-term-goals/:id`. Inline edit per goal.
2. **Goal periods** — 3-month development periods. Create (periodStart + periodEnd) + list + collapsible expand/collapse. POST to `/teacher/irr/:irrId/goal-periods`.
3. **Short-term goals (STG)** — per period, up to any count (guidance: 3–5 shown when < 3 exist). 9 columns: skillAreaCode (from SKILL_AREAS config — dropdown), goalText, taskSetDate, targetDate, tasks, methods, progress, observations. CRUD wired to `/teacher/goal-periods/:id/short-term-goals` and `/teacher/short-term-goals/:id`.
4. **Quarterly review** — fields: overallAssessment, planChanges, parentRecommendations, nextReviewDate, nextAssessmentDate, parentDiscussionDate. PATCH to `/teacher/goal-periods/:id/review`.
5. **Teacher signature** — POST to `/teacher/goal-periods/:id/sign`. Controller routes teacher role → `teacherSignedAt/By`. Sign button disabled after signing.

---

## 2. STEP 0 — Round-trip total-agreement test (Phase 3b follow-up)

Added test: `round-trip total-agreement: live-score seen by teacher equals totalScore stored by backend`

**Logic:** Score all 17 criteria with value 3 (sum = 51). Assert:
1. Live score display shows `51 / 68` before submit
2. POST body carries `scores: Array(17).fill(3)`
3. `postBody.scores.reduce((a,s) => a+s, 0)` === 51 (live-sum === submitted-sum)
4. `submittedSession.totalScore` === 51 (backend-returned === teacher-saw)

This proves teacher-saw-total === backend-stored-total without relying on a mocked progression value.

---

## 3. Scoring direction invariant (preserved from Phase 3b)

No change to scoring direction. The round-trip test (STEP 0) re-confirms: score value 4 = best = software score 4 = highest contribution to sum.

---

## 4. OQ-11 — Long-term goals have NO skill-area tag

Long-term goals are free-form text. The LTG add form has `goalText`, `targetPeriodStart`, `targetPeriodEnd` — no `skillAreaCode` field. The `SKILL_AREAS` dropdown is only in the STG form.

---

## 5. Skill areas — data-driven from config

`SKILL_AREAS` imported from `@shared/config/skillAreas`. 5 areas:

| Code | Uzbek |
|---|---|
| `SELF_CARE_FEEDING` | Ўз-ўзига хизмат кўрсатиш кўникмалари (овқатланиш) |
| `SELF_CARE_HYGIENE` | Ўз-ўзига хизмат кўрсатиш кўникмалари (гигиена) |
| `COMMUNICATION` | Коммуникатив кўникмалар |
| `SOCIAL_EMOTIONAL` | Ижтимоий-ҳиссий ривожланиш |
| `PHYSICAL` | Жисмоний ривожланиш |

The `<select>` for STG skill area renders options from `SKILL_AREAS.map(sa => ...)` — never hardcoded in the component.

---

## 6. Signature routing

`signGoalPeriod` controller sets:
- `role === 'teacher'` → `{ teacherSignedAt: now, teacherSignedBy: req.user.id }`
- any other role → `{ managerSignedAt: now, managerSignedBy: req.user.id }`

Frontend calls `POST /teacher/goal-periods/:id/sign` from the teacher role. The "Ўқитувчи имзоси" button is disabled after `period.teacherSignedAt` is set. Manager signing requires a different role — not faked as teacher.

---

## 7. State added to IrrShell.jsx (Phase 3c additions)

| State | Type | Purpose |
|---|---|---|
| `longTermGoals` | array | LTG list |
| `loadingGoals` | bool | LTG loading state |
| `ltgForm` | object | New LTG form (goalText/targetPeriodStart/targetPeriodEnd) |
| `savingLtg` | bool | Saving/updating LTG |
| `ltgEditId` | string\|null | Which LTG is in inline edit mode |
| `ltgEditForm` | object | Inline edit form state |
| `goalPeriods` | array | Goal period list |
| `loadingPeriods` | bool | Periods loading state |
| `periodForm` | object | New period form (periodStart/periodEnd) |
| `savingPeriod` | bool | Saving period |
| `periodError` | string\|null | Period validation error |
| `expandedPeriods` | Set | Which period IDs are expanded |
| `stgByPeriod` | object | Map periodId → STG array |
| `stgForms` | object | Map periodId → current add-STG form |
| `savingStg` | string\|null | Period ID or STG ID being saved |
| `stgEditId` | string\|null | Which STG is in inline edit mode |
| `stgEditForm` | object | STG inline edit form state |
| `reviewForms` | object | Map periodId → review form state |
| `savingReview` | string\|null | Period ID whose review is being saved |
| `signingPeriod` | string\|null | Period ID being signed |

---

## 8. useEffect change (CRITICAL — backward compatibility)

The `irrId` useEffect was extended from sessions-only to fire all 3 loaders:

```js
useEffect(() => {
  if (irrId) {
    loadSessions(irrId);
    loadLongTermGoals(irrId);
    loadGoalPeriods(irrId);
  }
}, [irrId, loadSessions, loadLongTermGoals, loadGoalPeriods]);
```

All `mockResolvedValueOnce` tests updated to add 2 additional empty-array mocks (LTGs + periods).

---

## 9. API endpoints wired (Phase 3c)

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/teacher/irr/:irrId/long-term-goals` | Load LTG list |
| `POST` | `/teacher/irr/:irrId/long-term-goals` | Create LTG |
| `PATCH` | `/teacher/long-term-goals/:id` | Update LTG |
| `DELETE` | `/teacher/long-term-goals/:id` | Delete LTG |
| `GET` | `/teacher/irr/:irrId/goal-periods` | Load period list |
| `POST` | `/teacher/irr/:irrId/goal-periods` | Create period |
| `GET` | `/teacher/goal-periods/:id/short-term-goals` | Load STGs (on expand) |
| `POST` | `/teacher/goal-periods/:id/short-term-goals` | Create STG |
| `PATCH` | `/teacher/short-term-goals/:id` | Update STG |
| `DELETE` | `/teacher/short-term-goals/:id` | Delete STG |
| `PATCH` | `/teacher/goal-periods/:id/review` | Save quarterly review |
| `POST` | `/teacher/goal-periods/:id/sign` | Sign period |

---

## 10. data-testid attributes (Phase 3c additions)

| testid | Element |
|---|---|
| `ltg-section` | Long-term goals section container |
| `ltg-add-form` | New LTG add form (shown when < 5 LTGs) |
| `ltg-text-input` | LTG goal text textarea |
| `ltg-start-input` | LTG target period start date |
| `ltg-end-input` | LTG target period end date |
| `ltg-save-btn` | Create new LTG |
| `ltg-row-{id}` | Each LTG row |
| `ltg-edit-btn-{id}` | Enter inline edit mode |
| `ltg-edit-text-{id}` | Inline edit textarea |
| `ltg-edit-save-{id}` | Save inline edit |
| `ltg-delete-{id}` | Delete LTG |
| `periods-section` | Goal periods section container |
| `period-create-form` | New period form |
| `period-start-input` | Period start date |
| `period-end-input` | Period end date |
| `period-create-btn` | Create new period |
| `period-error` | Period validation error |
| `period-row-{id}` | Each period row |
| `period-toggle-{id}` | Expand/collapse period |
| `stg-section-{periodId}` | STG section within period |
| `stg-guidance-{periodId}` | 3–5 guidance text (shown when < 3 STGs) |
| `stg-add-form-{periodId}` | New STG form |
| `stg-skill-area-{periodId}` | Skill area select |
| `stg-text-{periodId}` | STG goal text |
| `stg-task-date-{periodId}` | Task set date |
| `stg-target-date-{periodId}` | Target date |
| `stg-tasks-{periodId}` | Tasks textarea |
| `stg-methods-{periodId}` | Methods textarea |
| `stg-progress-{periodId}` | Progress textarea |
| `stg-observations-{periodId}` | Observations textarea |
| `stg-add-btn-{periodId}` | Create new STG |
| `stg-row-{id}` | Each STG row |
| `stg-edit-btn-{id}` | Enter STG inline edit |
| `stg-edit-save-{id}` | Save STG inline edit |
| `stg-delete-{id}` | Delete STG |
| `stg-skill-tag-{id}` | Skill area tag on rendered STG |
| `review-section-{periodId}` | Quarterly review section |
| `review-overall-{periodId}` | Overall assessment textarea |
| `review-changes-{periodId}` | Plan changes textarea |
| `review-parent-rec-{periodId}` | Parent recommendations textarea |
| `review-next-date-{periodId}` | Next review date |
| `review-next-assess-{periodId}` | Next assessment date |
| `review-parent-date-{periodId}` | Parent discussion date |
| `review-save-{periodId}` | Save quarterly review |
| `sign-teacher-{periodId}` | Teacher sign button |
| `signed-at-{periodId}` | Teacher signed-at date display |

---

## 11. Test results

**File:** `teacher/src/__tests__/pages/IrrShell.test.jsx`

**24 tests total, all green:**

### Phase 3a tests (7, updated for 3-loader useEffect)

All 7 Phase 3a tests updated to provide 2 additional `mockResolvedValueOnce` mocks (LTGs + periods) for all tests that had `mockResolvedValueOnce` sequences.

### Phase 3b tests (9, including new round-trip test)

| Test | Status |
|---|---|
| renders assessment section when IRR exists | ✓ |
| renders all 17 criteria from config (data-driven, not hardcoded) | ✓ |
| selecting best option (score btn 4) stores software score 4 | ✓ |
| submit session button disabled until all 17 criteria are scored | ✓ |
| submits session POST with correct endpoint and scores array | ✓ |
| shows ASSESSMENT_SESSION_EXISTS error on 409 | ✓ |
| renders progression table when sessions exist | ✓ |
| **round-trip total-agreement: live-score seen by teacher equals totalScore stored by backend** | ✓ (new) |

### Phase 3c tests (9, all new)

| Test | Assertion |
|---|---|
| renders LTG section and add form when IRR exists | `ltg-section`, `ltg-add-form`, `ltg-text-input` visible |
| creates LTG via POST and renders it in the list | POST to `/teacher/irr/irr-1/long-term-goals`, row appears |
| deletes LTG via DELETE | DELETE `/teacher/long-term-goals/ltg-1`, row disappears |
| creates goal period via POST and renders it | POST to `/teacher/irr/irr-1/goal-periods`, period row appears |
| renders periods from list and shows toggle | `period-row-{id}` and `period-toggle-{id}` visible |
| shows STG add form with skill-area select driven by SKILL_AREAS config | All 5 SKILL_AREAS textUz in select options (data-driven) |
| shows 3–5 guidance when period has 0 STGs | `stg-guidance-{periodId}` contains "3–5" |
| creates STG via POST with skill area | POST to `/teacher/goal-periods/period-1/short-term-goals`, STG row appears |
| saves quarterly review via PATCH | PATCH to `/teacher/goal-periods/period-1/review`, success toast |
| signs period via POST and disables sign button afterward | POST to `/teacher/goal-periods/period-1/sign`, button disabled |

---

## 12. What is NOT built (Phase 3d)

- Daily monitoring journals (DailyMonitoringEntry) — Phase 3d
- Weekly monitoring journals — Phase 3d
- Quarterly monitoring journals — Phase 3d
- Manager sign flow UI (different role — controller handles; no separate button built)
- STG reorder (sortOrder UI drag) — deferred
