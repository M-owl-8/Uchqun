# Uchqun Platform — Pre-Launch Checklist

Items that MUST be resolved before the platform goes live with real users.
Items without an owner or ETA are blocking unless explicitly deprioritised by the product owner.

**Created:** 2026-05-20 (Backend S8 Final Verification)
**Last updated:** 2026-05-27 (Database Loop CLOSED — PL-021 resolved; UzCloud PL-UZ-01→05 as cutover/procurement items)
**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done · ⚠️ Needs sign-off

---

## Security / Compliance

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-001 | **C-02: Group-wide media visibility** — parents of different children within the same group can see each other's uploaded media | ✅ Decision documented | Option 1 (accept design) adopted by platform owner. `docs/PRIVACY_POSTURE.md` created. Partner sign-off still pending; required before real-user launch. Frontend onboarding disclosure tracked separately. |
| PL-002 | **C-07: CORS explicit allowlist** — CORS already uses exact `allowedOrigins.includes(origin)` (fixed in commit c1bd08d). Added 6 regression tests (`__tests__/cors.test.js` PL-002 suite) including revert-test for substring vulnerability. `env.example` updated with `FRONTEND_URL` format docs. | ✅ Resolved | Code was already correct. Tests added to prevent regression. `FRONTEND_URL` must still be set in Railway (PL-008). |
| PL-003 | **npm audit remediation** — `npm audit fix` fixed `ws` vulnerability; `npm audit fix --force` upgraded `sqlite3` 5→6 and `file-type` 19→22. All 919 tests pass. **Note:** `file-type` is a production dependency (mediaController, receptionController) — not dev-only as SECURITY.md stated. SECURITY.md corrected. | ✅ Resolved | `npm audit` now shows 0 vulnerabilities. sqlite3@6.0.1 and file-type@22.0.1 validated by full test suite. |
| PL-004 | **Parent account deactivation documentation** — `isActive` bypass for parents is intentional and documented in CLAUDE.md. Confirm product decision: "Parent accounts are only suspendable (via status field, T2-2) and deletable (soft-delete) — not deactivatable via isActive." | ✅ Resolved | T2-2 implemented; CLAUDE.md updated at Backend S8 to document status field as canonical gate. LQ-001 closed. |
| PL-014 | **Directory PII sign-off** — The Students, Teachers, and Parents directory pages expose personal data (names, emails, phones, dates of birth) of students, teachers, and parents to central government users. Before these directories are used with real users, product and legal sign-off is required under ZRU-547 (same framework as PL-001). Directories may be built and demonstrated; real-user launch with real PII requires sign-off. | ⬜ Not started | Required before real users are exposed to the Students, Teachers, and Parents directory pages. See Government S6 feature plan S2-F04/F05/F06. |
| PL-015 | **Partner to provide authoritative region list + school category definitions** — CP-020 (rating indicators), CP-021 (region model), and CP-022 (message routing) all use placeholder names. The region model (`schools.regionId`, government account region assignments) requires a definitive list of Uzbek administrative regions and their codes. School categories (e.g. type names for `schools.type`) similarly use placeholder values. **Placeholder regions/categories are in use until the partner delivers this data. The platform CANNOT launch with real users while placeholders remain.** When received: (1) update the authoritative region seed migration; (2) replace `shared/config/ratingIndicators.js` placeholders with real indicator names; (3) mark translations as UNVERIFIED and flag for PL-009-VERIFY. **CP-020 form gate:** `teacher/src/parent/pages/TeacherRating.jsx` (school rating section) is structurally complete — 5-indicator sliders render from `PARENT_INDICATORS` config. The form MUST NOT ship to beta users until PL-015 provides real indicator names and `ratingIndicators.js` is updated. A build-time comment in TeacherRating.jsx marks this gate. | ⬜ Not started | Blocking for any government, admin, or school-management feature that scopes by region. Receive partner data before implementing CP-021. CP-020 form also blocked on this item. |

---

