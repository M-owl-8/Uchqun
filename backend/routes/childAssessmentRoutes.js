import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getAssessments, createAssessment, updateAssessment, getLatestAssessments } from '../controllers/childAssessmentController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getAssessments);
router.get('/latest', getLatestAssessments);
router.post('/', requireRole('teacher', 'admin'), createAssessment);
router.put('/:id', requireRole('teacher', 'admin'), updateAssessment);

export default router;
