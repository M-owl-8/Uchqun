Controls enumerated from parent-side JSX: **117**

| disposition | controls | % |
|---|---|---|
| EXERCISED | 109 | 93.2% |
| BLOCKED | 4 | 3.4% |
| NOT-APPLICABLE | 4 | 3.4% |

### `teacher/src/parent/pages/AIWarnings.jsx` — 4 controls — **NOT-APPLICABLE**

unroutable: /warnings, /ai-warnings and /xabar?tab=warnings all render the parent 404 (P4f)

| line | kind | label |
|---|---|---|
| 114 | button | — |
| 124 | button | — |
| 134 | button | — |
| 181 | button | — |

### `teacher/src/parent/pages/Activities.jsx` — 3 controls — **EXERCISED**

P4b — Individual reja(15)

| line | kind | label |
|---|---|---|
| 178 | button | — |
| 205 | button | — |
| 329 | button | — |

### `teacher/src/parent/pages/Attendance.jsx` — 4 controls — **EXERCISED**

P3d week walk (4 weeks) + P4a both viewports

| line | kind | label |
|---|---|---|
| 183 | button | — |
| 198 | button | — |
| 211 | button | — |
| 223 | button | button |

### `teacher/src/parent/pages/childProfile/AvatarUploadModal.jsx` — 4 controls — **BLOCKED**

X-01 — file input; no binary uploaded to production storage

| line | kind | label |
|---|---|---|
| 80 | onClick-div | — |
| 81 | onClick-div | — |
| 85 | input | file |
| 116 | button | — |

### `teacher/src/parent/pages/ChangePassword.jsx` — 4 controls — **EXERCISED**

P4a route + P4f wrong-current rejection 400

| line | kind | label |
|---|---|---|
| 88 | form | — |
| 97 | input | — |
| 105 | button | button |
| 118 | button | submit |

### `teacher/src/parent/pages/Chat.jsx` — 11 controls — **EXERCISED**

P4b — POST /chat/messages 201; P3e live receipt without reload

| line | kind | label |
|---|---|---|
| 219 | textarea | — |
| 227 | button | cancel |
| 236 | button | save |
| 249 | button | button |
| 268 | button | chat.edit |
| 281 | button | chat.delete |
| 302 | button | chat.scrollToBottom |
| 315 | textarea | — |
| 329 | button | button |
| 356 | button | button |
| 363 | button | button |

### `teacher/src/parent/pages/ChildIRR.jsx` — 1 controls — **EXERCISED**

P4b — read-only view, "Hali baholash o'tkazilmagan"

| line | kind | label |
|---|---|---|
| 135 | button | — |

### `teacher/src/parent/pages/ChildProfile.jsx` — 4 controls — **EXERCISED**

P4h/P4k — profile, message modals, logout control

| line | kind | label |
|---|---|---|
| 54 | link | button |
| 55 | button | button |
| 241 | button | — |
| 285 | select | — |

### `teacher/src/parent/pages/childProfile/ChildProfileHero.jsx` — 1 controls — **EXERCISED**

P4h — name, age 8, school and group rendered

| line | kind | label |
|---|---|---|
| 57 | button | Rasmni o'zgartirish |

### `teacher/src/parent/components/ChildSwitcher.jsx` — 1 controls — **EXERCISED**

P4e — switched child; journal count went 7 -> 0 with the switch

| line | kind | label |
|---|---|---|
| 29 | button | — |

### `teacher/src/parent/pages/Dashboard.jsx` — 6 controls — **EXERCISED**

P4a both viewports; quick links and summary tiles rendered

| line | kind | label |
|---|---|---|
| 173 | link | — |
| 188 | link | — |
| 203 | link | — |
| 218 | link | — |
| 235 | link | — |
| 270 | link | — |

### `teacher/src/parent/components/DesktopTopNav.jsx` — 3 controls — **EXERCISED**

P4a — present on all 16 desktop routes

| line | kind | label |
|---|---|---|
| 32 | link | — |
| 41 | link | — |
| 69 | link | nav.notifications |

### `teacher/src/parent/pages/Help.jsx` — 6 controls — **EXERCISED**

P4f — contact card, 4 FAQs, 4 quick links (all anchors, no buttons)

| line | kind | label |
|---|---|---|
| 36 | link | help.emailValue |
| 47 | link | help.phoneValue |
| 73 | link | help.linkActivities |
| 76 | link | help.linkMedia |
| 79 | link | help.linkMeals |
| 82 | link | help.linkSettings |

