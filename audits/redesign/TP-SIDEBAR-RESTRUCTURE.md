# TP-SIDEBAR-RESTRUCTURE — Teacher Sidebar Audit

**Status:** ✅ Closed  
**Branch:** `main`  
**Scope:** Teacher portal sidebar — 13-item inventory, overlap audit, AI→prefix rename

---

## Full Inventory

| # | Sidebar label | Route | Page file | What it does | Endpoints |
|---|---|---|---|---|---|
| 1 | Bosh sahifa | `/teacher` | `pages/Dashboard.jsx` | Class grid, 3 stat cards (attendance/meal/IEP counts), attention list, recent observations, quick links to attendance/chat/reflection | `GET /teacher/dashboard/counts`, `GET /teacher/children`, `GET /teacher/observations/recent?limit=8` |
| 2 | Davomat | `/teacher/attendance` | `pages/Attendance.jsx` | Daily attendance grid for all children, filter chips (all/present/absent/late), sticky save bar | `GET /teacher/children`, `POST /attendance` |
| 3 | Guruh ro'yxati | `/teacher/parents` | `pages/ParentManagement.jsx` | Parent contact cards with linked children, email/phone, search filter. Read-only list — no create/edit | `GET /teacher/parents` |
| 4 | Galereya | `/teacher/media` | `pages/Media.jsx` | Photo/video media CRUD per child, type filter (all/photo/video), file upload | `GET /teacher/media`, `POST /teacher/media` (multipart), `PUT/DELETE /teacher/media/:id` |
| 5 | Ovqatlanish | `/teacher/meals` | `pages/Meals.jsx` | Meal logging CRUD per child and date, meal type (Breakfast/Lunch/Dinner/Snack), quantity, eaten flag | `GET/POST/PUT/DELETE /teacher/meals` |
| 6 | Maqsadlar | `/teacher/monitoring` | `pages/MonitoringJournal.jsx` | Daily emotional state assessment per child — 9 boolean criteria checklist, notes, teacher signature | `GET /teacher/emotional-monitoring`, `POST/PUT/DELETE /teacher/emotional-monitoring` |
| 7 | Kuzatuvlar | `/teacher/activities` | `pages/Activities.jsx` | Full IEP activity/goal CRUD — skill, goal, startDate, endDate, tasks, methods, progress %, services | `GET/POST/PUT/DELETE /activities` |
| 8 | Terapiya | `/teacher/therapy` | `pages/TherapyManagement.jsx` | Therapy resource library (music/audio/video) with assign-to-child modal, search, type filter | `GET/POST/PUT/DELETE /teacher/therapies`, `POST /teacher/therapies/:id/assign` |
| 9 | Ogohlantirishlar | `/teacher/ai-warnings` | `parent/pages/AIWarnings.jsx` | AI-generated warnings based on ratings — severity (critical/high/medium/low), type, resolve action, resolved/unresolved filter | `GET /ai-warnings`, `PUT /ai-warnings/:id/resolve` |
| 10 | Ota-onalar | `/teacher/chat` | `pages/Chat.jsx` | Real-time parent messaging — parent selector dropdown, message CRUD (send/edit/delete), socket push, unread badge | `GET /teacher/parents`, chatStore abstraction |
| 11 | Kun jurnali | `/teacher/reflection` | `pages/DailyReflection.jsx` | Private daily reflection (localStorage autosave + `POST /teacher/reflections`), read-only recent observations, parent journal composer | `GET /teacher/observations/recent?limit=20`, `POST /teacher/reflections`, `POST /teacher/journal` |
| 12 | Profil | `/teacher/profile` | `pages/Profile.jsx` | Identity card (name, role), avatar upload, send message to admin, view admin replies, logout | `GET/POST /teacher/messages`, `POST /teacher/avatar` |
| 13 | Sozlamalar | `/teacher/settings` | `pages/Settings.jsx` | Profile form (name/email/phone), notification preferences, password change, send message to admin, view replies, logout | `PUT /teacher/profile`, `PUT /teacher/password`, `GET/POST /teacher/messages` |

---

## Overlap audit

Four hypotheses were investigated from code evidence. All refuted.

### H1: "Ota-onalar" sidebar vs Dashboard "Ota-onalar bilan chat" quick link

**REFUTED — not a duplicate page.**  
Both route to `/teacher/chat` (Chat.jsx). Dashboard quick link is a navigation shortcut only; no second chat implementation exists.

### H2: "Kuzatuvlar" (Activities) vs "Kun jurnali" (DailyReflection) — suspected IEP overlap

**REFUTED — different data, different purpose.**  
Activities.jsx: IEP CRUD — `/activities` (persistent goal records). DailyReflection.jsx: private daily reflection text + read-only observation list + parent journal — `/teacher/reflections` + `/teacher/journal`. No overlap.

### H3: Dashboard "Davomat belgilash" quick link vs sidebar "Davomat"

**REFUTED — same route, not a parallel page.**  
Dashboard quick link → `/teacher/attendance`. Sidebar "Davomat" → same route. One page, two entry points.

### H4: Dashboard "Yangi yozuv" button vs parallel activity form

**REFUTED — button navigates, no duplicate form.**  
"Yangi yozuv" is `<Link to="/teacher/activities">` (navigates to the Activities page). No hidden form was found.

### H5: Profile vs Settings — message-to-admin feature

**NOTED — shared feature, not a merge candidate.**  
Both pages include `GET/POST /teacher/messages` (send message to admin, view replies) and a logout button. These are intentional convenience duplicates: Profile is identity/avatar-focused, Settings is configuration-focused. Neither page should be removed; the duplication is acceptable surfacing.

**Conclusion: zero confirmed merge candidates. No items removed from sidebar.**

---

## STEP 3 — Rename "AI Ogohlantirishlar" → "Ogohlantirishlar"

Motivation: the "AI" prefix is redundant — the feature is already known as Ogohlantirishlar throughout the school workflow. Removing the prefix reduces label length and avoids AI-branding anxiety for end users.

### Files changed

| File | Change |
|---|---|
| `teacher/src/locales/uz/common.json` | `sidebar.aiWarnings`: `"AI Ogohlantirishlar"` → `"Ogohlantirishlar"` |
| `teacher/src/locales/en/common.json` | `sidebar.aiWarnings`: `"AI Warnings"` → `"Warnings"` |
| `teacher/src/locales/ru/common.json` | `sidebar.aiWarnings`: `"AI-предупреждения"` → `"Предупреждения"` |
| `teacher/src/components/Sidebar.jsx` | defaultValue fallback `'AI Ogohlantirishlar'` → `'Ogohlantirishlar'` |
| `teacher/src/parent/pages/AIWarnings.jsx` | `warnings.title` defaultValue `'AI Ogohlantirishlar'` → `'Ogohlantirishlar'` |

### Key not in locale files

`warnings.title` and `warnings.subtitle` are **not** in the teacher locale files — they appear only as `{ defaultValue }` fallbacks in `AIWarnings.jsx`. The sidebar key `sidebar.aiWarnings` IS in all three locale files (uz/en/ru). Both surfaces updated.

---

## Build + locale check

Run after changes:

```bash
cd teacher && npm run check:locales  # 0 missing expected
cd teacher && npm run build           # vite build clean
cd teacher && npm test                # suite green
```
