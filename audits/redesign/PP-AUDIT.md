# PP-AUDIT — Parent Portal Full Audit

**Status:** 🟡 In progress (pending user verification)
**Type:** Audit only — NO code changes, NO fixes.
**Inputs read:** every route mounted under the parent `ProtectedRoute` in `teacher/src/App.jsx`, every page under `teacher/src/parent/pages/`, the backend controllers behind every parent-facing endpoint, the shared infrastructure (auth, api, locales, date utils), and the existing TP-* audits cited inline.
**Scope:** Parts A (function inventory) + B (cross-portal data-contract trace) + C (inherited platform-bug check) + D (prioritized PP-* backlog).
**Out of scope:** design changes, code fixes, test additions. Each item in Part D becomes its own future session.

The parent portal is not a standalone app — it is embedded in the teacher React app under `teacher/src/parent/` and mounted at the root path when the authenticated user's role is `parent`.

---

## Part A — Function inventory

### A.1 Parent routing block

`teacher/src/App.jsx:92-121` is the canonical mount point.

```jsx
// Forced-change password route (parent must change on first login):
<Route
  path="/change-password"
  element={
    <ProtectedRoute requireRole="parent" allowMustChange>
      <ParentChangePassword />
    </ProtectedRoute>
  }
/>

// Main parent shell — all 13 logical pages live under this:
<Route
  path="/"
  element={
    <ProtectedRoute requireRole="parent">
      <ParentApp />
    </ProtectedRoute>
  }
>
  <Route index element={<ErrorBoundary><ParentDashboard /></ErrorBoundary>} />
  <Route path="child"         element={<ErrorBoundary><ChildProfile /></ErrorBoundary>} />
  <Route path="activities"    element={<ErrorBoundary><ParentActivities /></ErrorBoundary>} />
  <Route path="meals"         element={<ErrorBoundary><ParentMeals /></ErrorBoundary>} />
  <Route path="media"         element={<ErrorBoundary><ParentMedia /></ErrorBoundary>} />
  <Route path="chat"          element={<ErrorBoundary><ParentChat /></ErrorBoundary>} />
  <Route path="notifications" element={<ErrorBoundary><Notifications /></ErrorBoundary>} />
  <Route path="help"          element={<ErrorBoundary><Help /></ErrorBoundary>} />
  <Route path="rating"        element={<ErrorBoundary><TeacherRating /></ErrorBoundary>} />
  <Route path="settings"      element={<ErrorBoundary><ParentSettings /></ErrorBoundary>} />
  <Route path="therapy"       element={<ErrorBoundary><Therapy /></ErrorBoundary>} />
  <Route path="irr"           element={<ErrorBoundary><ChildIRR /></ErrorBoundary>} />
</Route>
```

A 14th page exists in the codebase — `teacher/src/parent/pages/AIWarnings.jsx` — but it has **no `<Route>` mounted in App.jsx**. It is orphaned (see Flags below).

### A.2 Route → page → endpoints table

