# CLEANUP-07d-HUJJATLAR-NAVBATI — Document Approval Queue Page Restructure

**Date:** 2026-06-04  
**Status:** ✅ CLOSED (pending user Railway verification)  
**Commit:** e38a369  
**Decisions:** A1/B1/C2/D1/E1

---

## Pre-flight

- **Page file:** `admin/src/pages/DocumentApprovalQueue.jsx` — 354 lines (pre-fix)
- **Route:** `/admin/documents` (App.jsx:76)
- **Sidebar label:** `nav.documents` = "Hujjatlar navbati"
- **Layout:** Card grid (Option Y) — 2-col tablet, 3-col desktop; 3 status tabs (Pending/Approved/Rejected)
- **Existing locale namespace:** `receptionsPage.*` (approval keys co-located with reception management)

---

## STEP 1 — Current State Audit

| Element | Before | Issue |
|---|---|---|
| Page header title | `t('documents.title', { defaultValue: 'Tasdiqlash navbati' })` | Wrong key; no count; not `Hujjatlar navbati (N)` convention |
| Header subtitle | `${docs.pending.length} ta hujjat sizning e'tiboringizni kutmoqda.` | Hardcoded UZ — breaks RU/EN |
| Tab labels | `const TAB_LABELS = { pending: 'Kutilmoqda', ... }` object, never calls `t()` | **Hardcoded UZ — tabs show UZ in RU/EN portals** |
| Avatar color | `bg-brand-100 text-brand-800` | Decorative accent — violates CLEANUP-02 discipline |
| Uploader role label | `'Qabulxona · {X} soat oldin'` | Hardcoded UZ format string |
| Unknown uploader | `'Noma\'lum'` | Hardcoded UZ |
| Status badge | `'Kutilmoqda'` | Hardcoded UZ |
| No-preview label | `'Oldindan ko\'rish mavjud emas'` | Hardcoded UZ |
| Document fallback | `'Hujjat'` | Hardcoded UZ |
| Action buttons | `'Tasdiqlash'`, `'Ko\'rish'`, `'Rad etish'` in DocCard | Hardcoded UZ — locale keys existed but unused |
| Search placeholder | `"Xodim yoki hujjat turi..."` | Hardcoded UZ |
| Empty state (search) | `'"${search}" so'roviga mos hujjat topilmadi'` | Hardcoded UZ |
| Empty state (empty queue) | `'Tasdiq kutayotgan hujjat yo\'q'` | Hardcoded UZ |
| Empty state detail | `'Hammasi ko\'rib chiqilgan...'` | Hardcoded UZ |
| Clear search hint | `'Qidiruvni o\'zgartiring yoki tozalang.'` | Hardcoded UZ |
| Clear filter button | `'Filtrni tozalash'` | Hardcoded UZ |
| Pagination strings | `"Ko'rsatilmoqda"`, `"/ jami"` | Hardcoded UZ |
| Reject modal title | `"Hujjatni rad etish"` | Hardcoded UZ |
| Reject modal reason label | `"Rad etish sababi"` | Hardcoded UZ |
| Reject modal placeholder | `"Misol: hujjat sifati past..."` | Hardcoded UZ |
| Reject modal email notice | `"Xabar email orqali yuboriladi."` | Hardcoded UZ |
| Modal cancel button | `"Bekor qilish"` | Hardcoded UZ |
| **Approve error handler** | `// TODO(phase-2): show error toast` | **Silent failure in production** |
| **Reject error handler** | `// TODO(phase-2): show error toast` | **Silent failure in production** |

Total hardcoded UZ strings: **18**. Silent failure TODOs: **2** (production bugs).

---

## STEP 2 — Decisions (confirmed by user)

| Decision | Choice | Rationale |
|---|---|---|
| A — Layout shape | A1: Keep card grid | No inline preview capability; consistent with 07b/07c |
| B — Status filter | B1: Keep tabs, default Pending | Already implemented; good workflow default |
| C — Bulk actions | C2: None | Director queue, not high-volume inbox |
| D — Approval flow | D1: 1-click approve, modal for reject | Already implemented; rejection should be deliberate |
| E — Rejection reason | E1: Required | Submitter needs to know why — already implemented |

---

## STEP 3 — Fixes Applied

### Fix 1 — Header convention
```jsx
// Before
<h1>{t('documents.title', { defaultValue: 'Tasdiqlash navbati' })}</h1>
<p>{docs.pending.length} ta hujjat sizning e'tiboringizni kutmoqda.</p>

// After
<h1>{t('nav.documents', { defaultValue: 'Hujjatlar navbati' })} ({docs.pending.length})</h1>
<p>{docs.pending.length > 0
  ? t('receptionsPage.queueSubtitle', { count: docs.pending.length, ... })
  : t('receptionsPage.emptyQueue', ...)}</p>
```

