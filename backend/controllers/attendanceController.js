import { Op } from 'sequelize';
import ChildAttendance from '../models/ChildAttendance.js';
import Child from '../models/Child.js';
import logger from '../utils/logger.js';
import { validateChildAccess, isTeacherAssignedToChild } from '../utils/schoolValidation.js';
import { emitToUser } from '../config/socket.js';

const VALID_STATUSES = ['present', 'absent', 'home_leave', 'sick', 'hospitalized'];

export const createAttendance = async (req, res) => {
  try {
    const { records } = req.body;

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'ATTENDANCE_RECORDS_REQUIRED', detail: 'records array is required and must not be empty' },
      });
    }

    const toSave = records.filter(r => r.status && r.status !== 'unset');
    const results = { saved: 0, skipped: records.length - toSave.length, errors: [] };

    for (const record of toSave) {
      const { childId, date, status, note } = record;

      if (!childId) { results.errors.push({ childId, code: 'ATTENDANCE_CHILD_ID_REQUIRED' }); continue; }
      if (!date) { results.errors.push({ childId, code: 'ATTENDANCE_DATE_REQUIRED' }); continue; }
      if (!VALID_STATUSES.includes(status)) {
        results.errors.push({ childId, code: 'ATTENDANCE_INVALID_STATUS' }); continue;
      }

      const attendanceDate = new Date(date);
      if (isNaN(attendanceDate.getTime())) {
        results.errors.push({ childId, code: 'ATTENDANCE_INVALID_DATE' }); continue;
      }
      const todayBound = new Date();
      todayBound.setHours(23, 59, 59, 999);
      if (attendanceDate > todayBound) {
        results.errors.push({ childId, code: 'ATTENDANCE_FUTURE_DATE' }); continue;
      }

      try {
        const child = await validateChildAccess(childId, req);
        if (!child) { results.errors.push({ childId, code: 'ATTENDANCE_ACCESS_DENIED' }); continue; }
        if (!await isTeacherAssignedToChild(child, req)) {
          results.errors.push({ childId, code: 'ATTENDANCE_ACCESS_DENIED' }); continue;
        }

        const childSnapshot = { firstName: child.firstName, lastName: child.lastName, schoolId: child.schoolId };
        const existing = await ChildAttendance.findOne({ where: { childId, date } });

        if (existing) {
          existing.status = status;
          if (note !== undefined) existing.note = note || null;
          await existing.save();
        } else {
          await ChildAttendance.create({
            childId,
            teacherId: req.user.id,
            schoolId: child.schoolId,
            date,
            status,
            note: note || null,
            markedBy: req.user.id,
            childSnapshot,
          });
        }

        if (status === 'absent') {
          logger.warn('ATTENDANCE_ABSENT safeguarding marker', { childId, date, teacherId: req.user.id });
        }
        if (child.parentId) {
          emitToUser(child.parentId, 'attendance:updated', { childId, date, status, timestamp: new Date().toISOString() });
        }
        results.saved++;
      } catch (err) {
        logger.error('createAttendance record error', { childId, error: err.message });
        results.errors.push({ childId, code: 'ATTENDANCE_SAVE_FAILED' });
      }
    }

    if (results.errors.length > 0 && results.saved === 0 && toSave.length > 0) {
      return res.status(400).json({
        success: false,
        error: { code: results.errors[0].code, detail: `${results.errors.length} record(s) failed to save` },
        data: results,
      });
    }

    return res.status(201).json({ success: true, data: results });
  } catch (error) {
    logger.error('createAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'ATTENDANCE_SAVE_FAILED', detail: 'Failed to record attendance' } });
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

/**
 * PP-ATTENDANCE-SURFACE — parent read of their own child's attendance.
 *
 * Scoping (CRITICAL — this is a privacy boundary on minors' records):
 *   Resolve childIds from `Child.findAll({ where: { parentId: req.user.id } })`
 *   — the canonical chain (children.parentId → users.id). Anything not in that
 *   set is denied. If the caller passes ?childId=X and X is not in the parent's
 *   own children, the response is 403 ATTENDANCE_CHILD_NOT_ACCESSIBLE.
 *
 * The chain itself is the same one TP-PARENT-ASSIGNMENT (S4) repairs; in
 * production today, only Hulkar→Bobur is linked. Full multi-parent verification
 * waits on S4 + a terminal/postgres-MCP walk. See PP-ATTENDANCE-SURFACE.md
 * §verification.
 *
 * Query params: childId (optional — defaults to all of parent's children),
 *               startDate / endDate (optional, both required together for range),
 *               date (optional — single day).
 */
export const getMyChildAttendance = async (req, res) => {
  try {
    if (req.user.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: { code: 'ATTENDANCE_PARENT_ONLY' },
      });
    }

    // Resolve THIS parent's child IDs from the canonical chain — never trust
    // the client to tell us which children belong to the caller.
    const myChildren = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['id', 'firstName', 'lastName', 'dateOfBirth'],
    });
    const myChildIds = myChildren.map(c => c.id);

    if (myChildIds.length === 0) {
      return res.json({ success: true, data: { records: [], children: [] } });
    }

    const where = { childId: { [Op.in]: myChildIds } };

    // Optional child filter — must be in the parent's set
    if (req.query.childId) {
      if (!myChildIds.includes(req.query.childId)) {
        return res.status(403).json({
          success: false,
          error: { code: 'ATTENDANCE_CHILD_NOT_ACCESSIBLE' },
        });
      }
      where.childId = req.query.childId;
    }

    if (req.query.date) {
      where.date = req.query.date;
    } else if (req.query.startDate && req.query.endDate) {
      where.date = { [Op.between]: [req.query.startDate, req.query.endDate] };
    }

    const records = await ChildAttendance.findAll({
      where,
      attributes: ['id', 'childId', 'date', 'status', 'note', 'createdAt'],
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: {
        records,
        children: myChildren.map(c => ({
          id: c.id,
          firstName: c.firstName,
          lastName: c.lastName,
          dateOfBirth: c.dateOfBirth,
        })),
      },
    });
  } catch (error) {
    logger.error('getMyChildAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({
      success: false,
      error: { code: 'ATTENDANCE_FETCH_FAILED' },
    });
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
    const attendChild = await validateChildAccess(record.childId, req);
    if (!attendChild) return res.status(403).json({ success: false, error: 'Access denied' });
    if (!await isTeacherAssignedToChild(attendChild, req)) {
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
    const deleteChild = await validateChildAccess(record.childId, req);
    if (!deleteChild) return res.status(403).json({ success: false, error: 'Access denied' });
    if (!await isTeacherAssignedToChild(deleteChild, req)) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    await record.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'admin_delete' });
    return res.json({ success: true, message: 'Attendance record deleted' });
  } catch (error) {
    logger.error('deleteAttendance error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to delete attendance record' });
  }
};
