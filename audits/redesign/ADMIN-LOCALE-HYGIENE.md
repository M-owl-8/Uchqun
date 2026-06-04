# ADMIN-LOCALE-HYGIENE — Comprehensive Locale Drift Audit + Fix

**Date:** 2026-06-04  
**Status:** ✅ CLOSED (pending user Railway verification)  
**Commit:** 11beea7

---

## STEP 1 — Audit Findings

### Pages audited

| Page | UZ | RU | EN | Issues |
|---|---|---|---|---|
| Dashboard | ✅ | ❌ ACTION_META + timeAgo hardcoded | ❌ same | Cat 1: formatRelativeTime + ACTION_META labels |
| ReceptionManagement | ✅ | ✅ | ✅ | None (cleaned in CLEANUP-07e) |
| TeacherManagement | ✅ | ✅ | ✅ | None |
| ParentManagement | ✅ | ✅ | ✅ | None |
| DocumentApprovalQueue | ✅ | ✅ | ✅ | None (cleaned in CLEANUP-07d) |
| Communications | ✅ | ✅ | ✅ | None |
| GovMessages | ✅ | ✅ | ✅ | None |
| AIWarnings | ✅ | ❌ All aiWarnings.* keys missing | ❌ same | Cat 1: SEVERITY_META labels, Cat 6: "AI" prefix |
| SchoolRatings | ✅ | ✅ | ✅ | None (star fix in ADMIN-RATING-STAR-COLOR) |
| ActivityFeed | ✅ | ❌ ACTION_META + English pagination | ❌ same | Cat 1: ACTION_META + English strings |
| TherapyManagement | ✅ | ✅ | ✅ | None (64 t() calls confirmed by audit) |
| GroupManagement | ✅ | ✅ | ✅ | None |
| Settings | ✅ | ✅ | ✅ | None |
| Profile | ✅ | ✅ | ✅ | None |

---

## Drift Category Breakdown

### Category 1: Hardcoded JSX strings not in t()

**Finding 1.1 — `Dashboard.jsx` + `ActivityFeed.jsx`: `ACTION_META` object with 13 hardcoded UZ labels**

Both files had identical (or near-identical) `ACTION_META` objects:
```js
const ACTION_META = {
  'approve:documents': { label: 'Hujjat tasdiqlandi', color: 'text-success-600' },
  // ... 12 more with hardcoded UZ labels
};
```

`getActionLabel(action, entity)` returned the UZ string regardless of portal language. In RU mode, activity log showed "Hujjat tasdiqlandi" (UZ) instead of "Документ утверждён" (RU).

**Note:** Dashboard had `'Maktab yangilandi'` for `update:schools`; ActivityFeed had `'Muassasa yangilandi'`. These were inconsistent — `Muassasa` (institution) is the correct terminology per CLEANUP-03.

**Finding 1.2 — `Dashboard.jsx`: `formatRelativeTime` with 3 hardcoded UZ time strings**
```js
if (min < 1) return 'Hozirgina';
if (min < 60) return `${min} daqiqa oldin`;
if (hr < 24) return `${hr} soat oldin`;
```
Always UZ regardless of language.

**Finding 1.3 — `AIWarnings.jsx`: `SEVERITY_META` object with 4 hardcoded UZ/EN mixed labels**
```js
const SEVERITY_META = {
  critical: { label: 'Kritik · Critical', ... },
  high:     { label: 'Yuqori · High',     ... },
  medium:   { label: "O'rta · Medium",    ... },
  low:      { label: 'Past · Low',        ... },
};
```
Mixed "UZ · EN" format — not translated to RU.

**Finding 1.4 — `ActivityFeed.jsx`: English pagination strings**
```jsx
Page {page} of {totalPages} ({total} total)
Prev
Next
```
English in all 3 language modes.

### Category 2 + Category 3: Raw enum/DB values
Not found. All enum displays audited (status badges, doc status, etc.) were already using `t()` or semantic color classes.

