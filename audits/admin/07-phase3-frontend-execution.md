# Admin Portal — S7 Phase 3 Cockpit-Visibility Frontend Execution

**Date:** 2026-05-22  
**Branch:** main  
**Baseline test count (before phase):** 20 suites / 113 tests (confirmed clean run)  
**Final test count:** 25 suites / 138 tests  
**Lint:** 0 warnings / 0 errors  

---

## 1. Test Count Reconciliation

The Phase 2 deliverable (`07-phase2-frontend-execution.md`) incorrectly reported both baseline and final as "20 suites / 113 tests" despite adding 18 tests (6 + 5 + 7 from FE-2, FE-4, FE-1). The 113 figure was the post-Phase-2 count, not pre. Honest reconciliation:

- **True pre-Phase-2 start:** ~95 tests (before Phase 2 ran its test additions)
- **Post-Phase-2 (= Phase 3 baseline):** 113 tests / 20 suites — confirmed by clean pre-task run
- **Phase 3 adds:** 5 (SchoolProfile) + 4 (TeacherDetail) + 5 (ActivityFeed) + 5 (ChildDetail) + 5 (Communications) = **24 new tests in 5 new suites**
- **Phase 3 final:** **138 tests / 25 suites**

**Post-crash reconciliation (2026-05-22):** Editor crashed after all 5 units were committed. Dirty working tree had a consistent `useRef` stabilization refactor across all 5 pages (removing `toastError`/`toastSuccess` from `useEffect` dependency arrays) plus a SchoolProfile test split (1 combined test → 2 separate tests). All changes were sound — committed as a single fix commit. No units needed rework.

---

## 2. Per-Unit Log

| # | SHA | Title | Test file | Tests |
|---|---|---|---|---|
| 1 | `d68d8e6` | feat(admin): school profile page — view + contact-field edit (FE-6) | `SchoolProfile.test.jsx` (new) | +5 |
| 2 | `d915410` | feat(admin): teacher detail view (read-only — profile + groups, FE-8) | `TeacherDetail.test.jsx` (new) | +4 |
| 3 | `7d9e6db` | feat(admin): activity feed — dashboard panel + full audit page (FE-5) | `ActivityFeed.test.jsx` (new) | +5 |
| 4 | `773818a` | feat(admin): child detail page — observations + goals tabs (FE-3) | `ChildDetail.test.jsx` (new) | +5 |
| 5 | `d376356` | feat(admin): staff-parent communications hub (read-only oversight, FE-7) | `Communications.test.jsx` (new) | +5 |
| fix | `1111793` | fix(admin): simplify SchoolProfile saving-state test (FE-6) | `SchoolProfile.test.jsx` | — |
| fix | `6882777` | fix(admin): fix flaky test assertions in Phase 3 test suite | ActivityFeed/ChildDetail/Comms | — |
| fix | `9bb5584` | fix(admin): stable fetch callback + url-based mocks for Phase 3 tests | ActivityFeed.jsx + tests | — |
| fix | post-crash | fix(admin): useRef-stabilized toast callbacks; split SchoolProfile isActive test | all 5 pages + SchoolProfile test | +1 |

---

## 3. FE-6 — School Profile Page

**New file:** `admin/src/pages/SchoolProfile.jsx`  
**Route added:** `path="school"` in `App.jsx`  
**Sidebar:** `Building2` icon in settings section → `/admin/school`

Fetches `GET /admin/school`. State split:
- Read-only display: `name`, `type`, `isActive` badge (green Active / red Archived), `region.name`, `category.name`
- Editable form: `phone`, `email`, `address`, `description`, `director` — initialized from fetched data
- Save calls `PATCH /admin/school` with **only** `{ phone, email, address, description, director }` — name/type/regionId never sent

Cache: `admin:school-profile` cache key, stale-while-revalidate pattern.

**Tests (5):**
1. Renders school name and contact inputs from GET response
2. isActive=true shows "Active" badge; isActive=false shows "Archived"
3. Region and category names displayed in read-only section
4. PATCH body contains exactly the 5 whitelisted fields; asserts `body` does NOT have `name`, `type`, `regionId`
5. Save button `disabled=true` while saving; re-enables after PATCH resolves

