import TeacherResponsibility from '../models/TeacherResponsibility.js';
import TeacherTask from '../models/TeacherTask.js';
import TeacherWorkHistory from '../models/TeacherWorkHistory.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

export const getMyResponsibilities = async (req, res) => {
  try {
    const { status, priority } = req.query;
    const where = { teacherId: req.user.id };
    if (status) where.status = status;
    if (priority) where.priority = priority;

    const responsibilities = await TeacherResponsibility.findAll({
      where,
      order: [['assignedDate', 'DESC']],
    });
    res.json({ success: true, data: responsibilities });
  } catch (error) {
    logger.error('Get responsibilities error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch responsibilities' });
  }
};

export const getResponsibilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const responsibility = await TeacherResponsibility.findOne({
      where: { id, teacherId: req.user.id },
    });
    if (!responsibility) return res.status(404).json({ error: 'Responsibility not found' });
    res.json({ success: true, data: responsibility });
  } catch (error) {
    logger.error('Get responsibility by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch responsibility' });
  }
};

export const getMyTasks = async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    const where = { teacherId: req.user.id };
    if (status) where.status = status;
    if (startDate || endDate) {
      where.taskDate = {};
      if (startDate) where.taskDate[Op.gte] = new Date(startDate);
      if (endDate) where.taskDate[Op.lte] = new Date(endDate);
    }

    const tasks = await TeacherTask.findAll({ where, order: [['taskDate', 'DESC']] });
    res.json({ success: true, data: tasks });
  } catch (error) {
    logger.error('Get tasks error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

export const getTaskById = async (req, res) => {
  try {
    const { id } = req.params;
    const task = await TeacherTask.findOne({ where: { id, teacherId: req.user.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (error) {
    logger.error('Get task by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch task' });
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });
    const validStatuses = ['pending', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const task = await TeacherTask.findOne({ where: { id, teacherId: req.user.id } });
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.status = status;
    if (notes) task.notes = notes;
    if (status === 'completed') task.completedAt = new Date();
    await task.save();

    logger.info('Task status updated', { taskId: task.id, teacherId: req.user.id, status });
    res.json({ success: true, message: 'Task status updated successfully', data: task });
  } catch (error) {
    logger.error('Update task status error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update task status' });
  }
};

export const getMyWorkHistory = async (req, res) => {
  try {
    const { status, workType, startDate, endDate } = req.query;
    const where = { teacherId: req.user.id };
    if (status) where.status = status;
    if (workType) where.workType = workType;
    if (startDate || endDate) {
      where.workDate = {};
      if (startDate) where.workDate[Op.gte] = new Date(startDate);
      if (endDate) where.workDate[Op.lte] = new Date(endDate);
    }

    const workHistory = await TeacherWorkHistory.findAll({ where, order: [['workDate', 'DESC']] });

    const now = new Date();
    const upcoming = workHistory.filter(i => i.deadline && new Date(i.deadline) > now && i.status !== 'completed');
    const overdue = workHistory.filter(i => i.deadline && new Date(i.deadline) < now && i.status !== 'completed');
    const completed = workHistory.filter(i => i.status === 'completed');

    res.json({
      success: true,
      data: workHistory,
      summary: { total: workHistory.length, upcoming: upcoming.length, overdue: overdue.length, completed: completed.length },
    });
  } catch (error) {
    logger.error('Get work history error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch work history' });
  }
};

export const getWorkHistoryById = async (req, res) => {
  try {
    const { id } = req.params;
    const workHistory = await TeacherWorkHistory.findOne({ where: { id, teacherId: req.user.id } });
    if (!workHistory) return res.status(404).json({ error: 'Work history item not found' });
    res.json({ success: true, data: workHistory });
  } catch (error) {
    logger.error('Get work history by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch work history item' });
  }
};

export const updateWorkHistoryStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required' });
    const validStatuses = ['pending', 'in_progress', 'completed', 'overdue', 'cancelled'];
    if (!validStatuses.includes(status)) return res.status(400).json({ error: 'Invalid status' });

    const workHistory = await TeacherWorkHistory.findOne({ where: { id, teacherId: req.user.id } });
    if (!workHistory) return res.status(404).json({ error: 'Work history item not found' });

    workHistory.status = status;
    if (notes) workHistory.notes = notes;
    if (status === 'completed') workHistory.completedAt = new Date();
    await workHistory.save();

    logger.info('Work history status updated', { workHistoryId: workHistory.id, teacherId: req.user.id, status });
    res.json({ success: true, message: 'Work history status updated successfully', data: workHistory });
  } catch (error) {
    logger.error('Update work history status error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update work history status' });
  }
};
