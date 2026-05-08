import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getServicePlans, upsertServicePlan, bulkUpsertServicePlans } from '../controllers/servicePlanController.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { upsertServicePlanValidator, bulkUpsertServicePlansValidator } from '../validators/servicePlanValidator.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getServicePlans);
router.post('/', requireRole('teacher', 'admin'), upsertServicePlanValidator, handleValidationErrors, upsertServicePlan);
router.post('/bulk', requireRole('teacher', 'admin'), bulkUpsertServicePlansValidator, handleValidationErrors, bulkUpsertServicePlans);

export default router;
