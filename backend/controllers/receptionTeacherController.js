import crypto from 'crypto';
import User from '../models/User.js';
import TeacherRating from '../models/TeacherRating.js';
import logger from '../utils/logger.js';
import { fn, col } from 'sequelize';
import { logAudit } from '../utils/auditLogger.js';
import { resolveEmailDomain, isValidLocalPart } from '../utils/accountDomain.js';

// Fisher-Yates shuffle using crypto bytes; 12 chars; upper+lower+digit guaranteed
function generateTempPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const all = upper + lower + digits;
  const bytes = crypto.randomBytes(12);
  let pwd = upper[bytes[0] % upper.length]
    + lower[bytes[1] % lower.length]
    + digits[bytes[2] % digits.length];
  for (let i = 3; i < 12; i++) pwd += all[bytes[i] % all.length];
  const shuf = crypto.randomBytes(11);
  const arr = pwd.split('');
  for (let i = 11; i > 0; i--) {
    const j = shuf[i - 1] % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export const createTeacher = async (req, res) => {
  try {
    if (!req.user.schoolId) {
      return res.status(403).json({ success: false, error: { code: 'ACCOUNT_CREATE_FORBIDDEN_HIERARCHY', detail: 'school assignment required' } });
    }

    const { localPart, password, firstName, lastName, phone } = req.body;

    if (!localPart || !password || !firstName || !lastName) {
      return res.status(400).json({ success: false, error: { code: 'TEACHER_CREATE_INVALID', detail: 'localPart, password, firstName, lastName are required' } });
    }

    if (!isValidLocalPart(localPart)) {
      return res.status(400).json({ success: false, error: { code: 'EMAIL_LOCAL_PART_INVALID', detail: 'local part must be 1-32 chars, lowercase alphanumeric/dot/underscore/hyphen' } });
    }

    let domain;
    try {
      domain = await resolveEmailDomain(req.user, 'teacher');
    } catch (err) {
      return res.status(403).json({ success: false, error: err });
    }

    const email = `${localPart.toLowerCase()}@${domain}`;
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ success: false, error: { code: 'EMAIL_ALREADY_EXISTS', detail: `${email} is already in use` } });
    }

    const teacher = await User.create({
      email, password, firstName, lastName, phone,
      role: 'teacher', isActive: true, createdBy: req.user.id, schoolId: req.user.schoolId,
    });

    logger.info('Teacher created', { teacherId: teacher.id, email: teacher.email, createdBy: req.user.id });
    res.status(201).json({ success: true, data: teacher.toJSON() });
  } catch (error) {
    logger.error('Create teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ success: false, error: { code: 'TEACHER_CREATE_FAILED' } });
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
    // email is intentionally excluded — accounts are immutable post-creation
    const { password, firstName, lastName, phone } = req.body;

    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const updateData = {};
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

// PUT /reception/teachers/:id/activate
export const activateTeacher = async (req, res) => {
  if (req.user.role !== 'reception') {
    return res.status(403).json({ success: false, error: { code: 'RECEPTION_TEACHER_ACTIVATE_FORBIDDEN' } });
  }
  const { id } = req.params;
  try {
    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
    if (teacher.status === 'active') return res.status(409).json({ success: false, error: { code: 'TEACHER_ALREADY_ACTIVE' } });
    logAudit({
      actorId: req.user.id, actorRole: req.user.role, action: 'activate',
      entity: 'teachers', entityId: teacher.id, schoolId: req.user.schoolId,
      meta: { previousStatus: teacher.status },
    });
    await teacher.update({ status: 'active' });
    return res.json({ success: true, data: { id: teacher.id, status: teacher.status } });
  } catch (error) {
    logger.error('activateTeacher (reception) error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'TEACHER_ACTIVATE_FAILED' } });
  }
};

// PUT /reception/teachers/:id/suspend
export const suspendTeacher = async (req, res) => {
  if (req.user.role !== 'reception') {
    return res.status(403).json({ success: false, error: { code: 'RECEPTION_TEACHER_SUSPEND_FORBIDDEN' } });
  }
  const { id } = req.params;
  try {
    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
    if (teacher.status === 'suspended') return res.status(409).json({ success: false, error: { code: 'TEACHER_ALREADY_SUSPENDED' } });
    logAudit({
      actorId: req.user.id, actorRole: req.user.role, action: 'suspend',
      entity: 'teachers', entityId: teacher.id, schoolId: req.user.schoolId,
      meta: { previousStatus: teacher.status },
    });
    await teacher.update({ status: 'suspended' });
    return res.json({ success: true, data: { id: teacher.id, status: teacher.status } });
  } catch (error) {
    logger.error('suspendTeacher (reception) error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'TEACHER_SUSPEND_FAILED' } });
  }
};

// POST /reception/teachers/:id/reset-credentials
export const resetTeacherCredentials = async (req, res) => {
  if (req.user.role !== 'reception') {
    return res.status(403).json({ success: false, error: { code: 'RECEPTION_CREDENTIAL_RESET_FORBIDDEN' } });
  }
  const { id } = req.params;
  try {
    const teacher = await User.findOne({ where: { id, role: 'teacher', schoolId: req.user.schoolId } });
    if (!teacher) return res.status(404).json({ success: false, error: { code: 'TEACHER_NOT_FOUND' } });
    const tempPassword = generateTempPassword();
    logAudit({
      actorId: req.user.id, actorRole: req.user.role, action: 'reset_credentials',
      entity: 'teachers', entityId: teacher.id, schoolId: req.user.schoolId,
    });
    teacher.password = tempPassword;
    teacher.mustChangePassword = true;
    await teacher.save();
    return res.json({ success: true, data: { tempPassword } });
  } catch (error) {
    logger.error('resetTeacherCredentials (reception) error', { error: error.message });
    return res.status(500).json({ success: false, error: { code: 'TEACHER_CREDENTIAL_RESET_FAILED' } });
  }
};
