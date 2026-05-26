import IRR from '../../models/IRR.js';
import AssessmentSession from '../../models/AssessmentSession.js';
import AssessmentScore from '../../models/AssessmentScore.js';
import AssessmentCriteria from '../../models/AssessmentCriteria.js';
import LongTermGoal from '../../models/LongTermGoal.js';
import GoalPeriod from '../../models/GoalPeriod.js';
import ShortTermGoal from '../../models/ShortTermGoal.js';
import DailyMonitoringEntry from '../../models/DailyMonitoringEntry.js';
import WeeklyMonitoringEntry from '../../models/WeeklyMonitoringEntry.js';
import QuarterlyMonitoringEntry from '../../models/QuarterlyMonitoringEntry.js';
import Child from '../../models/Child.js';
import { isTeacherAssignedToChild } from '../../utils/schoolValidation.js';
import { computeAssessmentResult } from '../../utils/irrScoring.js';
import { logAudit } from '../../utils/auditLogger.js';
import logger from '../../utils/logger.js';

const VALID_SESSION_TYPES = ['intake', '3mo', '6mo', '9mo', '12mo', 'custom'];
const HEADER_FIELDS = ['childFullName', 'dateOfBirth', 'ageAtAssessmentStart',
  'ptpkIntakeDate', 'ptpkConclusionDate', 'ptpkConclusionNumber',
  'ptpkDiagnosis', 'irrStartDate', 'additionalInfo'];

// ── Access helpers ────────────────────────────────────────────────────────────

async function resolveChildAccess(childId, req) {
  const child = await Child.findByPk(childId);
  if (!child) return null;
  if (child.schoolId !== req.user.schoolId) return null;
  if (!await isTeacherAssignedToChild(child, req)) return null;
  return child;
}

async function resolveIRRAccess(irrId, req) {
  const irr = await IRR.findByPk(irrId);
  if (!irr) return null;
  if (irr.schoolId !== req.user.schoolId) return null;
  if (irr.childId) {
    const child = await Child.findByPk(irr.childId);
    if (child && !await isTeacherAssignedToChild(child, req)) return null;
    return { irr, child };
  }
  return { irr, child: null };
}

async function resolvePeriodAccess(periodId, req) {
  const period = await GoalPeriod.findByPk(periodId);
  if (!period) return null;
  if (period.schoolId !== req.user.schoolId) return null;
  if (period.childId) {
    const child = await Child.findByPk(period.childId);
    if (child && !await isTeacherAssignedToChild(child, req)) return null;
    return { period, child };
  }
  return { period, child: null };
}

async function resolveSTGoalAccess(goalId, req) {
  const goal = await ShortTermGoal.findByPk(goalId);
  if (!goal) return null;
  if (goal.schoolId !== req.user.schoolId) return null;
  if (goal.childId) {
    const child = await Child.findByPk(goal.childId);
    if (child && !await isTeacherAssignedToChild(child, req)) return null;
    return { goal, child };
  }
  return { goal, child: null };
}

async function resolveLTGoalAccess(goalId, req) {
  const goal = await LongTermGoal.findByPk(goalId);
  if (!goal) return null;
  if (goal.schoolId !== req.user.schoolId) return null;
  if (goal.childId) {
    const child = await Child.findByPk(goal.childId);
    if (child && !await isTeacherAssignedToChild(child, req)) return null;
    return { goal, child };
  }
  return { goal, child: null };
}

// ── IRR ───────────────────────────────────────────────────────────────────────

export const createIRR = async (req, res) => {
  try {
    const { childId } = req.params;
    const child = await resolveChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }

    const existing = await IRR.findOne({ where: { childId, status: 'active' } });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'IRR_ALREADY_EXISTS' } });
    }

    const irr = await IRR.create({
      childId,
      schoolId: child.schoolId,
      parentId: child.parentId ?? null,
      createdBy: req.user.id,
      status: 'draft',
    });

    logAudit({ entity: 'irrs', entityId: irr.id, action: 'create',
      actorId: req.user.id, actorRole: req.user.role, schoolId: irr.schoolId });

    return res.status(201).json({ success: true, data: irr });
  } catch (error) {
    logger.error('createIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_CREATE_FAILED' } });
  }
};

export const getChildIRR = async (req, res) => {
  try {
    const { childId } = req.params;
    const child = await resolveChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }

    const irr = await IRR.findOne({
      where: { childId, status: ['draft', 'active'] },
      order: [['createdAt', 'DESC']],
    });
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('getChildIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_FETCH_FAILED' } });
  }
};

