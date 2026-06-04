# CLEANUP-06-SIDEBAR-SCROLL

**Status:** 🟡 Code complete — awaiting user Railway verification  
**Scope:** Sidebar overflow chrome — thin scrollbar for short viewports  
**Commit:** `079a1af`

---

## STEP 1 — Current overflow CSS state (before fix)

### Admin sidebar
- Nav container: `admin/src/components/Sidebar.jsx:181`
  ```jsx
  <nav className="px-3 flex-1 overflow-y-auto space-y-5">
  ```
- No custom scrollbar CSS in `admin/src/index.css`
- No Tailwind scrollbar plugins (`tailwind.config.js` → `plugins: []`)
- **Result:** Default browser scrollbar — 15px wide on Windows (shifts content left), thin overlay on macOS

### Government sidebar  
- Nav container: `government/src/components/Sidebar.jsx:169`
  ```jsx
  <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
  ```
- No custom scrollbar CSS in `government/src/index.css`
- Same default browser scrollbar issue

### Mobile drawer
- Admin Layout.jsx: both desktop (`fixed inset-y-0`) and mobile drawer (`fixed inset-y-0`) use the same `<Sidebar />` component
- The sidebar's `flex flex-col h-full` fills the drawer which is `inset-y-0` = full viewport height
- Mobile drawer gets the same scrollbar fix automatically via the shared component

---

## STEP 2 — Viewport math at multiple heights

Admin sidebar total height: **~810px** (from CLEANUP-05 math).  
Government sidebar total height: **~548px** (8 nav items + lockup h-16 + lang dropdown + user card).

| Viewport | Browser chrome ~80px | Usable height | Admin fits? | Gov fits? |
|---|---|---|---|---|
| 1080px | 1000px | ✅ Comfortable | ✅ 810px < 1000px | ✅ 548px |
| 900px | 820px | ⚠️ Marginal | ✅ 810px < 820px (barely) | ✅ 548px |
| 768px | 688px | ❌ Scroll needed | ❌ 810px > 688px | ✅ 548px |
| 720px | 640px | ❌ Scroll needed | ❌ 810px > 640px | ✅ 548px |
| Mobile (drawer) | varies | often scroll | ❌ may need scroll | ❌ may need scroll |

**Government sidebar never needs scroll** at any standard laptop viewport — 548px is well under even 688px.  
**Admin sidebar needs scroll** at ≤768px. When scroll appears, the previous default chrome (15px wide on Windows) was visually intrusive.

---

## STEP 3 — Fix applied

Added `.sidebar-scroll` CSS class to both portals' `index.css`:

```css
.sidebar-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.15) transparent;
}
.sidebar-scroll::-webkit-scrollbar { width: 4px; }
.sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
.sidebar-scroll::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.15);
  border-radius: 2px;
}
.sidebar-scroll::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.3);
}
```

Applied `sidebar-scroll` to nav containers in both portals:
- `admin/src/components/Sidebar.jsx:181` — added to `<nav className="... sidebar-scroll">`
- `government/src/components/Sidebar.jsx:169` — added to `<nav className="... sidebar-scroll">`

**Effect when no scroll needed (≥900px):** Zero visual change — no scrollbar appears.  
**Effect when scroll needed (<768px):** 4px wide, near-transparent white thumb (15% opacity), invisible track. Hover: thumb brightens to 30% opacity. No horizontal space stolen from nav content.

---

## STEP 4 — Cross-portal consistency

Both admin and government sidebars now use identical scrollbar chrome styling. The `.sidebar-scroll` class is defined in each portal's own `index.css` (not a shared file — portals don't share CSS). The values are identical.

Reception and teacher sidebars were not changed (out of scope — their sidebars have different designs and the session is admin + government only).

---

## STEP 5 — Mobile drawer behavior

**Admin:** Both desktop and mobile drawer use `<Sidebar onClose={...} />` with the same component. The nav element inside gets `sidebar-scroll` automatically. Mobile drawer is `fixed inset-y-0` so it fills the viewport; nav `flex-1 overflow-y-auto` fills remaining height. Fix applies.

**Government:** Same pattern — mobile drawer renders `<Sidebar onClose={() => setSidebarOpen(false)} />`. Fix applies.

No separate drawer-specific overflow changes needed.

---

## STEP 6 — Test and build results

| Portal | Tests | Build |
|---|---|---|
| Admin | ✅ 30/30 · 162/162 | ✅ built in 7.65s |
| Government | ✅ 17/17 · 124/124 | ✅ built in 8.29s |

No test changes needed — CSS-only fix, no behavioral change.

---

## STEP 7 — Commit

Commit: `079a1af`  
Message: `style(sidebar): clean overflow chrome for short viewports — thin subtle scrollbar across admin + government`  
Pushed to `origin/main`. Railway auto-deploy triggered.

---

## STEP 8 — User Railway verification (REQUIRED before close)

### Standard viewport (1080px)
1. Open admin portal on Railway at normal laptop resolution
2. Sidebar has **no scrollbar visible** — all 10 nav items + Settings link + lang dropdown + user card visible
3. Same check on government portal

### Short viewport test
1. Browser DevTools → Responsive mode → set height to **768px** (e.g., 1366×768 preset)
2. Admin sidebar: scroll should be possible, scrollbar should be **thin (4px), subtle, low-contrast** — not the fat default browser chrome
3. If you resize back to full height, scrollbar disappears

### Mobile drawer
1. DevTools → mobile width (e.g., 390px)
2. Tap hamburger → sidebar drawer opens full height
3. Scroll within drawer if content exceeds height — should be the same thin scrollbar

Reply "verified" with:
- Screenshot at 1080px (no scrollbar)
- Screenshot at 768px (thin scrollbar if visible, or confirm no scroll needed)

---

## STEP 9 — Honest count

| Item | Status |
|---|---|
| Current overflow CSS documented | ✅ overflow-y-auto, no custom chrome in either portal |
| Viewport math at multiple heights | ✅ Admin needs scroll <768px; Gov never needs scroll at laptop viewports |
| Awkward chrome found and fixed | ✅ `.sidebar-scroll` class — 4px thin, rgba thumb |
| Cross-portal consistency (admin + gov) | ✅ Identical CSS in both index.css files |
| Mobile drawer overflow clean | ✅ Same Sidebar component, fix automatic |
| Tests passing | ✅ Admin 162/162 · Gov 124/124 |
| Build clean | ✅ Both portals |
| User Railway verification | ⏳ pending |

---

## Incidental observations

1. **Government sidebar never needs scroll** at any standard laptop viewport (548px total height) — the fix is precautionary for government but correct to apply for consistency and future-proofing if more nav items are added.

2. **Admin sidebar at 900px is marginal** — 810px sidebar vs ~820px usable height. The 10px headroom means it likely fits at 900px in practice (browser chrome can be less than 80px on some setups), but scroll may appear depending on exact browser configuration.

3. **The standalone Sozlamalar NavItem is outside the scrollable nav** — it's in a separate `<div className="px-3 pt-2 pb-1 border-t border-walnut-divider">` after `</nav>`. This means Settings is always pinned at the bottom and doesn't scroll away even on short viewports. Lang dropdown and user card are similarly pinned. Only the 10 primary nav items scroll.

4. **Reception and teacher sidebars** also have `overflow-y-auto` nav containers without custom scrollbar chrome. Not in scope for this session but would benefit from the same treatment.
