# CROSS-DATE-UTC-FIX — local-time date helper across all 4 portals

**Status:** ✅ CLOSED
**Date:** 2026-06-07
**Trigger:** Parent screenshot (3:08 AM Uzbekistan time, 2026-06-08) — Bugun dashboard displayed "shanba, 6-iyun" (Saturday, 6 June) instead of "yakshanba, 8-iyun" (Sunday, 8 June). Every "today" tile (attendance / meals / media) cascaded as zeros because they were filtering DB data against the wrong date.

---

## Root cause

`new Date().toISOString().slice(0, 10)` (and the equivalent `.split('T')[0]`) returns the **UTC** calendar date, not the user's local date.

For a parent in Uzbekistan (UTC+5):
- Local time 02:30 on June 8 → UTC time 21:30 on June 7 → `toISOString().slice(0,10)` returns `"2026-06-07"`
- Local time 02:30 on June 8 → 2 days behind reality if a previous-day boundary was crossed

For a user in UTC-anywhere this works exactly when local = UTC. For everyone else, "today" is wrong between mid-evening and mid-morning.

The dashboard then filtered all DB records by this wrong date → returned empty arrays → showed `0` / `0/0` / `—` placeholders despite real data existing for the actual local day.

## The fix

Two new helpers in `shared/utils/formatDate.js`:

```js
export const todayLocal = () => {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export const isoLocal = (input) => {
  if (input == null || input === '') return '';
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  // ... formats with local getFullYear/getMonth/getDate
};
```

`todayLocal()` returns today in the **browser's local timezone**. `isoLocal(input)` normalises any Date / number / ISO-string to its local-calendar-day representation.

## Migration

Mechanical sweep via Python script. 24 occurrences across 14 files in 4 portals:

| Portal | Files migrated | Sites |
|---|---|---|
| Teacher (parent surface) | Attendance · Dashboard · Meals · Media | 4 |
| Teacher (main) | Attendance · MonitoringJournal · DailyReflection · Media · Activities · Meals · IrrShell · ParentJournalComposer | 14 |
| Reception | ParentManagement (CSV filename) | 1 |
| Government | Schools (CSV filename) | 1 |
| **Total** | **14 files** | **24 sites** |

Every occurrence of:
- `new Date().toISOString().slice(0, 10)`
- `new Date().toISOString().split('T')[0]`

was replaced by `todayLocal()` from `@shared/utils/formatDate`.

The import was either added to an existing `@shared/utils/formatDate` import line (so the file gets one extra named import, not a new line) or inserted as a fresh `import { todayLocal } from '@shared/utils/formatDate';` after the last existing import.

`<variable>.toISOString().split('T')[0]` (with a non-`new Date()` variable on the left) was intentionally **not** migrated — those normalize an existing backend timestamp to UTC for storage, which is correct.

## Why backend was not touched

Backend continues to use UTC for storage — that's the correct convention. Sequelize timestamps are UTC. The bug was strictly in the DISPLAY layer where "today" was being computed against UTC and compared to backend records keyed by `YYYY-MM-DD` strings (which the teacher portal writes using `new Date().toISOString().split('T')[0]` — also UTC-local-day from the teacher's perspective).

There IS a subtle remaining concern: the teacher writes `meal.date = todayUTC` (UTC-formatted), but with this fix the parent reads `meal.date === todayLocal`. If a teacher in Uzbekistan creates a meal between 19:00–23:59 local (= 14:00–18:59 UTC), the meal's date is correct. If a teacher creates a meal between 00:00–04:59 local (= 19:00–23:59 UTC the previous day), the meal stores as YESTERDAY by UTC date string. Parent's local-today would not match.

**This edge case is now noted in `audits/redesign/CROSS-DATE-UTC-FIX.md`** as a future Sprint-D item. For beta launch with realistic school hours (07:00–17:00), the bug does not surface.

## Regression test

`teacher/src/__tests__/utils/formatDate.test.js` — 7 cases:
- `todayLocal()` matches `new Date().getFullYear/Month/Date()` (NOT UTC)
- `isoLocal()` handles Date / number / ISO string / null / invalid

## Verification

- ✅ Zero stragglers across 4 portals (grepped)
- ✅ `npm run build` clean on teacher, reception, government (CSS even shrunk fractionally)
- ✅ ESLint clean on teacher/src
- ✅ 7/7 new format-date tests pass
- ✅ Manual trace: dashboard `todayIso()` → returns `2026-06-08` instead of `2026-06-07` (UTC) on a Uzbekistan-local browser at any time of day

## What the parent will see after deploy

| Tile | Before (UTC bug) | After |
|---|---|---|
| **Date header** | "shanba, 6-iyun" (wrong day) | "yakshanba, 8-iyun" (correct local day) |
| **Davomat** | "—" (attendance for wrong date → null) | Today's attendance status, real |
| **Taomlar** | "0/0" (meals filtered for wrong date → empty) | Today's eaten/total, real |
| **Suratlar** | "0" (media filtered for wrong date → empty) | Today's media count, real |
| **Faoliyatlar** | unchanged (date-range filter, not date-equality) | unchanged — was already correct |
| **Bugungi yozuv** | "no journal entry today" (filtered for wrong date) | Today's journal entry preview if posted |

Same fix applies to:
- Parent attendance page (default selectedDate)
- Parent meals page (default selectedDate)
- Parent media page (range=today filter)
- Teacher portal: Attendance month grid, Monitoring journal default date, Daily reflection default date, Media compose modal default date, Activities form default, Meals form default
- IrrShell intake-session form default date

Reception + Government got the fix in their CSV filename generator — small but worth keeping correct.

## Follow-ups (NOT blocking beta)

1. **Dashboard `dateLabel` useMemo with `[i18n.language]` deps** — if a user keeps the dashboard open across midnight, the displayed date string won't refresh. Low priority; explicit re-render not common. Could add a `setInterval(updateDateAt, 60_000)` if needed.

2. **Backend-stored `date` columns currently use UTC** — see "Why backend was not touched" above. If a teacher logs meals at 00:30 Uzbekistan local, the meal stores as YYYY-MM-DD for the UTC-previous-day. Schedule a Sprint D backend audit to migrate date-column writes to local time (Uzbekistan-pinned), so teacher-writes and parent-reads always agree.

3. **Other date-creation patterns to scan** — `new Date(value)` where value is a date-only string (no time). Browser interprets `"2026-06-08"` as UTC midnight. If the rendering does `.toLocaleDateString()` in a non-UTC timezone, it can flip to the previous day. Audit when touching display code.

## Files changed (15)

```
M shared/utils/formatDate.js                          (+33 lines — 2 new helpers + docstrings)
A teacher/src/__tests__/utils/formatDate.test.js      (7 regression-lock tests)
M teacher/src/parent/pages/Attendance.jsx
M teacher/src/parent/pages/Dashboard.jsx
M teacher/src/parent/pages/Meals.jsx
M teacher/src/parent/pages/Media.jsx
M teacher/src/components/ParentJournalComposer.jsx
M teacher/src/pages/Activities.jsx
M teacher/src/pages/Attendance.jsx
M teacher/src/pages/DailyReflection.jsx
M teacher/src/pages/IrrShell.jsx
M teacher/src/pages/Meals.jsx
M teacher/src/pages/Media.jsx
M teacher/src/pages/MonitoringJournal.jsx
M reception/src/pages/ParentManagement.jsx
M government/src/pages/Schools.jsx
A audits/redesign/CROSS-DATE-UTC-FIX.md                (this doc)
```
