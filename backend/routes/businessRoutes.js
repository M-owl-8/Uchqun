import express from 'express';
import {
  getOverview,
  getUsersStats,
  getUsageStats,
  generateStats,
  getSavedStats,
} from '../controllers/businessController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { generateStatsValidator } from '../validators/businessValidator.js';

const router = express.Router();

router.use(authenticate);
router.use(requireRole('business', 'government'));

router.get('/overview', getOverview);
router.get('/users', getUsersStats);
router.get('/usage', getUsageStats);
router.post('/stats/generate', generateStatsValidator, handleValidationErrors, generateStats);
router.get('/stats', getSavedStats);

export default router;
