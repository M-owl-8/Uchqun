import express from 'express';
import {
  analyzeRatings,
  getWarnings,
  resolveWarning,
  notifyUsers,
} from '../controllers/aiWarningController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import {
  analyzeWarningsValidator,
  resolveWarningValidator,
  notifyWarningValidator,
} from '../validators/aiWarningValidator.js';

const router = express.Router();

router.use(authenticate);

// Analyze ratings and generate warnings (Admin, Government)
router.post('/analyze', requireRole('admin', 'government'), analyzeWarningsValidator, handleValidationErrors, analyzeRatings);

// Get warnings (admin and government only)
router.get('/', requireRole('admin', 'government'), getWarnings);

// Resolve warning (Admin, Government)
router.put('/:id/resolve', requireRole('admin', 'government'), resolveWarningValidator, handleValidationErrors, resolveWarning);

// Notify users about warning (Admin, Government)
router.post('/:id/notify', requireRole('admin', 'government'), notifyWarningValidator, handleValidationErrors, notifyUsers);

export default router;
