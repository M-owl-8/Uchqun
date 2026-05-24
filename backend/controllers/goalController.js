import ChildGoal from '../models/ChildGoal.js';
import ChildGoalReview from '../models/ChildGoalReview.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';
import { logAudit } from '../utils/auditLogger.js';

const VALID_CATEGORIES = [
  'communication', 'social_emotional', 'cognitive',
  'fine_motor', 'gross_motor', 'self_care', 'behavioral', 'academic',
];
const VALID_PROGRESS = ['not_started', 'emerging', 'developing', 'achieved', 'discontinued'];
const VALID_REVIEW_STATUS = ['on_track', 'progressing_slowly', 'not_progressing', 'achieved', 'revised'];
const IMMUTABLE_FIELDS = ['childId', 'category', 'createdBy', 'schoolId'];

const isDateOnly = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(new Date(s).getTime());

export const listByChild = async (req, res) => {
  try {
    const childId = req.params.childId ?? req.params.id;
    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
    }

    const goals = await ChildGoal.findAll({
      where: { childId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return res.json({ success: true, data: goals });
  } catch (error) {
    logger.error('listByChild goals error', { error: error.message, childId: req.params.childId ?? req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_LIST_FAILED' } });
  }
};

export const getById = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND' } });
    }
    return res.json({ success: true, data: goal });
  } catch (error) {
    logger.error('getById goal error', { error: error.message, goalId: req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_FETCH_FAILED' } });
  }
};

export const create = async (req, res) => {
  try {
    const childId = req.params.childId ?? req.params.id;
    const {
      category, title, description, measurement, baseline,
      targetDate, currentProgress, progressNotes,
    } = req.body;

    if (!category || !VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_INVALID_CATEGORY' } });
    }
    const trimmedTitle = title ? String(title).trim() : '';
    if (trimmedTitle.length < 5) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_TITLE_TOO_SHORT' } });
    }
    if (trimmedTitle.length > 200) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_TITLE_TOO_LONG' } });
    }
    if (description && String(description).length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_DESCRIPTION_TOO_LONG' } });
    }
    if (measurement && String(measurement).length > 1000) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_MEASUREMENT_TOO_LONG' } });
    }
    if (baseline && String(baseline).length > 1000) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_BASELINE_TOO_LONG' } });
    }
    if (progressNotes && String(progressNotes).length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_PROGRESS_NOTES_TOO_LONG' } });
    }
    if (targetDate) {
      if (!isDateOnly(targetDate)) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_INVALID_TARGET_DATE' } });
      }
      if (new Date(targetDate) < new Date(new Date().toISOString().slice(0, 10))) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_TARGET_DATE_IN_PAST' } });
      }
    }
    if (currentProgress && !VALID_PROGRESS.includes(currentProgress)) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_INVALID_PROGRESS_STATUS' } });
    }

    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
    }

    const goal = await ChildGoal.create({
      childId,
      schoolId: req.user.schoolId,
      createdBy: req.user.id,
      category,
      title: trimmedTitle,
      description: description ?? null,
      measurement: measurement ?? null,
      baseline: baseline ?? null,
      targetDate: targetDate ?? null,
      currentProgress: currentProgress ?? 'not_started',
      progressNotes: progressNotes ?? null,
      childSnapshot: {
        firstName: child.firstName,
        lastName: child.lastName,
        schoolId: child.schoolId,
        dateOfBirth: child.dateOfBirth,
      },
    });

    logAudit({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'create', entity: 'child_goals', entityId: goal.id,
      schoolId: req.user.schoolId,
      meta: { childId, category, title: trimmedTitle },
    });

    return res.status(201).json({ success: true, data: goal });
  } catch (error) {
    logger.error('create goal error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'GOAL_CREATE_FAILED' } });
  }
};

