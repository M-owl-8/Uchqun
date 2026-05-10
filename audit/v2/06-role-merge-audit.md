# Phase 6 v2 — Role Merge Audit Verification
**Date:** 2026-05-09  
**Baseline:** `/audit/06-role-merge-audit.md` (2026-05-07)  
**Mode:** Read-only verification. No project files modified.

---

## Executive Summary

**Zero issues resolved.** All 7 findings from the original role-merge audit are not-fixed. None of the remediation tracker items (H-01–H-20, M-01–M-22, L-01–L-13, C-01–C-13) addressed any Phase 6 issue. The super-admin ghost cleanup was never assigned a tracker ID — it was treated as out-of-scope throughout the remediation cycle.

The functional migration remains intact: no code path gates access on `user.role === 'super_admin'`, the DB ENUM is clean, and the middleware factory `requireGovernment` is correct. The unresolved issues are all naming debt and stale artifacts, not security regressions — but the Phase 1 re-audit confirmed the ghost grew from ~50 to ~162 references at HEAD due to controller splits copying ghost references into new files.

**Phase 6 v2 score: 46/100** (unchanged from 46/100).

---

## Scope

Verification of all 7 issues from `/audit/06-role-merge-audit.md`. All evidence from current code at HEAD.

---

## Per-Issue Verification Table

| Issue ID | Original Severity | Verdict | Evidence (file:line at HEAD) | Notes |
|----------|------------------|---------|------------------------------|-------|
| 06-001 | HIGH | **not-fixed** | `backend/utils/email.js:94`; `telegram.js:145,213` | "super-admin bilan bog'laning" (email); "super-admin tomonidan tasdiqlandi" (Telegram); additional ghost in telegram.js:213 comment |
| 06-002 | MEDIUM | **not-fixed** | `adminRoutes.js:49`; `teacherRoutes.js:70`; `receptionRoutes.js:58`; `parentRoutes.js:73`; `userRoutes.js:21` | All 5 `/message-to-super-admin` alias routes still present |
| 06-003 | MEDIUM | **not-fixed** | `superAdminController.js`; `superAdminValidator.js`; `SuperAdminMessage.js`; `adminUserController.js:30,70,285,332` | All 3 files and all 4 `BySuper` function names unchanged |
| 06-004 | MEDIUM | **not-fixed** | `AdminsTab.jsx`: 29 calls; `MessagesTab.jsx`: 12 calls; `Platform.jsx`: 25 calls | All `t('superAdmin.*')` calls unchanged; total 66 in government frontend alone |
| 06-005 | MEDIUM | **not-fixed** | `backend/middleware/auth.js:65` | `requireTeacher` still a bespoke function; still allows `teacher`, `reception`, `admin`; not converted to factory pattern |
| 06-006 | LOW | **not-fixed** | `admin/src/__tests__/utils.test.js:34,113` | `'super-admin': 'Super Admin'` map entry; `expect(getRoleLabel('super-admin')).toBe('Super Admin')` — tests dead value |
| 06-007 | LOW | **not-fixed** | `backend/models/User.js:95` | `// School assignment — every user belongs to a school (except superadmin)` unchanged |

**Verdict distribution: 0 verified-fixed · 0 partially-fixed · 7 not-fixed**

---

## Evidence Details

### 06-001 — User-facing "super-admin" text

`backend/utils/email.js:94` (current):
```
Havola muddati o'tib ketsa, super-admin bilan bog'laning.
```
(Translation: "If the link expires, contact super-admin.")

`backend/utils/telegram.js:145` (current):
```
Sizning admin ro'yxatdan o'tish so'rovingiz super-admin tomonidan tasdiqlandi.
```
(Translation: "Your admin registration request has been approved by super-admin.")

`backend/utils/telegram.js:213` (current — a comment, not user-facing, but additional ghost):
```js
credentials: { email, password }, // Return credentials so super-admin can see them
```

Both outbound channels still tell real users that "super-admin" is the approving entity. This is the highest-impact issue: it reaches external parties (new admin users via email and Telegram).

---

### 06-002 — Dead route aliases

