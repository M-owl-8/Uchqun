import { body } from 'express-validator';

export const aiChatValidator = [
  body('message')
    .trim()
    .notEmpty().withMessage('message is required')
    .isLength({ max: 5000 }).withMessage('message must be 5000 characters or less'),
  body('lang')
    .optional()
    .isIn(['uz', 'ru', 'en']).withMessage('lang must be uz, ru, or en'),
  body('messages')
    .optional()
    .isArray().withMessage('messages must be an array'),
];
