import { Op } from 'sequelize';
import User from '../../models/User.js';
import Child from '../../models/Child.js';
import School from '../../models/School.js';
import ParentActivity from '../../models/ParentActivity.js';
import ParentMeal from '../../models/ParentMeal.js';
import ParentMedia from '../../models/ParentMedia.js';
import logger from '../../utils/logger.js';

/**
 * Get all Parents (read-only for Admin)
 * GET /api/admin/parents
 *
 * Business Logic:
 * - Admin can only view parents, cannot create/edit/delete
 * - Admin can view parents created by receptions they created
 */
export const getParents = async (req, res) => {
  try {
    // First, get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });

    const receptionIds = receptions.map(r => r.id);

    logger.info('Admin getParents', {
      adminId: req.user.id,
      receptionsFound: receptions.length,
      receptionIds: receptionIds,
    });

    // If admin has no receptions, return empty array
    if (receptionIds.length === 0) {
      logger.info('Admin has no receptions, returning empty parents list');
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get parents created by these receptions
    const parents = await User.findAll({
      where: {
        role: 'parent',
        createdBy: { [Op.in]: receptionIds }
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    logger.info('Parents found', {
      count: parents.length,
      parentRoles: parents.map(p => ({ id: p.id, role: p.role, email: p.email })),
    });

    // Double-check: filter out any non-parent roles (safety check)
    const filteredParents = parents.filter(p => p.role === 'parent');

    res.json({
      success: true,
      data: filteredParents,
    });
  } catch (error) {
    logger.error('Get parents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
};

/**
 * Get a specific Parent with their data (read-only for Admin)
 * GET /api/admin/parents/:id
 */
export const getParentById = async (req, res) => {
  try {
    const { id } = req.params;

    // First, get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });

    const receptionIds = receptions.map(r => r.id);

    const parent = await User.findOne({
      where: {
        id,
        role: 'parent',
        createdBy: { [Op.in]: receptionIds }
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Child,
          as: 'children',
          required: false,
          include: [{ model: School, as: 'childSchool', attributes: ['id', 'name'], required: false }],
        },
      ],
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Get parent's activities, meals, and media
    const [activities, meals, media] = await Promise.all([
      ParentActivity.findAll({
        where: { parentId: id },
        order: [['activityDate', 'DESC']],
        limit: 10,
      }),
      ParentMeal.findAll({
        where: { parentId: id },
        order: [['mealDate', 'DESC']],
        limit: 10,
      }),
      ParentMedia.findAll({
        where: { parentId: id },
        order: [['uploadDate', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        parent: parent.toJSON(),
        children: parent.children || [],
        activities,
        meals,
        media,
      },
    });
  } catch (error) {
    logger.error('Get parent by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent' });
  }
};
