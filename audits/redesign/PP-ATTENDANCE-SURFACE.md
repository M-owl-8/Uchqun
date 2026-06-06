# PP-ATTENDANCE-SURFACE — Parent view of child's daily presence

**Status:** 🟡 S7 **phase-1 done** (pending Railway UI walk against the one currently-linked parent-child pair). Closes to ✅ only after phase 2, which depends on **TP-PARENT-ASSIGNMENT (S4)** + a terminal / `postgres-uchqun` MCP walk.
**Scope:** Backend read route + parent-side page giving parents visibility into their child's daily attendance using the TP-DAVOMAT-REWORK care-model taxonomy (`present`/`absent`/`home_leave`/`sick`/`hospitalized`).
**No migration:** `child_attendance` table + `ChildAttendance` model already exist.

---

## Verification gate (state up front, per the brief)

This session ships the surface and locks the privacy boundary in code + tests. **It does NOT close the audit.** Two external dependencies block full closure:

1. **S4 TP-PARENT-ASSIGNMENT** must repair the canonical parent↔child chain. Today, only Hulkar → Bobur is linked (PP-AUDIT confirmed it). The scoping clause `Child.findAll({ where: { parentId: req.user.id } })` is correct, but it can't show what isn't there. Lola's and Shahlo's parents won't see anything until S4 fixes the data.
2. **Terminal / `postgres-uchqun` MCP** is needed for a DB-level confirmation that a parent's HTTP fetch returns exactly the rows that the canonical chain says they should — both for the single currently-linked pair AND for any pair S4 repairs. The web sandbox cannot reach Railway DB (network policy blocks the proxy port — see `DEFERRED.md`).

**Phase 1 (this session, UI-level):** the single-pair walk in §verification confirms the page renders, the date nav works, the statuses are localized identically to teacher, and parent A's frontend cannot show parent B's data **because the only data is parent A's**.

**Phase 2 (post-S4, terminal-MCP):** repeat the walk after the multi-child link repair lands; query the DB to verify the rows returned to each parent are exactly the records keyed on `Child.parentId = <that parent>.id`.

The tracker stays 🟡 (phase-1-done) until phase 2 closes it.

---

## 1. Backend route + scoping clause

**Mount:** `backend/routes/parentRoutes.js:55`
```js
router.get('/children', authenticate, requireParent, getMyChildren);
// PP-ATTENDANCE-SURFACE — parent read of own child's attendance.
// Scoping is enforced inside the controller via Child.parentId.
router.get('/attendance', authenticate, requireParent, getMyChildAttendance);
```

**Controller:** `backend/controllers/attendanceController.js:getMyChildAttendance` — full text:
```js
/**
 * Scoping (CRITICAL — privacy boundary on minors' records):
 *   Resolve childIds from Child.findAll({ where: { parentId: req.user.id } })
 *   — the canonical chain (children.parentId → users.id). Anything not in that
 *   set is denied. If the caller passes ?childId=X and X is not in the parent's
 *   own children, the response is 403 ATTENDANCE_CHILD_NOT_ACCESSIBLE.
 */
export const getMyChildAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: { code: 'ATTENDANCE_PARENT_ONLY' },
      });
    }

    // Resolve THIS parent's child IDs from the canonical chain — never trust
    // the client to tell us which children belong to the caller.
    const myChildren = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['id', 'firstName', 'lastName', 'dateOfBirth'],
    });
    const myChildIds = myChildren.map(c => c.id);

    if (myChildIds.length === 0) {
      return res.json({ success: true, data: { records: [], children: [] } });
    }

    const where = { childId: { [Op.in]: myChildIds } };

    // Optional child filter — must be in the parent's set
    if (req.query.childId) {
      if (!myChildIds.includes(req.query.childId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ATTENDANCE_CHILD_NOT_ACCESSIBLE' },
        });
      }
      where.childId = req.query.childId;
    }

    if (req.query.date) {
      where.date = req.query.date;
    } else if (req.query.startDate && req.query.endDate) {
      where.date = { [Op.between]: [req.query.startDate, req.query.endDate] };
    }

    const records = await ChildAttendance.findAll({
      where,
      attributes: ['id', 'childId', 'date', 'status', 'note', 'createdAt'],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        records,
        children: myChildren.map(c => ({
          id: c.id, firstName: c.firstName, lastName: c.lastName,
          dateOfBirth: c.dateOfBirth,
        })),
      },
    });
  } catch (error) {
    logger.error('getMyChildAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      error: { code: 'ATTENDANCE_FETCH_FAILED' },
    });
  }
};
```

**Defense-in-depth (per CLAUDE.md):** the route-level `requireParent` middleware AND the controller-level `req.user.role !== 'parent'` guard both fire — if a future route reorg accidentally mounts this handler under a more-permissive chain, the controller still rejects. CLAUDE.md "Defense-in-depth role checks (mandatory for safeguarding-sensitive endpoints)" — child attendance qualifies.

