# PROD-FIX-05 — Form State Loss (9 FSL Items Closed)

**Date:** 2026-06-01  
**Source:** PROD-ISSUE-AUDIT-01 Category 3  
**Commit:** (see close-out below)

---

## STEP 0 — Shared Hook: `shared/hooks/useFormPersistence.js` (created)

No existing autosave hook existed in `shared/hooks/` (only `useDebounce`, `useAsync`, `useFetch`). Created `useFormPersistence.js` with:

- `restore()` — reads and JSON-parses from storage, returns null if absent
- `save(state)` — throttled write (500 ms), JSON-serializes (File/Blob stripped silently by JSON.stringify)
- `clear()` — cancels any pending throttled write + removes key

Storage convention:
- `sessionStorage` — transient single-session workflows (BulkImport job, IrrShell scoring in progress)
- `localStorage` — cross-session drafts that survive browser restarts (ParentWizard)

---

## STEP 1 — HIGHs

### FSL-001 — BulkImport wizard mid-flow navigation ✅

**File:** `admin/src/pages/BulkImport.jsx`

Added `useFormPersistence('bulkimport:wizard:active')` (sessionStorage).

Changes:
- Extracted `startPolling(jobId)` helper to avoid duplication between initial start and resumed polling.
- **On mount:** `restore()` — if saved state found with `step > 1`, restore `step` + `jobResult`; if `step === 4` (import running), resume polling the existing `importJobId` immediately.
- **After validate (step 2):** `save({ step: 2, jobResult })` — File object is not saved (not needed after upload).
- **After start (step 4):** `save({ step: 4, jobResult })`.
- **On poll complete (step 5):** `clear()` via `resetAll()`.
- **`resetAll()`:** calls `clear()` to remove the saved session.

Result: navigating away mid-import no longer loses the job. Returning to `/admin/import` resumes polling seamlessly.

### FSL-002 — IRR assessment session scoring ✅

**File:** `teacher/src/pages/IrrShell.jsx`

Added `useFormPersistence('irr:assessment:{childId}')` (sessionStorage, keyed per child).

Changes:
- **On mount / child change** (`useEffect` dep: `[id]`): restore `scores`, `sessionType`, `completedAt`, `sessionNotes` from sessionStorage if present.
- **On score change** (`useEffect` dep: `[scores, sessionType, completedAt, sessionNotes]`): `save(...)` when any score is non-null (throttled 500 ms).
- **On successful submit:** `clearScores()` called before resetting state — draft no longer visible on next session.

Edge cases:
- Key includes `childId` from URL param — different children get separate keys; navigating child-to-child won't restore wrong child's scores.
- `sessionStorage` means scores don't persist across browser restarts — a fresh login shows a blank assessment form (appropriate: yesterday's in-progress scoring shouldn't auto-fill today's form).

---

## STEP 2 — MEDIUMs

### FSL-003 — Reception parent wizard browser back / accidental navigation ✅

**File:** `reception/src/pages/ParentWizard/ParentWizardPage.jsx`

Migrated from in-memory `cache` (lost on page refresh) to `useFormPersistence` (localStorage).

Changes:
- Removed `import * as cache from '../../../../shared/utils/cache'`.
- Added `useAuth()` to get `user.id`.
- Draft key: `wizard:parent:${user.id}:draft` (per-staffer — different reception staff on same browser get separate drafts).
- **On mount:** `restore()` populates `draftBanner` (existing banner UI unchanged).
- **Auto-save:** `useEffect` on `[parentData, childData, groupData, step]` → `save(...)` when any name or email is filled. Throttled 500 ms by hook.
- **Manual save button:** kept — calls `save()` + shows "Qoralama saqlandi" toast.
- **`handleDiscardDraft`:** calls `clear()` instead of `cache.set(null)`.
- **On submit success:** calls `clear()`.
- **`beforeunload` warning:** fires when `parentData.firstName || parentData.email || childData.firstName` is non-empty, preventing accidental tab close.

Result: reception staff interrupted mid-registration can close the tab, return later, and see the draft banner offering to resume.

### FSL-004 — ParentFormModal not resetting on close ✅

**File:** `reception/src/pages/ParentManagement.jsx`

Changed `onClose={() => setShowModal(false)}` to:
```js
onClose={() => {
  setShowModal(false);
  setEditingParent(null);
  setFormData({ firstName: '', lastName: '', email: '', phone: '', password: '',
    teacherId: '', groupId: '',
    child: { firstName: '', lastName: '', dateOfBirth: '', gender: 'Male',
             disabilityType: '', medicalDiagnosis: '', specialNeeds: '' } });
}}
```

