import express from 'express';
import { authenticate, requireParent, requireAdminOrReception } from '../middleware/auth.js';
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
  getAIAdvice,
  rateSchool,
  getMySchoolRating,
  getSchools,
  getMyMessages,
  rateMyTeacher,
  getMyRating,
} from '../controllers/parentController.js';
import { sendMessage } from '../controllers/superAdminController.js';
import {
  getMonitoringByChild,
  getMonitoringById,
} from '../controllers/emotionalMonitoringController.js';
import {
  submitParentEvaluation,
  getMyEvaluations,
} from '../controllers/parentEvaluationController.js';

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
// AI chat route must come before other routes to avoid conflicts
router.post('/ai/chat', authenticate, requireParent, getAIAdvice);

router.get('/children', authenticate, requireParent, getMyChildren);
router.get('/activities', authenticate, requireParent, getMyActivities);
router.get('/activities/:id', authenticate, requireParent, getActivityById);
router.get('/meals', authenticate, requireParent, getMyMeals);
router.get('/meals/:id', authenticate, requireParent, getMealById);
router.get('/media', authenticate, requireParent, getMyMedia);
router.get('/media/:id', authenticate, requireParent, getMediaById);
router.get('/profile', authenticate, requireParent, getMyProfile);
router.get('/ratings', authenticate, requireParent, getMyRating);
router.post('/ratings', authenticate, requireParent, rateMyTeacher);
router.get('/school-rating', authenticate, requireParent, getMySchoolRating);
router.post('/school-rating', authenticate, requireParent, rateSchool);
router.get('/schools', authenticate, requireParent, getSchools);

// Parent monitoring evaluations (daily / weekly / monthly)
router.post('/evaluations', authenticate, requireParent, submitParentEvaluation);
router.get('/evaluations', authenticate, requireParent, getMyEvaluations);

// Send message to government
router.post('/message-to-government', authenticate, requireParent, sendMessage);
// Backward-compatible alias (legacy clients)
router.post('/message-to-super-admin', authenticate, requireParent, sendMessage);
// Get my messages to government (with replies)
router.get('/messages', authenticate, requireParent, getMyMessages);

// Emotional Monitoring (read-only for parents)
router.get('/emotional-monitoring/child/:childId', authenticate, requireParent, getMonitoringByChild);
router.get('/emotional-monitoring/:id', authenticate, requireParent, getMonitoringById);

// View parent data (accessible by Admin or Reception when clicking on parent in list)
// This route must come after all specific routes to avoid conflicts
router.get('/:parentId/data', authenticate, requireAdminOrReception, getParentData);

export default router;


