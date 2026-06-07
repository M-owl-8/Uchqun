// CROSS-IRR-VISIBILITY — government read-only child + IRR endpoints.
//
// Government has read-only access to children in schools within their region
// scope. Republic accounts see all regions; region accounts see only their
// region's schools.
//
// Surfaces:
//   GET /government/schools/:schoolId/students  → list of children at school
//                                                  (region-gated)
//   GET /government/children/:childId           → child profile (region-gated)
//   GET /government/children/:childId/irr       → IRR header
//   GET /government/children/:childId/irr/assessment → score progression
//   GET /government/children/:childId/irr/goals → long-term + periods + STGs
//
// Scope rule: child's school's regionId must be in scope (== regionScope for
// region accounts; any for republic). 404 on miss — same opacity rule.

import Child from '../../models/Child.js';
import School from '../../models/School.js';
import User from '../../models/User.js';
import Group from '../../models/Group.js';
import IRR from '../../models/IRR.js';
import AssessmentSession from '../../models/AssessmentSession.js';
import LongTermGoal from '../../models/LongTermGoal.js';
import ShortTermGoal from '../../models/ShortTermGoal.js';
import GoalPeriod from '../../models/GoalPeriod.js';
import logger from '../../utils/logger.js';

/** Throws-friendly resolution: returns child or null with implicit region scope. */
async function resolveGovernmentChild(childId, req) {
  if (req.user.role !== 'government') return null;
  const child = await Child.findByPk(childId);
  if (!child) return null;
  if (!child.schoolId) return null;
  const school = await School.findByPk(child.schoolId);
  if (!school) return null;
  // Republic accounts (isGlobalAccess) see all regions; region accounts
  // only their own.
  if (!req.isGlobalAccess && school.regionId !== req.regionScope) return null;
  return child;
}

async function resolveGovernmentSchool(schoolId, req) {
  if (req.user.role !== 'government') return null;
  const school = await School.findByPk(schoolId);
  if (!school) return null;
  if (!req.isGlobalAccess && school.regionId !== req.regionScope) return null;
  return school;
}

async function getActiveIrr(childId) {
  return IRR.findOne({
    where: { childId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });
}

/** GET /government/schools/:schoolId/students */
export const listSchoolStudents = async (req, res) => {
  try {
    const school = await resolveGovernmentSchool(req.params.schoolId, req);
    if (!school) {
      return res.status(404).json({ success: false, error: { code: 'SCHOOL_NOT_ACCESSIBLE' } });
    }
    const children = await Child.findAll({
      where: { schoolId: school.id },
      attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'class', 'teacher', 'groupId', 'photo'],
      include: [
        { model: User, as: 'parent', attributes: ['id', 'firstName', 'lastName'], required: false },
        { model: Group, as: 'childGroup', attributes: ['id', 'name'], required: false },
      ],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });
    return res.json({ success: true, data: children });
  } catch (error) {
    logger.error('government listSchoolStudents error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'STUDENT_LIST_FAILED' } });
  }
};

/** GET /government/children/:childId */
export const getChild = async (req, res) => {
  try {
    const child = await resolveGovernmentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'CHILD_NOT_ACCESSIBLE' } });
    }
    const [school, parent, group] = await Promise.all([
      School.findByPk(child.schoolId, { attributes: ['id', 'name', 'regionId'] }).catch(() => null),
      child.parentId ? User.findByPk(child.parentId, { attributes: ['id', 'firstName', 'lastName', 'phone'] }).catch(() => null) : null,
      child.groupId ? Group.findByPk(child.groupId, { attributes: ['id', 'name', 'teacherId'] }).catch(() => null) : null,
    ]);
    return res.json({ success: true, data: { ...child.toJSON(), school, parent, group } });
  } catch (error) {
    logger.error('government getChild error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'CHILD_FETCH_FAILED' } });
  }
};

/** GET /government/children/:childId/irr */
export const getChildIRR = async (req, res) => {
  try {
    const child = await resolveGovernmentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }
    const irr = await getActiveIrr(child.id);
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('government getChildIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_FETCH_FAILED' } });
  }
};

/**
 * GET /government/children/:childId/irr/assessment
 * Government view = aggregate progression only — totalScore per session.
 * NO per-criterion data (same scope as parent, per Q2 decision).
 */
export const getAssessmentProgression = async (req, res) => {
  try {
    const child = await resolveGovernmentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }
    const irr = await getActiveIrr(child.id);
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const sessions = await AssessmentSession.findAll({
      where: { irrId: irr.id },
      attributes: ['id', 'sessionType', 'completedAt', 'totalScore', 'maxPossibleScore'],
      order: [['completedAt', 'ASC']],
    });
    return res.json({ success: true, data: sessions });
  } catch (error) {
    logger.error('government getAssessmentProgression error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_LIST_FAILED' } });
  }
};

/** GET /government/children/:childId/irr/goals */
export const getGoals = async (req, res) => {
  try {
    const child = await resolveGovernmentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }
    const irr = await getActiveIrr(child.id);
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const [longTermGoals, periods] = await Promise.all([
      LongTermGoal.findAll({ where: { irrId: irr.id }, order: [['createdAt', 'ASC']] }),
      GoalPeriod.findAll({ where: { irrId: irr.id }, order: [['periodStart', 'ASC']] }),
    ]);
    const periodIds = periods.map((p) => p.id);
    const shortTermGoals = periodIds.length
      ? await ShortTermGoal.findAll({
          where: { periodId: periodIds },
          order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
        })
      : [];
    return res.json({ success: true, data: { longTermGoals, periods, shortTermGoals } });
  } catch (error) {
    logger.error('government getGoals error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_LIST_FAILED' } });
  }
};