Reopening the create-parent modal now always shows blank fields.

### FSL-005 — ActivityFormModal stale on reopen ✅

**File:** `teacher/src/pages/Activities.jsx`

Changed `onClose={() => setShowModal(false)}` to reset `editingActivity` and `formData` to defaults (all fields blank, `tasks: ['']`, dates recalculated from `new Date()`).

### FSL-006 — MediaFormModal stale on reopen ✅

**File:** `teacher/src/pages/Media.jsx`

Changed `onClose` to reset `editingMedia`, `file`, and `formData`. File input now clears on close — the audit specifically flagged the file state as a notable stale-on-reopen issue.

### FSL-007 — ParentJournalComposer photos lost on navigation ✅

**File:** `teacher/src/components/ParentJournalComposer.jsx`

Photos (File objects) cannot be JSON-serialized and cannot be persisted. Fix:

1. **Visible inline warning** — rendered when `photos.length > 0`:
   ```
   Suratlar faqat shu sahifada saqlanadi — boshqa sahifaga o'tsangiz yo'qoladi. Avval xabarni yuboring.
   ```
   Styled amber (notice, not error) — appears between moment chips and photo thumbnails.

2. **`beforeunload` event handler** — fires when `photos.length > 0`, triggers browser's native "Leave page?" dialog.

The text/subject/recipient drafts continue to autosave to localStorage (existing behavior unchanged).

---

## STEP 3 — LOWs

### FSL-008 — ChildFormModal edit path not resetting ✅

**File:** `reception/src/pages/ParentManagement.jsx`

Both ChildFormModal instances (create + edit) now reset `childFormData` on close:
```js
setChildFormData({ firstName: '', lastName: '', dateOfBirth: '', gender: 'Male',
  disabilityType: '', medicalDiagnosis: '', specialNeeds: '', photo: null, photoPreview: null });
```

Create flow: fresh form on reopen. Edit flow: after edit modal closes, stale data is cleared — next open (whether create or a different edit) always repopulates from source.

### FSL-009 — TherapyFormModal stale on close ✅

**File:** `teacher/src/pages/TherapyManagement.jsx`

Changed `onClose` to reset `editingTherapy` and `formData` to defaults (`therapyType: 'music'`, `contentType: 'audio'`, `ageGroup: 'all'`, `difficultyLevel: 'all'`, other fields blank).

---

## STEP 4 — Honest Count

| FSL | Severity | Status |
|-----|----------|--------|
| FSL-001 | HIGH | ✅ Closed |
| FSL-002 | HIGH | ✅ Closed |
| FSL-003 | MEDIUM | ✅ Closed |
| FSL-004 | MEDIUM | ✅ Closed |
| FSL-005 | MEDIUM | ✅ Closed |
| FSL-006 | MEDIUM | ✅ Closed |
| FSL-007 | MEDIUM | ✅ Closed |
| FSL-008 | LOW | ✅ Closed |
| FSL-009 | LOW | ✅ Closed |

All 9 FSL items closed. No deferrals.

**Audit ledger:** HIGH 5→3 (−2), MEDIUM 19→14 (−5), LOW 10→8 (−2).  
**Total open: 34→25.**

---

## STEP 5 — Adjacent Latent Findings

**LAT-FSL-001 (LOW):** `reception/src/pages/ParentWizard/GroupStep.jsx` — group selection state lives in `groupData.groupId`. This is already covered by the FSL-003 wizard auto-save (groupData is persisted along with parentData and childData). No separate action needed.

**LAT-FSL-002 (LOW):** `teacher/src/pages/Meals.jsx` — meal entry form (date + attendance marks) uses local state with no persistence. However, meal entry is a short-duration interaction (one-click per child) with no text input — state loss impact is minimal. Flagged but not fixed here.

**LAT-FSL-003 (INFO):** `teacher/src/pages/IrrShell.jsx` — the daily/weekly journal forms (27/18 checkbox items) also have local state with no persistence. These are medium-duration interactions. Flagged as FSL-010 for a future session at LOW severity.

**Storage conventions summary** (for future reference):
- `sessionStorage`: BulkImport wizard, IrrShell scoring — both die with the tab, which is correct (a resumed session next login should not auto-fill stale context)
- `localStorage`: ParentWizard draft — cross-session survival is the explicit product requirement (interrupted registration)
- `localStorage` (existing): ParentJournalComposer subject/body — appropriate (composer is a day-long open tool)