export const update = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND' } });
    }
    const child = await validateChildAccess(goal.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
    }

    // Block attempts to change immutable fields
    const attemptedImmutable = IMMUTABLE_FIELDS.filter(f => Object.prototype.hasOwnProperty.call(req.body, f));
    if (attemptedImmutable.length > 0) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_IMMUTABLE_FIELD', detail: attemptedImmutable.join(', ') } });
    }

    const { title, description, measurement, baseline, targetDate, currentProgress, progressNotes } = req.body;
    const updateData = {};
    const before = {};
    const after = {};

    if (title !== undefined) {
      const t = String(title).trim();
      if (t.length < 5) return res.status(400).json({ success: false, error: { code: 'GOAL_TITLE_TOO_SHORT' } });
      if (t.length > 200) return res.status(400).json({ success: false, error: { code: 'GOAL_TITLE_TOO_LONG' } });
      before.title = goal.title; after.title = t; updateData.title = t;
    }
    if (description !== undefined) {
      if (description && String(description).length > 2000) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_DESCRIPTION_TOO_LONG' } });
      }
      before.description = goal.description; after.description = description; updateData.description = description;
    }
    if (measurement !== undefined) {
      if (measurement && String(measurement).length > 1000) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_MEASUREMENT_TOO_LONG' } });
      }
      before.measurement = goal.measurement; after.measurement = measurement; updateData.measurement = measurement;
    }
    if (baseline !== undefined) {
      if (baseline && String(baseline).length > 1000) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_BASELINE_TOO_LONG' } });
      }
      before.baseline = goal.baseline; after.baseline = baseline; updateData.baseline = baseline;
    }
    if (targetDate !== undefined) {
      if (targetDate !== null && !isDateOnly(targetDate)) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_INVALID_TARGET_DATE' } });
      }
      before.targetDate = goal.targetDate; after.targetDate = targetDate; updateData.targetDate = targetDate;
    }
    if (currentProgress !== undefined) {
      if (!VALID_PROGRESS.includes(currentProgress)) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_INVALID_PROGRESS_STATUS' } });
      }
      before.currentProgress = goal.currentProgress; after.currentProgress = currentProgress;
      updateData.currentProgress = currentProgress;
    }
    if (progressNotes !== undefined) {
      if (progressNotes && String(progressNotes).length > 2000) {
        return res.status(400).json({ success: false, error: { code: 'GOAL_PROGRESS_NOTES_TOO_LONG' } });
      }
      before.progressNotes = goal.progressNotes; after.progressNotes = progressNotes;
      updateData.progressNotes = progressNotes;
    }

    await goal.update(updateData);

    logAudit({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'update', entity: 'child_goals', entityId: goal.id,
      schoolId: req.user.schoolId,
      meta: { before, after },
    });

    return res.json({ success: true, data: goal });
  } catch (error) {
    logger.error('update goal error', { error: error.message, goalId: req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_UPDATE_FAILED' } });
  }
};

export const deleteGoal = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND' } });
    }
    const child = await validateChildAccess(goal.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
    }

    await goal.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: req.body?.reason ?? null });

    return res.status(204).send();
  } catch (error) {
    logger.error('delete goal error', { error: error.message, goalId: req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_DELETE_FAILED' } });
  }
};

export const createReview = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND' } });
    }
    const child = await validateChildAccess(goal.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
    }

    const { reviewDate, status, evidence, nextSteps } = req.body;

    if (!reviewDate || !isDateOnly(reviewDate)) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_REVIEW_DATE_REQUIRED' } });
    }
    if (new Date(reviewDate) > new Date()) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_REVIEW_DATE_IN_FUTURE' } });
    }
    if (!status || !VALID_REVIEW_STATUS.includes(status)) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_REVIEW_INVALID_STATUS' } });
    }
    if (evidence && String(evidence).length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_REVIEW_EVIDENCE_TOO_LONG' } });
    }
    if (nextSteps && String(nextSteps).length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'GOAL_REVIEW_NEXT_STEPS_TOO_LONG' } });
    }

    const review = await ChildGoalReview.create({
      goalId: goal.id,
      reviewerId: req.user.id,
      reviewDate,
      status,
      evidence: evidence ?? null,
      nextSteps: nextSteps ?? null,
    });

    logAudit({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'create', entity: 'child_goal_reviews', entityId: review.id,
      schoolId: req.user.schoolId,
      meta: { goalId: goal.id, status, reviewDate },
    });

    return res.status(201).json({ success: true, data: review });
  } catch (error) {
    logger.error('createReview error', { error: error.message, goalId: req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_REVIEW_CREATE_FAILED' } });
  }
};

export const listReviews = async (req, res) => {
  try {
    const goal = await ChildGoal.findOne({
      where: { id: req.params.id, schoolId: req.user.schoolId },
    });
    if (!goal) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_NOT_FOUND' } });
    }

    const reviews = await ChildGoalReview.findAll({
      where: { goalId: goal.id },
      order: [['reviewDate', 'DESC']],
    });

    return res.json({ success: true, data: reviews });
  } catch (error) {
    logger.error('listReviews error', { error: error.message, goalId: req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_REVIEW_LIST_FAILED' } });
  }
};
