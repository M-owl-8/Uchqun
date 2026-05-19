import AuditLog from '../models/AuditLog.js';
import logger from './logger.js';

export const logAudit = async ({
  actorId = null,
  actorRole = 'unknown',
  action,
  entity,
  entityId = null,
  schoolId = null,
  meta = null,
} = {}) => {
  try {
    await AuditLog.create({
      actorId,
      actorRole,
      action,
      entity,
      entityId,
      schoolId,
      meta,
      occurredAt: new Date(),
    });
  } catch (err) {
    // Audit log failures must never block application flow
    logger.error('auditLogger: failed to write entry', {
      error: err.message,
      action,
      entity,
      entityId,
    });
  }
};
