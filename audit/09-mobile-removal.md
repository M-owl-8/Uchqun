# Phase 9 — Mobile App Removal Audit
## Scope: Was the mobile app cleanly removed? What parent-facing artifacts remain?

> Audit only — no modifications to project files.
> All file references include path + line range.

---

## Scorecard

| Metric | Score | Notes |
|--------|-------|-------|
| Removal Completeness | 82/100 | Expo app gone; no React Native deps; no native artifacts in tree |
| Leftover Artifacts | 45/100 | Parent portal migrated into teacher app as embedded SPA — 30+ files, 3rd ToastContext |
| Parent App Correctness | 38/100 | Resolve button visible but broken; Help page English-only with US placeholder; orphaned AIWarnings page |
| Structural Coherence | 35/100 | Three ToastContexts in one bundle; custom `parentT` bypasses i18n; shared i18n key conflicts |
| i18n Coverage | 42/100 | Parent locales separate from shared/locales; `superAdminReply` key still present; Help page entirely English |
| Test Coverage | 10/100 | Zero tests for the parent portal (no test files in teacher/src/parent/) |
| Risk-on-Touch | 60/100 | Shared i18n namespace collision; single login for two roles; ToastProvider nesting |
| Documentation | 20/100 | No docs explaining embedded SPA architecture; `parentT` workaround undocumented |
| **Overall** | **41/100** | |

---

## 1. What Was Removed — Clean

The plan's Phase 1 tasks are verifiably complete:

- **No `mobile/` directory** — the Expo/React Native app is gone
- **No React Native dependencies** — `react-native`, `expo`, `@expo/*`, `metro` not present in any `package.json` at the root or app level
- **No `app.json` / `babel.config.js` / `metro.config.js`** — Expo configuration files absent
- **No push notification infrastructure** — no FCM / APNS tokens, no `expo-notifications`, no push token storage in the User model or backend
- **No mobile-specific routes** — no `/push-token`, `/device`, `/mobile/*` backend routes
- **CI/CD is clean** — `.github/workflows/ci.yml` has no Expo build, EAS, or TestFlight steps

The `plan.md` entry confirms: *"✅ Mobile app removed — web-only going forward (Expo app + Expo push stack deleted)"*

---

## 2. What Was Not Removed — The Embedded Parent Portal

The parent-facing experience was not deleted. It was migrated into the teacher app as a complete embedded SPA at [`teacher/src/parent/`](teacher/src/parent/).

**Contents — 30+ files across 4 layers:**

| Layer | Files | Status |
|-------|-------|--------|
| Context | `AuthContext.jsx`, `ChildContext.jsx`, `ToastContext.jsx`, `NotificationContext.jsx` | AuthContext is a re-export; ToastContext is a third duplicate |
| Components | `BottomNav.jsx`, `Card.jsx`, `LanguageSwitcher.jsx`, `Layout.jsx`, `LoadingSpinner.jsx`, `ProtectedRoute.jsx`, `Sidebar.jsx`, `Toast.jsx`, `TopBar.jsx` | All local copies |
| Pages | `Activities.jsx`, `AIChat.jsx`, `AIWarnings.jsx`, `Chat.jsx`, `ChildProfile.jsx`, `Dashboard.jsx`, `Help.jsx`, `Login.jsx`, `Meals.jsx`, `Media.jsx`, `Notifications.jsx`, `Settings.jsx`, `TeacherRating.jsx`, `Therapy.jsx` | 14 pages (AIWarnings is orphaned) |
| Locales | `locales/{uz,ru,en}/common.json` | Separate from `shared/locales/` |

