# Phase 1 v2 — Naming & Identity Verification
**Date:** 2026-05-08  
**Baseline:** `/audit/01-naming.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

**The Phase 1 naming issues were not remediated.** Of the 20 issues catalogued in the original audit, **18 are not-fixed**, **1 is verified-fixed** (01-003 Help page email, via #04-001), and **1 is verified-fixed** (01-018 isTeacher predicate, via H-18). One issue (01-005) is partially addressed with env-var fallback added but hardcoded URL retained.

The super-admin ghost has **grown** from 50+ references to approximately **162 references** at HEAD. The controller split work in Phase 7 (receptionController.js → receptionParentController.js) migrated some ghost references into new files without cleaning them, expanding the blast radius.

The remediation tracker never assigned IDs to Phase 1 issues. The claim that "all 136 issues closed" cannot be reconciled with Phase 1 — either these 20 issues were excluded from the 136, or the tracker's ID system (H/M/L/C) does not map to the phase-based naming issues.

**Phase 1 v2 score: 48/100** (up from 46/100 — marginal improvement from the two isolated fixes).

---

## Scope

Verification of all 20 issues from `/audit/01-naming.md`. Special verification target §6.7 (super-admin ghost sweep) applied. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 01-001 | HIGH | **not-fixed** | `admin/src/__tests__/utils.test.js:34,113` | `'super-admin'` string unchanged |
| 01-002 | HIGH | **not-fixed** | `admin/src/locales/en/common.json:176-177` | "davlat" still in English strings |
| 01-003 | HIGH | **verified-fixed** | `teacher/src/parent/pages/Help.jsx:35-36` | Email now via `t('help.emailValue')` = `support@uchqun.uz` |
| 01-004 | HIGH | **not-fixed** | `teacher/vite.config.js:10` | Hardcoded `uchqun-production-2d8a.up.railway.app` fallback retained |
| 01-005 | MEDIUM | **partially-fixed** | `backend/controllers/parent/parentAIController.js:115,162,185` | Env var checked first now (`FRONTEND_URL?.split(',')[0]`); hardcoded fallback URL still present |
| 01-006 | MEDIUM | **not-fixed** | `government/src/components/tabs/MessagesTab.jsx:16,18,27,36,45` | `t('superAdmin.*')` calls unchanged |
| 01-007 | MEDIUM | **not-fixed** | `government/src/locales/en/common.json:121` | `"superAdmin"` top-level key in all 3 locale files |
| 01-008 | LOW | **not-fixed** | `admin/src/locales/uz/common.json`, `reception/src/pages/Profile.jsx:317`, `teacher/src/pages/Settings.jsx:512` | `contactSuperAdmin`, `superAdminReply` keys unchanged |
| 01-009 | LOW | **not-fixed** | `backend/utils/telegram.js:145` | "super-admin tomonidan tasdiqlandi" unchanged |
| 01-010 | LOW | **not-fixed** | `backend/utils/email.js:94` | "super-admin bilan bog'laning" unchanged |
| 01-011 | LOW | **not-fixed** | `backend/env.example:30` | `SUPER_ADMIN_SECRET_KEY` unchanged |
| 01-012 | LOW | **not-fixed** | `backend/controllers/admin/adminUserController.js:285,332` | `updateGovernmentBySuper`, `deleteGovernmentBySuper` still exist at these lines (new `updateAdminBySuper`/`deleteAdminBySuper` added separately but originals untouched) |
| 01-013 | LOW | **not-fixed** | `backend/scripts/create-admin.js:14`, `create-government.js:14` | `@uchqun.com` domain unchanged |
| 01-014 | LOW | **not-fixed** | `teacher/package.json:2` | `"uchqun-teacher-frontend"` unchanged |
| 01-015 | LOW | **not-fixed** | `teacher/public/locales/uz/common.json:14`, `ru/common.json:14` | `"Uchqun Portal"` title unchanged |
| 01-016 | LOW | **not-fixed** | `backend/controllers/parent/parentAIController.js:116,163,186` | `'X-Title': 'Uchqun Parent Portal'` unchanged |
| 01-017 | MEDIUM | **not-fixed** | `backend/controllers/receptionParentController.js:35` | `'Uchqun School'` hardcoded fallback migrated from old controller to new split file |
| 01-018 | MEDIUM | **verified-fixed** | `shared/context/AuthContext.jsx:62` | `isTeacher: user?.role === 'teacher'` — admin role removed; fixed via H-18 |
| 01-019 | MEDIUM | **not-fixed** | `docs/internal/PROJECT_GUIDE.md:284` | URL `uchqun-production.up.railway.app` (missing `-2d8a` suffix) unchanged |
| 01-020 | HIGH | **not-fixed** | `AUDIT_REPORT.md` (root) | File still exists, still references mobile screens/payments/super-admin app |

**Verdict distribution: 2 verified-fixed · 1 partially-fixed · 17 not-fixed**

---

## Detailed Findings

### 01-001 — Test asserting `'super-admin'` role string (not-fixed)

`admin/src/__tests__/utils.test.js:34`:
```js
'super-admin': 'Super Admin',
```
`admin/src/__tests__/utils.test.js:113`:
```js
expect(getRoleLabel('super-admin')).toBe('Super Admin');
```

The `'super-admin'` string is not a DB ENUM value. The test passes only because `getRoleLabel` has a default fallback branch — it tests a non-existent role. No change since original audit.

---

### 01-002 — English locale with Uzbek words (not-fixed)

`admin/src/locales/en/common.json:176-177`:
```json
"contactDescription": "Click the button below to send a message to davlat",
"sendMessage": "Send message to davlat",
```

Uzbek word "davlat" (= government) still embedded in English locale strings. No change.

---

### 01-003 — Help page support email (verified-fixed)

Original symptom: `teacher/src/parent/pages/Help.jsx:44` showed hardcoded `support@uchqunplatform.com`.

Current state (`teacher/src/parent/pages/Help.jsx:35-36`):
```jsx
<a href={`mailto:${t('help.emailValue')}`} className="...">
  {t('help.emailValue')}
