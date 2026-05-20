import { Op } from 'sequelize';
import ChildObservation from '../models/ChildObservation.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

const VALID_DOMAINS = ['communication', 'motor', 'social', 'cognitive', 'self_care'];
const VALID_SEVERITIES = ['routine', 'concern', 'urgent'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const create = async (req, res) => {
  try {
    const { childId, observationDate, domain, note, severity = 'routine' } = req.body;

    if (!childId || !UUID_RE.test(childId)) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_CHILD_ID_REQUIRED' } });
    }
    if (!observationDate) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_INVALID_DATE' } });
    }
    const obsDate = new Date(observationDate);
    if (isNaN(obsDate.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_INVALID_DATE' } });
    }
    // Date must not be in the future (compare date-only by resetting time on today)
    const todayStart = new Date();
    todayStart.setHours(23, 59, 59, 999);
    if (obsDate > todayStart) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_DATE_IN_FUTURE' } });
    }
    if (!domain || !VALID_DOMAINS.includes(domain)) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_INVALID_DOMAIN' } });
    }
    const trimmedNote = note ? String(note).trim() : '';
    if (trimmedNote.length < 10) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_NOTE_TOO_SHORT' } });
    }
    if (trimmedNote.length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_NOTE_TOO_LONG' } });
    }
    if (!VALID_SEVERITIES.includes(severity)) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_INVALID_SEVERITY' } });
    }

    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'OBSERVATION_CHILD_NOT_ACCESSIBLE' } });
    }

    if (severity === 'urgent') {
      logger.warn('urgent observation recorded', {
        childId,
        teacherId: req.user.id,
        schoolId: req.user.schoolId,
        observationDate,
      });
    }

    const observation = await ChildObservation.create({
      childId,
      teacherId: req.user.id,
      schoolId: req.user.schoolId,
      observationDate,
      domain,
      note: trimmedNote,
      severity,
      childSnapshot: {
        firstName: child.firstName,
        lastName: child.lastName,
        schoolId: child.schoolId,
        dateOfBirth: child.dateOfBirth,
      },
    });

    return res.status(201).json({ success: true, data: observation });
  } catch (error) {
    logger.error('Create observation error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'OBSERVATION_CREATE_FAILED' } });
  }
};

export const listRecent = async (req, res) => {
  try {
    const rawDays = req.query.days !== undefined ? parseInt(req.query.days, 10) : 7;
    if (isNaN(rawDays) || rawDays < 1 || rawDays > 30) {
      return res.status(400).json({ success: false, error: { code: 'OBSERVATION_DAYS_OUT_OF_RANGE' } });
    }

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - rawDays);
    const cutoffStr = cutoff.toISOString().split('T')[0];

    // limit: 200 safety cap — at 7-day default a busy school could approach 350 records;
    // cap protects against pathological queries without breaking normal use.
    const observations = await ChildObservation.findAll({
      where: {
        schoolId: req.user.schoolId,
        observationDate: { [Op.gte]: cutoffStr },
      },
      order: [['observationDate', 'DESC']],
      limit: 200,
    });

    return res.json({ success: true, data: observations });
  } catch (error) {
    logger.error('List recent observations error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'OBSERVATION_LIST_FAILED' } });
  }
};

export const listByChild = async (req, res) => {
  try {
    const child = await validateChildAccess(req.params.id, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'OBSERVATION_CHILD_NOT_ACCESSIBLE' } });
    }

    const observations = await ChildObservation.findAll({
      where: { childId: req.params.id },
      order: [['observationDate', 'DESC']],
      limit: 100,
    });

    return res.json({ success: true, data: observations });
  } catch (error) {
    logger.error('List observations by child error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'OBSERVATION_LIST_FAILED' } });
  }
};
