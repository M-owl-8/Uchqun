import { body } from 'express-validator';

const VALID_LEVELS = ['owner', 'region', 'republic'];

// Shared validator for message-to-government routes used by
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

// CP-022: parent-specific validator that requires recipientLevel + optional escalatedFromId.
export const parentMessageToGovValidator = [
  ...messageToGovValidator,
  body('recipientLevel')
    .notEmpty().withMessage('recipientLevel is required')
    .isIn(VALID_LEVELS).withMessage(`recipientLevel must be one of: ${VALID_LEVELS.join(', ')}`),
  body('escalatedFromId')
    .optional({ nullable: true })
    .isUUID().withMessage('escalatedFromId must be a valid UUID'),
];
