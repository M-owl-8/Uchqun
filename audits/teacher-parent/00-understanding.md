# Teacher + Parent Portal — S0: Deep Understanding

**Date:** 2026-05-24
**Prompt:** Loop 5 S0 — teacher+parent combined portal deep understand
**Scope:** `teacher/` directory (contains both teacher and parent UI), all teacher- and parent-reachable backend controllers, CP-020/CP-022 cross-portal items, RE-1 pattern sweep.

---

## 1. Portal Layout and Entry Points

The `teacher/` directory is a **single React application** that serves two roles:

```
teacher/src/
  App.jsx                          — root router; splits role paths
  shared/
    context/
      AuthContext.jsx              — JWT decode, user state, mustChangePassword flag
      ToastContext.jsx             — toast provider (UNSTABLE — see §7)
      NotificationContext.jsx      — polling-based notifications
      SocketContext.jsx            — Socket.io connection
    components/                   — shared UI primitives (ConfirmDialog, Toast, etc.)
    services/api.js               — Axios instance, withCredentials: true
  pages/                          — teacher-role pages
    Dashboard.jsx, Attendance.jsx, Activities.jsx, Meals.jsx, Media.jsx
    MonitoringJournal.jsx, ParentManagement.jsx, Chat.jsx, ChildDetail.jsx
    DailyReflection.jsx, TherapyManagement.jsx, Profile.jsx, Settings.jsx
    Login.jsx (shared login)
  components/                     — teacher-specific components
    AttendanceGrid.jsx, QuickObservation.jsx, ParentJournalComposer.jsx
    ChildRibbon.jsx, Sidebar.jsx, Layout.jsx
  parent/                         — parent-role subtree (completely separate UI)
    context/
      AuthContext.jsx              — parent-role auth (separate from teacher AuthContext)
      ChildContext.jsx             — selected-child state
      NotificationContext.jsx
    pages/
      Dashboard.jsx, Activities.jsx, AIChat.jsx, AIWarnings.jsx, Chat.jsx
      ChildProfile.jsx, Meals.jsx, Media.jsx, Notifications.jsx, Settings.jsx
      TeacherRating.jsx, Therapy.jsx, Help.jsx
    components/                   — parent-specific layout (Sidebar, BottomNav, TopBar)
    ParentApp.jsx                  — parent route tree root
  __tests__/
    pages/                        — Vitest test files
```

**Route split in App.jsx:**
```
/                → <ProtectedRoute requireRole="parent"> → <ParentApp />
/teacher         → <ProtectedRoute requireRole="teacher"> → teacher layout + pages
```

Both paths share the same Axios `api.js` instance (base URL `/api/v1`, `withCredentials: true`).

**Package entry:** `teacher/package.json` — Vite + React, `i18next` with `fallbackLng: 'uz'`.

**Port:** 5174

---

## 2. Surface Map — Teacher

### 2a. Backend routes reachable by teacher JWT

`teacherRoutes.js` middleware stack: `authenticate → requireTeacher` (where `requireTeacher` = `requireRole(['teacher','reception','admin'])`).

Sub-routes with STRICTER middleware:
- Goals: additional `requireRole('teacher')` — reception/admin cannot mutate
- Reflections: additional `requireRole('teacher')`

Child-related routes also reachable by teacher via `childRoutes.js` — same `requireTeacher` gate.

