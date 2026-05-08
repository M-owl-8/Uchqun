import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const THERAPY_TYPES = [
  'video', 'audio', 'article', 'exercise', 'game', 'breathing', 'meditation', 'other',
];

const CONTENT_TYPES = ['video', 'audio', 'article', 'interactive', 'other'];
const AGE_GROUPS = ['0-3', '3-6', '6-10', '10-14', '14+', 'all'];
const DIFFICULTY_LEVELS = ['easy', 'medium', 'hard'];

export const createTherapyValidator = [
  body('title')
    .trim()
    .notEmpty().withMessage('title is required')
    .isLength({ max: 255 }).withMessage('title must be 255 characters or less'),
  body('therapyType')
    .notEmpty().withMessage('therapyType is required')
    .isIn(THERAPY_TYPES).withMessage(`therapyType must be one of: ${THERAPY_TYPES.join(', ')}`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('description must be 5000 characters or less'),
  body('contentUrl')
    .optional()
    .trim()
    .isURL().withMessage('contentUrl must be a valid URL'),
  body('contentType')
    .optional()
    .isIn(CONTENT_TYPES).withMessage(`contentType must be one of: ${CONTENT_TYPES.join(', ')}`),
  body('duration')
    .optional()
    .isInt({ min: 1 }).withMessage('duration must be a positive integer (minutes)'),
  body('ageGroup')
    .optional()
    .isIn(AGE_GROUPS).withMessage(`ageGroup must be one of: ${AGE_GROUPS.join(', ')}`),
  body('difficultyLevel')
    .optional()
    .isIn(DIFFICULTY_LEVELS).withMessage(`difficultyLevel must be one of: ${DIFFICULTY_LEVELS.join(', ')}`),
  body('tags')
    .optional()
    .isArray().withMessage('tags must be an array'),
];

export const updateTherapyValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('title must be between 1 and 255 characters'),
  body('therapyType')
    .optional()
    .isIn(THERAPY_TYPES).withMessage(`therapyType must be one of: ${THERAPY_TYPES.join(', ')}`),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('description must be 5000 characters or less'),
  body('contentUrl')
    .optional()
    .trim()
    .isURL().withMessage('contentUrl must be a valid URL'),
  body('contentType')
    .optional()
    .isIn(CONTENT_TYPES).withMessage(`contentType must be one of: ${CONTENT_TYPES.join(', ')}`),
  body('duration')
    .optional()
    .isInt({ min: 1 }).withMessage('duration must be a positive integer (minutes)'),
  body('ageGroup')
    .optional()
    .isIn(AGE_GROUPS).withMessage(`ageGroup must be one of: ${AGE_GROUPS.join(', ')}`),
  body('difficultyLevel')
    .optional()
    .isIn(DIFFICULTY_LEVELS).withMessage(`difficultyLevel must be one of: ${DIFFICULTY_LEVELS.join(', ')}`),
  body('isActive')
    .optional()
    .isBoolean().withMessage('isActive must be a boolean'),
];

export const endTherapyValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('progress')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('progress must be a number between 0 and 100'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 }).withMessage('rating must be an integer between 1 and 5'),
  body('feedback')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('feedback must be 5000 characters or less'),
];

export const therapyIdValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];
