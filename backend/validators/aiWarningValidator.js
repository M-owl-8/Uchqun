import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const analyzeWarningsValidator = [
  body('schoolId')
    .optional()
    .custom(v => UUID_RE.test(v)).withMessage('schoolId must be a valid UUID'),
  body('parentId')
    .optional()
    .custom(v => UUID_RE.test(v)).withMessage('parentId must be a valid UUID'),
];

export const resolveWarningValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('resolutionNotes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('resolutionNotes must be 5000 characters or less'),
];

export const notifyWarningValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('userIds')
    .isArray({ min: 1 }).withMessage('userIds must be a non-empty array'),
  body('userIds.*')
    .custom(v => UUID_RE.test(v)).withMessage('each userId must be a valid UUID'),
];

export const warningIdValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];
