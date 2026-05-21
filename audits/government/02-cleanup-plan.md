# Government Portal — Step 2 Cleanup Plan

**Date:** 2026-05-21  
**Based on:** `audits/government/01-audit.md` (14 findings, GOV-001 through GOV-014)  
**Batches:** 6  
**Scope:** Bugs only. The 4 CP gaps (D-1 through D-4) are S5/S6/S7 work.

---

## 0. Scope Boundary

This plan addresses all 14 bug findings from S1. It does **not** address:
- D-1 (CP-001): Schools pagination UI → deferred to S7 / CP-001 build
- D-2 (CP-014): Archive/reactivate buttons on SchoolDetail → deferred to S7 / CP-014
- D-3 (CP-016): Restore UI in government portal → deferred to S5 product decision
- D-4 (CP-019): AI translation notice on first login → deferred to S7 / CP-019 build

GOV-003 and GOV-010 are bugs *caused* by CP-001's absence. They receive **interim mitigations** only — documented stopgaps that reduce harm without building the full pagination feature. Full resolution lands in S7 alongside CP-001.

---

## 1. Finding Disposition

| ID | Severity | Action | Batch | Effort |
|---|---|---|---|---|
| GOV-001 | Critical | **Fix** — change `resolved` to `isResolved`; fix count reading to use `total` field | 1 | S |
| GOV-002 | High | **Fix** — read `approvedCredentials.admin?.email` instead of `approvedCredentials.email` | 1 | S |
| GOV-005 | High | **Fix** — add 401 + `ACCOUNT_NOT_ACTIVE` code branch in Login error handler | 1 | S |
| GOV-004 | High | **Fix** — add `warnings.*` section to all three locale files | 2 | M |
| GOV-014 | Low | **Fix** — add 17 missing dashboard/schools/profile keys to all three locale files | 2 | M |
| GOV-013 | Low | **Fix** — replace hardcoded Uzbek `aria-label` with `t()` calls; add keys to locales | 2 | S |
| GOV-003 | High | **Interim-mitigate** — pass `?limit=999`; show `total` in badge; add truncation warning if `schools.length < total` | 3 | S |
| GOV-010 | Medium | **Interim-mitigate** — disable CSV export or add warning toast when `schools.length < total` | 3 | S |
| GOV-007 | Medium | **Fix** — normalize all `err.response?.data?.error` reads to handle both string and object format | 4 | M |
| GOV-006 | Medium | **Fix** — replace stale-closure unread-count computation with functional state update | 5 | S |
| GOV-008 | Medium | **Fix** — replace `window.confirm` in MessagesTab with `ConfirmDialog` | 5 | M |
| GOV-009 | Medium | **Fix (partial)** — remove dead `|| data` and `|| {}` fallbacks in SchoolDetail; archived-banner is CP-014, deferred | 5 | S |
| GOV-011 | Low | **Fix** — remove `express` from production dependencies | 6 | S |
| GOV-012 | Low | **Fix** — remove `console.error` debug log from Dashboard | 6 | S |

---

## 2. Batch Definitions

---

### Batch 1 — Critical + High Correctness

**Findings:** GOV-001, GOV-002, GOV-005

**Objective:** Fix the one critical data bug and two high functional failures. Each is a small,
targeted change with no risk of side effects beyond the touched line. Batch together because
they share no file overlap and the combined change is still small and reviewable.

---

#### GOV-001 — Dashboard warning count (Critical)

**File:** `government/src/pages/Dashboard.jsx`

**Change 1 — Query param (line 45):**
```js
// Before:
api.get('/ai-warnings', { params: { resolved: false } }),
// After:
api.get('/ai-warnings', { params: { isResolved: false } }),
```

**Change 2 — Count reading (line 71):**

Current code:
```js
const aw = warningsRes.status === 'fulfilled'
  ? (warningsRes.value.data?.data?.length ?? warningsRes.value.data?.warnings?.length ?? 0)
  : 0;
```

The backend returns `{ success: true, data: { warnings: [], total, limit, offset } }`.
`res.data.data` is an object `{ warnings, total, ... }` — it has no `.length`. The fallback
chain evaluates to `0` regardless of actual warnings. The correct read is `total`:

```js
const aw = warningsRes.status === 'fulfilled'
  ? (warningsRes.value.data?.data?.total ?? 0)
  : 0;
```

`total` is the server-side count of unresolved warnings — accurate even if the list is
paginated or limited.

