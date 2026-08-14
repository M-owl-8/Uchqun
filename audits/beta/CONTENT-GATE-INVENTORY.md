# CONTENT-GATE INVENTORY — every open/deferred/placeholder item, all five portals

> ## S29 EXECUTION UPDATE (2026-06-11) — owner questionnaire applied
> Statuses below in the original tables are superseded as follows:
> - **PL-015 → ✅ CLOSED** — real indicator names landed (owner Q1/Q2), ship gate ENFORCED in code (Q3, `containsFillerIndicators` + tests). Residual: INV-007 below.
> - **PL-009-VERIFY / PL-023 → UNCHANGED BY DESIGN** — translation review is government-owned pre-prod (Q13); catalogs untouched.
> - **C-02/PL-001 → ✅ CLOSED** (signed 2026-06-11, Q6) · **PL-014 → ✅ CLOSED** (signed, Q12) · **PL-016 → ✅ CLOSED** (ministry ack, Q7) · **PL-017 → ✅ CLOSED** (coexistence + UX note shipped, Q8) · **PL-018 → ✅ CLOSED** (draft = beta standard, Q11) · **PL-019 → ✅ CLOSED** (12 months, implemented + tested, Q9) · **PL-020 → ✅ CLOSED** (14 confirmed, Q10)
> - **PL-025/INV-001 → ✅ CLOSED for beta** (Q15) — help toggles on teacher/parent + reception; zero dead links.
> - **PL-022 → ✅ CLOSED** (Q16) — legacy route deleted, zero callers, suite green.
> - **PL-005 → ⏸ DEFERRED-DOCUMENTED** (Q19, owner=Max) · **CP-019 → OWNER-DECISION: show-as-is for demo** (Q21, no rollout performed) · **PL-UZ-01/02 → still OPEN, not yet surfaced to partner** (Q20).
> - **INV-002/004/005 → ✅ CLOSED** (Q18 + pre-approved hygiene).
> - **PL-024 → ✅ CLOSED, verified PASS** — childless.test@uchqun.uz cold login lands and stays on `/`; loop mooted by the S23 DEF-009 fix; no code change.
> - **NEW — INV-007 (owner content decision):** `school_categories` table has 4 rows while the `schools.type` enum has 5 values (no `early_intervention`/"Erta aralashuv" row), and all 4 production schools have `categoryId = NULL`. Which taxonomy is canonical + assignments needed. Severity: latent.
> - **INV-006 → ✅ CLOSED (S30):** all 16 stale IrrShell tests resolved — 9 repaired to current behavior (positional-mock realignment after TP-MONITORING-SEPARATION removed the journal fetches; i18n-key assertions; ConfirmDialog delete flow), 7 deleted with justification (their subject left IrrShell). Suite 25/25.
>
> ## S30 CI-RESTORATION RECORD (2026-06-11) — for future sessions
> - **CI green on main: run 27366773717, all 16 jobs success, 2m19s total** (was 6h timeouts). Deploy-to-Railway workflow green (27366773884).
>   - **[STALE as of 2026-08-14 — Campaign II P1]** This was true when written (2026-06-11) and is written in the present tense with no expiry. CI was subsequently red on `main` on every commit from at least 2026-08-10 to 2026-08-14 (**D-50**, `audits/beta/deep/P8-CLOSEOUT.md` §2). Current CI state lives on the run page, not here.
> - **Hang root cause #1 (teacher, 6h CI timeout):** `vi.mock('react-i18next')` factories returned a FRESH `t` function per `useTranslation()` call → components with `useCallback`/`useEffect` chains depending on `t` re-created callbacks every render → effect refired → setState → infinite render loop ("Maximum update depth exceeded" forever) → vitest never exits. Pattern to remember: **every mock factory must return identity-stable objects/functions** (hoist to factory scope). 8 files fixed.
> - **Hang root cause #2 (reception, 6h CI timeout):** same disease via `useAuth` mock returning a fresh `user` OBJECT per call → `useEffect([user])` loop in Settings. Plus the vitest-4-removed `test.poolOptions` block (dead config) cleaned from reception's vite config.
> - Production was never affected — real react-i18next/ToastContext identities are stable; this was test-environment-only.
> - **Advisories:** qs DoS (GHSA-q8mj-m7cp-5q26) and the vitest 4.0.x CRITICAL (GHSA-5xrq-8626-4rwp, Vitest UI arbitrary file read) resolved via in-range `npm audit fix` across all 4 portals; `npm audit --audit-level=high` exits 0 everywhere. **Deferred (below the high gate, recorded not ignored):** esbuild/vite dev-server advisory and i18next-http-backend — both need breaking majors; dev-time-only exposure, revisit at the next dependency-upgrade window.
> - **INV-008 (CODE, new):** MonitoringJournal/DailyMonitoringTab — the daily/weekly journal surface that left IrrShell — has no unit coverage (the old tests were not portable: different structure, no testids). Candidate for a future test session.
> - **T3 premise correction:** the government portal was NEVER missing tests — it has 17 files / 124 passing tests; the S29 log line "No test files found" was the CI step's script listing, and the real failures were a lint warning + a since-fixed syntax error. No smoke-suite theater added.