## Operational / Infrastructure

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-005 | **Production monitoring** — Sentry error tracking code complete: `utils/errorTracker.js` initializes Sentry when `SENTRY_DSN` is set; `Sentry.setupExpressErrorHandler(app)` registered in `server.js`; `captureException` called for all 5xx in errorHandler; 4 tests cover init/no-op/captureException paths. | ⚠️ Needs sign-off | **Max must:** (1) create Sentry project at sentry.io (requires browser — email verification); (2) copy DSN and `railway variables --set "SENTRY_DSN=https://..."` in Uchqun service; (3) configure Sentry → Slack alert rule for first-seen errors. On-call runbook in `docs/OPERATIONS.md`. `SENTRY_DSN` not yet set in production — backend degrades gracefully (no-op). |
| PL-006 | **Database backup strategy** — Daily automated backups enabled on Railway Postgres volume instance (`fa4a3b7f-e165-43b3-9353-33d8fed15190`). Schedule: `41 9 * * *` UTC, retention 6 days (518400 s). Verified via Railway GraphQL `volumeInstanceBackupScheduleList`. Ops runbook at `docs/OPERATIONS.md`. | ✅ Verified | Backup schedule confirmed active 2026-05-20. Volume instance `fa4a3b7f`. Retention = 6 days; upgrade to Pro plan if longer retention needed before launch. |
| PL-007 | **Redis URL for multi-instance** — `REDIS_URL` confirmed set in Railway Uchqun backend service production environment. Login lockout and JTI revocation are Redis-backed in production. | ✅ Verified | `REDIS_URL` confirmed present in Railway env 2026-05-20. No action needed. |
| PL-008 | **FRONTEND_URL env var** — `FRONTEND_URL` confirmed set in Railway Uchqun backend service production environment: all 5 portal domains (admin, teacher, reception, super-admin, government). | ✅ Verified | `FRONTEND_URL` confirmed present in Railway env 2026-05-20. CORS allowlist is live and correct. No action needed. |

---

## Internationalisation

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-009 | **i18n translations shipped** — 106 error codes translated to Russian (`ru.json`), Uzbek Latin (`uz-latn.json`), Uzbek Cyrillic (`uz-cyrl.json`). All files carry mandatory `_metadata.verification_status: "UNVERIFIED"` label. Catalog verified: 0 missing keys, 0 extra keys. 19 automated tests. `backend/i18n/README.md` documents AI-generated status. CLAUDE.md and PRIVACY_POSTURE.md updated. CP-019 added to LOOP_CROSS_PORTAL.md. | ✅ Closed (AI-labeled, unverified) | Translations are AI-generated and have not been reviewed by a native speaker. See PL-009-VERIFY for professional review tracking. |
| PL-009-VERIFY | **⚠️ BETA-BLOCKER — Professional review of i18n translations** — native-speaker review of `ru.json`, `uz-latn.json`, `uz-cyrl.json` before ANY beta testers see the platform. Scope has grown since PL-009 was written: catalog is now 146 codes (was 106). New unverified strings include all reception lifecycle actions (activate/suspend/reset-credentials), teacher lifecycle actions, document statuses, group management strings, and the temp-password UI copy visible to reception users. Prioritize safeguarding-related `_review_priority` codes first, then lifecycle/credential strings (shown to reception staff). AI-generated Uzbek in front of government beta testers is a credibility risk — this is not a someday-item. | ⬜ Not started | **Beta-blocker.** Updated scope: 146 codes across 3 files + frontend i18n strings added in Reception and Admin portals (uz/ru UNVERIFIED). Schedule professional review before beta invite. Update `_metadata.verification_status` to `VERIFIED` and add reviewer name/date when complete. |

---

