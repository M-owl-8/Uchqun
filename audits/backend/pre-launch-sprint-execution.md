# Pre-Launch Sprint Execution Log (Step 7.5)

**Date range:** 2026-05-20 (single session, three conversation segments)
**Goal:** Close all 13 items on `LOOP_PRE_LAUNCH_CHECKLIST.md` before Loop 2 begins.
**Verdict:** 🟡 Closed with 1 residual (PL-005 Sentry DSN — requires browser account creation)

---

## 1. Sprint Summary

| Phase | Items | Commits | Result |
|---|---|---|---|
| Phase 1 (Code-only) | PL-002, PL-003, PL-007/008 | `aabf24f` | ✅ All code complete |
| Phase 2 (Sentry) | PL-005 | `c336aef` | ✅ Code complete; DSN config pending |
| Phase 3 (Ops runbook) | PL-006 | `f75b8d6` | ✅ Docs written; Railway verify pending |
| Phase 4 (Privacy decision) | PL-001 | `f75b8d6` | ✅ Decision documented |
| Phase 5 (i18n translations) | PL-009 | `f75b8d6` | ✅ AI-generated, labeled, verified |
| Phase 6 (Close-out) | All 13 PL items + PL-009-VERIFY | `f75b8d6` | ✅ |
| Phase 7 (Ops verification) | PL-006, PL-007, PL-008 | this commit | ✅ Railway infra confirmed live |

---

## 2. Per-Item Status Table

| ID | Item | Status | Commit | Notes |
|---|---|---|---|---|
| PL-001 | Group-wide media visibility | ✅ Decision documented | this | Option 1 (accept). `docs/PRIVACY_POSTURE.md`. Partner sign-off **still pending** — not force-closed. |
| PL-002 | CORS explicit allowlist | ✅ Code + tests | `aabf24f` | Code was already correct (fixed earlier). 6 regression tests added. Env docs updated. |
| PL-003 | npm audit remediation | ✅ 0 vulnerabilities | `aabf24f` | `ws`, `sqlite3@6`, `file-type@22` all upgraded. 919 tests pass. Corrects SECURITY.md error. |
| PL-004 | Parent deactivation docs | ✅ Already closed | S8 commit | isActive bypass documented in CLAUDE.md. LQ-001 resolved. |
| PL-005 | Sentry monitoring | ⚠️ Code ✅, DSN pending | `c336aef` | `setupExpressErrorHandler` in server.js. 4 tests. `SENTRY_DSN` NOT set — requires browser account creation at sentry.io. Backend runs in no-op mode. |
| PL-006 | DB backup runbook + verification | ✅ Verified live | `f75b8d6` + this | Daily backup active: cron `41 9 * * *` UTC, 6-day retention. Volume instance `fa4a3b7f-e165-43b3-9353-33d8fed15190`. Confirmed via Railway GraphQL API `volumeInstanceBackupScheduleUpdate`. |
| PL-007 | REDIS_URL multi-instance | ✅ Verified live | `aabf24f` + this | `REDIS_URL` confirmed set in Railway Uchqun service production env. Login lockout + JTI revocation are Redis-backed in production. |
| PL-008 | FRONTEND_URL in Railway | ✅ Verified live | `aabf24f` + this | `FRONTEND_URL` confirmed set in Railway: all 5 portal domains. CORS exact-match allowlist is live. |
| PL-009 | i18n translations | ✅ Shipped (AI-labeled) | this | 106 codes × 3 languages. `verification_status: "UNVERIFIED"` mandatory in all files. See PL-009-VERIFY. |
| PL-009-VERIFY | Professional translation review | ⬜ Not started | n/a | New item. Native-speaker review required before real users. |
| PL-010 | Child.class/teacher legacy fields | ⬜ Deferred | n/a | Database portal scope. |
| PL-011 | Avatar URL migration | ⬜ Deferred | n/a | Cross-portal blocker. CP-002. |
| PL-012 | Response shape migration | ⬜ Deferred | n/a | Gradual. CP-003. |
| PL-013 | Tier 3 backend features | ⬜ Deferred | n/a | Post-launch polish. |

---

## 3. Honesty Section

### PL-009 honest status

PL-009 is closed as ✅ per Max's authorization to ship AI-generated translations
with explicit labeling. The translations are unverified by a native speaker.

Labeling is present at four mandatory locations:
1. **File metadata** — `_metadata.verification_status: "UNVERIFIED"` in all three JSON files
2. **`backend/i18n/README.md`** — full disclosure with rationale
3. **`CLAUDE.md`** — i18n translation status section appended
4. **`docs/PRIVACY_POSTURE.md`** — localization disclosure section

PL-009-VERIFY is a new tracked item noting that professional translation review
is required before real-user launch. This distinction is the difference between
"implemented and labeled" (this sprint) and "verified for production" (future work).

### PL-001 honest status

PL-001 is closed as ✅ for design decision: Option 1 (accept current group-wide
media visibility design) was adopted by platform owner Max.

However:
- Partner sign-off is **not completed** — it is documented as pending.
- Frontend onboarding disclosure is **not implemented** — tracked as a content/frontend task.
- Privacy policy text is **not written** — tracked as a content task.

`docs/PRIVACY_POSTURE.md` records all three gaps explicitly. This is not a paper
close — it is a documented "yes to current design, pending these follow-ups."

### PL-005/006/007/008 honest status

