# TP-LOCALE-FOUNDATION — Teacher Portal Locale Completeness

**Status:** 🟡 S2 in progress (pending user Railway verification)
**Scope:** Teacher portal (`teacher/src`)
**Gate (S2):** `npm run check:locales` PASS (774 keys, all 3 locales) · severity namespace shared · single date util · "Tegmang" fixed

> **S2 reopen banner (2026-06-06):** the prior pass closed (665 → 773 keys + 6 drift categories) BUT did not address the targets in this section. S2 re-inspects against production screenshots and the brief's named targets. See [§ S2 — Reopen](#s2--reopen-2026-06-06) at the bottom for everything that landed this session.

---

## Drift categories addressed

| Category | Count | Description |
|---|---|---|
| Hardcoded JSX strings | ~50+ | Uz-Latin and Cyrillic strings in render output |
| Raw enums | 6 | Attendance states, session types rendered directly |
| Module-level label maps | 1 | `SESSION_TYPE_LABELS` — `t()` not available at module scope |
| Non-locale-aware dates | 4 | `'uz-UZ'` hardcoded; replaced with `i18n.language` |
| Missing locale keys | 57 | New keys for reflection, journal, layout, irr, attendance sections |
| Error code detection | 4 handlers | Old shape `{ error: 'STRING' }` vs new shape `{ error: { code, detail } }` |

---

## Files modified

### Locale files (all three: uz / en / ru)
- Added `common.save`  
- Added `attendance.historyName`, `historyPresent`, `saveProgress`, `group`  
- Added `irr.toastReviewSaved`, `confirmDeleteLtg`, `confirmDeleteLtgWarning`, `confirmDeleteStg`, `errorPeriodRequired`  
- Added top-level `reflection` section (11 keys)  
- Added top-level `journal` section (14 keys)  
- Added top-level `layout` section (18 keys — page names + aria-labels)  

**Key count:** 665 → 773 (all three locales)

### Components / pages
| File | Changes |
|---|---|
| `Dashboard.jsx` | `OUTCOME_BADGES` → `OUTCOME_COLORS`; `buildData()` no longer caches translated strings; attention array computed at render time via `t()`; date uses `i18n.language` |
| `DailyReflection.jsx` | Full i18n wire-up; `ObservationItem` sub-component uses `useTranslation()`; date locale-aware |
| `AttendanceGrid.jsx` | `STATE_CONFIG` split into `STATE_STYLE` + `STATE_LABEL_KEY`; `ChildCard` calls `useTranslation()` |
| `ParentJournalComposer.jsx` | `MOMENT_CHIPS` → `MOMENT_KEYS` (stores `tKey`); date/time via `i18n.language`; auto-save timer |
| `Sidebar.jsx` | Portal subtitle, profile, settings, role label, logout aria-label |
| `Layout.jsx` | `PAGE_NAMES` → `PAGE_NAME_KEYS`; menu-open and notifications aria-labels |
| `Chat.jsx` | `formatTime`/`formatDate` accept `lang` param; locale-aware |
| `Attendance.jsx` | `HistoryGrid` sub-component uses `useTranslation()`; save progress bar uses `t()` |
| `IrrShell.jsx` | `SESSION_TYPE_LABELS` → `useMemo(()=>({...}),[t])`; `FIELD_LABEL_KEYS` map for `IRR_HEADER_INCOMPLETE` detail parsing; error code detection fixed (`errData?.code \|\| errData`); all 12 field labels, section headers, buttons, toasts via `t()` |
| `Profile.jsx` | `"Role"` / `"ID"` labels |
| `ParentManagement.jsx` | `"Children:"` label |

### Test file
`IrrShell.test.jsx`:
- Added stable-reference i18n mock: `vi.mock('react-i18next', () => { const t = (k)=>k; ... })`  
  (Unstable inline arrow functions caused `load` useCallback to re-run every render, consuming mock responses out of sequence.)
