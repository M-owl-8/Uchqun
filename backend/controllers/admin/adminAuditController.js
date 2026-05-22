import { Op } from 'sequelize';
import AuditLog from '../../models/AuditLog.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

const ADMIN_AUDIT_ALLOWLIST = new Set([
  'approve:documents',
  'reject:documents',
  'create:receptions',
  'delete:receptions',
  'activate:receptions',
  'deactivate:receptions',
  'suspend:users',
  'activate:users',
  'restore:children',
  'restore:users',
  'restore:observations',
  'restore:attendance',
  'bulk_import:children',
  'transfer:children',
  'update:schools',
]);

const ALLOWED_ACTIONS = new Set([...ADMIN_AUDIT_ALLOWLIST].map(k => k.split(':')[0]));
const ALLOWED_ENTITIES = new Set([...ADMIN_AUDIT_ALLOWLIST].map(k => k.split(':')[1]));

function isValidDate(str) {
  const d = new Date(str);
  return !isNaN(d.getTime());
}

export const getAdminAuditLog = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'AUDIT_LOG_FORBIDDEN' } });
  }

  try {
    const { action, entity, startDate, endDate } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const offset = (page - 1) * limit;

    if (action && !ALLOWED_ACTIONS.has(action)) {
      return res.status(400).json({
        success: false,
        error: { code: 'ADMIN_AUDIT_LOG_INVALID_FILTER', detail: `action '${action}' is not in admin audit scope` },
      });
    }
    if (entity && !ALLOWED_ENTITIES.has(entity)) {
      return res.status(400).json({
        success: false,
        error: { code: 'ADMIN_AUDIT_LOG_INVALID_FILTER', detail: `entity '${entity}' is not in admin audit scope` },
      });
    }
    if (startDate && !isValidDate(startDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'ADMIN_AUDIT_LOG_INVALID_FILTER', detail: 'startDate is not a valid date' },
      });
    }
    if (endDate && !isValidDate(endDate)) {
      return res.status(400).json({
        success: false,
        error: { code: 'ADMIN_AUDIT_LOG_INVALID_FILTER', detail: 'endDate is not a valid date' },
      });
    }

    const allowlistPairs = [...ADMIN_AUDIT_ALLOWLIST].map(k => {
      const [a, e] = k.split(':');
      return { action: a, entity: e };
    });

    const where = {
      schoolId: req.user.schoolId,
      [Op.or]: allowlistPairs,
    };

    if (action && entity) {
      where[Op.or] = [{ action, entity }];
    } else if (action) {
      where.action = action;
      delete where[Op.or];
    } else if (entity) {
      where.entity = entity;
      delete where[Op.or];
    }

    if (startDate || endDate) {
      where.occurredAt = {};
      if (startDate) where.occurredAt[Op.gte] = new Date(startDate);
      if (endDate) where.occurredAt[Op.lte] = new Date(endDate);
    }

    const { count, rows } = await AuditLog.findAndCountAll({
      where,
      include: [{
        model: User,
        as: 'actor',
        attributes: ['id', 'firstName', 'lastName', 'role'],
        required: false,
      }],
      order: [['occurredAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({
      success: true,
      data: {
        entries: rows.map(r => r.toJSON()),
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('getAdminAuditLog error', { error: error.message, adminId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'ADMIN_AUDIT_LOG_FETCH_FAILED' } });
  }
};
