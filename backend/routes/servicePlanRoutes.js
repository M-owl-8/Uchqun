import express from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import { getServicePlans, upsertServicePlan, bulkUpsertServicePlans } from '../controllers/servicePlanController.js';

const router = express.Router();
router.use(authenticate);

router.get('/', getServicePlans);
router.post('/', requireRole('teacher', 'admin'), upsertServicePlan);
router.post('/bulk', requireRole('teacher', 'admin'), bulkUpsertServicePlans);

export default router;
