# IRR-MONTHLY-MILESTONES (Option B)

Per-month projected milestones for each long-term goal — 12 markers
spanning the IRR's 12-month window. Captures the teacher's forward-looking
target ("by month 3 the child will follow 2-step instructions") and, when
the month is reached, the actual outcome.

Earlier the IRR only measured progress at 5 quarterly timepoints (intake,
3mo, 6mo, 9mo, 12mo). This adds a per-month narrative trajectory that
parents and admins can read alongside the quarterly assessments.

## Data model

New table `monthly_milestones`:

| Column | Type | Notes |
|---|---|---|
| `id` | UUID PK | |
| `irrId` | UUID FK → `irrs` | CASCADE on delete |
| `longTermGoalId` | UUID FK → `long_term_goals` | CASCADE on delete |
| `childId` | UUID FK → `children` | SET NULL on delete (paranoid: child cascade soft-delete) |
| `schoolId` | UUID FK → `schools` | RESTRICT on delete |
| `monthNumber` | INTEGER | DB CHECK 1 ≤ N ≤ 12 |
| `targetText` | TEXT NOT NULL | ≤ 2000 chars |
| `status` | ENUM | `planned` (default) · `achieved` · `partial` · `missed` |
| `actualText` | TEXT NULL | ≤ 2000 chars, captured when assessed |
| `assessedAt` | DATEONLY NULL | |
| `assessedBy` | UUID FK → `users` NULL | SET NULL on delete, populated on status change |
| `notes` | TEXT NULL | ≤ 2000 chars |
| `createdAt` / `updatedAt` | DATE | non-paranoid |

Indexes: `(irrId)`, `(longTermGoalId)`, `(childId, monthNumber)`,
`(schoolId)`, and a **unique constraint** on
`(longTermGoalId, monthNumber)` — at most one milestone per goal per month.

afterDestroy audit hook fires on delete (`logAudit` entity:
`monthly_milestones`).

## API

Mounted on `/api/v1/teacher`:

| Method | Path | Role | What |
|---|---|---|---|
| GET | `/irr/:irrId/monthly-milestones` | teacher (assigned) | All milestones for the IRR |
| GET | `/long-term-goals/:ltgId/monthly-milestones` | teacher (assigned) | All 12 for one LTG |
| POST | `/long-term-goals/:ltgId/monthly-milestones` | `teacher` | Upsert one (idempotent on `(ltg, month)`) |
| PUT | `/long-term-goals/:ltgId/monthly-milestones/bulk` | `teacher` | Replace all 12 in one shot |
| PATCH | `/monthly-milestones/:id` | `teacher` | Update target / status / actual / notes |
| DELETE | `/monthly-milestones/:id` | `teacher` | Remove (audit-logged) |

Authorization (defense-in-depth):
- Route-level: `requireRole('teacher')` on every write endpoint.
- Controller-level: `req.user.role === 'teacher'` re-check in `create`,
  `replaceAll`, `update`, `remove`.
- Resource-level: school-scope (`schoolId === req.user.schoolId`) +
  teacher-assignment (`isTeacherAssignedToChild`) on every handler.

Bulk replace semantics: months not present in the payload are **deleted
only if status was `planned`**. Evaluated milestones (`achieved` /
`partial` / `missed`) are preserved — protects clinical history from a
careless re-save.

## Error codes

15 new codes added to `audits/backend/i18n-error-codes.md` and to
`backend/i18n/{ru,uz-latn,uz-cyrl}.json`. `EXPECTED_CODE_COUNT` in
`i18n.test.js` bumped 229 → 244.

- `MONTHLY_MILESTONE_FORBIDDEN` (403)
- `MONTHLY_MILESTONE_IRR_NOT_ACCESSIBLE` (404)
- `MONTHLY_MILESTONE_LTG_NOT_ACCESSIBLE` (404)
- `MONTHLY_MILESTONE_NOT_ACCESSIBLE` (404)
- `MONTHLY_MILESTONE_INVALID_MONTH` (400)
- `MONTHLY_MILESTONE_TARGET_REQUIRED` (400)
- `MONTHLY_MILESTONE_INVALID_STATUS` (400)
- `MONTHLY_MILESTONE_TEXT_TOO_LONG` (400)
- `MONTHLY_MILESTONE_INVALID_PAYLOAD` (400)
- `MONTHLY_MILESTONE_DUPLICATE_MONTH` (400)
- `MONTHLY_MILESTONE_LIST_FAILED` (500)
- `MONTHLY_MILESTONE_CREATE_FAILED` (500)
- `MONTHLY_MILESTONE_UPDATE_FAILED` (500)
- `MONTHLY_MILESTONE_BULK_FAILED` (500)
- `MONTHLY_MILESTONE_DELETE_FAILED` (500)

## Frontend

New component `teacher/src/pages/irr/MonthlyMilestones.jsx`:

- Mounted under each long-term goal row inside `IrrShell.jsx`.
- Collapsed by default with a `Oylik nishonlar (12 oy)` toggle row showing
  N/12 fill count. Doesn't fetch until expanded.
- **View mode**: 12-row grid; filled months show `targetText` + status pill +
  optional `actualText`; unset months render dashed placeholder "Belgilanmagan".
- **Edit mode**: 12 textareas with status select; when status leaves
  `planned`, an additional input appears for `actualText`. "Save all"
  posts the bulk endpoint. "Cancel" reverts drafts to server state.
- Loads via `GET /teacher/long-term-goals/:ltgId/monthly-milestones`;
  saves via `PUT .../bulk`. Empty target rows are filtered out of the
  payload (only filled months saved).
- `isReadOnly` prop hides the edit affordance (passed through from IrrShell
  for archived IRRs).

Locales: `irr.monthlyMilestones.*` keys added in `uz`, `en`, `ru`. The
locale check confirms full coverage.

## Tests

22 controller tests cover:
- Role gate (403 for non-teacher)
- School-scope (404 for cross-school IRR/LTG/milestone — opacity rule)
- Teacher-assignment denial (404 even when school matches)
- UUID validation
- Month range 1-12
- Required `targetText` + length
- Status enum
- Upsert idempotency on `(ltg, month)`
- `assessedBy` population on status change
- Bulk: rejects non-array, rejects duplicate months, preserves evaluated
  rows on partial re-save

Full backend suite: **1501 / 1501 pass** (was 1479; +22).

## Migration

`backend/migrations/20260609000002-create-monthly-milestones.js` — creates
table, indexes, unique constraint, and DB-level CHECK for the month range.
Down migration drops the table cleanly.

## Files

```
NEW:
  backend/models/MonthlyMilestone.js
  backend/controllers/teacher/monthlyMilestoneController.js
  backend/migrations/20260609000002-create-monthly-milestones.js
  backend/__tests__/controllers/monthlyMilestone.test.js
  teacher/src/pages/irr/MonthlyMilestones.jsx
  audits/redesign/IRR-MONTHLY-MILESTONES.md

MODIFIED:
  backend/models/index.js                         (import + registry + 5 assoc + 1 hook + re-export)
  backend/routes/teacherRoutes.js                 (6 new routes)
  backend/i18n/{ru,uz-latn,uz-cyrl}.json          (+15 keys each)
  audits/backend/i18n-error-codes.md              (+Monthly Milestones section)
  backend/__tests__/i18n.test.js                  (EXPECTED_CODE_COUNT 229 → 244)
  teacher/src/pages/IrrShell.jsx                  (+import, render <MonthlyMilestones />)
  teacher/src/locales/{uz,en,ru}/common.json      (+irr.monthlyMilestones.* + irr.loading)
```
