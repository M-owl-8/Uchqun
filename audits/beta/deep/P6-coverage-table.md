Controls enumerated from government JSX: **142**

| disposition | controls | % |
|---|---|---|
| EXERCISED | 128 | 90.1% |
| PARTIAL | 9 | 6.3% |
| NOT-REACHED | 5 | 3.5% |

### `government/src/pages/AIWarnings.jsx` — 8 controls — **EXERCISED**

P6c — Faol / Hal qilingan filters and refresh

| line | kind | label |
|---|---|---|
| 70 | button | — |
| 163 | button | warnings.refresh |
| 197 | button | — |
| 218 | button | — |
| 242 | button | warnings.retry |
| 302 | textarea | — |
| 311 | button | — |
| 318 | button | — |

### `government/src/pages/AdminDetails.jsx` — 3 controls — **NOT-REACHED**

route /government/admin/:id exists but no inbound link was rendered

| line | kind | label |
|---|---|---|
| 42 | button | — |
| 58 | button | adminDetails.back |
| 76 | button | — |

### `government/src/components/tabs/AdminsTab.jsx` — 21 controls — **EXERCISED**

P6c — Direktorlar tab with the create form (Ism, Familiya, school select, login, password) and per-row update/delete

| line | kind | label |
|---|---|---|
| 79 | form | government.form.firstName |
| 81 | input | government.form.firstName |
| 89 | input | government.form.lastName |
| 110 | select | — |
| 131 | input | text |
| 165 | input | — |
| 175 | button | — |
| 189 | input | — |
| 202 | button | government.form.create |
| 236 | link | — |
| 243 | button | government.form.update |
| 246 | button | government.delete |
| 263 | button | government.form.cancel |
| 266 | button | government.form.save |
| 272 | form | government.form.firstName |
| 274 | input | government.form.firstName |
| 280 | input | government.form.lastName |
| 292 | input | email |
| 302 | input | government.form.phone |
| 311 | input | — |
| 319 | button | — |

### `government/src/pages/AuditLog.jsx` — 7 controls — **EXERCISED**

P6b — D-05 re-derived, SANA populated on every row

| line | kind | label |
|---|---|---|
| 104 | select | — |
| 121 | select | — |
| 138 | input | date |
| 151 | input | date |
| 160 | button | — |
| 242 | button | — |
| 254 | button | — |

### `government/src/pages/ChangePassword.jsx` — 4 controls — **EXERCISED**

P6a G12; also the forced-change gate hit by the secondary account

| line | kind | label |
|---|---|---|
| 80 | form | — |
| 89 | input | — |
| 97 | button | button |
| 110 | button | submit |

### `government/src/components/dnp/Checkbox.jsx` — 1 controls — **EXERCISED**

login "remember" checkbox

| line | kind | label |
|---|---|---|
| 17 | input | checkbox |

### `government/src/pages/ChildDetail.jsx` — 2 controls — **NOT-REACHED**

no a[href^="/government/children/"] rendered on the students list, so nothing navigates to it

| line | kind | label |
|---|---|---|
| 57 | link | childDetail.back |
| 78 | link | childDetail.back |

### `government/src/pages/Dashboard.jsx` — 5 controls — **EXERCISED**

P6a G1 for all four variants; the secondary run also captured the stale banner (D-46)

| line | kind | label |
|---|---|---|
| 136 | button | dashboard.refresh |
| 148 | button | — |
| 169 | button | — |
| 224 | button | dashboard.viewAll |
| 290 | button | dashboard.viewAll |

### `government/src/components/dnp/Field.jsx` — 2 controls — **EXERCISED**

DNP primitive on every government form

| line | kind | label |
|---|---|---|
| 71 | input | — |
| 95 | button | button |

### `government/src/components/tabs/GovernmentTab.jsx` — 17 controls — **EXERCISED**

P6c — Davlat foydalanuvchilari tab rendered with its controls

| line | kind | label |
|---|---|---|
| 253 | button | — |
| 266 | button | — |
| 289 | form | — |
| 296 | select | — |
| 316 | select | — |
| 341 | select | — |
| 365 | input | provision.form.firstName |
| 372 | input | provision.form.lastName |
| 399 | input | — |
| 409 | button | button |
| 432 | input | checkbox |
| 455 | button | provision.form.create |
| 475 | button | — |
| 483 | button | submit |
| 495 | form | provision.actions.newPassword |
| 501 | input | — |
| 511 | button | button |

### `government/src/components/dnp/InlineLink.jsx` — 1 controls — **EXERCISED**

rendered across the sweep

| line | kind | label |
|---|---|---|
| 11 | button | button |

### `government/src/components/dnp/LangToggle.jsx` — 1 controls — **EXERCISED**

O'zbekcha control enumerated on every route

| line | kind | label |
|---|---|---|
| 37 | button | button |

