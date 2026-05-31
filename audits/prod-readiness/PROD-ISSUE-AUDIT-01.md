# PROD-ISSUE-AUDIT-01 — Uchqun Platform Production Quality Audit

**Date:** 2026-05-31
**Scope:** Backend + all 5 portals (Government, Admin, Reception, Teacher, Parent)
**Categories audited:** Rate Limits · Empty States · Form State Loss · Destructive Safety · Orphan Routes · Error Messages · Cross-Portal Delivery · Loading States · i18n Completeness
**Severity scale:** HIGH = user-blocking or data-safety risk · MEDIUM = user-frustrating, workflow-breaking · LOW = cosmetic / polish

---

## Part A — Audit Findings

---

### A-1. Executive Summary — Top 5 Pre-Launch Blockers

These five findings must be resolved before any real user touches the platform. Each represents either a safety risk, a complete workflow failure, or a first-impression failure that will immediately erode trust.

---

**BLOCKER 1 — `[object Object]` renders in error toasts (all portals)**

Every portal uses the pattern `showError(err.response?.data?.error || t('fallback'))`. For any endpoint that has migrated to the BACKEND-012 shape (`{ success: false, error: { code, detail } }`), `err.response?.data?.error` resolves to a JavaScript object. React renders it as the literal string `[object Object]` in the toast. This affects approximately 35 call sites. A user who encounters any server error on these paths sees `[object Object]` — a technical artefact, not a message. This is the single highest-frequency UX defect in the codebase.

Fix: normalize in `shared/services/api.js` Axios response interceptor — extract `.error.detail ?? .error.code ?? .error` and coerce to string before it reaches component error handlers.

---

**BLOCKER 2 — Reception portal Russian locale missing 62 keys (login screen + parent wizard + entire registration form)**

Russian is the administrative working language for most government employees in Uzbekistan. When a Reception user selects Russian, the login page shows Uzbek text, the parent wizard step labels are Uzbek, and all 30 fields in the parent registration form fall back to Uzbek `defaultValue` strings. This is not a cosmetic issue — the primary data-entry workflow (registering parents and children) is unusable in the administrative language.

Fix: populate `reception/src/locales/ru/common.json` with the 62 missing keys. All keys exist in the UZ locale and can be translated.

---

**BLOCKER 3 — Teacher portal: Meals, Therapy, and AI Warnings pages are orphaned — no navigation entry point**

`/teacher/meals`, `/teacher/therapy`, and `/teacher/ai-warnings` are fully implemented pages with routes declared in `App.jsx`, but there is no link to them in the Sidebar, MobileTabBar, or Dashboard quick-links. A teacher cannot reach these pages by any UI interaction — only by typing the URL directly. Meals and therapy are core daily-use features. AI warnings are a safeguarding tool. None are accessible.

Fix: add nav entries to `teacher/src/components/Sidebar.jsx` (NAV_SECTIONS) and `teacher/src/components/MobileTabBar.jsx` for all three routes.

---

**BLOCKER 4 — Urgent child observations generate no notification to any user**

When a teacher creates an observation with `severity === 'urgent'`, the backend logs a server-side warning but calls no `emitToUser` and creates no `Notification` row. The parent has no observation feed at all. The admin has no real-time alert. An urgent safeguarding event is recorded in the database and goes no further. The only way for anyone outside the teacher's session to know is to manually query the DB or receive an out-of-band communication.

Fix: in `observationController.js`, create a `Notification` row for `severity === 'urgent'` observations and call `emitToUser(child.parentId, 'notification:new', ...)`. Consider also notifying the school admin.

---

**BLOCKER 5 — Parent suspension enforced passively: up to 15-minute active-session window**

When an admin suspends a parent, `suspendParent` in `adminParentController.js` updates `status = 'suspended'` but does not revoke the JWT, emit a force-logout event, or blacklist the JTI. The parent remains fully authenticated for up to 15 minutes (access token lifetime) and can continue making API calls. For a suspension triggered by a safeguarding event, a 15-minute window is unacceptable.

Fix: on suspension, add the parent's current JTI to the revocation store (Redis `revoked:{jti}` with TTL = remaining token lifetime). The `authenticate` middleware already checks `isRevoked()` — the infrastructure is in place. Additionally, emit `user:force-logout` via `emitToUser` so the parent socket session disconnects immediately.

---

### A-2. Per-Category Findings Table

---

#### Category 1 — Rate Limits

| ID | Portal / Layer | File:Line | Issue | Severity | Fix Direction |
|----|---------------|-----------|-------|----------|---------------|
| RL-001 | Backend | `middleware/rateLimiter.js` | `passwordResetLimiter` exported but mounted on no route. If ever mounted as-is: 3 req/hr, IP-keyed, no skip-success — 3 parents on same school NAT exhaust quota for everyone. | MEDIUM (latent) | Delete or annotate with intended mount point and add user-ID keying + skip-success |
| RL-002 | Backend | `middleware/rateLimiter.js` | `changePasswordLimiter` is IP-keyed on an authenticated endpoint (`PUT /user/password`). In a school lab, 10 combined failed change-password attempts from any users trips the limit for all users behind NAT. `req.user.id` is available post-auth. | MEDIUM | Change key to `` `chgpwd:${req.user?.id || req.ip}` `` — same pattern as `dataExportLimiter` |
| RL-003 | Backend | `server.js:153` | `apiLimiter` 500 req/15 min per IP. With 5 portals sharing a school NAT, ~34 concurrent active users exhaust limit during class-start polling burst. No env override is set in Railway by default; `RATE_LIMIT_API_MAX` is undocumented in `.env.example`. | MEDIUM | Raise default to 1000 or add per-user keying for authenticated requests; document env var |
| RL-004 | Backend | `middleware/rateLimiter.js` | `loginIpLimiter` (100 failed/hr) has no unlock path. `POST /auth/unlock-account` unlocks only the per-email store, not the `loginip:` Redis bucket. No operator can clear this without direct Redis access. | LOW | Document the limitation; optionally extend unlock-account to clear loginip bucket for government role |
| RL-005 | Backend | `middleware/rateLimiter.js` | 429 response shapes inconsistent. `loginLimiter` and `loginIpLimiter` return correct BACKEND-012 shape. `apiLimiter`, `authLimiter`, `changePasswordLimiter`, `uploadLimiter` return legacy `{ error: string, message: string }`. Frontend must handle both shapes. | LOW | Migrate all 429 handlers to `{ success: false, error: { code, detail } }` shape |

