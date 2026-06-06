# PP-DATE-LOCALE — Parent portal date rendering migrated to shared util

**Status:** 🟡 S6 in progress (pending user Railway verification)
**Scope:** Every date/time render in `teacher/src/parent/**` now routes through `shared/utils/formatDate.js`, driven by `i18next.language` — no hardcoded BCP-47 literals, no per-page formatters, no custom month/weekday arrays.
**Brief rule honored:** every "no hardcoded locale" / "no custom formatter" claim below is backed by a pasted grep.

---

## 1. Shared util — confirmed coverage + three new helpers

`shared/utils/formatDate.js` already had `formatDateShort` / `formatDateMedium` / `formatDateLong` / `formatTime` / `formatDateTime` (S2b). The parent migration surfaced three new format styles, so this session **added them to the shared util** (teacher will inherit them when needed — single source of truth):

| New helper | Format options | Used by |
|---|---|---|
| `formatDateWeekdayMonth` | `{ weekday: 'long', day: 'numeric', month: 'long' }` (NO year) | `DayCard` (dashboard "juma, 5-iyun"); `Meals` date-picker weekday line |
| `formatDateMonthLong` | `{ year: 'numeric', month: 'long', day: 'numeric' }` (NO time) | `EmotionalMonitoringSection` record date; `Meals` summary header |
| `formatDateTimeLong` | `{ year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }` | `MessagesModal` createdAt + repliedAt; `Notifications` createdAt |

All three follow the existing pattern: `toDate()` guard, `resolveLocale()` mapping, `Intl.DateTimeFormat` via `toLocaleX(locale, options)`. The util's `LOCALE_MAP` (`uz → uz-Latn-UZ`, `en → en-US`, `ru → ru-RU`) is unchanged — both portals share it.

---

## 2. Migration inventory — before / after

### Before S6 (full grep, parent-only)

```
$ grep -rnE "toLocaleDateString|toLocaleTimeString|toLocaleString\b" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
teacher/src/parent/components/DayCard.jsx:5
teacher/src/parent/pages/TeacherRating.jsx:222
teacher/src/parent/pages/TeacherRating.jsx:544
teacher/src/parent/pages/ChildIRR.jsx:212, :303, :305, :342
teacher/src/parent/pages/childProfile/EmotionalMonitoringSection.jsx:52
teacher/src/parent/pages/childProfile/MessagesModal.jsx:105, :155
teacher/src/parent/pages/Media.jsx:616, :702
teacher/src/parent/pages/Notifications.jsx:177
teacher/src/parent/pages/AIWarnings.jsx:180
teacher/src/parent/pages/ChildProfile.jsx:284
teacher/src/parent/pages/Activities.jsx:119, :130, :225, :236

$ grep -rnE "Intl\.DateTimeFormat" teacher/src/parent --include='*.jsx'
teacher/src/parent/pages/Meals.jsx:65, :70

$ grep -rnE "'uz-UZ'|'uz-Latn-UZ'|'ru-RU'|'en-US'" teacher/src/parent --include='*.jsx'
teacher/src/parent/components/DayCard.jsx:3            'uz-UZ' (default parameter)
teacher/src/parent/pages/TeacherRating.jsx:43-46       per-page locale map
teacher/src/parent/pages/Media.jsx:456-459             per-page locale map
teacher/src/parent/pages/Notifications.jsx:33-36       per-page locale map
teacher/src/parent/pages/ChildProfile.jsx:23           inline locale map
teacher/src/parent/pages/Activities.jsx:24-27          per-page locale map
teacher/src/parent/pages/Meals.jsx:35-40, :70          localeCandidates array
```

### Per-site classification

