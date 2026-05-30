# PROD-READINESS-05-S1 — Government Portal Verification

**Date:** 2026-05-30  
**Status:** ✅ COMPLETE  
**Method:** Live Playwright screenshots against production Railway URL  
**App:** `https://government-production.up.railway.app`  
**Account:** `gov.republic@uchqun.uz` (republic/main — highest scope)  
**Screenshots:** `audits/prod-readiness/screenshots/government-s1/`

---

## Objective

Close the 7 🟡 (unverified) items in `features-government.md` (G-026, G-027, G-028, G-050, G-060, G-061, G-063) by rendering each in the live government portal and capturing screenshots. No fixes in this session — honest verdicts only.

---

## Route discovery fix

Initial script failure: all routes (`/schools`, `/ratings`, etc.) returned 404. Root cause: routes are prefixed `/government/` (e.g., `/government/ratings`). Confirmed by reading `government/src/App.jsx`. Login page is `/login` (unauthenticated), all authenticated routes under `/government/**`.

---

## Per-item Verdicts

### G-026 — Load more parent ratings (pagination)
**Verdict: 🟡 DATA-BLOCKED**

- Code path: `Ratings.jsx:224` — "Load more" button renders only when `page < totalPages`
- `Ratings.jsx:158` — expand button renders only when `ratingsCount > 0`
- Live state: **0 parent ratings** in staging DB (`Jami baholar: 0`, all 4 schools show `0.0 (0 baholar)`)
- No expand button rendered; no load-more button reachable
- **Code is correct** — logic, API call (`GET /government/ratings/:schoolId?page=N&limit=10`), and button are all implemented; blocked purely by lack of staging data

**Screenshot:** `G-026-ratings-page.png`, `ref-ratings-full.png`

---

### G-027 — Rate school (government direction) with indicators
**Verdict: ❌ NO FRONTEND UI**

- Backend: `POST /government/schools/:id/rate` fully implemented in `governmentSchoolRatingController.js:22` (5 indicators, period validation, upsert per `govUserId+schoolId+period`)
- Frontend: `Ratings.jsx` only fetches and renders parent-direction ratings (`GET /government/ratings`)
- `SchoolDetail.jsx` confirmed — no "rate this school" button or form exists
- No React component exists to render the government rating form
- **This is a backend-built / frontend-missing gap — not a bug fix, requires new UI work**

**Screenshot:** `G-027-G-028-ratings-full.png`

---

### G-028 — View government ratings for school (separate from parent ratings)
**Verdict: ❌ NO FRONTEND UI**

- Backend: `GET /government/ratings?direction=gov` endpoint exists (`governmentSchoolRatingController.js:100`)
- Frontend: `Ratings.jsx` only calls `GET /government/ratings` (parent direction, no `direction` param)
- No direction toggle, tab, or dropdown in `Ratings.jsx`
- No separate page/component for government-direction ratings
- **Same gap as G-027 — backend complete, frontend not built**

**Screenshot:** `G-027-G-028-ratings-full.png`

---

### G-050 — Provision secondary with capability grants
**Verdict: ✅ WORKING**

- Navigation path: `/government/platform` → "Davlat foydalanuvchilari" tab (tab index 2)
- Form is inline (not a modal); "Hisob Turi" dropdown has `Asosiy (to'liq kirish)` and `Ikkinchi darajali (ruxsat asosida)`
- Selecting `Ikkinchi darajali` (value = `"secondary"`) triggers conditional render at `GovernmentTab.jsx:423`
- **12 capability checkboxes** rendered via `CAPABILITY_KEYS.map()` (GovernmentTab.jsx:430–444):
  - Maktablarni Ko'rish, Maktablarni Arxivlash, Reytinglarni Ko'rish, canRateSchools*, Audit Jurnalini Ko'rish, O'quvchilarni Ko'rish, O'qituvchilarni Ko'rish, Ota-onalarni Ko'rish, Adminlarni Boshqarish, Davlat Foydalanuvchilarini Boshqarish, Xabarlarni Ko'rish, Ro'yxatga Olishlarni Boshqarish
- *`canRateSchools` label missing from i18n catalog — rendered as raw key. Minor i18n gap, not blocking.
- `govAccessGrants` sent as part of POST payload only when `type === 'secondary'` (GovernmentTab.jsx:87)

**Screenshot:** `G-050-type-secondary-checkboxes.png`, `G-050-government-tab.png`

---

### G-060 — Filter audit log by date range
**Verdict: ✅ WORKING**

