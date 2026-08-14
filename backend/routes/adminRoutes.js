import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { requireSchoolScope } from '../middleware/schoolScope.js';
import {
  getReceptions,
  getReceptionById,
  createReception,
  updateReception,
  deleteReception,
  getPendingDocuments,
  getReceptionDocuments,
  approveDocument,
  rejectDocument,
  activateReception,
  deactivateReception,
  getTeachers,
  getParents,
  getParentById,
  getStatistics,
  getSchoolRatings,
  getAdminSchoolRatingSummary,
  getMyMessages,
  getDocuments,
  suspendParent,
  activateParent,
} from '../controllers/adminController.js';
import { listByChildAsAdmin } from '../controllers/admin/adminGoalController.js';
import { restoreChild, restoreUser, restoreAttendance } from '../controllers/admin/adminRestoreController.js';
import { getAdminAuditLog } from '../controllers/admin/adminAuditController.js';
import { getAdminSchool, patchAdminSchool } from '../controllers/admin/adminSchoolController.js';
import { getTeacherById } from '../controllers/admin/adminTeacherController.js';
import { transferChild, getChildForAdmin } from '../controllers/childController.js';
import { validate as validateImport, start as startImport, getStatus as getImportStatus, getErrors as getImportErrors } from '../controllers/admin/adminImportController.js';
import { uploadImportCsv, handleImportUploadError } from '../middleware/uploadImportCsv.js';
import { getGroups, getGroup } from '../controllers/groupController.js';
import { sendMessage } from '../controllers/governmentMessageController.js';
import { getOwnerMessages } from '../controllers/admin/adminMessageController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { createReceptionValidator, rejectDocumentValidator, adminIdParamValidator } from '../validators/adminValidator.js';
import { messageToGovValidator } from '../validators/messageValidator.js';
import { createQuarterlyEntry, listQuarterlyEntries, signGoalPeriod as irrSignGoalPeriod } from '../controllers/teacher/irrController.js';
// CROSS-IRR-VISIBILITY (Q4) — admin read-only IRR endpoints mounted under
// /admin/* so the route boundary is explicit per role. Same controller
// pattern as parent/government; separate file to keep scope audits clean.
import {
  getChildIRR as adminGetChildIRR,
  getAssessmentProgression as adminGetAssessmentProgression,
  getGoals as adminGetGoals,
} from '../controllers/admin/adminIrrController.js';

const router = express.Router();

/**
 * Admin Routes
 * 
 * Business Logic:
 * - Admin controls verification of Reception accounts before they can log in
 * - Admin can CREATE Reception accounts
 * - Admin views uploaded documents from Reception
 * - Admin approves/rejects documents
 * - Admin can only VIEW (read-only) Teachers, Parents, and Groups
 * - Only after Admin approval, Reception receives login credentials and can log in
 */

// All routes require Admin authentication
router.use(authenticate);
router.use(requireAdmin);
router.use(requireSchoolScope);

// Send message to government (top-level platform owner)
router.post('/message-to-government', messageToGovValidator, handleValidationErrors, sendMessage);
// Get my messages to government (with replies)
router.get('/messages', getMyMessages);
// CP-022: admin owner inbox — owner-level messages from parents at this school
router.get('/owner-messages', getOwnerMessages);

// Reception management (Admin can CREATE, EDIT, DELETE and MANAGE)
router.post('/receptions', createReceptionValidator, handleValidationErrors, createReception); // Admin can create Reception
router.get('/receptions', getReceptions);
router.get('/receptions/:id', getReceptionById);
router.put('/receptions/:id', updateReception); // Admin can edit Reception
router.delete('/receptions/:id', deleteReception); // Admin can delete Reception
router.put('/receptions/:id/activate', activateReception);
router.put('/receptions/:id/deactivate', deactivateReception);

// Document management
router.get('/documents', getDocuments);
router.get('/documents/pending', getPendingDocuments);
router.get('/receptions/:id/documents', getReceptionDocuments);
router.put('/documents/:id/approve', adminIdParamValidator, handleValidationErrors, approveDocument);
router.put('/documents/:id/reject', rejectDocumentValidator, handleValidationErrors, rejectDocument);

// Children goals (admin read)
router.get('/children/:id/goals', listByChildAsAdmin);
// D-41: the admin child page had no endpoint to fetch from, so a refresh showed a raw UUID
router.get('/children/:id', getChildForAdmin);
router.put('/children/:id/transfer', transferChild);

// Restore endpoints (soft-delete recovery)
router.put('/children/:id/restore', restoreChild);
router.put('/users/:id/restore', restoreUser);
router.put('/attendance/:id/restore', restoreAttendance);

// Bulk import
router.post('/import/children/validate', uploadImportCsv.single('file'), handleImportUploadError, validateImport);
router.post('/import/:id/start', startImport);
router.get('/import/:id/status', getImportStatus);
router.get('/import/:id/errors', getImportErrors);

// Read-only access to Teachers, Parents, and Groups
router.get('/teachers', getTeachers); // View only
router.get('/teachers/:id', getTeacherById); // View teacher detail + groups
router.get('/parents', getParents); // View only
router.get('/parents/:id', getParentById); // View parent with their data
router.put('/parents/:id/suspend', suspendParent);
router.put('/parents/:id/activate', activateParent);
router.get('/groups', getGroups); // View only
router.get('/groups/:id', getGroup); // View only

// Audit log (admin-scoped)
router.get('/audit-log', getAdminAuditLog);

// School profile (read + whitelisted edit)
router.get('/school', getAdminSchool);
router.patch('/school', patchAdminSchool);

// Statistics
router.get('/statistics', getStatistics); // Admin can view all statistics

// School ratings
router.get('/school-ratings', getSchoolRatings); // View school ratings from parents created by admin's receptions
router.get('/school-rating-summary', getAdminSchoolRatingSummary); // Three-rating summary (parent + gov + cumulative)

// Quarterly monitoring (ИРР — manager/admin only, facility-scoped, no childId, OQ-3)
router.post('/irr/quarterly-entries', createQuarterlyEntry);
router.get('/irr/quarterly-entries', listQuarterlyEntries);

// CROSS-IRR-VISIBILITY — admin read-only IRR (school-scoped)
router.get('/children/:childId/irr', adminGetChildIRR);
router.get('/children/:childId/irr/assessment', adminGetAssessmentProgression);
router.get('/children/:childId/irr/goals', adminGetGoals);

// CROSS-IRR-VISIBILITY (Q1) — admin counter-signs a goal period as Direktor.
// signGoalPeriod's existing controller already handles the admin role:
//   - school-scope via resolvePeriodAccess
//   - sets managerSignedAt/By (the "manager" DB column = Director's signature)
// We mount under /admin/ so the route boundary is explicit.
router.post('/goal-periods/:id/sign', irrSignGoalPeriod);

export default router;


