# PP-JOURNAL-FEATURE — Parent reads the teacher's daily journal entries

**Status:** 🟡 S13 phase-1 in progress (pending Railway round-trip walk against the single linked Hulkar↔Bobur pair). Closes to ✅ only after phase 2, which depends on **TP-PARENT-ASSIGNMENT (S4)** for multi-parent verification.
**Scope:** Build the parent-side `/journal` read surface (read-only) on top of the existing backend `getChildJournal`. Single shared model — same `ChildJournalEntry` rows the teacher writes via `POST /teacher/journal`.

---

## 1. Backend — pasted, scoping confirmed

**Route:** `backend/routes/parentRoutes.js:85`
```js
router.get('/children/:id/journal', authenticate, requireParent, getChildJournal);
```

**Controller** (`backend/controllers/journalController.js:getChildJournal`, full body):

```js
export const getChildJournal = async (req, res) => {
  try {
    const child = await Child.findOne({
      where: { id: req.params.id, parentId: req.user.id },
    });
    if (!child) {
      return res.status(404).json({
        success: false,
        error: { code: 'JOURNAL_NOT_FOUND_FOR_PARENT' },
      });
    }

    const entries = await ChildJournalEntry.findAll({
      where: { childId: req.params.id, isVisibleToParent: true },
      order: [['date', 'DESC']],
      limit: 100,
      include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }],
    });

    const data = entries.map(e => ({
      id: e.id,
      date: e.date,
      content: e.content,
      teacherFirstName: e.author?.firstName ?? null,
      teacherLastName: e.author?.lastName ?? null,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Get child journal error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'JOURNAL_LIST_FAILED' } });
  }
};
```

**Privacy boundary:**

1. **Canonical-chain scoping** (`Child.findOne({where:{id, parentId: req.user.id}})`): parent A passing parent B's child id returns 404 `JOURNAL_NOT_FOUND_FOR_PARENT` **before** any `ChildJournalEntry.findAll` query — same fail-closed pattern as PP-ATTENDANCE-SURFACE (S7) and the dashboard-cards regression (S10).
2. **Teacher visibility gate** (`isVisibleToParent: true`): only entries the teacher chose to share are returned. Teacher-private notes (e.g. internal observations) stay out of the parent view by the teacher's own decision at write time.
3. **No `teacherId` leakage**: the response includes the teacher's first + last name (so the parent can see "Zulfiya Nazarova" as the author) but never the teacher's UUID. CLAUDE.md "parent-facing response shape" rule honored.

The chain — `Child.parentId → users.id` — is the **same one TP-PARENT-ASSIGNMENT (S4) repairs**. When S4 lands and the other two pairs are linked canonically, this surface will return the right entries for them too without any code change. Phase 2 confirms it.

---

## 2. Entry shape — matched to the model and write side

| Field | DB column | Parent response | Source |
|---|---|---|---|
| `id` | UUID | `id` | identity |
| `date` | `DATEONLY` (`YYYY-MM-DD`) | `date` | teacher write |
| `content` | `TEXT` (10–2000 chars) | `content` | teacher write |
| `teacherFirstName` | (joined from `User.firstName` via `author`) | `teacherFirstName` | enrichment |
| `teacherLastName` | (joined from `User.lastName` via `author`) | `teacherLastName` | enrichment |
| `isVisibleToParent` | `BOOLEAN` (default `true`) | (filter only — not in response) | teacher write |

**No moment tags, no photos in this model.** PP-AUDIT and S11's brief mention of "moment tags / photos" came from the `ParentJournalComposer` component, which posts to `/teacher/emotional-monitoring` (the emotional-monitoring model — completely separate from `child_journal_entries`). The two surfaces look alike on the teacher side but write to different tables. Parent-side emotional monitoring is already rendered inside `EmotionalMonitoringSection` (S11 verified the wiring); the parent journal is its own thing.

If product ever wants moment tags / photos on the journal entry, that's a **separate model change** + write-side rework + parent-side render addition. Not in S13 scope.

---

## 3. Frontend page

**File:** `teacher/src/parent/pages/Journal.jsx` (new, 105 lines).

**Anatomy:**
- **Letterhead** via S8's `<ParentPageHeader title subtitle count />`. Title is `t('parentJournal.title')` ("Kun jurnali" / "Daily journal" / "Дневник"); subtitle states the page's purpose from the parent's perspective; count = number of entries.
- **Child selector** via S7's `<ChildSwitcher />` — hidden when `children.length <= 1` (same convention as Attendance, ChildIRR, etc.).
- **Loading state** (`<LoadingSpinner size="md" />` centred), **empty state** (`<NotebookPen />` + `t('parentJournal.empty')` localized message), or **entries list**.
- **Entries list**: `<ul>` of `<Card>`s, one per entry. Each card shows:
  - A row of `<CalendarDays />` + the date (`formatDateMonthLong(e.date, i18n.language)` via the shared util — UZ "5-iyun 2026", EN "June 5, 2026", RU "5 июня 2026") + a separator dot + the teacher's full name (or `t('parentJournal.author')` fallback if missing).
  - The entry content as `<p>` with `whitespace-pre-wrap` so paragraph breaks from the teacher's write side survive, and `break-words` so overflowing names/URLs don't blow the layout.