**Risk:** Low. `Promise.allSettled` means this change cannot throw. If the response shape
ever changes, the fallback `?? 0` keeps the dashboard safe.

**Verification method (revert-testable):**
Write a test that mocks `api.get('/ai-warnings', ...)` and confirms:
1. The request is made with `{ params: { isResolved: false } }` (not `{ resolved: false }`).
2. When the mock returns `{ data: { warnings: [{ id: 1 }, { id: 2 }], total: 2 } }`, the rendered
   warning count badge shows `2`.
3. Confirm the test **fails** when the call site uses `resolved: false` (the old code).

---

#### GOV-002 — Credentials email undefined (High)

**File:** `government/src/components/tabs/RegistrationsTab.jsx`

**Change (lines 131–132):**
```js
// Before:
<input type="text" readOnly value={approvedCredentials.email || ''} ... />
onClick={() => { navigator.clipboard.writeText(approvedCredentials.email); ... }}

// After:
<input type="text" readOnly value={approvedCredentials.admin?.email || ''} ... />
onClick={() => { navigator.clipboard.writeText(approvedCredentials.admin?.email || ''); ... }}
```

The `?.` guard on `.admin` prevents a crash if the approval response shape ever changes.
The `|| ''` guard on the clipboard write prevents writing the string `"undefined"`.

No change needed in `Platform.jsx:246` — `setApprovedCredentials(res.data?.data?.credentials || res.data?.data)`
already lands the full `{ request, admin, setPasswordUrl, telegramUsername }` object correctly
as `approvedCredentials`. The bug was only in how RegistrationsTab read it.

**Risk:** None. Email is at `.admin.email` as confirmed by backend `adminRegistrationController.js`.

**Verification method (revert-testable):**
Render `RegistrationsTab` with a mock `approvedCredentials = { admin: { email: 'test@x.com' }, setPasswordUrl: 'https://...', telegramUsername: 'bot' }`.
Assert the email input value equals `'test@x.com'`.
Confirm the test **fails** when reading `approvedCredentials.email` (the old path).

---

#### GOV-005 — Suspended-user login error mapping (High)

**File:** `government/src/pages/Login.jsx`

**Change (insert before the generic 401 branch, around line 29):**
```js
// Before:
else if (result.status === 403) setError(t('login.notApproved'));
// ... (eventually falls to generic error for 401)

// After:
else if (result.status === 403) setError(t('login.notApproved'));
else if (result.status === 401 && result.data?.error?.code === 'ACCOUNT_NOT_ACTIVE')
  setError(t('login.accountSuspended', { defaultValue: 'Hisobingiz to\'xtatilgan. Administrator bilan bog\'laning.' }));
```

Add `login.accountSuspended` to all three locale files as part of Batch 2 (i18n batch),
not here — Batch 1 focuses on logic correctness only. The `defaultValue` provides the
Uzbek fallback immediately so Batch 1 is self-contained.

**Risk:** The branch checks both status code AND error code — it cannot fire for a
legitimate "wrong password" 401.

**Verification method (revert-testable):**
Mock `api.post('/auth/login')` to reject with `{ response: { status: 401, data: { error: { code: 'ACCOUNT_NOT_ACTIVE' } } } }`.
Assert the displayed error message is the suspended-account message, not the generic "wrong password" message.
Confirm the test **fails** against the old code (which falls to generic error for all 401s).

**Batch 1 commit message:** `fix(government): GOV-001 warning count param+read, GOV-002 credentials email path, GOV-005 suspended login 401`

---

### Batch 2 — i18n Completeness

**Findings:** GOV-004, GOV-014, GOV-013 + locale-completeness CI check

**Objective:** Add all missing translation keys and the verify script that will prevent
recurrence. All new Russian/Uzbek values are AI-generated and labeled per the PL-009
discipline. All changes land in one commit for coherence.

---

#### GOV-004 — `warnings.*` section absent from all locales (High)

**Files:** `government/src/locales/en/common.json`, `uz/common.json`, `ru/common.json`

Add a `"warnings"` section to each file. Keys required (derived from `AIWarnings.jsx`
`t()` calls):