---

## 4. FE-8 — Teacher Detail View

**New file:** `admin/src/pages/TeacherDetail.jsx`  
**Route added:** `path="teachers/:id"` in `App.jsx`  
**TeacherManagement.jsx changes:** Added `useNavigate`, wrapped each TeacherCard in a clickable `div`, added `ChevronRight` icon

View-only page showing: avatar initials, full name, email, phone. Groups table with `name`, `ageRange`, `capacity` columns. No suspend/activate/edit buttons present at all.

Cache: per-teacher key `admin:teacher:{id}`.

**Tests (4):**
1. Renders teacher name and email from API
2. Lists both groups with name and ageRange
3. `queryByRole('button', { name: /suspend|activate/i })` returns null — confirmed no action buttons
4. "Back to teachers" button present

---

## 5. FE-5 — Activity Feed

**New file:** `admin/src/pages/ActivityFeed.jsx`  
**Route added:** `path="activity"` in `App.jsx`  
**Sidebar:** `History` icon in reports section → `/admin/activity`  
**Dashboard.jsx changes:** Extended `fetchFresh` to also call `GET /admin/audit-log?limit=8`. Added `auditEntries` state. Replaced placeholder "coming soon" block with real audit entry rows. "Audit jurnali →" is now a `<Link to="/admin/activity">`.

**ACTION_META label map (15 entries):**
```
approve:documents, reject:documents, create:receptions, delete:receptions,
activate:receptions, deactivate:receptions, suspend:users, activate:users,
restore:children, restore:users, bulk_import:children, transfer:children, update:schools
```

Dashboard panel shows up to 8 entries as compact rows: color dot (derived from action color class), action label, actor name, relative time ("X daqiqa oldin"). Empty state shows "No activity yet" if no entries.

Full `ActivityFeed.jsx` page: paginated table (20/page), action dropdown filter, date-range inputs. Columns: date, actor, action label, entity. Pagination prev/next shown only when `totalPages > 1`.

**Fix note:** `fetchEntries` useCallback uses a ref for `toastError` to keep the callback stable and prevent infinite re-fetch loops when the mock returns a new function instance on each call.

**Tests (5):**
1. Table renders both actor names from ENTRIES array
2. Action labels map correctly (`Hujjat tasdiqlandi`, `Ota-ona to'xtatildi`)
3. Empty state shown when entries=[]
4. Filter dropdown change calls API with `action` query param
5. Pagination controls (Prev/Next) appear when totalPages > 1

---

## 6. FE-3 — Child Detail Page

**New file:** `admin/src/pages/ChildDetail.jsx`  
**Route added:** `path="children/:id"` in `App.jsx`  
**ParentManagement.jsx changes:** Child cards in detail panel are now `<Link to="/admin/children/{id}" state={{ child }}>` (imported `Link` from react-router-dom)

Child data comes from `location.state.child` (passed via navigate). Two tabs:
- **Observations** (loaded on mount): `GET /admin/children/:id/observations`. Sorted latest first. Domain badge (color by domain type), severity badge (critical=red/high=orange/medium=blue/low=grey), note text.
- **Goals** (lazy — loaded only when tab clicked): `GET /admin/children/:id/goals`. Goal text, status badge (active=blue/completed=green/paused=grey), category, latestReviewDate.

**Domain colors:** cognitive=purple, social=blue, emotional=pink, physical=green, language=yellow  
**Severity colors:** critical=error, high=warning, medium=info, low=warm

**Tests (5):**
1. Renders child name from `location.state.child`
2. Observations: domain badge "cognitive" and note text visible
3. Goals: lazy load on tab click; "Improve vocabulary" and "active" badge visible
4. "No observations recorded" empty state when observations=[]
5. "No goals recorded" empty state when goals=[]

---

## 7. FE-7 — Communications Hub (Read-Only)

**New file:** `admin/src/pages/Communications.jsx`  
**Route added:** `path="communications"` in `App.jsx`  
**Sidebar:** `MessageSquare` icon in management section (after nav.parents) → `/admin/communications`