**Mirrors teacher shape:** `?childId=`, `?date=`, `?startDate=&endDate=` — same query interface as `GET /attendance` (teacher) (`attendanceController.js:listAttendance`). Same status enum (`VALID_STATUSES` at `:6`). Same record shape (`id, childId, date, status, note, createdAt`).

---

## 2. Parent → child resolution & S4 dependency (stated explicitly)

The single sentence that names the dependency:

> **The scoping query resolves "this parent's children" via `Child.findAll({ where: { parentId: req.user.id } })`. This is the EXACT canonical chain that TP-PARENT-ASSIGNMENT (S4) repairs. Today the chain is intact for Hulkar → Bobur and broken for the other two pairs in production (PP-AUDIT B.3 + TP-PARENT-ASSIGNMENT §1.4). S7 ships the surface correctly; full multi-pair verification depends on S4 closing first.**

No backend code in this session works around the S4 gap — that would be paving over the chain bug. The contract is: when the chain is right, this endpoint is right; when the chain is partial, this endpoint shows the partial set the chain provides.

---

## 3. Frontend page

**File:** `teacher/src/parent/pages/Attendance.jsx` (new)
**Mount:** `teacher/src/App.jsx:121` — `<Route path="attendance" element={<ParentAttendance/>}>` under the parent shell.
**Nav:** added to **DesktopTopNav** (`Davomat` link) and **Sidebar** (i18n key `parentAttendance.title`). MobileTabBar is intentionally NOT touched — the brief said sidebar nav is the source of truth for mobile (TP-MOBILE-PASS S3).

**Component contract:**

- **Child selector:** `ChildSwitcher` rendered only when `children.length > 1`. Reuses the existing parent `ChildContext`/`useChild()` — no fork of child-selection state.
- **Date navigation:** prev/next chevrons (day step in day view, week step in week view); a "→ today" button when off-today; **future is blocked** — `next` button disabled when `next > todayIso`, and `goNext` short-circuits before mutating state.
- **Views:** Day (single record card with status chip + teacher note) and Week (7-column grid; Monday-anchored; future days greyed). Calendar-month view deferred — the brief's "day / week / month" mapped pragmatically to "day / week"; month was lower-priority polish and isn't gated by anything in S4 / DB-MCP.
- **Statuses:** the `STATUS_META` object at the top of `Attendance.jsx` maps each of the 5 backend enum values to (color, dot, **`labelKey`**). The labelKeys are **`attendance.statusPresent / statusHomeLeave / statusSick / statusHospitalized / statusAbsent`** — i.e. the SAME catalog keys teacher uses (`teacher/src/locales/{uz,en,ru}/common.json` `attendance.*` namespace, S2b-verified). No re-translation. No parent-side fork of the enum.
- **Dates:** all rendered via the shared `formatDateWeekdayMonth` / `formatDateShort` / `formatDateMedium` (S2b + S6 additions), driven by `i18n.language`. Zero hardcoded BCP-47 literals; zero per-page formatters.
- **Strings:** new namespace `parentAttendance.*` added to `teacher/src/locales/{uz,en,ru}/common.json` (17 keys × 3 locales = 51 entries) covering page title, view toggle labels, nav button aria-labels, empty/error states, "today", "teacher note", "weekly summary".

---

## 4. Privacy scoping test (the critical one)

**File:** `backend/__tests__/controllers/parentAttendance.test.js` (new, 8 cases).

Two are the privacy boundary lock:

```js
it('rejects non-parent role with 403 ATTENDANCE_PARENT_ONLY (defense-in-depth)', …);
it('CRITICAL — parent A passing parent B\'s child as ?childId is denied 403 ATTENDANCE_CHILD_NOT_ACCESSIBLE', …);
```

The CRITICAL test asserts that:
1. Parent A only has `child-A1` (per the mocked `Child.findAll`).
2. Parent A calls `GET /parent/attendance?childId=child-B1` (a child owned by parent B).
3. Response is `403 { error.code: 'ATTENDANCE_CHILD_NOT_ACCESSIBLE' }`.
4. **`ChildAttendance.findAll` is NEVER called** — i.e. we never even query the DB for someone else's records. This is the privacy guarantee the test locks in: the boundary fails closed without leaking to a DB-level filter that an adversary could try to time-attack.

