# TP-AUTH-STAR-REMOVE — Remove Star Glyph from Teacher/Parent Auth Brand Panel

**Status:** ✅ Built + pushed — awaiting user Railway verification  
**Branch:** `main`  
**Commit:** `c0a59d3`  
**Delta on:** TP-AUTH-SPLIT (`0b8f7c7`)

---

## What changed

Removed the `StarGlyph` component and its single render call from
`teacher/src/pages/Login.jsx`. The left brand panel is now flat dark
(`#2A2530`) — no decorative overlay, matching the platform standard
established by reception, admin, and government portals.

**Lines removed:** 13 (component declaration) + 1 (`<StarGlyph />` call site) + blank line = 15 lines net deleted.

Nothing else touched: copy blocks, role toggle, form, LanguageSwitcher, and all locale keys are pixel-identical to TP-AUTH-SPLIT.

---

## Files changed

| File | Change |
|------|--------|
| `teacher/src/pages/Login.jsx` | Removed `StarGlyph` component + call site (−15 lines) |
| `LOOP_TRACKER.md` | TP-AUTH-STAR-REMOVE → 🟡 |

---

## Build

- **Build:** ✅ `vite build` green — 17.15s, no errors

---

## User verification checklist

1. Hard refresh → left panel is flat dark `#2A2530`, no star/glyph anywhere
2. Everything else pixel-identical to TP-AUTH-SPLIT: role toggle, form, footer all present

Reply "verified" to close TP-AUTH-STAR-REMOVE.
