import TeacherReflection from '../models/TeacherReflection.js';
import logger from '../utils/logger.js';

export const create = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, error: { code: 'REFLECTION_FORBIDDEN' } });
    }

    const { date, content } = req.body;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, error: { code: 'REFLECTION_INVALID_DATE' } });
    }
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ success: false, error: { code: 'REFLECTION_INVALID_DATE' } });
    }
    const todayStart = new Date();
    todayStart.setHours(23, 59, 59, 999);
    if (parsedDate > todayStart) {
      return res.status(400).json({ success: false, error: { code: 'REFLECTION_DATE_IN_FUTURE' } });
    }

    const trimmedContent = content ? String(content).trim() : '';
    if (trimmedContent.length < 20) {
      return res.status(400).json({ success: false, error: { code: 'REFLECTION_CONTENT_TOO_SHORT' } });
    }
    if (trimmedContent.length > 5000) {
      return res.status(400).json({ success: false, error: { code: 'REFLECTION_CONTENT_TOO_LONG' } });
    }

    const existing = await TeacherReflection.findOne({
      where: { teacherId: req.user.id, date },
    });
    if (existing) {
      return res.status(409).json({ success: false, error: { code: 'REFLECTION_ALREADY_EXISTS_FOR_DATE' } });
    }

    const reflection = await TeacherReflection.create({
      teacherId: req.user.id,
      schoolId: req.user.schoolId,
      date,
      content: trimmedContent,
    });

    return res.status(201).json({ success: true, data: reflection });
  } catch (error) {
    logger.error('Create reflection error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'REFLECTION_CREATE_FAILED' } });
  }
};

export const list = async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ success: false, error: { code: 'REFLECTION_FORBIDDEN' } });
    }

    const reflections = await TeacherReflection.findAll({
      where: { teacherId: req.user.id },
      order: [['date', 'DESC']],
      limit: 90,
    });

    return res.json({ success: true, data: reflections });
  } catch (error) {
    logger.error('List reflections error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: { code: 'REFLECTION_LIST_FAILED' } });
  }
};
