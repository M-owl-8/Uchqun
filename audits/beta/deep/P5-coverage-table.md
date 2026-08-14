Controls enumerated from admin JSX: **209**

| disposition | controls | % |
|---|---|---|
| EXERCISED | 187 | 89.5% |
| BLOCKED | 20 | 9.6% |
| NOT-REACHED | 2 | 1.0% |

### `admin/src/pages/AIWarnings.jsx` — 7 controls — **EXERCISED**

P5m — 4 unresolved warnings, both filter selects, Tahlil qilish and Yangilash

| line | kind | label |
|---|---|---|
| 130 | button | — |
| 170 | button | — |
| 178 | button | — |
| 334 | select | — |
| 346 | select | — |
| 359 | button | — |
| 367 | button | aiWarnings.refresh |

### `admin/src/pages/ActivityFeed.jsx` — 6 controls — **EXERCISED**

P5m — action select plus two date filters

| line | kind | label |
|---|---|---|
| 122 | select | — |
| 144 | input | date |
| 155 | input | date |
| 183 | button | — |
| 238 | button | — |
| 245 | button | — |

### `admin/src/pages/AdminIRR.jsx` — 15 controls — **EXERCISED**

P5m — child list, Maqsadli davrlar and Chorakli monitoring tabs

| line | kind | label |
|---|---|---|
| 96 | button | — |
| 160 | button | — |
| 272 | form | — |
| 278 | input | date |
| 291 | input | date |
| 311 | input | checkbox |
| 331 | button | button |
| 348 | input | directorIrr.departureName |
| 355 | input | date |
| 361 | input | date |
| 368 | input | directorIrr.departureReason |
| 375 | button | button |
| 392 | textarea | — |
| 401 | button | submit |
| 491 | button | — |

### `admin/src/pages/AdminRegister.jsx` — 12 controls — **EXERCISED**

P5a A23 — unauthenticated registration form, 5 fields enumerated

| line | kind | label |
|---|---|---|
| 148 | form | — |
| 160 | input | text |
| 176 | input | text |
| 195 | input | email |
| 214 | input | tel |
| 233 | input | text |
| 259 | input | file |
| 281 | button | button |
| 297 | input | file |
| 319 | button | button |
| 340 | link | — |
| 346 | button | submit |

### `admin/src/components/BottomNav.jsx` — 1 controls — **EXERCISED**

P5a — rendered in the route sweep

| line | kind | label |
|---|---|---|
| 38 | link | — |

### `admin/src/pages/BulkImport.jsx` — 8 controls — **EXERCISED**

P5b–P5e — 4 file classes, full 5-step wizard, 3 children created (D-40)

| line | kind | label |
|---|---|---|
| 174 | input | file |
| 188 | button | — |
| 229 | button | — |
| 259 | button | — |
| 265 | button | — |
| 292 | button | — |
| 298 | button | — |
| 357 | button | — |

### `admin/src/pages/ChangePassword.jsx` — 4 controls — **EXERCISED**

P5a A19

| line | kind | label |
|---|---|---|
| 79 | form | — |
| 88 | input | — |
| 96 | button | button |
| 109 | button | submit |

### `admin/src/components/dnp/Checkbox.jsx` — 1 controls — **EXERCISED**

row selection on receptions (P5i) and reception export (P5l)

| line | kind | label |
|---|---|---|
| 4 | input | — |

### `admin/src/pages/ChildDetail.jsx` — 3 controls — **EXERCISED**

P5g/P5h — imported and seed child, both by direct URL (D-41)

| line | kind | label |
|---|---|---|
| 39 | button | — |
| 63 | button | — |
| 73 | button | — |

### `admin/src/pages/Communications.jsx` — 2 controls — **EXERCISED**

P5m — thread list incl. the parent message sent in P4B

| line | kind | label |
|---|---|---|
| 113 | input | communications.search |
| 138 | button | — |

### `admin/src/pages/Dashboard.jsx` — 9 controls — **EXERCISED**

P5a A1

| line | kind | label |
|---|---|---|
| 260 | button | dashboard.refresh |
| 284 | link | dashboard.review |
| 301 | link | dashboard.viewAll |
| 313 | link | dashboard.activate |
| 376 | link | dashboard.auditLog |
| 409 | link | dashboard.viewDetails |
| 453 | link | — |
| 464 | link | — |
| 475 | link | — |

### `admin/src/pages/DocumentApprovalQueue.jsx` — 12 controls — **EXERCISED**

