# S5 PHASE 3a — ИРР Shell + Entry Point + Header Form + Activation Gate

**Commit:** 6b08a96  
**Date:** 2026-05-26  
**Status:** ✅ COMPLETE

---

## 1. Confirmed mandatory-field list

Verified against `backend/controllers/teacher/irrController.js` `HEADER_FIELDS` constant:

| # | Field key | Uzbek label (Cyrillic) | Required for activation |
|---|---|---|---|
| 1 | `childFullName` | Боланинг фамилияси, исми | ✅ Yes |
| 2 | `dateOfBirth` | Туғилган санаси | ✅ Yes |
| 3 | `ageAtAssessmentStart` | Текширув бошланган вақтдаги ёш | ✅ Yes |
| 4 | `ptpkIntakeDate` | ПТПКга келиб тушган сана | ✅ Yes |
| 5 | `ptpkConclusionDate` | ПТПК хулосаси санаси | ✅ Yes |
| 6 | `ptpkConclusionNumber` | ПТПК рўйхатдан ўтказиш рақами | ✅ Yes |
| 7 | `ptpkDiagnosis` | ПТПК ташхиси | ✅ Yes |
| 8 | `irrStartDate` | ИРР бошланган сана | ✅ Yes |
| 9 | `additionalInfo` | Қўшимча маълумотлар | ✅ Yes (confirmed mandatory in Phase 2 CONFIRM test) |

**Optional fields shown in form but NOT in HEADER_FIELDS gate:**

| Field key | Note |
|---|---|
| `ptpkNotes` | Advisory — shown on form, no asterisk |
| `childStrengths` | OQ-9 advisory — shown in needs-assessment section |
| `riskFactors` | OQ-9 advisory — shown in needs-assessment section |

`additionalInfo` was verified mandatory during Phase 2 CONFIRM: nulling it caused 400 IRR_HEADER_INCOMPLETE; filling it (9/9) caused 200 + status='active'.

---

## 2. Entry point (ChildDetail.jsx)

**File:** `teacher/src/pages/ChildDetail.jsx`

- Added `useToast` import from `../shared/context/ToastContext`
- Added `FileText` to lucide-react imports
- Added `irr` state: `const [irr, setIrr] = useState(null)`
- Destructure: `const { error: showError } = useToast()`
- IRR fetch added as third entry in existing `Promise.allSettled`:
  ```js
  const [childRes, goalsRes, irrRes] = await Promise.allSettled([
    api.get(`/teacher/children/${id}`),
    api.get(`/teacher/children/${id}/goals`),
    api.get(`/teacher/children/${id}/irr`),
  ]);
  ```
- 404 → silent (no toast); non-404 rejection → `showError('ИРР ma\'lumotlari yuklanmadi')`
- `showError` added to `useEffect` deps `[id, showError]` (stable — useCallback in ToastContext)
- CTA button added in hero card:
  - No IRR: `ИРР тузиш` (Build IRR)
  - Draft/active IRR: `ИРРни кўриш` (View IRR)
  - Both link to `/teacher/children/${id}/irr`

---

## 3. IrrShell container page

**File:** `teacher/src/pages/IrrShell.jsx`

### Route
Added to `teacher/src/App.jsx` inside the `/teacher` ProtectedRoute group:
```jsx
<Route path="children/:id/irr" element={<ErrorBoundary><IrrShell /></ErrorBoundary>} />
```

### State
| State | Type | Purpose |
|---|---|---|
| `loading` | bool | Initial skeleton |
| `saving` | bool | Disable save button |
| `activating` | bool | Disable activate button |
| `irr` | object\|null | null = no IRR yet |
| `form` | object | All 12 form fields |
| `activateError` | string[]\|null | Uzbek field labels for banner |

### Load function (useCallback, deps `[id, showError]`)
- `GET /teacher/children/${id}/irr`
- 404 → `setIrr(null)`, no toast
- Other errors → `showError('ИРР yuklanmadi...')`
- Always sets `loading=false` in finally

### Save (handleSave)
- No irr: `POST /teacher/children/${id}/irr` → `setIrr(created)`, `success()`
- Has irr: `PATCH /teacher/irr/${irr.id}` → `success()`, then `load()` to reload