All five `/message-to-super-admin` aliases are confirmed present:

| Route file | Line | Dead alias |
|-----------|------|-----------|
| `adminRoutes.js` | 49 | `POST /admin/message-to-super-admin` |
| `teacherRoutes.js` | 70 | `POST /teacher/message-to-super-admin` |
| `receptionRoutes.js` | 58 | `POST /reception/message-to-super-admin` |
| `parentRoutes.js` | 73 | `POST /parent/message-to-super-admin` |
| `userRoutes.js` | 21 | `POST /user/message-to-super-admin` |

No frontend calls these (confirmed in Phase 1 — all frontends call `-government` paths). These five routes expose dead API surface and are a maintenance trap.

---

### 06-003 — File and function naming debt

Files still named after the ghost:
- `backend/controllers/superAdminController.js` (263 lines)
- `backend/validators/superAdminValidator.js`
- `backend/models/SuperAdminMessage.js`

Functions in `adminUserController.js` still using `BySuper` suffix:
- Line 30: `export const updateAdminBySuper`
- Line 70: `export const deleteAdminBySuper`
- Line 285: `export const updateGovernmentBySuper`
- Line 332: `export const deleteGovernmentBySuper`

The test file `backend/__tests__/superAdmin.test.js` imports from `superAdminController.js` and labels its suite `'superAdminController'` — a co-located artifact that will require renaming when (if) the controller is renamed.

---

### 06-004 — Frontend i18n namespace count

`t('superAdmin.*')` call counts at HEAD:
- `government/src/components/tabs/AdminsTab.jsx`: **29 calls**
- `government/src/pages/Platform.jsx`: **25 calls**
- `government/src/components/tabs/MessagesTab.jsx`: **12 calls**
- **Total: 66 calls** in the government frontend to the `superAdmin` namespace

The locale files (en/ru/uz) all retain the top-level `"superAdmin"` key with 20+ entries each. "Super Admin" appears as the English label for the government admin management panel.

---

### 06-005 — `requireTeacher` bespoke guard

`backend/middleware/auth.js:65` (current):
```js
export const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (['teacher', 'reception', 'admin'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions' });
};
```

Unchanged. Every other guard is `requireRole('x')` from the factory. `requireTeacher` is hand-rolled, allows 3 roles, and is applied blanket to all teacher routes. The behavior is intentional (admins can view teacher routes) but still undocumented.

---

## Metrics Scorecard

| Metric | Original v1 Score | v2 Score | Delta | Drivers |
|--------|------------------|----------|-------|---------|
| Migration Completeness | 58% | 58% | 0 | No naming cleanup performed |
| User-Facing Accuracy | 45% | 45% | 0 | Email and Telegram templates unchanged |
| Code Coherence | 52% | 52% | 0 | `BySuper` names and `requireTeacher` unchanged |
| Dead-Code Cleanup | 40% | 40% | 0 | 5 alias routes, dead test, stale comment all unchanged |
| Documentation Accuracy | 35% | 35% | 0 | User.js comment and telegram.js comment unchanged |
| **Overall** | **46%** | **46%** | **0** | |

---

## Open Questions (unchanged from v1)

All five open questions from the original Phase 6 audit remain open:

1. **Canonical rename:** Is `governmentMessageController.js` the right target name, or will the messaging concept be refactored before launch?
2. **Table rename (`super_admin_messages`):** Requires a new migration; no migration filed.
3. **i18n namespace sweep:** `superAdmin.*` in 3 government files + locale files — a pure string rename once decided.
4. **Dead alias routes:** Removing them requires confirming no external integrations call them. No audit of external callers was done.
5. **`requireTeacher` documentation:** The 3-role behavior should be in CLAUDE.md or an inline comment.

---

## Context: Ghost Growth Since Original Audit

Phase 1 v2 enumerated the ghost at ~162 references vs the original ~50+. The growth mechanism: Phase 7 controller splits (receptionController → 3 files, teacherController → 3 files, parentRatingController → 2 files) each propagated ghost imports and references into the new files without cleanup. The functional system is correct; the naming surface area expanded.