**Session:** S28 (2026-06-11) · **Mode:** inventory only — NOTHING was changed, no placeholder was filled
**Sources swept:** repo-wide tag greps (TODO/FIXME/PLACEHOLDER/TBD/AI-DRAFT/draft/filler-label patterns), `LOOP_PRE_LAUNCH_CHECKLIST.md` (PL-001…PL-030, PL-UZ-01…05), `LOOP_CROSS_PORTAL.md` (CP-019…CP-025), `DEFERRED.md` (empty), per-portal stub/orphan sweep (routes, no-op buttons, sample data, dead nav), locale-catalog quantification.

**Owner legend:** PARTNER (Otabek — content/ministry/sign-off) · PROFESSIONAL (native uz/ru translator or domain expert) · LEGAL (legal sign-off) · MAX (decidable/closable by Max) · CODE (genuine code stub for a future fix session — NOT fixed here).

---

## A. Blocks-ministry-ship items

| ID | Portals | Where / what it shows now | What it should be | Owner | Severity |
|---|---|---|---|---|---|
| **PL-015** (+CP-020 gate breach) | Parent, Government (+Admin/Gov displays) | `shared/config/ratingIndicators.js:7-21` + `backend/config/ratingIndicators.js` — 10 keys of pure positional filler, verbatim: `{ key: 'parent_indicator_1', en: 'Indicator 1', uz: "Ko'rsatkich 1", ru: 'Показатель 1' }` ×5 parent + ×5 gov. **The "MUST NOT ship" gate in `teacher/src/parent/pages/TeacherRating.jsx:1` is a comment only — both forms are LIVE in production** (gov SchoolDetail rate-school modal `government/src/pages/SchoolDetail.jsx:119`, parent school-rating sliders), proven rendering in S22-V4 (G-027, P-069–P-072). Also pending from same item: authoritative region list + school category names (current seeds are placeholders). | Real ministry indicator names ×2 directions ×3 languages; authoritative region/category lists | **PARTNER** | **blocks-ministry-ship + visible-in-demo** — a ministry viewer who opens any rating surface sees "Ko'rsatkich 1…5" |
| **PL-009-VERIFY** (incl. **PL-023**) | ALL FIVE + backend | Every UI string is AI-generated and unreviewed. Quantified (leaf strings per catalog): backend i18n **258 ×3** files (`_metadata.verification_status: "UNVERIFIED"`); government **526/529/523** (uz/ru/en); admin **672 ×3**; reception **476–498 ×3**; teacher **917 ×3**; parent **~917 ×3** — ≈ **9,000 catalog strings**, of which ≈ **6,000 uz/ru strings need native review**. PL-023 subset: ИРР clinical/scoring terminology (~300+ strings: criteria names, level descriptions, journal items, skill areas — transcribed from the ЛОЙИҲА/DRAFT СТАНДАРТ PDF, see `shared/config/assessmentCriteria.js`, `dailyJournalItems.js`, `weeklyJournalItems.js`, `quarterlyJournalItems.js`, `skillAreas.js`). Priority: safeguarding codes → lifecycle/credential strings → ИРР clinical text → Tarbiyachi case forms (~70 strings ×10 files). | Native-speaker-verified catalogs; `_metadata` flipped to VERIFIED with reviewer+date | **PROFESSIONAL** | **blocks-ministry-ship + visible-in-demo** (every screen; checklist calls AI-Uzbek before government testers "a credibility risk") |
| **C-02 / PL-001** | Parent (policy spans platform) | Group-wide media visibility — decision documented (`docs/PRIVACY_POSTURE.md`), consent UI shipped (`teacher/src/parent/components/PrivacyConsentModal.jsx`), but **partner/legal sign-off still pending** (required before real-user launch per CLAUDE.md and checklist) | Signed acknowledgment under ZRU-547 framework | **LEGAL** (routed via PARTNER) | blocks-ministry-ship (process, not visible) |
| **PL-016** | Teacher/Admin (ИРР) | Scoring inversion: software 0=worst/4=best vs printed ИРР 0=best/4=worst. Ministry acknowledgment not yet communicated (`IRR-DECISIONS.md` F-1) | Ministry ack before staff onboarding | **PARTNER** | blocks-ministry-ship (staff-confusion risk, not UI-visible) |
| **PL-017** | Teacher/Admin (ИРР) | Physical journal stamp regulation — does a digital record satisfy the stamped/sewn/numbered journal requirement? (`IRR-DECISIONS.md` F-2) | Legal clarification; UX note at data entry if journals coexist | **PARTNER + LEGAL** | blocks-ministry-ship |
| **PL-018** | Teacher/Admin/Parent (ИРР) | Source standard is ЛОЙИҲА (DRAFT) — all five `shared/config/*.js` ИРР content files carry "transcribed from … ЛОЙИҲА/DRAFT" headers. Is this draft the beta-evaluation version? (`IRR-DECISIONS.md` F-3) | Partner confirmation; schema migration plan if final differs | **PARTNER** | blocks-ministry-ship (data-migration risk) |
| **PL-014** | Government | Students/Teachers/Parents directories expose PII to central gov users; sign-off required before real users (beta restricts visibility) | Product+legal sign-off under ZRU-547 | **PARTNER + LEGAL** | blocks-ministry-ship (prod stage) |

