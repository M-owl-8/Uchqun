import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

export const createMealPlanValidator = [
  body('childId')
    .notEmpty().withMessage('childId is required')
    .custom(v => UUID_RE.test(v)).withMessage('childId must be a valid UUID'),
  body('date')
    .notEmpty().withMessage('date is required')
    .isISO8601().withMessage('date must be a valid ISO 8601 date'),
  body('mealType')
    .notEmpty().withMessage('mealType is required')
    .isIn(MEAL_TYPES).withMessage(`mealType must be one of: ${MEAL_TYPES.join(', ')}`),
  body('plannedMenu')
    .trim()
    .notEmpty().withMessage('plannedMenu is required')
    .isLength({ max: 1000 }).withMessage('plannedMenu must be 1000 characters or less'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
];

export const bulkCreateMealPlansValidator = [
  body('childIds')
    .isArray({ min: 1 }).withMessage('childIds must be a non-empty array'),
  body('childIds.*')
    .custom(v => UUID_RE.test(v)).withMessage('each childId must be a valid UUID'),
  body('date')
    .notEmpty().withMessage('date is required')
    .isISO8601().withMessage('date must be a valid ISO 8601 date'),
  body('mealType')
    .notEmpty().withMessage('mealType is required')
    .isIn(MEAL_TYPES).withMessage(`mealType must be one of: ${MEAL_TYPES.join(', ')}`),
  body('plannedMenu')
    .trim()
    .notEmpty().withMessage('plannedMenu is required')
    .isLength({ max: 1000 }).withMessage('plannedMenu must be 1000 characters or less'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
];

export const updateMealPlanValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('plannedMenu')
    .optional()
    .trim()
    .isLength({ min: 1, max: 1000 }).withMessage('plannedMenu must be between 1 and 1000 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
  body('date')
    .optional()
    .isISO8601().withMessage('date must be a valid ISO 8601 date'),
  body('mealType')
    .optional()
    .isIn(MEAL_TYPES).withMessage(`mealType must be one of: ${MEAL_TYPES.join(', ')}`),
];

export const mealPlanIdValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];
