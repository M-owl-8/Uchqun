# Backend Batch 10: IDOR Completeness Sweep

**Generated:** 2026-05-19  
**Purpose:** Enumerate every `findByPk`-then-mutate site across all backend controllers. Classify each as SAFE, FIXED, or FINDING.  
**Scope:** All files in `backend/controllers/` and `backend/controllers/admin/`  

---

## Classification Legend

| Status | Meaning |
|---|---|
| ✅ FIXED | Identified in S1/S4 and fixed in S3 |
| 🔴 FINDING | No scope check after `findByPk`; finding assigned |
| ✅ SAFE | Route guard, `req.user.id` self-service, or intentional platform-wide role |
| ⏸ DEFERRED | Partial scope check; tracked separately |

---

## Results by Controller

### `mealController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `getMeals` (admin path) | 53 | `requireRole('teacher','admin')` | None (admin sees all) — scoping added | ✅ FIXED | BACKEND-005 |
| `updateMeal` | 261 | `requireRole('teacher','admin')` | **None** — `Child.findByPk(:268)` is notification-only | 🔴 FINDING | BACKEND-043 |
| `deleteMeal` | 305 | `requireRole('teacher','admin')` | **None** | 🔴 FINDING | BACKEND-043 |

### `mealPlanController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `createMealPlan` | ~90 | `requireRole('teacher','admin')` | `validateChildAccess(childId, req)` ✅ | ✅ SAFE | — |
| `updateMealPlan` | 156 | `requireRole('teacher','admin')` | **None** | 🔴 FINDING | BACKEND-041 |
| `deleteMealPlan` | 189 | `requireRole('teacher','admin')` | **None** | 🔴 FINDING | BACKEND-041 |

### `mediaController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `updateMedia` | ~880 | `requireRole(...)` | `validateChildAccess` added in S3 | ✅ FIXED | BACKEND-003 |
| `deleteMedia` | 912 | `requireRole(...)` | `validateChildAccess` added in S3 | ✅ FIXED | BACKEND-003 |
| `proxyMediaFile` | 690 | `authenticate` | `validateChildAccess` added in S3 | ✅ FIXED | BACKEND-004 |

### `activityController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `createActivity` | — | `requireTeacher` | `validateChildAccess` added in S3 | ✅ FIXED | BACKEND-035 |
| `updateActivity` | — | `requireTeacher` | `ALLOWED_ACTIVITY_FIELDS` + `schoolId` guard | ✅ FIXED | BACKEND-C05 |

### `therapyController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `startTherapy` | 259 | `requireRole('admin','teacher','reception','government')` | Per-role child access check at :268+ | ✅ SAFE | — |
| `deleteTherapy` | 474 | `requireRole('admin','teacher')` | `validateChildAccess` exists; fixed to call `destroy()` | ✅ SAFE | BACKEND-013 fixed |
| `getTherapyUsage` (admin) | 490 | `requireTeacher` | School scope fix applied in S3 | ✅ FIXED | BACKEND-025 |

### `admin/adminReceptionController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `approveDocument` | 140 | `requireAdmin` | `createdBy` added to attributes in S3 | ✅ FIXED | BACKEND-001 |
| `updateReception` | 419 | `requireAdmin` | `createdBy: req.user.id` added in S3 | ✅ FIXED | BACKEND-002 |

### `childAssessmentController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `updateAssessment` | 202 | `requireTeacher` | Admin bypass: `req.user.role !== 'admin'` skips ownership + school check | 🔴 FINDING | BACKEND-040 |

### `emotionalMonitoringController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `createEmotionalMonitoring` | 89 | `requireTeacher` | Admin/gov bypass skips `validateChildAccess` | 🔴 FINDING | BACKEND-040 |
| `updateEmotionalMonitoring` | 389 | `requireTeacher` | Same bypass | 🔴 FINDING | BACKEND-040 |

### `teacherResourceController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `deleteTeacherResource` | 125 | `requireTeacher` | Admin bypass skips ownership check | 🔴 FINDING | BACKEND-040 |

### `aiWarningController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `resolveWarning` | 248 | `requireRole('admin','government')` | **None** — gov is intentional platform-wide; admin unchecked | 🔴 FINDING | BACKEND-044 |
| `notifyUsers` | 279 | `requireRole('admin','government')` | **None** — same pattern | 🔴 FINDING | BACKEND-044 |

### `governmentMessageController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `updateMessage` | 148 | `requireGovernment` | Government role = intentional platform-wide access | ✅ SAFE | — |
| `deleteMessage` | 196 | `requireGovernment` | Government role = intentional platform-wide access | ✅ SAFE | — |
| Other mutations | 244, 277 | `requireGovernment` | Government role = intentional platform-wide access | ✅ SAFE | — |

### `userController.js`

| Function | Line | Route Guard | Scope Check | Status | Finding |
|---|---|---|---|---|---|
| `changePassword` | 109 | `authenticate` | `req.user.id` — self-service only | ✅ SAFE | — |

---

## Controllers Not Fully Audited in This Sweep

The following controllers were not read during this pass. Verify before Batch 11 execution:

| Controller | Reason Not Read | Risk |
|---|---|---|
| `parentEvaluationController.js` | Mutations not read in S1 or sweep | Medium — parent-scoped, check childId ownership |
| `teacherTaskController.js` | `updateTaskStatus` only touched for coverage | Low — task ownership likely via `createdBy` |
| `servicePlanController.js` | Not in S1 audit scope | Medium — child-scoped resource |
| `admin/adminStatsController.js` | No `findByPk` mutations (raw SQL only) | N/A — BACKEND-007b separate issue |

---

## Summary

| Status | Site Count | Notes |
|---|---|---|
| ✅ FIXED | 10 sites | BACKEND-001,002,003(×2),004,005,013,025,035,C05 |
| ✅ SAFE | 9 sites | government (×3), therapyController, userController |
| 🔴 FINDING | 9 sites | BACKEND-040(×3), BACKEND-041(×2), BACKEND-043(×2), BACKEND-044(×2) |
| Not audited | 4 controllers | Verify before Batch 11 |

**New findings from this sweep:** BACKEND-043 (High), BACKEND-044 (Medium)
