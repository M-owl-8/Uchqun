import IRR from '../../models/IRR.js';
import AssessmentSession from '../../models/AssessmentSession.js';
import LongTermGoal from '../../models/LongTermGoal.js';
import ShortTermGoal from '../../models/ShortTermGoal.js';
import GoalPeriod from '../../models/GoalPeriod.js';
import Child from '../../models/Child.js';
import logger from '../../utils/logger.js';

// Parent must own the child (parentId = req.user.id).
// Returns child or null — 404 on any miss.
async function resolveParentChild(childId, req) {
  const child = await Child.findByPk(childId);
  if (!child) return null;
  if (child.parentId !== req.user.id) return null;
  return child;
}

// GET /parent/children/:childId/irr
// Returns: IRR header fields (no daily/weekly journal data — OQ-4 scope)
export const getChildIRR = async (req, res) => {
  try {
    const child = await resolveParentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }

    const irr = await IRR.findOne({
      where: { childId: child.id, status: 'active' },
      order: [['createdAt', 'DESC']],
    });
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }

    return res.json({ success: true, data: irr });
  } catch (error) {
    logger.error('parent getChildIRR error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'IRR_FETCH_FAILED' } });
  }
};

// GET /parent/children/:childId/irr/assessment
// Returns: aggregate score progression only (totalScore + date per session).
// Per OQ-4: NO per-criterion score data exposed to parents.
export const getAssessmentProgression = async (req, res) => {
  try {
    const child = await resolveParentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }

    const irr = await IRR.findOne({
      where: { childId: child.id, status: 'active' },
      order: [['createdAt', 'DESC']],
    });
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
    logger.error('parent getAssessmentProgression error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'ASSESSMENT_LIST_FAILED' } });
  }
};

// GET /parent/children/:childId/irr/goals
// Returns: long-term goals + short-term goals grouped by period.
// Per OQ-4 scope: goals are shared with parent; daily/weekly journal is not.
export const getGoals = async (req, res) => {
  try {
    const child = await resolveParentChild(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'IRR_CHILD_NOT_ACCESSIBLE' } });
    }

    const irr = await IRR.findOne({
      where: { childId: child.id, status: 'active' },
      order: [['createdAt', 'DESC']],
    });
    if (!irr) {
      return res.status(404).json({ success: false, error: { code: 'IRR_NOT_FOUND' } });
    }

    const [longTermGoals, periods] = await Promise.all([
      LongTermGoal.findAll({
        where: { irrId: irr.id },
        order: [['createdAt', 'ASC']],
      }),
      GoalPeriod.findAll({
        where: { irrId: irr.id },
        order: [['periodStart', 'ASC']],
      }),
    ]);

    const periodIds = periods.map(p => p.id);
    const shortTermGoals = periodIds.length
      ? await ShortTermGoal.findAll({
          where: { periodId: periodIds },
          order: [['sortOrder', 'ASC'], ['createdAt', 'ASC']],
        })
      : [];

    return res.json({
      success: true,
      data: { longTermGoals, periods, shortTermGoals },
    });
  } catch (error) {
    logger.error('parent getGoals error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'LONG_TERM_GOAL_LIST_FAILED' } });
  }
};
