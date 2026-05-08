import express from 'express';
import { getProgress, updateProgress } from '../controllers/progressController.js';
import { authenticate } from '../middleware/auth.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { updateProgressValidator } from '../validators/progressValidator.js';

const router = express.Router();

router.use(authenticate);

router.get('/', getProgress);
router.put('/', updateProgressValidator, handleValidationErrors, updateProgress);

export default router;



