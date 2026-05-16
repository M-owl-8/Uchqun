# Government Portal — Audit Fix Tracker
_Generated: 2026-05-16_

## Status Legend
- [ ] Not started
- [~] In progress
- [x] Done
- [!] Deferred / won't fix

---

## 🔴 Functional Bugs

- [ ] **F1** `Settings.jsx` — `showPasswords` has no setter; password fields stuck as `type="password"`; no eye-toggle buttons rendered
- [ ] **F2** `Dashboard.jsx` — hardcoded fake activity feed (6 static Uzbek strings shown as real data)
- [ ] **F3** `AdminDetails.jsx` — crash if API omits `receptions/schools/teachers/parents/children` keys
- [ ] **F4** `Platform.jsx:18` — `useAuth()` called with result discarded (dead hook call)
- [ ] **F5** `Platform.jsx:317` — double container wrapping (own max-w-7xl + padding duplicates Layout's `<main>`)
- [ ] **F6** `GovernmentTab.jsx` — no password visibility toggle on create form
- [ ] **F7** `Ratings.jsx` — rank numbers recalculate on search, become meaningless; should hide rank badge or freeze global rank

---

## 🟠 Design Fragmentation

- [ ] **D1** Heading scale split — `text-3xl font-bold` (Students, Teachers, Parents, Ratings, AdminDetails, Profile, Settings) vs `text-2xl font-semibold` (Dashboard, Schools, SchoolDetail, Login) — unify to `text-2xl font-semibold`
- [ ] **D2** Raw Tailwind colors in entity cards — Students `green-100/600`, Teachers `purple-100/600`, Parents `orange-100/600`, SchoolsTab `blue-50/purple-50`, AdminDetails stat `pink/orange/purple/blue-500` — replace with design tokens or consistent semantic palette
- [ ] **D3** `Platform.jsx:323` — active tab uses `violet-600` nowhere else in portal — change to `brand-600`
- [ ] **D4** Inline loading spinners in all 5 tab components — replace with `<LoadingSpinner size="sm" />`
- [ ] **D5** Input border-radius inconsistency — Login `rounded-md`, Settings/AdminsTab/GovernmentTab `rounded-xl`, Schools search `rounded-md` — unify to `rounded-md` (matches the design system)
- [ ] **D6** `Layout.jsx:28` mobile topbar — hardcoded Uzbek `"Davlat Nazorat Paneli"` without i18n
- [ ] **D7** `Card` component not used in Dashboard, Schools, SchoolDetail — those use raw `div.bg-paper-card` — unify (low priority, leave as is to avoid churn)

---

## 🟡 Technical Debt

- [ ] **T1** `package.json` — `"express": "^4.18.2"` in frontend dependencies (server framework, unused)
- [ ] **T2** `GovernmentBackground.jsx` — 3-line component with no props/logic; inline into `Layout.jsx`
- [ ] **T3** `LanguageSwitcher.jsx` — re-implements `changeLanguage` inline instead of using exported helper from `i18n.js`
- [ ] **T4** Logout duplicated in 3 places: Sidebar (`logout()`), Profile (`logout()` + `navigate('/login')`), Settings (`logout()` + `navigate('/login')`) — unify: just call `logout()` everywhere (AuthContext already navigates)
- [ ] **T5** `Profile.jsx:37` — avatar URL construction is a fragile inline regex one-liner; extract to utility
- [ ] **T6** `Students.jsx` / `Teachers.jsx` — fetch `?limit=100&page=1` with no search/filter; add client-side search at minimum
- [ ] **T7** `AdminDetails.jsx` — add null-safe destructuring defaults for all API list fields

---

## 🔵 Dead Code / Orphan Assets

- [ ] **DC1** `government/src/logo symbol green.png` — unused image with space in name; delete
- [ ] **DC2** `government/index (1).html` — stale design export in repo root; delete
- [ ] **DC3** Locale keys present but never used: `login.loading`, `schools.totalSchools/totalReviews/globalAverage/level`, `dashboard.averageRating/activeWarnings/welcome/ratings/students`, `ratings.overallAverage/stars/level/school/student/parent/comment/date`, `sidebar.menu`, `government.tabs.*` (duplicate of `platform.tabs.*`)
- [ ] **DC4** Locale keys used via `defaultValue` but absent from locale files (i18n not the source of truth): `nav.students/teachers/parents`, `login.auditTrail`, `dashboard.subtitle/lastUpdated/activity`, `schools.colName/colType/colStudents/colRating/shown/allTypes/searchPlaceholder/typeSchool/typeKindergarten/typeBoth`, `schoolDetail.*`, `studentsPage.*`, `teachersPage.*`, `parentsPage.*`, `settings.*`, `government.totalSchools/totalRatings/schoolsSubtitle`

---

## 🟣 UX / A11y

- [ ] **U1** `NotFound.jsx` — `navigate(-1)` with no history does nothing; change to `navigate('/government')`
- [ ] **U2** `AdminDetails.jsx:277` — `child.birthDate` vs `Students.jsx` `student.dateOfBirth` — same entity, different field names; one always shows `—`
- [ ] **U3** Mobile sidebar drawer missing `aria-labelledby` on `role="dialog"` element

---

## 🧪 Tests

- [ ] **TS1** `Platform.test.jsx:15` — mocks `'../context/ToastContext'` but `Platform.jsx` imports from `'@shared/context/ToastContext'`; mock path wrong
- [ ] **TS2** `auth.test.js` — reimplements auth logic locally; tests a copy not the real `createAuthContext`; annotate clearly

---

## Fix Order (implementation sequence)

### Batch 1 — Quick bug fixes (no deps between them)
F4, F5, F3, F7, D3, D6, U1, T1

### Batch 2 — Settings password toggle
F1 (needs new UI: eye buttons + setter)

### Batch 3 — GovernmentTab password toggle
F6

### Batch 4 — Dashboard fake activity
F2

### Batch 5 — Design unification
D1 (headings), D4 (spinners), D5 (radii)

### Batch 6 — Technical debt
T2, T3, T4, T7

### Batch 7 — Locale cleanup
DC3, DC4

### Batch 8 — Students/Teachers search
T6

### Batch 9 — Tests
TS1, TS2

### Batch 10 — Dead assets
DC1, DC2

---

## Production Test Checklist (post-deploy)

- [ ] Login with government credentials
- [ ] Dashboard loads, no fake activity feed
- [ ] Schools list renders, search works
- [ ] School detail opens
- [ ] Students, Teachers pages load and search works
- [ ] Parents page loads with pagination
- [ ] Ratings page renders, expand/collapse reviews
- [ ] Platform → Admins tab: create/edit/delete admin
- [ ] Platform → Schools tab: list renders
- [ ] Platform → Messages tab: unread badge, reply works
- [ ] Platform → Government tab: create/edit/delete gov user
- [ ] Platform → Registrations tab: approve/reject
- [ ] Profile page loads user info
- [ ] Settings: profile update, password change (eye toggle works)
- [ ] Language switcher: uz/en/ru all render correctly
- [ ] Mobile responsive: sidebar opens/closes
- [ ] NotFound page navigates to /government
- [ ] Admin detail page loads without crash