---

#### Category 2 — Empty States

| ID | Portal | File:Line | Issue | Severity | Fix Direction |
|----|--------|-----------|-------|----------|---------------|
| ES-001 | Government | `pages/AdminDetails.jsx:164,185,206,227,248` | All 5 sub-sections (Receptions, Schools, Teachers, Parents, Children) guarded with `{list.length > 0 && (...)}` — no else branch. A freshly-provisioned admin shows a near-blank detail page with no guidance or call-to-action. | HIGH | Add `{list.length === 0 && <EmptyState text="..." />}` for each section |
| ES-002 | Teacher | `pages/Dashboard.jsx:219,284,348,385` | "Class at a glance" and "attention items" sections silently absent when teacher has no assigned children. Teacher sees all-zeros stat cards with no explanation and no CTA to contact admin. | HIGH | Add empty-state message with link to contact admin or explanation of how children get assigned |
| ES-003 | Admin | (no route exists) | Admin portal has no `/admin/children` list page. Children are only discoverable via ParentManagement drill-down. A new admin cannot browse all enrolled children. Missing navigation entirely, not just empty state. | HIGH | Add a children list page under admin portal or add a children count/link on the Dashboard |
| ES-004 | Government | `pages/AIWarnings.jsx:173,212` | Warning count panel and severity breakdown panel both guarded with `!loading && warnings.length > 0 &&` — no else. For a school with zero AI warnings, both stat panels are silently absent with no explanation. | MEDIUM | Add `{warnings.length === 0 && !loading && <ZeroWarningsPanel />}` |
| ES-005 | Government | `pages/Dashboard.jsx:282` | Regional breakdown table guarded with `isRepublic && regionBreakdown.length > 0 &&` — no else. New republic-scope account with no schools registered shows a blank dashboard section. | MEDIUM | Render a "No schools registered yet" card in the region table area |
| ES-006 | Reception | `pages/Dashboard.jsx:269` | Recent activity section guarded with `recentActivity.length > 0 &&` — no else. Brand-new reception account shows a blank lower dashboard half. | MEDIUM | Add "No activity yet — start by registering a parent" empty-state row |
| ES-007 | Teacher | `pages/IrrShell.jsx:892` | Assessment sessions section header renders but table body is empty and silent after data loads with zero sessions. No "no sessions yet" message. | MEDIUM | Add empty-state row inside the table body |
| ES-008 | Parent | `parent/pages/ChildIRR.jsx:171,216,239` | Sessions, long-term goals, and periods sections each guarded `{data.length > 0 && ...}`. If only some sections are empty, they disappear silently — parent cannot distinguish "not yet filled" from "failed to load". | MEDIUM | Add per-section empty-state messages |
| ES-009 | Parent | `parent/pages/childProfile/EmotionalMonitoringSection.jsx:12` | `if (!records || records.length === 0) return null` — entire section returns null silently. Parent sees nothing; no "no emotional monitoring data yet" message. | MEDIUM | Return an empty-state card rather than null |
| ES-010 | Teacher | `pages/IrrShell.jsx:1577,1693` | Daily/weekly monitoring history sections guarded `entries.length > 0 &&` — no else. History section is silently absent; only the input form is visible. | LOW | Add "No history recorded yet" text below each form |
| ES-011 | Parent | `parent/pages/ChildProfile.jsx:345` | "My messages" button hidden entirely when parent has no sent messages. No "send your first message" prompt visible. | LOW | Always render the button, or add a prompt when empty |

---

#### Category 3 — Form State Loss

