# Beta UX Opinions
**S14 / BETA-VERIFICATION — Step 5**
**Opened:** 2026-06-08
**Status:** COMPLETE — all roles populated after Waves 1–6

---

## Reception Staff (in character)

*"I'm Iroda at School 1 in Toshkent. I log in every morning to check if any new parents registered, and I manage all the children's documents."*

**What worked well:**
- The 3-step parent creation wizard felt structured and logical — step 1 personal info, step 2 add children, step 3 confirm. I didn't feel lost.
- The password reset modal shows the temporary password immediately after I click "Reset" — I can copy it and call the parent right away without a separate step.
- The "Faol / Kutmoqda / To'xtatilgan" tab filter on the parents list is exactly what I needed. I can see at a glance who is still pending.
- Group creation was smooth. I gave the group a name, picked the teacher from a dropdown, and it saved immediately.

**What confused me:**
- On the Documents page, I can see "Approved", "Pending", "Rejected" counts but there is no way for me to delete a pending document if I uploaded the wrong file — the delete action is grayed out or missing unless the document is in a specific state. I had to ask my admin to intervene.
- The "New Children" grid on the dashboard is useful but the initials avatar (no photo) makes it hard to tell children apart at a glance when there are 8+ names. Photo upload would help but the OS file dialog doesn't work in some browsers.
- The sidebar nav has no active state highlight in older Chromium versions — I sometimes forget which section I am in.

**What was slow:**
- The teachers list pagination — if I have more than 10 teachers, I must click "Load more" with no indication of how many remain.
- After suspending a parent, the status badge updates but the sort order doesn't change — the suspended parent stays at the top of the list instead of moving to the "To'xtatilgan" tab automatically.

**What I'd praise:** The overall layout is clean and professional. It doesn't feel like a government software product from the 2000s. The Uzbek localization is mostly correct (a few raw keys here and there).

---

## Teacher (in character)

*"I'm Zulfiya, a special education teacher at School 1. I mark attendance every morning, write journal entries about each child, and upload materials for parents."*

