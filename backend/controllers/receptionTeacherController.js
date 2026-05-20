import User from '../models/User.js';
import TeacherRating from '../models/TeacherRating.js';
import logger from '../utils/logger.js';
import { fn, col } from 'sequelize';

export const createTeacher = async (req, res) => {
  try {
    if (!req.user.schoolId) {
      return res.status(403).json({ error: 'School assignment required. Contact your administrator to assign your account to a school before creating staff.' });
    }

    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

    const teacher = await User.create({
      email: email.toLowerCase(), password, firstName, lastName, phone,
      role: 'teacher', isActive: true, createdBy: req.user.id, schoolId: req.user.schoolId,
    });

    logger.info('Teacher created by Reception', { teacherId: teacher.id, email: teacher.email, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Teacher account created successfully', data: teacher.toJSON() });
  } catch (error) {
    logger.error('Create teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create teacher account' });
  }
};

export const getTeacherRatings = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const summaryRaw = await TeacherRating.findOne({
      where: { teacherId: id },
      attributes: [[fn('AVG', col('stars')), 'averageStars'], [fn('COUNT', col('id')), 'totalRatings']],
      raw: true,
    });

    const ratings = await TeacherRating.findAll({
      where: { teacherId: id },
      order: [['updatedAt', 'DESC']],
      limit: 20,
      include: [{ model: User, as: 'ratingParent', attributes: ['id', 'firstName', 'lastName', 'email'] }],
    });

    const average = summaryRaw?.averageStars ? Number(parseFloat(summaryRaw.averageStars).toFixed(2)) : 0;
    const count = summaryRaw?.totalRatings ? Number(summaryRaw.totalRatings) : 0;

    res.json({
      success: true,
      data: {
        teacher: teacher.toJSON(),
        summary: { average, count },
        ratings: ratings.map((r) => ({
          ...r.toJSON(),
          parentName: r.ratingParent ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim() : null,
        })),
      },
    });
  } catch (error) {
    logger.error('Get teacher ratings error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teacher ratings' });
  }
};

export const getTeachers = async (req, res) => {
  try {
    const teachers = await User.findAll({
      where: { role: 'teacher', schoolId: req.user.schoolId },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: teachers });
  } catch (error) {
    logger.error('Get teachers error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, firstName, lastName, phone } = req.body;

    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = password;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone === '' ? null : phone;

    await teacher.update(updateData);
    await teacher.reload();

    logger.info('Teacher updated by Reception', { teacherId: teacher.id, updatedBy: req.user.id });
    res.json({ success: true, message: 'Teacher updated successfully', data: teacher.toJSON() });
  } catch (error) {
    logger.error('Update teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update teacher' });
  }
};

export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    await teacher.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'admin_delete' });
    logger.info('Teacher deleted by Reception', { teacherId: id, deletedBy: req.user.id });
    res.json({ success: true, message: 'Teacher deleted successfully' });
  } catch (error) {
    logger.error('Delete teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
};
