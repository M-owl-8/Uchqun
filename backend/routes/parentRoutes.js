import express from 'express';
import { authenticate, requireParent, requireAdminOrReception } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { rateTeacherValidator, rateSchoolValidator, submitEvaluationValidator } from '../validators/parentRatingValidator.js';
import { parentMessageToGovValidator } from '../validators/messageValidator.js';
import { dataExportLimiter } from '../middleware/rateLimiter.js';
import {
  getMyChildren,
  getMyActivities,
  getActivityById,
  getMyMeals,
  getMealById,
  getMyMedia,
  getMediaById,
  getMyProfile,
  getParentData,
  rateSchool,
  getMySchoolRating,
  getSchools,
  rateMyTeacher,
  getMyRating,
} from '../controllers/parentController.js';
import { parentSendMessage, getMyMessages } from '../controllers/parent/parentMessageController.js';
import { getPrivacyConsent, setPrivacyConsent } from '../controllers/parent/parentPrivacyConsentController.js';
import { getMyChildAttendance } from '../controllers/attendanceController.js';
import {
  getMonitoringByChild,
  getMonitoringById,
} from '../controllers/emotionalMonitoringController.js';
import { getChildJournal } from '../controllers/journalController.js';
import {
  submitParentEvaluation,
  getMyEvaluations,
} from '../controllers/parentEvaluationController.js';
import { exportMyData } from '../controllers/parent/parentDataExportController.js';
import {
  getChildIRR as getParentChildIRR,
  getAssessmentProgression,
  getGoals as getIRRGoals,
} from '../controllers/parent/irrParentController.js';

const router = express.Router();

/**
 * Parent Routes
 * 
 * Business Logic:
 * - Parents only see data related to their own account
 * - When viewing the list of parents, clicking on a parent should display:
 *   - Activity
 *   - Meals
 *   - Media
 */

// Parent's own data routes (require Parent authentication)
router.get('/children', authenticate, requireParent, getMyChildren);
// PP-ATTENDANCE-SURFACE — parent read of own child's attendance.
// Scoping is enforced inside the controller via Child.parentId.
router.get('/attendance', authenticate, requireParent, getMyChildAttendance);
router.get('/activities', authenticate, requireParent, getMyActivities);
router.get('/activities/:id', authenticate, requireParent, getActivityById);
router.get('/meals', authenticate, requireParent, getMyMeals);
router.get('/meals/:id', authenticate, requireParent, getMealById);
router.get('/media', authenticate, requireParent, getMyMedia);
router.get('/media/:id', authenticate, requireParent, getMediaById);
router.get('/profile', authenticate, requireParent, getMyProfile);
router.get('/ratings', authenticate, requireParent, getMyRating);
router.post('/ratings', authenticate, requireParent, rateTeacherValidator, handleValidationErrors, rateMyTeacher);
router.get('/school-rating', authenticate, requireParent, getMySchoolRating);
router.post('/school-rating', authenticate, requireParent, rateSchoolValidator, handleValidationErrors, rateSchool);
router.get('/schools', authenticate, requireParent, getSchools);

// Parent monitoring evaluations (daily / weekly / monthly)
router.post('/evaluations', authenticate, requireParent, submitEvaluationValidator, handleValidationErrors, submitParentEvaluation);
router.get('/evaluations', authenticate, requireParent, getMyEvaluations);

// Send message to government (CP-022: parent-only routing with recipientLevel + escalation)
router.post('/message-to-government', authenticate, requireParent, parentMessageToGovValidator, handleValidationErrors, parentSendMessage);
// Get my messages to government (with replies)
router.get('/messages', authenticate, requireParent, getMyMessages);

// Personal data export (rate-limited to 1 per 24h)
router.get('/me/export', authenticate, requireParent, dataExportLimiter, exportMyData);

// G4 — Privacy consent (group-wide media + AI-translated UI). Modal-on-first-login.
router.get('/privacy-consent', authenticate, requireParent, getPrivacyConsent);
router.post('/privacy-consent', authenticate, requireParent, setPrivacyConsent);

// Child journal (parent read — visible entries only)
router.get('/children/:id/journal', authenticate, requireParent, getChildJournal);

// Emotional Monitoring (read-only for parents)
router.get('/emotional-monitoring/child/:childId', authenticate, requireParent, getMonitoringByChild);
router.get('/emotional-monitoring/:id', authenticate, requireParent, getMonitoringById);

// ИРР read-only (VIEW-ONLY — no parent write path, aggregate score only per OQ-4)
router.get('/children/:childId/irr', authenticate, requireParent, getParentChildIRR);
router.get('/children/:childId/irr/assessment', authenticate, requireParent, getAssessmentProgression);
router.get('/children/:childId/irr/goals', authenticate, requireParent, getIRRGoals);

// View parent data (accessible by Admin or Reception when clicking on parent in list)
// This route must come after all specific routes to avoid conflicts
router.get('/:parentId/data', authenticate, requireAdminOrReception, getParentData);

export default router;


