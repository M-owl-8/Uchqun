import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TASK_STATUSES = ['pending', 'in_progress', 'completed', 'cancelled'];

export const updateTaskStatusValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('status')
    .notEmpty().withMessage('status is required')
    .isIn(TASK_STATUSES).withMessage(`status must be one of: ${TASK_STATUSES.join(', ')}`),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
];

export const createEmotionalMonitoringValidator = [
  body('childId')
    .notEmpty().withMessage('childId is required')
    .custom(v => UUID_RE.test(v)).withMessage('childId must be a valid UUID'),
  body('date')
    .notEmpty().withMessage('date is required')
    .isISO8601().withMessage('date must be a valid ISO 8601 date'),
  body('emotionalState')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('emotionalState must be 100 characters or less'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
  body('teacherSignature')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('teacherSignature must be 255 characters or less'),
];

export const updateEmotionalMonitoringValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('childId')
    .optional()
    .custom(v => UUID_RE.test(v)).withMessage('childId must be a valid UUID'),
  body('date')
    .optional()
    .isISO8601().withMessage('date must be a valid ISO 8601 date'),
  body('emotionalState')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('emotionalState must be 100 characters or less'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
  body('teacherSignature')
    .optional()
    .trim()
    .isLength({ max: 255 }).withMessage('teacherSignature must be 255 characters or less'),
];