| # | Path | Page file:line | Purpose (parent POV) | Endpoint(s) called | Data shown | Flag |
|---|---|---|---|---|---|---|
| 1 | `/` | `Dashboard.jsx:18` | Today's at-a-glance: activity/meal/media counts, emotional state %, teacher rating average | `GET /activities?limit=5&childId={id}` (32), `GET /meals?limit=5&childId={id}` (33), `GET /media?limit=5&childId={id}` (34), `GET /parent/ratings` (37), `GET /parent/emotional-monitoring/child/{id}?limit=1` (38) | Quick-link cards (Faoliyat, Ovqat, Rasm, Hissiy holat %, Baholash avg+count) + IRR/Foydali/Yordam nav links + `DayCard` for today | OK |
| 2 | `/child` | `ChildProfile.jsx:19` | Child profile: basic info, special needs, monitoring records, weekly stats, assigned teacher | `GET /child/{id}` (97), `GET /parent/profile` (98), `GET /parent/emotional-monitoring/child/{id}` (99), `GET /parent/messages` (75), `GET /activities?childId=` (145), `GET /meals?childId=` (146), `GET /media?childId=` (147) | Name, DOB, diagnosis, teacher, special needs text, monitoring records list, weekly counts | OK |
| 3 | `/activities` | `Activities.jsx:17` | Browse individual reja (activity plans) | `GET /activities?childId={id}` (41) | Activity cards: skill, goal, dates, teacher, services; details modal with goal/tasks/methods/progress/observation | OK |
| 4 | `/meals` | `Meals.jsx:21` | View child's meals by date with nutrition summary | `GET /meals?childId={id}` (85) | Meal name, type (Breakfast/Lunch/Snack/Dinner), time, description, quantity, eaten status; daily summary (total, eaten, skipped, quality) | TODO color-palette decision (104) |
| 5 | `/media` | `Media.jsx:447` | Photo/video gallery with filter + lightbox | `GET /media?childId={id}` (478) | Media grid (type badge, date), lightbox with proxy-URL conversion for Appwrite | **Calls `/media` (global), not `/parent/media`** — see Part B.4 |
| 6 | `/chat` | `Chat.jsx:10` | Send/receive messages with teacher; edit/delete own | `chatStore.loadMessages()` (34), `addMessage('parent', ..., conversationId)` (73), `updateMessage()` (93), `deleteMessage()` (113), `markRead()` (38) — abstracted | Messages sorted by createdAt, role badges, edit/delete on own | Endpoints hidden behind `chatStore` (see B.1) |
| 7 | `/notifications` | `Notifications.jsx:18` | Mark-read / delete activity/meal/media notifications | `useNotification()` hook: `loadAllNotifications()`, `markAsRead()`, `markAllAsRead()`, `deleteNotification()` | Notification list (type icon, title, message, child name, timestamp), filter tabs (all/unread/read) | OK |
| 8 | `/help` | `Help.jsx:6` | FAQ + contact info | **None — static UI** | Email, phone, 4 FAQ Q/As, deep links to Activities/Media/Meals/Settings | Static; contact info baked into i18n keys |
| 9 | `/rating` | `TeacherRating.jsx:16` | Rate teacher (stars + comment); rate school (5 indicators + comment) | `GET /parent/profile` (57), `GET /parent/ratings` (58), `GET /parent/school-rating?childId={id}` (64), `POST /parent/ratings` (129), `PUT /parent/school-rating` (186) | Teacher row (name/email/phone, stars), parent's own rating, summary avg+count, school section with 5 sliders | **PL-015 GATE** — line 1-3 comment: indicators are placeholders, do not ship to beta until partner data lands |
| 10 | `/settings` | `Settings.jsx:20` | Profile (name, phone), notification prefs, change password, logout | `PUT /user/profile` (66), `PUT /user/password` (98), `logout()` via `useAuth` | First/last name, phone, email (read-only), notification toggles, avatar, password form, **logout button** | OK |
| 11 | `/therapy` | `Therapy.jsx:19` | Browse therapeutic content; start/end sessions | `GET /therapy?isActive=true&therapyType={f}` (38), `POST /therapy/{id}/start` (54), `PUT /therapy/usage/{sid}/end` (66) | Therapy cards with title/description/type/duration/rating/tags; active-session banner | All therapies fetched once → client-side search/filter (no scaling concern at current volumes) |
| 12 | `/irr` | `ChildIRR.jsx:39` | View child's IRR/IEP: assessment sessions, long-term & short-term goals, recommendations | `GET /parent/children/{id}/irr` (59), `GET /parent/children/{id}/irr/assessment` (69), `GET /parent/children/{id}/irr/goals` (70) | Latest session score+max, progress %, session progression rows, LTGs by skill area, periods with STGs, review/recommendations | **Hardcoded Uzbek-Cyrillic `SESSION_LABELS` (12-17)** — bypasses i18n |
| 13 | `/change-password` | `ChangePassword.jsx:8` | Forced change on first login (`mustChangePassword`) | `PUT /user/password` (39) | Current/new/confirm fields with strength validation | OK; intentional deep-link only |
| — | (orphan) | `AIWarnings.jsx` | (Inferred: AI warnings dashboard) — but **not routed** in App.jsx | — | — | **Orphan page** — file exists, no `<Route>` mounts it. Plus dead-code role check at line 182: `user?.role !== 'parent' && <button …>` always false (page is parent-only). Likely copy-pasted from teacher portal. |

### A.3 Dashboard card → endpoint map

The Dashboard "BUGUNGI XULOSA / UMUMIY KO'RINISH" cards are populated as follows:

