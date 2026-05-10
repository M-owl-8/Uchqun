import { body, param } from 'express-validator';

const VALID_TYPES = ['music', 'video', 'recommendation'];

export const createResourceValidator = [
  body('type')
    .trim()
    .notEmpty().withMessage('type is required')
    .isIn(VALID_TYPES).withMessage('type must be music, video, or recommendation'),
  body('title')
    .trim()
    .notEmpty().withMessage('title is required')
    .isLength({ max: 500 }).withMessage('title must be 500 characters or fewer'),
  body('description').optional().trim(),
  body('url').optional({ checkFalsy: true }).trim().isURL().withMessage('url must be a valid URL'),
];

export const resourceIdValidator = [
  param('id').isUUID().withMessage('id must be a valid UUID'),
];