| Endpoint | Controller | Notes |
|---|---|---|
| GET /teacher/dashboard | teacherController | counts |
| GET /teacher/dashboard/counts | teacherController | children, parents, groups counts |
| GET /teacher/children | teacherController | all school children (no teacher-filter — see §5) |
| GET /teacher/children/:id | teacherController | calls `validateChildAccess` — ✓ |
| GET /teacher/parents | teacherController | scoped to teacher's groups + legacy teacherId — ✓ |
| GET /teacher/parents/:id | teacherController | conditional schoolId check — see §6 |
| GET /teacher/profile | teacherController | own profile |
| GET /teacher/groups | teacherController | own groups |
| GET /teacher/messages | teacherController | own sent messages |
| POST /teacher/observations | observationController | validateChildAccess — ✓ |
| GET /teacher/observations/recent | observationController | school-scoped — ✓ |
| GET /teacher/children/:id/observations | observationController | validateChildAccess — ✓ |
| POST /teacher/reflections | reflectionController | teacher-only + `teacherId: req.user.id` — ✓ |
| GET /teacher/reflections | reflectionController | `where: { teacherId: req.user.id }` — ✓ |
| POST /teacher/journal | journalController | validateChildAccess — ✓ |
| GET /teacher/journal/:childId | journalController | validateChildAccess — ✓ |
| GET /teacher/children/:id/goals | goalController | validateChildAccess — ✓ |
| POST /teacher/children/:id/goals | goalController | validateChildAccess — ✓ |
| GET /teacher/goals/:id | goalController | schoolId-only check — **see §6** |
| PATCH /teacher/goals/:id | goalController | schoolId-only check — **see §6** |
| DELETE /teacher/goals/:id | goalController | schoolId-only check — **see §6** |
| POST /teacher/goals/:id/reviews | goalController | schoolId-only check |
| GET /teacher/emotional-monitoring/child/:childId | emotionalMonitoringController | parent + group check — ✓ |
| POST /teacher/emotional-monitoring | emotionalMonitoringController | parent + group check — ✓; admin arm has 3-part bypass |
| GET /activities | activityController | teacher branch: legacy `parent.teacherId` only — **see §6** |
| POST /activities | activityController | childId from body |
| PUT /activities/:id | activityController | schoolId-scoped |
| DELETE /activities/:id | activityController | schoolId-scoped |
| GET /meals | mealController | same gap as activities |
| POST /meals | mealController | |
| PUT /meals/:id | mealController | |
| DELETE /meals/:id | mealController | |
| GET /media | mediaController | same gap as activities |
| POST /media | mediaController | |
| PUT /media/:id | mediaController | |
| DELETE /media/:id | mediaController | |
| POST /attendance | attendanceController | |
| GET /attendance | attendanceController | |
| PATCH /attendance/:id | attendanceController | |
| DELETE /attendance/:id | attendanceController | admin-only |

### 2b. Frontend pages and their API calls

| Page | Key API calls |
|---|---|
| Dashboard | GET /teacher/dashboard/counts, GET /teacher/children |
| Attendance | GET /teacher/children, POST/GET/PATCH /attendance |
| Activities | GET /activities, POST/PUT/DELETE /activities, GET /teacher/parents, GET /teacher/children |
| Meals | GET /meals, POST/PUT/DELETE /meals, GET /teacher/children |
| Media | GET /media, POST/PUT/DELETE /media |
| MonitoringJournal | GET /teacher/emotional-monitoring/child/:id, POST /teacher/emotional-monitoring, GET+POST /teacher/journal/:id |
| ParentManagement | GET /teacher/parents |
| Chat | GET /teacher/parents, socket /chat namespace |
| ChildDetail | GET /teacher/children/:id, GET /teacher/children/:id/goals, GET /teacher/children/:id/observations |
| DailyReflection | POST /teacher/observations, POST /teacher/reflections, GET /teacher/reflections |
| TherapyManagement | GET+POST+PUT+DELETE /therapies (therapy routes) |
| Settings | GET /teacher/profile, PUT /teacher/profile, GET /government/messages (MessagesModal) |

**CP-023 status:** `mustChangePassword` is checked in `AuthContext.jsx` but Login.jsx does **not** currently redirect to a `/teacher/change-password` page — this is a known gap listed in LOOP_CROSS_PORTAL.md as work that lands in Teacher loop S-early.

---

## 3. Surface Map — Parent

### 3a. Backend routes reachable by parent JWT

`parentRoutes.js` middleware: each route individually applies `authenticate, requireParent`.

Exception: `GET /parent/:parentId/data` uses `requireAdminOrReception` — not parent-reachable.

