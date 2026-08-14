import User from '../models/User.js';
import Child from '../models/Child.js';
import { validateChildAccess } from '../utils/schoolValidation.js';
import Group from '../models/Group.js';
import School from '../models/School.js';
import Activity from '../models/Activity.js';
import Meal from '../models/Meal.js';
import Media from '../models/Media.js';
import EmotionalMonitoring from '../models/EmotionalMonitoring.js';
import TeacherResponsibility from '../models/TeacherResponsibility.js';
import TeacherTask from '../models/TeacherTask.js';
import TeacherWorkHistory from '../models/TeacherWorkHistory.js';
import GovernmentMessage from '../models/GovernmentMessage.js';
import ChildAttendance from '../models/ChildAttendance.js';
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

export const getDashboardCounts = async (req, res) => {
  try {
    const teacherGroups = await Group.findAll({ where: { teacherId: req.user.id }, attributes: ['id'] });
    const groupIds = teacherGroups.map(g => g.id);

    const parentWhere = { role: 'parent' };
    if (groupIds.length > 0) {
      parentWhere[Op.or] = [{ groupId: { [Op.in]: groupIds } }, { teacherId: req.user.id }];
    } else {
      parentWhere.teacherId = req.user.id;
    }

    const parents = await User.findAll({
      where: parentWhere,
      attributes: ['id'],
      include: [{ model: Child, as: 'children', attributes: ['id'], required: false }],
    });

    const childIds = parents.flatMap(p => p.children.map(c => c.id)).filter(Boolean);
    const childScope = childIds.length ? { childId: { [Op.in]: childIds } } : null;

    const [activitiesCount, mealsCount, mediaCount, monitoringCount, teacher] = await Promise.all([
      childScope ? Activity.count({ where: childScope }) : Promise.resolve(0),
      childScope ? Meal.count({ where: childScope }) : Promise.resolve(0),
      childScope ? Media.count({ where: childScope }) : Promise.resolve(0),
      EmotionalMonitoring.count({ where: { teacherId: req.user.id } }),
      User.findByPk(req.user.id, { attributes: ['rating', 'totalRatings'] }),
    ]);

    // D-07 (scope extension): this endpoint has never returned an attendance
    // figure. The dashboard's `rawStats.present || … || rawChildren.length`
    // therefore always fell through to the head count and rendered a fabricated
    // "3/3 keldi · 100%". Removing that fallback stopped the lie but left the
    // panel permanently on "not yet recorded", because there was still no number
    // to show. Return today's real counts for the teacher's own children.
    const groupChildren = groupIds.length
      ? await Child.findAll({
        where: { [Op.or]: [{ groupId: { [Op.in]: groupIds } }, { parentId: { [Op.in]: parents.map(p => p.id) } }] },
        attributes: ['id'],
      })
      : [];
    const scopedChildIds = [...new Set(groupChildren.map(c => c.id))];
    const today = new Date().toISOString().slice(0, 10);
    let attendanceToday = null;
    if (scopedChildIds.length) {
      const rows = await ChildAttendance.findAll({
        where: { childId: { [Op.in]: scopedChildIds }, date: today },
        attributes: ['childId', 'status'],
      });
      // null = nobody has taken attendance today; a number = a real count.
      if (rows.length) {
        attendanceToday = {
          present: rows.filter(r => r.status === 'present').length,
          recorded: rows.length,
          total: scopedChildIds.length,
        };
      }
    }

    res.json({
      success: true,
      data: {
        parents: parents.length,
        activities: activitiesCount,
        meals: mealsCount,
        media: mediaCount,
        statusEntries: monitoringCount,
        rating: Number(teacher?.rating || 0).toFixed(1),
        ratingsCount: Number(teacher?.totalRatings || 0),
        ...(attendanceToday ? { present: attendanceToday.present, total: attendanceToday.total } : {}),
      },
    });
  } catch (error) {
    logger.error('Get dashboard counts error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch dashboard counts' });
  }
};

export const getParents = async (req, res) => {
  try {
    const { search, limit = 100, offset = 0 } = req.query;

    // Teacher path — canonical chain only (Teacher→Group→Child→Parent).
    // Denormalized users.groupId / users.teacherId are NOT used for scoping.
    if (req.user.role === 'teacher') {
      const { listTeacherParents } = await import('../services/teacherParentScope.js');
      const { rows: parents, count } = await listTeacherParents(req.user.id, { search, limit, offset });
      return res.json({ parents: parents.map(p => p.toJSON()), total: count, limit: parseInt(limit), offset: parseInt(offset) });
    }

    // Admin / reception path — school-scoped.
    const where = { role: 'parent', schoolId: req.user.schoolId };

    if (search) {
      where[Op.or] = [
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName:  { [Op.iLike]: `%${search}%` } },
        { email:     { [Op.iLike]: `%${search}%` } },
        { phone:     { [Op.iLike]: `%${search}%` } },
      ];
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
    where.schoolId = req.user.schoolId;

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
    where.schoolId = req.user.schoolId;

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

export const getChildren = async (req, res) => {
  try {
    const where = { schoolId: req.user.schoolId };

    // D-01: a teacher must only be offered the children they are actually allowed to
    // record against. This mirrors isTeacherAssignedToChild() (utils/schoolValidation.js:45)
    // — group ownership, plus the legacy parent.teacherId path. Returning the whole
    // school here is what let the attendance grid show children whose records the
    // write path then silently refused.
    // requireTeacher also admits reception and admin (CLAUDE.md); they keep school scope.
    if (req.user.role === 'teacher') {
      const ownGroups = await Group.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      const ownParents = await User.findAll({
        where: { teacherId: req.user.id, role: 'parent' },
        attributes: ['id'],
      });
      const groupIds = ownGroups.map(g => g.id);
      const parentIds = ownParents.map(u => u.id);
      const or = [];
      if (groupIds.length) or.push({ groupId: { [Op.in]: groupIds } });
      if (parentIds.length) or.push({ parentId: { [Op.in]: parentIds } });
      // No group and no legacy parent link → no children, not the whole school.
      where[Op.or] = or.length ? or : [{ id: null }];
    }

    // D-12: groupName was never returned, so the teacher dashboard rendered
    // `"" Guruh · 3 bola.` — literal empty quotes on the first screen of the app.
    const children = await Child.findAll({
      where,
      attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'schoolId', 'groupId', 'class'],
      include: [{ model: Group, as: 'childGroup', attributes: ['id', 'name'], required: false }],
      order: [['lastName', 'ASC'], ['firstName', 'ASC']],
    });

    return res.json({
      success: true,
      data: children.map((c) => {
        const json = c.toJSON();
        json.groupName = json.childGroup?.name ?? null;
        delete json.childGroup;
        return json;
      }),
    });
  } catch (error) {
    logger.error('getChildren error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to fetch children' });
  }
};

export const getChildById = async (req, res) => {
  try {
    const { id } = req.params;

    const child = await validateChildAccess(id, req);
    if (!child) return res.status(404).json({ success: false, error: 'Child not found' });

    return res.json({ success: true, data: child });
  } catch (error) {
    logger.error('getChildById error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to fetch child' });
  }
};