- Navigation: `/government/audit-log`
- "Boshlanish sanasi" and "Tugash sanasi" date inputs visible — confirmed by `data-testid="filter-start-date"` and `data-testid="filter-end-date"` (AuditLog.jsx:157, 170)
- Action filter dropdown ("Barcha harakatlar"), Entity filter dropdown ("Barcha ob'ektlar") also visible
- "Filtrlash" button (`data-testid="apply-filters"`) triggers re-fetch with date params appended to query string
- Inputs filled with `2026-01-01` / `2026-12-31` and filter applied — no errors (0 results, empty state shown correctly)

**Screenshot:** `ref-audit-log-full.png`, `G-060-date-filter-applied.png`

---

### G-061 — Paginate audit log
**Verdict: 🟡 DATA-BLOCKED**

- Code path: `AuditLog.jsx:248` — `{totalPages > 1 && (pagination div)}` — pagination is conditional
- Live state: **0 audit entries** in staging DB — "Yozuvlar topilmadi" empty state shown
- `totalPages = 1` (or 0), so pagination buttons (`data-testid="prev-page"`, `data-testid="next-page"`) never render
- **Code is correct** — ChevronLeft/Right buttons, page indicator, disabled states all implemented; blocked purely by lack of staging data

**Screenshot:** `ref-audit-log-full.png`

---

### G-063 — Filter warnings by severity
**Verdict: ❌ NOT BUILT**

- `AIWarnings.jsx` has two filter tabs: "Faol" (active) and "Hal qilingan" (resolved) — lines 191–205
- `SEVERITY_META` at lines 12–17 defines badge styles for `critical/high/medium/low` — used only for visual display in `WarningCard`
- No severity filter dropdown, select, or tab exists anywhere in the component or its dependencies
- Filtering by severity was likely planned alongside the severity badges, but the filter control was not implemented
- **This is a frontend-not-built gap**

**Screenshot:** `ref-warnings-full.png`, `G-063-warnings-page.png`

---

## Summary

| ID | Feature | Verdict | Reason |
|---|---|---|---|
| G-026 | Load more parent ratings | 🟡 DATA-BLOCKED | Code correct; 0 ratings in staging DB |
| G-027 | Gov direction rating form | ❌ NOT BUILT | Backend complete; no frontend UI |
| G-028 | Gov ratings separate view | ❌ NOT BUILT | Backend complete; no frontend UI |
| G-050 | Secondary capability grants | ✅ WORKING | 12 checkboxes render on secondary type |
| G-060 | Audit log date range filter | ✅ WORKING | Both inputs visible, filter functional |
| G-061 | Audit log pagination | 🟡 DATA-BLOCKED | Code correct; 0 audit entries in staging DB |
| G-063 | Warnings severity filter | ❌ NOT BUILT | Only active/resolved tabs; no severity filter |

**Counts:** ✅ 2 verified · 🟡 2 data-blocked · ❌ 3 not built

---

## Pre-launch implications

| Item | Pre-launch blocking? | Action needed |
|---|---|---|
| G-027 (gov rating form) | Yes — canRateSchools capability useless without UI | Build React rating form in SchoolDetail or separate route |
| G-028 (gov ratings view) | Yes — government users can't see their own ratings | Add direction toggle to Ratings.jsx or new sub-route |
| G-063 (severity filter) | No — severity badges still visible, filter is convenience | Add severity select to AIWarnings.jsx filter row |
| G-026 (load-more) | No — code correct; seed parent ratings to verify | Seed 11+ ratings for one school before demo |
| G-061 (pagination) | No — code correct; seed audit entries to verify | Perform gov actions to generate audit log entries |
| G-050 (i18n: canRateSchools) | Minor — one capability key renders as raw string | Add `provision.grants.canRateSchools` to all i18n files |

---

## `features-government.md` updates applied

- G-026: 🟡 → 🟡 (label clarified: DATA-BLOCKED)
- G-027: 🟡 → ❌ (NO FRONTEND UI)
- G-028: 🟡 → ❌ (NO FRONTEND UI)
- G-050: 🟡 → ✅ (VERIFIED, 12 checkboxes)
- G-060: 🟡 → ✅ (VERIFIED, date inputs working)
- G-061: 🟡 → 🟡 (label clarified: DATA-BLOCKED)
- G-063: 🟡 → ❌ (NOT BUILT)

New totals: **✅ 67 · 🟡 2 · ❌ 3 · 🚧 0**

**PROD-READINESS-05-S1 = ✅**
