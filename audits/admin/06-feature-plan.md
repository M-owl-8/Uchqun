# Admin Portal — S6 Feature Plan (Owner-Cockpit Scope)

**Date:** 2026-05-22
**Scope:** Backend sub-sprint + frontend features. The admin is the BUSINESS OWNER of a private special-education school. The portal is their cockpit — they must see everything: staff, children and their care, parents, and all interactions flowing between them.
**Research basis:** adminRoutes.js, adminTeacherController.js, chatController.js, AuditLog.js, School.js, GovernmentMessage.js, Notification.js, adminReceptionController.js, adminRestoreController.js, adminImportController.js, adminParentController.js

---

## Task 0 — Teacher backend surface (Q3 finding)

### What admin can currently query about teachers

`GET /admin/teachers` (adminTeacherController.js) — returns teachers scoped via the `createdBy` chain: admin → receptions → teachers. Returns full user record minus password. View-only.

There is no:
- `GET /admin/teachers/:id` (no teacher detail endpoint)
- Teacher suspend/activate endpoints
- Teacher edit endpoints

The comment in `adminTeacherController.js:7` makes the design intent explicit: *"Admin can only view teachers, cannot create/edit/delete."*

### Teacher activity visible via existing data

- **audit_log**: entries with `schoolId = admin's school` include all school-scoped operations (parent suspend/activate, restore, bulk import, but NOT reception CRUD or document approvals — these aren't logged; see BE-1 note).
- **ChildObservation**: has `teacherId`. Admin reads via `GET /admin/children/:id/observations` (observation authorship is visible indirectly).
- **Groups**: each group has `teacherId`. Admin reads via `GET /admin/groups` and `/groups/:id`.
- **Chat**: teacher-parent conversations accessible to admin via chatRoutes.js (school-scoping gap — see BE-3).

### Q3 decision for Max

| Option | Backend work | Frontend work | What admin sees |
|---|---|---|---|
| **A — View-only enhanced** (recommended) | Add `GET /admin/teachers/:id` | Teacher detail page: profile + groups + assigned children count | Owner reads the staff picture, delegation to reception for management |
| **B — Full management** | Add teacher suspend/activate (same pattern as parent suspend/activate) | + Suspend/activate buttons | Owner can remove teacher access directly without going through reception |

**Recommendation:** Option A is consistent with the current design intent and the role hierarchy (reception manages teachers day-to-day). Option B concentrates more power at the owner level — reasonable for a private school owner, but requires explicit product sign-off.

**⚠️ Q3 decision needed from Max before FE-8 is built.** BE-4 is conditional on this answer.

---

## Backend sub-sprint plan

### BE-1 — Admin activity/audit feed

**Endpoint:** `GET /api/admin/audit-log`  
**New file:** `backend/controllers/admin/adminAuditController.js`  
**Route addition:** `router.get('/audit-log', getAdminAuditLog)` in adminRoutes.js

**Why school-scoping is trivial:** `AuditLog` model has a native `schoolId` field (`DataTypes.UUID, allowNull: true`). The query is a direct `WHERE schoolId = req.user.schoolId` — no cross-table join needed (unlike government's region-scope which required a `schoolId IN (SELECT id FROM schools WHERE regionId = ...)` subquery).

**Admin-scoped allowlist** (the events currently logged with `schoolId`):

| Event key (action:entity) | Source | In audit_log today? |
|---|---|---|
| `suspend:users` | adminParentController.js | ✅ |
| `activate:users` | adminParentController.js | ✅ |
| `restore:children` | adminRestoreController.js | ✅ |
| `restore:users` | adminRestoreController.js | ✅ |
| `restore:observations` | adminRestoreController.js | ✅ |
| `restore:attendance` | adminRestoreController.js | ✅ |
| `bulk_import:children` | adminImportController.js | ✅ |
| `approve:documents` | adminReceptionController.js | ❌ not logged |
| `reject:documents` | adminReceptionController.js | ❌ not logged |
| `create:receptions` | adminReceptionController.js | ❌ not logged |
| `delete:receptions` | adminReceptionController.js | ❌ not logged |
| `activate:receptions` | adminReceptionController.js | ❌ not logged |
| `deactivate:receptions` | adminReceptionController.js | ❌ not logged |
| `transfer:children` | childController.js | needs verification |

**Action within BE-1:** Add `logAudit` calls to `adminReceptionController.js` for approve/reject documents, create/delete reception, and activate/deactivate reception. These are the key governance events the school owner needs to see. (6 new `logAudit` calls, each with `schoolId: req.user.schoolId`.)

**Endpoint design:**

```js
// GET /api/admin/audit-log?page=1&limit=20&action=approve&startDate=2026-05-01
export const getAdminAuditLog = async (req, res) => {
  // Defense-in-depth
  if (req.user.role !== 'admin') return res.status(403).json(...)
  
  // Server-side allowlist (blocks scope-creep queries)
  const ADMIN_AUDIT_ALLOWLIST = new Set([
    'suspend:users', 'activate:users',
    'restore:children', 'restore:users', 'restore:observations', 'restore:attendance',
    'bulk_import:children',
    'approve:documents', 'reject:documents',
    'create:receptions', 'delete:receptions', 'activate:receptions', 'deactivate:receptions',
    'transfer:children',
  ]);
  
  // Validate action/entity filters against allowlist
  // Build where: { schoolId: req.user.schoolId, [Op.or]: allowlistPairs, ...dateFilters }
  // AuditLog.findAndCountAll with actor User include
  // Paginate: page/limit (limit capped at 100)
  // Response: { success, data: { entries, total, page, limit, totalPages } }
}
```

**Tests needed:**
1. Returns only entries where `schoolId = admin's schoolId` (core scoping test)
2. **Revert-test for isolation**: seed entries for two schools A and B; admin A cannot see school B's entries
3. Invalid action filter returns 400 AUDIT_LOG_INVALID_FILTER
4. Paginated correctly (total, page, limit, totalPages)
5. Empty result when no matching entries
6. Actor include works (actorId = null yields null actor, not crash)

**Error codes to add to i18n catalog:** `ADMIN_AUDIT_LOG_INVALID_FILTER`, `ADMIN_AUDIT_LOG_FETCH_FAILED`

**Effort:** ~3h (endpoint + 6 logAudit additions to receptionController + 6 tests)

---

### BE-2 — Admin school profile view

**Endpoint:** `GET /api/admin/school`  
**New file:** `backend/controllers/admin/adminSchoolController.js`  
**Route addition:** `router.get('/school', getAdminSchool)` in adminRoutes.js

**School model fields:**
- Owner can view: `id, name, type, address, phone, email, description, region, city, director, isActive, regionId, categoryId, createdAt, updatedAt`
- Some fields (name, type, regionId, isActive, categoryId) are government-controlled lifecycle fields. Owner should view but not edit.
- Owner-editable candidates: `phone, email, address, description, director` (contact/operational info only).

**Endpoint design:**

```js
export const getAdminSchool = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json(...)
  
  const school = await School.findByPk(req.user.schoolId, {
    include: [
      { model: Region, as: 'region', attributes: ['id', 'name', 'code'], required: false },
      { model: SchoolCategory, as: 'category', attributes: ['id', 'name', 'code'], required: false },
    ],
    attributes: { exclude: [] }, // return all
  });
  
  if (!school) return res.status(404).json({ success: false, error: { code: 'SCHOOL_NOT_FOUND' } });
  
  return res.json({ success: true, data: school.toJSON() });
};
```

**Optional `PATCH /api/admin/school`** — update owner-editable fields only (phone, email, address, description, director). Whitelist enforced. Pending Max's decision on whether admin can edit their school info.

**⚠️ Decision needed from Max:** Can the school owner edit their own school's contact info (phone, email, address, description, director)? Or is all school editing government-only?

**Tests needed:**
1. Returns correct school for admin's `schoolId`
2. **Revert-test for isolation**: admin A cannot see school B's record (returns 404)
3. 404 when school doesn't exist (edge case — should never happen, but test it)
4. If PATCH is built: valid whitelist-only fields accepted; non-whitelisted fields ignored

**Error codes:** `SCHOOL_NOT_FOUND`, `SCHOOL_UPDATE_FAILED` (if PATCH added)

**Effort:** ~2h view-only, +1h if PATCH is added

---

### BE-3 — Chat school-scoping fix (staff-parent interaction visibility)

**Current state (isolation gap):** `getAccessibleConversationIds` in chatController.js handles admin role at line 200:
```js
if (req.user.role === 'admin') {
  const rows = await ChatMessage.findAll({
    attributes: ['conversationId'],
    group: ['conversationId'],
    raw: true,
    ...(prefix && { where: { conversationId: { [Op.like]: `${prefix}%` } } }),
  });
  return rows.map((r) => r.conversationId);
}
```
This returns ALL conversations from the `chat_messages` table with no school filter. Admin A can currently see parent-teacher chats from any school in the system. **This is a privacy/security isolation bug.**

**Model limitation:** `ChatMessage` has no `schoolId` field. Adding one requires a migration and backfill. However, conversations follow the pattern `conversationId = 'parent:{parentId}'` — so school membership is derivable by joining parent → children → school.

**Fix (no migration needed):**
```js
if (req.user.role === 'admin') {
  // Scope to parents whose children belong to admin's school
  const children = await Child.findAll({
    where: { schoolId: req.user.schoolId },
    attributes: ['parentId'],
    raw: true,
  });
  const parentIds = [...new Set(children.map(c => c.parentId).filter(Boolean))];
  const ids = parentIds.map(id => `parent:${id}`);
  return prefix ? ids.filter(id => id.startsWith(prefix)) : ids;
}
```

**Tests needed:**
1. Admin sees only conversations for parents at their school
2. **Revert-test for isolation**: admin A cannot see conversations for parents at school B (parent has children ONLY at school B)
3. Returns empty array when admin's school has no parent conversations
4. `canAccessConversation` for admin still grants access to own-school conversations

**Note:** `canAccessConversation` for admin (line 14: `if (req.user.role === 'admin') return true`) is ALSO unscoped — it allows admin to read any specific conversation if they know the conversationId. Fixing `getAccessibleConversationIds` closes the listing gap; fixing `canAccessConversation` closes the direct-access gap. Both should be fixed together: `canAccessConversation` should call `getAccessibleConversationIds` and check membership, OR add an explicit school check.

**Updated `canAccessConversation` for admin:**
```js
if (req.user.role === 'admin') {
  // Verify the conversation belongs to admin's school
  const parentId = conversationId.replace('parent:', '');
  const child = await Child.findOne({ where: { parentId, schoolId: req.user.schoolId }, attributes: ['id'] });
  return !!child;
}
```

**Effort:** ~2h (fix both functions + revert-tests + existing tests remain green)

---

### BE-4 — Teacher detail endpoint (CONDITIONAL on Q3)

**Conditional on Max's Q3 decision.**

**If Option A (view-only enhanced):**

`GET /api/admin/teachers/:id`  
New function in `adminTeacherController.js`.

```js
export const getTeacherById = async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json(...)
  
  // Verify teacher belongs to admin's school (via createdBy chain)
  const receptions = await User.findAll({ where: { role: 'reception', createdBy: req.user.id }, attributes: ['id'] });
  const receptionIds = receptions.map(r => r.id);
  const teacher = await User.findOne({
    where: { id: req.params.id, role: 'teacher', createdBy: { [Op.in]: receptionIds } },
    attributes: { exclude: ['password'] },
  });
  if (!teacher) return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
  
  // Include groups and children count
  const groups = await Group.findAll({ where: { teacherId: teacher.id }, attributes: ['id', 'name', 'ageRange', 'capacity'] });
  
  return res.json({ success: true, data: { ...teacher.toJSON(), groups } });
};
```

**Tests needed (Option A):**
1. Returns teacher with groups when teacher belongs to admin's school
2. **Revert-test for isolation**: returns 404 when teacher belongs to different school (not in admin's reception chain)
3. Returns 404 for non-existent teacher

**If Option B (full management), add additionally:**
- `PUT /api/admin/teachers/:id/suspend` — same pattern as `suspendParent`
- `PUT /api/admin/teachers/:id/activate` — same pattern as `activateParent`
- Each with defense-in-depth role check, school IDOR via createdBy chain, logAudit before update, 409 for TEACHER_ALREADY_SUSPENDED/ACTIVE

**Effort:** Option A ~2h | Option B ~6h total

---

## Frontend features plan

### FE-1 — Bulk import UI (AG-001, HIGH, demo-critical)

**Depends on:** Existing backend (CP-011). No new BE needed.  
**New page:** `admin/src/pages/BulkImport.jsx`  
**New route:** `path="import"` in App.jsx  
**Sidebar:** Add `{ key: 'nav.import', href: '/admin/import', icon: Upload }` to management section

**5-step flow:**
1. **Upload step**: `<input type="file" accept=".csv">` + format guide (required headers listed). `POST /api/admin/import/children/validate` with `FormData`. Shows spinner during upload.
2. **Validation result**: Card showing total/valid/invalid rows. If `invalidRows > 0`, expandable error table (row#, field, i18n code). "Continue with valid rows" button disabled if `validRows === 0`.
3. **Start confirmation**: "Import X children?" with ConfirmDialog showing count + "Y rows will be skipped due to errors" if applicable. `POST /api/admin/import/:id/start`.
4. **Progress polling**: Loading spinner + status badge. Poll `GET /api/admin/import/:id/status` every 3s while status = `importing`. Stop on `completed` or `failed`.
5. **Final result**: Success: "X children imported." With any `IMPORT_ROW_CREATE_FAILED` rows listed. Failure: full error display.

**i18n keys needed:** `import.*` section in en/uz/ru common.json (25-30 keys for headers, labels, error messages, status states).

**Error code display**: map each `IMPORT_ROW_*` code to a human-readable i18n key (12 codes).

**Tests needed:**
1. Upload step renders file picker
2. Validation result shows valid/invalid counts and error table
3. Start button disabled when `validRows === 0`
4. "Continue" confirmation calls `POST start`
5. Polls status until completed (mock timers)
6. Final result renders imported count
7. Error path: shows failure message

**Effort:** ~8h

---

### FE-2 — Parent suspend/activate (AG-002, HIGH, demo-critical)

**Depends on:** Existing backend. No new BE needed.  
**File to modify:** `admin/src/pages/ParentManagement.jsx`

**Changes:**
- Add `status` badge on parent list row: green "Active" / red "Suspended"
- In parent detail panel (or list row actions): Suspend button (shown when `status !== 'suspended'`) + Activate button (shown when `status === 'suspended'`)
- Both trigger ConfirmDialog before API call
- API calls: `PUT /admin/parents/:id/suspend` and `PUT /admin/parents/:id/activate`
- Handle 409 PARENT_ALREADY_SUSPENDED/ACTIVE (refresh state, show toast)
- On success: update parent's status in local state (no full reload)

**Tests needed:**
1. Suspend button visible for active parent
2. Activate button visible for suspended parent
3. ConfirmDialog appears before action
4. `PUT .../suspend` called on confirm; PUT not called on cancel
5. Status badge updates on success
6. 409 handled gracefully (toast + badge stays unchanged)

**Effort:** ~3h

---

### FE-10 — Groups sidebar link (AG-007, trivial)

**Depends on:** Nothing. GroupManagement page + route already exist.  
**1 file to modify:** `admin/src/components/Sidebar.jsx`  
**3 i18n files:** en/uz/ru common.json

**Change:** Add `{ key: 'nav.groups', href: '/admin/groups', icon: Users2 }` to the management section in NAV_SECTIONS. Add `nav.groups` key to all 3 locale files.

**No tests needed** (sidebar has existing test coverage for all nav items; add one assertion).

**Effort:** 15 min

---

### FE-4 — AI Warnings analyze + notify (AG-006, MED, demo-critical)

**Depends on:** Existing backend. No new BE needed.  
**File to modify:** `admin/src/pages/AIWarnings.jsx`

**Changes:**
1. **"Analyze" button** in page header — `POST /api/ai-warnings/analyze` with `{ schoolId: user.schoolId }` from `useAuth()`. On success: reload warning list. Show spinner during request. Toast on completion ("Analysis complete").
2. **"Notify" button** on each unresolved warning card — `POST /api/ai-warnings/:id/notify` with default body `{ includeParents: true, includeTeachers: true }`. ConfirmDialog before action. Toast on success.
3. **Stability note**: both buttons need the same `useCallback` stability pattern already in place for `fetchWarnings`.

**Tests needed:**
1. "Analyze" button triggers `POST /ai-warnings/analyze` with user's schoolId
2. Warning list refreshes after analyze
3. "Notify" button appears on unresolved cards only
4. ConfirmDialog shown before notify
5. `POST /ai-warnings/:id/notify` called on confirm; not called on cancel

**Effort:** ~3h

---

### FE-3 — Child detail page (AG-004 + AG-005)

**Depends on:** Existing backend `GET /admin/children/:id/observations` and `GET /admin/children/:id/goals`.  
**New pages:** `admin/src/pages/ChildDetail.jsx`  
**Access path:** Parent detail → child card → click → ChildDetail

**New route:** `path="children/:id"` in App.jsx

**Page sections:**
1. **Child summary**: name, dateOfBirth, disability type, school enrollment info (from parent's child data already in `getParentById` response)
2. **Observations** tab: list of observations (date, domain badge, severity badge, note). Sorted by observationDate DESC. Shows `teacherId` indirectly via who authored the note. Read-only.
3. **Goals** tab: list of goals with progress status, category. Shows latest review date. Expandable to see review history. Read-only.

**Access control:** admin sees only children at their school (enforced at API level — `validateChildAccess` and `listByChildAsAdmin` both check `schoolId`).

**Tests needed:**
1. Page renders with child summary
2. Observations tab loads and displays domain/severity badges
3. Goals tab loads and displays goal status
4. "No observations" empty state
5. "No goals" empty state

**Effort:** ~6h

---

### FE-5 — Activity feed / audit log viewer (consumes BE-1)

**Depends on:** BE-1 (new `GET /admin/audit-log` endpoint).  
**Files to modify:** `admin/src/pages/Dashboard.jsx` (wire the placeholder) + optionally a new `admin/src/pages/ActivityFeed.jsx`

**Dashboard panel** (replace "Faoliyat tarixi tez kunda" placeholder):
- Show last 5-10 audit entries for the school
- Each entry: icon by action type, description (action + entity + actor name), time ago
- "See all" link to full ActivityFeed page

**ActivityFeed page** (full view):
- Paginated table: date, actor, action, entity
- Filter bar: by action category (dropdown from allowlist), by date range
- Mirrors the government AuditLog page pattern

**i18n keys:** `activityFeed.*` section (20 keys approx — action labels, entity labels, empty state)

**Tests needed:**
1. Dashboard activity panel shows recent entries (mocked BE-1 response)
2. "No activity" empty state when list is empty
3. ActivityFeed page renders paginated entries
4. Filter by action works
5. Pagination controls work

**Effort:** ~4h (Dashboard panel 1.5h + ActivityFeed page 2.5h)

---

### FE-6 — School profile page (consumes BE-2)

**Depends on:** BE-2 (`GET /admin/school` endpoint).  
**New page:** `admin/src/pages/SchoolProfile.jsx`  
**Route:** `path="school"` in App.jsx  
**Sidebar:** Add `{ key: 'nav.school', href: '/admin/school', icon: Building2 }` to settings section

**Page content:**
- School name, type badge, address, phone, email, description, director
- Region info (from region include)
- Category info (from category include)
- `isActive` status badge (green/archived)
- If Max approves PATCH: an "Edit" button for contact fields (phone, email, address, description, director)

**Tests needed:**
1. Renders school name + contact info from BE-2 response
2. Status badge shows "Active" or "Archived"
3. Region + category displayed when present
4. If edit: PATCH called with only whitelisted fields

**Effort:** ~2h view-only, +1h if edit form added

---

### FE-7 — Staff-parent chat UI (consumes BE-3)

**Depends on:** BE-3 (chat school-scoping fix).  
**New page:** `admin/src/pages/CommunicationsHub.jsx`  
**Route:** `path="communications"` in App.jsx  
**Sidebar:** Add `{ key: 'nav.communications', href: '/admin/communications', icon: MessageSquare }` to management section

**Page layout (two-panel):**
- Left: conversation list (parent name, last message preview, timestamp, unread badge)
- Right: message thread view (chronological, sender role badge)

**API calls (all existing chatRoutes.js):**
- `GET /api/v1/chat/conversations` — list (uses fixed `getAccessibleConversationIds`)
- `GET /api/v1/chat/messages?conversationId=parent:{id}` — thread
- Admin is read-only in this view (they can access conversations but the owner context is oversight, not participation)

**Note:** Admin COULD send messages per chatController.js (`senderRole = 'teacher'` for non-parent). Whether the owner should be able to inject into parent-teacher chats is a UX question. Plan as read-only first; flag the option.

**Tests needed:**
1. Conversations list renders from mocked listConversations response
2. Clicking a conversation loads the message thread
3. Empty state when no conversations
4. Message sender role badge distinguishes parent vs teacher

**Effort:** ~8h

---

### FE-8 — Teacher visibility enhancement (CONDITIONAL on Q3)

**Depends on:** BE-4 (if Option A: `GET /admin/teachers/:id`).  
**File to modify:** `admin/src/pages/TeacherManagement.jsx`

**If Option A:**
- Teacher list row is clickable → teacher detail panel
- Detail: profile info, assigned groups list, children count per group
- Read-only overlay (no edit/suspend)

**If Option B:**
- Additionally: Suspend/Activate buttons + ConfirmDialog (same pattern as FE-2)
- Status badge on list row

**Tests needed (Option A):**
1. Teacher list item navigates to detail view
2. Detail shows groups + children count

**Tests needed (Option B, additional):**
3. Suspend button triggers ConfirmDialog
4. PUT `.../suspend` called on confirm
5. Status badge updates

**Effort:** Option A ~4h | Option B ~6h

---

### FE-9 — Trash/Archive page (AG-003)

**Depends on:** Existing restore backend (CP-016). No new BE needed.  
**New page:** `admin/src/pages/Trash.jsx`  
**Route:** `path="trash"` in App.jsx  
**Sidebar:** Add `{ key: 'nav.trash', href: '/admin/trash', icon: Trash2 }` to settings section

**Page design:**
- Tabbed view: Children | Users | Observations | Attendance
- Each tab fetches soft-deleted records (need: `GET /admin/{entity}?include_deleted=true` filter — **NOT YET IMPLEMENTED at backend**)
- Once displayed, each row has a "Restore" button → `PUT /admin/{entity}/:id/restore`

**⚠️ Blocker:** The restore endpoints exist but there are no `GET` endpoints that list soft-deleted records. Backend needs to add `?paranoid=false` query support to at least the children and users list endpoints. This is a small backend addition (~1h) that can go in the BE sub-sprint.

**Add to BE sub-sprint:** `GET /admin/children?include_deleted=true` and `GET /admin/users?include_deleted=true` — add `paranoid: false` when `req.query.include_deleted === 'true'`.

**Tests needed:**
1. Deleted children list renders from mocked `include_deleted=true` response
2. Restore button calls `PUT .../restore`
3. Item removed from list on successful restore
4. 400 RESTORE_NOT_DELETED handled (toast + no state change)

**Effort:** ~5h frontend + ~1h backend addition = ~6h total

---

### FE-AG-008 — Government message inbox

**Depends on:** Existing backend (`POST /admin/message-to-government`, `GET /admin/messages`).  
**New page:** `admin/src/pages/GovMessages.jsx`  
**Route:** `path="messages"` in App.jsx  
**Sidebar:** Add `{ key: 'nav.govMessages', href: '/admin/messages', icon: Mail }` to management or settings section

**Page design:**
- Compose button → modal with subject + message fields → `POST /admin/message-to-government`
- Sent items list: subject, date, reply status badge (Replied / Pending)
- Clicking a sent message shows the thread (message + reply if present)

**Note:** `GET /admin/messages` returns messages where `senderId = req.user.id`. Government replies are stored in `reply` field of the same record (not as a separate GovernmentMessage). So the thread view is: original message + `reply` field below it.

**Tests needed:**
1. Compose form submits `POST /message-to-government`
2. Sent list renders from mocked `GET /messages` response
3. Reply badge shows "Replied" when reply field is non-null
4. Thread view shows original + reply

**Effort:** ~4h

---

## Full sequence

### Phase 0: Pre-sprint backend decisions (before S7 starts)
- Max answers Q3 (teacher visibility: Option A or B) → determines BE-4 and FE-8 scope
- Max answers school edit question → determines if BE-2 includes PATCH
- **S7 BEGINS only after Q3 is answered**

### Phase 1: Backend sub-sprint (all in one pass, ~12–16h depending on Q3)

| Unit | Effort | Dependencies |
|---|---|---|
| BE-1 (audit-log endpoint + logAudit additions to receptionController) | 3h | none |
| BE-2 (school profile view, +PATCH if Max approves) | 2–3h | none |
| BE-3 (chat school-scoping fix) | 2h | none |
| BE-4/A (teacher detail, if Option A) | 2h | none |
| BE-4/B (teacher suspend/activate, if Option B) | +4h | BE-4/A |
| FE-9 backend addition (list deleted records) | 1h | none |

**Phase 1 total:** ~10h (Option A) or ~14h (Option B)

Run full backend test suite before Phase 2 begins.

### Phase 2: Demo-critical frontend (highest value, no BE dependency)

| Unit | Effort |
|---|---|
| FE-10 (groups sidebar link, trivial) | 15min |
| FE-2 (parent suspend/activate) | 3h |
| FE-1 (bulk import) | 8h |
| FE-4 (AI warnings analyze + notify) | 3h |

**Phase 2 total:** ~14h

### Phase 3: Cockpit frontend (owner visibility)

| Unit | Effort | BE dependency |
|---|---|---|
| FE-3 (child detail page) | 6h | none (existing BE) |
| FE-5 (activity feed + dashboard panel) | 4h | BE-1 |
| FE-6 (school profile page) | 2–3h | BE-2 |
| FE-7 (staff-parent chat UI) | 8h | BE-3 |
| FE-8 (teacher visibility) | 4–6h | BE-4 |

**Phase 3 total:** ~24–27h

### Phase 4: Remaining features

| Unit | Effort |
|---|---|
| FE-9 (Trash/Archive page) | 5h |
| FE-AG-008 (Government message inbox) | 4h |

**Phase 4 total:** ~9h

---

## Effort summary

| Phase | Units | Effort (Option A) | Effort (Option B) |
|---|---|---|---|
| 0 (BE decisions) | Q3 + PATCH decision | 0 (planning only) | same |
| 1 (Backend sub-sprint) | BE-1..4 + FE-9 addon | ~10h | ~14h |
| 2 (Demo-critical FE) | FE-1,2,4,10 | ~14h | same |
| 3 (Cockpit FE) | FE-3,5,6,7,8 | ~24h | ~26h |
| 4 (Remaining) | FE-9,AG-008 | ~9h | same |
| **Total** | 14 feature units | **~57h ≈ 7.5 days** | **~61h ≈ 8 days** |

The minimum viable government demo (Phases 1+2) is ~24h ≈ 3 days of work.

---

## Decisions still needed from Max before S7

| Decision | Unblocks | Recommendation |
|---|---|---|
| **Q3**: teacher Option A (view-only detail) or Option B (full management, suspend/activate)? | BE-4, FE-8 | Option A — consistent with role hierarchy |
| **BE-2 edit**: can admin edit contact fields (phone, email, address, director) on their school? | BE-2 PATCH, FE-6 edit form | Yes — these are operational fields the owner controls |
| **AG-009**: is inter-school child transfer admin's job for the demo? | FE-AG-009 | Probably no — government-managed workflow; skip for S7 |
| **FE-7 admin chat**: is admin read-only or can admin inject messages into parent-teacher chats? | FE-7 design | Read-only — oversight only |

---

## New i18n error codes (for catalog — CLAUDE.md requirement)

These must be added to `audits/backend/i18n-error-codes.md` in the same S7 commits that introduce the endpoints:

| Code | Endpoint | Meaning |
|---|---|---|
| `ADMIN_AUDIT_LOG_INVALID_FILTER` | BE-1 | action/entity not in admin audit allowlist |
| `ADMIN_AUDIT_LOG_FETCH_FAILED` | BE-1 | DB error fetching audit entries |
| `SCHOOL_NOT_FOUND` | BE-2 | school record for req.user.schoolId missing |
| `SCHOOL_UPDATE_FAILED` | BE-2 PATCH | PATCH DB error |
| `TEACHER_NOT_FOUND` | BE-4 | teacher not in admin's school chain |

---

## Notes on out-of-scope items

- **CP-020** (two-direction rating overhaul): admin boundary is SchoolRatings view-only. No work in this loop.
- **CP-022** (parent message routing): No admin work in this loop. Admin's message-to-government is already handled separately.
- **B-003** (data export): Not in S7 — no backend foundation.
- **AG-009** (child transfer UI): Pending Q3 decision above; likely skip for S7.