## Technical Debt (tracked, non-blocking)

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-010 | **BACKEND-019: `Child.class` / `Child.teacher` legacy STRING fields** — redundant with FK columns (`teacherId`, `groupId`). No code reads these for business logic. Remove in a migration once Database portal audit confirms they're unused. | ⬜ Not started | Low priority. Non-blocking until schema audit confirms removal is safe. |
| PL-011 | **Avatar URL migration (CP-002 / BACKEND-010)** — avatars currently stored as base64 in DB. Migrate to URL-based storage (Appwrite) after all portals are audited. | ⬜ Not started | Cross-portal blocker; tracked as CP-002 in LOOP_CROSS_PORTAL.md. |
| PL-012 | **Response shape migration (CP-003 / BACKEND-012 grandfather clause)** — legacy endpoints still return `{ error: '<string>' }`. Migrate opportunistically when touched. | ⬜ Not started | Not blocking; migration is gradual. |
| PL-013 | **Tier 3 backend features (T3-1 through T3-9)** — admin activity feed, school logo, reporting, scheduled jobs, notification preferences, group validation, child search, group teacher boundary, parent EM summary | ⬜ Not started | Post-launch polish. None block any portal launch. See Sprint E execution log Section 9. |

---

## ИРР Partner / Ministry Sign-offs (Loop 5 residuals — not open build work)

These items are documented in `audits/teacher-parent/IRR-DECISIONS.md`. The ИРР is fully built; these are external confirmations required before beta launch. NO code changes needed — resolving them means receiving partner/ministry acknowledgment, updating documentation, and adjusting config/seed where needed.

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-016 | **F-1: Scoring inversion ministry acknowledgment** — software direction (0=worst, 4=best) diverges from printed ИРР standard (0=best, 4=worst). Ministry must acknowledge before staff onboarding to avoid confusion when comparing software scores to physical tables. | ⬜ Not started | Partner to communicate to ministry before beta. See `IRR-DECISIONS.md` F-1. |
| PL-017 | **F-2: Physical journal stamp regulation** — regulation requires all ИРР journals to be stamped by regional social protection administration, sewn, and numbered. Legal question: does a digital record satisfy this, or must physical journals coexist? Affects whether the platform is the system-of-record or a supplement. | ⬜ Not started | Partner/legal to clarify. If physical journals must coexist, UX note required at data entry. See `IRR-DECISIONS.md` F-2. |
| PL-018 | **F-3: DRAFT standard acknowledgment** — source ИРР document is marked ЛОЙИҲА (DRAFT). Post-finalization changes may require data migrations. Partner to confirm: is this draft the beta-evaluation version, or will the final version be provided before launch? | ⬜ Not started | If standard changes after beta data is collected, schema migration required. See `IRR-DECISIONS.md` F-3. |
| PL-019 | **OQ-2: ПТПК validity duration** — typical validity period for ПТПК conclusions (sets goal-period date range). Without this, `irr.startDate` → `goalPeriod.targetDate` auto-population cannot be confirmed correct. | ⬜ Not started | One-sentence confirmation from partner sufficient. No code change required unless the duration changes. |
| PL-020 | **OQ-10: Quarterly parent-engagement section item count** — source photos show 14–15 items in the parentWork section (image cut-off). Config currently has 14 items (provisional). Partner to confirm complete list. Config-only update when confirmed. | ⬜ Not started | `shared/config/quarterlyJournalItems.js` — update config when confirmed. No schema migration needed (JSONB). |

---

