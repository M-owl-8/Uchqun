# TP-PAGE-CHROME — Teacher portal page chrome

**Status:** ✅ CLOSED — commit fb7a75a  
**Scope:** teacher portal — all pages

---

## Root cause evidence

### Ghost headers (9 pages)
All teacher pages copied a hero-style header designed for a dark/image background
(`text-white drop-shadow-sm` on `bg-surface`). The result is invisible text.
Fix: letterhead convention adopted from admin CLEANUP-07 series.

**Before (example ParentManagement.jsx):**
```jsx
<h1 className="text-4xl font-black text-white tracking-tight drop-shadow-sm">
<p  className="text-white/90 font-medium mt-1 drop-shadow-sm">
```

**After (all 9 pages):**
```jsx
<h1 className="text-[22px] font-semibold text-slate-900">{t('...')} ({list.length})</h1>
<p  className="text-[13px] text-slate-500 mt-0.5">{t('...')}</p>
```

Pages fixed: ParentManagement, Media, Chat, Settings, Profile, Activities, Meals,
MonitoringJournal, TherapyManagement.

---

### Attendance month grid truncation
**Faulty line:** `<div className="max-w-lg mx-auto pb-32">` (root return wrapper).  
`max-w-lg` = 512 px. A 30-day June grid needs ≥1024 px
(140 px name col + 30×32 px day cols + 44 px total col). The range builder was correct
— all 30 dates were generated; the table just overflowed the container and was clipped.

**Fix:** restructured return so view tabs + date nav + daily content are in a
`max-w-lg mx-auto` inner wrapper; week/month HistoryGrid renders at full container width.
Also removed `-mx-1` bleed from HistoryGrid outer div and renamed `children` prop to
`childList` to fix `react/no-children-prop` lint error.

---

### Sidebar / page mismatch
`/teacher/parents` route opens a parent-list page. Sidebar item was labelled
"Guruh ro'yxati" (children group list), creating a conceptual mismatch.
Chat item "Ota-onalar" collided with the parent-list concept.

**Fix:**
- `sidebar.childrenList`: "Guruh ro'yxati" → "Ota-onalar ro'yxati" / "Parent List" / "Список родителей"
- `sidebar.chat`: "Ota-onalar" → "Muloqot" / "Messages" / "Сообщения"
- `parentsPage.title/subtitle` updated ×3 locales to match

---

## Files changed

| File | Change |
|------|--------|
| `teacher/src/pages/ParentManagement.jsx` | letterhead header, (N) count |
| `teacher/src/pages/Media.jsx` | letterhead header, (N) count |
| `teacher/src/pages/Chat.jsx` | letterhead header |
| `teacher/src/pages/Settings.jsx` | letterhead header |
| `teacher/src/pages/Profile.jsx` | letterhead header |
| `teacher/src/pages/Activities.jsx` | letterhead header |
| `teacher/src/pages/Meals.jsx` | letterhead header, text-white/70 label fix |
| `teacher/src/pages/MonitoringJournal.jsx` | letterhead header |
| `teacher/src/pages/TherapyManagement.jsx` | letterhead header |
| `teacher/src/pages/Attendance.jsx` | container restructure, -mx-1 removed, childList rename |
| `teacher/src/components/Sidebar.jsx` | defaultValue updates for childrenList + chat |
| `teacher/src/locales/uz/common.json` | sidebar.childrenList, sidebar.chat, parentsPage ×2 |
| `teacher/src/locales/en/common.json` | sidebar.childrenList, sidebar.chat, parentsPage ×2 |
| `teacher/src/locales/ru/common.json` | sidebar.childrenList, sidebar.chat, parentsPage ×2 |

---

## Gates

| Gate | Result |
|------|--------|
| `verify-i18n.js` | ✅ 226 keys, all 3 lang files match |
| Backend tests: attendance + i18n | ✅ 40/40 pass |
| Lint errors in touched files | ✅ 0 (DayStack.jsx errors are pre-existing) |
| git push origin main | ✅ fb7a75a |

---

## User verification steps

1. Open teacher portal → all page titles readable (dark text on light background)
2. Attendance → switch to Oy tab → full 30-day grid visible with horizontal scroll
3. Sidebar: "Bolalar" section item reads "Ota-onalar ro'yxati" (not "Guruh ro'yxati")
4. Sidebar: "Aloqa" section chat item reads "Muloqot" (not "Ota-onalar")
5. `/teacher/parents` page title reads "Ota-onalar ro'yxati"
