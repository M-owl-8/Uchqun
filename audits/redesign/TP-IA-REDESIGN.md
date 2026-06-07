# TP-IA-REDESIGN — teacher portal 5-tab reshape

**Status:** ✅ CLOSED
**Date:** 2026-06-07
**Trigger:** User feedback after the parent portal redesign — "easy for me to get and understand parent role now. But teacher a little bit confusing and not clear." Same playbook as PP-IA-REDESIGN.

---

## What changed

The teacher portal had an 11-item left sidebar with 4 sections. Names didn't match content ("Goals" = monitoring journals; "Observations" = individual plan), the IRR was buried 4 taps deep, and the sidebar paradigm didn't match the parent's mobile-first 5-tab IA.

Now: same 5-tab structural pattern as parent, mobile-first, IRR reachable in one tap from any child card, and the daily monitoring bulk-fill view (Q3) is shipped in the same commit.

```
┌──────────┬───────────┬───────────┬──────────┬──────────┐
│   🏠     │    👥     │    📋     │    💬    │    👤    │
│  Bugun   │  Bolalar  │   Reja    │  Xabar   │   Men    │
│  Today   │ Children  │   Plan    │ Messages │   Me     │
└──────────┴───────────┴───────────┴──────────┴──────────┘
```

Top-right on every screen: quick-observation FAB (`+`), notification bell (badge = unresolved AI warnings), and on desktop a Settings shortcut.

## Where every old destination went

| Old sidebar item | New home |
|---|---|
| Dashboard | Tab 1 — Bugun (unchanged content, served as `/teacher`) |
| Davomat (Attendance) | Per-feature route preserved at `/teacher/attendance`; surfaced from Bugun + Bolalar cards |
| Ota-onalar (Parents) | Tab 2 — Bolalar (now child-centric, with rich per-child status cards). `/teacher/parents` redirects to `/teacher/bolalar`. |
| Galereya (Media) | `/teacher/media` preserved; surfaced from Bugun + per-child views |
| Taomlar (Meals) | `/teacher/meals` preserved; surfaced from Bugun + per-child views |
| Goals (Daily monitoring) | `/teacher/monitoring` preserved + **new bulk-fill view** (Q3) |
| Observations (= Individual reja) | Tab 3 — Reja → sub-tab Individual reja. Old `/teacher/activities` redirects. |
| Terapiya | Tab 3 — Reja → sub-tab Terapiya. Old `/teacher/therapy` redirects. |
| Ogohlantirishlar (AI warnings) | Tab 4 — Xabar → sub-tab Ogohlantirishlar. Old `/teacher/warnings` redirects. |
| Chat | Tab 4 — Xabar → sub-tab Suhbat. Old `/teacher/chat` redirects. |
| Profile | Tab 5 — Men → sub-tab Profil. Old `/teacher/profile` redirects. |
| Settings | Tab 5 — Men → sub-tab Sozlamalar. Old `/teacher/settings` redirects. |
| Daily Reflection | Tab 5 — Men → sub-tab Kunlik mulohaza. Old `/teacher/reflection` redirects. |
| Logout | Tab 5 — Men, always-visible inline button beneath the sub-tab content |

Per-child surfaces (`/teacher/children/:id`, `/teacher/children/:id/irr`) remain as deep links.

## Files shipped (12)

```
A teacher/src/components/TeacherTopNav.jsx
A teacher/src/components/TeacherMobileTopBar.jsx
A teacher/src/components/TeacherMobileTabBar.jsx
A teacher/src/components/MonitoringBulkFill.jsx     (Q3 — bulk-fill modal)
A teacher/src/pages/Bolalar.jsx                     (rich child cards)
A teacher/src/pages/Reja.jsx                        (Activities + Therapy sub-tabs)
A teacher/src/pages/Xabar.jsx                       (Chat + Warnings sub-tabs)
A teacher/src/pages/Men.jsx                         (Profile + Settings + Reflection + Logout)
M teacher/src/components/Layout.jsx                 (uses new shell; sidebar gone)
M teacher/src/App.jsx                               (new routes + 9 redirects for old paths)
M teacher/src/pages/MonitoringJournal.jsx           (bulk-fill button + modal mount)
D teacher/src/components/Sidebar.jsx                (deleted — was the old shell)
D teacher/src/__tests__/pages/SidebarPolling.test.jsx (deleted — sidebar gone)
M teacher/src/locales/{uz,en,ru}/common.json        (+15 keys × 3 langs = 45 entries)
```

Net: 8 new files / 1 component-delete / 1 test-delete / 4 modified.

## Three Q&A decisions from the design proposal