| Key | English | Uzbek (from defaultValue) | Russian |
|---|---|---|---|
| `warnings.title` | AI Warnings | AI Ogohlantirishlari | ИИ-предупреждения |
| `warnings.filterAll` | All | Barchasi | Все |
| `warnings.filterUnresolved` | Unresolved | Hal qilinmagan | Нерешённые |
| `warnings.filterResolved` | Resolved | Hal qilingan | Решённые |
| `warnings.resolveButton` | Mark as resolved | Hal qilindi deb belgilash | Пометить как решённое |
| `warnings.resolveError` | Failed to resolve warning | Ogohlantirishni hal qilishda xato | Не удалось обработать предупреждение |
| `warnings.resolveSuccess` | Warning marked as resolved | Ogohlantirish hal qilingan deb belgilandi | Предупреждение помечено как решённое |
| `warnings.empty` | No warnings found | Ogohlantirishlar topilmadi | Предупреждения не найдены |
| `warnings.loadError` | Failed to load warnings | Ogohlantirishlarni yuklashda xato | Не удалось загрузить предупреждения |

Also add `login.accountSuspended` (from Batch 1 GOV-005 fix):

| Key | English | Uzbek | Russian |
|---|---|---|---|
| `login.accountSuspended` | Your account has been suspended. Contact your administrator. | Hisobingiz to'xtatilgan. Administrator bilan bog'laning. | Ваш аккаунт приостановлен. Обратитесь к администратору. |

---

#### GOV-014 — 17 missing dashboard/schools/profile keys (Low)

**Files:** Same three locale files.

Add all 17 missing keys. English values are proper translations. Uzbek values are taken
verbatim from the `defaultValue` strings already in the code. Russian values are
AI-generated (see labeling note below).

Keys and values:

| Key | English | Uzbek (from defaultValue) | Russian |
|---|---|---|---|
| `dashboard.pendingAdmins` | Pending admin registrations | Kutilayotgan admin ro'yxatdan o'tishlari | Ожидающие регистрации администраторов |
| `dashboard.activeWarnings` | Active AI warnings | Faol AI ogohlantirishlari | Активные ИИ-предупреждения |
| `dashboard.andMore` | and {{count}} more | va yana {{count}} ta | и ещё {{count}} |
| `dashboard.viewAll` | View all | Barchasini ko'rish | Посмотреть все |
| `dashboard.schoolsMore` | +{{count}} more schools | +{{count}} ta maktab ko'proq | ещё {{count}} школ |
| `dashboard.regionalBreakdown` | Regional breakdown | Mintaqalar bo'yicha | По регионам |
| `dashboard.colRegion` | Region | Mintaqa | Регион |
| `dashboard.colSchools` | Schools | Maktablar | Школы |
| `dashboard.colAvgRating` | Average rating | O'rtacha reyting | Средний рейтинг |
| `dashboard.noRatings` | No regional rating data | Mintaqaviy reyting ma'lumotlari yo'q | Нет данных о региональных рейтингах |
| `dashboard.unknownRegion` | Unknown region | Noma'lum mintaqa | Неизвестный регион |
| `dashboard.pendingAdminList` | Pending registrations | Kutilayotgan ro'yxatdan o'tishlar | Ожидающие регистрации |
| `dashboard.noPendingAdmins` | No pending registrations | Kutilayotgan ro'yxatdan o'tishlar yo'q | Нет ожидающих регистраций |
| `schools.exportCSV` | Export CSV | CSV yuklab olish | Экспортировать CSV |
| `profile.governmentRole` | Government official | Hukumat amaldori | Государственный чиновник |
| `profile.save` | Save | Saqlash | Сохранить |
| `profile.edit` | Edit | Tahrirlash | Редактировать |

---

#### GOV-013 — Hardcoded Uzbek `aria-label` (Low)

**File:** `government/src/pages/Login.jsx:102`

```jsx
// Before:
aria-label={showPassword ? 'Parolni yashirish' : "Parolni ko'rsatish"}

// After:
aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')}
```

Add to all three locale files:

| Key | English | Uzbek | Russian |
|---|---|---|---|
| `login.showPassword` | Show password | Parolni ko'rsatish | Показать пароль |
| `login.hidePassword` | Hide password | Parolni yashirish | Скрыть пароль |

No `defaultValue` on these `t()` calls — the keys exist in all files so fallback is unnecessary.

---

#### i18n Labeling Discipline (All new keys in RU file)

All new Russian values in `ru/common.json` are AI-generated and must be labeled.
Add or update `_metadata` at the top of `ru/common.json`:

```json
{
  "_metadata": {
    "verification_status": "UNVERIFIED",
    "generated_by": "AI (Claude)",
    "review_note": "All Russian translations require native-speaker review before production. See PL-009-VERIFY in LOOP_PRE_LAUNCH_CHECKLIST.md."
  },
  ...
}
```

