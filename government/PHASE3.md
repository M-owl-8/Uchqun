# Government Portal — Phase 3 Hardening

## Status Legend: [ ] todo · [x] done · [-] skipped

---

## BACKEND

- [x] B1: `getSchoolRatings` — add UUID validation on `schoolId` param (C1)
- [x] B2: `approveRegistrationRequest` — catch `SequelizeUniqueConstraintError`, return 409 (C2)
- [x] B3: `getAdmins` — add `isApproved` filter + `parsePagination`; Dashboard fetches pending only

---

## FRONTEND

- [x] F1: `AdminDetails.jsx` — null guard for `admin` within data before render
- [x] F2: `AIWarnings.jsx` — add error state + error banner (not silent empty list)
- [x] F3: `Login.jsx` — separate 429 label (`rateLimited`) from account-locked label
- [x] F4: `RegistrationsTab.jsx` — remove plaintext password fallback block
- [x] F5: `Schools.jsx` — strip newlines in CSV cell values before quoting
- [x] F6: `Dashboard.jsx` — remove `?limit=10` from schools fetch; add "view all" footer hints
- [x] F7: `Sidebar.jsx` — highlight Dashboard nav item when on `/government/admin/:id`
- [x] F8: `Settings.jsx` — remove duplicate Language card (keep header switcher only)
- [x] F9: Remove all `TODO(phase-1)` comments from `RegistrationsTab.jsx` + `AdminDetails.jsx`

---

## DATABASE

- [x] D1: Migration `20260517000002-fix-government-stats-fk-on-delete.js` — change schoolId + generatedBy FKs to ON DELETE SET NULL

---

## VALIDATION

- [x] Run `npm test` in government — 52/52 pass (5 test files)
- [x] Run `npm test` in backend — 546/546 pass (64 test suites)
- [ ] E2E production smoke test against Railway (pending deploy)
- [x] Code quality review — no dead comments, no silent failures