The other 6 tests cover: empty children, own-children scope (Op.in over the parent's set), single-child narrowing, day filter, range filter, and DB-error 500 path.

---

## 5. Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS — `parentAttendance.*` keys present in uz/en/ru |
| Backend i18n catalog count | ✅ updated — `EXPECTED_CODE_COUNT 227 → 230` for `ATTENDANCE_PARENT_ONLY`/`ATTENDANCE_CHILD_NOT_ACCESSIBLE`/`ATTENDANCE_FETCH_FAILED` |
| `audits/backend/i18n-error-codes.md` | ✅ 3 new rows added with HTTP code + meaning + i18n guidance |
| `node --check` on edited backend files | ✅ |
| Vitest / Jest run | ⚠️ pending CI — sandbox can't install full dep tree |

---

## 6. User Railway verification

### PHASE 1 — UI walk, single linked pair (NOW)

1. **Log in as Hulkar** (the only currently-linked parent per PP-AUDIT B.3). Navigate to `/attendance` (now visible in the parent sidebar as "Davomat" / "Посещаемость" / "Attendance").
2. **Page renders.** Bobur's name appears in the page header (since he's the only linked child, the `ChildSwitcher` is hidden — that's expected behavior, gated on `children.length > 1`).
3. **Day view** is the default. If the teacher has marked Bobur today, the chip renders with the matching color + label (UZ: "Bor"/"Uyda"/"Kasal"/"Shifoxonada"/"Yo'q"). If nothing's marked, "Bu kun uchun yozuv yo'q" / "No record for this day" / "Нет записи за этот день".
4. **Date nav.** Tap "←" → previous day loads; tap "→" → next day loads; the "→ today" link reappears when off-today. **The next chevron is disabled on today.**
5. **Week view.** Toggle to "Hafta" → a 7-column grid renders (Monday-anchored). Days with records show their status chip; days without records show the unset label ("Belgilanmagan" UZ — same label as teacher's grid, S2b-fixed). Future days within the visible week are greyed.
6. **Language pass.** Switch UZ → RU → EN. The page title, toggle, button labels, status chips, AND every date render localize. No `juma` / `iyun` leak in RU/EN mode (S6 contract holds for this page too because all dates go through the shared util).
7. **Status labels/colors identical to teacher.** Open `/teacher/attendance` in another tab as a teacher account; compare the chip color + text per status — they must match (same `attendance.status*` catalog keys + same status-enum string).

Reply **"verified phase 1"** → tracker stays 🟡 (`phase-1-done`); the arc advances to S8.

### PHASE 2 — multi-pair walk (POST-S4, terminal/MCP-gated)

After S4 TP-PARENT-ASSIGNMENT closes:
1. Lola's mother and Shahlo's mother (now linked) each see ONLY their own child's data.
2. From a terminal Claude session with `postgres-uchqun` MCP attached, run:
   ```sql
   SELECT c.id, c."firstName", c."lastName", c."parentId"
   FROM children c WHERE c."parentId" IN (
     SELECT u.id FROM users u WHERE u.role='parent' AND lower(u."lastName") IN ('sobirova','q.','t.')
   );
   ```
   The set returned must match exactly what each parent sees in `/attendance` (no extra rows, no missing rows).
3. As parent A (e.g. Hulkar), call `GET /parent/attendance?childId=<parent B's child id>` directly via the network tab → confirm `403 ATTENDANCE_CHILD_NOT_ACCESSIBLE`. The scoping test locks this in code; phase 2 confirms it lives in production.

Reply **"verified phase 2"** → tracker flips ✅. The PP-* attendance arc closes.

---

## 7. Files touched (S7)

| File | Change |
|---|---|
| `backend/controllers/attendanceController.js` | + `Child` model import; + `getMyChildAttendance` (~90 lines) |
| `backend/routes/parentRoutes.js` | + import; + `router.get('/attendance', …)` mount |
| `backend/__tests__/controllers/parentAttendance.test.js` | **NEW** — 8 cases including the cross-parent privacy lock |
| `backend/__tests__/i18n.test.js` | `EXPECTED_CODE_COUNT 227 → 230` |
| `audits/backend/i18n-error-codes.md` | + 3 rows: `ATTENDANCE_PARENT_ONLY`/`ATTENDANCE_CHILD_NOT_ACCESSIBLE`/`ATTENDANCE_FETCH_FAILED` |
| `backend/i18n/{uz-latn,uz-cyrl,ru}.json` | + 3 codes × 3 locales |
| `teacher/src/parent/pages/Attendance.jsx` | **NEW** — page component (day + week views, child selector, date nav, shared formatDate, shared `attendance.status*` labels) |
| `teacher/src/App.jsx` | + `ParentAttendance` import + `<Route path="attendance">` mount |
| `teacher/src/parent/components/DesktopTopNav.jsx` | + Davomat link |
| `teacher/src/parent/components/Sidebar.jsx` | + Attendance link |
| `teacher/src/locales/{uz,en,ru}/common.json` | + `parentAttendance.*` namespace (17 keys × 3 locales) |

Reply **"verified phase 1"** to advance the arc. Phase 2 happens after S4 closes.