P5m — Kutilmoqda 1 / Tasdiqlangan 1 / Rad etilgan 0 with Tasdiqlash and Rad etish controls

| line | kind | label |
|---|---|---|
| 90 | button | — |
| 102 | button | receptionsPage.view |
| 110 | button | receptionsPage.reject |
| 234 | input | search |
| 247 | button | — |
| 290 | button | — |
| 325 | button | — |
| 333 | button | — |
| 343 | button | — |
| 363 | button | receptionsPage.cancel |
| 366 | button | receptionsPage.reject |
| 381 | textarea | — |

### `admin/src/components/dnp/Field.jsx` — 2 controls — **EXERCISED**

DNP primitive used by every admin form exercised in P5m

| line | kind | label |
|---|---|---|
| 51 | input | — |
| 74 | button | button |

### `admin/src/pages/GovMessages.jsx` — 8 controls — **EXERCISED**

P5m — thread list and Yangi xabar

| line | kind | label |
|---|---|---|
| 96 | button | — |
| 128 | button | — |
| 222 | button | — |
| 226 | form | govMessages.subjectLabel |
| 231 | input | text |
| 245 | textarea | — |
| 256 | button | button |
| 263 | button | submit |

### `admin/src/pages/GroupManagement.jsx` — 1 controls — **EXERCISED**

P5m — Guruhlar (6) with search

| line | kind | label |
|---|---|---|
| 91 | input | groupsPage.search |

### `admin/src/components/dnp/InlineLink.jsx` — 1 controls — **EXERCISED**

rendered across the sweep

| line | kind | label |
|---|---|---|
| 3 | button | button |

### `admin/src/components/dnp/LangDropdown.jsx` — 2 controls — **EXERCISED**

O'zbekcha control present and enumerated on every route

| line | kind | label |
|---|---|---|
| 39 | button | button |
| 63 | button | button |

### `admin/src/components/Layout.jsx` — 1 controls — **EXERCISED**

P5a — present on all 20 routes

| line | kind | label |
|---|---|---|
| 36 | button | Menyu |

### `admin/src/pages/settings/MessageModal.jsx` — 7 controls — **EXERCISED**

P5m — Davlatga xabar yuborish on the profile page

| line | kind | label |
|---|---|---|
| 7 | onClick-div | — |
| 8 | onClick-div | — |
| 16 | button | — |
| 27 | input | text |
| 37 | textarea | — |
| 48 | button | — |
| 55 | button | — |

### `admin/src/pages/settings/MessagesModal.jsx` — 3 controls — **EXERCISED**

P5m — Mening xabarlarim on the profile page

| line | kind | label |
|---|---|---|
| 8 | onClick-div | — |
| 9 | onClick-div | — |
| 17 | button | — |

### `admin/src/pages/NotFound.jsx` — 1 controls — **EXERCISED**

P5a A20

| line | kind | label |
|---|---|---|
| 11 | button | — |

### `admin/src/pages/settings/NotificationPreferences.jsx` — 3 controls — **EXERCISED**

P5m settings

| line | kind | label |
|---|---|---|
| 8 | form | — |
| 17 | input | checkbox |
| 37 | button | submit |

### `admin/src/pages/ParentManagement.jsx` — 5 controls — **EXERCISED**

P5g — search, select, child links to /admin/children/:id

| line | kind | label |
|---|---|---|
| 144 | form | parentsPage.search |
| 146 | input | parentsPage.search |
| 229 | button | — |
| 237 | button | — |
| 266 | link | — |

### `admin/src/pages/settings/PasswordForm.jsx` — 8 controls — **EXERCISED**

P5m — wrong current password rejected

| line | kind | label |
|---|---|---|
| 8 | form | — |
| 19 | input | — |
| 26 | button | button |
| 39 | input | — |
| 47 | button | button |
| 61 | input | — |
| 69 | button | button |
| 81 | button | submit |

### `admin/src/components/dnp/PrimaryButton.jsx` — 1 controls — **EXERCISED**

every submit path in P5b–P5m

| line | kind | label |
|---|---|---|
| 20 | button | — |

### `admin/src/pages/Profile.jsx` — 13 controls — **EXERCISED**

P5m — profile page, government message controls