| Endpoint | Controller | Ownership pattern |
|---|---|---|
| GET /parent/children | parentChildController | `where: { parentId: req.user.id }` — ✓ |
| GET /parent/profile | parentProfileController | `findByPk(req.user.id)` — ✓ |
| GET /parent/activities | parentActivityController | `req.user.id` as authority; childId validated against own children — ✓ |
| GET /parent/meals | parentMealController | same as activities — ✓ |
| GET /parent/media | parentMediaController | groupId boundary; childId NOT validated against own children — **see §6** |
| GET /parent/messages | parentMessageController | `where: { senderId: req.user.id }` — ✓ |
| POST /government/messages | governmentMessageController | unrestricted sender role — CP-022 will restrict to parent |
| POST /parent/ratings | parentTeacherRatingController | `parentId: req.user.id` + `teacherId: parent.teacherId` — ✓ |
| GET /parent/ratings | parentTeacherRatingController | own ratings — ✓ |
| POST /parent/school-rating | parentSchoolRatingController | 3-part schoolId bypass — **see §6** |
| GET /parent/school-rating | parentSchoolRatingController | childId validated against own children — ✓ |
| GET /parent/me/export | parentDataExportController | `req.user.id` — ✓ |
| GET /parent/children/:id/journal | journalController | `where: { id, parentId: req.user.id }` + `isVisibleToParent: true` — ✓ |
| GET /parent/children/:id/emotional-monitoring | emotionalMonitoringController | `child.parentId !== req.user.id` check — ✓ (group check absent — **see §6**) |
| POST /ai/chat | parentAIController | own children via `req.user.id` — ✓ |
| GET /parent/ai-warnings | (AI warnings controller) | `where: { parentId: req.user.id }` — ✓ |

### 3b. Frontend pages and their API calls

| Page | Key API calls | Notes |
|---|---|---|
| Dashboard | GET /parent/children, stats | ChildContext provides selected child |
| Activities | GET /parent/activities | filtered by selected child |
| AIChat | POST /ai/chat | chat history client-provided, sanitized server-side |
| AIWarnings | GET /parent/ai-warnings | |
| Chat | socket + GET /chat/:id/messages | real-time teacher↔parent |
| ChildProfile | GET /parent/children/:id, GET /parent/children/:id/journal | journal gated by isVisibleToParent |
| Meals | GET /parent/meals | |
| Media | GET /parent/media | |
| Notifications | GET /parent/notifications or polling | |
| Settings | GET /parent/profile, PUT /parent/profile, GET /parent/messages | MessagesModal is display-only |
| TeacherRating | POST+GET /parent/ratings | 5-star, existing single-direction |
| Therapy | GET /therapies (parent branch) | |

**MessagesModal (parent):** `teacher/src/parent/pages/childProfile/MessagesModal.jsx` — **display-only**. Renders received messages and government replies. No send form in this file.

**MessageModal (teacher settings):** `teacher/src/pages/settings/MessagesModal.jsx` — **display-only** for teacher-sent messages. Neither modal has a compose form visible in source — the send form must be in `MessageModal.jsx` (separate singular name). Confirmed: CP-022 current state is display-only (no routing, no escalation).

---

## 4. Surface Map — Seam (Teacher ↔ Parent Interactions)

The seam is where teacher and parent data flows intersect. These are the shared resources and the crossing points:

| Interaction | Direction | Mechanism | Current state |
|---|---|---|---|
| **Chat** | Teacher ↔ Parent | Socket.io + REST messages | Functional. Real-time per `parentId`. |
| **Journal** | Teacher → Parent | Teacher writes via `POST /teacher/journal`; parent reads via `GET /parent/children/:id/journal` | `isVisibleToParent` flag gates parent read. TeacherId UUID never returned to parent. |
| **Journal visibility flag** | Teacher sets | `isVisibleToParent` boolean on `POST /teacher/journal` | Parent can only read entries where this is `true`. |
| **Emotional monitoring** | Teacher creates | `POST /teacher/emotional-monitoring` | Parent reads via `GET /parent/children/:id/emotional-monitoring`. Parent cannot write EM entries. |
| **Teacher rating** | Parent → Teacher | `POST /parent/ratings` | One-directional. No teacher-view of own ratings currently. |
| **School rating** | Parent → School | `POST /parent/school-rating` | CP-020: restructure to 5 indicators + mandatory comment + government-direction rating. Currently: JSONB `evaluation`, nullable `comment`. |
| **Government message** | Parent → Government | `POST /government/messages` | No routing today (all land in same inbox). CP-022: add `recipientLevel` (owner/region/republic) + `escalatedFromId` chain. |
| **Media** | Teacher uploads | `POST /media` | Parent reads via group boundary (`GET /parent/media`). Group-wide visibility — C-02 design decision (documented in PRIVACY_POSTURE.md). |
| **Activities / Meals** | Teacher logs | `POST /activities`, `POST /meals` | Parent reads own children's activities/meals. |
| **Goals** | Teacher sets | `POST /teacher/children/:id/goals` | Parent cannot read goals directly (no parent endpoint). Review history on goals. |
| **Attendance** | Teacher marks | `POST /attendance` | Parent view of attendance — not confirmed via a parent-side endpoint in current audit. |
| **CP-023 forced change** | Backend gate | `mustChangePassword: true` → 403 on all endpoints except password-change + logout | Teacher portal frontend does NOT yet redirect to change-password page (known gap, CP-023 pending). |

