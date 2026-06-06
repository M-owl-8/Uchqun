# Uchqun Beta Launch Plan

**Decision:** 2–3 weeks to **beta** (not production).
**Authored:** 2026-06-06 after the full 208-document audit (6 sub-agent reports).
**Authority:** Murodbek (product owner).
**Status:** ✅ Plan locked. Execution open.

---

## What we are shipping

Real users on Railway, calling the platform **beta**, with explicit on-screen disclosure that:
- Translations are AI-generated pending native review (PL-009-VERIFY).
- Regional administrative names and rating indicators use placeholder seeds (PL-015).
- The directory of PII (Students / Teachers / Parents) is restricted until partner sign-off (PL-014).

We are **not** shipping production. The 6–8 week production launch is gated on PL-009-VERIFY, PL-015, PL-014, and UzCloud cutover (PL-UZ-01..05).

---

## The 5 gates (must close before invite)

| # | Gate | What | Effort | Status |
|---|---|---|---|---|
| **G1** | TP-PARENT-ASSIGNMENT classified + fixed | Resolve the dual-chain parent-child linkage (denormalized vs canonical). Unblocks every phase-2 parent verification. | 1 session (1 day) | ⛔ Deferred — terminal Claude with postgres-uchqun MCP required |
| **G2** | 11-IDOR-RESWEEP across all 4 portals | Apply `audits/backend/10-idor-sweep.md` pattern to admin / government / reception / teacher/parent. Government S1 missed 3 region-scope leaks found only at CLOSEOUT — others likely hide the same pattern. | 1–2 sessions (2–3 days) | ✅ CLOSED 2026-06-06 — `audits/backend/11-idor-resweep.md`. 5/7 findings verified already-scoped; 2 production fixes shipped + 15 regression-lock tests. |
| **G3** | Live E2E walks of pending items | Walk the 17 LOOP_TRACKER items marked "pending user Railway verification" + the 5 critical flows PL-026..PL-030 + the PP-* phase-2 walks (unblocked by G1). | 3–5 sessions of human time (1 week wall-clock) | ⬜ Not started (human-walk gate, awaits scheduling) |
| **G4** | Privacy consent UI built | Modal-on-first-login for parents affirming C-02 group-wide media visibility. New `users.privacyConsentedAt` column + endpoint. | 1 session (1 day) | ✅ CLOSED 2026-06-06 — `audits/gates/G4-PRIVACY-CONSENT.md`. Backend migration + endpoint + modal + 10 controller tests + 12 locale keys × 3 langs. |
| **G5** | Privacy consent text written + signed off | One paragraph × UZ/RU/EN: data collected, who can see it, how to withdraw, complaints contact. **Owner: product + legal.** | 2–3 days of partner time (outside engineering) | 🟡 Engineering placeholder drafted (UZ/RU/EN) in G4 commit. Final partner/legal sign-off still owed before production; beta ships with placeholder + on-screen "beta" disclaimer. |

---

## Already shipped during the PP-* arc (closed, not re-opening)

| Session | Deliverable | Commit |
|---|---|---|
| PP-AUDIT (S2) | Full parent portal audit + 13-item backlog | `32900d5` |
| PP-AUTH-ZOMBIE (S5) | Parent-side 401/403 normalization confirmed | `97860a3` |
| PP-DATE-LOCALE (S6) | Every parent date through shared formatter | `24ef412` |
| PP-ATTENDANCE-SURFACE (S7) | Parent view of child attendance | `6b8daf0` |
| PP-CHROME-LAYOUT (S8) | Letterhead headers + container/grid + token sweep | `d7d900a` |
| PP-CHAT-INTEGRITY (S9) | Shared chat model confirmed, layout parity | `b1c54d0` |
| PP-DASHBOARD-CARDS (S10) | Every dashboard card contract confirmed-live | `21d7cd6` |
| PP-FEATURE-FIXES (S11) | All remaining PP-AUDIT flags cleared | `c2beb37` |
| PP-MOBILE-PASS (S12) | Chat composer + attendance week label mobile fixes | `5f10f6e` |
| PP-JOURNAL-FEATURE (S13) | Parent journal read surface | `440e242` |
| PP-IA-REDESIGN | 5-tab mobile nav + top-bar bell + Bola hub + Today filters | `4b01e1a` |
| **PP-NOTIFICATION-LOOP-FIX** | NotificationContext memoization — killed Dashboard infinite-loop bug | `a84e8b3` |
| **PP-CRUFT-SWEEP** | 5 dead components removed · 15 dead locale keys × 3 locales · `no-scrollbar` utility added · Dashboard token consistency · stale TODO purge | `075c9d9` |