The Uzbek values for new keys come from the `defaultValue` strings already present in
the code — they were written by the developer (not AI) and are the canonical Uzbek text.
The `uz/common.json` file does not need a new UNVERIFIED label for these keys. If an
`_metadata` block does not already exist in `uz/common.json`, do not add one for
developer-written keys.

---

#### Locale-completeness script

**New file:** `government/scripts/verify-i18n.js`

Script reads `uz/common.json` as the master (Uzbek is the default/fallback language),
then checks that every key present in `uz` exists in `en` and `ru`. Reports missing keys
with file and key path. Exits non-zero if any are missing. Add to `package.json` scripts:

```json
"scripts": {
  "verify-i18n": "node scripts/verify-i18n.js"
}
```

The script should handle nested keys recursively (e.g., `warnings.title`,
`dashboard.colRegion`). The `_metadata` key is excluded from comparison.

**Verification:** Run `npm run verify-i18n` — must exit 0 after Batch 2. All 17 GOV-014
keys, all `warnings.*` keys, and all new `login.*` keys must be present in all three files.

**Batch 2 commit message:** `fix(government): GOV-004/013/014 locale completeness — warnings.* + 17 missing keys + aria-label; add verify-i18n script`

---

### Batch 3 — Schools Truncation Interim Mitigation

**Findings:** GOV-003 (High), GOV-010 (Medium)

**Objective:** Reduce the harm of silent truncation without building the pagination UI
(CP-001) that is the proper fix. These are **stopgaps**. The commit message must say
"interim mitigation" and cite CP-001.

---

#### GOV-003 + GOV-010 — Schools truncation mitigation

**File:** `government/src/pages/Schools.jsx`

**Change 1 — Fetch with higher limit:**
```js
// Before:
const { data, loading, error } = useFetch('/government/schools');

// After:
const { data, loading, error } = useFetch('/government/schools?limit=999');
```

The backend caps at `Math.min(limit, 200)` (CP-001 notes), so this fetches up to 200
schools — not unlimited, but a substantial improvement over the default 50. This covers
the current real-world school count for the platform.

**Change 2 — Badge shows server total, not array length:**
```js
// Before:
<span className="badge">{schools.length}</span>

// After:
const total = data?.total ?? schools.length;
// ...
<span className="badge">{schools.length < total ? `${schools.length}/${total}` : total}</span>
```

If `schools.length < total`, the badge shows e.g. "200/247" — immediately visible that
the list is truncated. If they match, shows the clean total.

**Change 3 — CSV export truncation warning (GOV-010):**
```js
// In the CSV export handler, before generating the CSV:
if (schools.length < total) {
  showWarning(t('schools.exportTruncated', {
    defaultValue: `Diqqat: faqat ${schools.length} ta maktab yuklab olindi (jami ${total} ta). To'liq ro'yxat uchun keyingi versiyani kuting.`,
    count: schools.length,
    total,
  }));
}
```

The export proceeds (does not block), but the user sees a warning before the file downloads.
Add `schools.exportTruncated` to all three locale files as part of this batch.

**What this mitigation does NOT fix:**
- Schools 201–N are still invisible in the list and absent from exports (until CP-001 builds pagination).
- The `?limit=999` approach is a hack that would fail silently at 201 schools — the proper
  fix (pagination UI) must track total and allow loading more.

**Full fix:** `Schools.jsx` will be refactored in S7 when CP-001 pagination UI is built.
At that time, remove `?limit=999`, implement proper page/offset controls, and remove the
truncation warning (which becomes unnecessary).

**Batch 3 commit message:** `fix(government): GOV-003/010 interim mitigation — limit=999, total badge, export truncation warning (full fix deferred to CP-001)`

---

### Batch 4 — Error Handling Normalization

**Finding:** GOV-007 (Medium)

**Objective:** Disarm the latent error-format fragility before any government endpoints
migrate to the new `{ success: false, error: { code, detail } }` shape.

---

#### GOV-007 — Error format normalization

**Files:** `Platform.jsx`, `AIWarnings.jsx`, `Settings.jsx`, `Profile.jsx`, `MessagesTab.jsx`
(any file with `err.response?.data?.error` in an error handler)

**Pattern — current (fragile):**
```js
showError(err.response?.data?.error || t('...'));
```

