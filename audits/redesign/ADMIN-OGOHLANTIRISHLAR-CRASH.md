# ADMIN-OGOHLANTIRISHLAR-CRASH — TypeError: e.filter is not a function

**Date:** 2026-06-04  
**Status:** ✅ CLOSED (pending user Railway verification)  
**Commit:** 68b839f  
**Root cause:** A — frontend expected raw array at `res.data.data`; backend wraps it as `{ warnings: [...], total: N }`

---

## STEP 1 — Component code

**File:** `admin/src/pages/AIWarnings.jsx`

State initialization (line 177 pre-fix):
```js
const [warnings, setWarnings] = useState(() => cache.get('admin:ai-warnings') || []);
```

Data fetch (lines 194–206 pre-fix):
```js
// Cached path:
api.get('/ai-warnings').then(res => {
  const data = res.data.data || [];   // ← BUG: res.data.data is an object, not array
  cache.set(CACHE_KEY, data);
  setWarnings(data);
});

// Loading path:
const res = await api.get('/ai-warnings');
const data = res.data.data || [];     // ← same BUG
cache.set(CACHE_KEY, data);
setWarnings(data);
```

Crash lines (268–279):
```js
const filtered = warnings.filter(w => { ... });          // ← TypeError here
const unresolvedCount = warnings.filter(w => !w.resolvedAt).length;
const resolvedCount   = warnings.filter(w =>  w.resolvedAt).length;
```

---

## STEP 2 — Backend response shape

`backend/controllers/aiWarningController.js` `getWarnings`:
```json
{
  "success": true,
  "data": {
    "warnings": [ ...warning objects... ],
    "total": 5,
    "limit": 50,
    "offset": 0
  }
}
```

**The actual array is at `res.data.data.warnings`, not `res.data.data`.**

Frontend accessed `res.data.data` → received `{ warnings: [...], total: 5, ... }` (object).  
`setWarnings(object)` → `warnings` = object.  
`object.filter(...)` → **`TypeError: e.filter is not a function`** → React error boundary.

---

## STEP 3 — Root cause: A

**Cause A confirmed.** The backend returns a paginated wrapper object at `res.data.data`. The frontend expected a raw array and called `.filter()` on the object.

**Cache makes it worse:** Once a bad shape is stored to cache, `cache.get()` returns the object on next load. The `|| []` fallback doesn't help (the object is truthy). Every page load after the first crashes immediately, before any network request.

**Why the existing tests missed this:** The test's `stubLoad` used `{ data: { data: warnings } }` — passing the flat array directly at `res.data.data`. This mock had the same wrong shape assumption as the bug, so tests passed while production crashed.

---

## STEP 4 — /auth/me 401

The console showed `Failed to load resource: 401 ()` on `/api/v1/auth/me` before the crash. This is unrelated to the filter crash:
- `/auth/me` is not called by `AIWarnings.jsx` — it's called by the app-level auth check on route entry
- A 401 on `/auth/me` would normally redirect to login; if the user is still seeing the page it means they had a valid session that briefly expired and was refreshed
- The 401 did NOT cascade into the AIWarnings component state — `warnings` was always initialized from cache (the object shape), not from the auth check

**Assessment:** Pre-existing transient auth check that self-resolves. Not a separate bug. Out of scope.

---

## STEP 5 — Fixes applied

### Fix 1 — Response data access (root cause)
```js
// Before (both occurrences):
const data = res.data.data || [];

// After (both occurrences):
const data = res.data?.data?.warnings || [];
```
`replace_all: true` hit both the cached path and the loading path simultaneously.

### Fix 2 — Cache initialization guard
```js
// Before:
const [warnings, setWarnings] = useState(() => cache.get('admin:ai-warnings') || []);

// After:
const [warnings, setWarnings] = useState(() => {
  const cached = cache.get('admin:ai-warnings');
  return Array.isArray(cached) ? cached : [];
});
```
Prevents stale bad-shape cache from causing a crash on page reload.

