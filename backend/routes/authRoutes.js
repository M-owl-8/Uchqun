import express from 'express';
import { login, getMe, logout, refresh, setPassword, unlockAccount } from '../controllers/authController.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { loginValidator } from '../validators/authValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { submitRegistrationRequest } from '../controllers/adminRegistrationController.js';
import { uploadDocuments, handleUploadError } from '../middleware/upload.js';
import { authLimiter, loginLimiter, loginIpLimiter, uploadLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// loginIpLimiter: secondary IP bucket guards distributed brute-force across many emails (100/hr/IP)
// loginLimiter: primary per-email bucket — one user's failures never block others on the same NAT/school IP (20/15min/email)
router.post('/login', loginIpLimiter, loginLimiter, loginValidator, handleValidationErrors, login);
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
