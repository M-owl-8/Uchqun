import { body } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EVAL_PERIODS = ['daily', 'weekly', 'monthly'];

export const rateTeacherValidator = [
  body('stars')
    .notEmpty().withMessage('stars is required')
    .isInt({ min: 1, max: 5 }).withMessage('stars must be an integer between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('comment must be 2000 characters or less'),
];

export const rateSchoolValidator = [
  body('stars')
    .notEmpty().withMessage('stars is required')
    .isInt({ min: 1, max: 5 }).withMessage('stars must be an integer between 1 and 5'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 2000 }).withMessage('comment must be 2000 characters or less'),
  body('evaluation')
    .optional()
    .isObject().withMessage('evaluation must be an object'),
];

export const submitEvaluationValidator = [
  body('period')
    .notEmpty().withMessage('period is required')
    .isIn(EVAL_PERIODS).withMessage(`period must be one of: ${EVAL_PERIODS.join(', ')}`),
  body('answers')
    .notEmpty().withMessage('answers is required')
    .isObject().withMessage('answers must be an object'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
  body('teacherId')
    .optional()
    .custom(v => UUID_RE.test(v)).withMessage('teacherId must be a valid UUID'),
  body('submittedAt')
    .optional()
    .isISO8601().withMessage('submittedAt must be a valid ISO 8601 date'),
];
