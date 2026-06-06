# TP-LOCALE-FOUNDATION — Teacher Portal Locale Completeness

**Status:** ✅ CLOSED  
**Scope:** Teacher portal (`teacher/src`) — all six drift categories  
**Gate:** `npm run check:locales` zero missing · lint 0 warnings · tests 32/32  

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