| ID | Portal | File:Line | Issue | Severity | Fix Direction |
|----|--------|-----------|-------|----------|---------------|
| FSL-001 | Admin | `pages/BulkImport.jsx:44-50` | 5-step wizard in `useState` only. Navigating away mid-wizard discards file, validation results, and job state. At step 4 (polling), the polling interval tears down on unmount but the backend import continues — user cannot reconnect to the running job on return. | HIGH | Persist `jobId` + `step` to `sessionStorage`; restore on mount; reconnect polling if `status` is `importing` |
| FSL-002 | Teacher | `pages/IrrShell.jsx:116-178` | IRR assessment session form has 17 scored items with no auto-save and no draft persistence. Navigating away loses all scores silently. | HIGH | Auto-save assessment scores to `sessionStorage` keyed by `childId + periodId`; restore on mount |
| FSL-003 | Reception | `pages/ParentWizard/ParentWizardPage.jsx:31-33` | 3-step parent+child wizard only saves draft on explicit button click. Browser back or accidental navigation loses all progress with no guard. | MEDIUM | Auto-save `parentData`, `childData`, `step` to `localStorage` on every field change (throttled); add `beforeunload` warning |
| FSL-004 | Reception | `pages/parents/ParentFormModal.jsx` (rendered in `ParentManagement.jsx:732`) | `onClose` does not reset `formData`. Reopening the modal for a new parent shows the previous partially-filled data. | MEDIUM | Call `resetFormData()` in the `onClose` handler before `setShowModal(false)` |
| FSL-005 | Teacher | `pages/activities/ActivityFormModal.jsx` (rendered in `Activities.jsx:295`) | X button hides modal but does not reset `formData`. Re-opening create modal shows stale partial data from the previous aborted session. | MEDIUM | Reset `formData` to defaults in the close handler |
| FSL-006 | Teacher | `pages/media/MediaFormModal.jsx` (rendered in `Media.jsx`) | Same pattern as FSL-005 — close does not reset `formData` + `file` state. | MEDIUM | Reset in close handler |
| FSL-007 | Teacher | `components/ParentJournalComposer.jsx:26-33` | Subject and body auto-save to `localStorage` every 5 s, but photos (FileList) are not serializable and are always lost on navigation or refresh. | MEDIUM | Add a visible "Photos will be lost on navigation — submit first" warning when files are attached |
| FSL-008 | Reception | `pages/parents/ChildFormModal.jsx` (edit path, `ParentManagement.jsx:750`) | Edit-child close path does not reset `childFormData`. Only the add-child path resets on open. | LOW | Reset `childFormData` in the edit-child close handler |
| FSL-009 | Teacher | `pages/therapy/TherapyFormModal.jsx` | Close does not reset `formData`. Same pattern as FSL-005/006. | LOW | Reset in close handler |

---

#### Category 4 — Destructive Action Safety

| ID | Portal | File:Line | Action | Has Confirm? | Reversible? | Issue | Severity | Fix Direction |
|----|--------|-----------|--------|-------------|-------------|-------|----------|---------------|
| DS-001 | Government | `pages/Platform.jsx:223` | Reject admin registration request | NO | NO — permanently rejects | Direct API call on button press. No confirm step. Rejection cannot be re-queued. | HIGH | Add `ConfirmDialog` with explanation that rejection is permanent |
| DS-002 | Reception | `pages/GroupManagement.jsx:82-96` | Delete group | YES (ConfirmDialog) | NO — `Group` model has no `paranoid: true`; hard delete | Dialog does not warn that this is a permanent hard-delete. All children's group assignments are affected. | HIGH | Add "This cannot be undone" language to dialog; implement soft-delete for Group model |
| DS-003 | Teacher | `pages/IrrShell.jsx:318-325` | Delete long-term goal (LTG) | NO | Paranoid (soft-delete); no restore UI | Direct API call on button click. IRR goal records are safeguarding-critical clinical data. | HIGH | Add `ConfirmDialog` before API call |
| DS-004 | Teacher | `pages/IrrShell.jsx:411-421` | Delete short-term goal (STG) | NO | Paranoid (soft-delete); no restore UI | Same as DS-003. | HIGH | Add `ConfirmDialog` before API call |
| DS-005 | Admin | `pages/AIWarnings.jsx:218-230` | Resolve AI warning | NO | NO — marks `resolvedAt`; no undo endpoint | Direct API call on resolve button. Resolution is permanent. | MEDIUM | Add `ConfirmDialog` with "This marks the warning as resolved and cannot be undone" |
| DS-006 | Teacher | `pages/MonitoringJournal.jsx:188-205` | Delete monitoring record | "Click-again" (5 s window + toast) | Paranoid; no restore UI | Toast auto-dismisses; rapid double-click can bypass guard. Not a modal. | MEDIUM | Replace with `ConfirmDialog` modal |
| DS-007 | Teacher | `pages/TherapyManagement.jsx:221-238` | Delete therapy | "Click-again" (5 s window + toast) | Paranoid; no restore UI | Same as DS-006. | MEDIUM | Replace with `ConfirmDialog` modal |
| DS-008 | Reception | `pages/Documents.jsx:65-81` | Delete own document | NO | Paranoid; no restore UI in reception portal | `handleRemove` calls API directly. Accidental deletion requires re-upload and re-approval cycle. | MEDIUM | Add `ConfirmDialog` |
| DS-009 | Government | `pages/Platform.jsx:136-154` | Delete admin account | YES | Paranoid (User model) — but no restore UI in government portal | Dialog does not mention the action is hard to reverse (admin + their school associations). | MEDIUM | Add "cannot be easily undone" language to confirm dialog |
| DS-010 | Admin | `pages/TherapyManagement.jsx:138-152` | Delete therapy (admin portal) | YES (ConfirmDialog) | Paranoid; no restore UI exposed | No "cannot be undone" language in dialog. | LOW | Add irreversibility note to dialog |
| DS-011 | All | All destructive confirm dialogs | All irreversible confirms | YES | NO for hard-deletes / no-restore-UI cases | None of the confirm dialogs include language explaining the action cannot be undone. | LOW | Add "This action cannot be undone." to all dialogs for hard-deletes or actions without a restore UI |

---

#### Category 5 — Orphan Routes and Dead Links

