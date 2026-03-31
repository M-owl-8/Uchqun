import express from 'express';
import {
  getMealPlans,
  createMealPlan,
  bulkCreateMealPlans,
  updateMealPlan,
  deleteMealPlan,
} from '../controllers/mealPlanController.js';
import { authenticate, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMealPlans);
router.post('/', requireRole('teacher', 'admin'), createMealPlan);
router.post('/bulk', requireRole('teacher', 'admin'), bulkCreateMealPlans);
router.put('/:id', requireRole('teacher', 'admin'), updateMealPlan);
router.delete('/:id', requireRole('teacher', 'admin'), deleteMealPlan);

export default router;
