# Government Portal — Step 3: Cleanup Execution

**Portal:** Government  
**Date:** 2026-05-21  
**Executor:** Claude Sonnet 4.6  
**Input plan:** `audits/government/02-cleanup-plan.md` (6 batches, 14 findings GOV-001–GOV-014)  
**Final state:** 65 tests / 10 suites / lint 0 (--max-warnings 0) / 311 i18n keys

---

## Batch 1 — Critical + High Correctness (GOV-001, GOV-002, GOV-005)

**Commit:** `1617f8f`  
**Files:** `government/src/pages/Dashboard.jsx`, `government/src/components/tabs/RegistrationsTab.jsx`, `government/src/context/AuthContext.jsx`

| Finding | Fix | Revert-test |
|---|---|---|
| GOV-001 | Dashboard `?resolved=false` → `?isResolved=false`; warning count read from `res.data?.data?.total` instead of `res.data?.data?.warnings?.length` | Written in prior session; failed (wrong count) before fix, passed after |
| GOV-002 | RegistrationsTab credentials email path: `approvedCredentials.email` → `approvedCredentials.admin?.email` | Written in prior session; failed (undefined) before fix, passed after |
| GOV-005 | AuthContext: HTTP 401 with error code `ACCOUNT_NOT_ACTIVE` now sets `accountSuspended` toast instead of generic `error` | Written in prior session; failed (generic error shown) before fix, passed after |

Revert-test evidence captured in prior session context window.

---

## Batch 2 — i18n Completeness (GOV-004, GOV-013, GOV-014)

**Commit:** `67f6b2e`  
**Files:** `government/src/locales/{en,uz,ru}/common.json`, `government/src/pages/Login.jsx`, `government/scripts/verify-i18n.js`, `government/package.json`

| Finding | Fix |
|---|---|
| GOV-004 | Added full `warnings.*` section (22 keys with nested `severity` object) to all 3 locale files |
| GOV-013 | Login.jsx password toggle `aria-label` from hardcoded Uzbek strings to `t('login.showPassword')` / `t('login.hidePassword')` |
| GOV-014 | Added 17 missing keys (dashboard, schools, profile sections) to all 3 locale files |

**verify-i18n script:** `node scripts/verify-i18n.js` → exit 0, 309→310 keys after Batch 2.

**Russian locale:** All keys present. Values are AI-generated; `_metadata.verification_status = "UNVERIFIED"` block present in `ru/common.json`. PL-009-VERIFY tracks the required native-speaker review before launch.

---

## Batch 3 — Schools Interim Mitigation (GOV-003, GOV-010)

**Commit:** `ed75cd2`  
**Files:** `government/src/pages/Schools.jsx`, `government/src/__tests__/Schools.test.jsx`, `government/src/locales/{en,uz,ru}/common.json`

| Finding | Fix | Status |
|---|---|---|
| GOV-003 | `useFetch('/government/schools?limit=999')` — fetches up to 999 schools to prevent silent truncation | **Interim mitigation only.** Full fix (pagination UI) deferred to CP-001 |
| GOV-010 | Badge shows `schools.length/total` when truncated (e.g. `"47/250"`), clean `total` when complete | Same deferral |

**Export truncation warning:** `useToast().warning(t('schools.exportTruncated', ...))` fires when CSV export covers a truncated list. No warning when list is complete.

**TODO comment added:** `// TODO: CP-001 — replace with pagination controls when pagination UI is built`

**5 tests added** (fetch URL, badge truncated, badge complete, warning toast truncated, no warning complete) — all passing.

---

## Batch 4 — Error Format Normalization (GOV-007)

**Commit:** `eb03280`  
**Files:** `government/src/pages/Platform.jsx`, `government/src/pages/AIWarnings.jsx`, `government/src/pages/Settings.jsx`, `government/src/pages/Profile.jsx`, `government/src/components/tabs/MessagesTab.jsx`

12 `err.response?.data?.error` reads across 5 files normalized to:
```js
err.response?.data?.error?.detail ?? err.response?.data?.error ?? t('...')
```
This handles both the legacy `{ error: "string" }` shape and the new `{ error: { code, detail } }` shape per BACKEND-012 spec.

Profile.jsx special case (lines 44–45):
```js
const apiError = err.response?.data?.error;
const msg = details?.length ? details.map(d => d.message).join('; ') : (apiError?.detail ?? apiError);
```

No behavior change for current backend endpoints (all still return legacy shape). Endpoints migrated to new shape in future will display `detail` correctly without further frontend changes.

---

## Batch 5 — State + UX Consistency (GOV-006, GOV-008, GOV-009)

**Commit:** `9e0db97`  
**Files:** `government/src/components/tabs/MessagesTab.jsx`, `government/src/pages/SchoolDetail.jsx`, `government/src/locales/{en,uz,ru}/common.json`, `government/src/__tests__/MessagesTab.test.jsx`

### GOV-006: Stale closure in MessagesTab unread count

**Before (lines 52–59 pre-fix):**
```js
setMessages(prev => append ? [...prev, ...incoming] : incoming);
// ...
const unread = (append
  ? [...(append ? messages : []), ...incoming]  // `messages` stale closure
  : incoming
).filter(m => !m.isRead).length;
onUnreadCountChange?.(unread);
```