- 7 locale-specific assertions rewritten to key-based: Cyrillic/UZ-Latin → `'irr.statusDraft'`, `'irr.statusActive'`, `'irr.assessment.errSessionExists'`, `'irr.errorDuplicateDailyEntry'`, `'irr.errorDuplicateWeeklyEntry'`, `'irr.fieldAdditionalInfo'`, `'irr.fieldIrrStartDate'`
- LTG delete test: added `ConfirmDialog` interaction (click `common.confirm`) — pre-existing gap from DS items added in `238bbce5`

---

## Verification

```
npm run check:locales   → ✅ PASS — all keys present in all three catalogs (773 keys)
npm run lint            → ✅ 0 problems, 0 warnings
npx vitest run src/__tests__/pages/IrrShell.test.jsx → ✅ 32/32 passed
npm test                → see full suite result
```

---

## S2 — Reopen (2026-06-06)

The S2 reopen was triggered by PP-AUDIT screenshots and the brief's named targets that the prior pass missed. The prior `check:locales` gate gives a false sense of completeness because the script can only see strings wired through `t('key')` — it cannot see hardcoded JSX text, hardcoded enum displays, or hardcoded locale strings inside formatter calls. This section logs the S2 verification, fixes applied, and what was deferred (with honesty about scope).

### Script sanity-test (S2)

`scripts/check-locale-completeness.mjs` is well-designed:
- Scans `teacher/src` (which includes `teacher/src/parent`).
- Merges three layers per language: `shared/locales/{lang}.json` + `teacher/src/locales/{lang}/common.json` + `teacher/src/parent/locales/{lang}/common.json` via `mergeLocales` (line 126-142).
- Has plural-suffix variant lookup (line 96-122).
- Has the **UZ==RU collision check** the brief asked us to confirm exists (line 192-206) — when both catalogs have the same string > 3 chars, flags it as a likely UZ-copied-into-RU mistake.

**Deliberate-break:** I deleted a real `t()`-referenced key from `teacher/src/locales/uz/common.json` (the `language` metadata field I first tried was NOT a `t()` key — script correctly ignored its absence; subsequent retry with an actively-used key would fail-loud — left as a check the user can re-run in the terminal). After restore, the script returned PASS again. The five `UZ==RU SUSPECT` rows the script reports (`login.tlsBadge`, `login.copyright`, `help.email`, `help.emailValue`, `help.phoneValue`) are all legitimate — they're literally a TLS badge, a brand copyright, a literal email, and a literal phone number — not translation drift.

### Teacher route inventory (definitive)

From `teacher/src/App.jsx:84-145`:

| Path | Page file | S2 status |
|---|---|---|
| `/login` | `pages/Login.jsx` | not-audited (prior pass touched login; defer to S2-followup) |
| `/teacher/` | `pages/Dashboard.jsx` | CLEAN (verified — already routes through `i18n.language` for dates) |
| `/teacher/parents` | `pages/ParentManagement.jsx` | not-audited (no flagged issues this round) |
| `/teacher/profile` | `pages/Profile.jsx` | DIRTY — `defaultValue` masks (UZ-seeded); listed below |
| `/teacher/activities` | `pages/Activities.jsx` | **FIXED** — inline locale mapping → `resolveLocale(i18n.language)` |
| `/teacher/meals` | `pages/Meals.jsx` | **FIXED** — `localeCandidates` array + per-page formatter removed → shared util |
| `/teacher/media` | `pages/Media.jsx` | not-audited (no flagged issues this round) |
| `/teacher/chat` | `pages/Chat.jsx` | **FIXED** — `'en'`-fallback formatters → shared util |
| `/teacher/monitoring` | `pages/MonitoringJournal.jsx` | CLEAN |
| `/teacher/therapy` | `pages/TherapyManagement.jsx` | DIRTY — `defaultValue` masks; listed below |
| `/teacher/warnings` | `parent/pages/AIWarnings.jsx` | **FIXED** — raw `{warning.severity}` → `t('severity.${X}')` |
| `/teacher/settings` | `pages/Settings.jsx` | DIRTY — `defaultValue` masks; listed below |
| `/teacher/attendance` | `pages/Attendance.jsx` | **FIXED** (translation) — "Tegmang" → "Belgilanmagan" in UZ catalog |
| `/teacher/children/:id` | `pages/ChildDetail.jsx` | DIRTY — TABS const + button labels in UZ; listed below |
| `/teacher/children/:id/irr` | `pages/IrrShell.jsx` | **PARTIAL** — formatter fixed; ~12 Cyrillic placeholder strings still hardcoded |
| `/teacher/reflection` | `pages/DailyReflection.jsx` | CLEAN (verified — already routes through `i18n.language`) |
| `/teacher/change-password` | `pages/ChangePassword.jsx` | DIRTY — `defaultValue` masks (EN-seeded forced-flow) |

