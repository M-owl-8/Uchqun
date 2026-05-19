import { ParentEvaluation } from '../models/index.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

const VALID_PERIODS = ['daily', 'weekly', 'monthly'];

/**
 * Submit a parent evaluation (daily / weekly / monthly monitoring).
 * POST /api/parent/evaluations
 */
export const submitParentEvaluation = async (req, res) => {
  try {
    const parentId = req.user?.id;
    if (!parentId) return res.status(401).json({ error: 'Authentication required' });

    const { period, answers, notes, teacherId, submittedAt } = req.body || {};

    if (!period || !VALID_PERIODS.includes(period)) {
      return res.status(400).json({
        error: 'Invalid period',
        message: `period must be one of: ${VALID_PERIODS.join(', ')}`,
      });
    }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'answers must be an object of { label: boolean }' });
    }

    const record = await ParentEvaluation.create({
      parentId,
      teacherId: teacherId || null,
      schoolId: req.user?.schoolId || null,
      period,
      answers,
      notes: notes || null,
      submittedAt: submittedAt ? new Date(submittedAt) : new Date(),
    });

    return res.status(201).json({ success: true, data: record });
  } catch (error) {
    logger.error('submitParentEvaluation error', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Failed to save evaluation' });
  }
};

/**
 * Get my evaluations history.
 * GET /api/parent/evaluations?period=daily
 */
export const getMyEvaluations = async (req, res) => {
  try {
    const parentId = req.user?.id;
    if (!parentId) return res.status(401).json({ error: 'Authentication required' });

    const where = { parentId };
    if (req.query.period && VALID_PERIODS.includes(req.query.period)) {
      where.period = req.query.period;
    }

    const { limit, offset } = parsePagination(req.query, { limit: 20 });
    const records = await ParentEvaluation.findAll({
      where,
      order: [['submittedAt', 'DESC']],
      limit,
      offset,
    });

    return res.json({ success: true, data: records });
  } catch (error) {
    logger.error('getMyEvaluations error', { error: error.message, stack: error.stack });
    return res.status(500).json({ error: 'Failed to load evaluations' });
  }
};