### `government/src/components/Layout.jsx` — 2 controls — **EXERCISED**

P6a — every route

| line | kind | label |
|---|---|---|
| 21 | button | button |
| 50 | button | button |

### `government/src/components/tabs/MessagesTab.jsx` — 8 controls — **EXERCISED**

P6c — Xabarlar tab rendered

| line | kind | label |
|---|---|---|
| 150 | input | search |
| 167 | button | warnings.retry |
| 216 | button | government.markRead |
| 221 | button | — |
| 231 | button | — |
| 265 | textarea | — |
| 272 | button | — |
| 292 | button | — |

### `government/src/pages/NotFound.jsx` — 1 controls — **EXERCISED**

P6a G13

| line | kind | label |
|---|---|---|
| 11 | button | — |

### `government/src/pages/Parents.jsx` — 1 controls — **EXERCISED**

P6c — 136 parents, Ko'proq yuklash

| line | kind | label |
|---|---|---|
| 130 | button | — |

### `government/src/pages/Platform.jsx` — 3 controls — **EXERCISED**

P6c — all four tabs reachable from the platform page

| line | kind | label |
|---|---|---|
| 266 | button | — |
| 285 | button | warnings.retry |
| 310 | button | warnings.retry |

### `government/src/components/dnp/PrimaryButton.jsx` — 1 controls — **EXERCISED**

the Kirish control and every submit path

| line | kind | label |
|---|---|---|
| 32 | button | — |

### `government/src/pages/Profile.jsx` — 7 controls — **EXERCISED**

P6c — profile with the edit control

| line | kind | label |
|---|---|---|
| 92 | button | — |
| 109 | input | text |
| 121 | input | text |
| 134 | input | tel |
| 142 | button | — |
| 150 | button | — |
| 229 | button | — |

### `government/src/pages/Ratings.jsx` — 6 controls — **EXERCISED**

P6c — search, filter select, per-school rating disclosure controls

| line | kind | label |
|---|---|---|
| 208 | button | — |
| 217 | button | — |
| 264 | button | — |
| 379 | button | — |
| 417 | input | ratings.searchPlaceholder |
| 429 | select | — |

### `government/src/components/tabs/RegistrationsTab.jsx` — 14 controls — **EXERCISED**

P6c — Ro'yxatdan o'tish so'rovlari tab rendered

| line | kind | label |
|---|---|---|
| 56 | link | registrations.certificate |
| 57 | link | registrations.passport |
| 62 | button | government.approve |
| 65 | button | government.reject |
| 82 | button | government.cancel |
| 85 | button | — |
| 101 | textarea | government.rejectionReason |
| 117 | button | government.close |
| 131 | input | government.copy |
| 132 | button | government.copy |
| 143 | input | government.copy |
| 144 | button | government.copy |
| 161 | input | government.openTelegram |
| 162 | link | government.openTelegram |

### `government/src/pages/SchoolDetail.jsx` — 9 controls — **PARTIAL**

P6c — opened, all six tabs enumerated; the Arxivlash control was deliberately not fired, see the artifact

| line | kind | label |
|---|---|---|
| 103 | form | govRating.period |
| 108 | select | — |
| 141 | textarea | govRating.commentPlaceholder |
| 145 | button | submit |
| 610 | button | schoolDetail.backToList |
| 653 | link | schools.title |
| 673 | button | — |
| 678 | button | — |
| 690 | button | — |

### `government/src/pages/Schools.jsx` — 3 controls — **EXERCISED**

P6a/P6b — list per variant plus the CSV export downloaded and parsed (D-45)

| line | kind | label |
|---|---|---|
| 121 | button | — |
| 136 | input | search |
| 144 | select | — |

### `government/src/pages/Settings.jsx` — 9 controls — **EXERCISED**

P6c — wrong current password rejected 400 CURRENT_PASSWORD_INCORRECT

| line | kind | label |
|---|---|---|
| 86 | form | settings.currentPassword |
| 92 | input | — |
| 100 | button | — |
| 110 | input | — |
| 118 | button | — |
| 128 | input | — |
| 136 | button | — |
| 141 | button | submit |
| 155 | button | — |

### `government/src/components/Sidebar.jsx` — 2 controls — **EXERCISED**

P6a — present on all 13 routes for all four variants

| line | kind | label |
|---|---|---|
| 119 | link | — |
| 156 | button | — |

### `government/src/pages/Students.jsx` — 2 controls — **EXERCISED**

P6c — 138 students, search, Ko'proq yuklash

| line | kind | label |
|---|---|---|
| 93 | input | search |
| 161 | button | — |

### `government/src/pages/Teachers.jsx` — 2 controls — **EXERCISED**

P6c — 32 teachers with search

| line | kind | label |
|---|---|---|
| 91 | input | search |
| 150 | button | — |