**What worked well:**
- The attendance page shows all my children in one view and I can mark status with a single tap per child. The status options (Bor, Kasal, Uyda, Shifoxonada, Yo'q) cover every real case I have.
- The Quick Observation FAB (the floating "+" button) lets me jot a note about a child without leaving the attendance page — this is genuinely useful in a classroom setting.
- The reflection calendar — I can see which days I've already written reflections. Green dots on the calendar days is a good visual cue.

**What confused me:**
- The attendance status labels showed raw i18n keys ("attendance.statusPresent", "attendance.statusHomeLeave") instead of Uzbek words on my first login session. After a hard refresh they appeared correctly — I don't know what triggered it to fix itself. (DEF-007)
- The Quick Observation modal labels also appeared as raw keys on the same session. Same hard-refresh fix.
- The Chat page was slow to load conversation history — I saw a spinner for about 4 seconds before my conversations appeared.
- There is no obvious way to edit an attendance entry I already saved for today. If I made a mistake (marked "Kasal" when the child actually arrived late), I have to find the entry in the history and I'm not sure if editing is allowed.

**What was slow:**
- Uploading a media file (photo) for a child required multiple steps: click Upload, find the OS file picker, select file, wait for upload progress bar, confirm. The progress bar has no percentage — just an indeterminate spinner.
- Loading the "Activities" page the first time after login took noticeably longer than navigating there on subsequent visits (likely a cold-start cache miss on the API).

**What I'd praise:** The daily journal editor is well-designed. Each child gets their own journal entry card and the text area is large enough to type comfortably. The parent-facing view mirrors my entry almost instantly.

---

## Parent (in character — 390px mobile, Uzbek-speaking)

*"I'm Hulkar. I have a son at School 1. I check the app every morning to see if he was marked present and if his teacher left a note."*

**What worked well:**
- The "today" card on the dashboard tells me immediately: present / absent, today's meal, any new media. This is the one screen I need every morning and it works.
- The chat with teacher is easy — I type, press send, the message appears. Teacher replies appear as a notification (I was told, though I did not test push notifications in this session).
- The attendance history with the color-coded dots (green = present, orange = absent, etc.) helps me understand patterns over the month.

**What confused me and blocked me completely:**
- When I first logged in, a full-screen modal appeared asking me to accept a privacy policy ("Maxfiylik Siyosati"). I could not close it, could not tap anything behind it, and could not proceed until I pressed "Qabul qilaman". This is expected behavior, but it is P0 for any automated test or impatient user who doesn't see the button immediately. (DEF-010)
- The sidebar ("hamburger menu") described in the feature list (10 items, notifications badge) **does not exist** in the app. There is no sidebar rendered. I can only navigate via the bottom tab bar. The sidebar is dead code that was never wired into the layout. (DEF-003, P-011)
- I could not find anywhere to rate my child's teacher. The parent rating feature (P-083) was blocked — either I needed more data from the teacher first (a minimum of journal entries or observations) or the button was simply not visible.
- The media gallery (photos the teacher uploads) was visible but I could not download or save a photo to my phone from within the app. There is no long-press-to-save or download button.

**Mobile-specific observations (390×844):**
- The text is readable. Font sizes do not require zooming.
- The bottom nav icons are large enough to tap without mis-tapping on a real phone.
- Forms (chat input, rating stars) are usable at 390px width — fields don't overflow.
- The PrivacyConsentModal (DEF-010) is full-screen and its accept button is below the fold on some small phone heights — a user may scroll or give up before finding the button.

**What I'd praise:** The day card concept is well thought out. For a Uzbek-speaking parent with limited tech literacy, seeing "Bor" (present) in large text with a green background is immediately reassuring. No interpretation needed.

---

## School Admin (in character)

*"I'm admin1 at School 1 in Toshkent. I oversee teachers, monitor parent communications, approve parent documents, and use the bulk import tool."*

**What worked well:**
- The dashboard stat cards (total parents, teachers, children, groups) are a good at-a-glance health check for my school.
- The parent management table has all the columns I need: name, email, phone, status, child count, document approval status. I don't need to click into each parent record to get the basics.
- The audit/activity log gives me a timestamped record of every action taken in my school — who created what, when. This is important for accountability.
- The communications hub (teacher ↔ parent chat overview) is useful for monitoring — I can see if parents are getting responses from teachers.

**What confused me:**
- The bulk CSV import: the validate step correctly identifies errors, but the format of the error messages is technical — "Row 3: parentEmail not found". For a non-technical admin, this needs to say "Parent email rosijones@example.com does not have an account yet — please create one first".
- There is no confirmation dialog when I delete a teacher. I clicked "Delete", the teacher disappeared. I was not warned this would also affect the teacher's children group assignments.
- The school profile section shows "ratings" but it is not clear whether this rating is the parent-rated component, the government-rated component, or the combined score. The three-rating model is confusing without a tooltip explaining each number.
- The document approval workflow is one-directional — I can see document status but I cannot reject with a reason from the admin panel. That action appears to be reserved for reception staff.

**What was slow:**
- The teacher list took approximately 3–4 seconds to load on first page visit (Railway cold start on the teachers API endpoint).
- The registration requests tab was slow — opening it caused a visible spinner for 2+ seconds even with existing data.

**What I'd praise:** The suspension flow (suspend → automatic logout of the user → status badge update) works correctly and visibly. This is a safety-critical feature that worked exactly as expected.

---

## Region Government (in character)

*"I'm gov.toshkent. I oversee the two schools in the Toshkent region. I check ratings, review audit logs for unusual actions, and forward registration requests to the republic office."*

**What worked well:**
- The schools list correctly showed only 2 schools. I did not see any Samarqand schools. The regional scoping felt trustworthy.
- The audit log for my region was clean and readable. I could see which admin performed which action and when.
- The AI warnings page loaded and showed warnings relevant to my region. The "Resolve" flow (click → type notes → confirm) felt appropriate for a formal government process.
- The scope indicator in the sidebar ("Toshkent viloyati" with a pin icon vs. the republic user's globe icon) helps me understand my access level without reading documentation.

**What confused me:**
- The ratings page shows school cards, but I couldn't tell at a glance which direction I was looking at (parent-rated vs. government-rated). The toggle between directions was not prominent — I had to look for it.
- I wanted to see which specific parent left a low rating for a school, but the expanded card only shows aggregate star counts — no individual review text.
- I tried to provision a secondary government user for my region but I was not sure what each "capability grant" checkbox controls. No tooltip or explanation.
- Platform → Messages loaded but the messages appeared to be empty — no incoming messages from school admins in my region during the test period. I wasn't sure if this was by design (no messages yet) or a bug.

**What was slow:**
- The students directory loads slowly when the page first opens — I had to wait 3–4 seconds for the list to appear.
- Navigating between pages (schools → ratings → audit log → warnings) felt noticeably slower on the government portal than on admin or teacher portals. Possible Railway cold-start chains on each new route.

**What I'd praise:** The regional isolation works as advertised. I cannot accidentally see or modify Samarqand data. For a government official, this is the most important correctness property of the system.

---

## Republic Government (in character)

*"I'm gov.republic. I see all 4 schools across both regions. I approve admin registrations, provision regional government accounts, and review the national aggregate ratings."*

**What worked well:**
- The dashboard gives me a bird's-eye view: total schools, students, teachers, parents across the entire platform. The regional breakdown table (scroll down on dashboard) shows per-region stats at a glance.
- Approving a school admin registration is a clean flow: see the pending request, click Approve, see the auto-generated credentials. Copy and send to the admin — straightforward.
- The language switcher (UZ / RU) works mid-session without a page reload. Text re-renders in Russian immediately after switching.
- The audit log filter by action type is useful for narrowing down "bulk_import" vs "login" vs "create_child" events.

**What confused me:**
- Creating a government secondary user: the modal has a "canRateSchools" checkbox whose label is the raw i18n key string ("provision.grants.canRateSchools") — not a human-readable label. I could not tell what I was enabling. (DEF-004, G-050 KNOWN-FAIL)
- The three-rating model (parent rating / government rating / combined) on the school detail page is not explained anywhere in the UI. Three numbers appear; only a developer would know what they mean.
- The platform messages tab was empty — either no messages were routed to the republic account during the test, or the tab scoping is incorrect. Unclear which.
- I could not find a way to reject a registration request with a reason — only "Approve" was visible. The "Reject" functionality may be behind a different flow or may not be implemented on this view.

**What was slow:**
- The government portal is notably slower than other portals — likely because it aggregates data across all 4 schools on every page load. The schools list (with search) felt sluggish compared to the admin's school profile page.
- The ratings page took 5+ seconds to load on first visit.

**What I'd praise:** The platform design correctly separates the republic view from the region view. A republic account gets a meaningful aggregate picture; the region view is properly scoped. The scope indicator in the sidebar (globe vs. pin) is a small but effective design choice.

---

## Top-10 UX Improvements (cross-role, ranked)

| Rank | Improvement | Role(s) affected | Severity |
|---|---|---|---|
| 1 | **PrivacyConsentModal (DEF-010):** Accept button must be visible without scrolling on all screen sizes; consider auto-scroll to button on mount | Parent (all) | Blocks — user cannot proceed until dismissed |
| 2 | **i18n key fallback (DEF-007, DEF-004):** All attendance status labels, quickObs keys, and `canRateSchools` capability label must use real translations — raw keys visible to end users destroy trust | Teacher, Government | Confuses — user sees internal code strings |
| 3 | **Parent Sidebar dead code (DEF-003):** Either render the sidebar (`import Sidebar from Sidebar.jsx` in `Layout.jsx`) or delete it — a 10-item sidebar that was designed but never wired in is missing navigation for parent users | Parent | Confuses — navigation features are absent |
| 4 | **Three-rating model explanation:** Add a tooltip or legend on all pages that show three numbers (parent rating / gov rating / combined) — no user can interpret three unlabeled scores | Admin, Government | Confuses — core feature is not understandable |
| 5 | **Government portal performance:** Aggregate API calls should be pre-aggregated or cached — the 3–5s load time on ratings/students/schools pages makes the portal feel broken on first visit | Government | Annoys — page appears stalled during load |
| 6 | **Admin: delete confirmation dialogs:** Destructive actions (delete teacher, delete parent, bulk delete) need a confirmation modal with a warning about side effects (group unassignment, child orphaning) | Admin, Reception | Blocks recovery — accidental deletes are unrecoverable |
| 7 | **Capability grant labels in gov user provisioning:** Each checkbox should have a one-sentence tooltip explaining what the capability enables and what it restricts — currently the form requires system knowledge | Government | Confuses — admin cannot safely configure secondary users |
| 8 | **Load state indicators:** Pages that load slowly (students directory, ratings) should show a skeleton/shimmer during data fetch — the blank white screen before content appears feels like a crash | All roles | Annoys — users cannot tell if the app is loading or broken |
| 9 | **Parent media download:** Parents cannot save a photo the teacher uploads to their device — there is no download affordance. This is a core parent expectation ("my child's photo from school"). | Parent | Annoys — missing expected functionality |
| 10 | **Attendance edit flow:** Teachers should be able to correct today's attendance status (e.g., "Yo'q" → "Kasal") without losing history. The edit path is unclear or absent in the current UI. | Teacher | Annoys — data entry errors cannot be corrected |
