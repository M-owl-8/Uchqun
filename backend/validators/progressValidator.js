import { body } from 'express-validator';

export const updateProgressValidator = [
  body('academic')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('academic must be a number between 0 and 100'),
  body('social')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('social must be a number between 0 and 100'),
  body('behavioral')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('behavioral must be a number between 0 and 100'),
  body('overallScore')
    .optional()
    .isFloat({ min: 0, max: 100 }).withMessage('overallScore must be a number between 0 and 100'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 5000 }).withMessage('notes must be 5000 characters or less'),
];
