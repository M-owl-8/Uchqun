# Admin Portal — S7 Phase 4 Frontend Execution

**Date:** 2026-05-22
**Branch:** main
**Baseline test count (Phase 3 close):** 27 suites / 138 tests — confirmed pre-task run
**Final test count:** 27 suites / 148 tests
**Lint:** 0 errors / 0 warnings (new files only — pre-existing BulkImport.jsx warnings unchanged)

---

## 1. Pre-flight Reconnaissance

- Admin S7-Phase3 = ✅ confirmed in tracker
- Baseline test run confirmed: 138 tests / 25 suites (matches Phase 3 close)
- Phase 1 backend execution audit confirmed: `getParents` and `getReceptions` have `?include_deleted=true` support; children/observations/attendance list endpoints do NOT

---

## 2. Trash Tab Eligibility Audit

The spec requires: only build tabs for entities that have BOTH a deleted-list endpoint AND a restore endpoint.

| Entity | Deleted-list endpoint | Restore endpoint | Tab built? |
|---|---|---|---|
| Parents | `GET /admin/parents?include_deleted=true` ✅ (Phase 1 addon, `adminParentController.js:21`) | `PUT /admin/users/:id/restore` ✅ (`adminRestoreController.js`) | ✅ YES |
| Receptions | `GET /admin/receptions?include_deleted=true` ✅ (Phase 1 addon, `adminReceptionController.js:14`) | `PUT /admin/users/:id/restore` ✅ (`adminRestoreController.js`) | ✅ YES |
| Children | No `GET /admin/children?include_deleted=true` endpoint | `PUT /admin/children/:id/restore` ✅ | ❌ NO — missing list endpoint |
| Observations | No deleted-list endpoint | `PUT /admin/observations/:id/restore` ✅ | ❌ NO — missing list endpoint |
| Attendance | No deleted-list endpoint | `PUT /admin/attendance/:id/restore` ✅ | ❌ NO — missing list endpoint |

**Result: 2 tabs built (Parents, Receptions). 3 tabs skipped (honest: list endpoints not added in Phase 1 for children/observations/attendance).**

Both parent and reception records are `User` model rows — restore for both uses `PUT /admin/users/:id/restore`.

---

## 3. Per-Unit Log

| # | Title | Files | Tests |
|---|---|---|---|
| FE-9 | Trash/archive page — list and restore soft-deleted records | `Trash.jsx` (new), `App.jsx`, `Sidebar.jsx`, 3 locales, `Trash.test.jsx` (new) | +5 |
| AG-008 | Government message inbox — compose, sent items, reply view | `GovMessages.jsx` (new), `App.jsx`, `Sidebar.jsx`, 3 locales, `GovMessages.test.jsx` (new) | +5 |

---

## 4. FE-9 — Trash Page

**New file:** `admin/src/pages/Trash.jsx`
**Route added:** `path="trash"` in `App.jsx`
**Sidebar:** `Trash2` icon in settings section → `/admin/trash`

Two-tab layout (Parents | Receptions). Each tab loads lazily on first activation. Fetch uses `GET /admin/{entity}?include_deleted=true`. Each row shows name, email, deletedAt date, and a Restore button.

**Restore flow:** `PUT /admin/users/:id/restore` → on 200: row removed from list + success toast. On 400 `RESTORE_NOT_DELETED`: error toast, row stays. On other error: generic error toast. Restore button disabled during in-flight PUT (per-id state, not whole-page).

**Scope:** Server-side school scope (Phase 1 confirmed `include_deleted` paths still use `createdBy` chain). Page relies on this — no client-side bypass.

**Tests (5):**
1. Renders deleted parents list in default tab (`firstName lastName` visible)
2. Clicking Receptions tab fetches and renders deleted receptions
3. Restore button calls `PUT /admin/users/:id/restore` and removes row on 200
4. 400 `RESTORE_NOT_DELETED` handled — row remains, error toast (api.put mock not causing row removal)
5. Empty state when no deleted records

---

## 5. AG-008 — Government Message Inbox

**New file:** `admin/src/pages/GovMessages.jsx`
**Route added:** `path="messages"` in `App.jsx`
**Sidebar:** `Mail` icon in management section → `/admin/messages`