**The parent portal is feature-complete for beta. No new PP-* sessions before launch.**

---

## Out of scope for beta (deferred to v1 production)

| ID | Item | Why deferred |
|---|---|---|
| PL-009-VERIFY | Native UZ/RU/EN translation review (218 backend codes + ~300 IRR strings + portal locales) | Required for production; beta ships with on-screen disclaimer. **Commission this now — it runs in parallel.** |
| PL-015 | Partner-supplied regions + school category definitions + real rating indicator names | Production-blocker; beta uses placeholder seed. CP-020 form remains gated. |
| PL-014 | Directory PII sign-off (Students / Teachers / Parents pages with central gov access) | Beta restricts directory visibility. Production opens it after sign-off. |
| PL-UZ-01..05 | UzCloud cutover prep (Postgres ≥13, Appwrite, Redis, AI egress, SSL) | Beta stays on Railway. Cutover is post-beta. |
| PL-013 (Tier 3) | Backend Tier 3 features (admin activity feed v2, school logo, reports, scheduled jobs, etc.) | Polish, not launch-blocking. |
| PL-022 | Legacy POST /government/messages route deprecation | Pre-beta hardening; can be done as part of G2 IDOR sweep if needed. |
| PL-025 | Self-service password reset | Out of scope; admins use the unlock endpoint. |
| Performance testing | Load / latency / N+1 sweeps | None of the audited surfaces show production-blocking perf cliffs. Beta usage will surface real signals. |
| a11y testing | WCAG audit | Defer to v1. Government-platform a11y will need a dedicated session. |
| Incident-response runbooks | Beyond OPERATIONS.md backup/Sentry sections | Beta is small; v1 needs full runbook. |

---

## Day-by-day target schedule (14 days)

### Week 1 — engineering heavy

| Day | Focus | Owner |
|---|---|---|
| Day 1 | **G1** — Resume TP-PARENT-ASSIGNMENT from Claude Code terminal. Run STEP 2 queries (drafted in `audits/redesign/TP-PARENT-ASSIGNMENT.md`). Classify whether it's a code bug, data bug, or schema oversight. Ship the fix. | Murodbek |
| Day 2–3 | **G2** — 11-IDOR-RESWEEP. Pattern: grep every controller for role short-circuits, missing `schoolId`/`regionId` checks, `Op.in` lookups without scope filter. Apply `revert-test` discipline (failing-then-passing commit pair per finding). | Engineering |
| Day 4 | **G4** — Privacy consent UI. Migration + endpoint + frontend modal + force-first-login interceptor. | Engineering |
| Day 5 | **Open G3** — Schedule the verification walks across the week. **Commission PL-009-VERIFY** — find a UZ/RU native reviewer this day, don't wait. | Murodbek + Engineering |

### Week 2 — verification heavy

| Day | Focus | Owner |
|---|---|---|
| Day 6–7 | **G3** — Parent + Teacher portal walks (10 items in tracker pending) | Murodbek on Railway |
| Day 8 | **G3** — Admin + Government + Reception portal walks (7 items pending) | Murodbek on Railway |
| Day 9 | **G5** — Chase partner for consent text approval. If still pending, draft three-language version internally and submit for sign-off. | Murodbek + product |
| Day 10 | **G3** — PP-* phase-2 walks for the parent items unblocked by G1 (PP-ATTENDANCE-SURFACE, PP-DASHBOARD-CARDS, PP-CHAT-INTEGRITY, PP-JOURNAL-FEATURE) | Murodbek on Railway |

### Week 3 — buffer + launch