| ID | Portal | Route | Issue | Severity | Fix Direction |
|----|--------|-------|-------|----------|---------------|
| OR-001 | Government | `/government/admin/:id` (AdminDetails page) | No link from any nav component, tab, or page. Only reachable by typing URL. The AdminsTab in Platform shows admin cards but does not link to the detail page. | HIGH | Add `<Link to={`/government/admin/${admin.id}`}>` to each admin card in `AdminsTab.jsx` |
| OR-002 | Teacher | `/teacher/meals` | Fully built page; routed in App.jsx; appears in PAGE_NAMES map. Zero nav entries in Sidebar, MobileTabBar, or Dashboard. | HIGH | Add to `teacher/src/components/Sidebar.jsx` NAV_SECTIONS and MobileTabBar |
| OR-003 | Teacher | `/teacher/therapy` | Same situation as OR-002. TherapyManagement is a full feature with CRUD. | HIGH | Add to Sidebar NAV_SECTIONS and MobileTabBar |
| OR-004 | Teacher | `/teacher/ai-warnings` | Imported and routed in App.jsx but not linked from any nav component. | HIGH | Add to Sidebar (conditionally visible, same permission as admin AI Warnings) |
| OR-005 | Teacher | `/teacher/journal` | Duplicate route mounting same `DailyReflection` component as `/teacher/reflection`. No nav link. Likely a dead alias. | LOW | Remove the duplicate route or redirect it to `/teacher/reflection` |
| OR-006 | Reception | `/reception/profile` | Desktop Sidebar has no profile link. Only reachable via mobile BottomNav. Desktop-only reception users cannot access their profile. | MEDIUM | Add profile link to `reception/src/components/Sidebar.jsx` secondary nav |
| OR-007 | Teacher | `/teacher/profile` | Desktop Sidebar has no profile entry. Only reachable via mobile MobileTabBar or TopBar avatar. | MEDIUM | Add profile link to `teacher/src/components/Sidebar.jsx` |
| OR-008 | Parent | `/meals`, `/media`, `/help`, `/therapy` | Not in DesktopTopNav or MobileTabBar — only in Sidebar and Dashboard quick-links. Users who hide the sidebar on desktop and rely on top nav have no path to these features. | LOW | Add to DesktopTopNav or ensure Sidebar is always visible on desktop |

---

#### Category 6 — Error Message Quality

| ID | Portal | File:Line | Issue | Severity | Fix Direction |
|----|--------|-----------|-------|----------|---------------|
| EM-001 | All | `shared/services/api.js` (Axios instance) | ~35 call sites use `showError(err.response?.data?.error || t('fallback'))`. For BACKEND-012 endpoints, `.error` is an object → renders as `[object Object]` in toast. | HIGH | Normalize in Axios response interceptor: extract `data.error?.detail ?? data.error?.code ?? data.error` and coerce to string |
| EM-002 | All | All portals | `err.message` (Axios network error) is always English browser/Axios text: "Network Error", "timeout of 30000ms exceeded". Shown directly in error divs on no-response errors. | HIGH | Check `!error.response` first in catch blocks; use `t('common.networkError')` for network-level failures |
| EM-003 | Teacher | `pages/IrrShell.jsx:294,312,323,387,405,419,432,445,559` (~10 call sites) | Error messages hardcoded as Uzbek Cyrillic strings — `'Мақсадни сақлашда хато'`, `'Имзо қўйишда хато'`, etc. Displayed in Cyrillic regardless of user's selected language (UZ Latin, RU, EN). | HIGH | Replace with `t('irr.errorSaveGoal')` etc. and add keys to all locale files |
| EM-004 | Admin | `pages/BulkImport.jsx` (`humanizeCode()`) | Only 5 of ~20 `IMPORT_ROW_*` error codes are mapped to human-readable strings. Unrecognized codes like `IMPORT_ROW_DOB_INVALID` are displayed verbatim to admin users. | HIGH | Extend `ERROR_CODE_MAP` to cover all codes defined in the backend import controller |
| EM-005 | Reception | `pages/ParentManagement.jsx:269-270` | Child-add error handler appends `JSON.stringify(error.response.data.missing)` to the toast. End user sees e.g. `[object Object] - Missing: ["firstName","lastName"]`. Raw JSON in user-facing UI. | HIGH | Remove the `JSON.stringify` append; map field names to translated labels or show a generic "required fields missing" message |
| EM-006 | Teacher | `pages/IrrShell.jsx` | `DAILY_ENTRY_DUPLICATE` error hardcoded to Uzbek Cyrillic string regardless of language selection. | MEDIUM | Use `t('irr.errorDuplicateDailyEntry')` and add to locale files |
| EM-007 | Reception / Government | `pages/TeacherManagement.jsx`, `pages/Platform.jsx` | Several newer call sites correctly extract `.error.detail` — but per BACKEND-012, `detail` is "for Sentry triage only — never shown to users." These portals show English debug strings to real users. | MEDIUM | Extract `.error.code` instead and map to i18n key; fall back to generic translated message |
| EM-008 | Admin/Teacher/Reception | Login pages (non-government) | Suspended account at login falls through to generic `t('login.invalid')` — only the government portal reads `result.error?.code === 'ACCOUNT_NOT_ACTIVE'` and shows a specific message. | MEDIUM | Add `ACCOUNT_NOT_ACTIVE` code check to all portal login pages |
| EM-009 | Teacher | `pages/Attendance.jsx` | Error messages hardcoded as Uzbek Latin: `"Bolalar ro'yxatini yuklashda xatolik"`, `'Saqlashda xatolik yuz berdi'`. Not wrapped in `t()`. | MEDIUM | Replace with `t('attendance.errorLoad')` and `t('attendance.errorSave')` |
| EM-010 | Teacher | `pages/ChildDetail.jsx` | `showError('ИРР ma\'lumotlari yuklanmadi')` — Uzbek Cyrillic with mixed script. | MEDIUM | Replace with `t('childDetail.errorIrrLoad')` |
| EM-011 | Backend | `backend/i18n/uz-latn.json` (132 entries) | Backend i18n error-code catalog exists but is never consulted by any frontend portal. Frontends have no mechanism to look up backend `code` values against the shared catalog. | MEDIUM | Document the catalog and consider exposing error code translations as a shared package or JSON import in the frontend |