**Reply model confirmation:** The `GovernmentMessage` model (`backend/models/GovernmentMessage.js`) has an inline `reply TEXT` field and a `repliedAt DATE` on the same record. The government writes the reply into these fields directly. The `getMyMessages` controller returns records where `senderId = req.user.id` — no joins needed. This is a **reply-in-same-record** model, NOT a separate thread entry. (The model also has `parentMessageId` for potential threading, but the admin-facing view ignores it — admins only see their own sent messages with inline replies.)

**Layout:**
- Left panel (320px): sent message list — subject, reply badge (Replied/Pending), sent date
- Right panel: thread view — shows original message text + government reply (if `reply !== null`) with `repliedAt` timestamp
- Compose button → modal with subject (max 255) + message (max 10000) fields

**Compose:** POST `/admin/message-to-government` with `{ subject, message }`. On success: new message prepended to the list + modal closed + success toast.

**READ-ONLY inbox:** The sent-list panel is read-only. The compose modal contains a `<textarea>` but it's only rendered when `composing === true` — it's not an inbox reply box.

**Tests (5):**
1. Renders sent messages list from `GET /admin/messages` (subject visible)
2. `Replied` badge when `reply` field is non-null
3. `Pending` badge when `reply` field is null
4. Thread view shows original message content AND government reply text
5. Compose form submits `POST /admin/message-to-government` with `{ subject, message }`

---

## 6. Manual Gate Checklist for Max

- [ ] **FE-9 Trash — Parents tab:** Navigate to `/admin/trash`. Verify deleted parents appear with name, email, deleted date. Click Restore on one — verify it disappears from the list (no longer in trash) and reappears in the normal Parents page.
- [ ] **FE-9 Trash — Receptions tab:** Click the Receptions tab — verify deleted receptions load. Restore one; confirm it reappears as active.
- [ ] **FE-9 Trash — Children tab absent:** Confirm there is NO Children tab (no deleted-list endpoint exists for children — honest gap).
- [ ] **AG-008 Gov Messages — Compose:** Click "New Message". Fill in subject + message. Send. Confirm the message appears in the sent list with "Pending" badge.
- [ ] **AG-008 Gov Messages — Reply view:** If any existing message in test data has a government reply (`reply` field populated), click it in the sent list. Confirm the thread view shows both the original message and the government's reply in separate styled boxes.
- [ ] **AG-008 Gov Messages — Reply badge:** Confirm "Replied" badge (green) vs "Pending" badge (yellow/orange) display correctly based on whether `reply` is populated.

---

## 7. Final State

- **Admin test suite:** 148 tests / 27 suites / lint 0 / all passing
- **Backend:** 1179 tests — unchanged
- **New pages:** Trash.jsx, GovMessages.jsx
- **New routes:** 2 (`/admin/trash`, `/admin/messages`)
- **New sidebar items:** 2 (Trash2/trash in settings section, Mail/messages in management section)
- **Locale keys added:** ~30 per language × 3 = ~90 new keys across en/uz/ru (uz/ru UNVERIFIED — AI-generated)

---

## 8. Admin S7 Complete — All 4 Phases

| Phase | Units | Tests added | Status |
|---|---|---|---|
| Phase 1 (Backend) | BE-1..4 + FE-9 addon | +37 backend tests | ✅ |
| Phase 2 (FE) | FE-10, FE-2, FE-4, FE-1 | +18 admin tests | ✅ Manual gate ✅ |
| Phase 3 (FE) | FE-6, FE-8, FE-5, FE-3, FE-7 | +25 admin tests (138 total) | ✅ |
| Phase 4 (FE) | FE-9, AG-008 | +10 admin tests (148 total) | ✅ Manual gate pending |

**Admin S7 = ✅ (all 4 phases complete). Manual gate for Phase 4 required before S8.**

---

## 9. What Remains

**S8 — Admin Final Verify:**
- Manual gate walk-through (Phase 4 items above)
- Full smoke test of all admin pages on Railway
- Confirm bulk import end-to-end (CP-011)
- Reconcile the "113 tests" Phase 2 reporting error (done in Phase 3 reconciliation)

**Cross-portal remaining (not admin scope):**
- CP-020: School ratings admin view — deal-gated (DG-003), no admin form yet
- CP-019: TranslationNotice — admin portal does NOT have end-user-facing registration, so no banner needed here (parent/teacher portals carry this)
- PL-009-VERIFY: i18n professional review before launch
- FE-9 gap: if Children/Observations/Attendance restore tabs are needed in future, backend needs `GET /admin/children?include_deleted=true` etc. (small ~30min addition each)

**Next loop:** Reception portal (Loop 4).
