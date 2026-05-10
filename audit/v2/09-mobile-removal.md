# Phase 9 v2 — Mobile App Removal Verification
**Date:** 2026-05-09  
**Baseline:** `/audit/09-mobile-removal.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 10 issues, **3 are verified-fixed**, **1 is partially-fixed**, and **6 are not-fixed**. Three tracker items have Phase 9 overlap: `#04-001` (Help page localized — 09-003), `#04-002` (parent Sidebar unread-count endpoint — 09-006), and `L-12` (AIWarnings route wired — 09-007 partially fixed). The resolve button role guard (09-001) was also added, hiding the broken button from parents.

The structural issues — three ToastContexts, the `parentT` i18n bypass, the shared namespace collision, the dead parent Login.jsx, the `superAdminReply` key, and the alert() pattern — are all unchanged.

**Phase 9 v2 score: 47/100** (up from 41/100).

---

## Scope

Verification of all 10 issues from `/audit/09-mobile-removal.md`. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 09-001 | HIGH | **verified-fixed** | `teacher/src/parent/pages/AIWarnings.jsx:176` | `user?.role !== 'parent'` condition added — resolve button hidden from parents |
| 09-002 | HIGH | **not-fixed** | `teacher/src/parent/context/ToastContext.jsx`; `ParentApp.jsx:12-13` | Third ToastContext unchanged; nested ToastProvider in ParentApp still present (same as 04-001) |
| 09-003 | HIGH | **verified-fixed** | `teacher/src/parent/pages/Help.jsx:19-82` | All strings via `t()`; real email/phone via locale; `<Link>` navigation; fixed via `#04-001` (same as 04-005) |
| 09-004 | MEDIUM | **not-fixed** | `teacher/src/parent/components/Sidebar.jsx:43-56,106` | `parentT` function still defined and used for `sidebar.title`; nav items now use `t()` but workaround persists |
| 09-005 | MEDIUM | **not-fixed** | `teacher/src/parent/i18n.js`; `teacher/src/parent/locales/` | Shared i18n instance and overlapping key namespace unchanged |
| 09-006 | MEDIUM | **verified-fixed** | `teacher/src/parent/components/Sidebar.jsx:66,74` | `/chat/unread-count` called at 30s interval; `getUnreadCount` no longer used for badge (same as 04-002) |
| 09-007 | MEDIUM | **partially-fixed** | `teacher/src/App.jsx:24,99` | Route `/ai-warnings` now wired and imported; no Sidebar/BottomNav link — not navigable from parent UI |
| 09-008 | LOW | **not-fixed** | `teacher/src/parent/pages/AIWarnings.jsx:46` | `alert()` still present; less impactful since resolve button is hidden from parents (09-001 fixed) |
| 09-009 | LOW | **not-fixed** | `teacher/src/parent/locales/uz/common.json:38` | `"superAdminReply": "Davlat javobi"` key name unchanged |
| 09-010 | LOW | **not-fixed** | `teacher/src/parent/pages/Login.jsx` (file exists); `App.jsx:12,58` | `parent/pages/Login.jsx` still exists; `App.jsx:58` routes to teacher-level `./pages/Login` — parent file is dead code |

**Verdict distribution: 3 verified-fixed · 1 partially-fixed · 6 not-fixed**

---

## Detailed Findings

### 09-001 — Resolve button hidden from parents (verified-fixed)

`teacher/src/parent/pages/AIWarnings.jsx:176` (current):
```jsx
{!warning.isResolved && user?.role !== 'parent' && (
  <button onClick={() => resolveWarning(warning.id)}>
    ...
  </button>
)}
```

The resolve button is now conditionally rendered. Parents (`role === 'parent'`) do not see it. The button remains visible to admin and government users, who have the required `requireRole('admin', 'government')` permission on the backend route (`aiWarningRoutes.js:27`). The original bug — parent clicks "Resolve" and gets a 403 displayed as `alert()` — no longer occurs because the button is hidden.

Note: The `resolveWarning` function and `alert()` error handler still exist in the file — they are just unreachable from parent sessions.

---

### 09-002 — Third ToastContext (not-fixed)

Same as Phase 4 finding 04-001. Three ToastContext implementations coexist in the teacher bundle:
1. `shared/context/ToastContext.jsx` (monorepo shared)
2. `teacher/src/shared/context/ToastContext.jsx` (teacher local copy)
3. `teacher/src/parent/context/ToastContext.jsx` (parent local copy)

