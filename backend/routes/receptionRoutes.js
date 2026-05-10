import express from 'express';
import { authenticate, requireReception } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { uploadDocument, getMyDocuments, getVerificationStatus, getMyMessages } from '../controllers/receptionController.js';
import { createTeacher, getTeachers, getTeacherRatings, updateTeacher, deleteTeacher } from '../controllers/receptionTeacherController.js';
import { createParent, getParents, updateParent, deleteParent, createChildForParent, updateChildForReception, deleteChildForReception } from '../controllers/receptionParentController.js';
import { getGroups } from '../controllers/groupController.js';
import { sendMessage } from '../controllers/governmentMessageController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { createStaffValidator, createParentValidator } from '../validators/receptionValidator.js';
import { messageToGovValidator } from '../validators/messageValidator.js';

const router = express.Router();

/**
 * Reception Routes
 * 
 * Business Logic:
 * - Reception provides login credentials (email & password) to Teachers and Parents
 * - Reception cannot access Activity, Meals, Media, News, or Children modules
 * - Reception must upload required documents after installation
 * - Documents are visible to Admin for review
 */

// All routes require Reception authentication
router.use(authenticate);
router.use(requireReception);

// Document management (for Reception's own documents)
router.post('/documents', upload.single('file'), uploadDocument);
router.get('/documents', getMyDocuments);
router.get('/verification-status', getVerificationStatus);

// Teacher management
router.post('/teachers', createStaffValidator, handleValidationErrors, createTeacher);
router.get('/teachers', getTeachers);
router.get('/teachers/:id/ratings', getTeacherRatings);
router.put('/teachers/:id', updateTeacher);
router.delete('/teachers/:id', deleteTeacher);

// Parent management (with file upload support for child photo)
// Validators run after multer so req.body is populated from multipart form
router.post('/parents', upload.fields([{ name: 'child[photo]', maxCount: 1 }]), createParentValidator, handleValidationErrors, createParent);
router.get('/parents', getParents);
router.put('/parents/:id', updateParent);
router.delete('/parents/:id', deleteParent);
// Add child to existing parent (separate endpoint to avoid route conflicts)
router.post('/children', upload.fields([{ name: 'child[photo]', maxCount: 1 }]), createChildForParent);
router.put('/children/:id', upload.fields([{ name: 'child[photo]', maxCount: 1 }]), updateChildForReception);
router.delete('/children/:id', deleteChildForReception);

// Groups (for parent assignment)
router.get('/groups', getGroups);

// Send message to government
router.post('/message-to-government', messageToGovValidator, handleValidationErrors, sendMessage);
// Get my messages to government (with replies)
router.get('/messages', getMyMessages);

export default router;