**Pattern — normalized (handles both old and new format):**
```js
const apiError = err.response?.data?.error;
const errMsg = (typeof apiError === 'object' ? apiError?.detail : apiError) || t('...');
showError(errMsg);
```

Or inline if only used once:
```js
showError(
  err.response?.data?.error?.detail ?? err.response?.data?.error ?? t('...')
);
```

**Locations to update (all follow the same pattern):**

| File | Location |
|---|---|
| `Platform.jsx` | Line 110 — `error.response?.data?.error \|\| t('government.toastSaveError')` |
| `AIWarnings.jsx` | Line 121 — `err.response?.data?.error \|\| t('warnings.resolveError', ...)` |
| `Settings.jsx` | Line 47 — `error.response?.data?.error \|\| t('settings.passwordError', ...)` |
| `Profile.jsx` | Line ~44 — `err.response?.data?.error` in the `details`-based error reading |
| `MessagesTab.jsx` | Any error display calls |

**Note on Profile.jsx:** The Profile error handler already reads `details` array for
validation errors (line 44), then falls back to `err.response?.data?.error`. The
normalization applies to the fallback only.

**Risk:** Low. The `?.detail` path returns `undefined` for old-format responses, so the
`?? apiError` fallback covers those. This is additive normalization, not a behavior change
for current endpoints.

**Verification method:** No revert-test needed — this is a defensive fix with no current
observable behavior change. Verify by code inspection: confirm every `err.response?.data?.error`
read in the 5 files uses the normalized pattern. The existing test suite confirms no regressions.

**Batch 4 commit message:** `fix(government): GOV-007 normalize error format reads to handle both old string and new object shape`

---

### Batch 5 — State and UX Consistency

**Findings:** GOV-006, GOV-008, GOV-009

**Objective:** Fix the stale closure, the inconsistent confirm dialog, and the dead
SchoolDetail fallbacks. Three unrelated fixes grouped because they're all medium-severity
with small blast radius.

---

#### GOV-006 — Stale closure in MessagesTab unread count (Medium)

**File:** `government/src/components/tabs/MessagesTab.jsx:54`

**Current code (stale closure on `messages`):**
```js
const unread = (append
  ? [...(append ? messages : []), ...incoming]  // `messages` is stale
  : incoming
).filter(m => !m.isRead).length;
```

**Fix — compute unread from post-merge state, not stale closure:**

Replace the inline stale-read with a state updater that merges and computes in one step:

```js
setMessages(prev => {
  const merged = append ? [...prev, ...incoming] : incoming;
  setUnreadCount(merged.filter(m => !m.isRead).length);
  return merged;
});
```

This requires `unreadCount` to be extracted to its own `useState` if it is not already.
If it is computed inline in the render, replace it with a state value updated only via
this merged path.

Remove the `// eslint-disable-line react-hooks/exhaustive-deps` suppression once `messages`
is no longer in the closure.

**Risk:** Medium — state management change. The test must confirm that after a load-more,
the unread count reflects the full merged list, not just the newly fetched page.

**Verification method (revert-testable):**
Write a test that:
1. Renders MessagesTab with initial messages `[{ id: 1, isRead: false }]`.
2. Triggers a load-more that returns `[{ id: 2, isRead: false }, { id: 3, isRead: true }]`.
3. Asserts the displayed unread count is `2` (messages 1 and 2), not `1` (only the new batch).
Confirm the test **fails** against the old stale-closure code.

---

#### GOV-008 — `window.confirm` → `ConfirmDialog` (Medium)

**File:** `government/src/components/tabs/MessagesTab.jsx:97–98`

**Current:**
```js
if (!window.confirm(t('government.confirmDeleteMessage', { defaultValue: "Bu xabarni o'chirmoqchimisiz?" }))) return;
const await api.delete(`/government/messages/${msg.id}`);
```

**Fix:**
1. Import `ConfirmDialog` from the shared components.
2. Add state: `const [deleteTarget, setDeleteTarget] = useState(null)`.
3. Replace the `window.confirm` call with `setDeleteTarget(msg)`.
4. Render `<ConfirmDialog open={!!deleteTarget} onConfirm={handleConfirmedDelete} onCancel={() => setDeleteTarget(null)} ... />`.
5. Move the delete API call into `handleConfirmedDelete`.

Add the following keys to all three locale files if not already present (confirm against
existing `government.*` keys in the files first):
- `government.confirmDeleteMessageTitle` — "Delete message" / "Xabarni o'chirish" / "Удалить сообщение"
- `government.confirmDeleteMessageBody` — "Are you sure you want to delete this message?" / "Bu xabarni o'chirmoqchimisiz?" / "Вы уверены, что хотите удалить это сообщение?"

