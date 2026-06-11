# S22-V4 — VERIFICATION REBUILD: soft-PARTIAL → hard verdicts

**Date:** 2026-06-10 (portal suites) + 2026-06-11 (close-out probe)
**Mode:** FIND AND RECORD ONLY — no product fixes this session
**Principle:** a PASS requires the *outcome* asserted (entity exists / new value persisted / count changed / result read back), not just the click performed.

---

## 1. What was done

The S14 run left **150 rows PARTIAL** with soft language ("clicked if visible", "form submitted; result not asserted", "modal opened"). S22-V4 re-tested every functional PARTIAL with hard asserts:

- **Suites:** `tests/s22v4-{reception,teacher,parent,admin,government}.spec.js` (one Playwright project each; parent at 390×844 mobile) — ran 2026-06-10, results folded into FEATURE-MATRIX row by row.
- **Close-out probe:** `tests/s22v4-probe.spec.js` — ran 2026-06-11 to settle the last 2 PARTIALs (P-001, P-002), re-test the G-002 FAIL, and prove the non-chat realtime surface.

Destructive mutations were avoided per spec: creates used disposable test entities asserted via API readback (e.g. R-029 parent found via `GET /reception/parents`); deletes asserted via count-decrease on entities the suite itself created (T-048); archival/irreversible actions asserted via confirm-dialog + cancel path (G-022/G-023, UX-01 pattern).

## 2. Movement (150 PARTIAL baseline)

| Outcome | Count | Notes |
|---|---|---|
| PARTIAL → PASS | **72** | 70 in the five suites + P-002, G-002 in the probe |
| PARTIAL → WON'T-AUTOMATE | **77** | each row states the reason (selector reliability, seed-data gaps, OS file dialogs) — none are product defects |
| PARTIAL → FAIL | **1** | P-001 — DEF-009 (P1) reproduces 2/3, root cause revised (see §4) |
| Remaining PARTIAL | **0** | — |

Bonus moves outside the PARTIAL set: **T-043** and **P-051** (both realtime, previously BLOCKED) → PASS on socket proofs unlocked by the DEF-015 fix.

## 3. New matrix tally (484 rows)

| Portal | Total | PASS | PARTIAL | BLOCKED | WON'T-AUTOMATE | KNOWN-FAIL | FAIL |
|---|---|---|---|---|---|---|---|
| Reception | 89 | 70 | 0 | 18 | 1 | 0 | 0 |
| Teacher | 117 | 41 | 0 | 64 | 12 | 0 | 0 |
| Parent | 106 | 40 | 0 | 48 | 16 | 1 (P-011) | 1 (P-001) |
| Admin | 96 | 46 | 0 | 24 | 26 | 0 | 0 |
| Government | 76 | 32 | 0 | 21 | 22 | 1 (G-050) | 0 |
| **TOTAL** | **484** | **229** | **0** | **175** | **77** | **2** | **1** |

Hard-PASS rate 229/484 = **47%**. Blocked rate 175/484 = **36%**.

## 4. Defect ledger changes

- **DEF-009 (P1, OPEN) — revised root cause.** Backend cold-start theory refuted: 36/36 parent API logins pass (12 accounts × 3 sweeps). The UI form login bounced back to `/login` within ~1–5 s of a *successful* login in 2 of 3 attempts. Debug trace: the login page fires `/auth/me` → 401 → `/auth/refresh` → 401 *before* login; when that chain resolves after the post-login navigation, the unauthenticated handler clears auth and redirects. Suspected layer: frontend `shared/services/api.js` onUnauthenticated racing a concurrent successful login. Evidence: `screens/S22V4-P-001-def009-bounce-to-login.png`. **Not fixed this session.** Matrix P-001 = FAIL.
- **DEF-016 — RETRACTED.** The government suite's G-002 FAIL ("no password toggle") was a test artifact: the `.last()` svg-button selector clicked the language switcher. `Field.jsx` implements the toggle; corrected probe (`button[aria-label="Show password"]`) proves type switches password↔text both directions on the live portal (`screens/S22V4-G-002-toggle-type-text.png`). Selector fixed in `tests/s22v4-government.spec.js`. G-002 = PASS.

## 5. Hard-assert proofs for the gate items

- **Creates/edits readback:** R-029 wizard-created parent found via API list; T-047 activity title change confirmed after save; T-048 delete confirmed by count decrease; A-035/A-036 suspend/activate asserted by status-badge change and restore.
- **P-002 silent refresh (previously "not directly observable"):** accessToken cookie deleted mid-session with refreshToken kept → reload → interceptor silently refreshed, page stayed authenticated, new accessToken cookie re-issued (`screens/S22V4-P-002-silent-refresh-recovered.png`).
- **Non-chat realtime (closes the S22-V3/DEF-015 "only chat proven" caveat):** teacher1 parked on the Xabar *warnings* tab (chat not mounted); parent1 sent a message via API → the "Suhbat" unread badge incremented **0→1 live via socket, no reload** (`screens/S22V4-RT-NONCHAT-badge-increment.png`).
- **Language mid-flow:** parent P-013 RU persists after reload + P-103 EN with no raw keys; admin A-005 Cyrillic asserted after RU select; government G-071 Cyrillic asserted. Teacher switcher WON'T-AUTOMATE (selector unreliable; toggle exists in code).
- **Double-submit:** DOUBLE-1 (S22-V3) attendance double-click fired ≤1 POST; no duplicate rows observed in any S22-V4 create flow.

## 6. Status

S22-V4 complete. **STOP — awaiting go-ahead before S23.**

Open items carried forward: DEF-009 (P1, frontend auth race), DEF-014 (P3, period string sort), P-011 + G-050 KNOWN-FAIL, 175 BLOCKED rows (clusters listed in FEATURE-MATRIX).