### Activate (handleActivate)
- `POST /teacher/irr/${irr.id}/activate`
- On 400 `IRR_HEADER_INCOMPLETE`:
  1. Parses `detail: "Missing: fieldA, fieldB"` via regex `detail.replace(/^Missing:\s*/i, '')`
  2. Splits on `,`, maps each key through `FIELD_LABELS_UZ`
  3. Sets `activateError` (string array of Uzbek labels)
  4. Shows `showError('Barcha majburiy maydonlarni to\'ldiring')`
- On `IRR_INVALID_STATUS`: shows specific toast
- On other error: generic toast

### Form fields (in render order)
1. `childFullName` — text input (required)
2. `dateOfBirth` — date input (required), `ageAtAssessmentStart` — text input (required) [2-col]
3. `ptpkIntakeDate` — date input (required)
4. `ptpkConclusionDate` — date input (required), `ptpkConclusionNumber` — text input (required) [2-col]
5. `ptpkDiagnosis` — textarea (required)
6. `ptpkNotes` — textarea (optional, no asterisk)
7. `irrStartDate` — date input (required)
8. `additionalInfo` — textarea (required)
9. `childStrengths` — textarea (advisory, in needs-assessment section)
10. `riskFactors` — textarea (advisory, in needs-assessment section)

### Read-only mode
`isReadOnly = irr?.status === 'archived'` — all inputs disabled, no action buttons rendered.

### data-testid attributes
- `irr-shell` — root container
- `save-btn` — save button
- `activate-btn` — activate button (only shown for `status === 'draft'`)
- `activate-error-banner` — missing-fields error panel

### Extension point
```jsx
{/* EXTENSION POINT — Phase 3b: assessment tab; 3c: goals tab; 3d: journals tab */}
```

---

## 4. Endpoints wired (quoted from `backend/routes/teacherRoutes.js`)

```
GET  /teacher/children/:childId/irr   → getChildIRR     (requireRole teacher)
POST /teacher/children/:childId/irr   → createIRR        (requireRole teacher)
GET  /teacher/irr/:irrId              → getIRR           (requireRole teacher)
PATCH /teacher/irr/:irrId             → updateIRR        (requireRole teacher)
POST /teacher/irr/:irrId/activate     → activateIRR      (requireRole teacher)
```

(Archive endpoint exists on backend but no UI built — Phase 3d.)

---

## 5. i18n added

**Files:** `teacher/src/locales/en/common.json`, `uz/common.json`, `ru/common.json`

`irr` section added to all three with 37 keys covering:
- Page title, nav labels, status badges
- Section headings, field labels (all 12 form fields)
- Button labels + loading states
- Toast messages (7 variants)
- Activation error banner title + fallback

**PL-009 flag:** uz and ru strings are AI-generated and unverified. Professional review required before real-user launch (tracked as PL-009-VERIFY in LOOP_PRE_LAUNCH_CHECKLIST.md).

---

## 6. Test results

**File:** `teacher/src/__tests__/pages/IrrShell.test.jsx`

7 tests, all green:

| Test | Assertion |
|---|---|
| renders create state when no IRR exists (404 — no toast) | `irr-shell` visible; `save-btn` present; `activate-btn` absent; `showError` not called |
| shows error toast on non-404 load failure | `showError` called on 500 |
| renders draft IRR with activate button and status badge | `activate-btn` visible; "Qoralama" badge visible |
| calls POST to create new IRR when none exists | `api.post('/teacher/children/child-123/irr', ...)` called; success toast fires |
| calls PATCH on save when IRR already exists | `api.patch('/teacher/irr/irr-1', ...)` called; success toast fires |
| shows Uzbek field labels in error banner on 400 IRR_HEADER_INCOMPLETE | `activate-error-banner` visible; contains "Қўшимча маълумотлар" and "ИРР бошланган сана"; error toast fires |
| calls success toast and reloads on successful activation | success toast; "Faol" status badge appears; `activate-btn` disappears |

Pattern: Vitest + stable mock handles + `vi.resetModules()` in `beforeEach` + dynamic `await import()` inside each test.

---

## 7. What is NOT built (Phase 3b–3d)

- Assessment scoring screen (17 criteria, 5-point scale) — Phase 3b
- Long-term goals / goal periods / short-term goals UI — Phase 3c
- Daily / weekly / quarterly monitoring journals — Phase 3d
- Archive action (no UI, backend endpoint exists)
- IRR status transition from active → archived (admin/manager action per OQ-12)