**Risk:** Low. `ConfirmDialog` is already used in Platform.jsx and is a well-tested
shared component.

**Verification method:** Confirm `window.confirm` does not appear in MessagesTab.jsx
after the fix. Smoke-test that the delete flow still works.

---

#### GOV-009 — Dead fallbacks in SchoolDetail (Medium, partial)

**File:** `government/src/pages/SchoolDetail.jsx:39–40`

**Current (defensive, but fallback is dead code):**
```js
const school = data.school || data;
const stats = data.stats || {};
```

The backend returns a flat object — no `.school` or `.stats` sub-keys exist. `data.school`
is always `undefined`, so `school` is always `data`. `data.stats` is always `undefined`,
so `stats` is always `{}`, meaning stats are read as `school.studentsCount` etc. from the
flat object (which works, but bypasses the `stats` variable entirely).

**Fix:**
```js
const school = data;
// Remove stats variable entirely — stats fields are on the flat school object
```

Then replace any `stats.X` references with `school.X` (where `X` is `studentsCount`,
`teachersCount`, etc.). Confirm all stat fields used in JSX are present on the flat backend
response (they are: `studentsCount`, `teachersCount`, `ratingsCount`, `averageRating` are
all returned by `getSchoolById`).

**Deferred part (CP-014):** Adding an "Archived" banner when `school.isActive === false`
is intentionally deferred. The CP-014 feature (archive/reactivate buttons) will land in
S7 and that commit will add the archived state indicator at the same time.

**Risk:** Low. The flat-object reading was always the real path; removing the fallback
is purely code cleanup.

**Verification method:** Code inspection. Confirm no `stats.` references remain in
SchoolDetail.jsx after the fix.

**Batch 5 commit message:** `fix(government): GOV-006 unread count stale closure, GOV-008 window.confirm → ConfirmDialog, GOV-009 remove dead SchoolDetail fallbacks`

---

### Batch 6 — Low-Severity Hygiene

**Findings:** GOV-011, GOV-012

**Objective:** Clean up the production `express` dependency and the leftover debug log.
Lowest-risk batch — pure cleanup with no logic changes.

---

#### GOV-011 — `express` in production dependencies (Low)

**File:** `government/package.json`

**Pre-check before removing:** Grep the entire `government/` directory for any `import express`
or `require('express')`. If found (e.g., in a hypothetical `server.js` serving the SPA),
move to `devDependencies` instead of removing. If not found anywhere, remove the entry.

Based on S1 findings (no server.js observed, Vite handles serving), the expected action
is to remove the `express: ^4.18.2` line from `dependencies` entirely.

**After change:** Run `npm install` to update `package-lock.json`, then run `npm run build`
to confirm the SPA builds without `express` in the bundle.

**Risk:** None if `express` is unused at runtime (expected). Mitigated by the grep pre-check.

---

#### GOV-012 — `console.error` in Dashboard (Low)

**File:** `government/src/pages/Dashboard.jsx:56`

```js
// Remove:
console.error('[Dashboard] revalidation error:', err);
```

The SWR-style revalidation failure is silently swallowed — this is acceptable since the
UI shows stale data and the next successful revalidation will correct it. Sentry integration
(PL-005, once DSN is set) will capture unexpected errors.

If desired, replace with `captureException(err)` from `utils/errorTracker.js` so the error
is tracked in Sentry without polluting the console. This is optional — the primary goal is
removing the `console.error`.

**Risk:** None.

**Batch 6 commit message:** `chore(government): GOV-011 remove express prod dep, GOV-012 remove debug console.error`

---

## 3. Interim Mitigation Details

### Why GOV-003 and GOV-010 cannot be fully fixed now

GOV-003 (badge truncation) and GOV-010 (CSV export truncation) are symptoms of CP-001:
the Schools list has no pagination UI. The backend correctly returns `total` alongside the
capped results — the frontend simply never reads `total` or requests additional pages.

The interim mitigation (`?limit=999`, display `total` in badge, warn on export) materially
reduces harm for the current scale of the platform. It is not a real fix because:
1. The backend caps at `Math.min(limit, 200)`. Passing `999` gets 200, not unlimited.
2. Schools 201–N are still invisible and excluded from exports.
3. A government official still cannot see or export the full dataset once schools > 200.

