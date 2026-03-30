import express from 'express';
import {
  getTherapies,
  getTherapy,
  createTherapy,
  updateTherapy,
  deleteTherapy,
  startTherapy,
  endTherapy,
  getTherapyUsage,
} from '../controllers/therapyController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All therapy routes require authentication
router.use(authenticate);

router.get('/', getTherapies);
router.get('/:id', getTherapy);

// Get therapy usage history (must come before /:id routes)
router.get('/usage', getTherapyUsage);

// Start therapy session (Parent, Teacher) - must come before /:id routes
router.post('/:id/start', requireRole('parent', 'teacher'), startTherapy);

// End therapy session (Parent, Teacher) - must come before /:id routes
router.put('/usage/:id/end', requireRole('parent', 'teacher'), endTherapy);

// Create therapy (Admin, Teacher)
router.post('/', requireRole('admin', 'teacher'), createTherapy);

// Update therapy (Admin, Teacher)
router.put('/:id', requireRole('admin', 'teacher'), updateTherapy);

// Delete therapy (Admin, Teacher)
router.delete('/:id', requireRole('admin', 'teacher'), deleteTherapy);

export default router;