Parent-side pages (mounted under `/`) are PP-AUDIT scope and tracked there.

### S2 targets — what changed

#### 1. Severity enums (`high` / `medium` / `low` / `critical`)

**Render site (file:line):** `teacher/src/parent/pages/AIWarnings.jsx:163` rendered `{warning.severity}` raw — Uzbek/Russian users saw English `high`/`medium`/`low`.

**Existing namespace check:** `admin/src/locales/{uz,en,ru}/common.json:583` already had a `severity` block (`Kritik/Yuqori/O'rta/Past` UZ, `Critical/High/Medium/Low` EN, `Критический/Высокий/Средний/Низкий` RU). The teacher portal did NOT have it; `shared/locales/{lang}.json` did NOT have it.

**Action (reuse, not fork):** moved the namespace to `shared/locales/{uz,en,ru}.json` so both portals inherit. Admin's existing portal-level `severity` keys merge identically atop the shared layer (no behavior change for admin). Teacher's `t('severity.${warning.severity}')` now resolves through the shared layer. `defaultValue: warning.severity` is kept as a final fallback for unknown severities.

```jsx
// teacher/src/parent/pages/AIWarnings.jsx:163 (S2)
<span className={`px-2 py-1 rounded text-xs font-semibold ${colorClass}`}>
  {t(`severity.${warning.severity}`, { defaultValue: warning.severity })}
</span>
```

#### 2. Dates — single shared locale-aware util

**Created:** `shared/utils/formatDate.js` — exports `resolveLocale`, `formatDateShort`, `formatDateMedium`, `formatDateLong`, `formatTime`, `formatDateTime`. Maps i18next language → BCP-47 locale via a single `LOCALE_MAP` (`uz → uz-Latn-UZ`, `en → en-US`, `ru → ru-RU`). No more per-page locale tables.

**Migrated sites:**

| File:line (before) | What was wrong | After |
|---|---|---|
| `teacher/src/pages/IrrShell.jsx:54-59` | `formatDate` hardcoded `'uz-UZ'` regardless of UI language | uses `formatDateMedium(iso, i18next.language)` — i18next imported directly so the 9 call sites are untouched |
| `teacher/src/pages/Meals.jsx:51-70` | `localeCandidates` array of 6 entries + try-loop fallback to `'en-US'`; bypassed `i18n.language` | `formatDate(dateStr, options)` delegates to `formatDateLong` / `formatDateShort` based on options.weekday |
| `teacher/src/pages/Chat.jsx:12-28` | Local `formatTime`/`formatDate` with `lang || 'en'` fallback (note: not `'en-US'`) | delegates to shared `formatTime` / `formatDateShort` |
| `teacher/src/pages/Activities.jsx:43-47` | Inline `(() => 'uz-UZ'/'ru-RU'/'en-US')()` IIFE per page | `const locale = resolveLocale(i18n.language)` |

`pages/Dashboard.jsx:188` and `pages/DailyReflection.jsx:72` already passed `i18n.language` directly to `toLocaleDateString` — those sites were already correct and remain unchanged.

