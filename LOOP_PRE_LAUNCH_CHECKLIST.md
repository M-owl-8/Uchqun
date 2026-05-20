# Uchqun Platform — Pre-Launch Checklist

Items that MUST be resolved before the platform goes live with real users.
Items without an owner or ETA are blocking unless explicitly deprioritised by the product owner.

**Created:** 2026-05-20 (Backend S8 Final Verification)  
**Status legend:** ⬜ Not started · 🟡 In progress · ✅ Done · ⚠️ Needs sign-off

---

## Security / Compliance

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-001 | **C-02: Group-wide media visibility** — parents of different children within the same group can see each other's uploaded media | ⚠️ Needs sign-off | Documented as intentional design in CLAUDE.md. Requires product + legal sign-off before launch. Source: Backend S3 commit 9b2994c. |
| PL-002 | **C-07: CORS explicit allowlist** — CORS already uses exact `allowedOrigins.includes(origin)` (fixed in commit c1bd08d). Added 6 regression tests (`__tests__/cors.test.js` PL-002 suite) including revert-test for substring vulnerability. `env.example` updated with `FRONTEND_URL` format docs. | ✅ Resolved | Code was already correct. Tests added to prevent regression. `FRONTEND_URL` must still be set in Railway (PL-008). |
| PL-003 | **npm audit remediation** — `npm audit fix` fixed `ws` vulnerability; `npm audit fix --force` upgraded `sqlite3` 5→6 and `file-type` 19→22. All 898 tests pass. **Note:** `file-type` is a production dependency (mediaController, receptionController) — not dev-only as SECURITY.md stated. SECURITY.md updated. | ✅ Resolved | `npm audit` now shows 0 vulnerabilities. sqlite3@6.0.1 and file-type@22.0.1 validated by full test suite. |
| PL-004 | **Parent account deactivation documentation** — `isActive` bypass for parents is intentional and documented in CLAUDE.md. Confirm product decision: "Parent accounts are only suspendable (via status field, T2-2) and deletable (soft-delete) — not deactivatable via isActive." | ✅ Resolved | T2-2 implemented; CLAUDE.md updated at Backend S8 to document status field as canonical gate. LQ-001 closed. |

---

## Operational / Infrastructure

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-005 | **Production monitoring** — Sentry error tracking code complete: `utils/errorTracker.js` initializes Sentry when `SENTRY_DSN` is set; `Sentry.setupExpressErrorHandler(app)` registered in `server.js`; `captureException` called for all 5xx in errorHandler; 4 tests cover init/no-op/captureException paths. | ⚠️ Needs sign-off | **Max must:** (1) set `SENTRY_DSN` in Railway env (see `env.example`); (2) configure Sentry → Slack alert rule in Sentry dashboard for first-seen errors. On-call runbook deferred to ops team. |
| PL-006 | **Database backup strategy** — Railway Postgres automated backup configured; recovery tested at least once | ⬜ Not started | Railway Pro plan enables automated backups. Confirm schedule and retention. |
| PL-007 | **Redis URL for multi-instance** — `REDIS_URL` must be set in Railway for production. Without it, login lockout and JTI revocation fall back to in-memory (single-instance only). | ⚠️ Needs sign-off | `env.example` updated with `REDIS_URL` docs. `docs/RAILWAY_SETUP.md` created. **Max must add Railway Redis plugin and copy `REDIS_URL` before scaling beyond 1 instance.** |
| PL-008 | **FRONTEND_URL env var** — must be set to production domain(s) in Railway before go-live (not `CORS_ORIGIN` — the actual var name is `FRONTEND_URL`). | ⚠️ Needs sign-off | `env.example` updated with format docs and examples. `docs/RAILWAY_SETUP.md` created. **Max must set `FRONTEND_URL` in Railway before first production deploy.** |

---

## Internationalisation

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-009 | **i18n error code translations** — 106 i18n error codes in `audits/backend/i18n-error-codes.md` need `ru` and `uz` translations for all frontend portals | ⬜ Not started | Translation is blocking for UZ/RU locale UX. English codes can be used in dev/staging. |

---

## Technical Debt (tracked, non-blocking)

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-010 | **BACKEND-019: `Child.class` / `Child.teacher` legacy STRING fields** — redundant with FK columns (`teacherId`, `groupId`). No code reads these for business logic. Remove in a migration once Database portal audit confirms they're unused. | ⬜ Not started | Low priority. Non-blocking until schema audit confirms removal is safe. |
| PL-011 | **Avatar URL migration (CP-002 / BACKEND-010)** — avatars currently stored as base64 in DB. Migrate to URL-based storage (Appwrite) after all portals are audited. | ⬜ Not started | Cross-portal blocker; tracked as CP-002 in LOOP_CROSS_PORTAL.md. |
| PL-012 | **Response shape migration (CP-003 / BACKEND-012 grandfather clause)** — legacy endpoints still return `{ error: '<string>' }`. Migrate opportunistically when touched. | ⬜ Not started | Not blocking; migration is gradual. |
| PL-013 | **Tier 3 backend features (T3-1 through T3-9)** — admin activity feed, school logo, reporting, scheduled jobs, notification preferences, group validation, child search, group teacher boundary, parent EM summary | ⬜ Not started | Post-launch polish. None block any portal launch. See Sprint E execution log Section 9. |