## CP-022 / CP-020 Pre-Beta Residuals (Loop 5, not build work)

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-021 | **Railway migration promotion — CP-020 + CP-022 migrations** — `20260527000001-create-government-school-rating.js`, `20260527000002-update-school-ratings-cp020.js`, `20260527000003-add-routing-to-government-messages.js`. | ✅ Promoted 2026-05-27 | Promoted via push to main (SHA 832b36f). BEFORE: 82 meta entries, `government_school_ratings` absent, `school_ratings.indicators` absent, comment nullable. AFTER: 85 entries, table created, indicators present, comment NOT NULL, null-comment row backfilled to '—', 2 rows survived. See `audits/database/01-promote.md`. |
| PL-022 | **Legacy `POST /government/messages` route deprecation** — the old flat parent → government message route (no recipientLevel) should be restricted or removed before beta to prevent clients sending malformed payloads. CP-022 wired `parentSendMessage` on the parent route. Admin/teacher/reception send paths preserved. The government route itself may still exist — confirm and gate before beta. | ⬜ Not started | Review `backend/routes/governmentRoutes.js` before beta. |
| PL-023 | **ИРР terminology translations (PL-009 extension)** — all uz/ru strings for ИРР domain (criteria names, level descriptions, journal item labels, goal skill areas, quarterly checklist labels) are AI-generated / UNVERIFIED. Must be included in the PL-009-VERIFY professional review scope before beta. ~300+ additional strings on top of the existing 216 backend error codes. | ⬜ Not started | Extend PL-009-REVIEW.md scope to cover ИРР terminology. Flag P1 (clinical/scoring text) for priority review. |
| PL-024 | **LAT-002: Childless parent login loop in parent portal** — parents created without children (edge case: API-direct, wizard bypass) get "Email yoki parol noto'g'ri" when logging into the teacher portal UI, despite valid credentials. Root cause: parent dashboard initialization fails without a child → error handler redirects to login. Reception wizard always creates a child (step 2 required), so wizard-created parents are unaffected. Fix: parent portal dashboard should render a graceful empty state when `user.children` is empty, not redirect to login. | ⬜ Not started | Fix `teacher/src/parent/` dashboard init to handle zero-children state. Low-risk UX fix, not a security issue. |
| PL-025 | **Forgot-password / account-unlock UX** — all 5 portals show "Parolni unutdingizmi?" affordance that currently shows no action or says "contact admin". The admin-unlock endpoint (`POST /api/v1/auth/unlock-account`) exists and works, but requires admin/government action. Before beta: either implement self-service password reset (email link) or make the "contact admin" instruction clear and prominent, and ensure admins know to use the unlock endpoint. | ⬜ Not started | Placeholder affordance is in all 5 portals. Full self-service reset or clear contact-admin flow needed before real users experience lockouts. |

---

## UzCloud Portability (Database S0 — pre-procurement checklist)

These items were identified in `audits/database/00-live-state-audit.md` and must be resolved before any UzCloud infrastructure procurement or deploy. None require code changes unless noted.

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-UZ-01 | **⚠️ PROCUREMENT — Postgres ≥ 13 required** — all UUID primary keys use `gen_random_uuid()` (Postgres built-in since v13, no extension needed). Procuring Postgres 12 or below on UzCloud causes all 85 migrations to fail at the first UUID default. **Surface to Otabek now — has procurement lead time.** | ⬜ Not started | Add to UzCloud infrastructure spec: managed Postgres ≥ 13. Postgres 15 preferred (matches Railway). |
| PL-UZ-02 | **⚠️ PROCUREMENT — Appwrite (file storage) must be configured** — production storage driver is Appwrite (`APPWRITE_ENDPOINT` + 3 vars). No cloud storage configured = upload errors in production. Recommended path: self-hosted Appwrite on UzCloud infrastructure keeps media within the country boundary. **Surface to Otabek now — has procurement/setup lead time.** | ⬜ Not started | Procure or deploy self-hosted Appwrite instance on UzCloud. Update `APPWRITE_*` env vars on UzCloud service. Alternative: S3-compatible rewrite of `backend/config/storage.js` if Appwrite not viable. |
| PL-UZ-03 | **CUTOVER — Redis for multi-instance** — login lockout, JTI revocation, and Socket.io are in-memory if `REDIS_URL` absent. Single-instance deploy works without Redis; multi-instance requires it. | ⬜ Not started | Provision managed Redis on UzCloud if multi-instance planned. `REDIS_URL` env var. Defer until scaling decision made. |
| PL-UZ-04 | **CUTOVER (low) — AI egress** — AI analysis features (`POST /ai-warnings/analyze`) call `OPENAI_BASE_URL`. If UzCloud restricts outbound internet, these endpoints fail. Feature degrades gracefully when `OPENAI_API_KEY` is absent. | ⬜ Not started | Confirm egress policy at cutover. If restricted, leave `OPENAI_API_KEY` unset to disable. Consider on-prem LLM if government mandates it. |
| PL-UZ-05 | **CUTOVER — DB SSL flag** — `backend/config/database.js` uses Railway-specific SSL detection. UzCloud managed Postgres may require explicit SSL config. Requires a one-liner code change before UzCloud deploy. | ⬜ Not started | Add `DB_SSL=true` env flag + explicit SSL options to `database.js` before UzCloud deploy. Low-risk. |
