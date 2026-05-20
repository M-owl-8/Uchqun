import express from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
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
  getMyMessages,
  getDocuments,
} from '../controllers/adminController.js';
import { listByChild as listObservationsByChild } from '../controllers/observationController.js';
import { validate as validateImport, start as startImport, getStatus as getImportStatus, getErrors as getImportErrors } from '../controllers/admin/adminImportController.js';
import { uploadImportCsv, handleImportUploadError } from '../middleware/uploadImportCsv.js';
import { getGroups, getGroup } from '../controllers/groupController.js';
import { sendMessage } from '../controllers/governmentMessageController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { createReceptionValidator, rejectDocumentValidator, adminIdParamValidator } from '../validators/adminValidator.js';
import { messageToGovValidator } from '../validators/messageValidator.js';

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

// Send message to government (top-level platform owner)
router.post('/message-to-government', messageToGovValidator, handleValidationErrors, sendMessage);
// Get my messages to government (with replies)
router.get('/messages', getMyMessages);

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

// Children observations (admin read)
router.get('/children/:id/observations', listObservationsByChild);

// Bulk import
router.post('/import/children/validate', uploadImportCsv.single('file'), handleImportUploadError, validateImport);
router.post('/import/:id/start', startImport);
router.get('/import/:id/status', getImportStatus);
router.get('/import/:id/errors', getImportErrors);

// Read-only access to Teachers, Parents, and Groups
router.get('/teachers', getTeachers); // View only
router.get('/parents', getParents); // View only
router.get('/parents/:id', getParentById); // View parent with their data
router.get('/groups', getGroups); // View only
router.get('/groups/:id', getGroup); // View only

// Statistics
router.get('/statistics', getStatistics); // Admin can view all statistics

// School ratings
router.get('/school-ratings', getSchoolRatings); // View school ratings from parents created by admin's receptions

export default router;


