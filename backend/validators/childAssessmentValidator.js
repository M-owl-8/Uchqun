import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const createAssessmentValidator = [
  body('childId')
    .notEmpty().withMessage('childId is required')
    .custom(v => UUID_RE.test(v)).withMessage('childId must be a valid UUID'),
  body('category')
    .trim()
    .notEmpty().withMessage('category is required')
    .isLength({ max: 100 }).withMessage('category must be 100 characters or less'),
  body('score')
    .notEmpty().withMessage('score is required')
    .isFloat({ min: 0, max: 100 }).withMessage('score must be a number between 0 and 100'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
  body('date')
    .optional()
    .isISO8601().withMessage('date must be a valid ISO 8601 date'),
];

export const updateAssessmentValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('score')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('score must be a number between 0 and 100'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
];

export const assessmentIdValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];
