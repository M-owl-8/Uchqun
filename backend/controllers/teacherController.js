import User from '../models/User.js';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import School from '../models/School.js';
import TeacherResponsibility from '../models/TeacherResponsibility.js';
import TeacherTask from '../models/TeacherTask.js';
import TeacherWorkHistory from '../models/TeacherWorkHistory.js';
import GovernmentMessage from '../models/GovernmentMessage.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export const getMyProfile = async (req, res) => {
  try {
    const teacher = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    const [responsibilities, tasks, workHistory] = await Promise.all([
      TeacherResponsibility.findAll({ where: { teacherId: req.user.id }, order: [['assignedDate', 'DESC']] }),
      TeacherTask.findAll({ where: { teacherId: req.user.id }, order: [['taskDate', 'DESC']] }),
      TeacherWorkHistory.findAll({ where: { teacherId: req.user.id }, order: [['workDate', 'DESC']] }),
    ]);

    res.json({ success: true, data: { teacher: teacher.toJSON(), responsibilities, tasks, workHistory } });
  } catch (error) {
    logger.error('Get teacher profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teacher profile' });
  }
};

export const getDashboard = async (req, res) => {
  try {
    const [responsibilitiesCount, tasksCount, workHistoryCount] = await Promise.all([
      TeacherResponsibility.count({ where: { teacherId: req.user.id, status: 'active' } }),
      TeacherTask.count({ where: { teacherId: req.user.id, status: { [Op.in]: ['pending', 'in_progress'] } } }),
      TeacherWorkHistory.count({
        where: { teacherId: req.user.id, status: { [Op.in]: ['pending', 'in_progress'] }, deadline: { [Op.lte]: new Date() } },
      }),
    ]);

    const upcomingDeadlines = await TeacherWorkHistory.findAll({
      where: {
        teacherId: req.user.id,
        status: { [Op.in]: ['pending', 'in_progress'] },
        deadline: { [Op.gte]: new Date() },
      },
      order: [['deadline', 'ASC']],
      limit: 5,
    });

    res.json({
      success: true,
      data: {
        summary: { activeResponsibilities: responsibilitiesCount, pendingTasks: tasksCount, overdueWork: workHistoryCount },
        upcomingDeadlines,
      },
    });
  } catch (error) {
    logger.error('Get dashboard error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
};

export const getParents = async (req, res) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;
    const where = { role: 'parent' };

    if (req.user.role === 'admin' || req.user.role === 'reception') {
      if (req.user.schoolId) where.schoolId = req.user.schoolId;
    }

    if (req.user.role === 'teacher') {
      const teacherGroups = await Group.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] });
      const groupIds = teacherGroups.map(g => g.id);
      if (groupIds.length > 0) {
        where[Op.or] = [{ groupId: { [Op.in]: groupIds } }, { teacherId: req.user.id }];
      } else {
        where.teacherId = req.user.id;
      }
    }

    if (search) {
      const searchCondition = {
        [Op.or]: [
          { firstName: { [Op.iLike]: `%${search}%` } },
          { lastName: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
          { phone: { [Op.iLike]: `%${search}%` } },
        ],
      };
      if (where[Op.or]) {
        where[Op.and] = [{ [Op.or]: where[Op.or] }, searchCondition];
        delete where[Op.or];
      } else {
        Object.assign(where, searchCondition);
      }
    }

    const { count, rows: parents } = await User.findAndCountAll({
      where,
      attributes: { exclude: ['password'] },
      include: [
        { model: Child, as: 'children', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'class', 'teacher'], include: [{ model: School, as: 'childSchool', attributes: ['id', 'name'], required: false }], required: false },
        { model: Group, as: 'group', attributes: ['id', 'name'], required: false },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({ parents: parents.map(p => p.toJSON()), total: count, limit: parseInt(limit), offset: parseInt(offset) });
  } catch (error) {
    logger.error('Get parents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
};

export const getParentById = async (req, res) => {
  try {
    const { id } = req.params;
    const where = { id, role: 'parent' };
    if (req.user.schoolId) where.schoolId = req.user.schoolId;

    const parent = await User.findOne({
      where,
      attributes: { exclude: ['password'] },
      include: [{ model: Child, as: 'children', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'class', 'teacher'], include: [{ model: School, as: 'childSchool', attributes: ['id', 'name'], required: false }], required: false }],
    });

    if (!parent) return res.status(404).json({ error: 'Parent not found' });
    res.json({ success: true, data: parent.toJSON() });
  } catch (error) {
    logger.error('Get parent by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent' });
  }
};

export const getMyMessages = async (req, res) => {
  try {
    const messages = await GovernmentMessage.findAll({
      where: { senderId: req.user.id },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: messages.map(m => m.toJSON()) });
  } catch (error) {
    logger.error('Get my messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

export const getMyGroups = async (req, res) => {
  try {
    const groups = await Group.findAll({
      where: { teacherId: req.user.id },
      include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName', 'email'] }],
      order: [['name', 'ASC']],
    });

    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const parentCount = await User.count({ where: { role: 'parent', groupId: group.id } });
        return { ...group.toJSON(), parentCount };
      })
    );

    res.json({ success: true, data: groupsWithCounts });
  } catch (error) {
    logger.error('Get my groups error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

export const getTeacherRatings = async (req, res) => {
  try {
    const where = { role: 'teacher' };
    if (req.user.schoolId) where.schoolId = req.user.schoolId;

    const teachers = await User.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'email', 'avatar', 'rating', 'totalRatings'],
      order: [['rating', 'DESC'], ['totalRatings', 'DESC'], ['firstName', 'ASC']],
    });

    const teachersWithRank = teachers.map((teacher, index) => ({ ...teacher.toJSON(), rank: index + 1 }));
    res.json({ success: true, data: teachersWithRank });
  } catch (error) {
    logger.error('Get teacher ratings error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teacher ratings' });
  }
};
