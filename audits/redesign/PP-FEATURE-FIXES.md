# PP-FEATURE-FIXES — Parent portal: discrete PP-AUDIT flags cleared

**Status:** 🟡 S11 in progress (pending Railway walk).
**Scope:** Clear the discrete PP-AUDIT Part A / Part D flags not absorbed by S5–S10. Per-flag disposition with proof.

---

## Definitive remaining-flag list (post S5–S10)

### PP-AUDIT Part A — flags

| # | Flag | Status going in | S11 disposition |
|---|---|---|---|
| 1 | "Orphan `AIWarnings.jsx`" — file exists, claimed unmounted; dead-code role check at `:182` | NOT orphan in current state | **PP-AUDIT MISCLASSIFIED.** `teacher/src/App.jsx:47` imports `AIWarnings from './parent/pages/AIWarnings'`; the file is mounted at the **teacher** route `/teacher/warnings` (App.jsx route block). The role check at `:182` (`user?.role !== 'parent' && <button…>`) is defensive — it correctly hides the resolve button if the page is ever reached by a parent role. Not dead, not orphan. **No code change.** Note: the file's location (`parent/pages/`) is misleading; logically belongs to the teacher tree. Filed as a low-priority organizational follow-up, not S11-scope. |
| 2 | `TeacherRating.jsx:1-3` PL-015 placeholder gate on `/rating` | Still in place | **ALREADY-TRACKED-IN-PL-015.** The header comment correctly flags `shared/config/ratingIndicators.js` `PARENT_INDICATORS` as placeholders. PL-015 is a blocking pre-launch item in `LOOP_PRE_LAUNCH_CHECKLIST.md` (`PL-015: Partner to provide authoritative region list + school category definitions`). Closing this requires partner-delivered data; not a code fix. **No code change.** |
| 3 | `ChildIRR.jsx:12-17` hardcoded Cyrillic `SESSION_LABELS` | Still hardcoded | **FIXED.** Replaced the `SESSION_LABELS` literal map with `SESSION_LABEL_KEYS` (string → catalog-key map), wired the render site at `:211` to `t(SESSION_LABEL_KEYS[s.sessionType] \|\| s.sessionType)`. Added `irr.session.{initial,threeMonth,sixMonth,final}` keys to `teacher/src/parent/locales/{uz,en,ru}/common.json` (12 entries). Plus discovered three additional Cyrillic `aria-label` attributes on trend arrows (`ошди / камайди / ўзгармади`) — wired to `t('irr.trend.{increased,decreased,unchanged}')` and added 9 catalog entries (3 keys × 3 locales). |
| 4 | `Meals.jsx:43-71` custom UZ-month formatter | Already migrated | **ALREADY-DONE-IN-S6** (`PP-DATE-LOCALE`). S6 deleted the `uzMonthsLong` / `uzWeekdaysShort` arrays and the entire custom `formatDate` block; replaced with `formatDateWeekdayMonth` / `formatDateMonthLong` from `@shared/utils/formatDate`. Verified now: `grep "uzMonths\|yanvar\|noyabr\|dekabr" teacher/src/parent/pages/Meals.jsx` returns empty. |
| 5 | `Help.jsx` is fully static; contact baked into i18n keys | Same | **FEATURE-DEFERRED.** Decision logged: stay static for now (Help content is stable platform-level info; no admin-editable surface needed pre-launch). If product wants admin-editable Help in the future, that's a feature build — backend Help/FAQ model + admin CRUD + parent fetch — out of S11 scope. **No code change.** |
| 6 | `Chat.jsx` endpoints hidden behind `chatStore` | Confirmed shared | **ALREADY-DONE-IN-S9** (`PP-CHAT-INTEGRITY`). S9 paste-confirmed the chatStore source — every parent chat call routes through the same `/chat/messages` / `/chat/read` / `/chat/messages/:id` endpoints the teacher uses; same shared model. Documented verbatim in `PP-CHAT-INTEGRITY.md` §1. |
| 7 | `Media.jsx:478` uses `/media`, not `/parent/media` | Both endpoints scope correctly | **ALREADY-DONE-IN-S10** (`PP-DASHBOARD-CARDS`). S10 paste-proved both endpoints' parent branches resolve identically via the canonical chain `Child.parentId = req.user.id`. The duplication is debt, not a bug. Locked in regression by `parentDashboardCards.test.js`. Low-priority consolidation follow-up, NOT an S11 fix. |
| 8 | `Settings.jsx:98` + `ChangePassword.jsx:39` both `PUT /user/password` | Same controller | **DOCUMENTED.** Both call sites use the same backend handler; the parallel call sites are a cosmetic risk (validation could drift if someone forks the routes). Not a current bug. No code change in S11. Filed as a low-priority consolidation follow-up. |
| 9 | `ChildProfile.jsx:99` fetches monitoring records → `EmotionalMonitoringSection` | Verified wired | **ALREADY-WIRED.** `ChildProfile.jsx:299` renders `<EmotionalMonitoringSection records={monitoringRecords} />`. Not an orphan fetch. **No code change.** |
| 10 | `Media.jsx:564-567, 582-585` `_proxyUrl` debug code | Still present (3 sites) | **FIXED.** Removed three `const _proxyUrl = getProxyUrl(...);` debug assignments via regex sweep. `grep -c "_proxyUrl" teacher/src/parent/pages/Media.jsx` → **0**. |