### Fix 2 — TAB_LABELS wired to t()
```jsx
// Before: constant object, never translates
const TAB_LABELS = { pending: 'Kutilmoqda', approved: 'Tasdiqlangan', rejected: 'Rad etilgan' };
// ...
{TAB_LABELS[t_]}

// After: t() call inline, translates with portal locale
{t(`receptionsPage.docStatus.${t_}`, { defaultValue: t_ })}
```
`t_` is the loop variable (avoids shadowing `t` from `useTranslation()`).

### Fix 3 — DocCard strings wired to t()
Added `const { t } = useTranslation()` to `DocCard` (previously had no i18n). All 9 hardcoded strings in DocCard now call `t('receptionsPage.*')`:
- `unknownUploader`, `hoursAgo`, `uploaderRole`, `docStatus.pending`, `noPreview`, `documentFallback`, `approve`, `view`, `reject`

### Fix 4 — DocumentApprovalQueue strings wired to t()
Remaining 9 hardcoded strings in the page component:
- `queueSubtitle`, `searchPlaceholder`, `noResults` (with `{{query}}`), `emptyQueue`, `emptyQueueDetail`, `clearSearch`, `clearFilter`, `pageOf` (with `{{from}}`, `{{to}}`, `{{total}}`), `rejectModalTitle`, `rejectionReasonLabel`, `rejectionPlaceholder`, `emailNotice`, modal `cancel` button

### Fix 5 — Approve error toast (closes production silent failure)
```jsx
// Before
} catch {
  // TODO(phase-2): show error toast
}

// After
} catch (err) {
  toastError(
    err.response?.data?.error?.detail ||
    t('receptionsPage.approveError', { defaultValue: "Hujjatni tasdiqlab bo'lmadi" })
  );
}
```
Import: `import { useToast } from '@shared/context/ToastContext'`
Hook: `const { error: toastError } = useToast()`

### Fix 6 — Reject error toast (same pattern)
```jsx
// Before
} catch {
  // TODO(phase-2): show error toast

// After
} catch (err) {
  toastError(
    err.response?.data?.error?.detail ||
    t('receptionsPage.rejectError', { defaultValue: "Hujjatni rad etib bo'lmadi" })
  );
}
```

### Fix 7 — Avatar token
```jsx
// Before
bg-brand-100 text-brand-800

// After
bg-warm-100 text-warm-800
```

---

## STEP 4 — New Locale Keys (22 per language)

Added to `receptionsPage` in all 3 locale files:

| Key | UZ | RU | EN |
|---|---|---|---|
| `uploaderRole` | Qabulxona | Ресепшн | Reception |
| `unknownUploader` | Noma'lum | Неизвестно | Unknown |
| `hoursAgo` | {{count}} soat oldin | {{count}} ч. назад | {{count}}h ago |
| `noPreview` | Oldindan ko'rish mavjud emas | Предварительный просмотр недоступен | No preview available |
| `view` | Ko'rish | Просмотреть | View |
| `documentFallback` | Hujjat | Документ | Document |
| `queueSubtitle` | {{count}} ta hujjat sizning e'tiboringizni kutmoqda. | {{count}} документ(ов) ожидает вашего внимания. | {{count}} document(s) awaiting your attention. |
| `searchPlaceholder` | Xodim yoki hujjat turi... | Сотрудник или тип документа... | Employee or document type... |
| `noResults` | "{{query}}" so'roviga mos hujjat topilmadi | По запросу «{{query}}» документы не найдены | No documents found for "{{query}}" |
| `emptyQueue` | Tasdiq kutayotgan hujjat yo'q | Нет документов, ожидающих подтверждения | No documents awaiting approval |
| `emptyQueueDetail` | Hammasi ko'rib chiqilgan. Qabulxona yangi hujjat yuklaganda bu yerda paydo bo'ladi. | Всё проверено. Новые документы появятся здесь, когда ресепшн загрузит их. | All reviewed. New documents will appear here when reception uploads them. |
| `clearSearch` | Qidiruvni o'zgartiring yoki tozalang. | Измените или очистите поиск. | Adjust or clear your search. |
| `clearFilter` | Filtrni tozalash | Очистить фильтр | Clear filter |
| `pageOf` | Ko'rsatilmoqda {{from}}–{{to}} / jami {{total}} | Показано {{from}}–{{to}} из {{total}} | Showing {{from}}–{{to}} of {{total}} |
| `rejectModalTitle` | Hujjatni rad etish | Отклонить документ | Reject Document |
| `rejectionReasonLabel` | Rad etish sababi | Причина отклонения | Rejection reason |
| `rejectionPlaceholder` | Misol: hujjat sifati past, qaytadan yuklang... | Например: низкое качество документа... | e.g. Document quality is poor, please re-upload... |
| `emailNotice` | Xabar email orqali yuboriladi. | Уведомление будет отправлено по email. | A notification will be sent by email. |
| `approveError` | Hujjatni tasdiqlab bo'lmadi | Не удалось утвердить документ | Failed to approve document |
| `rejectError` | Hujjatni rad etib bo'lmadi | Не удалось отклонить документ | Failed to reject document |

