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
| PL-002 | **C-07: CORS explicit allowlist** — current regex-based origin check is a substring match (`url.includes(process.env.CORS_ORIGIN)`). Replace with explicit env-driven allowlist before production. | ⬜ Not started | Source: Backend S3 commit c1bd08d. CORS_ORIGIN env var must be set in Railway. |
| PL-003 | **npm audit dev-chain remediation** — 5 high-severity findings in `sqlite3` → `node-gyp` → `tar` chain. Dev-dependency only; no production exposure. Run `npm audit fix --force` to upgrade to breaking versions once tests confirm compatibility. | ⬜ Not started | Not a production blocker but should be resolved before any CI security scan is required. |
| PL-004 | **Parent account deactivation documentation** — `isActive` bypass for parents is intentional and documented in CLAUDE.md. Confirm product decision: "Parent accounts are only suspendable (via status field, T2-2) and deletable (soft-delete) — not deactivatable via isActive." | ✅ Resolved | T2-2 implemented; CLAUDE.md updated at Backend S8 to document status field as canonical gate. LQ-001 closed. |

---

## Operational / Infrastructure

| ID | Item | Status | Notes |
|---|---|---|---|
| PL-005 | **Production monitoring** — Sentry DSN must be set in Railway env; error alerts to a Slack channel; on-call runbook written | ⬜ Not started | Without Sentry, production errors are invisible. Minimum: set `SENTRY_DSN` env var. |
| PL-006 | **Database backup strategy** — Railway Postgres automated backup configured; recovery tested at least once | ⬜ Not started | Railway Pro plan enables automated backups. Confirm schedule and retention. |
| PL-007 | **Redis URL for multi-instance** — `REDIS_URL` must be set in Railway for production. Without it, login lockout and JTI revocation fall back to in-memory (single-instance only). | ⬜ Not started | CLAUDE.md Scaling Constraints already documents this. Confirm it's set before scaling beyond 1 instance. |
| PL-008 | **CORS_ORIGIN env var** — must be set to production domain(s) in Railway before go-live | ⬜ Not started | Also required for PL-002. |

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
