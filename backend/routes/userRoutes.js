import express from 'express';
import { updateProfile, changePassword, updateAvatar } from '../controllers/userController.js';
import { sendMessage } from '../controllers/governmentMessageController.js';
import { authenticate } from '../middleware/auth.js';
import { updateProfileValidator, changePasswordValidator } from '../validators/userValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { uploadUserAvatar } from '../middleware/uploadChildren.js';
import { changePasswordLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.use(authenticate);

router.put('/profile', updateProfileValidator, handleValidationErrors, updateProfile);
router.put('/avatar', uploadUserAvatar.single('avatar'), updateAvatar);
router.put('/password', changePasswordLimiter, changePasswordValidator, handleValidationErrors, changePassword);

// Send message to government (available for all authenticated users)
router.post('/message-to-government', sendMessage);

export default router;

