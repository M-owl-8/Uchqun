import { body } from 'express-validator';

const STAT_TYPES = ['attendance', 'meals', 'activities', 'progress', 'ratings', 'overview'];
const PERIODS = ['day', 'week', 'month', 'quarter', 'year', 'custom'];

export const generateStatsValidator = [
  body('statType')
    .notEmpty().withMessage('statType is required')
    .isIn(STAT_TYPES).withMessage(`statType must be one of: ${STAT_TYPES.join(', ')}`),
  body('period')
    .notEmpty().withMessage('period is required')
    .isIn(PERIODS).withMessage(`period must be one of: ${PERIODS.join(', ')}`),
  body('periodStart')
    .optional()
    .isISO8601().withMessage('periodStart must be a valid ISO 8601 date'),
  body('periodEnd')
    .optional()
    .isISO8601().withMessage('periodEnd must be a valid ISO 8601 date'),
];
