# TP-DAVOMAT-REWORK — Davomat (Attendance) Three-Part Rework

**Status:** 🟡 In progress — awaiting user verification  
**Commit:** (pending)  
**Scope:** Backend controller + model + migration + tests · Frontend grid + page · Locales ×3

---

## Part 1 — Fix save 400 (Bug)

### Root cause (with evidence)

**Payload the frontend sent:**
```json
{
  "records": [
    { "childId": "uuid1", "date": "2026-06-06", "status": "present" },
    { "childId": "uuid2", "date": "2026-06-06", "status": "unset" }
  ]
}
```

**Backend 400 response (verbatim):**
```json
{ "success": false, "error": "childId is required" }
```

**Root cause:** `attendanceController.js:10` destructured `const { childId, date, status, note } = req.body` — gets `undefined` because the body has a `records` array, not a top-level `childId`. Additionally, `status: 'unset'` was sent for unmarked children, which would also fail the old `VALID_STATUSES` check.

### Fix applied

- Backend: `createAttendance` rewritten to accept `{ records: [...] }` batch
- Skips records with `status === 'unset'` (no record saved for unmarked children)
- Per-record upsert: `findOne({ where: { childId, date } })` → update if exists, create if not (handles re-saving the same day)
- Returns `{ success: true, data: { saved, skipped, errors } }` — partial success is 201
- All-fail → 400 with `error.code` from first failure
- Frontend error toast: reads `err.response?.data?.error?.code` → looks up `t(`errors.${code}`)` → falls back to generic message

---

## Part 2 — Care-model presence status taxonomy

### Old statuses (day-school model)
`present`, `absent`, `late`, `excused`

### New statuses (care-institution presence census)
| Status | UZ Label | Meaning | Visual |
|---|---|---|---|
| `present` | Bor | Physically in the facility | Green border/check |
| `home_leave` | Uyda | Planned home visit | Amber border/Home icon |
| `sick` | Kasal | Sick at home, notified | Blue-grey border/Thermometer |
| `hospitalized` | Shifoxonada | Hospital/clinic | Purple border/Building2 |
| `absent` | Yo'q | Unexplained absence — **safeguarding event** | Red border/X — danger token |

### Migration: `20260606000001-update-attendance-status-enum.js`
```sql
-- Rename old type
ALTER TYPE enum_child_attendance_status RENAME TO enum_child_attendance_status_old;
-- Create new type
CREATE TYPE enum_child_attendance_status AS ENUM ('present','absent','home_leave','sick','hospitalized');
-- Migrate data
UPDATE child_attendance SET status = 'present' WHERE status = 'late';    -- late → present
UPDATE child_attendance SET status = 'sick'    WHERE status = 'excused'; -- excused → sick
-- Alter column
ALTER TABLE child_attendance ALTER COLUMN status TYPE enum_child_attendance_status USING status::text::enum_child_attendance_status;
-- Drop old
DROP TYPE enum_child_attendance_status_old;
```

### Safeguarding note (`absent`)
When `status === 'absent'`, `attendanceController.js` emits `logger.warn('ATTENDANCE_ABSENT safeguarding marker', { childId, date, teacherId })`. A dedicated alert pipeline for unexplained absences is a **future item** — no new alert infrastructure built here. Tracked as CP-ABSENT-ALERT for a future sprint.

---

## Part 3 — Presence history grid

### Date navigation
- Three view tabs: **Kunlik** (daily) | **Hafta** (week Mon–Sun) | **Oy** (month)
- Prev/Next buttons shift by 1 day / 1 week / 1 month respectively
- Date picker input (`<input type="date" max={today}`) — future dates blocked
- In daily view: navigating to a past date loads existing records for that date from `GET /attendance?startDate=&endDate=`; save button hidden when date is in the future

### Week/month grid (HistoryGrid component)
- Uses existing `GET /attendance?startDate=&endDate=` — no new backend endpoint needed
- Rows = children; Columns = dates in range; cells = colored dot per status
- Last column: `present-count / total-days` (only `present` counted as physically present)
- Status legend bar above grid
- Sticky first column (child name) via CSS `position: sticky left: 0`
- Horizontal scroll for months with many days

### Files changed
| File | Change |
|---|---|
| `backend/controllers/attendanceController.js` | Batch API, upsert, per-record error codes |
| `backend/models/ChildAttendance.js` | ENUM updated to 5 care-model values |
| `backend/migrations/20260606000001-…` | Enum rename + data migration + column alter |
| `backend/__tests__/attendance.test.js` | 21 tests (was 15), all batch-mode aware |
| `teacher/src/components/AttendanceGrid.jsx` | 6-state cycle, new icons (Home, Building2) |
| `teacher/src/pages/Attendance.jsx` | Full rewrite: tabs + date nav + HistoryGrid |
| `teacher/src/locales/uz/common.json` | 17 new attendance keys |
| `teacher/src/locales/en/common.json` | 17 new attendance keys |
| `teacher/src/locales/ru/common.json` | 17 new attendance keys |
| `audits/backend/i18n-error-codes.md` | Attendance section added (8 new codes) |

---

## Gates
- ✅ Backend tests: 21/21 pass
- ✅ check:locales: 657 keys, 0 missing  
- ✅ Build: green
- ⬜ Railway migration: pending deploy confirmation
- ⬜ User verification (6 steps)

---

## User Verification Steps
1. Mark all 3 present on today → Saqlash → success toast, persists after refresh
2. Set one child to Uyda, one to Shifoxonada → saves, filter chips count correctly
3. Force a validation error (e.g. network disconnect) → toast shows specific reason, not generic
4. Navigate to yesterday → view loads, future date `>` button disabled
5. Open Hafta and Oy views → grid renders, totals correct, status dots colored
6. Switch to RU + EN: all new strings translated → reply "verified"
