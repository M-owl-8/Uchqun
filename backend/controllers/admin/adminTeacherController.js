import { Op } from 'sequelize';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

/**
 * Get all Teachers (read-only for Admin)
 * GET /api/admin/teachers
 *
 * Business Logic:
 * - Admin can only view teachers, cannot create/edit/delete
 * - Admin can view teachers created by receptions they created
 */
export const getTeachers = async (req, res) => {
  try {
    // First, get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });

    const receptionIds = receptions.map(r => r.id);

    logger.info('Admin getTeachers', {
      adminId: req.user.id,
      receptionsFound: receptions.length,
      receptionIds: receptionIds,
    });

    // If admin has no receptions, return empty array
    if (receptionIds.length === 0) {
      logger.info('Admin has no receptions, returning empty teachers list');
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get teachers created by these receptions
    const teachers = await User.findAll({
      where: {
        role: 'teacher',
        createdBy: { [Op.in]: receptionIds }
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    logger.info('Teachers found', {
      count: teachers.length,
      teacherIds: teachers.map(t => t.id),
    });

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    logger.error('Get teachers error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};
