import { body } from 'express-validator';

// Shared validator for message-to-government/super-admin routes used by
// parent, teacher, admin, and reception role routes.
export const messageToGovValidator = [
  body('subject')
    .trim()
    .notEmpty().withMessage('subject is required')
    .isLength({ max: 255 }).withMessage('subject must be 255 characters or less'),
  body('message')
    .trim()
    .notEmpty().withMessage('message is required')
    .isLength({ max: 10000 }).withMessage('message must be 10000 characters or less'),
];
