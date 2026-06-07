# Beta Defect Log
**S14 / BETA-VERIFICATION**
**Opened:** 2026-06-08
**Rule:** DO NOT FIX here — find, record, classify only. Fixes are follow-up sessions.

## Severity Scale
- **P0** — Blocks a task entirely (user cannot proceed)
- **P1** — Wrong or confusing (user proceeds with incorrect information or unexpected behaviour)
- **P2** — Will break: fragility, slow >3s response, console errors, data inconsistency

## Template
```
### DEF-NNN — [Title]
- **Severity:** P0 / P1 / P2
- **Persona:** role + account
- **Portal:** Teacher / Parent / Admin / Reception / Government
- **Wave:** 1–6
- **Feature ID:** T-xxx / P-xxx / A-xxx / R-xxx / G-xxx
- **Repro:**
  1. Step 1
  2. Step 2
- **Expected:** what should happen
- **Actual:** what happens instead
- **Screenshot:** screens/DEF-NNN-*.png
- **Console errors:** (paste or "none")
- **Network:** (relevant API call + status code)
- **Suspected layer:** Frontend / Backend / Data / Config
```

---

## Pre-Test Known Issues (from STEP 0 matrix)

### DEF-001 — Teacher count: only 8 teacher accounts, spec requires 16
- **Severity:** P1
- **Persona:** Test infrastructure
- **Wave:** 2
- **Feature ID:** F-001 (scope finding)
- **Detail:** Only teacher1–teacher8 exist in Railway DB. The Wave-2 "other 8 teachers run attendance + one content action" sub-wave cannot execute. All 8 seeded teachers will run full days instead. Seeder needs to add teacher9–teacher16 before next beta cycle.
- **Suspected layer:** Data (seeder gap)

### DEF-002 — School 1 has no groups seeded
- **Severity:** P1
- **Persona:** reception1 (S1)
- **Wave:** 1
- **Feature ID:** F-002 (scope finding)
- **Detail:** School 1 children exist but are unassigned to any group. Reception1 must create a group as the first Wave-1 step. If group creation (R-052) fails, Wave-1 child onboarding for S1 is blocked (P0 cascade).
- **Suspected layer:** Data (seeder gap)

### DEF-003 — P-011: Parent Sidebar.jsx — dead code, never rendered
- **Severity:** P1
- **Persona:** parent (all)
- **Wave:** 3
- **Feature ID:** P-011
- **Detail:** Sidebar.jsx is implemented with 10 items, badges, and footer but is NOT imported in Layout.jsx. It is dead code that will never render.
- **Suspected layer:** Frontend

### DEF-004 — G-050: canRateSchools i18n key missing
- **Severity:** P1
- **Persona:** gov.republic (provisioning secondary users)
- **Wave:** 6
- **Feature ID:** G-050
- **Detail:** `provision.grants.canRateSchools` is missing from UZ/RU/EN locale files. The capability checkbox label renders as the raw key string.
- **Suspected layer:** Frontend (i18n)

---

## Wave 1 Defects (Reception)
<!-- Populated during testing -->

## Wave 2 Defects (Teacher)
<!-- Populated during testing -->

## Wave 3 Defects (Parent)
<!-- Populated during testing -->

## Wave 4 Defects (Admin)
<!-- Populated during testing -->

## Wave 5 Defects (Region Gov)
<!-- Populated during testing -->

## Wave 6 Defects (Republic Gov)
<!-- Populated during testing -->

## Cross-Cutting Defects (Step 2)
<!-- Language, session, refresh, double-submit, empty-state, upload error -->

## Tenant Isolation Defects (Step 3)
<!-- Any isolation breach found during hostile probes -->
