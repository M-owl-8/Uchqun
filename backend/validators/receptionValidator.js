import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const GENDER_VALUES = ['male', 'female', 'MALE', 'FEMALE'];

// Reusable for both createTeacher and createReception
export const createStaffValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('firstName is required')
    .isLength({ max: 100 }).withMessage('firstName must be 100 characters or less'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('lastName is required')
    .isLength({ max: 100 }).withMessage('lastName must be 100 characters or less'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('phone must be 20 characters or less'),
];

export const createParentValidator = [
  body('email')
    .trim()
    .isEmail().withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('password must contain at least one uppercase letter, one lowercase letter, and one number'),
  body('firstName')
    .trim()
    .notEmpty().withMessage('firstName is required')
    .isLength({ max: 100 }).withMessage('firstName must be 100 characters or less'),
  body('lastName')
    .trim()
    .notEmpty().withMessage('lastName is required')
    .isLength({ max: 100 }).withMessage('lastName must be 100 characters or less'),
  body('phone')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('phone must be 20 characters or less'),
  body('teacherId')
    .optional()
    .custom(v => UUID_RE.test(v)).withMessage('teacherId must be a valid UUID'),
  body('groupId')
    .optional()
    .custom(v => UUID_RE.test(v)).withMessage('groupId must be a valid UUID'),
  body('child[firstName]')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("child[firstName] must be 100 characters or less"),
  body('child[lastName]')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage("child[lastName] must be 100 characters or less"),
  body('child[gender]')
    .optional()
    .isIn(GENDER_VALUES).withMessage(`child[gender] must be one of: ${GENDER_VALUES.join(', ')}`),
];

export const receptionIdParamValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];
