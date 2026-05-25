# Teacher+Parent — S5 Phase 0: Parent AIChat Teardown (Government-Mandated)
## `audits/teacher-parent/05-phase0-aichat-teardown.md`

**Date:** 2026-05-25  
**Prerequisite:** `04d-class-confirm.md` — within-school IDOR class closed, 1278/122 green.

---

## STEP 1 — Inventory

### Frontend artifacts removed

| Artifact | File | Line(s) |
|---|---|---|
| `AIChat` page | `teacher/src/parent/pages/AIChat.jsx` | entire file |
| `AIChat` import | `teacher/src/App.jsx` | former line 35 |
| `ai-chat` parent route | `teacher/src/App.jsx` | former line 87 |
| ai-chat nav link (parent Sidebar) | `teacher/src/parent/components/Sidebar.jsx` | former line 59 |
| ai-warnings dead nav link (parent Sidebar) | `teacher/src/parent/components/Sidebar.jsx` | former line 60 |
| ai-chat nav item (parent BottomNav) | `teacher/src/parent/components/BottomNav.jsx` | former line 13 |
| `nav.aiChat` i18n key | `teacher/src/parent/locales/en/common.json` | former line 9 |
| `nav.aiChat` i18n key | `teacher/src/parent/locales/ru/common.json` | former line 9 |
| `nav.aiChat` i18n key | `teacher/src/parent/locales/uz/common.json` | former line 9 |
| `aiChat.*` i18n section | `teacher/src/parent/locales/en/common.json` | former lines 175–184 |
| `aiChat.*` i18n section | `teacher/src/parent/locales/ru/common.json` | former lines 175–184 |
| `aiChat.*` i18n section | `teacher/src/parent/locales/uz/common.json` | former lines 180–189 |
| `Heart`, `AlertTriangle` icon imports | `teacher/src/parent/components/Sidebar.jsx` | former lines 13,15 |
| `Bot` icon import | `teacher/src/parent/components/BottomNav.jsx` | former line 2 |

### Backend artifacts removed

| Artifact | File |
|---|---|
| `POST /parent/ai/chat` route | `backend/routes/parentRoutes.js` |
| `POST /teacher/ai/chat` route | `backend/routes/teacherRoutes.js` |
| `aiChatValidator` import + usage | `backend/routes/parentRoutes.js` + `teacherRoutes.js` |
| `aiChatLimiter` import + usage | `backend/routes/parentRoutes.js` + `teacherRoutes.js` |
| `getAIAdvice` (parent) import | `backend/routes/parentRoutes.js` |
| `getAIAdvice` (teacher) import | `backend/routes/teacherRoutes.js` |
| `getAIAdvice` re-export | `backend/controllers/parentController.js` line 8 |
| `aiChatLimiter` export | `backend/middleware/rateLimiter.js` |
| `teacherAIController.js` | entire file |
| `parent/parentAIController.js` | entire file |
| `validators/aiChatValidator.js` | entire file |
| `__tests__/teacherAI.test.js` | entire file (1 suite, 4 tests) |
| `__tests__/parentAI.test.js` | entire file (1 suite, 5 tests) |

### AIChat/AIWarnings separation confirmed

AIWarnings calls `GET /ai-warnings` → `aiWarningController.js` → `AiWarning` model.  
AIChat called `POST /teacher/ai/chat` and `POST /parent/ai/chat` → `teacherAIController.js` / `parentAIController.js` → no model.  
Zero shared code or data between the two features. AIWarnings page, teacher route (`/teacher/ai-warnings`), and backend are completely untouched.

---

## STEP 2 — Removal summary

All artifacts listed in STEP 1 removed. Key decisions:

**`aiChatLimiter` in `rateLimiter.js`:** Removed entirely. Only two callers existed — `parentRoutes.js` and `teacherRoutes.js` — both now gone. The `rateLimiterEnv.test.js` ordering comment and `capturedOpts` index updated (`[6]` → `[5]` for uploadLimiter, which shifts up by one when aiChatLimiter is removed).

**`parentController.js` re-export barrel:** Removed the `export * from './parent/parentAIController.js'` line. The barrel still re-exports all other parent sub-controllers. No parentRoutes import breaks because `getAIAdvice` was removed from that import list simultaneously.

**`ai-warnings` dead nav link in parent Sidebar:** Removed as part of this cleanup. The dead link pointed to `/ai-warnings` (no `/teacher` prefix), which in the parent portal context would hit NotFound. AIWarnings itself (`/teacher/ai-warnings`) stays intact.

---

## STEP 3 — Data purge

**No migration required.** AIChat was stateless — no DB table, no rows stored. Confirmed from `IRR-DECISIONS.md`: "No stored data — no AI chat model or table exists." Row counts before/after: 0 / 0 (no table to query).

---

## STEP 4 — AIWarnings intact + test suite

### AIWarnings confirmed intact

- `teacher/src/parent/pages/AIWarnings.jsx` — file untouched
- `teacher/src/App.jsx:111` — `<Route path="ai-warnings" element={<ErrorBoundary><AIWarnings /></ErrorBoundary>} />` retained under `/teacher` routes
- `backend/routes/aiWarningRoutes.js` — untouched (separate backend feature)
- `backend/controllers/aiWarningController.js` — untouched

### Backend test suite

```
Test Suites: 120 passed, 120 total   (was 122 — 2 suites removed: teacherAI + parentAI)
Tests:       1269 passed, 1269 total  (was 1278 — 9 tests removed: 4 teacherAI + 5 parentAI)
```

Delta explained: both removed suites tested only the deleted controllers (`teacherAIController.getAIAdvice`, `parentAIController.getAIAdvice`). No other test was affected.

`rateLimiterEnv.test.js` — comment updated, `capturedOpts[5]` assertion updated for new uploadLimiter index. Suite still passes.

### Backend lint

```
0 errors  (1 pre-existing warning in receptionParentController.js — unrelated, no-unused-vars for Op)
```

### Frontend lint

Pre-existing 302 lint problems in the teacher frontend — none in any file modified by this teardown. The AIChat removal introduces 0 new lint issues.

---

## Final verification checklist

- [x] `AIChat.jsx` deleted
- [x] `AIWarnings.jsx` intact
- [x] Parent `ai-chat` route gone from App.jsx
- [x] Teacher `ai-warnings` route stays in App.jsx
- [x] Parent Sidebar: ai-chat link gone, ai-warnings dead link gone, no orphaned `Heart`/`AlertTriangle` imports
- [x] Parent BottomNav: ai-chat item gone, no orphaned `Bot` import
- [x] `POST /parent/ai/chat` route gone
- [x] `POST /teacher/ai/chat` route gone
- [x] `teacherAIController.js` deleted
- [x] `parent/parentAIController.js` deleted
- [x] `aiChatValidator.js` deleted
- [x] `aiChatLimiter` removed from `rateLimiter.js` (exclusive to AIChat)
- [x] `parentController.js` barrel: AIChat re-export removed
- [x] i18n: `nav.aiChat` and `aiChat.*` block removed from en/ru/uz parent locales
- [x] Tests: 2 AIChat suites removed, -9 tests, rateLimiterEnv updated
- [x] Backend: 120 suites / 1269 tests green
- [x] Backend lint: 0 errors