---

#### Category 7 — Cross-Portal Delivery

| ID | Flow | Backend Event | Frontend Listener | Delivery | Severity | Fix Direction |
|----|------|--------------|-------------------|----------|----------|---------------|
| CP-001 | Teacher creates urgent observation → parent/admin notified | None emitted | None — no parent observation feed | Not delivered | HIGH | In `observationController.js`: create `Notification` row for `severity === 'urgent'`; call `emitToUser(child.parentId, 'notification:new', ...)`; also notify school admin |
| CP-002 | Admin suspends parent → parent force-logged out | None emitted | None — no `user:suspended` handler in parent socket | Passive: 401 on next token refresh (up to 15 min delay) | HIGH | In `adminParentController.js`: add JTI to revocation store on suspension; emit `emitToUser(parentId, 'user:force-logout')` |
| CP-003 | Government archives school → admin/reception forced off | None emitted | None — `api.js` interceptor only clears auth on 401, not 403 | Passive: individual API calls return 403 `SCHOOL_ARCHIVED`; sessions stay alive; no redirect | MEDIUM | In `governmentController.js` `archiveSchool`: emit `user:force-logout` to all school users; in `api.js`: handle 403 with code `SCHOOL_ARCHIVED` as a logout trigger |
| CP-004 | Admin approves reception documents → reception sees approved | None emitted | None — `Documents.jsx` fetches once on mount | Manual refresh only | MEDIUM | In `adminReceptionController.js` `approveDocument`: call `emitToUser(receptionUserId, 'document:approved')` and create a `Notification` row; subscribe in `reception/pages/Documents.jsx` |
| CP-005 | Parent/admin sends government message → government inbox notified | None emitted | None — government portal has zero socket infrastructure | Manual refresh only | MEDIUM | Add `emitToUser(governmentUserId, 'message:new')` in `governmentMessageController.js`; government portal does not have socket context — requires adding `SocketContext` to government portal |
| CP-006 | Teacher updates IRR progress → parent sees updated IRR | None emitted | None — `ChildIRR.jsx` fetches on mount only | Manual navigation | LOW | Emit `irr:updated` in `goalController.js`; subscribe in parent `ChildIRR.jsx` and Dashboard |
| CP-007 | Reception creates parent → parent receives credentials | N/A | `WizardCompletePage.jsx` shows no credentials | Out-of-band (staff verbal/paper) | LOW | Display plaintext generated password on `WizardCompletePage` (one-time reveal, dismiss to confirm); long-term: integrate email delivery |

---

#### Category 8 — Loading States

| ID | Portal | File:Line | Issue | Severity | Fix Direction |
|----|--------|-----------|-------|----------|---------------|
| LS-001 | Reception | `pages/Dashboard.jsx:28` | `const [, setLoading] = useState(...)` — loading boolean is destructured away with `,`. Dashboard renders with all stats at 0 and all lists showing empty-state content while 4 parallel API calls run. | HIGH | Change to `const [loading, setLoading] = useState(...)` and add `<SkeletonDashboard />` conditional render |
| LS-002 | Teacher | `pages/Chat.jsx:33-57,60-75` | No `loading` state for initial parent-list fetch or message load. Parent selector renders empty during API call; message panel shows "chat.empty" during initial load. | HIGH | Add `loadingParents` and `loadingMessages` states; show spinner in selector area and message pane during load |
| LS-003 | Teacher | `pages/DailyReflection.jsx` | No loading state for `children` or `observations` fetched in `useEffect`. Shows "no observations" empty state for 200–800 ms before real data arrives (false negative). | MEDIUM | Add `loadingObs` state; show skeleton or suppress empty-state display while `loadingObs === true` |
| LS-004 | Admin | `pages/BulkImport.jsx` | Step 4 import shows spinner + polling text but no progress bar or row count. Import can take minutes with zero progress feedback. | MEDIUM | Poll `GET /admin/import/:id/status` response includes `processedRows` and `totalRows` — render a progress bar using those values |
| LS-005 | Parent | `parent/pages/Chat.jsx` | No loading indicator during initial `chatStore` load. Shows empty state briefly on first open. | LOW | Add `loadingMessages` flag; show spinner in message area during load |

---

#### Category 9 — i18n Completeness

