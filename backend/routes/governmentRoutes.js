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
} from '../controllers/governmentController.js';
import {
  createAdmin,
  updateAdmin,
  deleteAdmin,
  createGovernment,
  getGovernments,
  updateGovernmentUser,
  deleteGovernmentUser,
  getAllSchools,
} from '../controllers/adminController.js';
import {
  sendMessage,
  getAllMessages,
  getMessageById,
  replyToMessage,
  markMessageRead,
  deleteMessage,
} from '../controllers/governmentMessageController.js';
import {
  getRegistrationRequests,
  getRegistrationRequestById,
  approveRegistrationRequest,
  rejectRegistrationRequest,
} from '../controllers/adminRegistrationController.js';
import {
  createAdminValidator,
  updateAdminValidator,
  deleteAdminValidator,
  createGovernmentValidator,
  updateGovernmentValidator,
  deleteGovernmentValidator,
} from '../validators/governmentUserValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { authenticate, requireGovernment, requireRole } from '../middleware/auth.js';

const router = express.Router();

// Anyone authenticated may send a message to government — only the
// government user views/replies. Mount before the requireGovernment guard.
router.post('/messages', authenticate, requireRole('parent', 'teacher', 'reception', 'admin', 'business', 'government'), sendMessage);

router.use(authenticate);
router.use(requireGovernment);

// Statistics
router.get('/overview', getOverview);
router.get('/schools', getSchoolsStats);
router.get('/schools/:id', getSchoolById);
router.get('/schools-list', getAllSchools);
router.get('/students', getStudentsStats);
router.get('/teachers', getTeachersList);
router.get('/parents', getParentsList);
router.get('/ratings', getRatingsStats);
router.get('/ratings/:schoolId', getSchoolRatings);
router.post('/stats/generate', generateStats);
router.get('/stats', getSavedStats);

// Admin management
router.get('/admins', getAdmins);
router.get('/admins/:id', getAdminDetails);
router.post('/admins', createAdminValidator, handleValidationErrors, createAdmin);
router.put('/admins/:id', updateAdminValidator, handleValidationErrors, updateAdmin);
router.delete('/admins/:id', deleteAdminValidator, handleValidationErrors, deleteAdmin);

// Government user management (additional government accounts)
router.get('/users', getGovernments);
router.post('/users', createGovernmentValidator, handleValidationErrors, createGovernment);
router.put('/users/:id', updateGovernmentValidator, handleValidationErrors, updateGovernmentUser);
router.delete('/users/:id', deleteGovernmentValidator, handleValidationErrors, deleteGovernmentUser);

// User messages
router.get("/messages", getAllMessages);
router.get('/messages/:id', getMessageById);
router.post('/messages/:id/reply', replyToMessage);
router.put('/messages/:id/read', markMessageRead);
router.delete('/messages/:id', deleteMessage);

// Admin registration requests
router.get('/admin-registrations', getRegistrationRequests);
router.get('/admin-registrations/:id', getRegistrationRequestById);
router.post('/admin-registrations/:id/approve', approveRegistrationRequest);
router.post('/admin-registrations/:id/reject', rejectRegistrationRequest);

export default router;