`fetchMessages` has `[debouncedSearch]` as deps. `messages` is never in deps — intentionally suppressed with `// eslint-disable-line react-hooks/exhaustive-deps`. After page 1 loads, `messages` state = `[msg1, msg2]`, but the closure still captures `messages = []`. Load-more (append=true) reports only the new page's unread count, not the total.

**Revert-test FAIL (pre-fix):**
```
AssertionError: expected last "vi.fn()" call to have been called with [ 2 ]
- Expected: [2,]
+ Received: [1,]
```

**Fix:** Moved `onUnreadCountChange` call inside the `setMessages` functional updater so it always uses the fresh `prev` state:
```js
setMessages(prev => {
  const merged = append ? [...prev, ...incoming] : incoming;
  onUnreadCountChange?.(merged.filter(m => !m.isRead).length);
  return merged;
});
```
Added `onUnreadCountChange` to deps array, removed eslint-disable comment.

**Revert-test PASS (post-fix):** 2 tests passed in 754ms.

### GOV-008: window.confirm in MessagesTab handleDelete

**Revert-test FAIL (pre-fix):**
```
AssertionError: expected "bound " to not be called at all, but actually been called 1 times
Received: 1st call: Array ["Xabarni o'chirishni tasdiqlaysizmi?"]
```

**Fix:** Replaced `window.confirm` with `ConfirmDialog` component:
- Added `deleteTarget` state
- `handleDelete(msgId)` → `setDeleteTarget(msgId)` (no more blocking confirm call)
- `handleConfirmedDelete()` — runs the actual `api.delete(...)` after ConfirmDialog confirm
- `<ConfirmDialog dialog={...} onCancel={...} />` added to JSX
- Locale key `government.confirmDeleteMessage` added to all 3 locale files

**Revert-test PASS (post-fix):** window.confirm not called; `data-testid="confirm-dialog"` present.

### GOV-009: Dead fallbacks in SchoolDetail.jsx

```js
// Before:
const school = data.school || data;  // data.school always undefined
const stats = data.stats || {};       // data.stats always undefined
// lines 111-112 used: school.studentsCount || stats.studentsCount || 0

// After:
const school = data;
// TODO: CP-014 — add archived banner when school.isActive === false
// lines 111-112 use: school.studentsCount || 0
```

No revert-test required — dead code removal, no runtime behavior change.

---

## Batch 6 — Hygiene (GOV-011, GOV-012)

**Commit:** `bf73086`  
**Files:** `government/package.json`, `government/package-lock.json`, `government/src/pages/Dashboard.jsx`

| Finding | Fix |
|---|---|
| GOV-011 | Confirmed zero `import express` / `require('express')` usages in `government/src/**`; removed `"express": "^4.18.2"` from dependencies; `npm install` removed 52 packages |
| GOV-012 | Removed `console.error('[Dashboard] revalidation error:', err)` at Dashboard.jsx:56; replaced with `.catch(() => {})` |

---

## Final State

| Metric | Value |
|---|---|
| Tests | 65 passing / 10 suites |
| Lint | 0 warnings (--max-warnings 0) |
| i18n keys | 311 (uz master; all present in en + ru) |
| Batch commits | `1617f8f` → `67f6b2e` → `ed75cd2` → `eb03280` → `9e0db97` → `bf73086` |

### Findings closed

| ID | Severity | Status |
|---|---|---|
| GOV-001 | Critical | ✅ Closed |
| GOV-002 | High | ✅ Closed |
| GOV-003 | High | ⚠️ Interim mitigation (CP-001 deferred) |
| GOV-004 | High | ✅ Closed |
| GOV-005 | High | ✅ Closed |
| GOV-006 | Medium | ✅ Closed |
| GOV-007 | Medium | ✅ Closed |
| GOV-008 | Medium | ✅ Closed |
| GOV-009 | Medium | ✅ Closed |
| GOV-010 | Medium | ⚠️ Interim mitigation (CP-001 deferred) |
| GOV-011 | Low | ✅ Closed |
| GOV-012 | Low | ✅ Closed |
| GOV-013 | Low | ✅ Closed |
| GOV-014 | Low | ✅ Closed |

12 fully closed, 2 interim mitigations (GOV-003/010 — same root cause, awaiting CP-001 pagination UI).

### Open deferred items (not part of cleanup scope)

- **CP-001** — Schools pagination UI (currently blocked at `?limit=999` interim)
- **CP-014** — Archived school banner in SchoolDetail (`// TODO: CP-014` comment placed)
- **CP-016** — Restore UI (no government-side restore endpoint exists yet)
- **CP-019** — i18n auto-translation notice (tracked, deferred to feature phase)

### Plan divergences

None. All 6 batches executed as planned. GOV-008 ConfirmDialog prop API confirmed against `shared/components/ConfirmDialog.jsx` before implementing (`dialog = { message, onConfirm, requireReason? }`). GOV-006 eslint-disable comment removed by adding `onUnreadCountChange` to deps rather than keeping the suppression.
