import ChildGoal from '../../models/ChildGoal.js';
import ChildGoalReview from '../../models/ChildGoalReview.js';
import Child from '../../models/Child.js';
import logger from '../../utils/logger.js';

export const listByChildAsAdmin = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'GOAL_FORBIDDEN' } });
  }

  try {
    const { id: childId } = req.params;

    const child = await Child.findOne({ where: { id: childId, schoolId: req.user.schoolId } });
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'GOAL_CHILD_NOT_ACCESSIBLE' } });
    }

    const goals = await ChildGoal.findAll({
      where: { childId },
      order: [['createdAt', 'DESC']],
      include: [{ model: ChildGoalReview, as: 'reviews', attributes: ['id', 'reviewDate', 'status'] }],
    });

    return res.json({ success: true, data: goals });
  } catch (error) {
    logger.error('listByChildAsAdmin goals error', { error: error.message, childId: req.params.id });
    return res.status(500).json({ success: false, error: { code: 'GOAL_LIST_FAILED' } });
  }
};
