import { Op } from 'sequelize';
import ChildAttendance from '../models/ChildAttendance.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

const VALID_STATUSES = ['present', 'absent', 'late', 'excused'];

export const createAttendance = async (req, res) => {
  try {
    const { childId, date, status, note } = req.body;

    if (!childId) return res.status(400).json({ success: false, error: 'childId is required' });
    if (!date) return res.status(400).json({ success: false, error: 'date is required' });
    if (!status) return res.status(400).json({ success: false, error: 'status is required' });
    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    // Date must not be in the future
    const attendanceDate = new Date(date);
    if (isNaN(attendanceDate.getTime())) {
      return res.status(400).json({ success: false, error: 'date must be a valid ISO 8601 date (YYYY-MM-DD)' });
    }
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (attendanceDate > today) {
      return res.status(400).json({ success: false, error: 'date must not be in the future' });
    }

    // School-scope validation
    const child = await validateChildAccess(childId, req);
    if (!child) return res.status(403).json({ success: false, error: 'Access denied or child not found' });

    const childSnapshot = {
      firstName: child.firstName,
      lastName: child.lastName,
      schoolId: child.schoolId,
    };

    const record = await ChildAttendance.create({
      childId,
      teacherId: req.user.id,
      schoolId: child.schoolId,
      date,
      status,
      note: note || null,
      markedBy: req.user.id,
      childSnapshot,
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: 'Attendance already recorded for this child on this date' });
    }
    logger.error('createAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to record attendance' });
  }
};

export const listAttendance = async (req, res) => {
  try {
    const where = { schoolId: req.user.schoolId };

    if (req.query.childId) where.childId = req.query.childId;
    if (req.query.date) where.date = req.query.date;
    if (req.query.startDate && req.query.endDate) {
      where.date = { [Op.between]: [req.query.startDate, req.query.endDate] };
    }

    const records = await ChildAttendance.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: records });
  } catch (error) {
    logger.error('listAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to fetch attendance records' });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!status && note === undefined) {
      return res.status(400).json({ success: false, error: 'At least one of status or note is required' });
    }
    if (status && !VALID_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const record = await ChildAttendance.findByPk(id);
    if (!record) return res.status(404).json({ success: false, error: 'Attendance record not found' });
    if (record.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (status) record.status = status;
    if (note !== undefined) record.note = note;
    await record.save();

    return res.json({ success: true, data: record });
  } catch (error) {
    logger.error('updateAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to update attendance record' });
  }
};

export const deleteAttendance = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await ChildAttendance.findByPk(id);
    if (!record) return res.status(404).json({ success: false, error: 'Attendance record not found' });
    if (record.schoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await record.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'admin_delete' });
    return res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    logger.error('deleteAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to delete attendance record' });
  }
};
