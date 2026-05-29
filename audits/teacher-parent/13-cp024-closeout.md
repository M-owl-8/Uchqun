# Loop 5 — Consolidation / Hardening Pass (full)

## What this is
ИРР is complete across teacher + parent + admin. Before CP-020/CP-022, harden what's built. Four parts, in dependency order: (A) restore a clean test baseline by resolving the 15 teacher-suite reds, (B) end-to-end human-walk script + execution through the whole ИРР, (C) PL-009 translation SCOPING into a reviewable artifact for the partner (NOT verification — that needs a native speaker), (D) the 302 frontend lint debt. NO new features. NO CP-020/022.

## Pre-flight
1. Read `LOOP_TRACKER.md`. Mark CONSOLIDATION = 🟡.
2. Read `LOOP_PRE_LAUNCH_CHECKLIST.md` (PL-009 lives here), `IRR-DECISIONS.md`.

## PART A — Restore clean test baseline (15 teacher reds) — DO FIRST, it gates Part B
The CP-024 closeout reported 15 teacher-suite failures claimed pre-existing (Settings mock mismatch, parentSidebar /ai-warnings link removed in S3, AIWarnings parent-role test). VERIFY, don't trust the claim (this project's standard — "pre-existing" has needed proof twice before):
1. For each of the 15: PROVE it's pre-existing by checking it fails at a commit BEFORE the ИРР/CP work began (stash or checkout a prior SHA, run, confirm red there too). Quote the proof per failure (or group them if same root cause).
2. Any failure that does NOT fail at the prior commit = CAUSED BY our work = a real regression → fix it.
3. For the genuinely-pre-existing ones, decide per failure: FIX (if cheap + correct — e.g. the /ai-warnings parentSidebar test should be updated to match the S3 dead-link removal, since WE made that change intentionally) or QUARANTINE (skip with a documented reason + a tracked debt item). Prefer FIX for anything our own prior cleanup caused (the /ai-warnings one is ours — that test should be corrected, not skipped).
4. Goal: teacher suite returns to CLEAN GREEN (0 unexplained reds). Any remaining skips are documented, intentional, tracked.
Quote the before (15 red) → after (green + N documented skips) state. This clean baseline is required before Part B's walk is trustworthy.

## PART B — End-to-end human-walk script + execution
No test has exercised the ИРР as a HUMAN SEQUENCE. Build a structured click-path that doubles as the demo script, and execute it (locally, real DB).
1. Write the walk script: the full ИРР lifecycle as ordered steps with expected outcome at each:
   - Teacher: create ИРР for a child → fill 9 header fields → activate (gate passes) → assess at intake (score 17 criteria, see live total → submit, see it in progression) → add long-term goals → create a goal period → add 3–5 short-term goals → write quarterly review + parentRecommendations → teacher-sign → log a daily journal entry → log a weekly entry.
   - Parent: open the child's ИРР → see the intake score → see goals + the highlighted parentRecommendations → (no edit affordance anywhere).
   - Admin: open Manager ИРР → see the child's period → manager-sign → fill a quarterly monitoring entry (55 items).
   - Teacher again: assess at 3mo (higher score) → Parent: see the progression RISE (the demo payoff).
2. EXECUTE it against a local DB with seeded data — actually run each step (via the API for backend steps + a scripted/manual frontend check, or an integration test that walks the sequence). Record at each step: did it work, did the data flow correctly (teacher input → parent sees it), any dead links / broken states / missing-data assumptions / wrong date formats / anything audit-invisible.
3. Report findings: anything that broke or felt wrong in the SEQUENCE (not caught by isolated tests). For each finding: severity + fix-now or log.
Deliverable: a reusable `IRR-WALKTHROUGH.md` (the demo script) + the execution findings.

## PART C — PL-009 translation SCOPING (prepare for native review — do NOT verify)
Claude Code CANNOT verify Uzbek/Russian clinical-government terminology — that needs a native speaker who knows the ministry's language (Otabek / a ministry contact). This part PREPARES the review:
1. Extract EVERY PL-009 (AI-generated, unverified) uz + ru string across the ИРР: the 17 criteria + their level descriptions, the 45 journal items (daily 27 + weekly 18), the 55 quarterly items, all ИРР UI labels/buttons/toasts/errors across teacher+parent+admin, the i18n error-code catalog additions.
2. Organize into a single reviewable artifact (`PL-009-REVIEW.md` or a spreadsheet-style table): each row = key | English (reference) | current uz | current ru | [blank: corrected uz] | [blank: corrected ru] | source (where it appears). Group by area (criteria / journals / UI / errors) so a reviewer can work section by section.
3. Flag the HIGHEST-RISK strings: the clinical/standard terminology (criteria names, ПТПК terms, the level descriptions, assessment language) — these are where wrong Uzbek most damages credibility with a ministry reviewer. Mark them priority-1 for review.
4. Note count + the partner-handoff: "N strings need native uz/ru review before beta; clinical terminology is priority-1; recommend Otabek or a ministry contact review the standard-derived terms specifically."
Do NOT change any translation — just scope, organize, prioritize, and prepare the handoff.

## PART D — Frontend lint debt (302)
1. Run lint across the full frontend (teacher + admin + parent). Quote the actual count.
2. Categorize: auto-fixable (formatting, unescaped entities) vs. needs-judgment (unused vars, hook deps). Auto-fix the safe ones (run the fixer, confirm tests still green after). For the needs-judgment ones, fix where clearly correct, log the rest.
3. Do NOT introduce behavior changes to satisfy lint (e.g. don't "fix" a hook-dep warning by changing deps in a way that alters behavior — log those for careful review instead). Tests must stay green through lint cleanup.
4. Quote before (302) → after count + what remains + why.

## Deliverable
`audits/teacher-parent/14-consolidation.md` — Part A (15-reds proof + clean-green result), Part B (link to IRR-WALKTHROUGH.md + execution findings), Part C (PL-009-REVIEW.md scope + count + partner-handoff note), Part D (lint before/after). All suites green (or documented skips), quoted.

## Rules
- Part A FIRST and it GATES Part B (clean baseline before the walk).
- VERIFY the 15 reds are pre-existing (prior-commit proof) — don't trust the claim. Fix what's ours (the /ai-warnings test), regression if any, quarantine only with documented reason.
- Part B: actually EXECUTE the walk, real DB — report sequence findings audits missed.
- Part C: SCOPE + prepare only. Do NOT verify/change translations (needs native speaker). Prioritize clinical terms.
- Part D: no behavior changes to satisfy lint; tests stay green.
- NO new features. NO CP-020/022.

## Close-out
- Commit: `chore(teacher-parent): consolidation — clean test baseline + ИРР walkthrough + PL-009 scope + lint`
- Tracker: CONSOLIDATION = ✅. Log: 15-reds resolution, walk findings count, PL-009 string count + partner-handoff, lint before/after.
- STOP. Then CP-020 (school ratings) + CP-022 (message routing) — the displaced overhauls — then the loop's later stages.