- **No compose / edit / delete affordance** — this is read-only by design. The composer lives in the teacher portal (`pages/MonitoringJournal` or wherever `POST /teacher/journal` is wired).

**Token discipline (S8 carry-over):** `text-p-ink`, `text-p-sepia-500`, `bg-p-sepia-400` on empty-state icon, `Card` for entry containers. Zero raw `text-gray-*` / hex; zero hardcoded date locales (uses shared util).

**Default-value masks:** zero (S2b / S11 gate). Every `t()` call uses a key that exists in all three locales.

---

## 4. Nav placement (per S12's pattern)

Per the brief's "Kundalik flow or a QuickLink from Dashboard hub" — I chose **BOTH** because the journal is a discoverable daily-read flow:

- **Dashboard QuickLink** (`Dashboard.jsx:123`): added a card with `t('dashboard.journal')` + `NotebookPen` icon → `/journal`. One tap from the hub.
- **DesktopTopNav** (`DesktopTopNav.jsx`): added `Jurnal` link after `Davomat`. One tap from any page on desktop.
- **Sidebar** (parent's `Sidebar.jsx`): added `parentJournal.title` row after `parentAttendance.title`. One tap on any page that uses the sidebar.
- **MobileTabBar — intentionally NOT touched.** Per S12, the parent mobile tab bar is locked at 4 core flows (Bugun / Kundalik / Xabarlar / Profil). Journal is a daily-read flow, surfaced via the Dashboard hub on mobile (Bugun → Kun jurnali QuickLink) and via DesktopTopNav on desktop. Adding a 5th tab to MobileTabBar would change the established design.

---

## 5. Scoping regression — privacy boundary locked in tests

`backend/__tests__/controllers/parentJournal.test.js` (NEW, **4 cases**):

| # | Case | What it asserts |
|---|---|---|
| 1 | **CRITICAL — parent A passes parent B's child id** | 404 `JOURNAL_NOT_FOUND_FOR_PARENT` AND `ChildJournalEntry.findAll` **never called** (the boundary fails closed before the DB is ever queried for someone else's records) |
| 2 | Own-child happy path | `Child.findOne({where:{id, parentId:'parent-A'}})` succeeds; `findAll` queries with `childId` AND `isVisibleToParent: true` (locking the teacher's visibility gate too); response maps to `{ id, date, content, teacherFirstName, teacherLastName }` |
| 3 | Empty data | Returns `{ success: true, data: [] }` when the parent's child has no entries |
| 4 | DB error | Returns `500 JOURNAL_LIST_FAILED` on the catch path |

The CRITICAL test is the same shape as `parentAttendance.test.js` and `parentDashboardCards.test.js` — catches a future refactor that drops the `parentId` scoping in the `Child.findOne` clause.

---

## 6. i18n additions

| Key | UZ | EN | RU |
|---|---|---|---|
| `parentJournal.title` | "Kun jurnali" | "Daily journal" | "Дневник" |
| `parentJournal.subtitle` | "Tarbiyachi farzandingiz haqida yozayotgan kundalik yozuvlar" | "Daily entries the teacher writes about your child" | "Ежедневные записи учителя о вашем ребёнке" |
| `parentJournal.empty` | "Hali yozuv yo'q. Tarbiyachi yangi yozuv qo'shganda bu yerda ko'rinadi." | "No entries yet. New entries from the teacher will appear here." | "Записей пока нет. Новые записи учителя появятся здесь." |
| `parentJournal.loadError` | "Jurnalni yuklashda xatolik. Qaytadan urinib koʻring." | "Failed to load the journal. Please try again." | "Не удалось загрузить дневник. Попробуйте ещё раз." |
| `parentJournal.noChild` | "Farzandingizni tanlang" | "Select your child" | "Выберите ребёнка" |
| `parentJournal.author` | "Tarbiyachi" | "Teacher" | "Учитель" |
| `dashboard.journal` | "Kun jurnali" | "Daily journal" | "Дневник" |

**7 keys × 3 locales = 21 new entries.** `check:locales` PASS.

The teacher's existing `journal.*` namespace (composer keys like `journal.bodyPlaceholder`, `journal.momentFirst`) is **not reused** here — those belong to the write side. Parent-read keys live in their own `parentJournal.*` namespace, same convention as `parentAttendance.*` and `parentChat.*` (S7, S9).

---

## 7. Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS — 7 new keys present in all 3 locales |
| Backend privacy regression (`parentJournal.test.js`) | ✅ NEW — 4 cases, CRITICAL boundary asserted |
| Cyrillic / hardcoded date locale carryover gates | ✅ unchanged |
| ESLint / Vitest / Jest | ⚠️ pending CI — sandbox cannot install full dep tree |
| Catalog count (i18n.test.js) | unchanged — no new backend error codes (controller already used `JOURNAL_NOT_FOUND_FOR_PARENT` and `JOURNAL_LIST_FAILED` which are already in `audits/backend/i18n-error-codes.md`) |

---

## 8. Files modified in S13

| File | Change |
|---|---|
| `teacher/src/parent/pages/Journal.jsx` | **NEW** — read-only parent journal page |
| `teacher/src/App.jsx` | + `ParentJournal` import + `<Route path="journal">` mount (also re-added missing `ParentAttendance` import/mount from S7 — they had been rolled back at some point) |
| `teacher/src/parent/pages/Dashboard.jsx` | + `dashboard.journal` QuickLink card with `NotebookPen` icon |
| `teacher/src/parent/components/DesktopTopNav.jsx` | + Jurnal link after Davomat |
| `teacher/src/parent/components/Sidebar.jsx` | + Jurnal nav row after Attendance (and fixed a malformed `lucide-react` import block from a previous merge artefact) |
| `teacher/src/parent/locales/{uz,en,ru}/common.json` | +`parentJournal.*` (6 keys) +`dashboard.journal` × 3 locales |
| `backend/__tests__/controllers/parentJournal.test.js` | **NEW** — 4 privacy-regression cases |
| `audits/redesign/PP-JOURNAL-FEATURE.md` | NEW (this doc) |
| `LOOP_TRACKER.md` | + PP-JOURNAL-FEATURE row |

---

## 9. User Railway verification

### PHASE 1 — single linked pair walk (NOW)

1. **Baseline.** Log in as Hulkar. Navigate to `/journal` (now visible in the parent Dashboard QuickLinks as "Kun jurnali" and in the DesktopTopNav / Sidebar). On first load the page renders the letterhead + the **empty state** ("Hali yozuv yo'q. Tarbiyachi yangi yozuv qo'shganda bu yerda ko'rinadi."). The child switcher is hidden (single linked child). No compose / edit affordance — read-only.
2. **Teacher writes an entry.** Log in as Zulfiya. Open the teacher journal write surface (`POST /teacher/journal` — wired wherever the teacher Kun jurnali compose UI lives). Compose a 10+ character entry for Bobur, dated today, with `isVisibleToParent: true` (the default). Submit.
3. **Parent reads.** Switch back to Hulkar's tab. Hard refresh `/journal`. The Card list now has 1 entry: the date row (`formatDateMonthLong` — e.g. UZ "5-iyun 2026") + Zulfiya's full name + the body. The count `(1)` appears next to the page title.
4. **Teacher writes a private note.** As Zulfiya, write a second entry but uncheck `isVisibleToParent` (or pass `false`). Submit.
5. **Parent does NOT see it.** Refresh `/journal` as Hulkar. Still 1 entry. The private note never leaves the teacher's view — the `isVisibleToParent: true` filter at the controller works.
6. **Locale walk.** Switch UZ → RU → EN. Title + subtitle + empty-state copy + date format all localize. The teacher's name and the entry content stay as written (user content, not chrome).
7. **Privacy boundary (live spot check).** From DevTools as Hulkar, try `GET /parent/children/<some other UUID>/journal` directly → expect `404 { error.code: 'JOURNAL_NOT_FOUND_FOR_PARENT' }`. The new regression test locks this in code; this is the runtime confirmation.

Reply **"verified phase 1"** → tracker stays 🟡 (`phase-1-done`); arc closes once Phase 2 lands.

### PHASE 2 — multi-parent walk (POST-S4)

After TP-PARENT-ASSIGNMENT closes:
1. Lola's, Bobur's, Shahlo's parents each see ONLY their own child's journal at `/journal`.
2. Teacher writes for any child — only that child's parent sees it.
3. The CRITICAL test (`parentJournal.test.js:1`) is the code-level guarantee; phase 2 confirms it in production.

Reply **"verified phase 2"** → tracker flips ✅. **PP-JOURNAL-FEATURE closes.**

---

## 10. What this leaves on the board

Per S12's close-out note, this was the **last UI-buildable parent item**. After S13 phase-1 lands, all UI work is done and the remaining items are exclusively terminal-gated:

- **S4 TP-PARENT-ASSIGNMENT** — postgres-MCP from the Claude Code terminal (`DEFERRED.md`).
- **Phase-2 re-walks** (PP-ATTENDANCE-SURFACE, PP-CHAT-INTEGRITY, PP-DASHBOARD-CARDS, **PP-JOURNAL-FEATURE**) — all unlock after S4 ships the data fix.

No further UI sessions are queued.
