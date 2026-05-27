import express from 'express';
import { login, getMe, logout, refresh, setPassword, unlockAccount } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { loginValidator } from '../validators/authValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { submitRegistrationRequest } from '../controllers/adminRegistrationController.js';
import { uploadDocuments, handleUploadError } from '../middleware/upload.js';
import { authLimiter, loginLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// loginLimiter keys by email so one user's failures never block others on the same NAT/school IP
router.post('/login', loginLimiter, loginValidator, handleValidationErrors, login);
// /refresh carries a random 40-byte token — not brute-forceable; apiLimiter (global) is sufficient
router.post('/refresh', refresh);
router.post('/set-password', authLimiter, setPassword);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.post('/unlock-account', authenticate, requireRole('government', 'admin'), unlockAccount);

router.post(
  '/admin-register',
  authLimiter,
  uploadLimiter,
  uploadDocuments,
  handleUploadError,
  submitRegistrationRequest
);

export default router;
