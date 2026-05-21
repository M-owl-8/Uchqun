import express from 'express';
import {
  getOverview,
  getSchoolsStats,
  getSchoolById,
  getStudentsStats,
  getRatingsStats,
  getSchoolRatings,
  generateStats,
  getSavedStats,
  getAdmins,
  getAdminDetails,
  getTeachersList,
  getParentsList,
  archiveSchool,
  reactivateSchool,
  changeSchoolCategory,
  getAuditLog,
  getRegions,
} from '../controllers/governmentController.js';
import {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  createGovernment,
  getGovernments,
  updateGovernmentUser,
  deleteGovernmentUser,
  resetGovernmentPassword,
} from '../controllers/adminController.js';
import {
  sendMessage,
  getAllMessages,
  replyToMessage,
  markMessageRead,
  deleteMessage,
} from '../controllers/governmentMessageController.js';
import {
  getRegistrationRequests,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from '../controllers/adminRegistrationController.js';
import {
  createAdminValidator,
  updateAdminValidator,
  deleteAdminValidator,
  updateGovernmentValidator,
} from '../validators/governmentUserValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticate, requireGovernment, requireRole } from '../middleware/auth.js';
import { requireRegionScope, requireGovAccess } from '../middleware/regionScope.js';

const router = express.Router();

// Anyone authenticated may send a message to government — only the
// government user views/replies. Mount before the requireGovernment guard.
router.post('/messages', authenticate, requireRole('parent', 'teacher', 'reception', 'admin', 'business', 'government'), sendMessage);

router.use(authenticate);
router.use(requireGovernment);
router.use(requireRegionScope);

// Statistics
router.get('/overview', getOverview);
router.get('/schools', requireGovAccess('canViewSchools'), getSchoolsStats);
router.get('/schools/:id', requireGovAccess('canViewSchools'), getSchoolById);
router.put('/schools/:id/archive', requireGovAccess('canArchiveSchools'), archiveSchool);
router.put('/schools/:id/reactivate', requireGovAccess('canArchiveSchools'), reactivateSchool);
router.put('/schools/:id/category', changeSchoolCategory);
router.get('/students', requireGovAccess('canViewStudents'), getStudentsStats);
router.get('/teachers', requireGovAccess('canViewTeachers'), getTeachersList);
router.get('/parents', requireGovAccess('canViewParents'), getParentsList);
router.get('/ratings', requireGovAccess('canViewRatings'), getRatingsStats);
router.get('/ratings/:schoolId', requireGovAccess('canViewRatings'), getSchoolRatings);
router.post('/stats/generate', generateStats);  // Available for future stats snapshot feature
router.get('/stats', getSavedStats);             // Available for future stats snapshot feature

// Admin management
router.get('/admins', requireGovAccess('canManageAdmins'), getAdmins);
router.get('/admins/:id', requireGovAccess('canManageAdmins'), getAdminDetails);
router.post('/admins', requireGovAccess('canManageAdmins'), createAdminValidator, handleValidationErrors, createAdmin);
router.put('/admins/:id', requireGovAccess('canManageAdmins'), updateAdminValidator, handleValidationErrors, updateAdmin);
router.delete('/admins/:id', requireGovAccess('canManageAdmins'), deleteAdminValidator, handleValidationErrors, deleteAdmin);

// Government user management (additional government accounts)
router.get('/users', requireGovAccess('canManageGovernmentUsers'), getGovernments);
router.post('/users', requireGovAccess('canManageGovernmentUsers'), createGovernment);
router.put('/users/:id', requireGovAccess('canManageGovernmentUsers'), updateGovernmentValidator, handleValidationErrors, updateGovernmentUser);
router.delete('/users/:id', requireGovAccess('canManageGovernmentUsers'), deleteGovernmentUser);
router.put('/users/:id/reset-password', requireGovAccess('canManageGovernmentUsers'), resetGovernmentPassword);

// User messages
router.get('/messages', requireGovAccess('canViewMessages'), getAllMessages);
router.post('/messages/:id/reply', requireGovAccess('canViewMessages'), replyToMessage);
router.put('/messages/:id/read', requireGovAccess('canViewMessages'), markMessageRead);
router.delete('/messages/:id', requireGovAccess('canViewMessages'), deleteMessage);

// Admin registration requests
router.get('/admin-registrations', requireGovAccess('canManageRegistrations'), getRegistrationRequests);
router.post('/admin-registrations/:id/approve', requireGovAccess('canManageRegistrations'), approveRegistrationRequest);
router.post('/admin-registrations/:id/reject', requireGovAccess('canManageRegistrations'), rejectRegistrationRequest);

// Governance audit log (scoped to governance/school-lifecycle events only)
router.get('/audit-log', requireGovAccess('canViewAuditLog'), getAuditLog);

// Regions list (for provisioning UI dropdowns — no extra capability gate, all gov users need this)
router.get('/regions', getRegions);

export default router;