### What the full fix (CP-001) looks like

In S7, CP-001 will add:
- Offset/page state in Schools.jsx
- Next/Prev or infinite-scroll controls
- The badge will show server `total` (not `schools.length`) always
- The CSV export will either fetch all pages before generating, or disable the export
  with a message directing the user to the paginated view

The Batch 3 code in Schools.jsx should be **removed** when CP-001 lands, not built upon.
The interim `?limit=999` approach leaves a `// TODO: CP-001 — remove when pagination is built` comment.

---

## 4. i18n Labeling Note

### Principle (matching PL-009 backend discipline)

The backend locale files at `backend/i18n/ru.json` carry:
```json
"_metadata": { "verification_status": "UNVERIFIED", "generated_by": "AI (Claude)" }
```

The government portal `ru/common.json` must carry the same metadata. The `_metadata` key
is ignored by i18next (never interpolated since it is never called with `t('_metadata.*')`).

### What is "AI-generated" in this batch

- **All Russian values** added in Batch 2 (GOV-004 `warnings.*`, GOV-014 17 keys, GOV-013
  login aria-labels) are AI-generated and must be covered by the `_metadata.verification_status: "UNVERIFIED"` label.
- **Uzbek values** for new keys come from the `defaultValue` strings already written by the
  developer in the JSX code — they are developer-authored (not AI-generated). The `uz/common.json`
  does not require a new UNVERIFIED label for these keys.
- **English values** are new translations written by the author in this cleanup — they should
  be reviewed but are not "AI-generated" in the PL-009 sense.

### Russian translation quality check

Before committing Batch 2, the AI-generated Russian values should be reviewed against these
basic sanity checks (not a full professional review — that is PL-009-VERIFY):
- No obviously mangled transliterations
- Grammar (noun cases, verb conjugations) roughly correct for simple UI strings
- No untranslated English fragments

---

## 5. Cross-Portal / Cross-Step Coordination

### Files touched by Batch 3 that CP-001 will also touch

**`government/src/pages/Schools.jsx`** — Batch 3 adds `?limit=999` and truncation warning.
CP-001 (S7) will refactor this file to add pagination UI. When CP-001 lands:
- Remove `?limit=999`
- Remove the truncation warning toast
- The `total` badge logic can be kept (it was correct in Batch 3) and extended

Leave a `// TODO: CP-001 — replace with pagination controls` comment in Schools.jsx at
the fetch line so the S7 implementer knows the context.

### Files touched by Batch 5 that CP-014 will also touch

**`government/src/pages/SchoolDetail.jsx`** — Batch 5 removes the dead `|| data` fallback.
CP-014 (S7) will add archive/reactivate buttons and the archived-state banner. Batch 5
does not add the banner — the S7 implementer will add it knowing the flat object shape
has been confirmed by Batch 5.

Leave a `// TODO: CP-014 — add archived banner when school.isActive === false` comment.

### LOOP_CROSS_PORTAL.md — no updates needed from this cleanup

No new CP items are created by this cleanup. All 4 existing CP items (CP-001, CP-014,
CP-016, CP-019) remain deferred to S5/S7. Their status does not change from this plan.

---

## 6. Deferred Items

| Item | Reason | Deferred to |
|---|---|---|
| GOV-003 full pagination | Requires CP-001 pagination UI feature | S7 (CP-001 build) |
| GOV-010 full export | Requires all-pages fetch or paginated export — tied to CP-001 | S7 (CP-001 build) |
| GOV-009 archived-school banner | CP-014 feature work | S7 (CP-014 build) |
| D-1 (CP-001) Schools pagination UI | Feature, not bug | S5/S6/S7 |
| D-2 (CP-014) Archive/reactivate buttons | Feature, not bug | S5/S6/S7 |
| D-3 (CP-016) Restore UI | Feature; product decision needed | S5 |
| D-4 (CP-019) AI translation notice | Feature | S5/S6/S7 |
| Profile/changePassword legacy shape (Q-06, Q-07 from S0) | Not breaking; migrate when endpoint next touched | Backend roadmap |

---

## 7. Test Plan

### Per-batch test requirements

#### Batch 1 — Revert-testable (all 3 findings)

