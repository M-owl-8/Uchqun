import express from 'express';
import { authenticate, requireTeacher, requireRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { updateTaskStatusValidator, createEmotionalMonitoringValidator, updateEmotionalMonitoringValidator } from '../validators/teacherTaskValidator.js';
import { messageToGovValidator } from '../validators/messageValidator.js';
import { getMyProfile, getDashboard, getDashboardCounts, getParents, getParentById, getMyMessages, getMyGroups, getTeacherRatings, getChildren, getChildById } from '../controllers/teacherController.js';
import { create as createReflection, list as listReflections } from '../controllers/reflectionController.js';
import { create as createJournalEntry, createBulk as createJournalBulk, listByChild as listJournalByChild } from '../controllers/journalController.js';
import { getMyResponsibilities, getResponsibilityById, getMyTasks, getTaskById, updateTaskStatus, getMyWorkHistory, getWorkHistoryById, updateWorkHistoryStatus } from '../controllers/teacherTaskController.js';
import { sendMessage } from '../controllers/governmentMessageController.js';
import {
  createOrUpdateMonitoring,
  getAllMonitoring,
  getMonitoringByChild,
  getMonitoringById,
  deleteMonitoring,
} from '../controllers/emotionalMonitoringController.js';
import {
  listByChild as listGoalsByChild,
  getById as getGoalById,
  create as createGoal,
  update as updateGoal,
  deleteGoal,
  createReview as createGoalReview,
  listReviews as listGoalReviews,
} from '../controllers/goalController.js';
import {
  createIRR, getChildIRR, getIRR, updateIRR, activateIRR, archiveIRR,
  createAssessmentSession, listAssessmentSessions, getAssessmentSession,
  createLongTermGoal, listLongTermGoals, updateLongTermGoal, deleteLongTermGoal,
  createGoalPeriod, listGoalPeriods, updateGoalPeriodReview, signGoalPeriod,
  createShortTermGoal, listShortTermGoals, updateShortTermGoal, deleteShortTermGoal,
  createDailyEntry, listDailyEntries,
  createWeeklyEntry, listWeeklyEntries,
} from '../controllers/teacher/irrController.js';
import {
  listByIRR as listMonthlyMilestonesByIRR,
  listByLTG as listMonthlyMilestonesByLTG,
  create as createMonthlyMilestone,
  replaceAll as replaceMonthlyMilestones,
  update as updateMonthlyMilestone,
  remove as deleteMonthlyMilestone,
} from '../controllers/teacher/monthlyMilestoneController.js';

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

// Send message to government (top-level platform owner)
router.post('/message-to-government', messageToGovValidator, handleValidationErrors, sendMessage);
// Get my messages to government (with replies)
router.get('/messages', getMyMessages);

// Children (school-scoped read-only access for teacher, reception, admin)
router.get('/children', getChildren);
router.get('/children/:id', getChildById);
// Child goals
router.get('/children/:childId/goals', listGoalsByChild);
router.post('/children/:childId/goals', requireRole('teacher'), createGoal);
router.get('/goals/:id', getGoalById);
router.patch('/goals/:id', requireRole('teacher'), updateGoal);
router.delete('/goals/:id', requireRole('teacher'), deleteGoal);
router.post('/goals/:id/reviews', requireRole('teacher'), createGoalReview);
router.get('/goals/:id/reviews', listGoalReviews);

// Reflections — teacher-only (requireRole('teacher') strictly, NOT requireTeacher)
router.post('/reflections', requireRole('teacher'), createReflection);
router.get('/reflections', requireRole('teacher'), listReflections);

// Journal (teacher: create + read; reception/admin allowed via requireTeacher)
router.post('/journal', createJournalEntry);
router.post('/journal/bulk', createJournalBulk);
router.get('/journal/:childId', listJournalByChild);

// Emotional Monitoring
// Specific routes must come before general routes
router.get('/emotional-monitoring/child/:childId', getMonitoringByChild);
router.get('/emotional-monitoring/:id', getMonitoringById);
router.put('/emotional-monitoring/:id', updateEmotionalMonitoringValidator, handleValidationErrors, createOrUpdateMonitoring);
router.delete('/emotional-monitoring/:id', deleteMonitoring);
// General routes come after specific routes
router.post('/emotional-monitoring', createEmotionalMonitoringValidator, handleValidationErrors, createOrUpdateMonitoring);
router.get('/emotional-monitoring', getAllMonitoring);

// ── ИРР (Individual Development Plan) ────────────────────────────────────────
// IRR per child
router.post('/children/:childId/irr', requireRole('teacher'), createIRR);
router.get('/children/:childId/irr', getChildIRR);
// Daily monitoring per child
router.post('/children/:childId/daily-entries', requireRole('teacher'), createDailyEntry);
router.get('/children/:childId/daily-entries', listDailyEntries);
// Weekly monitoring per child
router.post('/children/:childId/weekly-entries', requireRole('teacher'), createWeeklyEntry);
router.get('/children/:childId/weekly-entries', listWeeklyEntries);
// IRR resource by ID
router.get('/irr/:irrId', getIRR);
router.patch('/irr/:irrId', requireRole('teacher'), updateIRR);
router.post('/irr/:irrId/activate', requireRole('teacher'), activateIRR);
router.post('/irr/:irrId/archive', requireRole('teacher'), archiveIRR);
// Assessment sessions
router.post('/irr/:irrId/assessment-sessions', requireRole('teacher'), createAssessmentSession);
router.get('/irr/:irrId/assessment-sessions', listAssessmentSessions);
router.get('/assessment-sessions/:sessionId', getAssessmentSession);
// Long-term goals
router.post('/irr/:irrId/long-term-goals', requireRole('teacher'), createLongTermGoal);
router.get('/irr/:irrId/long-term-goals', listLongTermGoals);
router.patch('/long-term-goals/:id', requireRole('teacher'), updateLongTermGoal);
router.delete('/long-term-goals/:id', requireRole('teacher'), deleteLongTermGoal);
// Goal periods
router.post('/irr/:irrId/goal-periods', requireRole('teacher'), createGoalPeriod);
router.get('/irr/:irrId/goal-periods', listGoalPeriods);
router.patch('/goal-periods/:id/review', requireRole('teacher'), updateGoalPeriodReview);
router.post('/goal-periods/:id/sign', signGoalPeriod);
// Short-term goals (nested under period)
router.post('/goal-periods/:id/short-term-goals', requireRole('teacher'), createShortTermGoal);
router.get('/goal-periods/:id/short-term-goals', listShortTermGoals);
router.patch('/short-term-goals/:id', requireRole('teacher'), updateShortTermGoal);
router.delete('/short-term-goals/:id', requireRole('teacher'), deleteShortTermGoal);
// Monthly milestones (IRR-MONTHLY-MILESTONES) — 12-month projection per LTG
router.get('/irr/:irrId/monthly-milestones', listMonthlyMilestonesByIRR);
router.get('/long-term-goals/:ltgId/monthly-milestones', listMonthlyMilestonesByLTG);
router.post('/long-term-goals/:ltgId/monthly-milestones', requireRole('teacher'), createMonthlyMilestone);
router.put('/long-term-goals/:ltgId/monthly-milestones/bulk', requireRole('teacher'), replaceMonthlyMilestones);
router.patch('/monthly-milestones/:id', requireRole('teacher'), updateMonthlyMilestone);
router.delete('/monthly-milestones/:id', requireRole('teacher'), deleteMonthlyMilestone);

export default router;