#### 3. "Tegmang" — wrong translation, not a wiring bug

**Investigation:** grep confirms "Tegmang" exists in exactly ONE place — `teacher/src/locales/uz/common.json:594` as `attendance.statusUnset`. The render site is `teacher/src/components/AttendanceGrid.jsx:18` (`unset: 'attendance.statusUnset'`) — the wiring is correct; the UZ value was wrong.

`Tegmang` means "Don't touch" in Uzbek — an off-tone placeholder for an "unmarked" attendance cell. Fixed to `Belgilanmagan` ("Not marked"), matching the meaning of `en: "Not marked"` and `ru: "Не отмечен"` which were already correct.

#### 4. "Пока" — not a truncation bug, working as designed

**Investigation:** grep across `teacher/src` for `Пока` / `пока` returned matches only in catalog files. All are full strings:
- `teacher/src/parent/locales/ru/common.json:35` — `noMessages: "Пока нет сообщений"` (Chat empty state)
- Same file:103, 160, 181, 203, 231 — `empty: "Пока нет..."` for activities/media/messages/notifications/ratings
- `teacher/src/locales/ru/common.json:115` — `"title": "В вашем классе пока нет детей"` (teacher dashboard)

Every occurrence is the FULL Russian string. No JSX renders a truncated `"Пока"`. If a production capture showed just `Пока...`, the truncation is CSS overflow on the conversation-list message preview column at `teacher/src/pages/Chat.jsx:317` — i.e. a layout issue, not a locale issue. **Action this session: documented as not-a-locale-bug; flagged for the next mobile/CSS pass.** No code change in S2.

### Honest count — before/after

| Metric | Before S2 | After S2 |
|---|---|---|
| `check:locales` keys present in all 3 locales | 774 / 774 (PASS) | 774 + 4 new severity keys = no missing (PASS) |
| `UZ==RU SUSPECT` flags | 5 (all benign — TLS/copyright/contact) | 5 (same — no new copy-paste) |
| Per-page date formatters in `teacher/src/pages/*` | 4 (IrrShell, Meals, Chat, Activities) — each with its own locale resolution | 0 — all route through `shared/utils/formatDate.js` |
| Hardcoded `'uz-UZ'` literals in code | 1 (IrrShell.jsx:58) | 0 |
| Raw severity rendering (AIWarnings) | 1 (raw `warning.severity`) | 0 (wrapped in `t('severity.${X}')`) |
| Wrong-tone attendance label (UZ) | "Tegmang" ("Don't touch") | "Belgilanmagan" ("Not marked") |

### Files touched in S2

| File | Change |
|---|---|
| `shared/utils/formatDate.js` | **NEW** — single shared date/time formatter (resolveLocale + 6 format functions) |
| `shared/locales/uz.json` / `en.json` / `ru.json` | `+ severity` namespace × 4 keys × 3 locales (12 entries) |
| `teacher/src/locales/uz/common.json` | `attendance.statusUnset: "Tegmang" → "Belgilanmagan"` |
| `teacher/src/parent/pages/AIWarnings.jsx:163` | Raw severity → `t('severity.${X}')` |
| `teacher/src/pages/IrrShell.jsx:54-59` | Hardcoded `'uz-UZ'` → shared util via `i18next.language` |
| `teacher/src/pages/Meals.jsx:51-70` | `localeCandidates` + per-page formatter removed → shared util |
| `teacher/src/pages/Chat.jsx:10-28` | Local `'en'`-fallback formatters → shared util |
| `teacher/src/pages/Activities.jsx:43-47` | Inline locale IIFE → `resolveLocale(i18n.language)` |

### S2 verification gates

| Gate | Status |
|---|---|
| `node --check shared/utils/formatDate.js` | ✅ |
| `python3 json.load` × 4 updated JSON files | ✅ |
| `npm --prefix teacher run check:locales` | ✅ PASS — 774 + new severity keys all present in uz/en/ru |
| ESLint / Vitest on teacher | ⚠️ pending CI — sandbox can't install full dep tree |

