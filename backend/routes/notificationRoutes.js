import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
} from '../controllers/notificationController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { param } from 'express-validator';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const notificationIdValidator = [
  param('id').custom(v => UUID_RE.test(v)).withMessage('id must be a valid UUID'),
];

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get all notifications
router.get('/', getNotifications);

// Get unread count
router.get('/count', getUnreadCount);

// Mark notification as read
router.put('/:id/read', notificationIdValidator, handleValidationErrors, markAsRead);

// Mark all as read
router.put('/read-all', markAllAsRead);

// Delete notification
router.delete('/:id', notificationIdValidator, handleValidationErrors, deleteNotification);

export default router;


