import { Op } from 'sequelize';
import Group from '../models/Group.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const getGroups = async (req, res) => {
  try {
    const { search, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const where = {};
    
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
      includeTeacher.where = { createdBy: req.user.id };
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
          groups: [],
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
      include: [includeTeacher],
    });

    res.json({
      groups: groups.rows,
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
      ],
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Admins can only view groups whose teacher was created by receptions they created
    if (req.user.role === 'admin') {
      // Get all receptions created by this admin
      const receptions = await User.findAll({
        where: { role: 'reception', createdBy: req.user.id },
        attributes: ['id'],
      });

      const receptionIds = receptions.map(r => r.id);

      // Check if teacher was created by one of these receptions
      if (!receptionIds.includes(group.teacher?.createdBy)) {
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

    // Verify teacher exists
    const teacher = await User.findByPk(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(400).json({ error: 'Invalid teacher ID' });
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

    if (req.user.schoolId && group.schoolId && group.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    // If teacherId is being updated, verify teacher exists
    if (teacherId && teacherId !== group.teacherId) {
      const teacher = await User.findByPk(teacherId);
      if (!teacher || teacher.role !== 'teacher') {
        return res.status(400).json({ error: 'Invalid teacher ID' });
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

    if (req.user.schoolId && group.schoolId && group.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this group' });
    }

    await group.destroy();

    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    logger.error('Delete group error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete group' });
  }
};


