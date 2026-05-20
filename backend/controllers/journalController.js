import Child from '../models/Child.js';
import ChildJournalEntry from '../models/ChildJournalEntry.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const create = async (req, res) => {
  try {
    const { childId, date, content, isVisibleToParent } = req.body;

    if (!childId || !UUID_RE.test(childId)) {
      return res.status(400).json({ success: false, error: { code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' } });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: { code: 'JOURNAL_INVALID_DATE' } });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'JOURNAL_INVALID_DATE' } });
    }
    const todayStart = new Date();
    todayStart.setHours(23, 59, 59, 999);
    if (parsedDate > todayStart) {
      return res.status(400).json({ success: false, error: { code: 'JOURNAL_DATE_IN_FUTURE' } });
    }

    const trimmedContent = content ? String(content).trim() : '';
    if (trimmedContent.length < 10) {
      return res.status(400).json({ success: false, error: { code: 'JOURNAL_CONTENT_TOO_SHORT' } });
    }
    if (trimmedContent.length > 2000) {
      return res.status(400).json({ success: false, error: { code: 'JOURNAL_CONTENT_TOO_LONG' } });
    }

    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' } });
    }

    const visible = isVisibleToParent === false ? false : true;

    const entry = await ChildJournalEntry.create({
      childId,
      teacherId: req.user.id,
      schoolId: req.user.schoolId,
      date,
      content: trimmedContent,
      isVisibleToParent: visible,
      childSnapshot: {
        firstName: child.firstName,
        lastName: child.lastName,
        schoolId: child.schoolId,
        dateOfBirth: child.dateOfBirth,
      },
    });

    return res.status(201).json({ success: true, data: entry });
  } catch (error) {
    logger.error('Create journal entry error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'JOURNAL_CREATE_FAILED' } });
  }
};

export const listByChild = async (req, res) => {
  try {
    const child = await validateChildAccess(req.params.childId, req);
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'JOURNAL_CHILD_NOT_ACCESSIBLE' } });
    }

    const entries = await ChildJournalEntry.findAll({
      where: { childId: req.params.childId },
      order: [['date', 'DESC']],
      limit: 100,
      include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }],
    });

    return res.json({ success: true, data: entries });
  } catch (error) {
    logger.error('List journal entries error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'JOURNAL_LIST_FAILED' } });
  }
};

export const getChildJournal = async (req, res) => {
  try {
    const child = await Child.findOne({
      where: { id: req.params.id, parentId: req.user.id },
    });
    if (!child) {
      return res.status(404).json({ success: false, error: { code: 'JOURNAL_NOT_FOUND_FOR_PARENT' } });
    }

    const entries = await ChildJournalEntry.findAll({
      where: { childId: req.params.id, isVisibleToParent: true },
      order: [['date', 'DESC']],
      limit: 100,
      include: [{ model: User, as: 'author', attributes: ['firstName', 'lastName'] }],
    });

    const data = entries.map(e => ({
      id: e.id,
      date: e.date,
      content: e.content,
      teacherFirstName: e.author?.firstName ?? null,
      teacherLastName: e.author?.lastName ?? null,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    logger.error('Get child journal error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'JOURNAL_LIST_FAILED' } });
  }
};
