import express from 'express';
import { authenticate, requireTeacher } from '../middleware/auth.js';
import {
  getMyProfile,
  getMyResponsibilities,
  getResponsibilityById,
  getMyTasks,
  getTaskById,
  updateTaskStatus,
  getMyWorkHistory,
  getWorkHistoryById,
  updateWorkHistoryStatus,
  getDashboard,
  getParents,
  getParentById,
  getMyMessages,
  getMyGroups,
  getTeacherRatings,
  getAIAdvice,
} from '../controllers/teacherController.js';
import { sendMessage } from '../controllers/superAdminController.js';
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

// Responsibilities
router.get('/responsibilities', getMyResponsibilities);
router.get('/responsibilities/:id', getResponsibilityById);

// Tasks
router.get('/tasks', getMyTasks);
router.get('/tasks/:id', getTaskById);
router.put('/tasks/:id/status', updateTaskStatus);

// Work history
router.get('/work-history', getMyWorkHistory);
router.get('/work-history/:id', getWorkHistoryById);
router.put('/work-history/:id/status', updateWorkHistoryStatus);

// Parent view (read-only)
router.get('/parents', getParents);
router.get('/parents/:id', getParentById);

// Groups
router.get('/groups', getMyGroups);

// Teacher ratings
router.get('/ratings', getTeacherRatings);

// AI Chat
router.post('/ai/chat', getAIAdvice);

// Send message to government (top-level platform owner)
router.post('/message-to-government', sendMessage);
// Backward-compatible alias (legacy clients)
router.post('/message-to-super-admin', sendMessage);
// Get my messages to government (with replies)
router.get('/messages', getMyMessages);

// Emotional Monitoring
// Specific routes must come before general routes
router.get('/emotional-monitoring/child/:childId', getMonitoringByChild);
router.get('/emotional-monitoring/:id', getMonitoringById);
router.put('/emotional-monitoring/:id', createOrUpdateMonitoring);
router.delete('/emotional-monitoring/:id', deleteMonitoring);
// General routes come after specific routes
router.post('/emotional-monitoring', createOrUpdateMonitoring);
router.get('/emotional-monitoring', getAllMonitoring);

export default router;