---

## 5. Two-Axis Isolation Picture

School-scope alone is NOT the full isolation story here. Teachers and parents have an additional ownership axis that must hold independently.

### Axis 1 — School scope (`users.schoolId`)

Every resource must belong to the authenticated user's school. Enforced via:
- `requireSchoolScope` middleware (async, checks `schools.isActive`)
- Controller-level `where: { schoolId: req.user.schoolId }` on queries

Failure mode: the **three-part null-bypass** `if (X.schoolId && X.schoolId !== req.user.schoolId)` — when `X.schoolId` is null (or when `req.user.schoolId` is null), the check is skipped.

### Axis 2 — Ownership / Assignment

**Parent side — parentId ownership:**
- Parent can only see their own children: `where: { parentId: req.user.id }` (authoritative)
- Parent's JWT `id` = parentId. Never accepted from request body or params.
- Child resources (activities, meals, media) scoped first to parent's children, then by school
- Key utility: `getParentGroupId(req.user.id)` — provides groupId for the legacy code path

**Teacher side — assigned-children scope:**

Two assignment paths exist (legacy + modern). Controllers that handle both correctly are marked ✓; those that only handle one are marked as gaps.

| Assignment path | How it works | Controllers that check BOTH | Controllers with gap (legacy only) |
|---|---|---|---|
| **Modern** | `groups.teacherId` → children in teacher's group | `teacherController.getParents` ✓, `emotionalMonitoringController.createOrUpdate` ✓ | `activityController`, `mealController`, `mediaController` — teacher branch queries `parent.teacherId` only |
| **Legacy** | `users.teacherId` on parent record | same | same |

**The combined picture:**

```
                        ┌───────────────────────────────────┐
                        │            SCHOOL SCOPE           │
                        │  (schoolId must match every query) │
                        │                                    │
   ┌────────────────────┴────────────────────────────────────┴─────────────────┐
   │  PARENT SIDE                         │  TEACHER SIDE                      │
   │                                      │                                     │
   │  parentId = req.user.id              │  assignment = group.teacherId       │
   │  (authoritative, from JWT)           │  OR parent.teacherId (legacy)       │
   │                                      │                                     │
   │  Child access: parentId FK on Child  │  Child access: via group OR legacy  │
   │  Resource access: via own children   │  Resource access: school + assigned │
   └──────────────────────────────────────┴─────────────────────────────────────┘
```

Both axes must hold simultaneously. A teacher from school A must not:
1. Read a child from school B (school-scope breach)
2. Read a child from school A that isn't in their group (assignment-scope breach)

A parent must not:
1. Read a child from another school (school-scope breach, but parents are scoped by `parentId` which already implies single-school ownership)
2. Read another parent's child (parentId-scope breach — the riskier failure mode)

---

## 6. Null-Bypass Sweep (Teacher + Parent Reachable Code)

Searched: all controllers reachable by teacher or parent JWTs for the three-part null-bypass pattern `if (X.schoolId && X.schoolId !== ...)`.

### 6a. Three-part patterns confirmed NOT bypasses for teacher/parent

| File | Pattern | Why not a bypass |
|---|---|---|
| `emotionalMonitoringController.js:88` | `role==='admin' && req.user.schoolId && child.schoolId !== ...` | First condition `role==='admin'` is `false` for teacher/parent — they take line 95 path (explicit parent/teacher check) |
| `aiWarningController.js:270,313` | `req.user.schoolId && warning.schoolId && ...` | `requireRole('admin','government')` gate — not teacher/parent reachable |
| `newsController.js:140,177` | `newsItem.schoolId && req.user.schoolId && ...` | Mutations require `requireRole('admin')` — not reachable |
| `teacherResourceController.js:125` | `role==='admin' && req.user.schoolId && ...` | `role==='admin'` first condition blocks teacher/parent |

### 6b. Findings that ARE in teacher/parent-reachable code

**Finding TP-01 — `goalController.js` — schoolId-only guard on mutations**

`GET /teacher/goals/:id`, `PATCH /teacher/goals/:id`, `DELETE /teacher/goals/:id` all guard with:
```js
Goal.findOne({ where: { id, schoolId: req.user.schoolId } })
```
No `validateChildAccess` called. This means Teacher A can read/update/delete Teacher B's student's goal — as long as both are in the same school. Cross-teacher IDOR within the same school.

