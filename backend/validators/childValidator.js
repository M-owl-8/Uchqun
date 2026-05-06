import { body, param } from 'express-validator';

// UUID validation regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const isUUID = (value) => {
  return typeof value === 'string' && UUID_REGEX.test(value);
};

export const createChildValidator = [
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  body('dateOfBirth')
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age > 25) {
        throw new Error('Date of birth is too old (student age should be reasonable)');
      }
      return true;
    }),
  body('gender')
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('disabilityType')
    .trim()
    .notEmpty()
    .withMessage('Disability type is required')
    .isLength({ max: 500 })
    .withMessage('Disability type must be 500 characters or less'),
  body('specialNeeds')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Special needs description must be 5000 characters or less'),
  body('photo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Photo must be a valid URL'),
  body('school')
    .trim()
    .notEmpty()
    .withMessage('School is required')
    .isLength({ max: 500 })
    .withMessage('School name must be 500 characters or less'),
  body('class')
    .trim()
    .notEmpty()
    .withMessage('Class is required')
    .isLength({ max: 255 })
    .withMessage('Class name must be 255 characters or less'),
  body('teacher')
    .trim()
    .notEmpty()
    .withMessage('Teacher name is required')
    .isLength({ max: 255 })
    .withMessage('Teacher name must be 255 characters or less'),
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Emergency contact must be an object'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Emergency contact name must be 255 characters or less'),
  body('emergencyContact.phone')
    .optional()
    .trim()
    .customSanitizer(v => v.replace(/[\s\-().]/g, ''))
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Emergency contact phone must be a valid phone number (e.g. +998901234567)'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact relationship must be 100 characters or less'),
];

// For updates - all fields are optional and photo validation is skipped (handled by multer)
export const updateChildValidator = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('First name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ min: 1, max: 100 })
    .withMessage('Last name must be between 1 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/)
    .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  body('dateOfBirth')
    .optional()
    .notEmpty()
    .withMessage('Date of birth is required')
    .isISO8601()
    .withMessage('Date of birth must be a valid date (YYYY-MM-DD)')
    .custom((value) => {
      const birthDate = new Date(value);
      const today = new Date();
      if (birthDate > today) {
        throw new Error('Date of birth cannot be in the future');
      }
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age > 25) {
        throw new Error('Date of birth is too old (student age should be reasonable)');
      }
      return true;
    }),
  body('gender')
    .optional()
    .notEmpty()
    .withMessage('Gender is required')
    .isIn(['Male', 'Female', 'Other'])
    .withMessage('Gender must be Male, Female, or Other'),
  body('disabilityType')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Disability type is required')
    .isLength({ max: 500 })
    .withMessage('Disability type must be 500 characters or less'),
  body('specialNeeds')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Special needs description must be 5000 characters or less'),
  // Photo validation removed - file uploads are handled by multer middleware
  // Allow base64 photo uploads
  body('photoBase64')
    .optional()
    .isString()
    .withMessage('Photo base64 must be a string'),
  body('school')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('School is required')
    .isLength({ max: 500 })
    .withMessage('School name must be 500 characters or less'),
  body('class')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Class is required')
    .isLength({ max: 255 })
    .withMessage('Class name must be 255 characters or less'),
  body('teacher')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Teacher name is required')
    .isLength({ max: 255 })
    .withMessage('Teacher name must be 255 characters or less'),
  body('emergencyContact')
    .optional()
    .isObject()
    .withMessage('Emergency contact must be an object'),
  body('emergencyContact.name')
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage('Emergency contact name must be 255 characters or less'),
  body('emergencyContact.phone')
    .optional()
    .trim()
    .customSanitizer(v => v.replace(/[\s\-().]/g, ''))
    .matches(/^\+?[1-9]\d{6,14}$/)
    .withMessage('Emergency contact phone must be a valid phone number (e.g. +998901234567)'),
  body('emergencyContact.relationship')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Emergency contact relationship must be 100 characters or less'),
];

export const childIdValidator = [
  param('id')
    .notEmpty()
    .withMessage('Child ID is required')
    .custom((value) => {
      if (!isUUID(value)) {
        throw new Error('Child ID must be a valid UUID');
      }
      return true;
    }),
];