### PP-AUDIT Part D — backlog items

| # | Item | Status going in | S11 disposition |
|---|---|---|---|
| 1 | PP-ATTENDANCE-SURFACE | done | **DONE IN S7** |
| 2 | PP-AUTH-ZOMBIE | done | **DONE IN S5** |
| 3 | PP-DATE-LOCALE | done | **DONE IN S6** |
| 4 | PP-IRR-LABELS-I18N | overlapped with A.3 | **FIXED in S11** (same SESSION_LABELS + trend aria-labels) |
| 5 | PP-AIWARNINGS-ORPHAN | reclassified | misdiagnosed; see A.1 row above |
| 6 | PP-LOCALE-PARENT-CATALOG (5 missing EN/RU keys) | Still missing | **FIXED.** Added `child.diagnosis`, `profile.avatarUpdated`, `profile.imageTooLarge`, `profile.invalidImage`, `profile.uploadError` to `teacher/src/parent/locales/{en,ru}/common.json` (5 keys × 2 locales = 10 entries). |
| 7 | PP-MOBILE-NAV | Open | **DEFERRED TO S12** (PP-MOBILE-PASS, next session per the arc). |
| 8 | PP-MEDIA-PATH | resolved | Documented in S10 — duplication, not bug. |
| 9 | PP-JOURNAL-SURFACE | Open question | **FEATURE-DEFERRED.** Backend `GET /parent/children/:id/journal` exists (`journalController.js:93-122`, parent-scoped). Parent UI does NOT currently render journal entries — there is no `/journal` route on the parent side. Decision: this is a real product feature (a new "Kun jurnali" tab where parents read teacher journal entries). Not S11-scope; needs its own session. Logged as `PP-JOURNAL-FEATURE` follow-up. |
| 10 | PP-MOBILE-PASS | Open | **DEFERRED TO S12.** |
| 11 | PP-CHILDPROFILE-MONITORING-WIRING | wired | see A.9 row above |
| 12 | PP-CLEANUP-MEDIA-DEBUG | done | see A.10 row above |
| 13 | PP-HELP-DYNAMIC | strategic | see A.5 row above |

---

## What changed this session

### 1. ChildIRR Cyrillic remnants → i18n

Before:
```jsx
const SESSION_LABELS = {
  initial: 'Дастлабки баҳолаш',
  '3_month': '3 ойдан кейин',
  '6_month': '6 ойдан кейин',
  final: 'Якуний баҳолаш',
};
function sessionLabel(type) { return SESSION_LABELS[type] || type; }
…
<p>{sessionLabel(s.sessionType)}</p>
…
<TrendingUp aria-label="ошди" />
<TrendingDown aria-label="камайди" />
<Minus aria-label="ўзгармади" />
```

After:
```jsx
const SESSION_LABEL_KEYS = {
  initial:   'irr.session.initial',
  '3_month': 'irr.session.threeMonth',
  '6_month': 'irr.session.sixMonth',
  final:     'irr.session.final',
};
…
<p>{SESSION_LABEL_KEYS[s.sessionType] ? t(SESSION_LABEL_KEYS[s.sessionType]) : s.sessionType}</p>
…
<TrendingUp aria-label={t('irr.trend.increased')} />
<TrendingDown aria-label={t('irr.trend.decreased')} />
<Minus aria-label={t('irr.trend.unchanged')} />
```

Catalog additions (4 + 3 = **7 keys × 3 locales = 21 entries**):

| Key | UZ | EN | RU |
|---|---|---|---|
| `irr.session.initial` | "Dastlabki baholash" | "Initial assessment" | "Первичная оценка" |
| `irr.session.threeMonth` | "3 oydan keyin" | "After 3 months" | "Через 3 месяца" |
| `irr.session.sixMonth` | "6 oydan keyin" | "After 6 months" | "Через 6 месяцев" |
| `irr.session.final` | "Yakuniy baholash" | "Final assessment" | "Итоговая оценка" |
| `irr.trend.increased` | "ortdi" | "increased" | "выросло" |
| `irr.trend.decreased` | "kamaydi" | "decreased" | "снизилось" |
| `irr.trend.unchanged` | "o'zgarmadi" | "unchanged" | "без изменений" |

### 2. Media debug code cleanup

Three `const _proxyUrl = getProxyUrl(originalUrl, …);` debug assignments removed (Media.jsx around lines 562, 580, 660). The variable was named with a leading underscore but actually unused — dead code. Grep verification: `grep -c "_proxyUrl" Media.jsx` → **0**.

### 3. Parent catalog gap (PP-AUDIT C.3)

