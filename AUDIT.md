# Uchqun Platform - Comprehensive Security & Code Audit

**Date:** 2026-03-30
**Scope:** Full-stack audit of backend, 6 web apps, mobile app, DevOps/CI

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Critical Security Vulnerabilities](#1-critical-security-vulnerabilities)
3. [Authentication & Authorization Flaws](#2-authentication--authorization-flaws)
4. [Database & Data Integrity Issues](#3-database--data-integrity-issues)
5. [Backend Controller & Route Problems](#4-backend-controller--route-problems)
6. [Web Frontend Audit](#5-web-frontend-audit)
7. [Mobile App Audit](#6-mobile-app-audit)
8. [DevOps & CI/CD Gaps](#7-devops--cicd-gaps)
9. [Recommendations by Priority](#8-recommendations-by-priority)

---

## Executive Summary

The Uchqun platform is a substantial full-stack monorepo with a Node.js/Express backend, 6 React web dashboards, and a React Native/Expo mobile app. The codebase demonstrates solid architectural patterns, but this audit uncovered **130+ findings** across security, data integrity, performance, accessibility, and code quality.

### Severity Breakdown

| Severity | Count | Description |
|----------|-------|-------------|
| **CRITICAL** | 18 | Exploitable security flaws, auth bypasses, data corruption risks |
| **HIGH** | 27 | Missing protections, performance blockers, broken features |
| **MEDIUM** | 45+ | Inconsistencies, missing validations, code quality |
| **LOW** | 40+ | Best practice gaps, minor improvements |

### Top 5 Most Urgent Issues

1. **Auth bypass** - Sending `role: 'superAdmin'` in request body skips all authentication (`superAdminRoutes.js:155`)
2. **SQL injection** in migration runner - unparameterized queries (`migrate.js:144,159`)
3. **90-day JWT tokens** with no refresh rotation or revocation (`authController.js:7`)
4. **Payments auto-complete** without any payment provider integration (`paymentController.js:67-78`)
5. **Hardcoded secrets** throughout scripts and routes (`admin123`, `UchqunMigration2026`)

---

## 1. Critical Security Vulnerabilities

### 1.1 Authentication Bypass via Role Parameter
**File:** `backend/routes/superAdminRoutes.js:155-165`
```javascript
const conditionalAuth = async (req, res, next) => {
  if (req.body.role === 'superAdmin') {
    return next(); // SKIPS authentication entirely
  }
  authenticate(req, res, (err) => { ... });
};
```
**Exploit:** `POST /api/super-admin/admins` with `{"role": "superAdmin"}` bypasses all auth.
**Fix:** Never let user-controlled input decide authentication flow.

### 1.2 SQL Injection in Migration Runner
**File:** `backend/config/migrate.js:144,159`
```javascript
await sequelize.query(`INSERT INTO "SequelizeMeta" (name) VALUES ('${file}')`);
```
**Fix:** Use parameterized queries: `sequelize.query('...VALUES (?)', { replacements: [file] })`

### 1.3 Hardcoded Secrets & Default Credentials
| File | Secret | Risk |
|------|--------|------|
| `routes/migrationRoutes.js:14` | `'UchqunMigration2026'` fallback secret | Public migration trigger |
| `routes/superAdminRoutes.js:127` | `'admin123'` default password | Account takeover |
| `scripts/create-admin.js:16` | `'admin123'` | Known credentials |
| `scripts/create-government.js:15` | `'government123'` | Known credentials |
| `scripts/create-teacher.js:22` | `'teacher123'` | Known credentials |
| `scripts/create-super-admin.js:22` | `'SuperAdmin@2026'` | Known credentials |
| `env.example:8` | `DB_PASSWORD=0406` (real password) | Credential leak |
| `env.example:54-57` | Real Appwrite project/bucket IDs | Infrastructure exposure |

### 1.4 Weak XSS Sanitization (Custom Regex)
**File:** `backend/middleware/sanitize.js:5-14`

Custom regex misses: `<iframe>`, `<object>`, `<embed>`, `<svg>` vectors, Unicode bypasses, CSS injection via `<style>`, HTML5 event handlers.

**Fix:** Replace with `DOMPurify` or `sanitize-html` library.

### 1.5 Insecure Database SSL
**File:** `backend/config/database.js:36-39`
```javascript
ssl: { require: true, rejectUnauthorized: false }
```
Disables certificate validation in production. Vulnerable to MITM attacks.

### 1.6 90-Day JWT Tokens, No Refresh Rotation
**File:** `backend/controllers/authController.js:7`
```javascript
const ACCESS_TOKEN_EXPIRY = '90d';
```
Combined with comment on line 163: *"Refresh tokens are no longer stored in database for simplicity"* - stolen tokens are valid for 3 months with no revocation mechanism.

**Fix:** Reduce to 15-60 minutes, implement proper refresh token rotation with database-backed revocation.

### 1.7 CSRF Skipped for File Uploads
**File:** `backend/middleware/csrf.js:32-36`
```javascript
if (contentType.includes('multipart/form-data')) {
    return next(); // CSRF protection disabled
}
```
All file upload endpoints are CSRF-unprotected.

---

## 2. Authentication & Authorization Flaws

### 2.1 Missing Rate Limiting on Login
**File:** `backend/routes/authRoutes.js:49`
```javascript
router.post('/login', loginValidator, handleValidationErrors, login);
// authLimiter is defined but NOT applied
```
**Also missing on:** `/admin-register` (line 55), `/password` change (`userRoutes.js:15`)

### 2.2 Unauthenticated Endpoints Exposing Data
| Endpoint | File | Risk |
|----------|------|------|
| `GET /api/therapy` | `therapyRoutes.js:17` | All therapy data public |
| `GET /api/therapy/:id` | `therapyRoutes.js:18` | Therapy details public |
| `GET /api/media/proxy/:fileId` | `mediaRoutes.js:21-24` | Media files accessible without auth |
| `GET /api/child/debug/appwrite` | `childRoutes.js:11-27` | Infrastructure info leak |
| `POST /api/migrations/run` | `migrationRoutes.js:9` | DB migrations with default secret |

### 2.3 IDOR Vulnerabilities
- **Chat:** Teachers can access ANY conversation (`chatController.js:8-16`)
- **Payments:** Admins can specify any `parentId` for payments (`paymentController.js:17-88`)
- **Media proxy:** No ownership verification for file access (`mediaController.js:641-660`)
- **Push notifications:** No verification user owns device token (`pushNotificationRoutes.js:25-28`)

### 2.4 Mass Assignment Vulnerabilities
- **Media update:** `await media.update({ ...req.body })` allows modifying `childId`, `activityId` etc. (`mediaController.js:597-599`)
- **Emotional monitoring:** No whitelist of updatable fields (`emotionalMonitoringController.js:38-42`)

---

## 3. Database & Data Integrity Issues

### 3.1 Missing Foreign Key Indexes (13 models)
Performance-critical foreign keys without indexes:
- `Child.schoolId`, `Child.groupId`
- `Document.userId`, `Document.reviewedBy`
- `ParentActivity.parentId`, `ParentMeal.parentId`, `ParentMedia.parentId`
- `Activity.childId`
- `User.teacherId`, `User.groupId`, `User.createdBy`
- `ChatMessage.senderId`
- `TeacherResponsibility.teacherId`, `TeacherTask.teacherId`, `TeacherWorkHistory.teacherId`

**Impact:** Slow JOINs, slow pagination, N+1 query performance degradation.

### 3.2 Model-Migration Mismatches
| Model | Issue |
|-------|-------|
| `TeacherRating` | FK constraints in migration but NOT in model |
| `ChatMessage.senderId` | No references in model OR migration |
| `RefreshToken` | Indexes in migration, missing from model definition |
| `SchoolRating` | Model allows null for `stars` but migration says NOT NULL |
| `Progress` | Unique constraint on `childId` but no explicit index |

### 3.3 Missing Soft Deletes
No models use Sequelize's `paranoid: true`. Deleted users, children, and records are permanently removed with no recovery or audit trail.

### 3.4 Associations Defined in Multiple Places
6 models (`Activity`, `Media`, `Meal`, `Group`, `Progress`, `News`) define associations both in their own files AND in `models/index.js`, creating circular import risk and duplicate definitions.

### 3.5 Missing Model-Level Validations
- `Payment.amount` - no minimum validation (can be negative)
- `TherapyUsage.childId` - allows null (therapy for which child?)
- `Payment.transactionId` - unique but allows null (duplicate nulls)
- `User.phone` - no format validation
- `Document.mimeType` - no enum for allowed types
- `Child.disabilityType` - STRING(500), no enum/validation

### 3.6 Small Connection Pool
**File:** `backend/config/database.js:24-30`
Pool size of 5 is very small for production. Combined with `acquire: 60000` (60s timeout), this will cause connection exhaustion under moderate load.

---

## 4. Backend Controller & Route Problems

### 4.1 Payment Processing is a Placeholder
**File:** `backend/controllers/paymentController.js:67-78`
```javascript
// TODO: Process payment with payment provider
setTimeout(async () => {
  await payment.update({ status: 'completed', paidAt: new Date() });
}, 2000);
```
Payments auto-complete after 2 seconds with NO actual payment processing.

### 4.2 Inconsistent Response Formats
| Endpoint | Format |
|----------|--------|
| `/api/admin/receptions` | `{ success: true, data: [...] }` |
| `/api/news` | `{ news: [...], total, limit, offset }` |
| `/api/child` | Plain array `[...]` |
| `/api/therapy` | `{ success: true, data: { therapies: [...], total, limit, offset } }` |
| `/api/chat/messages` | Plain array `[...]` |

Frontend code must handle 5+ different response shapes.

### 4.3 Missing Input Validators
Endpoints with NO express-validator middleware:
- `POST /api/payments/callback`
- `POST/PUT /api/therapy`
- `POST /api/push-notifications/register`
- `POST /api/push-notifications/send`
- All `/api/chat` endpoints
- All `/api/notification` endpoints

### 4.4 No Pagination Limits Enforced
Most controllers accept arbitrary `limit` query params. Default of 200 on chat messages, no max on therapy, super admin messages. A user can request millions of records.

### 4.5 Over-fetching
- Admin get-receptions returns ALL documents for every reception
- Parent get-activities includes all children data with full nested records
- Get school ratings uses raw SQL returning all records without pagination

---

## 5. Web Frontend Audit

### 5.1 Auth Tokens in localStorage (All 5 Apps)
Every app stores JWT tokens in `localStorage`, which is vulnerable to XSS:
- `admin/src/context/AuthContext.jsx:49` - `admin_accessToken`
- `super-admin/src/context/AuthContext.jsx:48` - `super_admin_accessToken`
- `reception/src/context/AuthContext.jsx:52` - `reception_accessToken`
- `government/src/context/AuthContext.jsx:48` - `government_accessToken`
- `teacher/src/shared/context/AuthContext.jsx:103` - `accessToken`

### 5.2 Super-Admin Secret Key Exposed in Frontend
**File:** `super-admin/src/services/api.js:16-19`
```javascript
const superAdminKey = import.meta.env.VITE_SUPER_ADMIN_SECRET_KEY;
config.headers['x-super-admin-key'] = superAdminKey;
```
`VITE_*` variables are embedded in client-side JavaScript bundles.

### 5.3 Massive Code Duplication
**Duplicated across all 5+ apps instead of using `shared/`:**
- `AuthContext.jsx` (6 separate implementations, teacher has TWO)
- `api.js` service (7 separate implementations)
- `Card.jsx`, `LoadingSpinner.jsx`, `LanguageSwitcher.jsx`, `Layout.jsx`, `Toast.jsx`, `BottomNav.jsx`

### 5.4 Super-Admin: 1724-Line God Component
**File:** `super-admin/src/pages/SuperAdmin.jsx` - **1724 lines**, 76 `useState` hooks

Handles admin creation, school management, messages, payments, government users, and registration requests all in one component. Unmaintainable and untestable.

### 5.5 Government App is Significantly Less Polished
- Only 9 pages, ~1670 LOC total
- Missing Toast notifications
- Minimal error handling
- No responsive mobile design
- Limited accessibility (1 aria-label found)

### 5.6 Missing Across All Web Apps
- **No Error Boundaries** in any app
- **No form validation library** (only HTML5 `required`)
- **~10 aria-labels** across 145 JSX files total
- **No code splitting** (React.lazy not used)
- **No useMemo/useCallback** optimization (context values recreated every render)
- **Console.log everywhere** in production (admin Dashboard, reception App, super-admin api.js)
- **Incomplete i18n** - many hardcoded Uzbek strings, inconsistent translation coverage

---

## 6. Mobile App Audit

### 6.1 Security
- **Refresh token in AsyncStorage** (not SecureStore) - `authStorage.js:7-10`
- **User object stored in plain AsyncStorage** including role, ID, email
- **Token logged** (first 20 chars) in SocketContext.js:56
- **No deep linking security** - no URL scheme validation

### 6.2 Performance (Critical)
- **ScrollView instead of FlatList** for all long lists (notifications, activities, media) - renders ALL items at once, memory leak on large datasets
- **15-second polling in Chat** instead of WebSocket - 240 API calls/hour per user, drains battery (`ChatScreen.js:53-54`)
- **Nuclear cache invalidation** - ANY mutation clears ALL cache (`api.js:74-87`)
- **Socket event handlers accumulate** on reconnect - multiplied listeners (`SocketContext.js:109-113`)
- **No image caching/optimization** - full resolution images loaded immediately

### 6.3 Offline Support Gaps
- **No automatic queue replay** when network returns
- **No retry with exponential backoff** for queued requests
- **No conflict resolution** for simultaneous edits
- **File uploads not queued** - they simply fail and are lost

### 6.4 Push Notification Issues
- **Wrong-account notifications:** User logs out, device token stays registered, new login receives old user's notifications (`AuthContext.js:85-91`)
- **No handler on app relaunch:** Notification handler only set during registration, not on app startup
- **No foreground notification listeners** in App.js

### 6.5 Accessibility (Zero Implementation)
- **Zero `accessibilityLabel`** in entire mobile codebase
- **Zero `accessibilityRole`** definitions
- **No focus management** in forms or modals
- **Insufficient color contrast** for muted text on light backgrounds

### 6.6 Navigation Issues
- **Race condition in RootNavigator** - 200ms timeout with no debouncing (`RootNavigator.js:46-78`)
- **Tab state lost on switch** - `unmountInactiveScreens` not set to false
- **No Android back button handling** - users can accidentally exit app

### 6.7 Missing Error States
Multiple screens show blank/empty when data fetch fails with no error message to user:
- ParentDashboardScreen - empty dashboard on failure
- MediaScreen - silent failure
- ActivitiesScreen - no error message

### 6.8 No Tests
Zero unit, integration, or E2E tests for the mobile app.

---

## 7. DevOps & CI/CD Gaps

### 7.1 CI Pipeline Doesn't Block on Failures
**File:** `.github/workflows/ci.yml`
- `continue-on-error: true` on lint AND test jobs
- `|| true` on test commands (lines 66, 83)
- `|| echo "ESLint found issues, but continuing..."` (line 23)

**Result:** Code with linting errors and failing tests can be deployed.

### 7.2 No Security Scanning
- No `npm audit` in CI
- No dependency vulnerability scanning (Snyk, Dependabot)
- No secret scanning in commits
- No SAST
- No container scanning for Docker image

### 7.3 Node.js Version Mismatch
| Environment | Version |
|-------------|---------|
| CI/CD (GitHub Actions) | Node 18 |
| Railway deployment | Node 20 |
| Netlify/Vercel | Node 18 |

Tests run on Node 18, production runs on Node 20.

### 7.4 No Test Coverage Requirements
- Jest configured with `collectCoverageFrom` but no threshold enforcement
- Frontend vitest has no coverage configuration
- No coverage reporting in CI

### 7.5 Root package.json References Missing Files
`scripts/migrate.js`, `scripts/seed.js`, `scripts/test-rls.js`, `scripts/setup.js` referenced in root `package.json` but don't exist.

### 7.6 No Staging Environment
All deployment configs (Railway, Netlify, Vercel) target production directly. No staging/preview environment for testing.

### 7.7 Docker Issues
- Backend service has no health check in `docker-compose.yml`
- `depends_on` postgres but doesn't wait for readiness
- JWT secrets have weak placeholder defaults

---

## 8. Recommendations by Priority

### P0 - Fix Immediately (Security Critical)

| # | Issue | File | Effort |
|---|-------|------|--------|
| 1 | Remove auth bypass via role parameter | `superAdminRoutes.js:155` | 30min |
| 2 | Fix SQL injection in migration runner | `migrate.js:144,159` | 30min |
| 3 | Remove all hardcoded secrets/passwords | Multiple scripts + routes | 2hr |
| 4 | Reduce JWT expiry to 15-60min, implement refresh rotation | `authController.js` | 1-2 days |
| 5 | Apply `authLimiter` to `/login` endpoint | `authRoutes.js:49` | 15min |
| 6 | Add authentication to `/api/therapy` GET routes | `therapyRoutes.js:17-18` | 15min |
| 7 | Fix `rejectUnauthorized: false` in DB SSL | `database.js:38` | 30min |
| 8 | Remove real credentials from `env.example` | `env.example` | 15min |

### P1 - Fix This Sprint (High Security/Reliability)

| # | Issue | Effort |
|---|-------|--------|
| 9 | Replace custom XSS sanitization with DOMPurify | 2hr |
| 10 | Add media proxy ownership verification | 2hr |
| 11 | Fix mass assignment (whitelist update fields) | 4hr |
| 12 | Add rate limiting to admin-register, password change | 1hr |
| 13 | Implement proper payment processing (remove auto-complete) | 2-5 days |
| 14 | Add missing foreign key indexes (13 models) | 4hr |
| 15 | Fix CI to block on test/lint failures | 1hr |
| 16 | Add npm audit to CI pipeline | 1hr |
| 17 | Fix mobile push notification user-mismatch on logout | 2hr |
| 18 | Move mobile refresh token to SecureStore | 1hr |

### P2 - Fix This Month (Quality & Maintainability)

| # | Issue | Effort |
|---|-------|--------|
| 19 | Standardize API response format across all controllers | 2-3 days |
| 20 | Add input validators to all POST/PUT endpoints | 3-5 days |
| 21 | Extract shared components from duplicated web apps | 3-5 days |
| 22 | Break SuperAdmin.jsx (1724 lines) into sub-components | 2 days |
| 23 | Replace mobile ScrollView with FlatList for long lists | 1-2 days |
| 24 | Replace mobile chat polling with WebSocket | 2-3 days |
| 25 | Fix model-migration mismatches | 2 days |
| 26 | Add soft deletes to User, Child models | 1-2 days |
| 27 | Fix Node.js version mismatch (CI vs production) | 2hr |
| 28 | Add Error Boundaries to web + mobile apps | 1-2 days |
| 29 | Implement granular cache invalidation in mobile | 1-2 days |

### P3 - Fix This Quarter (Best Practices)

| # | Issue | Effort |
|---|-------|--------|
| 30 | Move auth tokens from localStorage to HttpOnly cookies | 3-5 days |
| 31 | Add accessibility labels (web + mobile) | 2 weeks |
| 32 | Complete i18n coverage across all apps | 1 week |
| 33 | Add form validation library (zod/yup) to web apps | 1 week |
| 34 | Implement code splitting (React.lazy) | 2-3 days |
| 35 | Add test coverage thresholds and reporting | 2-3 days |
| 36 | Set up staging environment | 2-3 days |
| 37 | Add mobile unit/integration tests | 2-4 weeks |
| 38 | Implement biometric auth for mobile | 1 week |
| 39 | Add audit logging for sensitive operations | 1-2 weeks |
| 40 | Consider TypeScript migration for mobile | 4-8 weeks |

---

## Appendix: Files Analyzed

**Backend (65+ files):** All middleware, controllers, routes, models, migrations, validators, config, scripts
**Web Frontends (145+ JSX files):** All 5 apps - context, pages, services, components, configs
**Mobile (50+ files):** All screens, services, navigation, context, styles, components
**DevOps (15+ files):** CI workflows, Docker, Railway, Netlify, Vercel, ESLint, Husky, package.json files