export const getIRR = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    return res.json({ success: true, data: result.irr });
  } catch (error) {
    logger.error('getIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_FETCH_FAILED' } });
  }
};

export const updateIRR = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const { irr } = result;
    if (irr.status === 'archived') {
      return res.status(409).json({ success: false, error: { code: 'IRR_INVALID_STATUS' } });
    }

    const ALLOWED = [...HEADER_FIELDS, 'childStrengths', 'riskFactors'];
    const updates = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }

    await irr.update(updates);
    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('updateIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_UPDATE_FAILED' } });
  }
};

export const activateIRR = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const { irr } = result;
    if (irr.status !== 'draft') {
      return res.status(409).json({ success: false, error: { code: 'IRR_INVALID_STATUS' } });
    }

    const missing = HEADER_FIELDS.filter(f => !irr[f]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'IRR_HEADER_INCOMPLETE', detail: `Missing: ${missing.join(', ')}` },
      });
    }

    await irr.update({ status: 'active' });
    logAudit({ entity: 'irrs', entityId: irr.id, action: 'update',
      actorId: req.user.id, actorRole: req.user.role, schoolId: irr.schoolId,
      detail: 'activated' });

    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('activateIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_UPDATE_FAILED' } });
  }
};

export const archiveIRR = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const { irr } = result;
    if (irr.status === 'archived') {
      return res.status(409).json({ success: false, error: { code: 'IRR_INVALID_STATUS' } });
    }

    await irr.update({ status: 'archived' });
    logAudit({ entity: 'irrs', entityId: irr.id, action: 'update',
      actorId: req.user.id, actorRole: req.user.role, schoolId: irr.schoolId,
      detail: 'archived' });

    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('archiveIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_UPDATE_FAILED' } });
  }
};

// ── Assessment Session ────────────────────────────────────────────────────────

export const createAssessmentSession = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const { irr, child } = result;

    const { sessionType, completedAt, isHearingImpaired, scores, notes } = req.body;
    if (!sessionType || !VALID_SESSION_TYPES.includes(sessionType)) {
      return res.status(400).json({ success: false, error: { code: 'ASSESSMENT_INVALID_TYPE' } });
    }

    if (sessionType !== 'custom') {
      const existing = await AssessmentSession.findOne({
        where: { irrId: irr.id, sessionType },
      });
      if (existing) {
        return res.status(409).json({ success: false, error: { code: 'ASSESSMENT_SESSION_EXISTS' } });
      }
    }

    if (!Array.isArray(scores) || scores.length !== 17) {
      return res.status(400).json({ success: false, error: { code: 'ASSESSMENT_INCOMPLETE' } });
    }

    const allCriteria = await AssessmentCriteria.findAll({
      where: { isActive: true },
      order: [['sortOrder', 'ASC']],
    });
    if (allCriteria.length !== 17) {
      return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_CRITERIA_MISSING' } });
    }

    const intScores = scores.map(Number);
    const scoring = computeAssessmentResult(intScores);
    if (!scoring.valid) {
      return res.status(400).json({ success: false, error: { code: scoring.error } });
    }

    const session = await AssessmentSession.create({
      irrId: irr.id,
      childId: irr.childId,
      schoolId: irr.schoolId,
      sessionType,
      completedBy: req.user.id,
      completedAt: completedAt || new Date(),
      isHearingImpaired: isHearingImpaired ?? false,
      totalScore: scoring.totalScore,
      maxPossibleScore: scoring.maxPossibleScore,
      notes: notes ?? null,
    });

    const scoreRows = allCriteria.map((c, i) => ({
      sessionId: session.id,
      criterionId: c.id,
      schoolId: irr.schoolId,
      score: intScores[i],
    }));
    await AssessmentScore.bulkCreate(scoreRows);

    logAudit({ entity: 'assessment_sessions', entityId: session.id, action: 'create',
      actorId: req.user.id, actorRole: req.user.role, schoolId: irr.schoolId });

    return res.status(201).json({
      success: true,
      data: { session, totalScore: scoring.totalScore, maxPossibleScore: 68 },
    });
  } catch (error) {
    logger.error('createAssessmentSession error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_CREATE_FAILED' } });
  }
};

export const listAssessmentSessions = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const sessions = await AssessmentSession.findAll({
      where: { irrId: req.params.irrId },
      order: [['completedAt', 'ASC']],
    });
    return res.json({ success: true, data: sessions });
  } catch (error) {
    logger.error('listAssessmentSessions error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_LIST_FAILED' } });
  }
};

