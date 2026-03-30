import express from 'express';
import { updateProfile, changePassword, updateAvatar } from '../controllers/userController.js';
import { sendMessage } from '../controllers/superAdminController.js';
import { authenticate } from '../middleware/auth.js';
import { updateProfileValidator, changePasswordValidator } from '../validators/userValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { uploadUserAvatar } from '../middleware/uploadChildren.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.put('/profile', updateProfileValidator, handleValidationErrors, updateProfile);
router.put('/avatar', uploadUserAvatar.single('avatar'), updateAvatar);
router.put('/password', passwordResetLimiter, changePasswordValidator, handleValidationErrors, changePassword);

// Send message to super-admin (available for all authenticated users)
router.post('/message-to-super-admin', sendMessage);

export default router;

