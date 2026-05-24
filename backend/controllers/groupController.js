import { Op } from 'sequelize';
import Group from '../models/Group.js';
import User from '../models/User.js';
import School from '../models/School.js';
import logger from '../utils/logger.js';

export const getGroups = async (req, res) => {
  try {
    const { search, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const where = {};

    // Scope to the user's school. Government (schoolId=null) sees all schools.
    if (req.user.schoolId) {
      where.schoolId = req.user.schoolId;
    }

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    // If user is reception, only show groups for teachers they created
    // Admin can see groups for teachers created by receptions they created
    const includeTeacher = {
      model: User,
      as: 'teacher',
      attributes: ['id', 'firstName', 'lastName', 'email'],
      required: true,
    };

    if (req.user.role === 'reception') {
      // RE-14 fix: school-scope (any reception can see all school teachers' groups)
      includeTeacher.where = { schoolId: req.user.schoolId };
    } else if (req.user.role === 'admin') {
      // Get all receptions created by this admin
      const receptions = await User.findAll({
        where: { role: 'reception', createdBy: req.user.id },
        attributes: ['id'],
      });

      const receptionIds = receptions.map(r => r.id);

      // If admin has no receptions, return empty array
      if (receptionIds.length === 0) {
        return res.json({
          success: true,
          data: [],
          total: 0,
          limit: limitNum,
          offset: offsetNum,
        });
      }

      // Filter teachers created by these receptions
      includeTeacher.where = { createdBy: { [Op.in]: receptionIds } };
    } else if (req.user.role === 'teacher') {
      // Teacher only sees their own groups
      includeTeacher.where = { id: req.user.id };
    }

    const groups = await Group.findAndCountAll({
      where,
      limit: limitNum,
      offset: offsetNum,
      order: [['name', 'ASC']],
      include: [
        includeTeacher,
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    res.json({
      success: true,
      data: groups.rows,
      total: groups.count,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    logger.error('Get groups error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get groups' });
  }
};

export const getGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findByPk(id, {
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        { model: School, as: 'school', attributes: ['id', 'name'], required: false },
      ],
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // School isolation: non-government users cannot access groups from other schools
    if (req.user.schoolId && group.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // Admins can only view groups whose teacher was created by receptions they created
    if (req.user.role === 'admin') {
      const teacher = await User.findByPk(group.teacherId, { attributes: ['id', 'createdBy'] });
      const receptions = await User.findAll({
        where: { role: 'reception', createdBy: req.user.id },
        attributes: ['id'],
      });
      const receptionIds = receptions.map(r => r.id);
      if (!teacher || !receptionIds.includes(teacher.createdBy)) {
        return res.status(403).json({ error: 'Access denied to this group' });
      }
    }

    res.json(group);
  } catch (error) {
    logger.error('Get group error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get group' });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name, description, teacherId, capacity, ageRange } = req.body;

    // RE-13 fix: scope teacher lookup to the reception's own school
    const teacher = await User.findOne({ where: { id: teacherId, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) {
      return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
    }

    const group = await Group.create({
      name,
      description,
      teacherId,
      capacity,
      ageRange,
      schoolId: req.user.schoolId,
    });

    await group.reload({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.status(201).json(group);
  } catch (error) {
    logger.error('Create group error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const updateGroup = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, teacherId, capacity, ageRange } = req.body;

    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // RE-12 fix: two-part condition (matches getGroup pattern) — null group.schoolId is now also blocked
    if (!group.schoolId || group.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // RE-13 fix: scope teacher lookup to own school
    if (teacherId && teacherId !== group.teacherId) {
      const teacher = await User.findOne({ where: { id: teacherId, role: 'teacher', schoolId: req.user.schoolId } });
      if (!teacher) {
        return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
      }
    }

    await group.update({
      name,
      description,
      teacherId: teacherId || group.teacherId,
      capacity,
      ageRange,
    });

    await group.reload({
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.json(group);
  } catch (error) {
    logger.error('Update group error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update group' });
  }
};

export const deleteGroup = async (req, res) => {
  try {
    const { id } = req.params;

    const group = await Group.findByPk(id);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // RE-12 fix: two-part condition — null group.schoolId is also blocked
    if (!group.schoolId || group.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    await group.destroy();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    logger.error('Delete group error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete group' });
  }
};


