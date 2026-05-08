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
import { handleValidationErrors } from '../middleware/validation.js';
import {
  createTherapyValidator,
  updateTherapyValidator,
  endTherapyValidator,
  therapyIdValidator,
} from '../validators/therapyValidator.js';

const router = express.Router();

// All therapy routes require authentication
router.use(authenticate);

router.get('/', getTherapies);

// Specific paths must come before /:id paths so Express matches them first
router.get('/usage', getTherapyUsage);
router.put('/usage/:id/end', requireRole('parent', 'teacher'), endTherapyValidator, handleValidationErrors, endTherapy);
router.post('/:id/start', requireRole('parent', 'teacher'), therapyIdValidator, handleValidationErrors, startTherapy);

router.get('/:id', therapyIdValidator, handleValidationErrors, getTherapy);

router.post('/', requireRole('admin', 'teacher'), createTherapyValidator, handleValidationErrors, createTherapy);
router.put('/:id', requireRole('admin', 'teacher'), updateTherapyValidator, handleValidationErrors, updateTherapy);
router.delete('/:id', requireRole('admin', 'teacher'), therapyIdValidator, handleValidationErrors, deleteTherapy);

export default router;
