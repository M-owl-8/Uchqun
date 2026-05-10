# Phase 11 v2 — Cross-Cutting Verification
**Date:** 2026-05-10  
**Baseline:** `/audit/11-cross-cutting.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

Of the 11 issues, **5 are verified-fixed**, **2 are partially-fixed**, and **4 are not-fixed**. The remediation cycle made substantial improvements to this phase: Node 20 in production (11-004), errorLogger wired (11-001), jsdom to devDependencies (11-007), frontend linting in CI (11-003), console.* eliminated from controllers (11-011), and 12 of 13 previously-unvalidated route files now have validators (11-010 partial).

What remains: no .env.example (11-005), shared/locales English-only (11-006), duplicate HTML sanitizers (11-008), stale OpenAI SDK (11-009), teacherResourceRoutes.js still unvalidated (11-010 partial), and CI coverage threshold set at a trivially-low 10% floor (11-002 partial).

New since v1: CI now includes SAST (Trivy filesystem scan + Gitleaks secret scanning) and a `sast` job gate on the build job.

**Phase 11 v2 score: 68/100** (up from 56/100).

---

## Scope

Verification of all 11 issues from `/audit/11-cross-cutting.md`. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 11-001 | MEDIUM | **verified-fixed** | `backend/server.js:14,179` | `errorLogger` imported and registered after `notFound`, before `errorHandler` |
| 11-002 | MEDIUM | **partially-fixed** | `backend/jest.config.js:16-22`; `.github/workflows/ci.yml:108-109` | Threshold exists (lines/statements/functions: 10%, branches: 5%); CI runs with --coverage; floor is not meaningful |
| 11-003 | LOW | **verified-fixed** | `.github/workflows/ci.yml:133-146` | `lint-frontend` job runs `npm run lint` for admin/teacher/reception/government matrix |
| 11-004 | HIGH | **verified-fixed** | `backend/nixpacks.toml:2` | `nixPkgs = ["nodejs_20", "npm"]` — corrected from `nodejs-18_x` |
| 11-005 | MEDIUM | **not-fixed** | Glob `.env.example` returns no results | No `.env.example` at repo root or in `backend/` |
| 11-006 | MEDIUM | **not-fixed** | `shared/locales/en.json` (only file) | `shared/locales/` still contains only `en.json`; no `uz.json` or `ru.json` |
| 11-007 | MEDIUM | **verified-fixed** | `backend/package.json` devDependencies | `jsdom@^27.4.0` is now in `devDependencies`, not `dependencies` |
| 11-008 | LOW | **not-fixed** | `backend/package.json:46,61` | Both `dompurify@^3.3.1` and `sanitize-html@^2.17.2` still in production `dependencies` |
| 11-009 | LOW | **not-fixed** | `backend/package.json:58` | `"openai": "^4.20.0"` unchanged |
| 11-010 | HIGH | **partially-fixed** | See detailed finding below | 12 of 13 previously-unvalidated routes now have validators; `teacherResourceRoutes.js` still zero validators |
| 11-011 | LOW | **verified-fixed** | `grep -r "console\." backend/controllers/` returns 0 hits | Zero `console.*` calls remain in any controller file |

**Verdict distribution: 5 verified-fixed · 2 partially-fixed · 4 not-fixed**

---

## Detailed Findings

### 11-001 — errorLogger registered (verified-fixed)

`backend/server.js:14`:
```js
import { requestLogger, errorLogger } from './middleware/requestLogger.js';
```

`backend/server.js:179`:
```js
app.use(notFound);
app.use(errorLogger);
app.use(errorHandler);
```

`errorLogger` is now correctly registered as the 4-argument Express error middleware between `notFound` and `errorHandler`. Error logs now carry the correlation ID from `requestLogger`. Confirmed: the registration order is correct — error passes through `errorLogger` (attaches correlationId) → `errorHandler` (sends response).

---

### 11-002 — Coverage threshold (partially-fixed)

`backend/jest.config.js:16-22`:
```js
coverageThreshold: {
  global: {
    lines: 10,
    statements: 10,
    branches: 5,
    functions: 10,
  },
},
```

`.github/workflows/ci.yml:108-109`:
```
- name: Run backend tests with coverage
  run: cd backend && npm test -- --coverage
```

**Fixed:** A threshold now exists and CI runs with `--coverage`. This is a non-trivial improvement over the original "no threshold defined, coverage not collected."

**Still broken:** A 10% line/statement/function floor and 5% branch floor is not a meaningful quality gate. A PR that adds a 200-line controller with zero tests passes CI as long as existing coverage stays above 10%. The original issue was absence of enforcement; the fix is presence of enforcement at a floor so low it cannot fail a PR that adds untested code. Target per the prompt: backend 70%, frontend 50%.

---

### 11-003 — Frontend linting (verified-fixed)

`.github/workflows/ci.yml:133-146`:
```yaml
lint-frontend:
  runs-on: ubuntu-latest
  strategy:
    matrix:
      app: [admin, teacher, reception, government]
  steps:
    - ...
    - name: Run ESLint
      run: cd ${{ matrix.app }} && npm run lint
