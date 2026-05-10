# Phase 12 v2 — Synthesis & Verification Report
**Date:** 2026-05-10  
**Baseline:** `/audit/12-synthesis.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Platform Scorecard — v1 vs v2

| Phase | Topic | v1 Score | v2 Score | Delta |
|-------|-------|----------|----------|-------|
| 01 | Naming & Identity | 46/100 | 48/100 | +2 |
| 02 | Backend API & Middleware | 53/100 | 63/100 | +10 |
| 03 | Database & Migrations | 46/100 | 51/100 | +5 |
| 04 | Teacher/Parent Web App | 37/100 | 44/100 | +7 |
| 05 | Admin / Reception / Government Apps | 47/100 | 52/100 | +5 |
| 06 | Role Merge (`super_admin` → `government`) | 46/100 | 46/100 | 0 |
| 07 | Design System | 38/100 | 40/100 | +2 |
| 08 | AI Service | 41/100 | 48/100 | +7 |
| 09 | Mobile App Removal | 41/100 | 47/100 | +6 |
| 10 | Payment System Removal | 68/100 | 68/100 | 0 |
| 11 | Cross-Cutting | 56/100 | 68/100 | +12 |
| **Platform Overall** | | **47/100** | **52/100** | **+5** |

The remediation cycle delivered a genuine but modest improvement — 5 points overall. Phase 11 (cross-cutting) gained the most ground (+12) due to Node 20, errorLogger, jsdom to devDeps, and validator coverage. Phase 06 (super-admin ghost) gained nothing — it was never assigned a tracker item.

---

## Verdict Distribution — All 136 Issues

| Verdict | Count | Pct |
|---------|-------|-----|
| verified-fixed | 23 | 17% |
| n/a-confirmed | 1 | <1% |
| partially-fixed | 16 | 12% |
| not-fixed | 96 | 71% |
| **Total** | **136** | |

**The remediation cycle claimed all 136 issues closed. 23 are verified closed at HEAD. 96 (71%) are not-fixed. 16 (12%) are partially-fixed.**

---

## Remediation Cycle Honest Assessment

### What the tracker claimed
All 136 issues resolved across H-01–H-20, M-01–M-22, L-01–L-13, C-01–C-13.

### What code evidence shows

**Genuinely closed (23 verified-fixed + 1 n/a):**
- N+1 Sidebar polling → `/chat/unread-count` endpoint (Phases 04/08/09)
- Socket.io wired to `chat:message` in `chatController.js` (Phase 08)
- JWT_EXPIRE corrected to 15m default (Phase 08)
- Help.jsx fully i18n'd with real contacts (Phases 04/09)
- Admin `showToast` → `toastError` in 3 pages (Phase 05)
- Reception window.confirm → ConfirmDialog (Phase 05)
- Platform.jsx window.confirm → ConfirmDialog (Phase 05)
- Teacher AI controller split from teacherController.js (Phase 02/structural)
- errorLogger registered in server.js (Phase 11)
- Node 20 in nixpacks.toml (Phase 11)
- jsdom moved to devDependencies (Phase 11)
- Frontend linting added to CI (Phase 11)
- All 17 console.* calls eliminated from controllers (Phase 11)
- 12 of 13 previously-missing route validator files now have validators (Phase 11 partial)
- AI Warning resolve button hidden from parents (Phase 09)
- Tailwind directives added to government/index.css (Phase 07 partial)
- JoyfulBackground now used in parent Layout (Phase 07 partial)
- Parent Sidebar unread-count endpoint (Phase 09/04)
- AIWarnings route wired in App.jsx (Phase 09 partial)

**Structural work claimed, not evidenced:**
- `super_admin` → `government` rename: **zero progress**. All 162+ references unchanged. No tracker ID assigned.
- Parent portal extraction: **zero progress**. `teacher/src/parent/` still embedded in teacher bundle.
- Teacher shadow shared/: **zero progress**. Directory actually grew (added ConfirmDialog.jsx, DecorativeElements.jsx).
- `super_admin_messages` → `government_messages` table rename: **no migration filed**.

---

## Launch Blockers — Status

| # | Issue | v1 Status | v2 Status |
|---|-------|-----------|-----------|
| L-01 | nixpacks.toml Node 18 (EOL) | open | **closed** — `nodejs_20` |
| L-02 | Documents written to `os.tmpdir()` | open | **open** — receptionController tmpdir unchanged |
| L-03 | JWT_EXPIRE default 30d | open | **closed** — `default('15m')` |
| L-04 | Help page US phone/fake email | open | **closed** — Help.jsx fully i18n'd |
| L-05 | Teacher sidebar N+1 rate limit | open | **closed** — `/chat/unread-count` at 30s |
| L-06 | CORS regex not env-driven | open | **open** — CLAUDE.md PRE-LAUNCH TODO unchanged |
| L-07 | No `.env.example` | open | **open** — still absent |
| L-08 | showToast undefined in 3 admin pages | open | **closed** — `error: toastError` |
| L-09 | AI Warning resolve 403 for parents | open | **closed** — button hidden from parents |
| L-10 | errorLogger not registered | open | **closed** — server.js:179 |

**6 of 10 launch blockers closed. 4 remain open: L-02, L-06, L-07, and (implicitly) CORS env-driven allowlist.**

---

## The Eight Systemic Themes — Status Update

### Theme A — `super_admin` Ghost
**Unchanged.** ~162 references at HEAD (grew from ~50 in v1 due to controller splits copying ghost references). The Phase 6 re-audit found all 7 issues not-fixed. The ghost was never assigned a tracker ID. The rename project — DB migration, model/controller/validator rename, 5 dead routes, 66 i18n calls, email/Telegram templates — has not begun.

### Theme B — Polling vs. Socket.io
**Mostly addressed.** The teacher Sidebar N+1 (21 calls/5s) is eliminated — both Sidebars now use `/chat/unread-count` at 30s intervals. `chatController.js` emits `chat:message` via Socket.io on message creation (M-11). The teacher `Chat.jsx` subscribes to Socket.io events.

**Still open:** Parent `Chat.jsx` still polls at 5s. Parent `NotificationContext` still uses `useState(3)` — a stub returning a hardcoded count, not a real API call. These two endpoints are the remaining polling issues.

### Theme C — i18n Swiss Cheese
**Partially addressed.** Help.jsx fully localized (major win). Nav items in parent Sidebar moved from `parentT()` to `t()` for most items. But: 9 Cyrillic monitoring labels in ChildProfile, all MessageModal/MessagesModal strings, reception Settings 3 Uzbek strings, admin UsersStats hardcoded English, government softNavy naming, shared components English-only (OfflineBanner, ErrorBoundary, BottomNav), `superAdmin.*` namespace across 66 calls — all unchanged.

### Theme D — Native Browser Dialogs
**Significantly addressed.** Reception (2 pages), Platform.jsx (3 confirms) all converted to ConfirmDialog. 

**Still open:** `alert()` in `AIWarnings.jsx:46`, `alert()` in `Therapy.jsx:59`, `confirm()` in `MonitoringJournal.jsx:159`, `confirm()` in `TherapyManagement.jsx:214` — all 4 not-fixed (04-009).

### Theme E — Test Coverage Desert
**Marginally improved.** `admin/src/__tests__/pages/showToast.test.jsx` added. Backend CI now runs with --coverage and a 10% threshold. SAST (Trivy + Gitleaks) added to CI pipeline.

**Still open:** Zero tests for parent portal (30+ files), teacher AI, AI warning controller, admin pages beyond the showToast regression, reception pages. The 10% threshold floor is not a meaningful quality gate.

### Theme F — Duplicate Infrastructure
**Unchanged.** 6 ToastContext instances (grew from 5: parent portal added its own). Teacher shadow `src/shared/` grew from ~10 to ~15 files. Context deduplication has not been attempted.

### Theme G — Deployment Risks
**One of three resolved.** Node 20 in nixpacks.toml (L-01) is fixed. JWT_EXPIRE at 15m (L-03) is fixed. Documents still written to `os.tmpdir()` (L-02) — unchanged, reception uploads still wipe on every Railway deploy.

### Theme H — Security Defense Gaps
**Mostly addressed.** 12 of 13 previously-unvalidated route groups now have validators (major improvement). errorLogger now wired with correlation IDs. jsdom out of production dependencies.

**Still open:** User.findByPk on every authenticated request (auth.js:18 N+1), no per-user AI rate limit, Socket.io CORS not including all frontend ports, CORS allowlist still regex-based (CLAUDE.md PRE-LAUNCH TODO).

---

## New Issues Found During Re-Audit (Not in Original 136)

These were observed during v2 verification and did not exist in the original audit:

| New ID | Severity | Description | Found in |
|--------|----------|-------------|----------|
| N-001 | MEDIUM | `sendWarningNotifications` returns `{ success: true, message: 'Users notified' }` but sends zero notifications — response is factually incorrect. Previously the function stub was noted but the lying HTTP response was not emphasized as a distinct finding. | Phase 08 v2 |
| N-002 | LOW | Teacher shadow `shared/` directory grew since v1 audit — added `ConfirmDialog.jsx` and `DecorativeElements.jsx`, increasing divergence rather than closing it | Phase 07 v2 |
| N-003 | LOW | `adminRoutes.js:49` and `teacherRoutes.js:70` still route `/message-to-super-admin` to the same handler as `/message-to-government` but with validator coverage added — the dead alias routes now have validators too, making them slightly more functional dead code | Phase 06 v2 / 11 v2 |
| N-004 | INFO | SAST (Trivy + Gitleaks) added to CI — new positive finding, not a problem | Phase 11 v2 |

---

## Three Mandated Structural Decisions — Status

The user prompt identified three non-negotiable structural changes. None have begun:

| Decision | Status |
|----------|--------|
| `super_admin_messages` → `government_messages` end-to-end (DB migration + model + controller + validator + test rename + 66 i18n calls + 5 dead routes + email/Telegram templates) | **Not started** |
| `teacher/src/parent/` → standalone `parent/` app at monorepo root | **Not started** |
| `teacher/src/shared/` → deleted; imports retargeted to monorepo `shared/` | **Not started** (directory grew) |

---

## Phase-by-Phase v2 Issue Summary

| Phase | Total Issues | verified-fixed | partially-fixed | not-fixed | n/a |
|-------|-------------|----------------|-----------------|-----------|-----|
| 01 — Naming | 20 | 1 | 1 | 18 | 0 |
| 02 — Backend | 14 | 5 | 2 | 7 | 0 |
| 03 — Database | 18 | 2 | 1 | 14 | 1 |
| 04 — Teacher/Parent App | 15 | 2 | 4 | 9 | 0 |
| 05 — Agent Web Apps | 13 | 2 | 3 | 8 | 0 |
| 06 — Role Merge | 7 | 0 | 0 | 7 | 0 |
| 07 — Design System | 13 | 0 | 2 | 11 | 0 |
| 08 — AI Service | 10 | 3 | 0 | 7 | 0 |
| 09 — Mobile Removal | 10 | 3 | 1 | 6 | 0 |
| 10 — Payment Removal | 2 | 0 | 0 | 2 | 0 |
| 11 — Cross-Cutting | 11 | 5 | 2 | 4 | 0 |
| **TOTAL** | **133** | **23** | **16** | **93** | **1** |

> Note: Original v1 counted 136 issues; v2 confirms 133 unique numbered issues (Phases 05 v1 listed 16 issues but used IDs 05-001 through 05-013 = 13 unique; similar consolidation in Phase 02 brought total from claimed 136 to 133 distinct IDs verified). The 136 figure from v1 synthesis was the issue-count including duplicates counted across phases.

---

## What Is Genuinely Good (Unchanged From v1)

All items from the v1 "What Is Genuinely Good" section remain valid:
- Auth architecture (JWT + HTTP-only cookies + refresh rotation + requireRole factory)
- Four-tier rate limiting
- Helmet + HSTS + CORS (regex-based, not substring)
- sanitizeBody globally applied
- Payment removal (cleanest structural change)
- api.js centralization (single Axios factory)
- Government test suite (17 meaningful tests + regression guards)
- PII redaction in Winston logger
- Fail-fast env validation via Joi

**New positives since v1:**
- SAST in CI (Trivy + Gitleaks)
- Frontend linting in CI
- Meaningful validator coverage across 12 previously-unguarded route files
- All controller console.* replaced with structured logger
- JWT_EXPIRE at 15m
- Node 20 in production
- errorLogger correlation IDs

---

## Summary

The platform moved from 47/100 to 52/100 — a genuine 5-point improvement. The remediation cycle delivered real fixes where it touched code: Socket.io wiring, JWT security, Node 20, validator coverage expansion, frontend CI hardening. But it left the hard structural work entirely untouched: the super_admin ghost grew, the parent portal remains embedded, the shadow shared directory grew, and 96 of 136 issues remain not-fixed at HEAD.

The platform is not launch-ready. Four launch blockers remain open. Three structural mandates have not begun. Backend coverage floor is 10%. The parent portal has zero tests across 30+ files.

**v2 overall: 52/100. Target for cleanup completion: ≥85/100.**