| Card | Number shown | Source endpoint | Source line |
|---|---|---|---|
| Individual reja (Faoliyat) | `stats.activities` | `GET /activities?limit=5&childId={id}` | `Dashboard.jsx:32 → 53` |
| Ovqatlar (Ovqat) | `stats.meals` | `GET /meals?limit=5&childId={id}` | `Dashboard.jsx:33 → 54` |
| Media (Rasm) | `stats.media` | `GET /media?limit=5&childId={id}` | `Dashboard.jsx:34 → 55` |
| Hissiy holat (%) | `stats.childStatusScore` | `GET /parent/emotional-monitoring/child/{id}?limit=1` | `Dashboard.jsx:38 → 48-50` (computed: checked/total × 100) |
| Baholash (avg + count) | `stats.teacherRating` | `GET /parent/ratings` | `Dashboard.jsx:37 → 44, 56-57` |
| ИРР — Ривожланиш режаси | (nav link only, no number) | — | `Dashboard.jsx` (no fetch) |
| Foydali materiallar | (nav link only) | — | (no fetch) |
| Yordam | (nav link only) | — | (no fetch) |

### A.4 Nav discoverability

Three navigation surfaces exist: `MobileTabBar.jsx`, `DesktopTopNav.jsx`, `Sidebar.jsx` (legacy — Part A reads suggest both DesktopTopNav and Sidebar exist).

| Route | MobileTabBar | DesktopTopNav | Sidebar | Verdict |
|---|---|---|---|---|
| `/` (Bugun) | ✅ | ✅ | — | fully discoverable |
| `/activities` (Kundalik) | ✅ | ✅ | ✅ | fully discoverable |
| `/chat` (Xabarlar) | ✅ | ✅ | ✅ | fully discoverable |
| `/child` (Profil) | ✅ | ✅ | ✅ | fully discoverable |
| `/meals` (Taomlar) | ❌ | ✅ | ✅ | desktop-only — **mobile users can't reach meals from tab bar** |
| `/media` (Galereya) | ❌ | ✅ | ✅ | desktop-only — same gap |
| `/therapy` (Terapiya) | ❌ | ✅ | ✅ | desktop-only |
| `/help` (Yordam) | ❌ | ✅ | ❌ | desktop top-nav only |
| `/notifications` | ❌ | ✅ (bell w/ badge, top-right) | ✅ | desktop top-right; **mobile gap** |
| `/settings` | ❌ | ✅ (gear, top-right) | ✅ | desktop top-right; **mobile gap (logout lives here)** |
| `/rating` | ❌ | ❌ | ✅ | **sidebar only — invisible on mobile and on desktop top-nav** |
| `/irr` | ❌ | ❌ | ✅ | **sidebar only — same** |
| `/change-password` | ❌ | ❌ | ❌ | deep-link only (intentional — forced flow) |

### A.5 Flags (placeholders, orphans, dead code)

1. **Orphan page `AIWarnings.jsx`** — no `<Route>` in App.jsx; cannot be reached. Plus dead-code role check at line 182: `user?.role !== 'parent'` is always false for parent-only context. Likely copy-paste from teacher portal.
2. **`TeacherRating.jsx:1-3` PL-015 gate** — indicators are placeholders from `shared/config/ratingIndicators.js`; partner has not delivered real indicator names. Already tracked as `PL-015` in `LOOP_PRE_LAUNCH_CHECKLIST.md` (blocking pre-launch item).
3. **`ChildIRR.jsx:12-17` hardcoded Uzbek-Cyrillic `SESSION_LABELS`** — bypasses i18n entirely. Parent on `en`/`ru` still sees Cyrillic.
4. **`Meals.jsx:43-71` custom date formatter with hardcoded UZ month arrays** — does not use shared util, ignores `i18n.language`.
5. **`Help.jsx` is fully static** — contact info baked into i18n keys, no admin/government surface to update it.
6. **`Chat.jsx` endpoints hidden behind `chatStore`** — see Part B.1 for the underlying contract.
7. **`Media.jsx:478` uses `/media`, not `/parent/media`** — see Part B.4.
8. **`Settings.jsx:98` + `ChangePassword.jsx:39` both `PUT /user/password`** — duplicate logic; fine while both call the same controller, but a risk if validation diverges.
9. **`ChildProfile.jsx:99` fetches monitoring records → passed to `EmotionalMonitoringSection` (line 298)** — confirm component renders them; if not, this is a silent orphan fetch.
10. **`Media.jsx:564-567, 582-585` debug code left in** — `const _proxyUrl = getProxyUrl(...)` assigned and unused. Minor.

---

## Part B — Cross-portal data integrity

Each surface trace shows: parent fetch → backend route → backend controller → source surface (teacher/admin) → verdict.

### B.1 Chat (Xabarlar) — ✅ CONFIRMED