---

## STEP 5 — Test Update

**`admin/src/__tests__/pages/pages.smoke.test.jsx:107`:**
```js
// Before (matched old hardcoded title)
await waitFor(() => screen.getByText('Tasdiqlash navbati'));

// After (matches new convention title via role query)
await waitFor(() => screen.getByRole('heading', { name: /Hujjatlar navbati/ }));
```

No other test files referenced the old strings.

---

## STEP 6 — Build Results

- **Tests:** 30/30 suites, 162/162 tests — all green
- **Build:** ✅ clean (1851 modules, 7.75s — existing chunk-size warning is pre-existing, unrelated to this change)

---

## STEP 7 — User Railway Verification

Required before full ✅:

1. Login as director → Hujjatlar navbati from sidebar
2. Confirm header reads **`Hujjatlar navbati (N)`** with pending count in title (not "Tasdiqlash navbati")
3. Switch language to **RU** → confirm tabs show "В ожидании", "Утвержден", "Отклонен" (not UZ text)
4. Switch back to UZ → tabs show "Kutilmoqda", "Tasdiqlangan", "Rad etilgan"
5. Switch to EN → "Pending", "Approved", "Rejected"
6. If there are pending documents: approve one → confirm **error is shown if it fails** (was silent before), success moves document to Approved tab
7. Reject one → confirm reason dialog appears, fill reason, submit → confirm **error shown if it fails** (was silent before), document moves to Rejected tab
8. Confirm avatar initials use **neutral grey** background (not brand blue)
9. Filter to combination with no results → confirm friendly empty state message (translated in current language)

Screenshots: header in UZ + RU; tabs in RU; approve/reject flow; empty state.

Reply "verified" with screenshots.

---

## STEP 8 — Honest Count

| Item | Status |
|---|---|
| Fix 1: Header `Hujjatlar navbati (N)` convention | ✅ |
| Fix 2: TAB_LABELS → `t('receptionsPage.docStatus.*')` | ✅ |
| Fix 3: 9 hardcoded strings in DocCard → `t()` | ✅ |
| Fix 4: 9+ hardcoded strings in page component → `t()` | ✅ |
| Fix 5: Approve silent catch → `toastError` | ✅ |
| Fix 6: Reject silent catch → `toastError` | ✅ |
| Fix 7: Avatar bg-brand → bg-warm | ✅ |
| 22 locale keys added × 3 languages | ✅ |
| Smoke test updated | ✅ |
| 30/30 tests green | ✅ |
| Build clean | ✅ |
| User Railway verification | ⬜ pending |

---

## Production Bug Note

**Two `// TODO(phase-2)` comments were left as known unhandled error paths since at least the admin S7 implementation sprint.** Both are now closed:

- `handleApprove` catch: director gets no feedback if the server rejects an approve action (e.g. document already approved, permission error). Now surfaces `toastError`.
- `handleReject` catch: same — rejection failure was silent. Modal would close on network error leaving the document in an ambiguous state. Now the catch correctly surfaces the error and the modal does NOT close on failure (closeReject is only called inside the `try` block on success).

These were functional bugs for any production scenario where the backend returns an error on approve/reject.

---

## Files Changed

| File | Change |
|---|---|
| `admin/src/pages/DocumentApprovalQueue.jsx` | 6 fixes — header, tabs, 18 strings, avatar token, 2 error toasts |
| `admin/src/locales/uz/common.json` | +22 keys to `receptionsPage` |
| `admin/src/locales/ru/common.json` | +22 keys to `receptionsPage` |
| `admin/src/locales/en/common.json` | +22 keys to `receptionsPage` |
| `admin/src/__tests__/pages/pages.smoke.test.jsx` | Updated title assertion |