**Route architecture:** [`teacher/src/App.jsx:45–113`](teacher/src/App.jsx#L45)

```jsx
// Parent portal — routes at root "/"
<Route path="/" element={<ProtectedRoute requireRole="parent"><ParentApp /></ProtectedRoute>}>
  <Route index element={<ParentDashboard />} />
  <Route path="child" ... /> <Route path="activities" ... /> ... 11 routes
</Route>

// Teacher app — routes at "/teacher"
<Route path="/teacher" element={<ProtectedRoute requireRole="teacher"><Layout /></ProtectedRoute>}>
  <Route index element={<Dashboard />} /> ... 9 routes
</Route>
```

The teacher app (port 5174) now serves two distinct applications sharing one Vite bundle, one login page, and one set of provider contexts.

---

## 3. Issues Found

### Issue 09-001 — HIGH: Parent Can See "Mark as Resolved" Button That Always Fails

[`teacher/src/parent/pages/AIWarnings.jsx:41–48`](teacher/src/parent/pages/AIWarnings.jsx#L41):

```js
const resolveWarning = async (warningId) => {
  try {
    await api.put(`/ai-warnings/${warningId}/resolve`);
    loadWarnings();
  } catch (error) {
    alert(error.response?.data?.error || 'Failed to resolve warning');
  }
};
```

The backend route `PUT /api/ai-warnings/:id/resolve` is guarded by `requireRole('admin', 'government')` ([`backend/routes/aiWarningRoutes.js:22`](backend/routes/aiWarningRoutes.js#L22)). A parent has `role = 'parent'` — they will always get a 403. The resolve button is rendered unconditionally for every unresolved warning ([`AIWarnings.jsx:176–182`](teacher/src/parent/pages/AIWarnings.jsx#L176)). When a parent clicks it they get a browser-native `alert()` with the error — no `useToast()` call, no graceful failure UI.

---

### Issue 09-002 — HIGH: Third `ToastContext` in One Vite Bundle

[`teacher/src/parent/context/ToastContext.jsx`](teacher/src/parent/context/ToastContext.jsx) is a third full `ToastContext` implementation in the same bundle:

| File | Instance |
|------|---------|
| `shared/context/ToastContext.jsx` | Monorepo shared |
| `teacher/src/shared/context/ToastContext.jsx` | Teacher local copy |
| `teacher/src/parent/context/ToastContext.jsx` | Parent local copy — **this one** |

`ParentApp.jsx:3–5` imports and renders its own `<ToastProvider>`, which nests inside the outer `<ToastProvider>` from `App.jsx`. Parent-section components importing from `../context/ToastContext` will correctly use the innermost provider. But:

1. Any parent component that accidentally imports from `../../shared/context/ToastContext` (the teacher layer) will silently get a different context instance — no error, but toasts will appear in the wrong container.
2. All three implementations are identical byte-for-byte (same `addToast`, `success`, `error`, `warning`, `info` API). This is pure duplication with no behavioral difference.
3. `parent/components/Toast.jsx` also has its own `<ToastContainer>` at `top-4 right-4`. The outer teacher `Toast.jsx` positions at `top-20`. Two `ToastContainer` DOM nodes exist simultaneously at different positions.

---

### Issue 09-003 — HIGH: `Help.jsx` Is Entirely English with Placeholder US Contact Info

[`teacher/src/parent/pages/Help.jsx`](teacher/src/parent/pages/Help.jsx) (98 lines):

- **Zero i18n calls** — all 4 FAQ questions, all 4 FAQ answers, all section headings, all button labels are English strings in JSX
- **Phone**: `+1 (555) 123-4567` — US placeholder, not a real Uzbekistan number
- **Email**: `support@uchqunplatform.com` — unverified placeholder
- **Quick Links**: use `<a href="/activities">` with hardcoded English anchor text

The parent portal's primary users are Uzbek-speaking parents of children with disabilities in Uzbekistan. The only help page they see is English-only content with an inaccessible US phone number.

---

### Issue 09-004 — MEDIUM: Parent Sidebar Uses a Custom Translation Function That Bypasses i18n

[`teacher/src/parent/components/Sidebar.jsx:43–56`](teacher/src/parent/components/Sidebar.jsx#L43):

```js
const parentTranslations = {
  uz: uzParent,
  ru: ruParent,
  en: enParent,
};
const currentLang = i18n.language || 'uz';
const parentT = (key, defaultValue) => {
  const keys = key.split('.');
  let value = parentTranslations[currentLang];
  for (const k of keys) { value = value?.[k]; }
  return value || defaultValue || key;
};
```

This workaround exists because `t('sidebar.title')` resolves to the teacher sidebar's translation ("Uchqun Teacher") instead of the parent's ("Uchqun Ota-ona"). The parent and teacher apps share the same i18n namespace and the same keys — the last app to initialize wins.

`parentT` reads `i18n.language` at render time but the component won't re-render when the language changes unless something causes a re-render. In practice, `i18n.changeLanguage()` triggers a re-render via `useTranslation()`, so the standard `t()` calls in the component will update while `parentT` picks up the new `i18n.language` value incidentally. This likely works at runtime but is fragile and undocumented.

---

### Issue 09-005 — MEDIUM: Shared i18n Namespace Collision Between Teacher and Parent Apps

The teacher app and the parent portal share one i18n instance (confirmed by [`teacher/src/parent/i18n.js`](teacher/src/parent/i18n.js): `import i18n from '../i18n'; export default i18n;`). Both apps use the default translation namespace. The parent locale files at `teacher/src/parent/locales/` contain keys like `nav.home`, `nav.activities`, `sidebar.title` — the same keys used by the teacher app.

Which value a `t('nav.activities')` call returns depends on the order i18n resources are merged. This means:

- A teacher seeing the parent's navigation labels for a shared key is possible
- Adding a key to the parent locales may silently override a teacher key with the same name
- The `parentT` workaround in Sidebar is the only documented evidence that this collision has already bitten the team at least once

The correct fix is to put parent translations in a separate namespace (e.g. `parent`) and call `t('nav.activities', { ns: 'parent' })`.

---

### Issue 09-006 — MEDIUM: Parent Portal Polls Full Message History for Unread Count

[`teacher/src/parent/components/Sidebar.jsx:58–78`](teacher/src/parent/components/Sidebar.jsx#L58): polling `getUnreadCount(conversationId, 'parent')` every 5 seconds.

`chatStore.getUnreadCount` at [`teacher/src/shared/services/chatStore.js:30–36`](teacher/src/shared/services/chatStore.js#L30) loads ALL messages for the conversation (up to 200) then counts unread client-side:

```js
export async function getUnreadCount(conversationId, role = 'parent') {
  const msgs = await loadMessages(conversationId);  // GET /chat/messages?limit=200
  return msgs.filter((m) => { ... }).length;
}
```

For a parent with a long chat history, this downloads the entire conversation to count one number every 5 seconds. The backend exposes `GET /api/chat/unread-count` which computes this with a single SQL `COUNT` query.

---

### Issue 09-007 — MEDIUM: `AIWarnings.jsx` Is an Orphaned Page — Not Routed or Linked

`teacher/src/parent/pages/AIWarnings.jsx` exists (215 lines, fully implemented) but:

- It is **not imported** in `teacher/src/App.jsx` (no `lazy(() => import('./parent/pages/AIWarnings'))`)
- It is **not routed** — no `<Route path="ai-warnings" ... />` in the parent route tree
- It is **not linked** in `teacher/src/parent/components/Sidebar.jsx` navigation
- It is **not linked** in `teacher/src/parent/components/BottomNav.jsx`

Additionally, the page would be non-functional for parents even if it were routed: the resolve button calls an admin-only endpoint (Issue 09-001), and the page is not connected to `useToast()` — errors fall back to `alert()`.

---

### Issue 09-008 — LOW: Parent App's `AIWarnings` Labels `alert()` on Error

[`teacher/src/parent/pages/AIWarnings.jsx:42–47`](teacher/src/parent/pages/AIWarnings.jsx#L42): all errors use `alert()` — the browser's native blocking dialog. Both `Chat.jsx` parent pages and `AIChat.jsx` correctly use `useToast()` for errors. `AIWarnings` is inconsistent and uses the oldest possible error pattern.

---

### Issue 09-009 — LOW: Parent Locale Has `superAdminReply` Key

[`teacher/src/parent/locales/uz/common.json:38`](teacher/src/parent/locales/uz/common.json#L38):

```json
"superAdminReply": "Davlat javobi",
```

This is a direct artifact of the `super_admin` → `government` migration from Phase 6. The key name `superAdminReply` is still present in the parent locale, though its value is already correct ("Davlat javobi" = "Government reply"). A consumer calling `t('profile.superAdminReply')` will get the correct text, but the key name is semantically wrong.

---

### Issue 09-010 — LOW: Single Login Serves Both Roles at Same URL

The teacher app serves both teacher users and parent users at the same origin (port 5174 in dev, same Netlify/Vercel deploy in prod). Both roles log in at `/login`. After login, `ProtectedRoute` redirects based on role:

- `role === 'parent'` → `/` (parent portal)
- `role === 'teacher'` → `/teacher`

However, `teacher/src/parent/pages/Login.jsx` is imported in `App.jsx` but the parent `Login.jsx` itself also exists. Looking at `App.jsx:57`, the single `<Route path="/login" element={<Login />} />` imports from `./pages/Login` (teacher login page). There is a `teacher/src/parent/pages/Login.jsx` that appears to be unused (the route uses the teacher-level `Login.jsx`).

The parent `Login.jsx` file is dead code — it is never routed.

---

## 4. Architecture Note: Two Apps in One Bundle

The embedded parent portal is not a failed removal — it is an intentional migration from the deleted Expo mobile app to a web-hosted parent portal. The approach works at runtime but creates structural debt:

**Current state:**
```
teacher app (port 5174, one Vite bundle, one deploy)
├── Teacher SPA at /teacher/*  (requireRole='teacher')
└── Parent SPA at /*           (requireRole='parent')
    └── 30+ files in teacher/src/parent/
        ├── Own context (3rd ToastContext, ChildContext)
        ├── Own components (Sidebar, BottomNav, Card, etc.)
        ├── Own locales (conflicting with teacher namespace)
        └── Own pages (14 routes, 1 orphaned)
```

**Clean alternative** (out of scope for this audit, noted for roadmap): The parent portal should be extracted to its own Vite app (`parent/`) with its own deploy — matching the pattern of `admin/`, `reception/`, and `government/`. This would eliminate the namespace collision, the duplicate contexts, and the shared-login ambiguity.

---

## 5. Issue Summary

| Issue | Severity | Location | Description |
|-------|----------|----------|-------------|
| "Resolve" button visible to parents, always returns 403 | HIGH | parent/pages/AIWarnings.jsx:41 | Admin-only endpoint shown in parent UI with `alert()` on failure |
| Third `ToastContext` in one bundle; nested `ToastProvider` | HIGH | parent/context/ToastContext.jsx | Three identical Toast implementations; two `ToastContainer` nodes |
| `Help.jsx` 100% English + US placeholder phone/email | HIGH | parent/pages/Help.jsx | No i18n; `+1 (555) 123-4567`; English only for Uzbek-speaking parents |
| `parentT` custom function bypasses i18n reactivity | MEDIUM | parent/components/Sidebar.jsx:43 | Workaround for namespace collision; fragile; undocumented |
| Shared i18n namespace collision between teacher and parent | MEDIUM | parent/i18n.js, parent/locales/ | Overlapping keys; `t()` resolution is order-dependent |
| Parent sidebar polls full message history for unread count | MEDIUM | parent/components/Sidebar.jsx:58 | 200-message fetch every 5s instead of unread-count endpoint |
| `AIWarnings.jsx` is orphaned — not routed or linked | MEDIUM | parent/pages/AIWarnings.jsx | 215-line page with no route entry and broken resolve button |
| `AIWarnings.jsx` uses `alert()` for errors | LOW | parent/pages/AIWarnings.jsx:45 | Inconsistent with rest of parent portal |
| `superAdminReply` i18n key in parent locale | LOW | parent/locales/uz/common.json:38 | Stale key name from super_admin migration |
| Parent `Login.jsx` file is dead code | LOW | parent/pages/Login.jsx | Exists but is never routed; teacher Login.jsx handles both roles |

**Total: 3 HIGH · 4 MEDIUM · 3 LOW = 10 issues**

---

## 6. What's Actually Good

- **Clean removal**: The Expo/React Native app is completely gone. No native artifacts, no push token infrastructure, no mobile-only dependencies.
- **Auth re-export**: `teacher/src/parent/context/AuthContext.jsx` is a correct re-export — no duplicate AuthProvider.
- **i18n re-export**: `teacher/src/parent/i18n.js` re-exports the teacher i18n instance rather than creating a second one.
- **API re-export**: `teacher/src/parent/services/api.js` re-exports from `@shared/services/api` — no duplicate Axios instance.
- **`ChildContext`**: The parent-specific `ChildContext` is well-designed — fetches children from `/child`, persists selected child in localStorage, provides a `loadChildren()` refresh method.
- **Route guards**: Both `ProtectedRoute` instances at the parent and teacher levels correctly check role before rendering, preventing cross-role access.
