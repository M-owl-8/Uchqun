import { Op } from 'sequelize';
import ChildAttendance from '../models/ChildAttendance.js';
import Child from '../models/Child.js';
import logger from '../utils/logger.js';
import { validateChildAccess, isTeacherAssignedToChild } from '../utils/schoolValidation.js';
import { emitToUser } from '../config/socket.js';
import { logAudit } from '../utils/auditLogger.js';

const VALID_STATUSES = ['present', 'absent', 'home_leave', 'sick', 'hospitalized'];
// D-26: how far back attendance may be recorded or corrected.
const MAX_BACKDATE_DAYS = parseInt(process.env.ATTENDANCE_MAX_BACKDATE_DAYS, 10) || 365;

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
      // D-26: there was an upper bound but no lower one, so 2020-01-06 was
      // accepted for a child born in 2018 at a school created in 2026.
      // Back-dating is legitimate for corrections; back-dating by years is not.
      const earliestBound = new Date(todayBound.getTime() - MAX_BACKDATE_DAYS * 24 * 60 * 60 * 1000);
      if (attendanceDate < earliestBound) {
        results.errors.push({ childId, code: 'ATTENDANCE_DATE_TOO_EARLY' }); continue;
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
          const previousStatus = existing.status;
          const previousMarker = existing.markedBy;
          existing.status = status;
          if (note !== undefined) existing.note = note || null;
          // D-27: only status and note were written, so an overwrite by
          // reception or admin was still attributed to the teacher who first
          // marked the day. Whoever writes the row owns the row.
          existing.markedBy = req.user.id;
          existing.teacherId = req.user.id;
          await existing.save();

          // D-27: an overwrite left no trace anywhere. Record it.
          logAudit({
            actorId: req.user.id,
            actorRole: req.user.role,
            action: 'attendance_overwrite',
            entity: 'child_attendance',
            entityId: `${childId}:${date}`,
            schoolId: child.schoolId,
            meta: { childId, date, previousStatus, newStatus: status, previousMarker },
          });

          // D-27: clearing an absence erased a safeguarding marker silently.
          if (previousStatus === 'absent' && status !== 'absent') {
            logger.warn('ATTENDANCE_ABSENCE_CLEARED safeguarding marker removed', {
              childId, date, previousStatus, newStatus: status,
              clearedBy: req.user.id, clearedByRole: req.user.role, previousMarker,
            });
          }
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

    // D-01: any rejected record makes this a failed save, not a partial success.
    // Previously only an all-rows failure returned non-2xx, so a save where one
    // child was refused (ATTENDANCE_ACCESS_DENIED) came back 201 success:true and
    // the UI showed "Davomat saqlandi" while discarding that child's record —
    // including absences.
    if (results.errors.length > 0 && toSave.length > 0) {
      return res.status(results.saved === 0 ? 400 : 207).json({
        success: false,
        error: {
          code: results.saved === 0 ? results.errors[0].code : 'ATTENDANCE_PARTIALLY_SAVED',
          detail: `${results.errors.length} of ${toSave.length} record(s) were not saved`,
        },
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

    // D-31: this scoped on schoolId alone, so a teacher of 21 children was
    // served all 61 children in the school — names, dates and statuses.
    // isTeacherAssignedToChild guards the write path; the read path had no
    // equivalent. Narrow teachers to the children they actually teach.
    if (req.user.role === 'teacher') {
      if (req.query.childId) {
        const child = await validateChildAccess(req.query.childId, req);
        if (!child || !(await isTeacherAssignedToChild(child, req))) {
          return res.status(403).json({
            success: false,
            error: { code: 'ATTENDANCE_CHILD_NOT_ACCESSIBLE' },
          });
        }
        where.childId = req.query.childId;
      } else {
        const own = await Child.findAll({ where: { schoolId: req.user.schoolId }, attributes: ['id', 'groupId', 'parentId'] });
        const mine = [];
        for (const c of own) {
          if (await isTeacherAssignedToChild(c, req)) mine.push(c.id);
        }
        where.childId = { [Op.in]: mine };
      }
    } else if (req.query.childId) {
      where.childId = req.query.childId;
    }
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