Severity: **Medium** — requires two teachers in the same school. Common in practice.

**Finding TP-02 — `teacherController.getParentById` — conditional schoolId**

```js
const where = { id: parentId, role: 'parent' };
if (req.user.schoolId) {
  where.schoolId = req.user.schoolId;
}
```
Three-part bypass: if `req.user.schoolId` is null (shouldn't happen for teacher role, but no hard guarantee), school boundary skipped. Additionally, this endpoint doesn't verify teacher→parent relationship — any teacher can look up any parent in their school.

Severity: **Low** (schoolId is always set for teacher role) / **Medium** (cross-teacher parent visibility within school)

**Finding TP-03 — `activityController`, `mealController`, `mediaController` — legacy-only teacher scope**

Teacher branch queries assigned parents via:
```js
User.findAll({ where: { teacherId: req.user.id } })  // legacy parent.teacherId only
```
Group-assigned children are invisible to the teacher through this path. Teacher sees fewer activities/meals/media than they should if assignment is via group (modern path).

Severity: **Data availability gap** (not a security issue — under-permissive) but inconsistent with `teacherController.getParents` which handles both paths correctly.

**Finding TP-04 — `parentMediaController.getMyMedia` — missing childId ownership validation**

Unlike `getMyActivities` and `getMyMeals` which validate childId against own children:
```js
if (childId && !myChildIds.includes(childId)) return 403;
```
`getMyMedia` does NOT check childId ownership. It relies on groupId boundary (C-02 design decision — group-wide visibility). A parent can filter media by any childId and receive results bounded only by group membership.

Severity: **Low** (bounded by group; C-02 design decision accepted) — but inconsistent with activities/meals pattern.

**Finding TP-05 — `parentSchoolRatingController.rateSchool` — three-part schoolId bypass**

```js
if (req.user.schoolId && req.user.schoolId !== finalSchoolId) {
  return res.status(403).json({ error: 'You can only rate your own school' });
}
```
If `req.user.schoolId` is null (unlikely for parent role, but possible if parent record has null schoolId), the check is skipped and the parent can rate any school.

Severity: **Low** (parent null-schoolId is rare) — but follows the exact same defect class as RE-10 through RE-14 in Reception.

### 6c. Sweep verdict

**No new critical IDOR paths** for teacher/parent. The two most significant issues:
- TP-01: Cross-teacher goal mutation within same school (no `validateChildAccess` on goal mutations)
- TP-03: Group-assigned children invisible to teacher in activities/meals/media list endpoints

These are documented for S2 planning. No emergency fixes required before S1.

---

## 7. RE-1 Pattern — Toast-in-useEffect-deps (Teacher Portal)

### 7a. ToastContext instability (confirmed)

`teacher/src/shared/context/ToastContext.jsx`:

```js
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info') => { ... };  // plain arrow — new ref every render
  const removeToast = (id) => { ... };                   // plain arrow — new ref every render

  const success = (message) => addToast(message, 'success');  // new ref every render
  const error   = (message) => addToast(message, 'error');    // new ref every render
  const warning = (message) => addToast(message, 'warning');  // new ref every render
  const info    = (message) => addToast(message, 'info');     // new ref every render

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
```

None of these functions are wrapped in `useCallback`. Every `ToastProvider` render creates new function references. The context value object is also recreated every render.

### 7b. Pages with toast functions in useCallback deps

When a page destructures `showError` (i.e., `error`) from `useToast()` and includes it in a `useCallback` dependency array, that callback is recreated every render → any `useEffect([callback])` that depends on it runs on every render.

| File | Affected callback | Dep array |
|---|---|---|
| `pages/Activities.jsx:91` | `getParentsList` callback | `[getParentsList, loadChildrenForParent, showError, t]` |
| `pages/Activities.jsx:109` | `loadActivities` callback | `[showError, t]` |
| `pages/Chat.jsx:58` | `loadParents` effect | `[user?.id, toastError, t]` |
| `pages/Meals.jsx:86` | `loadData` callback | `[showError]` |
| `pages/Meals.jsx:104` | `loadMeals` callback | `[showError, t]` |

### 7c. Bonus: Attendance toast bug

`pages/Attendance.jsx:23`:
```js
const { toast } = useToast() || {};
```
`useToast()` returns `{ toasts, addToast, removeToast, success, error, warning, info }`. There is no `toast` property. `toast` is always `undefined`. The calls `toast?.({ type: 'success', message: '...' })` silently no-op — the Attendance page's save/error toasts do nothing.

This is a silent regression — attendance marks are saved but the user never sees confirmation.

### 7d. S1 fix required

Same fix as Reception RE-1: wrap `addToast`, `removeToast`, `success`, `error`, `warning`, `info` in `useCallback` with stable deps:

```js
const addToast = useCallback((message, type = 'info') => {
  const id = Date.now() + Math.random();
  setToasts(prev => [...prev, { id, message, type }]);
  return id;
}, []);

const removeToast = useCallback((id) => {
  setToasts(prev => prev.filter(t => t.id !== id));
}, []);

const success = useCallback((m) => addToast(m, 'success'), [addToast]);
const error   = useCallback((m) => addToast(m, 'error'),   [addToast]);
const warning = useCallback((m) => addToast(m, 'warning'), [addToast]);
const info    = useCallback((m) => addToast(m, 'info'),    [addToast]);
```

**Parent-subtree note:** The parent subtree imports from `../../shared/context/ToastContext` (same file). Fix once — both portals benefit.

---

## 8. CP-020 and CP-022 Current State

### CP-020 — Two-direction school rating system

**Status: PLANNED-NOT-BUILT**

**What exists today:**
- `SchoolRating` model: `schoolId`, `parentId`, `stars`, `numericRating`, `evaluation` (JSONB, old structure), `comment` (nullable — MUST be tightened)
- `POST /parent/school-rating` exists: parent submits rating, one-per-parent-per-school upsert
- `GET /government/ratings` and `GET /government/ratings/:schoolId` exist: return parent-only aggregates
- `shared/config/ratingIndicators.js` exists: 5 placeholder indicators per direction
- No `GovernmentSchoolRating` model — government-direction ratings are entirely new

**What Teacher loop (Loop 5) must build:**
- Parent rating form: 5 indicator sliders (`PARENT_INDICATORS` from config) + mandatory comment textarea
- Form replaces/extends the existing single-star `POST /parent/school-rating` call
- Comment: currently nullable, will become required when backend tightens (CP-020 backend work)
- **Note:** The backend must be updated first (or simultaneously) to accept the indicator structure. Coordinate with backend loop if running concurrently.

**Blockers for CP-020:**
- CP-021 (region model) — required for region-aware aggregation; do NOT implement aggregation until CP-021 lands
- PL-015 (partner to provide real indicator names) — placeholder names must not go to beta users

**Where it lives in teacher portal:** `teacher/src/parent/pages/TeacherRating.jsx` — currently a 5-star rating for teacher. School rating is a separate flow. Likely needs new page or modal in parent portal (Settings or ChildProfile area).

### CP-022 — Parent message routing and escalation

**Status: PLANNED-NOT-BUILT**

**What exists today:**
- `GovernmentMessage` model: `senderId`, `subject`, `message`, `isRead`, `readAt`, `reply`, `repliedAt`, `parentMessageId`
- `POST /government/messages` — accepts from ANY authenticated user, no routing, all land in single government inbox
- Parent reads sent messages: `GET /parent/messages` → `parentMessageController.getMyMessages` (`where: { senderId: req.user.id }`)
- Teacher settings MessagesModal: display-only view of teacher's own sent messages + government replies
- Parent MessagesModal: display-only view of parent's own sent messages + government replies
- **No `recipientLevel` field. No `escalatedFromId` field. No routing logic.**

**What Teacher loop (Loop 5) must build:**
1. Audit `MessagesModal.jsx` (parent) and the send form (`MessageModal.jsx` or wherever the compose form lives) — confirm end-to-end send+receive works before layering CP-022 on top
2. Add `recipientLevel` selector to parent compose form (owner / region / republic) with explanatory copy
3. Add optional escalation link ("Escalate from prior message" with `escalatedFromId`)
4. Show level badge on sent message history
5. Backend must land `recipientLevel` + `escalatedFromId` + routing logic (via CP-021 region model) first

**Blockers for CP-022:**
- CP-021 (region model) — required for `region`-level routing
- Backend CP-022 work must land before the frontend UI is wired up

**Current risk:** The parent compose form's exact location is not confirmed in this audit — `MessageModal.jsx` (singular) was not read. This must be the first thing confirmed in S1.

---

## 9. Handoff Notes for S1

### Mandatory first items (front-load before any test writing)

**1. Null-bypass sweep — re-run for ALL teacher+parent-reachable routes.**

This audit covers the most important controllers, but a complete sweep needs to confirm:
- All controllers in `backend/controllers/parent/`
- `backend/controllers/emotionalMonitoringController.js` full read (teacher+parent paths)
- `backend/controllers/goalController.js` full read (TP-01 above)
- `backend/controllers/teacherController.js` full read (TP-02 above)

The two confirmed issues (TP-01, TP-03) should be fixed in S2 alongside behavioral isolation tests.

**2. RE-1 fix (ToastContext) — do this first in S1.**

The instability affects Activities, Chat, Meals, and Attendance (which has a broken toast entirely). Fix `teacher/src/shared/context/ToastContext.jsx` with `useCallback` wrapping before writing any tests that assert on toast behavior — otherwise stale-closure bugs will confuse test outcomes.

**3. Map the full reachable surface — including `childRoutes.js`, `chatRoutes.js`, `therapyRoutes.js`.**

This audit covers `teacherRoutes.js` and `parentRoutes.js`. Confirm what additional routes a teacher JWT can reach (same pattern as Reception S4-NEW-01 discovery).

**4. Confirm CP-022 compose form location.**

Read `teacher/src/parent/pages/childProfile/MessageModal.jsx` (singular) to confirm the send form, then verify the full send→receive flow end-to-end before building CP-022 on top.

**5. CP-023 forced-change redirect.**

Teacher portal does not currently redirect to a change-password page when `mustChangePassword=true`. This must be added in S1 (same pattern as Government Sprint E1). Check `teacher/src/shared/context/AuthContext.jsx` line that reads `mustChangePassword` and where `AppRoutes` is defined.

### Standard to carry forward

**Behavioral isolation tests** (set in Reception S6/S7): any new mutation endpoint that accepts a resource ID must have:
1. A mock-based revert-test (proves null-handling at 404)
2. A behavioral isolation test with seeded two-school SQLite data (proves the WHERE clause filters at DB level)

For teacher endpoints: the second axis (teacher→child assignment) must also be tested — not just school scope.

### Finding inventory for S2 planning

| ID | Finding | Severity | Action |
|---|---|---|---|
| TP-01 | `goalController` — GET/PATCH/DELETE guard schoolId only, no `validateChildAccess` | Medium | Add validateChildAccess or equivalent; add revert-test |
| TP-02 | `teacherController.getParentById` — conditional schoolId; no teacher→parent relationship check | Low | Tighten to mandatory schoolId; add relationship check |
| TP-03 | `activityController`, `mealController`, `mediaController` — teacher branch legacy-only | Data gap | Mirror `teacherController.getParents` dual-path pattern |
| TP-04 | `parentMediaController` — missing childId ownership validation | Low | Add `myChildIds.includes(childId)` check, consistent with activities/meals |
| TP-05 | `parentSchoolRatingController.rateSchool` — three-part schoolId bypass | Low | Fix to two-part form |
| RE-1 | ToastContext — no `useCallback` on toast functions | Performance/correctness | Wrap in useCallback; fix Attendance `toast` → `success`/`error` |
| CP-023 | Teacher portal missing `mustChangePassword` redirect | UX/security | Add redirect in App.jsx/AppRoutes; ChangePassword page |

---

## Test counts at S0 baseline

| Suite | Count |
|---|---|
| Backend (full) | 117 suites / 1243 tests |
| Teacher frontend (existing) | See `teacher/src/__tests__/pages/` — partial coverage (Activities, AIWarnings, ChildProfile, Help, Media, Settings, TherapyManagement, parentSidebar, SidebarPolling) |
| Parent frontend | No separate test suite — parent pages live in same `__tests__/pages/` directory |

The test file list from Glob confirms: `Activities.test.jsx`, `AIWarnings.test.jsx`, `ChildProfile.test.jsx`, `Help.test.jsx`, `Media.test.jsx`, `parentSidebar.test.jsx`, `Settings.test.jsx`, `SidebarPolling.test.jsx`, `TherapyManagement.test.jsx`. No tests for: Dashboard, Attendance, Meals, Chat, MonitoringJournal, ParentManagement, DailyReflection, ChildDetail.

S1 audit scope should identify which of these have functional gaps requiring tests, then S2 writes them.
