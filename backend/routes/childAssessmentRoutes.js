import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getAssessments, createAssessment, updateAssessment, getLatestAssessments } from '../controllers/childAssessmentController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  createAssessmentValidator,
  updateAssessmentValidator,
} from '../validators/childAssessmentValidator.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getAssessments);
router.get('/latest', getLatestAssessments);
router.post('/', requireRole('teacher', 'admin'), createAssessmentValidator, handleValidationErrors, createAssessment);
router.put('/:id', requireRole('teacher', 'admin'), updateAssessmentValidator, handleValidationErrors, updateAssessment);

export default router;
