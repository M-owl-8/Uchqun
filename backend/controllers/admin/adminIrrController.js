// CROSS-IRR-VISIBILITY — admin read-only IRR endpoints.
//
// The admin (school Direktor) sees the IRR of any child in their school.
// Mounted under /admin/children/:childId/irr* so the route boundary is
// explicit per role — even though the controller pattern mirrors the
// parent and (forthcoming) government controllers. Audit-clarity over DRY.
//
// Three reads:
//   GET /admin/children/:childId/irr             → IRR header
//   GET /admin/children/:childId/irr/assessment  → score progression (full,
//                                                  per-criterion access OK)
//   GET /admin/children/:childId/irr/goals       → long-term + periods + STGs
//
// Admin scope is the school. resolveAdminChild returns null on school-mismatch
// → 404 (NOT 403) — same opacity rule as every other child-scoped surface so
// we never leak the existence of an out-of-school resource.

import IRR from '../../models/IRR.js';
import AssessmentSession from '../../models/AssessmentSession.js';
import AssessmentScore from '../../models/AssessmentScore.js';
import LongTermGoal from '../../models/LongTermGoal.js';
import ShortTermGoal from '../../models/ShortTermGoal.js';
import GoalPeriod from '../../models/GoalPeriod.js';
import Child from '../../models/Child.js';
import logger from '../../utils/logger.js';

async function resolveAdminChild(childId, req) {
  if (req.user.role !== 'admin') return null;
  const child = await Child.findByPk(childId);
  if (!child) return null;
  // Admin sees only children in their school. Both must be set; a NULL on
  // either side means we can't establish the scope and we fail closed.
  if (!child.schoolId || !req.user.schoolId) return null;
  if (child.schoolId !== req.user.schoolId) return null;
  return child;
}

async function getActiveIrr(childId) {
  return IRR.findOne({
    where: { childId, status: 'active' },
    order: [['createdAt', 'DESC']],
  });
}

export const getChildIRR = async (req, res) => {
  try {
    const child = await resolveAdminChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }
    const irr = await getActiveIrr(child.id);
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('admin getChildIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_FETCH_FAILED' } });
  }
};

export const getAssessmentProgression = async (req, res) => {
  try {
    const child = await resolveAdminChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }
    const irr = await getActiveIrr(child.id);
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }
    const sessions = await AssessmentSession.findAll({
      where: { irrId: irr.id },
      include: [{
        model: AssessmentScore,
        as: 'scores',
        attributes: ['criterionKey', 'score'],
      }],
      order: [['completedAt', 'ASC']],
    });
    return res.json({ success: true, data: sessions });
  } catch (error) {
    logger.error('admin getAssessmentProgression error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_LIST_FAILED' } });
  }
};

export const getGoals = async (req, res) => {
  try {
    const child = await resolveAdminChild(req.params.childId, req);
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
    logger.error('admin getGoals error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_LIST_FAILED' } });
  }
};