| Day | Focus | Owner |
|---|---|---|
| Day 11–12 | Hotfix any G3-surfaced regressions | Engineering |
| Day 13 | **Pre-launch dress rehearsal** — walk PL-026..PL-030 on Railway one more time. Confirm Sentry alerting (PL-005 sign-off) is firing. | Murodbek |
| Day 14 | **Beta invite goes out.** | Murodbek |

---

## Honest risk register

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| G1 classification reveals a system-wide flow bug (e.g. reception wizard's `child.groupId = null`) | Medium | +3 days | Carry budget for a "G1.5" fix-up session before opening G2 |
| G2 finds ≥3 HIGH leaks à la Government CLOSEOUT | Medium | +2 days | Apply the same revert-test discipline that closed C-01..C-07 |
| User verification walks (G3) find regressions | High | Slip on user-time, not eng-time | Pre-allocate 2 hours/day on Railway during week 2 |
| Privacy consent text approval stalls (G5) | High | Blocks invite day 14 | Engineering ships generic placeholder text on day 9; if not signed off by day 12, invite slips |
| Sentry alerting not actually firing (PL-005) | Low | Beta runs blind to errors | Day 13 dress rehearsal includes deliberate test error |

---

## What we explicitly are NOT doing this loop

- No new parent portal sessions. The PP-* arc is closed. Any new finding goes into the post-beta backlog.
- No new feature additions. Beta ships the surface that exists.
- No design-token migrations on Media/Therapy/ChangePassword (deferred to a post-beta PP-TOKEN-SWEEP session).
- No backend Tier 3 features.
- No self-certifying closures. Every G2 finding ships with a failing-then-passing test commit pair (Government CLOSEOUT pattern — `V5-CRIT-01.md` is the gold standard).

---

## Verification protocol (mandatory for every closure)

Per the lesson from S14 hardest-evidence-promotion + Government CLOSEOUT + Loop 5 post-close design rot discovery:

1. **Code-reading alone is insufficient.** Every G2 finding lands in two commits: failing test → fix.
2. **Live exercise is mandatory.** Every G3 item walked on Railway production, not localhost.
3. **Cross-portal walks are first-class.** PL-028 + cross-portal CP-001..025 walks are scheduled, not assumed-from-tests.
4. **No "I read the controller and it looks right."** That pattern produced the leaks the next read found.

---

## Definitions of done

| Gate | Beta-ready means |
|---|---|
| G1 | `audits/redesign/TP-PARENT-ASSIGNMENT.md` STEP 2 + STEP 3 sections closed with production query output + commit SHA |
| G2 | `audits/backend/11-idor-resweep.md` exists, all findings landed as failing-then-passing commit pairs |
| G3 | Every "pending user Railway verification" item in LOOP_TRACKER flipped to ✅ with a one-line verification note |
| G4 | Privacy consent migration + endpoint + UI shipped + on-screen modal renders on first parent login |
| G5 | Consent text approved by product/legal + UZ/RU/EN strings landed in locale + audit doc records the approval |

---

## Invite-day gate (final go/no-go)

The beta invite goes out only when **all five gates** are ✅ AND:
- PL-026 through PL-030 all walked on production (5 critical flows)
- PL-005 (Sentry) confirmed firing on a deliberate test error
- A rollback plan exists (commit SHA to revert to + DB snapshot before invite)

If any of the above fails on day 14, invite slips. No exceptions.

---

## Pointer back to the audit work

The full reasoning behind these 5 gates lives in 6 sub-agent reports synthesized 2026-06-06. The sharpest concerns:

1. **TP-PARENT-ASSIGNMENT** — `audits/redesign/TP-PARENT-ASSIGNMENT.md` + `DEFERRED.md`
2. **Government S1 missed 3 region-scope leaks** — `audits/government/CLOSEOUT.md` §2
3. **Loop 5 closure tests didn't catch parent portal design rot** — `audits/teacher-parent/PARENT-TEACHER-GROUND-TRUTH.md`
4. **S14 found a latent bug only via live exercise** — `audits/prod-readiness/05-S14-hardest-evidence-promotion.md`
5. **PRIVACY_POSTURE.md still says consent UI = "NOT IMPLEMENTED"** — `docs/PRIVACY_POSTURE.md`

This plan addresses all five directly.
