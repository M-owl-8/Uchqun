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
- [ ] P3: Settings — add note that email cannot be changed
- [ ] P4: Language switcher — move to Layout header (system-wide access)

---

## ADD — Tier 1

- [ ] A1: Dashboard KPI cards — active warnings, pending registrations, avg rating, schools with no ratings
- [ ] A2: Dashboard regional breakdown table (schools by region with counts + avg rating)
- [ ] A3: Compliance alerts widget on Dashboard
- [ ] A4: CSV export on Schools page
- [ ] A5: AI Warnings section visible to government

---

## ADD — Tier 2

- [ ] B1: Student enrollment trend chart (monthly growth)
- [ ] B2: School Detail deep stats (student count, teacher count, warnings, rating trend)
- [ ] B3: Teacher/specialist coverage stats

---

## FINAL VALIDATION

- [ ] Run `npm test` in backend — all pass
- [ ] Run `npm test` in government — all pass
- [ ] E2E production test against Railway as government user
- [ ] Code quality review — no dead imports, no dead routes, no dead nav items
