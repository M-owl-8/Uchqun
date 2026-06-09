# TP-MONITORING-SEPARATION

Extract daily / weekly monitoring out of IrrShell into a dedicated monitoring
hub. Monitoring becomes a stand-alone daily-ops surface; IRR stays the
strategic clinical document.

## Why

Two distinct cadences and mental models were mashed into one page:

| | IRR | Monitoring |
|---|---|---|
| Cadence | 12-month roadmap, quarterly reviews | Daily, weekly |
| Mental model | Strategic, deliberate, signed | Operational, fast |
| Surface area | Assessments, long-term goals, periods | 27-item daily checklist, 18-item weekly checklist, emotional state |

IrrShell.jsx was ~1786 lines, ~265 of which were monitoring UI nested
inside the IRR shell. Teachers had to navigate into a child's IRR detail
just to fill out daily hygiene/health/GI checks — even though the records
are not strictly tied to an IRR (`irrId` is nullable on
DailyMonitoringEntry and WeeklyMonitoringEntry).

## What changed

### New files

- `teacher/src/pages/monitoring/DailyMonitoringTab.jsx` — daily 27-item
  checklist form, accepts `childId` prop. Posts to
  `POST /teacher/children/:id/daily-entries` with `irrId: null`. Renders
  hygiene (9) + health (11) + GI (7) sections + notes + 30-entry history.
- `teacher/src/pages/monitoring/WeeklyMonitoringTab.jsx` — weekly 18-item
  checklist form, accepts `childId` prop. Posts to
  `POST /teacher/children/:id/weekly-entries` with `irrId: null`. Renders
  emotional (9) + environment (9) sections + notes + 12-entry history.

### Modified

- **`teacher/src/pages/MonitoringJournal.jsx`** — rebuilt as a tabbed
  hub. Three tabs:
  - **Emotsional** — existing emotional state grid + bulk-fill (preserved)
  - **Kunlik** — child selector + DailyMonitoringTab
  - **Haftalik** — child selector + WeeklyMonitoringTab
  Active tab and selected child are URL-state (`?tab=…&childId=…`) so the
  IRR shell can deep-link directly to monitoring for a specific child.

- **`teacher/src/pages/IrrShell.jsx`** — removed ~340 lines:
  - 2 daily/weekly state blocks (`dailyChecks`, `weeklyChecks`,
    `dailyNotes`, `weeklyNotes`, errors, saving, entries)
  - 2 loaders (`loadDailyEntries`, `loadWeeklyEntries`)
  - 2 submit handlers (`handleSubmitDaily`, `handleSubmitWeekly`)
  - 263-line Daily + Weekly UI sections
  - `getMondayIso` helper (now in WeeklyMonitoringTab)
  - `DAILY_JOURNAL_ITEMS` + `WEEKLY_JOURNAL_ITEMS` imports
  Added: a single banner link "Kunlik va haftalik kuzatuv jurnali →"
  pointing to `/teacher/monitoring?childId={id}`.

- **`teacher/src/pages/Reja.jsx`** — added a 3rd sub-tab "Kuzatuv"
  rendering MonitoringJournal alongside Activities + Therapy. Zero IA
  churn (still 5 primary tabs).

- **`teacher/src/components/MonitoringBulkFill.jsx`** — renamed
  `children` prop → `childrenList` (React reserves `children`; ESLint
  flagged `react/no-children-prop`).

### i18n

- 23 new `monitoring.*` keys + 3 `irr.monitoringLink.*` keys + 1
  `reja.tabMonitoring` key added to `uz`, `en`, `ru` catalogs.
- `monitoring.title` updated from "Haftalik monitoring jurnali" to
  "Kuzatuv jurnali" / "Monitoring journal" / "Журнал мониторинга" to
  reflect the broadened scope.
- `monitoring.subtitle` updated similarly.

### Backend

No changes. `irrId` was already nullable on daily/weekly entries; we
just stop populating it. Endpoints, models, migrations untouched.

## Test counts

- Backend: **1479 / 1479 pass** (unchanged — backend was not touched)
- Admin: **163 / 163 pass** (unchanged)
- Teacher `check:locales`: **PASS** (UZ/EN/RU all complete)
- Teacher `npx eslint` on touched files: clean
- Teacher Vitest baseline: 138 pre-existing failures (`act() in
  production builds` env issue, unrelated to this work; baseline
  unchanged)

## Navigation

Teacher portal still has 5 primary tabs (Bugun · Bolalar · **Reja** · Xabar
· Men). The Reja tab now has 3 sub-tabs:
- Individual reja (Activities)
- Terapiya (TherapyManagement)
- **Kuzatuv** (MonitoringJournal — emotional + daily + weekly)

The standalone `/teacher/monitoring` route still works for direct linking
(including from IrrShell's deep link).

## Files

```
NEW:
  teacher/src/pages/monitoring/DailyMonitoringTab.jsx
  teacher/src/pages/monitoring/WeeklyMonitoringTab.jsx
  audits/redesign/TP-MONITORING-SEPARATION.md

MODIFIED:
  teacher/src/pages/MonitoringJournal.jsx     (rebuilt as 3-tab hub)
  teacher/src/pages/IrrShell.jsx              (-340 lines, +14 line link)
  teacher/src/pages/Reja.jsx                  (+1 sub-tab)
  teacher/src/components/MonitoringBulkFill.jsx (children → childrenList)
  teacher/src/locales/{uz,en,ru}/common.json  (+27 keys each; title/subtitle reworded)
```
