import Child from '../../models/Child.js';
import logger from '../../utils/logger.js';

/**
 * Get parent's children
 * GET /api/parent/children
 *
 * Business Logic:
 * - Parents can view their own children
 */
export const getMyChildren = async (req, res) => {
  try {
    const children = await Child.findAll({
      where: { parentId: req.user.id },
      order: [['firstName', 'ASC']],
    });

    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    logger.error('Get my children error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch children' });
  }
};