### Category 4: Date format
`formatRelativeTime` had hardcoded `toLocaleDateString('uz-UZ')` for dates older than 24h. Changed to `toLocaleDateString()` (browser-native locale detection).

### Category 5: Missing locale namespace (critical — causes all keys to fall back)
`aiWarnings.*` namespace was entirely absent from all 3 admin locale files. All 33+ `t('aiWarnings.*')` calls in `AIWarnings.jsx` fell back to their defaultValues (UZ strings). In RU mode, the entire Ogohlantirishlar page body rendered in UZ.

### Category 6: Stale terminology
`t('aiWarnings.title', { defaultValue: 'AI ogohlantirishlar' })` — "AI" prefix in the defaultValue contradicts `nav.aiWarnings` = "Ogohlantirishlar" (no "AI" prefix). Fixed: defaultValue changed to "Ogohlantirishlar".

---

## STEP 2 — Fixes Applied

### Dashboard.jsx

1. `ACTION_META` → renamed to `ACTION_META_COLOR` (colors only, no labels)
2. `getActionLabel(action, entity, t)` — third parameter `t`; uses `t('activityActions.${action}_${entity}')` 
3. `formatRelativeTime(iso, t)` — second parameter `t`; uses `t('timeAgo.justNow/minutes/hours')`
4. All JSX call sites updated to pass `t`
5. Hardcoded `'uz-UZ'` locale in `toLocaleDateString` removed

### ActivityFeed.jsx

1. `ACTION_META` removed entirely → replaced with:
   - `ACTION_KEYS` static list (13 entries, for filter dropdown)
   - `ACTION_LABELS_UZ` static map (13 entries, UZ fallback strings for defaultValues)
2. `getActionLabel(action, entity, t)` — same pattern as Dashboard
3. Filter dropdown: `actionKeys.map` replaced with `ACTION_KEYS.map` + `getActionLabel(action, entity, t)`
4. Pagination: "Prev"/"Next"/"Page X of Y" → `t('activityFeed.prev/next/pageOf')`
5. `activityFeed.title/subtitle/filterAll/startDate` already used t() — those were clean

### AIWarnings.jsx

1. `SEVERITY_META.label` field removed from all 4 severity objects
2. Badge renders: `{meta.label}` → `{t('severity.${warning.severity}', { defaultValue: warning.severity })}`
3. Page title defaultValue: `'AI ogohlantirishlar'` → `'Ogohlantirishlar'`
4. All `t('aiWarnings.*')` calls already existed; just needed locale keys added (see below)
5. Severity filter select options already used `t('aiWarnings.severity*', { defaultValue: 'Past · Low' })` etc. — these defaultValues also had the mixed "UZ · EN" format; the locale keys now return clean single-language strings

---

## STEP 3 — New Locale Keys Added (all 3 languages)

**`aiWarnings` namespace — 33 keys**

| Key | UZ | RU | EN |
|---|---|---|---|
| title | Ogohlantirishlar | Предупреждения | Warnings |
| eyebrow | Hisobotlar | Отчёты | Reports |
| subtitle | Tizim aniqlagan... | Паттерны и события... | Patterns and events... |
| filterAll/Unresolved/Resolved | Hammasi / Hal qilinmagan / Hal qilingan | Все / Нерешённые / Решённые | All / Unresolved / Resolved |
| severityAll/Low/Medium/High/Critical | 5 UZ strings | 5 RU strings | 5 EN strings |
| analyze/analyzing/refresh | Tahlil qilish / Tahlil... / Yangilash | Анализировать / Анализ... / Обновить | Analyze / Analyzing... / Refresh |
| emptyTitle/emptyBody | 2 UZ | 2 RU | 2 EN |
| resolve* + notify* + loadError | 8 UZ | 8 RU | 8 EN |
| resolved/resolvedBy/show*/source/review/notify/resolving/markResolved | 9 UZ | 9 RU | 9 EN |

**`activityActions` namespace — 13 keys**

All 13 action:entity combinations, keyed as `approve_documents`, `reject_documents`, etc.