| Site:line | Call type before | After |
|---|---|---|
| `DayCard.jsx:5` | `toLocaleDateString(locale, …)` with hardcoded default `'uz-UZ'` | `formatDateWeekdayMonth(date, i18n.language)` |
| `TeacherRating.jsx:222` | `toLocaleString(locale)` — per-page locale map | `formatDateTime(dateValue, i18n.language)` |
| `TeacherRating.jsx:544` | same | `formatDateTime(schoolRating.updatedAt, i18n.language)` |
| `ChildIRR.jsx:212, :303, :305, :342` | **bare** `toLocaleDateString()` (browser default — not UI language) | `formatDateMedium(x, i18next.language)` (i18next imported directly so the 4 JSX-expression sites don't need a hook refactor) |
| `EmotionalMonitoringSection.jsx:52` | `toLocaleDateString(i18n.language, …)` — i18n.language was a bare `'uz'` which isn't a valid BCP-47 tag | `formatDateMonthLong(record.date, i18n.language)` — now mapped through `resolveLocale` to `uz-Latn-UZ` |
| `MessagesModal.jsx:105, :155` | same i18n.language-direct bug | `formatDateTimeLong(msg.{createdAt,repliedAt}, i18n.language)` |
| `Media.jsx:616` | `toLocaleDateString(locale)` — per-page locale map | `formatDateMedium(item.date, i18n.language)` |
| `Media.jsx:702` | `toLocaleDateString(locale, { weekday, year, month, day })` | `formatDateLong(selectedMedia.date, i18n.language)` |
| `Notifications.jsx:177` | `toLocaleString(locale, { day, month-long, year, hh:mm })` | `formatDateTimeLong(notification.createdAt, i18n.language)` |
| `AIWarnings.jsx:180` | **bare** `toLocaleString()` — browser default | `formatDateTime(warning.createdAt, i18n.language)` |
| `ChildProfile.jsx:284` | `toLocaleDateString(locale)` — inline locale map | `formatDateMedium(child.dateOfBirth, i18n.language)` |
| `Activities.jsx:119, :130, :225, :236` | `toLocaleDateString(locale)` — per-page locale map | `formatDateMedium(activity.{start,end}Date, i18n.language)` |
| `Meals.jsx:65, :70` | **custom `Intl.DateTimeFormat`** with `localeCandidates` try-loop + **custom `uzMonthsLong` + `uzWeekdaysShort` arrays** in UZ Latin | full block deleted; 2 call sites → `formatDateWeekdayMonth` + `formatDateMonthLong` |

### After S6 (final grep — paste-ready proof)

```
$ grep -rnE "toLocaleDateString|toLocaleTimeString|toLocaleString\b" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)

$ grep -rnE "Intl\.DateTimeFormat" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)

$ grep -rnE "'uz-UZ'|'uz-Latn-UZ'|'ru-RU'|'en-US'|'en-GB'" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)

$ grep -rnE "uzMonths|uzWeekdays|'yanvar'|'iyun'|'noyabr'|'dekabr'|'sentabr'|'oktabr'" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)

$ grep -rnE "^\s*const locale\b" teacher/src/parent --include='*.jsx' --include='*.js' | grep -v __tests__
(empty)
```

**All five gates are empty.** Note: `Media.jsx:85` still has a `formatTime(seconds)` helper — that's a **video-player MM:SS converter** (seconds → "12:34"), not a locale-aware date function. Intentionally local and out of scope.

---

## 3. Honest count

| Metric | Before S6 | After S6 |
|---|---|---|
| `toLocaleX` calls in parent | 18 | **0** |
| `Intl.DateTimeFormat` calls in parent | 2 | **0** |
| Hardcoded BCP-47 literals (`'uz-UZ'` etc.) | 17 across 6 files | **0** |
| Per-page locale maps | 5 (TeacherRating, Media, Notifications, ChildProfile, Activities) + Meals's `localeCandidates` array | **0** |
| Custom UZ month/weekday arrays | 1 (`Meals.jsx` `uzMonthsLong` + `uzWeekdaysShort`) | **0** |
| Custom `formatDate` per-page functions | 2 (`DayCard.jsx`, `Meals.jsx`) | **0** |
| Bare `toLocaleX()` (no locale arg → browser default) | 5 (ChildIRR ×4, AIWarnings ×1) | **0** |
| Files importing from `@shared/utils/formatDate` | 0 in parent | 11 |

---

## 4. Files modified in S6

| File | Change |
|---|---|
| `shared/utils/formatDate.js` | + 3 helpers (`formatDateWeekdayMonth`, `formatDateMonthLong`, `formatDateTimeLong`) — teacher inherits |
| `teacher/src/parent/components/DayCard.jsx` | Removed local `formatDate` (hardcoded `'uz-UZ'`); imports + uses `formatDateWeekdayMonth`; added `useTranslation()` hook |
| `teacher/src/parent/pages/TeacherRating.jsx` | Removed per-page `locale` `useMemo`; 2 call sites → `formatDateTime`; dependency `[rating, locale]` → `[rating, i18n.language]` |
| `teacher/src/parent/pages/ChildIRR.jsx` | + `i18next` direct import + `formatDateMedium`; 4 bare `toLocaleDateString()` sites migrated |
| `teacher/src/parent/pages/Media.jsx` | Removed per-page locale map; 2 sites → `formatDateMedium` / `formatDateLong` |
| `teacher/src/parent/pages/Notifications.jsx` | Removed per-page locale map; 1 site → `formatDateTimeLong` |
| `teacher/src/parent/pages/ChildProfile.jsx` | Removed inline locale map; 1 site → `formatDateMedium` |
| `teacher/src/parent/pages/Activities.jsx` | Removed per-page locale map; 4 sites → `formatDateMedium` |
| `teacher/src/parent/pages/AIWarnings.jsx` | Bare `toLocaleString()` → `formatDateTime`; destructured `i18n` from `useTranslation` |
| `teacher/src/parent/pages/childProfile/EmotionalMonitoringSection.jsx` | 1 site → `formatDateMonthLong` |
| `teacher/src/parent/pages/childProfile/MessagesModal.jsx` | 2 sites → `formatDateTimeLong` |
| `teacher/src/parent/pages/Meals.jsx` | **Largest deletion** — `uzMonthsLong`/`uzWeekdaysShort` arrays, `localeCandidates` array, and the entire custom `formatDate` function block (~44 lines). 2 call sites migrated to `formatDateWeekdayMonth` / `formatDateMonthLong` |

---

## 5. Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS (774 keys unchanged) |
| Five-grep zero-match proof (§2 above) | ✅ all empty |
| ESLint / Vitest | ⚠️ pending CI — sandbox cannot install full dep tree |

The shared util's `LOCALE_MAP` (`uz → uz-Latn-UZ`) means even when a caller passes a bare `'uz'` (as `i18next.language` does until the language detector flips it to a region-tagged value), `resolveLocale` hits the correct BCP-47 locale. **This is the actual fix for the PP-AUDIT C.1 "juma, 5-iyun under any UI language" report**: the old hardcoded `'uz-UZ'` (or bare `i18n.language` of `'uz'`) bypassed the LOCALE_MAP entirely.

---

## 6. User Railway verification

Open the parent portal in three different UI languages (the language switcher is in the parent sidebar / desktop top-nav). For each language, walk these pages and confirm dates render in the chosen language:

| Page | Field | UZ expected | RU expected | EN expected |
|---|---|---|---|---|
| Dashboard (`/`) | DayCard greeting date | `juma, 5-iyun` (or near it — uz-Latn-UZ output) | `пятница, 5 июня` | `Friday, June 5` |
| ChildProfile (`/child`) | Child birth date | uz-Latn medium (e.g. `15.06.2018`) | `15.06.2018` | `06/15/2018` |
| Activities (`/activities`) | start/end date row + modal | localized | localized | localized |
| Meals (`/meals`) | header `formatDateMonthLong` + date-picker weekday line | localized (no hardcoded `iyun` leak in RU/EN) | localized | localized |
| Media (`/media`) | item card date + selected modal weekday line | localized | localized | localized |
| ChildIRR (`/irr`) | session completedAt + period start/end + STG discussion | localized | localized | localized |
| Notifications (`/notifications`) | createdAt timestamp | localized (long month + time) | localized | localized |
| TeacherRating (`/rating`) | last-updated stamp | localized (long + time) | localized | localized |
| AIWarnings (`/warnings`) | warning createdAt | localized | localized | localized |
| EmotionalMonitoring (within ChildProfile) | record date | localized | localized | localized |
| MessagesModal (Profile → messages) | msg.createdAt + msg.repliedAt | localized with hh:mm | localized | localized |

**Specifically confirm: no `juma` / `iyun` leak in RU or EN mode** anywhere. Today's date is also correct (not stale, not off-by-one — the issue was always the locale, not the day).

Reply "verified" → `LOOP_TRACKER.md` `PP-DATE-LOCALE` to ✅.

---

## S7 flag (as required by the brief)

**S7 PP-ATTENDANCE-SURFACE** — PP-AUDIT B.3 confirmed the surface is structurally missing (no `/parent/attendance` route, no fetch in `teacher/src/parent/`). It needs a new backend route + controller + a parent page wired to it.

**Migration-side flag:** the `ChildAttendance` model and `child_attendances` table already exist (created earlier — see `backend/models/ChildAttendance.js` and the corresponding migration), so **S7 does NOT need a Postgres migration**. It's read-only on existing rows from the parent side. Verification of the parent fetch result will need either the `postgres-uchqun` MCP (terminal Claude) or a Railway-side smoke test — but the build itself is unblocked.

This means S7 can run in this web sandbox: backend route + controller + parent page + unit tests, push, deploy. Live verification is the only step that needs the user (or the terminal session) to attach to Railway.