export const getAssessmentSession = async (req, res) => {
  try {
    const session = await AssessmentSession.findByPk(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ success: false, error: { code: 'ASSESSMENT_NOT_FOUND' } });
    }
    if (session.schoolId !== req.user.schoolId) {
      return res.status(404).json({ success: false, error: { code: 'ASSESSMENT_NOT_FOUND' } });
    }
    const sessionScores = await AssessmentScore.findAll({
      where: { sessionId: session.id },
      include: [{ model: AssessmentCriteria, as: 'criterion' }],
    });
    return res.json({ success: true, data: { session, scores: sessionScores } });
  } catch (error) {
    logger.error('getAssessmentSession error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_FETCH_FAILED' } });
  }
};

// ── Long-Term Goals ───────────────────────────────────────────────────────────

export const createLongTermGoal = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const { irr } = result;
    const { goalText, targetPeriodStart, targetPeriodEnd } = req.body;

    if (!goalText || String(goalText).trim().length < 5) {
      return res.status(400).json({ success: false, error: { code: 'LONG_TERM_GOAL_TEXT_TOO_SHORT' } });
    }

    const goal = await LongTermGoal.create({
      irrId: irr.id,
      childId: irr.childId,
      schoolId: irr.schoolId,
      goalText: String(goalText).trim(),
      targetPeriodStart: targetPeriodStart ?? null,
      targetPeriodEnd: targetPeriodEnd ?? null,
      createdBy: req.user.id,
    });
    logAudit({ entity: 'long_term_goals', entityId: goal.id, action: 'create',
      actorId: req.user.id, actorRole: req.user.role, schoolId: irr.schoolId });
    return res.status(201).json({ success: true, data: goal });
  } catch (error) {
    logger.error('createLongTermGoal error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_CREATE_FAILED' } });
  }
};

export const listLongTermGoals = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const goals = await LongTermGoal.findAll({
      where: { irrId: req.params.irrId },
      order: [['createdAt', 'ASC']],
    });
    return res.json({ success: true, data: goals });
  } catch (error) {
    logger.error('listLongTermGoals error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_LIST_FAILED' } });
  }
};

export const updateLongTermGoal = async (req, res) => {
  try {
    const result = await resolveLTGoalAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'LONG_TERM_GOAL_NOT_FOUND' } });
    }
    const { goal } = result;
    const ALLOWED = ['goalText', 'targetPeriodStart', 'targetPeriodEnd'];
    const updates = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await goal.update(updates);
    return res.json({ success: true, data: goal });
  } catch (error) {
    logger.error('updateLongTermGoal error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_UPDATE_FAILED' } });
  }
};

export const deleteLongTermGoal = async (req, res) => {
  try {
    const result = await resolveLTGoalAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'LONG_TERM_GOAL_NOT_FOUND' } });
    }
    await result.goal.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'teacher_deleted' });
    return res.json({ success: true, data: null });
  } catch (error) {
    logger.error('deleteLongTermGoal error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_DELETE_FAILED' } });
  }
};

// ── Goal Periods ──────────────────────────────────────────────────────────────

export const createGoalPeriod = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const { irr } = result;
    const { periodStart, periodEnd } = req.body;
    if (!periodStart || !periodEnd) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_PERIOD_DATES_REQUIRED' } });
    }
    const period = await GoalPeriod.create({
      irrId: irr.id,
      childId: irr.childId,
      schoolId: irr.schoolId,
      periodStart,
      periodEnd,
      status: 'active',
    });
    return res.status(201).json({ success: true, data: period });
  } catch (error) {
    logger.error('createGoalPeriod error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'GOAL_PERIOD_CREATE_FAILED' } });
  }
};