## B. Visible-in-demo items (not ship-blocking by themselves)

| ID | Portals | Where / what it shows now | What it should be | Owner | Severity |
|---|---|---|---|---|---|
| **PL-025 / INV-001** | Teacher + Parent (shared login) | `teacher/src/pages/Login.jsx:199` — `<a href="#" …>{t('login.forgotPassword')}</a>` — renders "Parolni unutdingizmi?" but **clicking does nothing** (no help text, no navigation). Government/Admin logins do it right (toggle "contact your administrator" help text); **Reception has no affordance at all**. | Mirror the gov/admin contact-admin help toggle (or full self-service reset, PROD) | **CODE** | **visible-in-demo** — it's on the login screen, the first thing any audience sees |
| **PL-019** | Teacher (ИРР dates) | ПТПК validity duration unconfirmed — `irr.startDate → goalPeriod.targetDate` auto-population is provisional | One-sentence partner confirmation | **PARTNER** | visible-in-demo only if dates are inspected; otherwise latent |
| **PL-020** | Teacher (quarterly journal) | `shared/config/quarterlyJournalItems.js` — parentWork section has **14 items, provisional** (source photo cut off at 14–15) | Partner confirms complete list; config-only update | **PARTNER** | visible-in-demo (one possibly-missing row) |

## C. Latent / process / code-stub items

