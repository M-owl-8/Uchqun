# Government Portal — Phase 2 Overhaul

## Status Legend: [ ] todo · [x] done · [-] skipped

---

## REMOVE

- [x] R1: Delete `Students.jsx`, remove route + nav item, fix Dashboard stat card
- [x] R2: Delete `Teachers.jsx`, remove route + nav item, fix Dashboard stat card
- [x] R3: Delete `Parents.jsx`, remove route + nav item, fix Dashboard stat card
- [x] R4: Remove Stats Generation UI (keep GET stats, remove POST generate UI)
- [x] R5: Remove Schools tab from Platform page
- [x] R6: Remove Dashboard quick-links right-rail sidebar

---

## POLISH

- [x] P1: Dashboard stat cards — remove dead navigation to removed pages; filter admin table to pending only
- [x] P2: SchoolDetail — remove placeholder occupancy/docApproval metric cards
- [x] P3: Settings — email-cannot-change note already present; confirmed done
- [x] P4: Language switcher — added to mobile Layout header

---

## ADD — Tier 1

- [x] A1: Dashboard KPI — active warnings card (navigates to /warnings, red highlight when >0)
- [x] A2: Dashboard regional breakdown table (client-side computed from schools data)
- [-] A3: Compliance alerts widget — deferred (requires new backend queries)
- [x] A4: CSV export on Schools page (client-side, exports filtered data)
- [x] A5: AI Warnings page — new /government/warnings route with KPI strip, filter tabs, resolve action

---

## ADD — Tier 2

- [ ] B1: Student enrollment trend chart (monthly growth)
- [ ] B2: School Detail deep stats (student count, teacher count, warnings, rating trend)
- [ ] B3: Teacher/specialist coverage stats

---

## FINAL VALIDATION

- [x] Run `npm test` in backend — 17/17 pass (adminUser suite)
- [x] Run `npm test` in government — 52/52 pass (5 test files)
- [x] E2E production test against Railway — 11/11 pass (login + 10 endpoints)
- [x] Code quality review — no dead imports, no dead routes, no dead nav items
