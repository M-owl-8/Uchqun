# CLEANUP-05-SIDEBAR-CONSOLIDATION

**Status:** 🟡 STEP 3 — awaiting user decisions before applying changes  
**Scope:** Reduce admin sidebar from 14 items / 4 sections to ~9-10 items / 3 sections  

---

## STEP 1 — Current state audit

Source: `admin/src/components/Sidebar.jsx`, lines 30–66.

```js
const NAV_SECTIONS = [
  {
    labelKey: 'nav.section.management',    // "Boshqaruv"
    items: [
      { key: 'nav.dashboard',      href: '/admin' },               // 1
      { key: 'nav.receptions',     href: '/admin/receptions' },    // 2
      { key: 'nav.teachers',       href: '/admin/teachers' },      // 3
      { key: 'nav.groups',         href: '/admin/groups' },        // 4
      { key: 'nav.parents',        href: '/admin/parents' },       // 5
      { key: 'nav.documents',      href: '/admin/documents' },     // 6
    ],
  },
  {
    labelKey: 'nav.section.communications', // "Aloqa"
    items: [
      { key: 'nav.communications', href: '/admin/communications' }, // 7
      { key: 'nav.govMessages',    href: '/admin/messages' },       // 8
    ],
  },
  {
    labelKey: 'nav.section.reports',       // "Hisobotlar"
    items: [
      { key: 'nav.aiWarnings',     href: '/admin/ai-warnings' },   // 9
      { key: 'nav.schoolRatings',  href: '/admin/school-ratings' },// 10
      { key: 'nav.therapy',        href: '/admin/therapy' },       // 11
      { key: 'nav.irr',            href: '/admin/irr' },           // 12
    ],
  },
  {
    labelKey: 'nav.section.settings',     // "Tizim"
    items: [
      { key: 'nav.school',         href: '/admin/school' },        // 13
      { key: 'nav.import',         href: '/admin/import' },        // 14
      { key: 'nav.settings',       href: '/admin/settings' },      // 15 — wait...
    ],
  },
];
```

**Wait — 15 items?** Re-count: management(6) + communications(2) + reports(4) + settings(3) = **15 items**. The comment in Sidebar.jsx says "14 items" but the settings section has 3 items (school, import, settings). Actual count = **15**.

Section count: 4. Comment says 14 items — discrepancy. Actual is 15.

---

## STEP 2 — Page enumeration

| # | Nav label | Route | Page | What it does | Frequency |
|---|---|---|---|---|---|
| 1 | Bosh sahifa | `/admin` | `Dashboard.jsx` | Main dashboard: attention cards (pending docs count, unread warnings), stats (teachers, parents, ratings), live activity feed, school overview | **Daily** |
| 2 | Qabul boshqaruvi | `/admin/receptions` | `ReceptionManagement.jsx` | Manage reception staff accounts: create, view, edit, delete, view document approval status badges. Full CRUD. | **Weekly / on-demand** |
| 3 | Tarbiyachilar | `/admin/teachers` | `TeacherManagement.jsx` | Manage teacher/caregiver accounts: create, view, edit, delete. Full CRUD. Links to TeacherDetail. | **Weekly / on-demand** |
| 4 | Guruhlar | `/admin/groups` | `GroupManagement.jsx` | **READ-ONLY** list of groups (admin CANNOT create/edit/delete groups — comment says so explicitly). Reference view only. | **Periodic / reference** |
| 5 | Ota-onalar | `/admin/parents` | `ParentManagement.jsx` | Manage parent accounts: view, suspend, activate, edit. Has ChildDetail link. | **Weekly** |
| 6 | Hujjatlar navbati | `/admin/documents` | `DocumentApprovalQueue.jsx` | Approve/reject documents submitted by reception staff. Tabs: Pending / Approved / Rejected. Core director gatekeeping function. | **Daily** |
| 7 | Muloqotlar | `/admin/communications` | `Communications.jsx` | Read-only oversight view of parent-teacher chat conversations. 2-panel inbox (conversation list + message thread). Director monitors, does not participate. | **Periodic (oversight)** |
| 8 | Xabarlar | `/admin/messages` | `GovMessages.jsx` | Compose and view messages to/from government. Outbox + thread view. Separate system from parent chat. | **Periodic / event-driven** |
| 9 | Ogohlantirishlar | `/admin/ai-warnings` | `AIWarnings.jsx` | View AI-generated alerts by severity (critical/high/medium/low/info). Can trigger analysis run and send notifications. Active alert management. | **Daily** |
| 10 | Muassasa baholari | `/admin/school-ratings` | `SchoolRatings.jsx` | Read-only view of institution ratings: parent avg, government avg, combined 50/50. Summary cards + breakdown rows. | **Periodic (reference)** |
| 11 | Terapiya | `/admin/therapy` | `TherapyManagement.jsx` | Create, edit, delete therapy resources (music/video/content types). Filter by age group, difficulty level. For special-ed institutions = core. | **Daily (therapy-focused) / Periodic (other)** |
| 12 | IRR | `/admin/irr` | `ManagerIRR.jsx` | Quarterly facility-level monitoring journal with 5 section checklists (info system, parent work, documentation, care quality, conditions). Large form. | **Quarterly** — very infrequent |
| 13 | Muassasa profili | `/admin/school` | `SchoolProfile.jsx` | Edit institution contact info: phone, email, address, description, director name. Initial setup + occasional contact updates. | **Rarely** |
| 14 | Ommaviy import | `/admin/import` | `BulkImport.jsx` | 5-step CSV wizard to bulk-import children. One-time onboarding or intake burst. | **Rarely** |
| 15 | Sozlamalar | `/admin/settings` | `Settings.jsx` | Profile form (name, phone), notification preferences, password change, message-to-government functionality. | **Occasionally** |