| Question | Decision | Implementation |
|---|---|---|
| **Q1.** Where do AI warnings sit — Xabar sub-tab or Bugun banner? | Xabar sub-tab + top-right bell badge (count) on every screen | `Xabar.jsx` mounts the existing `AIWarnings` component as `?tab=warnings`. Bell on `TeacherMobileTopBar` + `TeacherTopNav` deep-links to it. |
| **Q2.** Rich Bolalar cards (per-child today snapshot) or minimal? | Rich | `Bolalar.jsx` fetches per-child stats in parallel: attendance status today, eaten/total meals today, latest IRR aggregate + trend arrow, unresolved warning count. Failures fail open (card shows baseline). |
| **Q3.** Bulk daily-monitoring view — now or defer? | NOW | `MonitoringBulkFill.jsx` opens a modal listing every child, each with the 9 emotional-monitoring criteria as a checkbox row. Per-row "select all"/"unselect all". Save button POSTs one record per child via `Promise.allSettled`. Partial-failure summary toast tells the teacher which rows didn't save. |

## What this clears up (teacher's mental model)

| Old problem | After |
|---|---|
| Sidebar overcrowded — 11 items, 4 sections | 5 mobile tabs + 1 secondary (Settings) on desktop top-nav |
| Labels don't say what pages do ("Goals" = monitoring; "Observations" = individual plan) | "Reja → Individual reja" = same name parents see · "Reja → Terapiya" · "Xabar → Suhbat / Ogohlantirishlar" — vocabulary cross-portal-consistent |
| IRR buried 4 taps deep | Bolalar tab → tap child card → IRR is a primary CTA on `/teacher/children/:id` |
| Daily monitoring is 9 children × 27 modal opens / day | Bulk-fill button opens one modal with every child in a vertical list. "Select all" on a row covers all 9 criteria for that child. Save = parallel POSTs. |
| Inconsistent visual identity vs parent portal | Same 5-tab pattern, same top-right bell, same sticky mobile header, same vocabulary |

## Cross-portal parity (now)

```
PARENT:    Bugun · Kundalik  · Galereya  · Xabar    · Bola
TEACHER:   Bugun · Bolalar   · Reja      · Xabar    · Men
```

- Both portals: 5 tabs, bottom on mobile, top on desktop
- Both portals: brand mark + role label top-left, notification bell top-right
- Both portals: tab 4 is "Xabar" (messages) with sub-tabs
- Both portals: tab 5 is the user's own surface (Bola = child / Men = self)
- Both portals: sticky `<header>` on mobile, sticky `<nav>` on desktop

## What's NOT in scope for this commit

These were intentionally left for follow-ups:
- Renaming the page-level title strings of legacy pages (e.g. MonitoringJournal still uses `monitoring.title` which is "Goals"). The IA shell is renamed; legacy page internals stay labeled as-is until they're refactored under their own session.
- Token unification — teacher portal still uses purple lavender (`brand-*`) and the parent portal uses warm (`p-*`). Both palette systems are correct for their portals — the cross-portal `bg-paper` shell colour matches.
- Deleting the `ParentManagement.jsx` page file — the route is redirected but the file is still on disk for safety (post-beta cleanup).
- Per-child detail page (`ChildDetail`) surface improvements — IRR is reachable from there but the page itself hasn't been restyled this session. Schedule as TP-CHILDDETAIL post-beta.

## Verification

- ✅ Teacher vite build clean (1925 modules, 3.96s; bundle 942 KB / 258 KB gzip)
- ✅ ESLint clean across `src/`
- ✅ `npm run check:locales` passes — 859 → ~874 keys, all 3 languages in sync (+15 new keys × 3 langs from this commit)
- ✅ 41/41 focused tests pass (parentDesignSystem + PrivacyConsentModal + MessageModal + ChildProfile)
- ✅ No backend changes — pure frontend reorganization

## What the teacher will see when Railway redeploys

1. **Reload `/teacher`** → cream bg, top-right bell, top-nav (desktop) or empty top + 5-tab bar (mobile)
2. Tap **Bolalar** → grid of child cards, each with today's attendance / meals / IRR trend / warnings — scan the whole group in 2 seconds
3. Tap any child → ChildDetail → IRR is a primary CTA at the top
4. Tap **Reja** → sub-tabs: Individual reja + Terapiya. The "Observations" sidebar item is gone; it lives here now under its real name.
5. Tap **Xabar** → sub-tabs: Suhbat + Ogohlantirishlar. Two attention surfaces in one place.
6. Tap **Men** → Profile / Settings / Daily Reflection sub-tabs with always-visible logout
7. On `/teacher/monitoring` → new "Hammasini birga to'ldirish" button opens the bulk-fill modal. Tick what applies for each child. Save once.

Old deep-link URLs (`/teacher/parents`, `/teacher/activities`, `/teacher/chat`, etc.) still work — they `<Navigate replace>` to the new IA without breaking anyone's bookmarks or email links.
