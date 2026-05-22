import { Op } from 'sequelize';
import User from '../../models/User.js';
import Group from '../../models/Group.js';
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

/**
 * Get a single Teacher with their groups (read-only for Admin)
 * GET /api/admin/teachers/:id
 *
 * Business Logic:
 * - Admin can only view teachers, not create/edit/delete
 * - Scope: teacher must have been created by a reception that this admin created
 *   (ensures school isolation via the createdBy chain)
 */
export const getTeacherById = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'TEACHER_FORBIDDEN' } });
  }
  try {
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });
    const receptionIds = receptions.map(r => r.id);

    if (receptionIds.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
    }

    const teacher = await User.findOne({
      where: { id: req.params.id, role: 'teacher', createdBy: { [Op.in]: receptionIds } },
      attributes: { exclude: ['password'] },
    });

    if (!teacher) {
      return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
    }

    const groups = await Group.findAll({
      where: { teacherId: teacher.id },
      attributes: ['id', 'name', 'ageRange', 'capacity'],
    });

    return res.json({ success: true, data: { ...teacher.toJSON(), groups } });
  } catch (error) {
    logger.error('getTeacherById error', { error: error.message, adminId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'TEACHER_FETCH_FAILED' } });
  }
};