```

All 4 frontend apps are now linted in CI as a blocking step. The `build` job has `needs: [lint, lint-frontend, ...]` — frontend lint failures block build. The `showToast` undefined destructure (Phase 05 issue) would have been caught by this gate.

**Additional since v1:** The `sast` job (Trivy + Gitleaks) is also new and blocks builds:
- Gitleaks: secret scanning on every push/PR
- Trivy: vuln/secret/misconfig scanning at CRITICAL/HIGH severity

---

### 11-004 — Node 20 in nixpacks.toml (verified-fixed)

`backend/nixpacks.toml:1-2`:
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "npm"]
```

Corrected from `nodejs-18_x`. Railway now provisions Node 20 in production, matching the CI environment and the `"engines": { "node": ">=20.0.0" }` requirement in `backend/package.json`. Node 18 EOL risk eliminated.

---

### 11-010 — Input validator coverage (partially-fixed)

Routes that now have validators (were missing in v1):

| Route file | Validators added |
|-----------|-----------------|
| `receptionRoutes.js` | `createStaffValidator`, `createParentValidator`, `messageToGovValidator` |
| `parentRoutes.js` | `rateTeacherValidator`, `rateSchoolValidator`, `submitEvaluationValidator`, `aiChatValidator`, `messageToGovValidator` |
| `chatRoutes.js` | `sendMessageValidator`, `markReadValidator`, `updateMessageValidator`, `messageIdValidator` |
| `childAssessmentRoutes.js` | `createAssessmentValidator`, `updateAssessmentValidator` |
| `mealPlanRoutes.js` | `createMealPlanValidator`, `bulkCreateMealPlansValidator`, `updateMealPlanValidator`, `mealPlanIdValidator` |
| `notificationRoutes.js` | `notificationIdValidator` |
| `progressRoutes.js` | `updateProgressValidator` |
| `servicePlanRoutes.js` | `upsertServicePlanValidator`, `bulkUpsertServicePlansValidator` |
| `businessRoutes.js` | `generateStatsValidator` |
| `aiWarningRoutes.js` | `analyzeWarningsValidator`, `resolveWarningValidator`, `notifyWarningValidator` |
| `adminRoutes.js` | `createReceptionValidator`, `adminIdParamValidator`, `rejectDocumentValidator`, `messageToGovValidator` |
| `teacherRoutes.js` | `updateTaskStatusValidator`, `aiChatValidator`, `messageToGovValidator`, `createEmotionalMonitoringValidator`, `updateEmotionalMonitoringValidator` |

**Still missing:** `teacherResourceRoutes.js` — zero validator or `handleValidationErrors` references. File upload routes (teacher resources) reach the controller with no input validation beyond multer's multipart parsing.

---

### 11-011 — console.* eliminated (verified-fixed)

`grep -r "console\." backend/controllers/` returns 0 matches. All 17 previously-found `console.log/warn/error` calls across `activityController.js`, `mealController.js`, `userController.js`, and `mediaController.js` have been replaced with structured `logger.*` calls. PII redaction and Google Cloud Logging transport now cover all controller log output.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Security Infrastructure | 68% | 73% | +5 | (1) errorLogger now wired with correlation ID; (2) SAST (Trivy + Gitleaks) added to CI |
| CI/CD Pipeline | 63% | 79% | +16 | (1) Frontend linting now in CI matrix; (2) SAST job added as gate; (3) Coverage runs with --coverage; (4) Node 20 CI matches prod |
| Environment Config | 55% | 63% | +8 | (1) JWT_EXPIRE default corrected to 15m (fixed in 08-010); (2) no .env.example still absent |
| Shared Library | 52% | 52% | 0 | Context duplication unchanged; shared/locales English-only unchanged |
| Dependency Health | 68% | 73% | +5 | (1) jsdom moved to devDependencies; (2) two sanitizers and stale OpenAI SDK unchanged |
| Input Validation Coverage | 38% | 68% | +30 | (1) 12 of 13 previously-unvalidated routes now have validators; (2) teacherResourceRoutes.js still zero |
| Logging | 60% | 72% | +12 | (1) All 17 console.* calls eliminated from controllers; (2) errorLogger now active |
| Deployment Config | 42% | 58% | +16 | (1) Node 20 in nixpacks.toml; (2) no .env.example still absent |
| **Overall** | **56%** | **68%** | **+12** | |

---

## Open Questions (from v1, updated)

1. **11-002 threshold floor:** A 10%/5% floor is not a meaningful quality gate. Per cleanup mandate, targets are backend 70%, frontend 50%.
2. **11-005 .env.example:** Still absent. Required secrets discoverable only by reading `env.js`.
3. **11-006 shared/locales:** Still English-only. `uz.json`/`ru.json` never added.
4. **11-008 dual sanitizers:** Both `dompurify` and `sanitize-html` in prod deps. The `dompurify→jsdom` chain concern: `jsdom` is now in devDependencies — how is `dompurify` resolving JSDOM at runtime? May no longer actually load JSDOM in prod, but `sanitize-html` still redundant.
5. **11-009 OpenAI SDK:** `openai@4.20` — now ~47 minor versions behind current.
6. **11-010 teacherResourceRoutes.js:** Only unvalidated route file remaining.

---

## What I Did NOT Look At

- Full `teacherResourceRoutes.js` content (only confirmed zero validator matches)
- Whether `dompurify` still requires JSDOM at runtime now that JSDOM is in devDependencies
- Actual coverage percentage at HEAD (would require running `npm test -- --coverage`)
- Full `adminRoutes.js` to confirm all write operations are validated (spot-checked validator presence only)
