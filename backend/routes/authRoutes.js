import express from 'express';
import { login, getMe, logout, refresh } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { loginValidator } from '../validators/authValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { submitRegistrationRequest } from '../controllers/adminRegistrationController.js';
import { uploadDocuments, handleUploadError } from '../middleware/upload.js';
import { authLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.post('/login', authLimiter, loginValidator, handleValidationErrors, login);
router.post('/refresh', authLimiter, refresh);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

router.post(
  '/admin-register',
  authLimiter,
  uploadLimiter,
  uploadDocuments,
  handleUploadError,
  submitRegistrationRequest
);

export default router;