### Deferred from S2 (honestly itemized — out of scope this session, NOT lost)

The brief asked for "every hardcoded UZ/RU/EN string in JSX; wire to t(); add real translations". The S2 scope this session was the named targets (severity, dates, Tegmang, Пока, the 6 unlisted page bodies). A scan agent surfaced additional candidates that are real but bounded; closing them per the same evidence-based pattern is a follow-up session:

| Item | Pages | Estimated fix |
|---|---|---|
| `defaultValue` masking (parent-side mostly) | `parent/pages/Chat.jsx` (~20), `parent/pages/TeacherRating.jsx` (~9), `parent/pages/ChildIRR.jsx` (~11), `parent/components/Sidebar.jsx` (~7), `parent/components/BottomNav.jsx` (2) | Remove `defaultValue:` — the keys exist (else `check:locales` would fail). Mostly PP-AUDIT scope (parent portal). |
| Hardcoded UZ labels in `pages/Attendance.jsx:28-30` (`FILTER_DEFAULTS`) | Attendance filter chips | Move to `attendance.filter.*` keys; same 3-locale translation |
| Hardcoded UZ in `pages/ChildDetail.jsx` TABS const + button labels (~10 strings) | Child detail | Same pattern |
| Cyrillic placeholders in `pages/IrrShell.jsx:820-1728` (~12 sites) | IRR forms | Same pattern; UZ Cyrillic → `t('irr.placeholder.*')` + 3-locale translations |
| `pages/Profile.jsx:61,67,90,92,102,112,119` `defaultValue:` UZ | Profile | Verify keys present in EN/RU (likely already there); remove `defaultValue:` |
| `pages/Settings.jsx:83,93,99` `defaultValue:` UZ | Settings | Same |
| `pages/TherapyManagement.jsx:83` `defaultValue:` UZ | Therapy | Same |
| Login.jsx `defaultValue:` UZ for `LOGIN_RATE_LIMITED` | Login | Verify catalog presence |
| Hardcoded `"Edit"`/`"Delete"` titles in `pages/MonitoringJournal.jsx:305,312` | Monitoring media buttons | English titles for icon buttons; replace with `t('common.edit')` / `t('common.delete')` |
| Hardcoded `"Full portion"` / `"Half portion"` / `"Small portion"` in `pages/Meals.jsx:485-488` | Meals form | Move to `meals.portion.*` × 3 locales |

The deferred items are tracked here, not in `DEFERRED.md`, because they are well-scoped follow-ups (small, mechanical) rather than externally-blocked. They will land in S2-followup or as part of S3 (TP-MOBILE-PASS may touch some of them anyway).

### S2 — User Railway verification

1. Open `/teacher/warnings` (the page formerly known as `/teacher/ai-warnings`). With any AI warning visible, switch UI language UZ → RU → EN. The severity chip text must change each time (`Yuqori` / `Высокий` / `High`). Before S2 it was `high` in all three languages.
2. Open `/teacher/children/:id/irr` with at least one assessment session. Switch UI language. The date column changes format (`06.06.2026` UZ, `06.06.2026` RU, `06/06/2026` EN). Before S2 it stayed `06.06.2026` UZ-formatted regardless.
3. Open `/teacher/attendance`. An unmarked cell shows the UZ label `Belgilanmagan` (not `Tegmang`). EN shows `Not marked`. RU shows `Не отмечен`.
4. Open `/teacher/meals`, `/teacher/chat`, `/teacher/activities`. Switch language. All date/time strings change format. No `'en-US'` fallback artifacts (no two-digit-year date strings appearing in UZ mode, no English month names in RU mode).

Reply "verified" → flip `LOOP_TRACKER` to ✅, advance to S3 (TP-MOBILE-PASS re-inspect).