Two-panel layout. Left panel (~320px): conversation list with parent initials avatar, enriched parent name, last message preview, timestamp, unread badge. Right panel: message thread or empty-select placeholder.

**Data fetching:** `Promise.all` on both `/v1/chat/conversations` and `/admin/parents`. Parent name enriched by joining `conversationId.replace('parent:', '')` → `parentMap[parentId]`. Messages fetched lazily on conversation click via `/v1/chat/messages?conversationId=parent:{id}`.

**READ-ONLY guarantee:** Component contains zero `<input>` or `<textarea>` elements. No send button. The component is structurally incapable of composing messages.

**Message thread:** Each message shows senderRole badge — "Parent" (blue) or "Teacher / Staff" (green) — plus content and time. Rendered in chronological order.

**Backend scoping:** Conversations are scoped to the admin's school via the Phase 1 BE-3 fix in `chatController.js` (filtering by `schoolId`). The admin portal reads only school-scoped conversations.

**Tests (5):**
1. Conversation list renders enriched parent name "Barno Umarova"
2. Clicking conversation loads messages thread ("Hello teacher!", "Hello parent!")
3. Parent badge = "Parent" (blue), teacher badge = "Teacher / Staff" (green)
4. Empty state when conversations=[]
5. `queryByPlaceholderText(/message|xabar/i)` returns null AND `queryByRole('textbox')` returns null — no send box

---

## 8. Manual Gate Checklist for Max

- [ ] **FE-6 School Profile** — Open `/admin/school`. Verify school name + region + category shown in read-only grey card. Edit phone/email/address/description/director. Save. Verify backend PATCH called with only those 5 fields (check network tab — should NOT include `name`, `type`, `regionId`). Active/Archived badge correct.
- [ ] **FE-8 Teacher Detail** — Click any teacher card. Verify navigate to `/admin/teachers/:id`. Verify groups table present. Confirm zero suspend/activate/edit buttons visible.
- [ ] **FE-5 Dashboard Activity Panel** — Dashboard home shows "So'nggi faoliyat" panel with real audit entries (or "No activity yet" if log is empty). "Audit jurnali →" link goes to `/admin/activity` page.
- [ ] **FE-5 Activity Feed Page** — `/admin/activity`. Filter by action dropdown works. Date range inputs update list. Pagination shows only when multiple pages exist.
- [ ] **FE-3 Child Detail** — In parent detail panel, click a child card. Verify navigates to `/admin/children/:id`. Observations tab loads by default. Clicking Goals tab loads goals lazily (second API call). Both tabs show correct badge colors.
- [ ] **FE-7 Communications** — `/admin/communications`. Conversation list shows parent names. Click a conversation — messages load in right panel. Verify absolutely no text input or send button exists. Unread badge shows on conversations with unreadCount > 0.

---

## 9. Final State

- **Admin test suite:** 138 tests / 25 suites / lint 0 / all passing
- **Backend:** 1179 tests / 111 suites — unchanged
- **New pages:** 5 (SchoolProfile, TeacherDetail, ActivityFeed, ChildDetail, Communications)
- **New routes:** 5
- **New sidebar items:** 4 (Building2/school, History/activity, MessageSquare/communications; TeacherDetail has no sidebar item — accessed via TeacherManagement cards)
- **Locale keys added:** ~80 keys across en/uz/ru (uz/ru UNVERIFIED — AI-generated)

---

## 10. Phase 4 + S8 Remaining Work

**Remaining FE items from plan:**
- FE-9: Restore UI (CP-016) — child/parent restore buttons for archived items
- AG-007: Government message inbox in admin Profile page

**Not started (Phase 4 scope):**
- S8: Reception portal audit + cleanup
- CP-011: Bulk import — Phase 2 delivered but needs end-to-end verification
- CP-020: School ratings admin view — read-only SchoolRatings page exists, no admin-facing form (deal-gated, needs product decision)
- PL-009-VERIFY: i18n professional review before launch
- CP-019: TranslationNotice already ported (S3) — needs parent/teacher portals

**Deal-gated items unchanged:** DG-001 (real region names), DG-002 (real category names), DG-003 (category UI).