- **Parent:** `teacher/src/parent/pages/Chat.jsx:34` calls `loadMessages(conversationId)` via `teacher/src/parent/shared/services/chatStore.js`, which calls `api.get('/chat/messages?conversationId=parent:{userId}&limit=200')`.
- **Backend route:** `backend/routes/chatRoutes.js:24` → `GET /chat/messages`.
- **Backend controller:** `backend/controllers/chatController.js:48-70`. Enforces `canAccessConversation(req, conversationId)` at line 55. For role=parent: requires `conversationId === buildConversationId(req.user.id)` (line 12) — i.e. `parent:<own uuid>`.
- **Source (teacher):** `teacher/src/pages/Chat.jsx` writes via the same `POST /chat/messages` (`chatController.js:73`) using the same conversationId format.
- **Verdict:** CONFIRMED. Single conversation model, both sides read/write the same shape. `senderRole` (`parent`/`teacher`) distinguishes origin. No `teacherId` field leaks to parent. This is the TP-CHAT-MESSENGER contract holding on the parent side too.

### B.2 Kundalik / daily journal — ✅ CONFIRMED (caveat)

- **Parent fetch:** No dedicated journal page in parent route table. Journal fetch path is `GET /parent/children/:id/journal` (defined in `backend/routes/parentRoutes.js`), invoked from inside child-profile / activities — Part A did not find a direct `journal` fetch on the parent side; **the user-facing render path needs confirmation in a follow-up**, but the contract on the backend side is well-defined.
- **Backend controller:** `backend/controllers/journalController.js:93-122` `getChildJournal()`. Scopes via `Child.findOne({ id, parentId: req.user.id })` (95-97); filters `isVisibleToParent: true` (103); response shape `{ id, date, content, teacherFirstName, teacherLastName }` (109-115) — **does not expose `teacherId`**.
- **Source (teacher):** `journalController.js:9-67` `create()` with `isVisibleToParent` boolean (line 45).
- **Verdict:** CONFIRMED on the contract; the parent-side render surface is thin/possibly absent — flagging as `PP-JOURNAL-SURFACE` in Part D for verification.

### B.3 Attendance / Davomat — ❌ BROKEN (missing surface)

- **Parent fetch:** **None.** Independent corroboration: `grep -rn 'attendance\|davomat\|Davomat' teacher/src/parent` returns zero matches.
- **Backend:** `backend/routes/attendanceRoutes.js:9-12` `GET /attendance/` gates on `requireTeacher`. **No `/parent/attendance/*` route exists.**
- **Backend model:** `ChildAttendance` with the TP-DAVOMAT-REWORK statuses (`present`, `home_leave`, `sick`, `hospitalized`, `absent`) is in place and being written by teacher, but there is no parent-facing read path.
- **Verdict:** BROKEN — not a contract mismatch, a complete missing surface. **Parents cannot see whether their child was at school today.** Empty-vs-broken: this is structurally broken (no endpoint), not "empty data".

### B.4 Media — ⚠️ CONFIRMED with PATH INCONSISTENCY

- **Parent fetch:** `teacher/src/parent/pages/Media.jsx:478` → `api.get('/media?childId={id}')` (the **global** endpoint).
- **Backend route:** `backend/routes/mediaRoutes.js:18` → `GET /media` (auth only, no role gate).
- **Backend parent path:** `backend/routes/parentRoutes.js:59` → `GET /parent/media` exists at `parentMediaController.js:16-77` with parent-scoped filter `{ groupId, parentId: req.user.id }` (line 58).
- **Verdict:** CONFIRMED — the parent does get media for the right child — but via the **global** endpoint, not the parent-scoped one. This is a path inconsistency: there are two paths to the same data and the parent uses the broader one. Not a security hole if the global endpoint applies child-scoping correctly (it does — `childId` filter passes through), but it's debt.
- **Empty-vs-broken:** The screenshot's "Media: 0" — per `TP-MEDIA-STORAGE.md`, the upload pipeline was broken (Appwrite credentials invalid, local-disk fallback added) — so for now the "0" is most likely **genuinely no data uploaded yet**. Re-test after PL-MEDIA storage is operationally configured.

### B.5 Ovqatlar (meals) — ✅ CONFIRMED

- **Parent fetch:** `teacher/src/parent/pages/Meals.jsx:85` → `api.get('/meals?childId={id}')`.
- **Backend route:** `backend/routes/mealRoutes.js:18` `GET /meals` (auth only).
- **Backend controller:** if parent has `groupId`, `parentMealController.js:87-101` `Meal.findAndCountAll` with `include: { Child where: { id: childId, parentId: req.user.id } }` (92-94). Otherwise falls back to `ParentMeal`. Either path scopes to the parent's own child.
- **Source (teacher):** `teacher/src/pages/Meals.jsx` writes via `POST /meals` gated on `requireRole('teacher', 'admin')`.
- **Field shape match:** `{ id, childId, date, mealType, mealName, description, quantity, specialNotes, time, eaten }` — same on both sides. No `teacherId` exposed.
- **Verdict:** CONFIRMED. "0" on dashboard is genuine-empty until teacher writes meals.