```

Locale value (`teacher/src/parent/locales/en/common.json:285`):
```json
"emailValue": "support@uchqun.uz",
```

All three locales (en/ru/uz) now use `support@uchqun.uz`. The fake `uchqunplatform.com` domain is gone. **Fixed via tracker #04-001.**

---

### 01-004 — Hardcoded Railway URL in teacher vite.config.js (not-fixed)

`teacher/vite.config.js:10`:
```js
const backendBase = process.env.VITE_API_URL?.replace('/api', '') || 'https://uchqun-production-2d8a.up.railway.app';
```

The hardcoded fallback `uchqun-production-2d8a.up.railway.app` is still present. If `VITE_API_URL` is unset, the teacher frontend silently calls this URL. The URL may be correct (it appears to be the actual Railway URL), but the multi-URL inconsistency remains: `env.example` shows `uchqun-production-up.railway.app` and `PROJECT_GUIDE.md` shows `uchqun-production.up.railway.app`.

---

### 01-005 — parentAIController hardcoded Railway URLs (partially-fixed)

Original: Three calls with hardcoded URL as HTTP-Referer.

Current (`backend/controllers/parent/parentAIController.js:115,162,185`):
```js
'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production-2d8a.up.railway.app',
```

An env-var path (`FRONTEND_URL`) was added as the primary value. The fallback URL is still present. This is a partial improvement — if `FRONTEND_URL` is correctly set in Railway, the hardcoded fallback is never used. However the fallback URL itself is still inconsistent with `env.example` and `PROJECT_GUIDE.md`.

---

### 01-006 & 01-007 — Government app `superAdmin` i18n namespace (not-fixed)

All six government tab components still call `t('superAdmin.*')`:

`government/src/components/tabs/MessagesTab.jsx:16-45` (sample):
```jsx
{t('superAdmin.messagesTitle', { defaultValue: 'Xabarlar' })}
{t('superAdmin.messagesSubtitle', { defaultValue: '...' })}
{t('superAdmin.messagesEmpty', { defaultValue: "Xabarlar yo'q" })}
```

`government/src/locales/en/common.json:121`:
```json
"superAdmin": {
  "createTitle": "Create New Admin",
  ...
}
```

All three locale files (en/ru/uz) retain the `"superAdmin"` top-level namespace key. No change since original audit.

---

### 01-008 — `contactSuperAdmin` / `superAdminReply` i18n keys (not-fixed)

`reception/src/pages/Profile.jsx:317`:
```jsx
<p className="...">
  {t('profile.superAdminReply', { defaultValue: 'Davlat javobi' })}