Five keys present in UZ but missing from EN + RU. Added:

| Key | EN | RU |
|---|---|---|
| `child.diagnosis` | "Diagnosis" | "Диагноз" |
| `profile.avatarUpdated` | "Photo uploaded successfully" | "Фото успешно загружено" |
| `profile.imageTooLarge` | "Image must not exceed 5 MB" | "Размер изображения не должен превышать 5 МБ" |
| `profile.invalidImage` | "Only image files are accepted" | "Принимаются только файлы изображений" |
| `profile.uploadError` | "Error uploading photo" | "Ошибка загрузки фото" |

### 4. Dashboard `||` fallback sweep (incidental, while clearing Cyrillic)

The Cyrillic sweep surfaced a residual `t('dashboard.irr') || 'ИРР — Ривожланиш режаси'` pattern at `Dashboard.jsx:127`. That `||` fallback is the same anti-pattern as the `defaultValue:` masks S2b eliminated — dead code (keys exist in the teacher catalog via merge), and the fallback would leak raw Cyrillic if locale dropped. Stripped **all 9** `t('dashboard.xxx') || 'literal'` patterns from Dashboard.jsx in one regex pass.

```
$ grep -E "t\('dashboard\.[a-zA-Z]+'\) \|\| '" teacher/src/parent/pages/Dashboard.jsx
(empty)
```

### 5. Feature decisions logged (FEATURE-DEFERRED)

| Item | Decision |
|---|---|
| Parent warnings surface | **NOT BUILDING.** AIWarnings.jsx is the teacher's `/teacher/warnings` page, mislocated under `parent/pages/`. No parent-side warnings feature is in scope. The file's defensive role check is correct, not dead. |
| Help dynamic (admin-editable) | **STAY STATIC.** Help content is stable platform-level info; no admin-editable surface needed pre-launch. |
| Parent journal read (`PP-JOURNAL-FEATURE`) | **DEFER TO ITS OWN SESSION.** Backend exists (`journalController.getChildJournal`). Frontend has no `/journal` route. New PP-JOURNAL-FEATURE follow-up — out of S11 scope. |

---

## Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS — no missing keys; new keys present in all 3 locales |
| Cyrillic JSX in `teacher/src/parent/**` (S2b carryover gate) | ✅ ZERO |
| `defaultValue:` masks in `teacher/src` (S2b carryover) | ✅ ZERO (Dashboard `||` fallbacks also stripped now) |
| Hardcoded date locales in parent (S6 carryover) | ✅ ZERO |
| ESLint / Vitest | ⚠️ pending CI — sandbox cannot install full dep tree |

---

## Files modified in S11

| File | Change |
|---|---|
| `teacher/src/parent/pages/ChildIRR.jsx` | `SESSION_LABELS` → `SESSION_LABEL_KEYS`; render site + 3 trend `aria-label`s wired to `t()` |
| `teacher/src/parent/pages/Media.jsx` | Removed 3 `_proxyUrl` debug assignments |
| `teacher/src/parent/pages/Dashboard.jsx` | Stripped 9 `t('dashboard.xxx') \|\| 'literal'` `||` fallbacks |
| `teacher/src/parent/locales/{uz,en,ru}/common.json` | +`irr.session.*` (4), +`irr.trend.*` (3) ×3 locales = 21 entries; +`child.diagnosis`, +`profile.{avatarUpdated,imageTooLarge,invalidImage,uploadError}` ×2 locales (EN+RU) = 10 entries |

---

## User Railway verification

Walk the affected pages — desktop and mobile:

1. **ChildIRR (`/irr`).** Switch UZ → RU → EN. Every session-type label changes ("Dastlabki baholash" → "Первичная оценка" → "Initial assessment" etc). Hover or screen-read a trend arrow — the `aria-label` is in the chosen language. **No Cyrillic leaks in RU/EN mode.**
2. **Meals (`/meals`).** Confirm: dates localize properly across UZ/RU/EN (S6 contract still holds, no formatter regressed). No `iyun` in RU/EN mode.
3. **Rating (`/rating`).** Page still renders; the PL-015 gate comment is the correct expectation (placeholders until partner data ships). No "fix" yet — that's PL-015's product responsibility.
4. **Dashboard (`/`).** Card titles are in the current UI language across all 8 cards; no `ИРР — Ривожланиш режаси` raw-Cyrillic leak even if the catalog momentarily dropped a key.
5. **Profile (`/child`).** Diagnosis label, avatar-error toasts now show in RU/EN (previously fell through to UZ via S2b).
6. **Media (`/media`).** Image-error onError handlers still hide broken images (`e.target.style.display = 'none'`); just no unused debug variables left.
7. **No dead routes/orphans reachable.** Try `/warnings` from the parent app — 404 (no parent route), correct. The teacher's `/teacher/warnings` continues to work as before.

Reply **"verified"** → `LOOP_TRACKER.md` `PP-FEATURE-FIXES` to ✅. Next: S12 PP-MOBILE-PASS (final UI parent session).