`ParentApp.jsx:12-13` renders `<ToastProvider>` inside `App.jsx`'s outer `<ToastProvider>`. Two `ToastContainer` DOM nodes at different positions. Unchanged.

---

### 09-003 — Help.jsx localized (verified-fixed)

Same as Phase 4 finding 04-005. Help.jsx is now fully i18n'd — all strings via `t()`, real email/phone via locale, quick links via `<Link>`. The US phone placeholder and `uchqunplatform.com` email are gone. Fixed via tracker `#04-001`.

---

### 09-004 — `parentT` custom function (not-fixed)

`teacher/src/parent/components/Sidebar.jsx:43-56` (current):
```js
const parentTranslations = { uz: uzParent, ru: ruParent, en: enParent };
const currentLang = i18n.language || 'uz';
const parentT = (key, defaultValue) => {
  const keys = key.split('.');
  let value = parentTranslations[currentLang];
  for (const k of keys) { value = value?.[k]; }
  return value || defaultValue || key;
};
```

`parentT` is still defined and used at line 106: `{parentT('sidebar.title', 'Uchqun Parent')}`.

The nav items (lines 84-93) now use `t()` instead of `parentT` — a partial improvement that reduced the workaround's scope to just the sidebar title. However, the root cause (shared i18n namespace collision between teacher and parent — 09-005) is unchanged, so the workaround cannot be fully removed.

---

### 09-007 — AIWarnings route wired (partially-fixed)

`teacher/src/App.jsx:24`:
```jsx
const AIWarnings = lazy(() => import('./parent/pages/AIWarnings'));
```

`teacher/src/App.jsx:99`:
```jsx
<Route path="ai-warnings" element={<ErrorBoundary><AIWarnings /></ErrorBoundary>} />
```

The page is now reachable at `/ai-warnings` within the parent route tree. Fixed via tracker `L-12`.

**Still broken:** No Sidebar link and no BottomNav entry exist for `/ai-warnings` in the parent components. A parent cannot navigate to the page from the app UI — they can only reach it by typing the URL directly or following an external link. The page is routed but not navigable from within the parent portal.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Removal Completeness | 82% | 82% | 0 | Expo app still cleanly gone; no new mobile artifacts |
| Leftover Artifacts | 45% | 49% | +4 | (1) Help.jsx now clean (no English-only i18n bypass); (2) parent Login.jsx still dead code; (3) orphaned AIWarnings now has a route |
| Parent App Correctness | 38% | 48% | +10 | (1) Resolve button now hidden from parents — broken workflow eliminated; (2) AIWarnings routable; (3) Help page shows real contacts; (4) alert() code still present but unreachable by parents |
| Structural Coherence | 35% | 37% | +2 | (1) Nav items reduced use of `parentT`; (2) three ToastContexts unchanged; (3) namespace collision unchanged |
| i18n Coverage | 42% | 47% | +5 | (1) Help page fully i18n'd — largest single i18n gap closed; (2) `superAdminReply` key unchanged; (3) namespace collision unchanged |
| Test Coverage | 10% | 10% | 0 | No parent portal tests added |
| Risk-on-Touch | 60% | 63% | +3 | (1) Role check on resolve button prevents parent 403 errors; (2) unread badge uses dedicated endpoint; (3) `parentT` still fragile |
| Documentation | 20% | 20% | 0 | No docs on embedded SPA architecture added |
| **Overall** | **41%** | **47%** | **+6** | |

---

## Open Questions (from v1, updated)

1. **09-005 namespace collision:** The `parentT` workaround confirms this already caused a production breakage. Moving parent translations to a separate `ns: 'parent'` namespace is the correct fix but was not done.
2. **09-007 AIWarnings nav:** Routed but not linked in Sidebar or BottomNav — the page is functionally orphaned from a UX perspective even if technically reachable.
3. **09-002 three ToastContexts:** Unchanged. Parent alert-toast divergence surface still active.
4. **09-010 dead Login.jsx:** `teacher/src/parent/pages/Login.jsx` should be deleted; it is never imported.

---

## What I Did NOT Look At

- Full parent Sidebar.jsx content (only key lines grep'd)
- Whether parent BottomNav has an AIWarnings icon slot
- `teacher/src/parent/locales/en/common.json` and `ru/common.json` for `superAdminReply` presence (only uz checked)
- Whether any external link or notification directs parents to `/ai-warnings`
