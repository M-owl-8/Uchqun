import express from 'express';
import { 
  getMedia, 
  getMediaItem, 
  createMedia, 
  uploadMedia,
  updateMedia, 
  deleteMedia,
  proxyMediaFile
} from '../controllers/mediaController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createMediaValidator, updateMediaValidator, mediaIdValidator } from '../validators/mediaValidator.js';
import { paginationValidator, dateQueryValidator, childIdQueryValidator } from '../validators/queryValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import { body } from 'express-validator';

const router = express.Router();

// Proxy endpoint for Appwrite files (to avoid CORS issues)
// Requires authentication to ensure only authorized users can access media
router.get('/proxy/:fileId', authenticate, proxyMediaFile);

// All other routes require authentication
router.use(authenticate);

router.get('/', paginationValidator.concat(dateQueryValidator).concat(childIdQueryValidator), handleValidationErrors, getMedia);
router.get('/:id', mediaIdValidator, handleValidationErrors, getMediaItem);

// File upload endpoint (disabled for now to avoid storage issues)
// File upload endpoint (multipart/form-data) - stores files in Appwrite
router.post('/upload', 
  requireRole('teacher', 'admin', 'reception'), 
  uploadSingle,
  [
    body('childId')
      .notEmpty()
      .withMessage('Child ID is required'),
    body('title')
      .trim()
      .notEmpty()
      .withMessage('Title is required')
      .isLength({ min: 1, max: 500 })
      .withMessage('Title must be between 1 and 500 characters'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 5000 })
      .withMessage('Description must be 5000 characters or less'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be in YYYY-MM-DD format'),
    body('activityId')
      .optional(),
  ],
  handleValidationErrors,
  handleUploadError,
  uploadMedia
);

// URL-based media creation (legacy support)
router.post('/', requireRole('teacher', 'admin', 'reception'), createMediaValidator, handleValidationErrors, createMedia);
router.put('/:id', requireRole('teacher', 'admin', 'reception'), mediaIdValidator.concat(updateMediaValidator), handleValidationErrors, updateMedia);
router.delete('/:id', requireRole('teacher', 'admin', 'reception'), mediaIdValidator, handleValidationErrors, deleteMedia);

export default router;

