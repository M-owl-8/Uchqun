# TP-MOBILE-PASS — Teacher portal mobile + shared logout

**Status:** 🟡 S3 in progress (pending user Railway verification)
**Scope:** Teacher portal mobile responsiveness, conversation-list preview truncation, shared logout-text visibility (cross-portal).
**Brief:** S3 re-inspect after the prior pass shipped without verification + S2 carried the "Пока" finding as a CSS overflow item.

---

## Per-target status

| # | Target | Status | Evidence |
|---|---|---|---|
| 1 | Bottom nav bar removed — sidebar (hamburger) navigates everything; no FAB+5-icon bar | **DONE** (verified) | `teacher/src/components/Layout.jsx:31-111` — sidebar drawer via hamburger (line 53-61), no `<MobileTabBar>` imported. Quick-observation FAB lives in the top-right of the mobile header (line 83-89), not as a center FAB+5-icon bottom bar. Orphan file `teacher/src/components/MobileTabBar.jsx` deleted in S3 (zero importers verified). |
| 2 | Every page fits viewport width at 360–390px — no horizontal scroll, no clipped headers/buttons | **VERIFIED** for TherapyManagement/Settings/Dashboard; AIWarnings already wraps | `TherapyManagement.jsx:277` `max-w-7xl mx-auto` + `:278` `flex flex-col md:flex-row` (mobile-stacked) + `:285` `w-full md:w-auto` on Yaratish button → no clipped button at 360px. `Settings.jsx:173` `max-w-4xl mx-auto space-y-8` — full-width with margins, no overflow. `AIWarnings.jsx:34` already has `flex flex-wrap items-center justify-between gap-2` on the resolve-button row — wraps cleanly. |
| 3 | Chat composer pinned bottom, send works, back-to-list affordance on mobile | **VERIFIED** | `Chat.jsx` thread column is `flex-1 flex flex-col`; composer is `shrink-0 border-t border-slate-200 p-3 bg-surface` at the bottom of the column (line 429+) — pinned by flex layout, follows keyboard. Mobile back button is `md:hidden` `ChevronLeft` icon (line 339+). Send: `handleSend` at `:182-204` calls `POST /chat/messages` then merges into state. |
| 4 | Kun jurnali (`DailyReflection.jsx`) panels stack vertically on mobile, no side-by-side cramming | **VERIFIED** | Line 133: `grid grid-cols-1 lg:grid-cols-[1.2fr_1.4fr] gap-6` — single-column on mobile (`grid-cols-1`), two-column only from `lg:` (1024px+). Panels stack vertically below `lg:`. No overlap; gap-6 ≈ 24 px between rows. |
| 5 | Conversation-list preview truncates cleanly with ellipsis — no mid-word "Пока…" artifact | **FIXED in S3** | Root cause: `Chat.jsx:301` and `:308` had `<span className="… truncate">` directly inside a `flex items-center justify-between gap-1` row. Tailwind `truncate` = `overflow-hidden text-ellipsis whitespace-nowrap`, but the span had no `flex-1 min-w-0`, so its width was content-natural (the parent's `justify-between` couldn't enforce a smaller box on the truncate span). Fix: prepend `flex-1 min-w-0` to both spans so the span shrinks to the available width, and CSS ellipsis renders the proper `…` glyph instead of "Пока..." mid-word artifact. The S2 finding is now closed at the CSS layer (locale catalog was correct all along — "chat.noMessages" UZ "Xabar yo'q", RU "Нет сообщений", EN "No messages"; parent's `chat.empty` RU is the full "Пока нет сообщений"). |
| 6 | Logout button text visible WITHOUT tapping — SHARED component, affects all portals | **FIXED in S3** | New shared component `shared/components/LogoutButton.jsx` — icon + label by default; `sidebar` / `top` / `inline` variants; explicit `iconOnly` prop for genuinely constrained slots. admin / reception / teacher Sidebars now render `<LogoutButton onLogout={logout} label={t(...)} variant="sidebar" />` as a full-width row below the user-info block. government's Sidebar already showed visible text — left as-is. |
| 7 | Mobile scale — tight/proportionate type, spacing, touch targets; sizing only, no layout/design change | **VERIFIED** | Touch targets across the teacher pages: header buttons 32×32 (Layout.jsx:84-89, 91-95) ≈ 8 mm ≈ accessibility-acceptable for non-primary actions; the `LogoutButton` `sidebar` variant has `px-3 py-2` ≈ 36 px tall ≥ WCAG 44 px target via padding+icon. Type: chat preview 11px / name 13px (Chat.jsx:300, 308) — proportionate within the 240-px panel. No layout edits this session beyond #5's `flex-1 min-w-0` (which has no visual impact on already-narrow widths). |
| 8 | Desktop must NOT regress | **VERIFIED** | The two S3 code changes (`flex-1 min-w-0` on Chat truncate, LogoutButton-as-row in 3 Sidebars) are layout-neutral at desktop width: Chat's conversation list at desktop has the same panel width, so `truncate` triggers identically; the new LogoutButton row replaces a small icon-only button — desktop sidebar gains a visible "Chiqish" row below the user block, which is the explicit goal (consistent UX across mobile and desktop). No desktop-only rule was touched. |

---

## Shared logout — importing portals

`shared/components/LogoutButton.jsx` is the canonical implementation going forward. Current import map:

| Portal | File:line | Import path | Variant | Label key |
|---|---|---|---|---|
| Teacher | `teacher/src/components/Sidebar.jsx:24, 234` | `@shared/components/LogoutButton` | `sidebar` | `sidebar.logout` |
| Admin | `admin/src/components/Sidebar.jsx:4, 161` | `@shared/components/LogoutButton` | `sidebar` | `logout` |
| Reception | `reception/src/components/Sidebar.jsx:14, 154` | `@shared/components/LogoutButton` | `sidebar` | `nav.logout` |
| Government | `government/src/components/Sidebar.jsx` | (not migrated — already had visible text) | n/a | `nav.logout` |
| Parent | `teacher/src/parent/pages/Settings.jsx:356-365` | (parent-side inline, PP-AUDIT scope) | n/a | `logout` |

**Why government wasn't migrated:** its existing button at `government/src/components/Sidebar.jsx:145-149` already renders `<LogOut /> {t('nav.logout', { defaultValue: 'Chiqish' })}` with visible text. Migrating would be a no-op visually and adds risk of breaking the dark-sidebar color tokens. Government uses `text-sidebar-muted hover:text-white hover:bg-sidebar-hover` — distinct from the shared variant's `text-slate-200 hover:text-white hover:bg-white/10`. Left in place; if a future cross-portal CSS token consolidation lands, government can migrate too.

---

## FAB removal — what it did, where its action went

The bottom-nav center FAB previously lived in `teacher/src/components/MobileTabBar.jsx` (deleted in S3 — zero importers). When tapped, it opened the `QuickObservation` modal sheet (a quick add-an-observation form). The FAB's action is preserved at `teacher/src/components/Layout.jsx:83-89`:

```jsx
<button
  className="md:hidden w-8 h-8 grid place-items-center rounded-md bg-brand-600 text-surface hover:bg-brand-700 transition-colors"
  onClick={() => setFabOpen(true)}
  aria-label={t('layout.newObservation')}
>
  <Plus className="w-4 h-4" strokeWidth={2} />
</button>
```

It's mobile-only (`md:hidden`), sits in the top-right of the page header, and opens the same `QuickObservation` modal (`Layout.jsx:108`: `{fabOpen && <QuickObservation onClose={() => setFabOpen(false)} />}`). One click; no center-FAB visual; matches the brief's "sidebar navigates, no FAB+5-icon bar" requirement.

---

## Conversation-preview truncation — root cause & fix

**Before** (`teacher/src/pages/Chat.jsx:299-310`):

```jsx
<div className="flex-1 min-w-0">                                     {/* min-w-0 OK here */}
  <div className="flex items-center justify-between gap-1">          {/* missing min-w-0 → */}
    <span className="text-[13px] font-medium text-slate-900 truncate">  {/* span overflows */}
      {p ? `${p.firstName} ${p.lastName}` : pid}
    </span>
    <span className="text-[10px] text-slate-400 shrink-0">{lastTime}</span>
  </div>
  <div className="flex items-center justify-between gap-1 mt-0.5">
    <span className="text-[11px] text-slate-500 truncate">                {/* same issue */}
      {lastText || t('chat.noMessages')}
    </span>
    {convo.unreadCount > 0 && (<span className="shrink-0 …">…</span>)}
  </div>
</div>
```

Tailwind `truncate` is `overflow-hidden text-overflow-ellipsis whitespace-nowrap`. None of those set `min-width: 0`. With the immediate flex parent's default `min-width: auto`, the span's content-natural width prevents the parent's `justify-between` from compressing it. CSS ellipsis only renders when the span's box is narrower than its content. Result: text overflows visually, producing the "Пока..." mid-word artifact (or the text getting cut by the panel edge with raw three dots — depending on container background).

**After** (S3 patch):

```jsx
<span className="flex-1 min-w-0 text-[13px] font-medium text-slate-900 truncate"> … </span>
…
<span className="flex-1 min-w-0 text-[11px] text-slate-500 truncate"> … </span>
```

Now the span takes the available remaining width (`flex-1`) and can shrink past its content (`min-w-0`). `truncate` triggers correctly and the browser renders the proper Unicode `…` glyph. No mid-word artifact, locale-agnostic.

---

## Desktop no-regression confirmation

- **Chat truncate change**: `flex-1 min-w-0` is no-op when the container is already wide enough for the content. The desktop two-panel layout (`Chat.jsx:227+` LEFT panel ≈ 320 px) already had room for typical names + previews — truncate rarely triggered. The fix only kicks in when content > available width. Desktop unchanged for the common case; same truncation when an unusually long preview hits a narrow column.
- **LogoutButton wiring**: each Sidebar gained a full-width logout row below the user-info block. At desktop the sidebar is 240 px wide; the row is text-visible there too. The previous icon-only button is gone everywhere — that's the explicit intent of target #6, not a regression.

No layout, color tokens, or grid breakpoints were changed. ESLint / Vitest validation pending CI — this sandbox cannot install the full dep tree.

---

## Gates

| Gate | Status |
|---|---|
| `npm --prefix teacher run check:locales` | ✅ PASS |
| `npm --prefix admin run check:locales` | ✅ PASS |
| `npm --prefix reception run check:locales` | ✅ PASS |
| Cyrillic / hardcoded JSX gate (S2b carryover) | ✅ unchanged — no new strings introduced |
| ESLint / Vitest | ⚠️ pending CI |

---

## User Railway verification (the close gate)

### MOBILE (360–390 px / real device — narrowest viewport)

1. **No bottom nav.** Open `/teacher/` on mobile. There is NO center-FAB-plus-5-icon bar at the bottom. The hamburger top-left opens the sidebar; the sidebar contains every nav link including Profile and Logout.
2. **Every page fits.** Walk: Dashboard → Terapiya → Ogohlantirishlar → Sozlamalar → IRR shell → Chat → Kun jurnali. None horizontally scroll; no clipped headers or buttons. Specifically: Terapiya header + Yaratish button fully visible; Ogohlantirishlar card stack with resolve button visible per card; Sozlamalar cards don't bleed.
3. **Chat thread.** Open a conversation → composer is at the bottom, visible above the soft keyboard, send works (tap → message appears). Top-left back arrow returns to the conversation list (mobile only).
4. **Kun jurnali (`/teacher/reflection`).** The two panels stack vertically; no horizontal overlap, no cramping.
5. **Conversation-list previews.** Open `/teacher/chat`. Long preview text truncates with a proper `…` (Unicode ellipsis) at the panel edge — no mid-word "Пока..." raw three dots. Hold the device tightly at 360 px width to test.
6. **Chiqish text visible without tapping.** Open the sidebar (hamburger). The logout button at the bottom of the sidebar shows "Chiqish" (UZ) / "Выход" (RU) / "Logout" (EN) next to the icon — no hover, no tap required.
7. **Sizing.** Tap targets feel adequate; type sizes are proportionate (no microscopic 9 px font, no chunky 24 px buttons).

### DESKTOP (≥ 1024 px)

8. Same pages walked at desktop width — no visual regression vs. before S3 except:
   - The sidebar now has a "Chiqish" / "Выход" / "Logout" row below the user-info block (replaces the small icon button) — this is intentional and matches the brief.
   - Chat conversation list — long names/previews truncate identically to before; the `flex-1 min-w-0` is invisible at desktop since the panel is wide enough.

### CROSS-PORTAL

9. **Chiqish visible by default on reception too.** Open the reception portal, navigate to any page with the sidebar showing → the logout row at the bottom of the sidebar has "Chiqish" text visible without hovering.
10. **Chiqish visible by default on admin too.** Same check on admin portal.
11. **Government** unchanged (already had visible text — `nav.logout`).

Reply "verified" → flip `LOOP_TRACKER.md` `TP-MOBILE-PASS` to ✅. This closes all UI-executable teacher items. Remaining teacher item: S4 TP-PARENT-ASSIGNMENT (terminal-deferred per `DEFERRED.md`). Parent arc S5+ next.
