import User from '../../models/User.js';
import Group from '../../models/Group.js';
import ParentActivity from '../../models/ParentActivity.js';
import ParentMeal from '../../models/ParentMeal.js';
import ParentMedia from '../../models/ParentMedia.js';
import logger from '../../utils/logger.js';

/**
 * Get parent profile with summary
 * GET /api/parent/profile
 */
export const getMyProfile = async (req, res) => {
  try {
    // Fetch user with relationships (assigned teacher and group)
    const userWithRelations = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: User,
          as: 'assignedTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false,
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'description'],
          required: false,
        },
      ],
    });

    const activitiesCount = await ParentActivity.count({
      where: { parentId: req.user.id },
    });

    const mealsCount = await ParentMeal.count({
      where: { parentId: req.user.id },
    });

    const mediaCount = await ParentMedia.count({
      where: { parentId: req.user.id },
    });

    res.json({
      success: true,
      data: {
        user: userWithRelations.toJSON(),
        summary: {
          activitiesCount,
          mealsCount,
          mediaCount,
        },
      },
    });
  } catch (error) {
    logger.error('Get my profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Get parent data for viewing (used when clicking on parent in list)
 * GET /api/parent/:parentId/data
 *
 * Business Logic:
 * - When viewing the list of parents, clicking on a parent should display:
 *   - Activity
 *   - Meals
 *   - Media
 * - This endpoint can be accessed by Admin or Reception to view parent data
 */
export const getParentData = async (req, res) => {
  try {
    const { parentId } = req.params;

    // Verify the user is a parent AND belongs to the same school
    const where = { id: parentId, role: 'parent' };
    if (req.user.schoolId) {
      where.schoolId = req.user.schoolId;
    }

    const parent = await User.findOne({
      where,
      attributes: { exclude: ['password'] },
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Get all parent data
    const [activities, meals, media] = await Promise.all([
      ParentActivity.findAll({
        where: { parentId: parentId },
        order: [['activityDate', 'DESC']],
        limit: 10,
      }),
      ParentMeal.findAll({
        where: { parentId: parentId },
        order: [['mealDate', 'DESC']],
        limit: 10,
      }),
      ParentMedia.findAll({
        where: { parentId: parentId },
        order: [['uploadDate', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        parent: parent.toJSON(),
        activities,
        meals,
        media,
      },
    });
  } catch (error) {
    logger.error('Get parent data error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent data' });
  }
};
