# PP-JOURNAL-BULK

The teacher's Parent Journal composer accepts a single (subject + body) note
plus a list of selected children, and broadcasts one journal entry per
child. Replaces a broken solo-create flow where the composer's
`{ subject, body, recipientIds, photos }` payload was rejected by a backend
that only knew `{ childId, date, content, isVisibleToParent }`.

## The bug we fixed

Previously every "Send" click hit `POST /teacher/journal` with the wrong
shape; backend's first check (`if (!UUID_RE.test(childId))`) returned 400
`JOURNAL_CHILD_NOT_ACCESSIBLE`. The composer's catch was
`// TODO: show error toast`, so the failure was silent and no entries were
ever recorded. Confirmed via static read of `ParentJournalComposer.jsx:79`
vs `journalController.js:14`.

## What landed

### Backend

- **Migration** `20260609000003-add-subject-to-child-journal-entries.js` — adds nullable `subject VARCHAR(200)` column. No backfill.
- **Model** `ChildJournalEntry.js` — declares `subject`.
- **Controller** `journalController.js`:
  - New `createBulk` handler — validates payload, then loops over `recipientIds` running the same school-scope + teacher-assignment checks the solo `create` does. Per-row failures don't abort the batch — they collect in `failed[]`. Returns 201 if at least one entry created; 400 `JOURNAL_BULK_ALL_FAILED` if every row failed (response body still carries `data.failed`).
  - Hard cap of 50 recipients per request — guards against runaway loops; 400 `JOURNAL_BULK_TOO_MANY_RECIPIENTS` beyond that.
  - Subject is optional. Length capped at 200 chars (400 `JOURNAL_SUBJECT_TOO_LONG`).
  - Emits `journal:created` socket event per row when `isVisibleToParent` is true and the child has a `parentId` — same realtime contract as solo create.
  - `getChildJournal` (the parent-side read) now returns `subject` alongside `content`.
- **Route** `POST /api/v1/teacher/journal/bulk` (added in `teacherRoutes.js`). Existing `POST /teacher/journal` solo path retained for backward compat.
- **5 new error codes** in `audits/backend/i18n-error-codes.md` + `backend/i18n/{ru,uz-latn,uz-cyrl}.json`:
  - `JOURNAL_SUBJECT_TOO_LONG` · `JOURNAL_BULK_NO_RECIPIENTS` · `JOURNAL_BULK_TOO_MANY_RECIPIENTS` · `JOURNAL_BULK_ALL_FAILED` · `JOURNAL_BULK_FAILED`
- **`EXPECTED_CODE_COUNT`** in `i18n.test.js` bumped 244 → 249.

### Frontend

- **`DailyReflection.jsx:handleJournalSend`** — now posts to `/teacher/journal/bulk` with the correct shape, attaches `date: todayLocal()` + `isVisibleToParent: true`, returns the response so the composer can read per-row results.
- **`ParentJournalComposer.jsx:handleSend`** — wires up `useToast`; on success shows "{n} ta yuborildi", on partial failure shows "{ok} ta yuborildi, {fail} ta xato", on full failure shows the i18n'd error code.
- **`parent/pages/Journal.jsx`** — renders the optional `subject` as an `<h3>` above the body when present. Falls back to the original body-only render for legacy entries.

### Photos

Composer keeps its photo UI (3 thumbnails, upload chip, the existing
"not persisted" amber warning at line ~211). Photos are deliberately
**not uploaded** in this commit — adding storage + auth-gated proxy + an
upload step + photo cleanup on entry delete would double the diff. Tracked
as a follow-up; the warning the user sees is honest.

## Tests

- `backend/__tests__/controllers/journalBulk.test.js` — 13 new tests covering:
  - All 4 payload validation gates (empty/too many/bad date/future date)
  - Optional subject + 200-char cap
  - Body 10-char minimum
  - Happy path (201 + 1 entry + socket emit per recipient)
  - `isVisibleToParent: false` skips socket
  - Mixed batch (1 fail + 1 success) returns 201 with both lists populated
  - Teacher-assignment denial surfaces as a row failure
  - All-fail path → 400 `JOURNAL_BULK_ALL_FAILED`
- Full backend suite: **1514 / 1514 pass** (was 1501; +13)
- Teacher `check:locales`: PASS in uz/en/ru
- ESLint on touched files: clean

## Files

```
NEW:
  backend/migrations/20260609000003-add-subject-to-child-journal-entries.js
  backend/__tests__/controllers/journalBulk.test.js
  audits/redesign/PP-JOURNAL-BULK.md

MODIFIED:
  backend/models/ChildJournalEntry.js                  (+subject column)
  backend/controllers/journalController.js             (+createBulk; getChildJournal returns subject)
  backend/routes/teacherRoutes.js                      (+POST /journal/bulk route)
  backend/i18n/{ru,uz-latn,uz-cyrl}.json               (+5 error codes each)
  audits/backend/i18n-error-codes.md                   (+5 rows)
  backend/__tests__/i18n.test.js                       (EXPECTED_CODE_COUNT 244 → 249)
  teacher/src/pages/DailyReflection.jsx                (handleJournalSend hits /bulk)
  teacher/src/components/ParentJournalComposer.jsx     (toast on success/partial/error)
  teacher/src/parent/pages/Journal.jsx                 (renders subject heading)
  teacher/src/locales/{uz,en,ru}/common.json           (+3 journal.toast* keys each)
```