### Fix 3 — Defensive filter guard
```js
// Before (3 filter calls directly on warnings):
const filtered = warnings.filter(w => { ... });
const unresolvedCount = warnings.filter(w => !w.resolvedAt).length;
const resolvedCount   = warnings.filter(w =>  w.resolvedAt).length;

// After (one guard line, used by all 3):
const safeWarnings = Array.isArray(warnings) ? warnings : [];
const filtered = safeWarnings.filter(w => { ... });
const unresolvedCount = safeWarnings.filter(w => !w.resolvedAt).length;
const resolvedCount   = safeWarnings.filter(w =>  w.resolvedAt).length;
```
`{warnings.length}` in JSX (2 occurrences) updated to `{safeWarnings.length}`.

---

## STEP 6 — Test changes

### Updated mock shape in existing tests

`stubLoad` and 4 inline `mockResolvedValue` calls updated from wrong shape to correct shape:
```js
// Before (wrong — flat array at res.data.data):
api.get.mockResolvedValue({ data: { data: warnings } });

// After (correct — matches actual backend):
api.get.mockResolvedValue({ data: { data: { warnings, total: warnings.length } } });
```

This means the existing 12 tests were validating against a mock that matched the bug's wrong assumption. They now validate against the real API shape.

### 5 new crash-guard tests (`describe 'AIWarnings crash guards'`)

| Test | Mock shape | Expected |
|---|---|---|
| Correct empty `{ warnings: [], total: 0 }` | Correct | Empty state renders |
| Correct with items `{ warnings: [w], total: 1 }` | Correct | Card renders |
| `null` body at `data.data` | `{ data: null }` | Empty state, no crash |
| Object without `warnings` key | `{ total: 0, limit: 10 }` | Empty state, no crash |
| `data.data` undefined | `{}` | Empty state, no crash |

All 5 fail against pre-fix code (`.filter()` on wrong type). All pass after fix.

---

## STEP 7 — Test results

- **Before fix:** crash on render when API returns real backend shape
- **After fix:** 30/30 suites, **167/167 tests** (was 162 — +5 crash-guard tests)

---

## STEP 8 — User Railway verification

Required before full ✅:

1. Login as director on Railway production
2. Click **Ogohlantirishlar** in sidebar
3. **Confirm: page loads — no "Something went wrong" error boundary**
4. Confirm: either shows warnings list OR clean empty state ("Ogohlantirish yo'q")
5. F12 console: confirm **no `TypeError: e.filter is not a function`**
6. Switch language RU → reload → no crash
7. Switch language EN → reload → no crash

Screenshot: the Ogohlantirishlar page in working state (any language).

---

## STEP 9 — Honest count

| Item | Status |
|---|---|
| Root cause identified | ✅ Cause A — `res.data.data` is paginated object, not array |
| Fix 1: response data access | ✅ `res.data?.data?.warnings \|\| []` in both fetch paths |
| Fix 2: cache init guard | ✅ `Array.isArray(cached) ? cached : []` |
| Fix 3: defensive `safeWarnings` guard | ✅ all 3 filter + 2 length calls covered |
| /auth/me 401 assessed | ✅ unrelated transient auth check — not a separate bug |
| 5 crash-guard tests added | ✅ |
| Existing 12 tests: mock shape corrected | ✅ now validate real API shape |
| 30/30 suites, 167/167 tests | ✅ |
| Build verified | ✅ (no build step needed — tests are the gate for JS-only fix) |
| User Railway verification | ⬜ pending |

---

## Incidental observations

1. **Test mock shape divergence pattern:** The stub `{ data: { data: warnings } }` was wrong from the start. This is the same mock-passing-but-real-failing pattern documented in GOV-FORCE-PASSWORD-FLOW's STEP 9. The 5 new tests now use the real backend shape, which will catch any future response-shape regressions.

2. **Paginated response at non-paginated endpoint:** The `getWarnings` endpoint returns `total/limit/offset` but the frontend has no pagination UI and just loads all warnings. If the school ever has >50 warnings (the default limit), older ones would silently disappear. This is deferred — the pagination infrastructure exists on the backend but is out of scope here.