| ID | Portal | File:Line | Issue | Severity | Fix Direction |
|----|--------|-----------|-------|----------|---------------|
| I18N-001 | Reception | `src/locales/ru/common.json` | 62 keys missing: `login` (5 keys), `wizard` (10 step labels), `parentsPage.form` (30 field labels), `documents` (7 keys), `nav` (2 keys). Russian-speaking users see Uzbek text on the login screen and throughout the primary data-entry workflow. | HIGH | Populate all 62 missing keys; UZ locale is complete and can serve as translation source |
| I18N-002 | All | All portals — 408 occurrences across 62 files | `t('key', { defaultValue: 'Uzbek string' })` pattern used systemically. Every untranslated key silently falls back to Uzbek rather than producing a visible missing-key warning. Users on RU or EN see Uzbek text for any gap. | HIGH | Audit defaultValues; switch to English defaults where RU/EN translations exist; enable i18next missing-key logging in dev |
| I18N-003 | Reception | `src/locales/en/common.json` | 40 keys missing across the same feature groups as I18N-001. English is the fallback for non-RU/non-UZ speakers and for developer testing. | MEDIUM | Populate all 40 missing keys |
| I18N-004 | All (Reception 16, Teacher 12, Admin 5) | Multiple files (see below) | 33 hardcoded Uzbek JSX strings not wrapped in `t()` — bypasses i18n entirely. Always show in Uzbek regardless of user language selection. | MEDIUM | Wrap in `t()` and add keys to all locale files. Key files: `reception/src/pages/Documents.jsx` (8), `reception/src/pages/ParentManagement.jsx` (6), `reception/src/pages/ParentWizard/WizardCompletePage.jsx`, `teacher/src/components/Sidebar.jsx:L33`, `teacher/src/pages/Dashboard.jsx:L105,108,222,259,272,319,324`, `teacher/src/components/QuickObservation.jsx:L60,124,154` |
| I18N-005 | Government | `src/locales/en/common.json` | 9 keys missing for school archive/reactivate flow: `schoolDetail.archiveSchool`, `schoolDetail.confirmArchive`, `schoolDetail.archiveSuccess`, `schoolDetail.archiveError`, `schoolDetail.alreadyArchived`, `schoolDetail.reactivateSchool`, `schoolDetail.confirmReactivate`, `schoolDetail.reactivateSuccess`, `schoolDetail.alreadyActive`. Government users on English see Uzbek for these actions. | MEDIUM | Add the 9 keys to `government/src/locales/en/common.json` |
| I18N-006 | Admin | `src/locales/ru/common.json`, `src/locales/uz/common.json` | 2 keys missing in both RU and UZ: `dashboard.pntsCard`, `nav.pnts` — new PNTS feature not yet translated. | LOW | Add translations for both keys in RU and UZ |
| I18N-007 | Backend | `backend/i18n/` | Backend i18n files pass verification (217/217 keys in all 3 languages). No action required. | PASS | — |

---

### A-3. Severity Count Summary

| Category | HIGH | MEDIUM | LOW | Total |
|----------|------|--------|-----|-------|
| Rate Limits | 0 | 3 | 2 | 5 |
| Empty States | 3 | 6 | 2 | 11 |
| Form State Loss | 2 | 5 | 2 | 9 |
| Destructive Safety | 4 | 5 | 2 | 11 |
| Orphan Routes | 4 | 2 | 2 | 8 |
| Error Messages | 5 | 6 | 0 | 11 |
| Cross-Portal Delivery | 2 | 3 | 2 | 7 |
| Loading States | 2 | 2 | 1 | 5 |
| i18n Completeness | 2 | 4 | 1 | 7 |
| **TOTAL** | **24** | **36** | **14** | **74** |

---

---

## Part B — Human Walkthrough Checklist

**Test environment:** https://uchqun-production-b484.up.railway.app

**Test accounts (password `Test@2026` for all):**
- Government: check `credentials.md` for `@government.uchqun.uz` accounts
- Admin: `admin@school1.uchqun.uz` (or equivalent from `credentials.md`)
- Reception: `reception@school1.uchqun.uz`
- Teacher: `teacher1@school1.uchqun.uz`
- Parent: `parent1@school1.uchqun.uz`

**How to use this checklist:** Work through each scenario in order. Mark PASS / FAIL / OBSERVE. Note the exact URL, visible text, and any console errors for each FAIL.

---

### B-1. Login Flows

#### B-1-a. Correct credentials

- [ ] Log in as Government user → expect: redirect to `/government` dashboard, no errors
- [ ] Log in as Admin → expect: redirect to `/admin` dashboard
- [ ] Log in as Reception → expect: redirect to `/reception` dashboard
- [ ] Log in as Teacher → expect: redirect to `/teacher` dashboard
- [ ] Log in as Parent → expect: redirect to parent dashboard at `/`

#### B-1-b. Wrong password (error message quality)

- [ ] On the Government login page, enter a valid email with a wrong password → **expect:** a translated error message in the selected language, NOT `[object Object]`
- [ ] Switch language to Russian, repeat wrong-password attempt on Reception login → **expect:** error in Russian (or English fallback), NOT Uzbek text
- [ ] After 5 wrong attempts on the same email, attempt again → **expect:** a rate-limit message explaining the lockout, in the selected language

#### B-1-c. Suspended account

- [ ] (Setup: using Admin portal, suspend a parent account) → then log in as that parent → **expect:** a meaningful "account suspended" message, NOT "Invalid email or password"
- [ ] Verify the same on Teacher, Admin, and Reception login pages — all should show a specific suspended-account message (currently only Government portal does this correctly)

#### B-1-d. Must-change-password flow

- [ ] Log in as a newly provisioned teacher (first login) → **expect:** automatic redirect to change-password page
- [ ] Enter new password and confirm → **expect:** redirect to teacher dashboard
- [ ] Attempt to navigate directly to `/teacher` before changing password → **expect:** redirect back to change-password page

#### B-1-e. Session expiry

- [ ] Log in as Parent → wait 15 minutes without activity (or clear the access token cookie manually) → make any page action → **expect:** automatic redirect to login page, NOT a `[object Object]` error toast

---

### B-2. Empty State Checks

#### B-2-a. Fresh school / new admin

- [ ] Log in as Government → navigate to a newly created admin's detail page (or create a test admin with no associated data) → **expect:** each section (Receptions, Schools, Teachers, Parents, Children) shows a meaningful empty-state message, NOT a blank page
- [ ] Verify the page URL is accessible by clicking through from the Platform page (currently OR-001 — there may be no link)

#### B-2-b. Teacher with no assigned children

- [ ] Log in as a teacher account that has no children in their group → **expect:** the Dashboard "Class at a glance" section shows a message explaining how to get children assigned, NOT a silent blank area
- [ ] Verify Meals, Therapy, and AI Warnings pages are reachable from the Sidebar (currently OR-002, OR-003, OR-004)

