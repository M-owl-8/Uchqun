import { body, param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const sendMessageValidator = [
  body('conversationId')
    .notEmpty().withMessage('conversationId is required')
    .custom(v => UUID_RE.test(v)).withMessage('conversationId must be a valid UUID'),
  body('content')
    .trim()
    .notEmpty().withMessage('content is required')
    .isLength({ max: 10000 }).withMessage('content must be 10000 characters or less'),
];

export const markReadValidator = [
  body('conversationId')
    .notEmpty().withMessage('conversationId is required')
    .custom(v => UUID_RE.test(v)).withMessage('conversationId must be a valid UUID'),
];

export const updateMessageValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
  body('content')
    .trim()
    .notEmpty().withMessage('content is required')
    .isLength({ max: 10000 }).withMessage('content must be 10000 characters or less'),
];

export const messageIdValidator = [
  param('id')
    .custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];
