import express from 'express';
import {
  getMealPlans,
  createMealPlan,
  bulkCreateMealPlans,
  updateMealPlan,
  deleteMealPlan,
} from '../controllers/mealPlanController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  createMealPlanValidator,
  bulkCreateMealPlansValidator,
  updateMealPlanValidator,
  mealPlanIdValidator,
} from '../validators/mealPlanValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getMealPlans);
router.post('/', requireRole('teacher', 'admin'), createMealPlanValidator, handleValidationErrors, createMealPlan);
router.post('/bulk', requireRole('teacher', 'admin'), bulkCreateMealPlansValidator, handleValidationErrors, bulkCreateMealPlans);
router.put('/:id', requireRole('teacher', 'admin'), updateMealPlanValidator, handleValidationErrors, updateMealPlan);
router.delete('/:id', requireRole('teacher', 'admin'), mealPlanIdValidator, handleValidationErrors, deleteMealPlan);

export default router;
