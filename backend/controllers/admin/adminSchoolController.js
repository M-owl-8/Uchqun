import School from '../../models/School.js';
import Region from '../../models/Region.js';
import SchoolCategory from '../../models/SchoolCategory.js';
import logger from '../../utils/logger.js';
import { logAudit } from '../../utils/auditLogger.js';

const OWNER_EDITABLE_FIELDS = ['phone', 'email', 'address', 'description', 'director'];

export const getAdminSchool = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'SCHOOL_FORBIDDEN' } });
  }
  try {
    const school = await School.findByPk(req.user.schoolId, {
      include: [
        { model: Region, as: 'regionRef', attributes: ['id', 'name', 'code'], required: false },
        { model: SchoolCategory, as: 'category', attributes: ['id', 'name', 'code'], required: false },
      ],
    });
    if (!school) {
      return res.status(404).json({ success: false, error: { code: 'SCHOOL_NOT_FOUND' } });
    }
    return res.json({ success: true, data: school.toJSON() });
  } catch (error) {
    logger.error('getAdminSchool error', { error: error.message, adminId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'SCHOOL_FETCH_FAILED' } });
  }
};

export const patchAdminSchool = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'SCHOOL_FORBIDDEN' } });
  }
  try {
    const school = await School.findByPk(req.user.schoolId);
    if (!school) {
      return res.status(404).json({ success: false, error: { code: 'SCHOOL_NOT_FOUND' } });
    }

    // Only apply whitelisted fields — government-controlled fields are silently ignored
    const updates = {};
    for (const field of OWNER_EDITABLE_FIELDS) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, data: school.toJSON() });
    }

    logAudit({
      actorId: req.user.id,
      actorRole: req.user.role,
      action: 'update',
      entity: 'schools',
      entityId: school.id,
      schoolId: req.user.schoolId,
      meta: { updatedFields: Object.keys(updates) },
    });

    await school.update(updates);

    return res.json({ success: true, data: school.toJSON() });
  } catch (error) {
    logger.error('patchAdminSchool error', { error: error.message, adminId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'SCHOOL_UPDATE_FAILED' } });
  }
};
