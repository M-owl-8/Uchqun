# TP-WARNINGS-CHROME: Ogohlantirishlar page — chrome conventions

**Status:** 🟡 In progress (pending user verify)
**Commit:** pending

## Changes

### 1. Letterhead header
Replaced dark navy hero banner (`bg-p-brand-700`) with the standard TP-PAGE-CHROME letterhead:
- `text-[22px] font-semibold text-slate-900` title + `(N)` unresolved count
- `text-[13px] text-slate-500 mt-0.5` subtitle (teacher-perspective copy × 3 locales)
- `unresolvedCount` state tracks unresolved count independently from current filter

### 2. Top-bar title
Added `/teacher/warnings` to `PAGE_NAMES` in `Layout.jsx`. Previously missing → top bar showed fallback `'Uchqun'`.

### 3. Filter chip tokens
Replaced parent-portal token `bg-p-brand-600` with teacher-portal token `bg-brand-600` on all 3 filter chips (All / Unresolved / Resolved). Matches `TherapyFilters.jsx` pattern.

### 4. Token sweep
- `getSeverityColor` default case: `bg-p-sepia-100 text-p-ink border-p-sepia-300` → `bg-slate-100 text-slate-600 border-slate-300`
- AI analysis box: `bg-p-sepia-50` → `bg-slate-50`, `text-p-ink` → `text-slate-700`

### 5. Route rename
- `App.jsx`: `path="ai-warnings"` → `path="warnings"`
- Redirect added: `path="ai-warnings"` → `<Navigate to="/teacher/warnings" replace />`
- `Navigate` added to react-router-dom imports

### 6. Sidebar update
- `Sidebar.jsx` key: `'ai-warnings'` → `'warnings'`
- `Sidebar.jsx` href: `/teacher/ai-warnings` → `/teacher/warnings`
- Locale key: `sidebar.aiWarnings` → `sidebar.warnings` (uz/en/ru)

### 7. Locale updates
`warnings.subtitle` updated to teacher-perspective copy × 3 locales:
- UZ: `"Guruhingiz bolalari bo'yicha ogohlantirishlar"`
- EN: `"Warnings about the children in your group"`
- RU: `"Предупреждения о детях вашей группы"`

Old subtitle (`"Reytinglar asosida yaratilgan ogohlantirishlar"`) was admin/rating perspective — wrong for teacher.

### 8. Test update
`parentSidebar.test.jsx` — updated href check from `/ai-warnings` → `/warnings` and updated test description to reference current route.

## Files touched
- `teacher/src/parent/pages/AIWarnings.jsx`
- `teacher/src/components/Layout.jsx`
- `teacher/src/App.jsx`
- `teacher/src/components/Sidebar.jsx`
- `teacher/src/locales/uz/common.json`
- `teacher/src/locales/en/common.json`
- `teacher/src/locales/ru/common.json`
- `teacher/src/__tests__/pages/parentSidebar.test.jsx`

## Verification
- `npm run lint` (teacher): 0 errors, 0 warnings ✅
- `node backend/scripts/verify-i18n.js`: 226 keys, all match ✅
- `parentSidebar.test.jsx`: 3/3 tests pass ✅
- Backend API paths unchanged: `/ai-warnings` (GET), `/ai-warnings/:id/resolve` (PUT)
