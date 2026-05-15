import express from 'express';
import { authenticate, requireTeacher } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { updateTaskStatusValidator, createEmotionalMonitoringValidator, updateEmotionalMonitoringValidator } from '../validators/teacherTaskValidator.js';
import { aiChatValidator } from '../validators/aiChatValidator.js';
import { messageToGovValidator } from '../validators/messageValidator.js';
import { aiChatLimiter } from '../middleware/rateLimiter.js';
import { getMyProfile, getDashboard, getDashboardCounts, getParents, getParentById, getMyMessages, getMyGroups, getTeacherRatings } from '../controllers/teacherController.js';
import { getMyResponsibilities, getResponsibilityById, getMyTasks, getTaskById, updateTaskStatus, getMyWorkHistory, getWorkHistoryById, updateWorkHistoryStatus } from '../controllers/teacherTaskController.js';
import { getAIAdvice } from '../controllers/teacherAIController.js';
import { sendMessage } from '../controllers/governmentMessageController.js';
import {
  createOrUpdateMonitoring,
  getAllMonitoring,
  getMonitoringByChild,
  getMonitoringById,
  deleteMonitoring,
} from '../controllers/emotionalMonitoringController.js';

const router = express.Router();

/**
 * Teacher Routes
 * 
 * Business Logic:
 * - Teacher profile must display:
 *   - Assigned responsibilities
 *   - Tasks performed
 *   - Deadlines and work history
 * - Teachers can only VIEW parents (read-only access)
 */

// All routes require Teacher authentication
router.use(authenticate);
router.use(requireTeacher);

// Profile and dashboard
router.get('/profile', getMyProfile);
router.get('/dashboard', getDashboard);
router.get('/dashboard/counts', getDashboardCounts);

// Responsibilities
router.get('/responsibilities', getMyResponsibilities);
router.get('/responsibilities/:id', getResponsibilityById);

// Tasks
router.get('/tasks', getMyTasks);
router.get('/tasks/:id', getTaskById);
router.put('/tasks/:id/status', updateTaskStatusValidator, handleValidationErrors, updateTaskStatus);

// Work history
router.get('/work-history', getMyWorkHistory);
router.get('/work-history/:id', getWorkHistoryById);
router.put('/work-history/:id/status', updateTaskStatusValidator, handleValidationErrors, updateWorkHistoryStatus);

// Parent view (read-only)
router.get('/parents', getParents);
router.get('/parents/:id', getParentById);

// Groups
router.get('/groups', getMyGroups);

// Teacher ratings
router.get('/ratings', getTeacherRatings);

// AI Chat
router.post('/ai/chat', aiChatLimiter, aiChatValidator, handleValidationErrors, getAIAdvice);

// Send message to government (top-level platform owner)
router.post('/message-to-government', messageToGovValidator, handleValidationErrors, sendMessage);
// Get my messages to government (with replies)
router.get('/messages', getMyMessages);

// Emotional Monitoring
// Specific routes must come before general routes
router.get('/emotional-monitoring/child/:childId', getMonitoringByChild);
router.get('/emotional-monitoring/:id', getMonitoringById);
router.put('/emotional-monitoring/:id', updateEmotionalMonitoringValidator, handleValidationErrors, createOrUpdateMonitoring);
router.delete('/emotional-monitoring/:id', deleteMonitoring);
// General routes come after specific routes
router.post('/emotional-monitoring', createEmotionalMonitoringValidator, handleValidationErrors, createOrUpdateMonitoring);
router.get('/emotional-monitoring', getAllMonitoring);

export default router;