| ID | Portals | Where / what it shows now | What it should be | Owner | Severity |
|---|---|---|---|---|---|
| **PL-022** | Backend | `backend/routes/governmentRoutes.js:61` — verbatim: `router.post('/messages', authenticate, requireRole('parent', 'teacher', 'reception', 'admin', 'business', 'government'), sendMessage);` — the legacy flat route (no recipientLevel) is **still unrestricted**; the "close in G2 IDOR sweep" never happened. No UI calls it (parents use `parentSendMessage`), API-only surface. | Restrict/remove before beta per checklist | **CODE** | latent |
| **CP-019** | Government, Admin, Reception, Teacher (4 of 5 missing) | AI-translation notice implemented in **Parent portal only** (`PrivacyConsentModal.jsx:119` `privacyConsent.i18nTitle` = "Tarjima xatolari bo'lishi mumkin", uz/ru/en keys exist). Zero matches for the notice in government/admin/reception/teacher-side sources. Spec requires every portal with end-user-facing text. | One-time dismissible notice on first login, all portals; remove after PL-009-VERIFY | **CODE** | latent (compliance gap; absence not visually obvious) |
| **PL-024** | Parent | Childless-parent login loop (LAT-002): listed "BETA-OK — one-line fix during G4" but **no evidence the fix landed**. Code inspection: `ChildContext.jsx:28-36` leaves `selectedChildId` null with zero children (no redirect found); Dashboard `fetchToday` early-returns. May have been mooted by the S23 auth-race fix — **unverified, needs a childless test account** | Verify with a childless account; graceful empty state if loop persists | **CODE** | latent (edge case; wizard-created parents always have a child) |
| **PL-005** | Ops | Sentry code complete; `SENTRY_DSN` **not set** in Railway (backend no-ops). Checklist: "Max must create Sentry project, set DSN, wire Slack alert" | DSN set + alert rule before beta day 14 | **MAX** | latent (ops) |
| **INV-002** | Parent locales | `teacher/src/parent/locales/uz/common.json:73+75` and `ru/common.json:68+70` — duplicate case-variant keys: `"male": "Erkak"` AND `"MALE": "Erkak"` (likely female/FEMALE too) | Deduplicate to one casing | **MAX** (trivial hygiene, next code session) | cosmetic-minor |
| **INV-003** (= G-017) | Government | `government/src/locales/en/common.json:92` — `"exportTruncated": "Warning: only {{count}} of {{total}} schools exported. For the full list, pagination is coming soon."` + `government/src/pages/Schools.jsx:18` `// TODO: CP-001 — replace with pagination controls`. Hard-coded limit=999 export | Pagination UI (CP-001) | **CODE** | cosmetic-minor (fires only >999 schools; not on demo path with 4 seeded) |
| **INV-004** | Teacher | `teacher/src/pages/ChildDetail.jsx:87` — `api.get(\`/teacher/children/${id}/goals\`), // TODO(phase-2)` — live call carrying a phase-2 marker | Confirm endpoint final or remove tag | **MAX** | cosmetic-minor |
| **INV-005** | Admin, Teacher | Two design-decision TODOs: `admin/src/pages/TherapyManagement.jsx:168` (therapy color palette) and `teacher/src/pages/Meals.jsx:178` (meal color tokens) | Pick palette, delete comments | **MAX** | cosmetic-minor |
| **PL-026…PL-030** | All (process) | Five critical-flow manual walks (onboarding/force-change, suspend/reactivate, admin↔gov messaging, cross-school isolation attempt, admin registration) — "⬜ Not verified" as human walks, though S22–S25 automated equivalents covered suspend/activate (A-035/036), isolation (ISO probes), force-change gate (CP-023) | Human dress-rehearsal walk | **MAX + PARTNER** | latent (pre-beta process) |
| **PL-UZ-01…05** | Infra | UzCloud cutover preconditions: Postgres ≥13 procurement, Appwrite/self-hosted storage, Redis, AI egress policy, DB_SSL flag | Surface PL-UZ-01/02 to Otabek now (procurement lead time) | **PARTNER** (01/02), **MAX/CODE** (03–05) | latent (blocks UzCloud cutover, not Railway demo) |
| **PL-010/011/012/013** | Backend/various | Tracked tech debt: legacy STRING fields, base64 avatars, response-shape grandfather clause, Tier-3 features | As tracked | **CODE** | latent (OUT-OF-LOOP) |

---

## Summary counts

**Total open items: 24** (7 ship-blocking · 3 demo-visible · 14 latent/process/minor)

| Owner | Count | Items |
|---|---|---|
| **PARTNER** | 9 | PL-014*, PL-015, PL-016, PL-017*, PL-018, PL-019, PL-020, PL-UZ-01, PL-UZ-02 (*shared with LEGAL) |
| **PROFESSIONAL** | 1 (large) | PL-009-VERIFY incl. PL-023 — ≈6,000 uz/ru strings, ИРР terminology priority |
| **LEGAL** | 3 | C-02/PL-001 (primary), PL-014, PL-017 (both shared with PARTNER) |
| **MAX** | 5 | PL-005 (Sentry DSN), INV-002, INV-004, INV-005, PL-026–030 walk (with partner) |
| **CODE** | 6 | PL-022, PL-024, PL-025/INV-001, CP-019 (×4 portals), INV-003/CP-001, PL-010–013 (rolled) |

| Severity | Count |
|---|---|
| blocks-ministry-ship | 7 (PL-015, PL-009-VERIFY, C-02, PL-016, PL-017, PL-018, PL-014) |
| visible-in-demo | 3 more (PL-025 dead link, PL-019, PL-020) — plus PL-015 and translation quality are BOTH ship-blocking AND demo-visible |
| cosmetic-minor | 4 (INV-002, INV-003, INV-004, INV-005) |
| latent / process | 10 |

## What a ministry/president audience could actually SEE on the likely demo path

1. **"Ko'rsatkich 1…5" filler labels (PL-015)** — government SchoolDetail → rate-school modal, and the parent school-rating form. The single most exposed placeholder in the product.
2. **AI-translation quality everywhere (PL-009-VERIFY)** — every label on every screen; uz/ru unreviewed.
3. **Dead "Parolni unutdingizmi?" link (PL-025)** — teacher/parent login screen; a click that does nothing on the very first screen.
4. *(Conditional)* quarterly journal parentWork section possibly missing item 15 (PL-020); ИРР dates derived from unconfirmed ПТПК validity (PL-019).

Everything else in this inventory is invisible on a walkthrough (process sign-offs, API-only routes, env vars, tech debt).

## Confirmation

**Nothing was changed in this session.** No placeholder was filled, no tag was removed, no code or locale file was touched — this document is the only artifact.
