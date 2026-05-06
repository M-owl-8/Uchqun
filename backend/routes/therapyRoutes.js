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

// Specific paths must come before /:id paths so Express matches them first
router.get('/usage', getTherapyUsage);
router.put('/usage/:id/end', requireRole('parent', 'teacher'), endTherapy);
router.post('/:id/start', requireRole('parent', 'teacher'), startTherapy);

router.get('/:id', getTherapy);

router.post('/', requireRole('admin', 'teacher'), createTherapy);
router.put('/:id', requireRole('admin', 'teacher'), updateTherapy);
router.delete('/:id', requireRole('admin', 'teacher'), deleteTherapy);

export default router;
