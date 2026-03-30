import express from 'express';
import { login, getMe, logout, refresh } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';
import { loginValidator } from '../validators/authValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import { submitRegistrationRequest } from '../controllers/adminRegistrationController.js';
import { uploadDocuments, handleUploadError, debugMulter } from '../middleware/upload.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Authenticate user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login successful
 *       401:
 *         description: Invalid credentials
 *
 * /auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: User profile
 *       401:
 *         description: Not authenticated
 */
router.post('/login', authLimiter, loginValidator, handleValidationErrors, login);
router.post('/refresh', authLimiter, refresh);
router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);

// Admin registration request (public endpoint) - with file uploads
// Debug middleware to see what multer receives
router.post('/admin-register', authLimiter, (req, res, next) => {
  logger.info('Admin register request received', {
    contentType: req.headers['content-type'],
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
  });
  next();
}, uploadDocuments, (req, res, next) => {
  logger.info('After multer processing', {
    body: req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    files: req.files ? Object.keys(req.files) : [],
    hasCertificate: !!(req.files?.certificateFile),
    hasPassport: !!(req.files?.passportFile),
  });
  next();
}, handleUploadError, submitRegistrationRequest);

export default router;

