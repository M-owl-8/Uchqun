import Child from '../../models/Child.js';
import User from '../../models/User.js';
import ChildAttendance from '../../models/ChildAttendance.js';
import logger from '../../utils/logger.js';
import { logAudit } from '../../utils/auditLogger.js';

const doRestore = async ({ Model, entity, id, req, res }) => {
  if (req.user.role !== 'admin' && req.user.role !== 'government') {
    return res.status(403).json({ success: false, error: { code: 'RESTORE_FORBIDDEN' } });
  }

  try {
    const record = await Model.findOne({ where: { id }, paranoid: false });
    if (!record) {
      return res.status(404).json({ success: false, error: { code: 'RESTORE_NOT_FOUND' } });
    }
    if (!record.deletedAt) {
      return res.status(400).json({ success: false, error: { code: 'RESTORE_NOT_DELETED' } });
    }

    // Government can restore cross-school; admin is school-scoped
    const recordSchoolId = record.schoolId ?? null;
    if (req.user.role !== 'government' && recordSchoolId !== req.user.schoolId) {
      return res.status(403).json({ success: false, error: { code: 'RESTORE_FORBIDDEN' } });
    }

    await record.restore();

    logAudit({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'restore', entity, entityId: record.id,
      schoolId: recordSchoolId,
      meta: { restoredAt: new Date().toISOString() },
    });

    return res.json({ success: true, data: record });
  } catch (error) {
    logger.error(`restore ${entity} error`, { error: error.message, id });
    return res.status(500).json({ success: false, error: { code: 'RESTORE_FAILED' } });
  }
};

export const restoreChild = (req, res) =>
  doRestore({ Model: Child, entity: 'children', id: req.params.id, req, res });

export const restoreUser = (req, res) =>
  doRestore({ Model: User, entity: 'users', id: req.params.id, req, res });

export const restoreAttendance = (req, res) =>
  doRestore({ Model: ChildAttendance, entity: 'child_attendance', id: req.params.id, req, res });