#### B-2-c. Reception dashboard on first login

- [ ] Log in as a brand-new reception account → **expect:** the Recent Activity section on the Dashboard shows a "no activity yet" message, NOT a blank lower half; all stat counters show 0 with a spinner or skeleton during initial load (not instant zeros — see LS-001)

#### B-2-d. Parent with partial IRR data

- [ ] Log in as a parent whose child has IRR sessions recorded but no periods yet (or vice versa) → navigate to Child IRR page → **expect:** each section that has no data shows a "not yet filled" message, NOT silently disappears

#### B-2-e. Emotional monitoring — no records

- [ ] Log in as a parent whose child has no emotional monitoring records → navigate to Child Profile → **expect:** the Emotional Monitoring section shows a "no data yet" card, NOT completely absent from the page

---

### B-3. Destructive Action Safety

#### B-3-a. Group delete (hard delete — no recovery)

- [ ] Log in as Reception → navigate to Groups → attempt to delete a group → **expect:** confirmation dialog; **observe:** does the dialog warn this is permanent and cannot be undone?
- [ ] Confirm deletion → verify group is gone → verify there is no way to restore it from Trash (there should not be — document this as expected)

#### B-3-b. IRR goal delete (no confirm dialog)

- [ ] Log in as Teacher → navigate to a child's IRR → attempt to delete a Long-Term Goal → **expect:** a confirmation dialog before deletion; **observe:** currently no dialog fires — deletion is immediate (DS-003)
- [ ] Repeat for a Short-Term Goal (DS-004)

#### B-3-c. Admin registration rejection (no confirm)

- [ ] Log in as Government → navigate to Platform → find a pending admin registration request → click Reject → **expect:** a confirmation dialog; **observe:** currently fires immediately (DS-001)

#### B-3-d. Resolve AI warning (no confirm)

- [ ] Log in as Admin → navigate to AI Warnings → click Resolve on any warning → **expect:** a confirmation dialog explaining the action is permanent; **observe:** currently fires immediately (DS-005)

#### B-3-e. Document delete without confirm

- [ ] Log in as Reception → navigate to Documents → click delete on any uploaded document → **expect:** a confirmation dialog; **observe:** currently fires immediately (DS-008)

#### B-3-f. Reversible actions (positive test)

- [ ] Log in as Admin → suspend a parent → **expect:** confirm dialog → confirm → verify parent status changes → activate the same parent → **expect:** confirm dialog → confirm → verify status restored
- [ ] Log in as Government → archive a school → **expect:** confirm dialog → confirm → verify school shows archived status → reactivate → verify active again

---

### B-4. Cross-Portal Flows

#### B-4-a. Teacher creates activity → parent sees it (real-time)

- [ ] Open parent portal in one browser tab (logged in as a parent)
- [ ] Open teacher portal in another tab (logged in as the parent's child's teacher)
- [ ] Teacher creates a new activity → **expect:** within 5 seconds, parent dashboard updates without a manual refresh

#### B-4-b. Admin suspends parent → parent session ends

- [ ] Log in as parent in one browser tab; keep an eye on what happens after suspension
- [ ] In another tab (admin), suspend that parent account
- [ ] In the parent tab: wait up to 15 minutes (token expiry) then attempt any action → **expect:** redirect to login page
- [ ] **Verify the lag:** the parent should ideally be force-logged out immediately, not after 15 minutes (CP-002 — currently fails immediate enforcement)

#### B-4-c. Teacher creates urgent observation → parent notification

- [ ] Log in as parent; open Notifications
- [ ] Log in as teacher; create a child observation with `severity = urgent`
- [ ] **Observe:** does the parent receive a notification in real time? (Currently CP-001 — no notification is sent at all)

#### B-4-d. Reception document approval → reception sees updated status

- [ ] Log in as reception in one tab; navigate to Documents; note the current pending status
- [ ] Log in as admin in another tab; approve the reception's documents
- [ ] **Observe:** does the reception Documents page update without a manual refresh? (Currently CP-004 — manual refresh only)

#### B-4-e. Government archives school → admin session behavior

- [ ] Log in as admin in one tab
- [ ] Log in as government in another tab; archive that admin's school
- [ ] In the admin tab: navigate to any page → **expect:** a meaningful "school archived" message and eventual redirect to login; **observe:** currently each page shows a 403 error toast individually with no forced redirect (CP-003)

#### B-4-f. Credential delivery — new parent registration

- [ ] Log in as Reception → complete the parent registration wizard → reach the completion screen → **observe:** are the parent's login credentials (email + generated password) displayed anywhere on the completion screen? (CP-007 — currently they are not)

---

### B-5. Error Scenarios

#### B-5-a. `[object Object]` toast trigger

- [ ] Log in as Teacher → trigger any server error on an endpoint using the BACKEND-012 shape (e.g. try to create an activity with invalid data) → **expect:** a meaningful error message; **observe:** if you see `[object Object]`, this is EM-001
- [ ] Repeat on Admin portal (AI Warnings page) and Reception portal (parent save)

#### B-5-b. Network error message

- [ ] Log in as any user → disable network in browser DevTools → attempt any page action → **expect:** "No network connection" or similar translated message; **observe:** if you see "Network Error" or "timeout of 30000ms exceeded" in English, this is EM-002

#### B-5-c. BulkImport unknown error codes

- [ ] Log in as Admin → navigate to Bulk Import → upload a CSV with rows containing invalid date-of-birth formats
- [ ] Complete the import → view the error report → **expect:** human-readable error descriptions for each invalid row; **observe:** if you see raw codes like `IMPORT_ROW_DOB_INVALID`, this is EM-004

