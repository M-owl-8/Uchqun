import express from 'express';
import crypto from 'crypto';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { createAdmin, createGovernment, getGovernments, updateGovernmentBySuper, deleteGovernmentBySuper, getAdmins, updateAdminBySuper, deleteAdminBySuper, getAllSchools } from '../controllers/adminController.js';
import { sendMessage, getMessages, getMessageById, replyToMessage, markMessageRead, deleteMessage, getAllPayments } from '../controllers/superAdminController.js';
import { getRegistrationRequests, getRegistrationRequestById, approveRegistrationRequest, rejectRegistrationRequest } from '../controllers/adminRegistrationController.js';
import { passwordResetLimiter } from '../middleware/rateLimiter.js';
import { createAdminValidator, updateAdminValidator, deleteAdminValidator, createGovernmentValidator, updateGovernmentValidator, deleteGovernmentValidator } from '../validators/superAdminValidator.js';
import { handleValidationErrors } from '../middleware/validation.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const router = express.Router();

const secretMatches = (provided, expected) => {
  if (!provided || !expected) return false;
  const a = crypto.createHash('sha256').update(String(provided)).digest();
  const b = crypto.createHash('sha256').update(String(expected)).digest();
  return crypto.timingSafeEqual(a, b);
};

router.post('/reset-super-admin-password', passwordResetLimiter, async (req, res) => {
  try {
    const { secretKey, newPassword } = req.body;

    if (!secretMatches(secretKey, process.env.SUPER_ADMIN_SECRET)) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const admin = await User.findOne({
      where: { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz' },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Super admin not found' });
    }

    await admin.update({ password: newPassword });
    logger.info('Super admin password reset');

    res.json({ success: true, message: 'Password reset successfully' });
  } catch (error) {
    logger.error('Password reset error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

if (process.env.NODE_ENV !== 'production') {
  router.post('/check-super-admin', async (req, res) => {
    try {
      const { secretKey } = req.body;

      if (!secretMatches(secretKey, process.env.SUPER_ADMIN_SECRET)) {
        return res.status(403).json({ error: 'Invalid secret key' });
      }

      const admin = await User.findOne({
        where: { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz' },
      });

      if (!admin) {
        return res.json({ exists: false });
      }

      res.json({ exists: true, role: admin.role, status: admin.status });
    } catch (error) {
      logger.error('Check super admin error', { error: error.message });
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}

router.post('/create-super-admin', passwordResetLimiter, async (req, res) => {
  try {
    const { secretKey, forceRecreate } = req.body;

    const requiredSecret = process.env.SUPER_ADMIN_SECRET || process.env.SUPER_ADMIN_SECRET_KEY;
    const isDevelopment = process.env.NODE_ENV !== 'production';

    if (requiredSecret && !secretMatches(secretKey, requiredSecret)) {
      return res.status(403).json({ error: 'Invalid secret key' });
    }

    if (!isDevelopment && !secretKey) {
      return res.status(403).json({ error: 'Secret key required in production' });
    }

    const existing = await User.findOne({
      where: { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz' },
    });

    if (existing) {
      if (forceRecreate) {
        await existing.destroy();
        logger.info('Old super admin deleted, creating new one');
      } else {
        return res.status(400).json({
          error: 'Super admin already exists',
          hint: 'Use forceRecreate: true to recreate',
        });
      }
    }

    const plainPassword = req.body.password || process.env.SUPER_ADMIN_DEFAULT_PASSWORD;
    if (!plainPassword || plainPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters. Provide via request body or SUPER_ADMIN_DEFAULT_PASSWORD env var.',
      });
    }

    await User.create({
      email: req.body.email || process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz',
      password: plainPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'admin',
      phone: '+998901234567',
      status: 'active',
    });

    logger.info('Super admin created');

    res.json({
      success: true,
      message: 'Super admin created successfully. Change password after first login.',
      credentials: { email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz' },
    });
  } catch (error) {
    logger.error('Create super-admin error', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/admins', authenticate, requireAdmin, createAdminValidator, handleValidationErrors, createAdmin);

router.use(authenticate);
router.use(requireAdmin);

router.get('/government', getGovernments);
router.post('/government', createGovernmentValidator, handleValidationErrors, createGovernment);
router.put('/government/:id', updateGovernmentValidator, handleValidationErrors, updateGovernmentBySuper);
router.delete('/government/:id', deleteGovernmentValidator, handleValidationErrors, deleteGovernmentBySuper);

router.get('/admins', getAdmins);
router.put('/admins/:id', updateAdminValidator, handleValidationErrors, updateAdminBySuper);
router.delete('/admins/:id', deleteAdminValidator, handleValidationErrors, deleteAdminBySuper);

router.get('/schools', getAllSchools);
router.get('/payments', getAllPayments);

router.get('/messages', getMessages);
router.get('/messages/:id', getMessageById);
router.post('/messages/:id/reply', replyToMessage);
router.put('/messages/:id/read', markMessageRead);
router.delete('/messages/:id', deleteMessage);

router.get('/admin-registrations', getRegistrationRequests);
router.get('/admin-registrations/:id', getRegistrationRequestById);
router.post('/admin-registrations/:id/approve', approveRegistrationRequest);
router.post('/admin-registrations/:id/reject', rejectRegistrationRequest);

export default router;
