# CP-024 — Manager ИРР Surface (Admin portal)

**Commit:** TBD (pending commit)
**Date:** 2026-05-26
**Status:** ✅ COMPLETE

---

## 1. What was built

CP-024 adds the раҳбар (admin/director) ИРР management surface to the admin portal.

Two surfaces on a single page (`ManagerIRR.jsx`, route `/admin/irr`):

### Surface 1 — Goal-Period Manager Signature

- Lists all children in the school (GET `/teacher/children` — schoolId-scoped, admin passes `requireTeacher`)
- Each child row expands lazily to load:
  - GET `/teacher/children/:childId/irr` — IRR header (404 → "no IRR yet" message)
  - GET `/teacher/irr/:irrId/goal-periods` — periods list
- Each period shows: date range, teacher sign status, manager sign status
- Sign button → `POST /teacher/goal-periods/:id/sign` as admin role → controller sets `managerSignedAt/managerSignedBy` (since `req.user.role !== 'teacher'`)
- After signing: button replaced by green "Имзоланган" badge; toast success

### Surface 2 — Quarterly Facility-Level Monitoring Journal

- Form: `quarterStart`, `quarterEnd`, 5 JSONB sections (notes per section), departures sub-table, general notes
- Submit → `POST /admin/irr/quarterly-entries` (already wired in admin routes, `requireAdmin` enforced)
- History list → `GET /admin/irr/quarterly-entries` (schoolId-scoped)
- Duplicate quarter → 409 → user-facing error toast

---

## 2. Design decisions

| Decision | Rule |
|---|---|
| Admin uses teacher routes for sign | `signGoalPeriod` is on teacher routes with no `requireRole`. `requireTeacher` allows `['teacher', 'reception', 'admin']`. `isTeacherAssignedToChild` returns `true` for non-teacher roles. Admin signs fine via `/teacher/goal-periods/:id/sign`. |
| Lazy-load per child | Don't load all IRRs on page load. Expand-on-click to avoid N+1 on mount. |
| Quarterly JSONB = `{ notes: string }` per section | Backend is free-form JSONB. Exact 55-item spec not yet provided by product owner. Simple notes-per-section is the correct minimum — no invented structure that will need migration. |
| raҳбар = admin role | No new role introduced. CP-024 confirmed: admin IS the раҳбар. |

---

## 3. Files created / modified

| File | Change |
|---|---|
| `admin/src/pages/ManagerIRR.jsx` | **NEW** — Manager IRR page (2 tabs: periods + quarterly) |
| `admin/src/__tests__/pages/ManagerIRR.test.jsx` | **NEW** — 6 tests |
| `admin/src/App.jsx` | Added `import ManagerIRR` + `<Route path="irr" ...>` |
| `admin/src/components/Sidebar.jsx` | Added `ClipboardList` import + `/admin/irr` nav entry under Reports |

---

## 4. API endpoints called

| Method | Endpoint | Surface | Notes |
|---|---|---|---|
| `GET` | `/teacher/children` | Periods tab | schoolId-scoped; admin passes requireTeacher |
| `GET` | `/teacher/children/:childId/irr` | Periods tab (lazy, per-child) | 404 → gentle "no IRR" message |
| `GET` | `/teacher/irr/:irrId/goal-periods` | Periods tab (lazy, per-child) | Lists periods |
| `POST` | `/teacher/goal-periods/:id/sign` | Sign button | admin role → managerSignedAt/By set |
| `GET` | `/admin/irr/quarterly-entries` | Quarterly tab | schoolId-scoped |
| `POST` | `/admin/irr/quarterly-entries` | Quarterly form submit | requireAdmin enforced at route layer + controller |

**No government endpoints. No per-criterion endpoints. No cross-school access.**

---

## 5. data-testid attributes

| testid | Element |
|---|---|
| `manager-irr-page` | Root div |
| `tab-periods` | Periods tab button |
| `tab-quarterly` | Quarterly tab button |
| `periods-tab` | Periods tab content |
| `quarterly-tab` | Quarterly tab content |
| `children-loading` | Spinner while children list loading |
| `no-children` | Empty state when no children |
| `child-row-{id}` | Collapsible child row |
| `no-irr-{childId}` | Message when child has no IRR |
| `period-row-{id}` | Each period row |
| `manager-sign-status-{id}` | Manager sign status badge |
| `sign-btn-{id}` | Sign button (visible only when unsigned) |
| `signed-badge-{id}` | "Имзоланган" badge (after signing) |
| `quarterly-form` | Quarterly monitoring form |
| `quarter-start` | Quarter start date input |
| `quarter-end` | Quarter end date input |
| `section-{key}` | Textarea per JSONB section |
| `add-departure` | Add departure row button |
| `departure-row-{idx}` | Each departure row |
| `quarterly-notes` | General notes textarea |
| `quarterly-submit` | Form submit button |
| `quarterly-empty` | Empty state when no history entries |
| `quarterly-entry-{id}` | Each history entry card |

---

## 6. Test results (6 tests, all green)

**File:** `admin/src/__tests__/pages/ManagerIRR.test.jsx`

| Test | Assertion |
|---|---|
| renders children list after load | `child-row-c1`, `child-row-c2` present after GET /teacher/children |
| loads and shows goal periods when child row is expanded | expand → GET irr → GET periods → `period-row-p1`, `period-row-p2` |
| sign button calls POST and updates period to signed | click sign-btn-p1 → POST /teacher/goal-periods/p1/sign → `signed-badge-p1` appears |
| shows no-IRR message when child has no IRR (404) | expand → 404 → `no-irr-c1` visible |
| quarterly tab shows form and submits POST /admin/irr/quarterly-entries | switch tab → fill dates → submit → POST called with correct payload |
| quarterly tab lists existing entries from GET | GET returns entries → `quarterly-entry-q1` shown |

---

## 7. Cross-portal status

- **CP-024** — ✅ BUILT (this phase). Admin portal manager ИРР surface: goal-period signature + quarterly monitoring journal.
- **CP-025** — ✅ BUILT Phase 3e. Parent ИРР view-only.

---

## 8. What admin can NOT do (enforced in UI)

- Cannot create/edit IRRs (teacher-only write path)
- Cannot edit goal periods (only sign)
- Cannot view per-criterion scores
- Cannot see daily/weekly monitoring journals (teacher-internal)