#### B-5-d. Reception child-add missing fields

- [ ] Log in as Reception → attempt to add a child with required fields blank → **expect:** a translated, user-friendly validation message; **observe:** if you see `[object Object] - Missing: ["firstName"]` or similar raw JSON, this is EM-005

#### B-5-e. IRR error messages language

- [ ] Log in as Teacher → navigate to a child's IRR → switch language to English or Russian → attempt to delete a goal or save with invalid data → **observe:** are the error toasts in the selected language, or always Uzbek Cyrillic? (EM-003)

---

### B-6. Language Switching

#### B-6-a. Reception login page in Russian

- [ ] Navigate to the Reception login page → switch language to Russian → **expect:** all labels (Welcome, Email, Password, Login button, Forgot password) appear in Russian; **observe:** if any label shows in Uzbek, this is I18N-001

#### B-6-b. Reception parent wizard in Russian

- [ ] Log in as Reception in Russian → navigate to register a new parent → work through all 3 wizard steps → **expect:** all step labels, field names, and validation messages appear in Russian; **observe:** Uzbek fallbacks confirm I18N-001

#### B-6-c. Government school archive in English

- [ ] Log in as Government → switch to English → navigate to a school detail page → attempt to archive/reactivate → **expect:** all buttons and confirm dialog text in English; **observe:** Uzbek text confirms I18N-005

#### B-6-d. Teacher IrrShell in Russian/English

- [ ] Log in as Teacher → switch to Russian → navigate to IrrShell → trigger a duplicate daily entry error → **observe:** is the error toast in Russian or Uzbek Cyrillic? (EM-006)

#### B-6-e. Language persistence after navigation

- [ ] Log in as any user → switch language to Russian → navigate through 5 different pages → **expect:** language setting persists on all pages without reverting to Uzbek

#### B-6-f. Parent portal language switching

- [ ] Log in as Parent → switch to Russian → navigate to Activities, Meals, Therapy, Chat, Notifications → **expect:** all page content and labels in Russian; note any Uzbek fallbacks

#### B-6-g. Hardcoded string test (teacher portal)

- [ ] Log in as Teacher → switch to English → navigate to the Dashboard → **observe:** do any section headings ("Bolalar", "Bugungi dars", etc.) still appear in Uzbek despite English selection? (I18N-004 — these are hardcoded in JSX)

---

### B-7. Form State Loss

#### B-7-a. BulkImport wizard — mid-flow navigation

- [ ] Log in as Admin → start a BulkImport → upload a CSV and complete validation (step 3 → step 4) → click "Start Import" so the backend begins importing → immediately navigate to the Dashboard
- [ ] Navigate back to `/admin/import` → **expect:** the wizard resumes showing the running import status; **observe:** currently the wizard resets to step 1 with no way to reconnect to the running job (FSL-001)

#### B-7-b. Activity modal — stale data on reopen

- [ ] Log in as Teacher → click "Add Activity" → fill in title and description partially → click X to close
- [ ] Click "Add Activity" again → **expect:** the modal opens with blank fields; **observe:** if previous partial data appears, this is FSL-005

#### B-7-c. Reception parent wizard — browser back

- [ ] Log in as Reception → start the parent registration wizard → fill in all fields on step 1 → advance to step 2 → click the browser Back button
- [ ] Navigate forward again → **expect:** step 1 data is preserved (it is auto-saved to `localStorage` on Save Draft click only); **observe:** if data is lost, this confirms FSL-003

#### B-7-d. IRR assessment session — navigation loss

- [ ] Log in as Teacher → navigate to a child's IRR → open an assessment session and score 5–6 items → navigate to the Dashboard
- [ ] Return to the IRR → **expect:** scores are preserved (or a warning was shown before navigation); **observe:** if scores are lost silently, this is FSL-002

#### B-7-e. Photo loss in journal composer

- [ ] Log in as Teacher → open the Parent Journal Composer → attach a photo → do not send → navigate to another page
- [ ] Return to the composer → **expect:** a warning that photos were lost, or photos are preserved; **observe:** photos are always lost (FSL-007) — confirm the text/subject fields are restored from `localStorage` but photos are gone

---

### B-8. Loading State Verification

#### B-8-a. Reception Dashboard on first load

- [ ] Log in as Reception → immediately observe the Dashboard before data loads → **expect:** skeleton cards or spinner placeholders; **observe:** if all stats instantly show "0" and empty-state messages appear before data arrives, this is LS-001

#### B-8-b. Teacher Chat on first open

- [ ] Log in as Teacher → navigate to Chat for the first time (cache cleared) → **expect:** a loading spinner in the parent selector and message area; **observe:** if the parent list and message area both immediately show empty-state text with no loading indicator, this is LS-002

#### B-8-c. Admin BulkImport progress

- [ ] Log in as Admin → upload a large CSV (100+ rows) and start an import → **observe:** during the import, is there any percentage or row-count progress shown, or only a spinner? (LS-004)

#### B-8-d. Teacher DailyReflection false empty state

- [ ] Log in as Teacher → navigate to Daily Reflection → observe the "Today's Observations" panel during initial load → **expect:** a loading skeleton or suppressed empty-state; **observe:** if "Bugun hali kuzatuv yozilmadi" appears for a moment before real observations load, this is LS-003

---

**Checklist complete. Record all FAIL items with URL, screenshot, and console log. Prioritize fixes in order: HIGH findings first, then MEDIUM, then LOW.**

---

## Severity Count

| Severity | Count |
|----------|-------|
| HIGH | 24 |
| MEDIUM | 36 |
| LOW | 14 |
| **TOTAL** | **74** |