These four items have code/documentation complete but require Railway configuration
actions by Max. They are marked ⚠️, not ✅, because "code written" ≠ "production ready."
The checklist clearly states what Max must do before these become ✅.

### file-type production dependency correction

SECURITY.md previously stated `file-type` was "not used in production request handling."
This was incorrect — `fileTypeFromFile` is called in `mediaController.js:376` and
`fileTypeFromBuffer` in `receptionController.js:27` for MIME validation during file
uploads. The vulnerability (ASF infinite loop) does not affect the allowed MIME types,
but the classification as "dev-only" was wrong. SECURITY.md corrected.

---

## 4. Test / Lint / Audit Final State

| Check | Result |
|---|---|
| Test suites | 89 passed, 89 total |
| Tests | 919 passed, 919 total (was 892 at S8; +27 new tests this sprint) |
| Lint | 0 warnings, 0 errors |
| npm audit | 0 vulnerabilities (was 11 high/moderate at sprint start) |
| verify-i18n | PASSED — 106 codes × 3 language files, 0 missing, 0 extra |

**New tests added this sprint:**
- 6 CORS PL-002 regression tests (`__tests__/cors.test.js`)
- 2 Sentry errorTracker tests (`__tests__/utils/errorTracker.test.js`)
- 19 i18n translation file tests (`__tests__/i18n.test.js`)

---

## 5. Cross-Portal Handoffs

| ID | Action | Added in |
|---|---|---|
| CP-018 | BACKEND-017 Sequelize convention drift → Database portal | Backend S8 |
| CP-019 | AI-translation UI notice for first login → all portals with end-user text | Pre-Launch Sprint Phase 5 |

---

## 6. Truly Closed vs. Tracked-but-Open

### Truly closed (code complete, no further action needed):
- PL-002: CORS tests + env docs. Behavior was already correct.
- PL-003: 0 vulnerabilities. 919 tests confirm compatibility.
- PL-004: isActive bypass documented. No code change needed.
- PL-006: Daily backup schedule enabled on Railway volume instance. Verified via API.
- PL-007: `REDIS_URL` confirmed live in Railway production env. No further action.
- PL-008: `FRONTEND_URL` confirmed live in Railway production env. No further action.
- PL-009: Translations generated, labeled, tested. Script validates catalog match.

### Closed pending Max's action (code done, operational step outstanding):
- PL-001: Decision document written. Partner sign-off conversation → Max's responsibility.
- PL-005: Sentry code deployed. `SENTRY_DSN` → Max creates sentry.io account (browser required), copies DSN, runs `railway variables --set "SENTRY_DSN=..."`. Backend runs in no-op mode until set.

### Explicitly deferred (non-blocking, tracked):
- PL-009-VERIFY: Native-speaker translation review. Launch-blocking long-term.
- PL-010–PL-013: Technical debt, deferred per original design.

### Open loops that will surface in Loop 2:
- CP-019: UI notice for AI translations must be implemented in each portal.
- Partner must confirm PL-001 before production.
- PL-005: `SENTRY_DSN` must be set by Max before first user traffic.

---

## 7. Files Created / Modified This Sprint

| File | Action | Notes |
|---|---|---|
| `backend/__tests__/cors.test.js` | Modified | +6 PL-002 regression tests |
| `backend/__tests__/utils/errorTracker.test.js` | Modified | +2 Sentry init/captureException tests |
| `backend/__tests__/i18n.test.js` | Created | 19 translation file tests |
| `backend/i18n/ru.json` | Created | 106 Russian translations (AI, UNVERIFIED) |
| `backend/i18n/uz-latn.json` | Created | 106 Uzbek Latin translations (AI, UNVERIFIED) |
| `backend/i18n/uz-cyrl.json` | Created | 106 Uzbek Cyrillic translations (AI, UNVERIFIED) |
| `backend/i18n/README.md` | Created | AI-generated disclosure, usage guide |
| `backend/scripts/verify-i18n.js` | Created | CI validation script for catalog/file drift |
| `backend/env.example` | Modified | +REDIS_URL, +SENTRY_DSN, FRONTEND_URL docs improved |
| `backend/server.js` | Modified | Sentry express error handler; import change |
| `backend/SECURITY.md` | Modified | Corrected file-type classification; all vulns resolved |
| `backend/package.json` | Modified | sqlite3@6.0.1, file-type@22.0.1, ws patched |
| `backend/package-lock.json` | Modified | Updated lockfile |
| `docs/OPERATIONS.md` | Created | DB backup runbook + ops checklist |
| `docs/PRIVACY_POSTURE.md` | Created | PL-001 decision + localization disclosure |
| `docs/RAILWAY_SETUP.md` | Created | Full env var table + Railway instructions |
| `CLAUDE.md` | Modified | +i18n translation status section |
| `LOOP_PRE_LAUNCH_CHECKLIST.md` | Modified | All 13 items updated; PL-009-VERIFY added |
| `LOOP_CROSS_PORTAL.md` | Modified | CP-019 added |
| `LOOP_TRACKER.md` | Modified | Pre-Launch Sprint ✅ (updated at close) |
| `LOOP_PRE_LAUNCH_CHECKLIST.md` | Modified | PL-006/007/008 updated to ✅ Verified; PL-005 status clarified |
| `audits/backend/pre-launch-sprint-execution.md` | Modified | Phase 7 added; per-item table corrected; truly-closed list updated |