### B.6 Hissiy holat (emotional state) — ✅ CONFIRMED

- **Parent fetch:** `Dashboard.jsx:38` and `ChildProfile.jsx:99` both call `GET /parent/emotional-monitoring/child/{id}`.
- **Backend route:** `backend/routes/parentRoutes.js:84` → `emotionalMonitoringController.js:185-244` `getMonitoringByChild()`. Role check at line 197: if `req.user.role === 'parent'`, requires `child.parentId === req.user.id` (line 199).
- **Source (teacher):** writes via `POST /teacher/emotional-monitoring` (line 21).
- **CLAUDE.md note:** "C-01: Resolved — emotionalMonitoring consumed inline in parent/teacher routes (commit c1bd08d)" — confirmed.
- **Verdict:** CONFIRMED. Parent sees own child's monitoring records with shape `{ id, childId, date, emotionalState: {9 booleans}, notes, teacher: { id, firstName, lastName } }`. Dashboard's 0% is computed as `(checked/total) × 100` — if no records exist yet, the value is 0% (genuine-empty), not broken.

### B.7 Baholash (teacher rating + school rating) — ✅ CONFIRMED

- **Teacher rating** — `TeacherRating.jsx:58` → `GET /parent/ratings` → `parentTeacherRatingController.js:58-105`. Looks up `parent.teacherId`, fetches `TeacherRating.findOne({ teacherId, parentId: req.user.id })`. Returns `{ rating: { stars, comment }, summary: { average, count }, allRatings: [...] }`.
- **School rating** — `TeacherRating.jsx:64` → `GET /parent/school-rating?childId={id}` → `parentSchoolRatingController.js:100`. Scopes child to parent via `Child.findOne({ id, parentId })` (108).
- **Verdict:** CONFIRMED on contract. **HOWEVER** — the school-rating form ships PL-015 placeholder indicators (`TeacherRating.jsx:1-3` gate comment): the form is wired and the contract is correct, but the **indicator labels are placeholder strings until partner delivers PL-015 data**. Not a contract bug; a launch-gate.

### B.8 Individual reja (IRR/IEP) — ✅ CONFIRMED

- **Parent fetch:** `ChildIRR.jsx:59-70` calls three endpoints under `/parent/children/{id}/irr*`.
- **Backend:** `parentRoutes.js:88-90` → `irrParentController.js`. `resolveParentChild()` helper (11-16) verifies `child.parentId === req.user.id` for every call.
  - `getChildIRR()` (20) — header summary.
  - `getAssessmentProgression()` (45) — `AssessmentSession` rows with `{ sessionType, completedAt, totalScore, maxPossibleScore }` only. **Per-criterion scores are intentionally omitted (line 62 `attributes:` whitelist).**
  - `getGoals()` (76) — LTGs + STGs grouped by period.
- **Source (teacher):** teacher writes IRR via `requireTeacher`-gated endpoints; parent reads filtered aggregate.
- **Verdict:** CONFIRMED. Parent sees own child's IRR header, aggregate scores, and goals. No `teacherId`/per-criterion scores leak.

### B.9 Role + child-scoping enforcement (summary)

Every parent endpoint uses `authenticate` + a parent-only gate; inside each controller, child-scoping is enforced again (defense-in-depth, per the CLAUDE.md "Child-scoped resource access pattern"):

| Endpoint | Scope check | File:line |
|---|---|---|
| `/parent/children/:id/irr*` | `resolveParentChild` → `parentId` match | `irrParentController.js:11-16` |
| `/parent/children/:id/journal` | `Child.findOne({ id, parentId: req.user.id })` | `journalController.js:95-97` |
| `/parent/emotional-monitoring/child/:id` | `child.parentId !== req.user.id` deny | `emotionalMonitoringController.js:197-201` |
| `/parent/meals` (parent path) | `myChildren` lookup → `parentId` match | `parentMealController.js:54-72` |
| `/parent/media` (parent path) | `{ groupId, parentId: req.user.id }` | `parentMediaController.js:58` |
| `/parent/activities` (parent path) | `myChildren` lookup → `parentId` match | `parentActivityController.js:54-72` |
| `/parent/ratings` | `TeacherRating.findOne({ teacherId, parentId })` | `parentTeacherRatingController.js:68` |
| `/parent/school-rating` | `Child.findOne({ id, parentId })` | `parentSchoolRatingController.js:108` |