### `teacher/src/parent/pages/childProfile/LogoutModal.jsx` — 3 controls — **EXERCISED**

P4h — Chiqish control on the child profile

| line | kind | label |
|---|---|---|
| 42 | button | — |
| 52 | button | — |
| 58 | button | — |

### `teacher/src/parent/pages/Meals.jsx` — 2 controls — **EXERCISED**

P4b — Taomlar(45), day selector

| line | kind | label |
|---|---|---|
| 111 | select | — |
| 130 | button | button |

### `teacher/src/parent/pages/Media.jsx` — 10 controls — **EXERCISED**

P4b — filters; empty gallery (0 assets, consistent with X-01)

| line | kind | label |
|---|---|---|
| 324 | input | range |
| 342 | button | — |
| 355 | button | Skip backward 10 seconds |
| 364 | button | Skip forward 10 seconds |
| 374 | button | — |
| 387 | input | range |
| 538 | button | — |
| 559 | button | — |
| 680 | button | — |
| 709 | button | — |

### `teacher/src/parent/pages/childProfile/MessageModal.jsx` — 6 controls — **EXERCISED**

P4f — POST /parent/message-to-government 201

| line | kind | label |
|---|---|---|
| 160 | button | — |
| 185 | button | button |
| 218 | input | text |
| 230 | textarea | — |
| 242 | button | — |
| 249 | button | — |

### `teacher/src/parent/pages/childProfile/MessagesModal.jsx` — 2 controls — **EXERCISED**

P4k — modal opened, contains the message sent in P4f

| line | kind | label |
|---|---|---|
| 68 | button | — |
| 163 | button | — |

### `teacher/src/parent/components/MobileTabBar.jsx` — 1 controls — **EXERCISED**

P4d — five real touch taps, each routed correctly, all targets 78x64

| line | kind | label |
|---|---|---|
| 26 | link | — |

### `teacher/src/parent/components/MobileTopBar.jsx` — 1 controls — **EXERCISED**

P4a — present on all 16 mobile routes

| line | kind | label |
|---|---|---|
| 34 | link | nav.notifications |

### `teacher/src/parent/pages/Notifications.jsx` — 6 controls — **EXERCISED**

P4b/P4c — three filter tabs, empty list (D-35)

| line | kind | label |
|---|---|---|
| 86 | button | button |
| 98 | button | — |
| 108 | button | — |
| 118 | button | — |
| 178 | button | — |
| 186 | button | — |

### `teacher/src/parent/components/PrivacyConsentModal.jsx` — 4 controls — **EXERCISED**

P4g — withdrawn, re-presented at next login, re-granted

| line | kind | label |
|---|---|---|
| 103 | input | checkbox |
| 126 | input | checkbox |
| 148 | button | button |
| 157 | button | button |

### `teacher/src/parent/pages/Settings.jsx` — 19 controls — **EXERCISED**

P4f/P4g — profile round-trip, password rejection, consent withdrawal, logout (D-36, D-37)

| line | kind | label |
|---|---|---|
| 149 | form | — |
| 175 | input | text |
| 186 | input | text |
| 201 | input | email |
| 215 | input | tel |
| 226 | button | submit |
| 243 | form | — |
| 252 | input | checkbox |
| 273 | button | submit |
| 286 | form | — |
| 297 | input | — |
| 304 | button | button |
| 317 | input | — |
| 325 | button | button |
| 339 | input | — |
| 347 | button | button |
| 359 | button | submit |
| 390 | button | — |
| 409 | button | — |

### `teacher/src/parent/pages/TeacherRating.jsx` — 4 controls — **EXERCISED**

P4b — POST /parent/ratings 200; D-32 at 390px

| line | kind | label |
|---|---|---|
| 312 | textarea | — |
| 339 | button | button |
| 504 | textarea | — |
| 521 | button | button |

### `teacher/src/parent/pages/Therapy.jsx` — 7 controls — **EXERCISED**

P4a/P4b — 24 controls, filter chips; D-33 overflow at 390px

| line | kind | label |
|---|---|---|
| 134 | input | therapy.search |
| 143 | button | — |
| 153 | button | — |
| 163 | button | — |
| 173 | button | — |
| 196 | button | — |
| 251 | button | — |