**No Bolalar (Children) list page exists in admin.** `ChildDetail` at `/admin/children/:id` is a detail-only page reached from ParentManagement links. No top-level children list. No nav item needed.

---

## STEP 3 — Decisions for user

I can see a clear path to ≤10 items, but 4 specific decisions need your call before I apply changes.

---

### Decision A — Remove Guruhlar from primary nav?

**What it is:** Read-only group list. Admin cannot create, edit, or delete groups — only view them. The comment in `GroupManagement.jsx` literally says "Admin can only VIEW groups (read-only)."

**Why remove:** Low-value as a primary nav item when it's purely a reference view with no admin action. The dashboard already shows group count as a stat.

**If removed:** Route `/admin/groups` stays live. Can link from TeacherManagement page ("view groups") or dashboard.

**Options:**
- A1: Remove from sidebar, keep route, add link from Teachers page
- A2: Keep in sidebar as-is

My recommendation: **A1** (remove from primary nav)

---

### Decision B — Merge Muloqotlar + Xabarlar into one "Aloqa" item?

**What they are:**
- `Muloqotlar` (`/admin/communications`): read-only oversight of parent-teacher chats. Director watches but doesn't participate.
- `Xabarlar` (`/admin/messages`): compose + view messages to/from the government. Director participates (sends messages to government).

The previous session noted these are "DISTINCT" — but they could be merged into a single "Aloqa markazi" page with two internal tabs (Parent Chats | Government).

**Why merge:** Saves 1 sidebar slot. Both are communication-related. If the Aloqa section is currently 2 items, a single-item section is valid — but having 2 items is fine too.

**Options:**
- B1: Keep separate (current) — 2 sidebar items in Aloqa section
- B2: Merge into single "Aloqa markazi" with internal tabs — 1 sidebar item

My recommendation: **B1 (keep separate)** — the two flows are genuinely different (passive oversight vs active messaging). Merging adds tab UI complexity with no real benefit to the user.

---

### Decision C — Keep Terapiya in primary nav?

**What it is:** Full CRUD management for therapy resources (music, video, content). This is a **content library** that caregivers use during sessions.

**The question:** Is this a daily-use item for your target institutions (special-ed schools with dedicated therapy programs)?

**Options:**
- C1: Keep in primary sidebar nav (therapy management is core director function)
- C2: Move to Settings (therapy resources are setup-like — configured once, rarely changed)

My recommendation: **C1 (keep in sidebar)** — for special-ed institutions this is operational, not setup.

---

### Decision D — Remove IRR from primary nav?

**What it is:** A quarterly facility-level checklist journal (5 sections, ~100 checkboxes). Filled once per quarter.

**Why remove:** Quarterly frequency does not justify a persistent primary nav slot. Takes up space 363 days per year for a task that takes ~1 hour per quarter.

**If removed:** Route `/admin/irr` stays live. Link from Settings page or from Dashboard as a "Quarterly report due" attention card (the dashboard already has an attention system).

**Options:**
- D1: Remove from primary sidebar nav; keep route; link from Settings or Dashboard attention card
- D2: Keep in sidebar as-is

My recommendation: **D1** (remove from primary nav)

---

### Decision E — Collapse Tizim section: School Profile + Import + Settings

**What they are:**
- `Muassasa profili` — rarely used (initial setup + contact changes)
- `Ommaviy import` — rarely used (onboarding bursts only)
- `Sozlamalar` — occasionally (profile, password, notifications)

**Proposal:** Collapse all three into a single **Sozlamalar** sidebar item. The Settings page (`/admin/settings`) already has profile + password + notifications. Add School Profile editing and Bulk Import as tabs within Settings.

This removes 2 items from sidebar (school profile + import) and replaces the 3-item "Tizim" section with a single footer-style "Sozlamalar" item (possibly outside any section, like a persistent bottom link).

**Options:**
- E1: Collapse to single Sozlamalar — school profile + import become tabs within Settings page
- E2: Keep Tizim section with all 3 items (current)
- E3: Keep Tizim section but drop Import (move import link to Dashboard's "actions" or a one-time wizard trigger); keep School Profile + Settings

My recommendation: **E1** — consolidate to single Sozlamalar. School Profile editing and Import wizard can live as sections within the Settings page.

---

### Proposed result (after A1, B1, C1, D1, E1):

**Section 1 — Boshqaruv (5 items):**
1. Bosh sahifa
2. Qabul boshqaruvi
3. Tarbiyachilar
4. Ota-onalar
5. Hujjatlar navbati

**Section 2 — Aloqa (2 items):**
6. Muloqotlar
7. Xabarlar

**Section 3 — Kuzatuv (3 items):**
8. Ogohlantirishlar
9. Muassasa baholari
10. Terapiya boshqaruvi

**Bottom (no section header — persistent single item):**
11. Sozlamalar (with sub-sections: profile/school/import/password)

Total primary nav = **10 visible items** + 1 settings link (no section header).

Or if Settings counts as a nav item: 11 with section headers for first 3 groups only. Either way fits 1080px.

---

**Please answer A through E.** Once you reply with your choices, I apply the consolidation (STEP 4).