### B.10 Empty-vs-broken classification (the dashboard zeros)

| Card | Verdict | Why |
|---|---|---|
| Faoliyat: 0 | Genuine-empty | Contract correct; depends on teacher writing activities |
| Ovqat: 0 | Genuine-empty | Same |
| Media: 0 | Genuine-empty (today) | TP-MEDIA-STORAGE confirmed upload pipeline was broken at infra level; re-test after Railway volume + `LOCAL_STORAGE_FALLBACK=true` |
| Hissiy holat: 0% | Genuine-empty | Computed value; no monitoring records yet |
| Baholash: 0.0 / count 0 | Genuine-empty | Parent has not yet rated; aggregate count is 0 |
| Attendance: (no card) | BROKEN — missing surface | No fetch, no endpoint (Part B.3) |

---

## Part C — Inherited platform-bug check

### C.1 Date rendering — ❌ STILL BROKEN

The screenshot showed "juma, 5-iyun" while today is 2026-06-06. Root cause:

- **`teacher/src/parent/components/DayCard.jsx:3-13`** —
  ```js
  const formatDate = (dateStr, locale = 'uz-UZ') => {
    return new Date(dateStr).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
  };
  ```
  Hardcoded `locale = 'uz-UZ'` default. Caller in `Dashboard.jsx:169` does not pass `i18n.language`, so locale always resolves to `uz-UZ`.
- **`Meals.jsx:43-71`** implements its own `formatDate` with manually-arrayed Uzbek month names. Same anti-pattern.
- **`ChildIRR.jsx:212, 303, 305, 342`** uses `new Date(s.completedAt).toLocaleDateString()` with **no locale arg** — falls back to browser default, which on an Uzbek user may not match `i18n.language`.

Teacher's TP-LOCALE-FOUNDATION fix established `i18n.language`-aware date helpers; **parent did not adopt them**. The "5-iyun vs 6-iyun" discrepancy is consistent with a TZ-rounding or stale-prop issue on top of the locale problem — needs spot-check on a live device to disambiguate "wrong day" vs "stale render".

**Verdict:** STILL BROKEN. Fix is bounded: pass `i18n.language` everywhere, remove the custom `Meals.jsx` formatter, replace with the shared util.

### C.2 Auth-zombie (TP-AUTH-ZOMBIE) — ⚠️ PARTIALLY INHERITED

Two layers of the TP-AUTH-ZOMBIE fix:

**Layer 1 — shared axios instance + refresh mutex:** ✅ INHERITED (as of `ba999fe`, earlier this session).
- `teacher/src/parent/services/api.js:8` re-exports `../../shared/services/api` — i.e. the teacher's local instance with the shared `refreshPromise` mutex and unified `onUnauthenticated` handler.
- Grep `axios.create\|new axios\|fetch(` in `teacher/src/parent` returns no matches — no rogue clients.

**Layer 2 — `ProtectedRoute` `loading` guard:** ❌ NOT INHERITED.
- `teacher/src/parent/components/ProtectedRoute.jsx:8` —
  ```jsx
  if (loading && !user) { return <LoadingSpinner /> }
  ```
  The bug: with stale localStorage, `user` is truthy and `loading` is true → guard evaluates `false` → full layout mounts → all page-mount requests fire while auth/me is still validating → if the token has expired, every request 401s in parallel.
- **Teacher (fixed):** `teacher/src/shared/components/ProtectedRoute.jsx:12` —
  ```jsx
  if (loading) { return <LoadingSpinner size="lg" /> }
  ```
  Guard on `loading` alone — no zombie window.

**Verdict:** PARTIALLY INHERITED. Axios layer fixed; the React-mount-window zombie risk is still present. With the api fix landed, the explicit "spurious logout from refresh race" is gone, but the broader UX (stale-data flash + request storm during page load) remains until the parent's `ProtectedRoute` is brought in line with the teacher's shared one.

### C.3 Locale completeness — ✅ INHERITED (with a small parent-only gap)