</p>
```

`teacher/src/pages/Settings.jsx:512`:
```jsx
<h2 ...>{t('settings.contactSuperAdmin', { defaultValue: "Davlat bilan bog'lanish" })}</h2>
```

`admin/src/locales/uz/common.json`:
```json
"contactSuperAdmin": "Contact Government",
```

Same pattern across admin, reception, teacher locales. No change.

---

### 01-009 & 01-010 — Telegram and email "super-admin" text (not-fixed)

`backend/utils/telegram.js:145`:
```
Sizning admin ro'yxatdan o'tish so'rovingiz super-admin tomonidan tasdiqlandi.
```
(Translation: "Your admin registration request has been approved by super-admin.")

`backend/utils/email.js:94`:
```
Havola muddati o'tib ketsa, super-admin bilan bog'laning.
```
(Translation: "If the link expires, contact super-admin.")

Both user-facing messages in Uzbek still use the defunct "super-admin" terminology.

---

### 01-011 — `SUPER_ADMIN_SECRET_KEY` in env.example (not-fixed)

`backend/env.example:30`:
```
SUPER_ADMIN_SECRET_KEY=your-super-admin-secret-key-change-this-in-production
```

No code reads this variable (the `superAdminRoutes.js` that consumed it was deleted). Dead env var documentation still present.

---

### 01-012 — `updateGovernmentBySuper` / `deleteGovernmentBySuper` function names (not-fixed)

`backend/controllers/admin/adminUserController.js:285,332`:
```js
export const updateGovernmentBySuper = async (req, res) => { ... }
export const deleteGovernmentBySuper = async (req, res) => { ... }
```

These functions still exist at their original names. Additionally, new functions `updateAdminBySuper` (line 30) and `deleteAdminBySuper` (line 70) were added — these still carry the misleading "BySuper" suffix. The original problematic names are untouched.

---

### 01-017 — `'Uchqun School'` hardcoded default (not-fixed, moved)

The original receptionController.js was split. The hardcoded default migrated to the new file:

`backend/controllers/receptionParentController.js:35`:
```js
school: req.body['child[school]'] || req.body.child?.school || 'Uchqun School',
```

The issue is not fixed — it moved to a new file as part of the L-04 controller split. Real children will receive `school = "Uchqun School"` in the DB if the field is omitted.

---

### 01-018 — `isTeacher` predicate includes admin role (verified-fixed)

`shared/context/AuthContext.jsx:62`:
```js
isTeacher: user?.role === 'teacher',
```

The admin role was removed from this predicate. **Fixed via tracker H-18** (commit 4747b9b). The original symptom — admin users gaining teacher-route access — is no longer structurally possible.

---

## Special Verification Target §6.7 — Super-Admin Ghost Sweep

Per the original audit, 50+ references existed at baseline. Current count at HEAD: **approximately 162 references** across non-audit directories.

### Growth explanation:
The Phase 7 controller splits created new files that were populated by copying from files that already had ghost references. Specifically:
- `receptionParentController.js` imports `SuperAdminMessage` (inherited from `receptionController.js` where it was used in `getMyMessages` — though that function was kept in the core controller, the import was carried over during the split)
- `teacherController.js` still imports `SuperAdminMessage`

Wait — `receptionParentController.js` does NOT import `SuperAdminMessage` (it handles parent/child CRUD only). The count growth is from the government frontend tabs being counted individually: 6 tab files × ~30 references each = 180 in the government frontend alone.

### Sweep results by category:

| Category | Approx. Matches | Notes |
|----------|----------------|-------|
| Government frontend tabs (6 files) | ~180 key calls | `t('superAdmin.*')` — unchanged |
| Government locale files (3) | ~150 keys each | Full `superAdmin` namespace |
| Backend controller `superAdminController.js` | ~15 | File exists, unchanged |
| Backend model `SuperAdminMessage.js` | ~5 | Class name, tableName |
| Route files (5) | 5 | `/message-to-super-admin` aliases |
| `models/index.js` | 4 | Import + associations |
| Admin/teacher/reception locale files | ~6 | `contactSuperAdmin`, `superAdminReply` keys |
| Backend utils (telegram + email) | 2 | User-facing Uzbek text |
| `env.example` | 1 | Dead env var |
| Tests | 3 | `superAdmin.test.js`, `utils.test.js`, `auth.test.js` |
| Admin/teacher/reception page components | ~8 | `t('*.superAdminReply')` calls |
| `adminUserController.js` | 2 | Function names |

**Files entirely named after the ghost:** `superAdminController.js`, `SuperAdminMessage.js`, `superAdminValidator.js`, `backend/__tests__/superAdmin.test.js`

**The ghost was confirmed to be operating in:**
- Production route aliases: `POST /api/*/message-to-super-admin` (5 routes in 5 role-route files)
- User-visible Uzbek text (Telegram, email)
- Test file asserting a non-existent role ENUM value

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Messiness | 38% | 38% | 0 | (1) 162 super-admin refs vs 50+ — *more* drift at HEAD; (2) four email domains unchanged; (3) three Railway URL variants unchanged |
| Technical Debt | 42% | 43% | +1 | (1) 01-018 isTeacher predicate cleaned up removes one naming confusion; (2) i18n key renaming debt unchanged |
| Health | 65% | 65% | 0 | (1) Role strings in DB/auth still correct; (2) Help page now shows real email (01-003 fixed) |
| Coherence | 40% | 41% | +1 | (1) Help.jsx now consistent domain; (2) government superAdmin namespace unchanged |
| Documentation Coverage | 55% | 55% | 0 | (1) CLAUDE.md current; (2) AUDIT_REPORT.md still stale; (3) PROJECT_GUIDE.md Railway URL still wrong |
| Test Coverage (naming) | 35% | 35% | 0 | (1) `utils.test.js` still tests dead role string; (2) no new naming-related tests added |
| Risk-on-Touch | 45% | 44% | −1 | (1) Controller splits moved 01-017 into receptionParentController without fix — new file added that perpetuates the issue; (2) blast radius for rename unchanged |

**Phase 1 v2 Average: 46% → 48%** (rounding up from fractional improvements)

The score moved by 2 points on the strength of two isolated fixes. Neither addresses the underlying systemic naming debt (super-admin ghost, domain fragmentation, i18n key naming).

---

## Open Questions (Unchanged from v1)

All seven open questions from the original Phase 1 audit remain open. No new information was provided to answer them:

1. Canonical domain still undocumented
2. `support@uchqunplatform.com` confirmed gone but `uchqun.uz` as canonical not yet documented
3. `SUPER_ADMIN_SECRET_KEY` still in env.example
4. `super_admin_messages` table rename not done
5. `isTeacher` including admin — RESOLVED in code (01-018 fixed)
6. Railway URL canonical form still unconfirmed
7. AUDIT_REPORT.md not archived

---

## What I Did NOT Look At

- Full content of every locale file (sampled specific lines per-issue)
- Mobile or desktop browser rendering of the government UI
- Git history for when ghost references were introduced vs. left behind
- All 40 migration files for naming patterns beyond those sampled
- Reception app's absence of i18n (flagged in Phase 0; not a Phase 1 issue)