export const listGoalPeriods = async (req, res) => {
  try {
    const result = await resolveIRRAccess(req.params.irrId, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const periods = await GoalPeriod.findAll({
      where: { irrId: req.params.irrId },
      order: [['periodStart', 'ASC']],
    });
    return res.json({ success: true, data: periods });
  } catch (error) {
    logger.error('listGoalPeriods error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'GOAL_PERIOD_LIST_FAILED' } });
  }
};

export const updateGoalPeriodReview = async (req, res) => {
  try {
    const result = await resolvePeriodAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_PERIOD_NOT_FOUND' } });
    }
    const { period } = result;
    const ALLOWED = ['overallAssessment', 'planChanges', 'parentRecommendations',
      'nextReviewDate', 'nextAssessmentDate', 'parentDiscussionDate', 'status'];
    const updates = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await period.update(updates);
    return res.json({ success: true, data: period });
  } catch (error) {
    logger.error('updateGoalPeriodReview error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'GOAL_PERIOD_UPDATE_FAILED' } });
  }
};

export const signGoalPeriod = async (req, res) => {
  try {
    const result = await resolvePeriodAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_PERIOD_NOT_FOUND' } });
    }
    const { period } = result;
    const now = new Date();
    const update = req.user.role === 'teacher'
      ? { teacherSignedAt: now, teacherSignedBy: req.user.id }
      : { managerSignedAt: now, managerSignedBy: req.user.id };
    await period.update(update);
    return res.json({ success: true, data: period });
  } catch (error) {
    logger.error('signGoalPeriod error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'GOAL_PERIOD_UPDATE_FAILED' } });
  }
};

// ── Short-Term Goals ──────────────────────────────────────────────────────────

export const createShortTermGoal = async (req, res) => {
  try {
    const result = await resolvePeriodAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_PERIOD_NOT_FOUND' } });
    }
    const { period } = result;
    const { skillAreaCode, goalText, sortOrder, taskSetDate, targetDate, tasks, methods, progress, observations } = req.body;

    if (!goalText || String(goalText).trim().length < 3) {
      return res.status(400).json({ success: false, error: { code: 'SHORT_TERM_GOAL_TEXT_TOO_SHORT' } });
    }

    const goal = await ShortTermGoal.create({
      periodId: period.id,
      irrId: period.irrId,
      childId: period.childId,
      schoolId: period.schoolId,
      skillAreaCode: skillAreaCode ?? null,
      goalText: String(goalText).trim(),
      sortOrder: sortOrder ?? 1,
      taskSetDate: taskSetDate ?? null,
      targetDate: targetDate ?? null,
      tasks: tasks ?? null,
      methods: methods ?? null,
      progress: progress ?? null,
      observations: observations ?? null,
    });
    return res.status(201).json({ success: true, data: goal });
  } catch (error) {
    logger.error('createShortTermGoal error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'SHORT_TERM_GOAL_CREATE_FAILED' } });
  }
};

export const listShortTermGoals = async (req, res) => {
  try {
    const result = await resolvePeriodAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_PERIOD_NOT_FOUND' } });
    }
    const goals = await ShortTermGoal.findAll({
      where: { periodId: req.params.id },
      order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
    });
    return res.json({ success: true, data: goals });
  } catch (error) {
    logger.error('listShortTermGoals error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'SHORT_TERM_GOAL_LIST_FAILED' } });
  }
};

export const updateShortTermGoal = async (req, res) => {
  try {
    const result = await resolveSTGoalAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'SHORT_TERM_GOAL_NOT_FOUND' } });
    }
    const ALLOWED = ['goalText', 'skillAreaCode', 'taskSetDate', 'targetDate',
      'tasks', 'methods', 'progress', 'observations', 'sortOrder'];
    const updates = {};
    for (const f of ALLOWED) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    await result.goal.update(updates);
    return res.json({ success: true, data: result.goal });
  } catch (error) {
    logger.error('updateShortTermGoal error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'SHORT_TERM_GOAL_UPDATE_FAILED' } });
  }
};

export const deleteShortTermGoal = async (req, res) => {
  try {
    const result = await resolveSTGoalAccess(req.params.id, req);
    if (!result) {
      return res.status(404).json({ success: false, error: { code: 'SHORT_TERM_GOAL_NOT_FOUND' } });
    }
    await result.goal.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'teacher_deleted' });
    return res.json({ success: true, data: null });
  } catch (error) {
    logger.error('deleteShortTermGoal error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'SHORT_TERM_GOAL_DELETE_FAILED' } });
  }
};

// ── Daily Monitoring ──────────────────────────────────────────────────────────

export const createDailyEntry = async (req, res) => {
  try {
    const { childId } = req.params;
    const child = await resolveChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'DAILY_ENTRY_CHILD_NOT_ACCESSIBLE' } });
    }
    const { entryDate, hygieneData, healthData, giData, irrId, notes } = req.body;
    if (!entryDate) {
      return res.status(400).json({ success: false, error: { code: 'DAILY_ENTRY_DATE_REQUIRED' } });
    }
    const entry = await DailyMonitoringEntry.create({
      childId,
      schoolId: child.schoolId,
      irrId: irrId ?? null,
      recordedBy: req.user.id,
      entryDate,
      hygieneData: hygieneData ?? {},
      healthData: healthData ?? {},
      giData: giData ?? {},
      notes: notes ?? null,
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: { code: 'DAILY_ENTRY_DUPLICATE' } });
    }
    logger.error('createDailyEntry error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'DAILY_ENTRY_CREATE_FAILED' } });
  }
};