| Finding | Test type | What to assert | Revert condition |
|---|---|---|---|
| GOV-001 | Unit — Dashboard warning count | Mock `GET /ai-warnings` → `{ data: { warnings: [1,2], total: 2 } }`. Assert badge shows `2`. Assert request uses `isResolved: false`. | Fails when param is `resolved: false` or count reads `.data?.length` |
| GOV-002 | Unit — RegistrationsTab email | Render with `approvedCredentials = { admin: { email: 'a@b.com' }, ... }`. Assert input value = `'a@b.com'`. Assert clipboard writes `'a@b.com'`. | Fails when reading `.email` directly |
| GOV-005 | Unit — Login error branches | Mock 401 with `{ error: { code: 'ACCOUNT_NOT_ACTIVE' } }`. Assert suspended error shown, not generic error. Also assert 401 without that code still shows generic error. | Fails when only checking `status === 403` |

#### Batch 2 — Additive (no behavior change, verify by script)

| Check | Method |
|---|---|
| All `warnings.*` keys present in all 3 files | `npm run verify-i18n` exits 0 |
| All 17 GOV-014 keys present in all 3 files | `npm run verify-i18n` exits 0 |
| `login.showPassword`, `login.hidePassword` present | `npm run verify-i18n` exits 0 |
| `login.accountSuspended` present | `npm run verify-i18n` exits 0 |
| Login.jsx has no hardcoded Uzbek string in aria-label | Code inspection |
| `_metadata.verification_status: "UNVERIFIED"` in `ru/common.json` | File read |
| `verify-i18n.js` itself exits 0 on clean files, non-zero on missing keys | Run script against test fixtures |

#### Batch 3 — Observational (interim mitigation)

| Check | Method |
|---|---|
| Schools page fetches with `limit=999` | Code inspection; optionally unit-test the `useFetch` call URL |
| Badge shows `schools.length/total` when truncated | Unit test with `data = { schools: [{...}], total: 5 }` (1 item, total 5) — assert badge text includes `1/5` |
| Export handler shows warning toast when `schools.length < total` | Unit test |
| `// TODO: CP-001` comment present in Schools.jsx | Code inspection |

#### Batch 4 — No behavioral change; regression via existing test suite

Run the full test suite after Batch 4 to confirm zero regressions.
Code-inspect all 5 modified files to verify the pattern was applied consistently.

#### Batch 5 — Mixed (GOV-006 revert-testable; GOV-008 smoke-test; GOV-009 inspection)

| Finding | Test type | What to assert | Revert condition |
|---|---|---|---|
| GOV-006 | Unit — MessagesTab unread count | Initial state: 1 unread. Load-more returns 1 unread + 1 read. Assert count = 2 after merge. | Fails against stale closure (would show 1) |
| GOV-008 | Smoke — delete flow | `window.confirm` not called; ConfirmDialog opens on delete button click. | — |
| GOV-009 | Inspection | No `|| data` or `|| {}` in SchoolDetail.jsx. No `stats.` references. | — |

#### Batch 6 — Zero-regression confirmation

Run `npm run build` to confirm `express` removal does not affect the build output.
Run `npm test` to confirm zero regressions from Dashboard log removal.

### Test file plan

New test assertions will be added to (or extend) existing test files:
- `government/src/__tests__/Dashboard.test.jsx` — GOV-001
- `government/src/__tests__/RegistrationsTab.test.jsx` — new file (GOV-002)
- `government/src/__tests__/Login.test.jsx` — new file (GOV-005)
- `government/src/__tests__/MessagesTab.test.jsx` — new file (GOV-006, GOV-008)
- `government/src/__tests__/Schools.test.jsx` — new file (GOV-003/010 interim mitigation)

If `Dashboard.test.jsx` does not exist, create it. The existing `Platform.test.jsx` provides
the pattern for how government portal tests are structured.

---

## 8. Execution Order

```
Batch 1  ──►  Batch 2  ──►  Batch 3  ──►  Batch 4  ──►  Batch 5  ──►  Batch 6
(critical)    (i18n)         (schools)      (errors)       (state/UX)    (hygiene)
GOV-001       GOV-004        GOV-003        GOV-007         GOV-006       GOV-011
GOV-002       GOV-014        GOV-010        (5 files)       GOV-008       GOV-012
GOV-005       GOV-013
              verify-i18n
```

No cross-batch dependencies. Each batch is independently lint-clean and test-passing.
Batch 1 first because it fixes the critical bug. Batch 2 immediately after because
GOV-005's `login.accountSuspended` key is used in Batch 1 (via `defaultValue` fallback
in Batch 1, then properly keyed in Batch 2). Batches 3–6 have no ordering constraint.