**`severity` namespace — 4 keys**

`critical`/`high`/`medium`/`low` in UZ/RU/EN.

**`timeAgo` namespace — 3 keys**

`justNow`/`minutes` (with `{{count}}`)/`hours` (with `{{count}}`) in UZ/RU/EN.

**`activityFeed` namespace additions — 3 keys**

`pageOf`/`prev`/`next` in UZ/RU/EN (these 3 keys added to existing namespace which already had `title`/`subtitle`/`filterAll`/`startDate`).

---

## STEP 4 — Test updates

**`ActivityFeed.test.jsx`:**
- Pagination test: `getByText('Prev')` → `getByText('Oldingi')`, `getByText('Next')` → `getByText('Keyingi')`

No other tests referenced the hardcoded strings.

---

## STEP 5 — TherapyManagement assessment

The user's session doc described Terapiya boshqaruvi as "completely untranslated". Code audit found 64 `t()` calls — the page IS fully wired. The reported issue on Railway may have been a date before CLEANUP-07 fixes were deployed, or the locale KEYS existed but values were missing. With the locale namespaces now complete, verify on Railway.

---

## STEP 6 — Build results

- **Tests:** 30/30 suites, 167/167 tests — all green
- **Commit:** 11beea7

---

## STEP 7 — User Railway verification

Required before full ✅:

**Ogohlantirishlar (formerly "AI ogohlantirishlar"):**
1. Open page → title shows **"Ogohlantirishlar"** (not "AI ogohlantirishlar")
2. Switch to RU → title **"Предупреждения"**, severity badges show RU labels (Критический/Высокий/Средний/Низкий)
3. Switch to EN → title **"Warnings"**, English throughout

**Dashboard activity feed:**
4. Recent activity entries show UZ action labels in UZ mode → RU in RU mode → EN in EN mode
5. Time ago ("Hozirgina", "X daqiqa oldin") translates with language switch

**ActivityFeed page:**
6. Action filter dropdown shows translated action names per language
7. Pagination controls: UZ "Oldingi"/"Keyingi", RU "Назад"/"Вперёд", EN "Previous"/"Next"

**TherapyManagement:**
8. Open in RU → confirm full Russian translation (was reported as untranslated)

Screenshots: AIWarnings page in RU; Dashboard activity feed in RU; ActivityFeed in RU.

---

## STEP 8 — Honest count

| Category | Findings | Closed |
|---|---|---|
| 1. Hardcoded JSX | 4 (ACTION_META × 2, formatRelativeTime, SEVERITY_META, pagination) | 4 |
| 2. Raw enum | 0 | — |
| 3. Raw DB values | 0 | — |
| 4. Date format locale | 1 (`toLocaleDateString('uz-UZ')`) | 1 |
| 5. Missing namespace | 1 (aiWarnings entirely missing) | 1 |
| 6. Stale terminology | 1 ("AI ogohlantirishlar" defaultValue) | 1 |

**Total issues:** 7 findings, 7 closed.  
**New locale keys:** 33 (aiWarnings) + 13 (activityActions) + 4 (severity) + 3 (timeAgo) + 3 (activityFeed) = **56 keys × 3 languages = 168 locale entries**

---

## Incidental observations

1. **AIWarnings tests verified mock shape** — The crash-guard tests added in ADMIN-OGOHLANTIRISHLAR-CRASH (session before this one) correctly validated the aiWarnings page renders with various response shapes. These passed without modification.

2. **Dashboard + ActivityFeed ACTION_META divergence** — Dashboard had `'Maktab yangilandi'` and ActivityFeed had `'Muassasa yangilandi'` for `update:schools`. Both now use the `activityActions.update_schools` key = "Muassasa yangilandi" (correct terminology post-CLEANUP-03). Dashboard's stale "Maktab" string is now gone.

3. **Nav aiWarnings label already correct** — `nav.aiWarnings` = "Ogohlantirishlar" was correct from the start. The inconsistency was only in `aiWarnings.title` defaultValue which had "AI" prefix. Now both match.