export const listDailyEntries = async (req, res) => {
  try {
    const { childId } = req.params;
    const child = await resolveChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'DAILY_ENTRY_CHILD_NOT_ACCESSIBLE' } });
    }
    const { from, to, limit = 30 } = req.query;
    const where = { childId };
    if (from) where.entryDate = { ...(where.entryDate || {}), $gte: from };
    if (to) where.entryDate = { ...(where.entryDate || {}), $lte: to };

    const entries = await DailyMonitoringEntry.findAll({
      where,
      order: [['entryDate', 'DESC']],
      limit: Math.min(Number(limit), 90),
    });
    return res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('listDailyEntries error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'DAILY_ENTRY_LIST_FAILED' } });
  }
};

// ── Weekly Monitoring ─────────────────────────────────────────────────────────

export const createWeeklyEntry = async (req, res) => {
  try {
    const { childId } = req.params;
    const child = await resolveChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'WEEKLY_ENTRY_CHILD_NOT_ACCESSIBLE' } });
    }
    const { weekStart, emotionalData, environmentData, irrId, notes } = req.body;
    if (!weekStart) {
      return res.status(400).json({ success: false, error: { code: 'WEEKLY_ENTRY_DATE_REQUIRED' } });
    }
    const entry = await WeeklyMonitoringEntry.create({
      childId,
      schoolId: child.schoolId,
      irrId: irrId ?? null,
      recordedBy: req.user.id,
      weekStart,
      emotionalData: emotionalData ?? {},
      environmentData: environmentData ?? {},
      notes: notes ?? null,
    });
    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: { code: 'WEEKLY_ENTRY_DUPLICATE' } });
    }
    logger.error('createWeeklyEntry error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'WEEKLY_ENTRY_CREATE_FAILED' } });
  }
};

export const listWeeklyEntries = async (req, res) => {
  try {
    const { childId } = req.params;
    const child = await resolveChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'WEEKLY_ENTRY_CHILD_NOT_ACCESSIBLE' } });
    }
    const entries = await WeeklyMonitoringEntry.findAll({
      where: { childId },
      order: [['weekStart', 'DESC']],
      limit: 52,
    });
    return res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('listWeeklyEntries error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'WEEKLY_ENTRY_LIST_FAILED' } });
  }
};

// ── Quarterly Monitoring (admin-only, mounted on admin routes) ────────────────

export const createQuarterlyEntry = async (req, res) => {
  try {
    // Defense-in-depth: admin/reception only (requireAdmin on route layer handles primary gate)
    if (!['admin', 'reception'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'QUARTERLY_ACCESS_DENIED' } });
    }
    const { quarterStart, quarterEnd, infoSystemData, parentWorkData,
      documentationData, careQualityData, conditionsData, departures, notes } = req.body;
    if (!quarterStart || !quarterEnd) {
      return res.status(400).json({ success: false, error: { code: 'QUARTERLY_ENTRY_DATES_REQUIRED' } });
    }
    const entry = await QuarterlyMonitoringEntry.create({
      schoolId: req.user.schoolId,
      recordedBy: req.user.id,
      quarterStart,
      quarterEnd,
      infoSystemData: infoSystemData ?? {},
      parentWorkData: parentWorkData ?? {},
      documentationData: documentationData ?? {},
      careQualityData: careQualityData ?? {},
      conditionsData: conditionsData ?? {},
      departures: departures ?? [],
      notes: notes ?? null,
    });
    logAudit({ entity: 'quarterly_monitoring_entries', entityId: entry.id, action: 'create',
      actorId: req.user.id, actorRole: req.user.role, schoolId: req.user.schoolId });
    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: { code: 'QUARTERLY_ENTRY_DUPLICATE' } });
    }
    logger.error('createQuarterlyEntry error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'QUARTERLY_ENTRY_CREATE_FAILED' } });
  }
};

export const listQuarterlyEntries = async (req, res) => {
  try {
    const entries = await QuarterlyMonitoringEntry.findAll({
      where: { schoolId: req.user.schoolId },
      order: [['quarterStart', 'DESC']],
      limit: 20,
    });
    return res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('listQuarterlyEntries error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'QUARTERLY_ENTRY_LIST_FAILED' } });
  }
};
