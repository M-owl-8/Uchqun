import { body, param } from 'express-validator';

const passwordRules = (field = 'password', optional = false) => {
  const chain = optional ? body(field).optional() : body(field);
  return chain
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number');
};

export const createAdminValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  passwordRules('password'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be at most 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be at most 100 characters'),
  body('phone')
    .optional()
    .trim()
    .customSanitizer(v => v.replace(/[\s\-().]/g, ''))
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number (e.g. +998901234567)'),
];

export const updateAdminValidator = [
  param('id').isUUID().withMessage('Invalid admin ID'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .customSanitizer(v => v.replace(/[\s\-().]/g, ''))
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number (e.g. +998901234567)'),
];

export const deleteAdminValidator = [
  param('id').isUUID().withMessage('Invalid admin ID'),
];

export const createGovernmentValidator = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  passwordRules('password'),
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 100 })
    .withMessage('First name must be at most 100 characters'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 100 })
    .withMessage('Last name must be at most 100 characters'),
  body('phone')
    .optional()
    .trim()
    .customSanitizer(v => v.replace(/[\s\-().]/g, ''))
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number (e.g. +998901234567)'),
];

export const updateGovernmentValidator = [
  param('id').isUUID().withMessage('Invalid government account ID'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters'),
  body('phone')
    .optional()
    .trim()
    .customSanitizer(v => v.replace(/[\s\-().]/g, ''))
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Please provide a valid phone number (e.g. +998901234567)'),
];

export const deleteGovernmentValidator = [
  param('id').isUUID().withMessage('Invalid government account ID'),
];