- `npm --prefix teacher run check:locales` PASS: 774 keys across 105 source files; all present in UZ/EN/RU. 5 UZ==RU "suspects" are intentional (email, phone, copyright).
- `useTranslation()` in 49 parent files; ~389 `t('...')` calls. Hardcoded fallbacks are minor (`'Bugun'`, `'Yordam'`, `'Ota-ona'` in nav arrays — they're labels with `t() || fallback` guards on render).

**However** — independent check: the parent has its **own** locale tree at `teacher/src/parent/locales/{uz,en,ru}/common.json` (separate from the teacher catalog the script scans). Diffed key sets:

- UZ: 270 leaf keys
- EN: 265 leaf keys
- RU: 265 leaf keys
- **5 keys present in UZ but missing from EN and RU:**
  - `child.diagnosis`
  - `profile.avatarUpdated`
  - `profile.imageTooLarge`
  - `profile.invalidImage`
  - `profile.uploadError`

**Verdict:** INHERITED on the teacher catalog; small gap in the parent's own catalog — five UZ-only keys missing from EN/RU. The teacher `check:locales` script does not cover `teacher/src/parent/locales/`, so this drift is invisible to CI.

### C.4 Logout visibility (TP-MOBILE-PASS shared fix) — ✅ INHERITED

- `Settings.jsx:356-365` — logout button uses `w-full bg-error-600` with no `hidden md:*` modifier. Visible on all viewports.
- Route `/settings` is parent-accessible (no role-mismatch gate).
- **Caveat:** Mobile users have **no tab-bar shortcut to Settings** (`MobileTabBar.jsx` lacks it). Logout is reachable but not 2-clicks-from-home on mobile. This is a UX gap, not a visibility regression — flagging in Part D.

**Verdict:** INHERITED. Button is visible; mobile discoverability of the page is a separate Part D item.

### C.5 Mobile fit (note for future PP mobile pass — do NOT fix now)

Five concrete issues observed at 360–390px:

| # | File:line | Issue |
|---|---|---|
| 1 | `Chat.jsx:127, 136` | `Card` with `h-[calc(100vh-220px)] min-h-[420px]` forces ~500px on a 720px mobile; leaves only ~220px for header/footer at 360px width |
| 2 | `Activities.jsx:195` | Modal `max-w-4xl w-full max-h-[90vh]` — header services list lacks `flex-wrap`, risks horizontal scroll |
| 3 | `Media.jsx:639` | Lightbox `max-w-6xl ... flex flex-col lg:flex-row max-h-[90vh] h-[90vh]` — on portrait mobile with large images, aspect distortion / forced scroll |
| 4 | `ChildIRR.jsx:12-17` | Hardcoded Cyrillic `SESSION_LABELS` ignore `i18n.language` (also a C.1/C.3 issue) |
| 5 | `Layout.jsx:18` | `max-w-2xl mx-auto px-4 sm:px-6` squeezes nested modals (`max-w-4xl`) below the parent container → horizontal scroll cascades |

### C — Summary

| Item | Verdict |
|---|---|
| C.1 Date rendering | ❌ STILL BROKEN — hardcoded `uz-UZ`, custom formatters, missing `i18n.language` plumbing |
| C.2 Auth-zombie | ⚠️ PARTIAL — axios mutex inherited (`ba999fe`); `ProtectedRoute` guard NOT inherited |
| C.3 Locale completeness | ✅ INHERITED — teacher `check:locales` PASS; **plus** 5-key gap in parent's own catalog (UZ→EN/RU) |
| C.4 Logout visibility | ✅ INHERITED — visible everywhere; mobile-nav discoverability is a separate gap |
| C.5 Mobile fit | 5 issues noted; do not fix in this session |

---

## Part D — Prioritized PP-* backlog

Each item below is a future session. Priority = (parent confusion risk) × (importance). One session per item, executed in priority order after PP-AUDIT closes.

| # | ID | Scope (one line) | Priority | Source evidence |
|---|---|---|---|---|
| 1 | **PP-ATTENDANCE-SURFACE** | Build a parent attendance read surface: `GET /parent/children/:id/attendance` with the TP-DAVOMAT-REWORK status enum + parent page + dashboard card; statuses localized | **HIGH** | Part B.3 — surface absent entirely; parents cannot see if child was at school |
| 2 | **PP-AUTH-ZOMBIE** | Replace parent's local `ProtectedRoute` with the shared teacher `ProtectedRoute` (or align its guard to `if (loading)`) | **HIGH** | C.2 — `parent/components/ProtectedRoute.jsx:8` still has old `loading && !user` guard |
| 3 | **PP-DATE-LOCALE** | Plumb `i18n.language` into `DayCard`, remove custom `Meals.jsx` formatter, fix `ChildIRR.jsx` `toLocaleDateString()` calls; verify "5-iyun vs 6-iyun" disambiguation on a live device | **HIGH** | C.1 — `DayCard.jsx:3`, `Meals.jsx:43-71`, `ChildIRR.jsx:212+` |
| 4 | **PP-IRR-LABELS-I18N** | Move `SESSION_LABELS` to i18n keys (3 locales); follow-up: search ChildIRR for other hardcoded Cyrillic strings | **MEDIUM** | A.5 / C.5 — `ChildIRR.jsx:12-17` |
| 5 | **PP-AIWARNINGS-ORPHAN** | Delete `AIWarnings.jsx` (orphan; dead-code role check at line 182) OR mount it intentionally with a parent-appropriate UX — decide first | **MEDIUM** | A.1, A.5 — file exists, no route |
| 6 | **PP-LOCALE-PARENT-CATALOG** | Add 5 missing keys (`child.diagnosis`, `profile.avatar*`, `profile.image*`, `profile.uploadError`) to parent's `en` and `ru` `common.json`; extend `check:locales` to scan `teacher/src/parent/locales/` | **MEDIUM** | C.3 |
| 7 | **PP-MOBILE-NAV** | Add MobileTabBar entries (or a "More" menu) for `/meals`, `/media`, `/notifications`, `/settings`, `/irr`, `/rating` — currently desktop-only or sidebar-only | **MEDIUM** | A.4 — six routes unreachable from mobile tab bar; `/rating` and `/irr` also missing from desktop top nav |
| 8 | **PP-MEDIA-PATH** | Audit `/media` vs `/parent/media`: decide canonical, migrate `Media.jsx:478` if needed; confirm child-scoping on the global endpoint is identical to the parent endpoint | **MEDIUM** | A.2 / B.4 |
| 9 | **PP-JOURNAL-SURFACE** | Confirm where (if anywhere) `GET /parent/children/:id/journal` is rendered in the parent UI; if the read path is missing, build one | **MEDIUM** | B.2 |
| 10 | **PP-MOBILE-PASS** | The 5 layout issues from C.5: Chat height, Activities/Media modal widths, Layout `max-w-2xl` cascade. Pure CSS pass | **MEDIUM** | C.5 |
| 11 | **PP-CHILDPROFILE-MONITORING-WIRING** | Verify `EmotionalMonitoringSection` (line 298) actually renders the `monitoringRecords` fetched at `ChildProfile.jsx:99-123`; if it doesn't, either drop the fetch or surface the data | **LOW** | A.5 / B.6 |
| 12 | **PP-CLEANUP-MEDIA-DEBUG** | Remove unused `_proxyUrl` debug assignments at `Media.jsx:564-567, 582-585` | **LOW** | A.5 |
| 13 | **PP-HELP-DYNAMIC** | (Strategic.) Decide whether Help should become dynamic (admin-editable) or stay static. No-op session if "stay static" — but worth a decision | **LOW** | A.5 |
| — | (out of scope) | PL-015 partner-data delivery for `TeacherRating` indicators — already tracked as `PL-015` pre-launch blocker | — | A.5, B.7 — do NOT duplicate into PP-* |

### Recommended sequencing
1. **PP-ATTENDANCE-SURFACE** + **PP-AUTH-ZOMBIE** — both ship safety/UX value with bounded scope.
2. **PP-DATE-LOCALE** + **PP-IRR-LABELS-I18N** — same touch path (locale plumbing); combine if convenient.
3. **PP-AIWARNINGS-ORPHAN** + **PP-LOCALE-PARENT-CATALOG** + **PP-MOBILE-NAV** — independent, parallelizable.
4. **PP-MEDIA-PATH** + **PP-JOURNAL-SURFACE** + **PP-MOBILE-PASS** — code-only refinements, batchable.
5. **PP-CHILDPROFILE-MONITORING-WIRING** + **PP-CLEANUP-MEDIA-DEBUG** + **PP-HELP-DYNAMIC** — low-priority cleanup.

---

## Appendix — Recommended user verification

Three spot checks to validate the audit before closing PP-AUDIT to ✅:

1. **B.3 (Attendance BROKEN):** Open the parent portal in production; look for any attendance UI on `/`, `/child`, `/activities`. Expectation: none.
2. **B.1 (Chat CONFIRMED):** Send a teacher→parent message in production. Reload parent `/chat`. Confirm it appears, sender role is `teacher`, and the conversation maps to the same `parent:<uuid>` id seen on the teacher's messenger.
3. **C.1 (Date BROKEN):** Set browser language to `en` or `ru`; open the parent dashboard; confirm today's date still renders in Uzbek (the bug). After the fix lands as PP-DATE-LOCALE, the same test should render in the chosen language.

Reply "verified" → PP-AUDIT closes ✅. The PP-* arc then begins, one session per item, in the order in Part D.
