import { body } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const upsertServicePlanValidator = [
  body('childId')
    .notEmpty().withMessage('childId is required')
    .custom(v => UUID_RE.test(v)).withMessage('childId must be a valid UUID'),
  body('year')
    .notEmpty().withMessage('year is required')
    .isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid year'),
  body('serviceType')
    .trim()
    .notEmpty().withMessage('serviceType is required')
    .isLength({ max: 100 }).withMessage('serviceType must be 100 characters or less'),
  body('months')
    .isArray({ min: 0, max: 12 }).withMessage('months must be an array'),
];

export const bulkUpsertServicePlansValidator = [
  body('childId')
    .notEmpty().withMessage('childId is required')
    .custom(v => UUID_RE.test(v)).withMessage('childId must be a valid UUID'),
  body('year')
    .notEmpty().withMessage('year is required')
    .isInt({ min: 2000, max: 2100 }).withMessage('year must be a valid year'),
  body('plans')
    .isArray({ min: 1 }).withMessage('plans must be a non-empty array'),
  body('plans.*.serviceType')
    .trim()
    .notEmpty().withMessage('plans[].serviceType is required')
    .isLength({ max: 100 }).withMessage('plans[].serviceType must be 100 characters or less'),
  body('plans.*.months')
    .isArray().withMessage('plans[].months must be an array'),
];