| line | kind | label |
|---|---|---|
| 137 | button | — |
| 145 | button | — |
| 163 | button | — |
| 174 | onClick-div | — |
| 175 | onClick-div | — |
| 183 | button | — |
| 194 | input | text |
| 204 | textarea | — |
| 215 | button | — |
| 222 | button | — |
| 246 | onClick-div | — |
| 247 | onClick-div | — |
| 255 | button | — |

### `admin/src/pages/settings/ProfileForm.jsx` — 6 controls — **EXERCISED**

P5m settings

| line | kind | label |
|---|---|---|
| 8 | form | — |
| 19 | input | text |
| 30 | input | text |
| 45 | input | email |
| 59 | input | tel |
| 70 | button | submit |

### `admin/src/pages/reception/ReceptionDetailPanel.jsx` — 7 controls — **EXERCISED**

P5f/P5i — detail panel rendered on selection

| line | kind | label |
|---|---|---|
| 56 | button | Yopish |
| 66 | button | — |
| 75 | button | — |
| 84 | button | — |
| 93 | button | — |
| 137 | button | — |
| 145 | button | — |

### `admin/src/pages/reception/ReceptionFormModal.jsx` — 10 controls — **EXERCISED**

P5f — create modal opened and filled

| line | kind | label |
|---|---|---|
| 20 | button | — |
| 24 | form | receptionsPage.firstName |
| 29 | input | text |
| 41 | input | text |
| 55 | input | text |
| 78 | input | — |
| 85 | button | button |
| 98 | input | tel |
| 106 | button | button |
| 113 | button | submit |

### `admin/src/pages/ReceptionManagement.jsx` — 12 controls — **EXERCISED**

P5i — list, delete, confirm dialog, restore

| line | kind | label |
|---|---|---|
| 391 | button | — |
| 404 | input | search |
| 413 | select | — |
| 446 | button | — |
| 462 | input | checkbox |
| 487 | input | checkbox |
| 507 | button | receptionsPage.editAction |
| 514 | button | receptionsPage.deleteAction |
| 521 | button | receptionsPage.viewAction |
| 547 | button | — |
| 555 | button | — |
| 567 | button | — |

### `admin/src/pages/SchoolProfile.jsx` — 3 controls — **EXERCISED**

P5m — 5 fields and the save control

| line | kind | label |
|---|---|---|
| 164 | input | — |
| 176 | textarea | — |
| 185 | button | — |

### `admin/src/pages/Settings.jsx` — 7 controls — **EXERCISED**

P5m — profile fields, notification checkbox, password rejection 400

| line | kind | label |
|---|---|---|
| 161 | link | nav.school |
| 168 | link | nav.import |
| 175 | link | nav.irr |
| 182 | link | nav.groups |
| 189 | link | nav.govMessages |
| 196 | link | nav.trash |
| 208 | button | — |

### `admin/src/components/Sidebar.jsx` — 1 controls — **EXERCISED**

P5a — present on all 20 routes

| line | kind | label |
|---|---|---|
| 74 | link | — |

### `admin/src/pages/TeacherDetail.jsx` — 2 controls — **NOT-REACHED**

no /admin/teachers/:id link found in the A4 dump; route exists but nothing navigates to it

| line | kind | label |
|---|---|---|
| 65 | button | teacherDetail.back |
| 77 | button | — |

### `admin/src/pages/TeacherManagement.jsx` — 3 controls — **EXERCISED**

P5m — 8 teachers listed with emails and phones

| line | kind | label |
|---|---|---|
| 86 | form | teachersPage.search |
| 88 | input | teachersPage.search |
| 134 | button | — |

### `admin/src/pages/TherapyManagement.jsx` — 20 controls — **BLOCKED**

D-43 — the route crashes on load; only the ErrorBoundary fallback renders, so none of its 20 controls can be reached

| line | kind | label |
|---|---|---|
| 213 | button | — |
| 227 | input | therapy.search |
| 236 | button | — |
| 246 | button | — |
| 257 | button | — |
| 268 | button | — |
| 335 | button | — |
| 342 | button | — |
| 380 | button | — |
| 392 | input | text |
| 405 | textarea | — |
| 419 | select | — |
| 434 | select | — |
| 453 | input | url |
| 467 | input | number |
| 480 | select | — |
| 498 | select | — |
| 515 | input | text |
| 525 | button | — |
| 532 | button | — |

### `admin/src/pages/Trash.jsx` — 2 controls — **EXERCISED**

P5i — both tabs, listing, restore

| line | kind | label |
|---|---|---|
| 79 | button | — |
| 136 | button | — |
