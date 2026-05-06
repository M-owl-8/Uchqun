import User from '../../models/User.js';
import ParentActivity from '../../models/ParentActivity.js';
import Child from '../../models/Child.js';
import Activity from '../../models/Activity.js';
import logger from '../../utils/logger.js';
import { parsePagination } from '../../utils/pagination.js';
import { Op } from 'sequelize';

/**
 * Get parent's activities (from their group)
 * GET /api/parent/activities
 *
 * Business Logic:
 * - Parents see ALL activities from their group (any child in same group)
 * - Queries teacher-created activities linked to children via groupId
 */
export const getMyActivities = async (req, res) => {
  try {
    const { activityType, startDate, endDate, childId } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    // Get parent's groupId
    const parent = await User.findByPk(req.user.id, { attributes: ['groupId'] });

    if (!parent || !parent.groupId) {
      // Fallback to legacy parent_activities if no group assigned
      const where = { parentId: req.user.id };

      if (activityType) {
        where.activityType = activityType;
      }

      if (startDate || endDate) {
        where.activityDate = {};
        if (startDate) where.activityDate[Op.gte] = new Date(startDate);
        if (endDate) where.activityDate[Op.lte] = new Date(endDate);
      }

      const activities = await ParentActivity.findAndCountAll({
        where,
        limit: limit,
        offset: offset,
        order: [['activityDate', 'DESC']],
      });

      return res.json({
        success: true,
        data: activities.rows,
        total: activities.count,
        limit: limit,
        offset: offset,
      });
    }

    const myChildren = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['id'],
    });
    const myChildIds = myChildren.map((child) => child.id);

    if (myChildIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: limit,
        offset: offset,
      });
    }

    if (childId && !myChildIds.includes(childId)) {
      return res.status(403).json({ error: 'You do not have access to this child' });
    }

    // Query teacher-created activities only for this parent's child(ren)
    const whereActivity = {};

    if (activityType) {
      whereActivity.type = activityType;
    }

    if (startDate || endDate) {
      whereActivity.date = {};
      if (startDate) whereActivity.date[Op.gte] = new Date(startDate);
      if (endDate) whereActivity.date[Op.lte] = new Date(endDate);
    }

    const activities = await Activity.findAndCountAll({
      where: whereActivity,
      include: [{
        model: Child,
        as: 'child',
        where: {
          id: childId ? childId : { [Op.in]: myChildIds },
        },
        attributes: ['id', 'firstName', 'lastName', 'photo'],
        required: true,
      }],
      limit: limit,
      offset: offset,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: activities.rows,
      total: activities.count,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    logger.error('Get my activities error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

/**
 * Get a specific activity
 * GET /api/parent/activities/:id
 */
export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await ParentActivity.findOne({
      where: { id, parentId: req.user.id },
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error('Get activity by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};
