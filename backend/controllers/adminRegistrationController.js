import crypto from 'crypto';
import AdminRegistrationRequest from '../models/AdminRegistrationRequest.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';
import { uploadFile } from '../config/storage.js';
import fs from 'fs';
import { generateSetPasswordToken } from './authController.js';

const TELEGRAM_USERNAME_RE = /^[a-zA-Z0-9_]{5,32}$/;

/**
 * Generate a cryptographically secure random password
 * @param {number} length - Password length (default: 16)
 * @returns {string} Secure random password
 */
const generateSecurePassword = (length = 16) => {
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghjkmnpqrstuvwxyz';
  const numbers = '23456789';
  const symbols = '!@#$%&*';
  const allChars = uppercase + lowercase + numbers + symbols;

  // Ensure at least one of each type
  let password = '';
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
};

/**
 * Submit admin registration request
 * POST /api/auth/admin-register
 * Public endpoint - no authentication required
 */
export const submitRegistrationRequest = async (req, res) => {
  try {
    logger.info('Admin registration request received', {
      bodyKeys: req.body ? Object.keys(req.body) : 'no body',
      files: req.files ? Object.keys(req.files) : 'no files',
      hasCertificate: !!(req.files?.certificateFile),
      hasPassport: !!(req.files?.passportFile),
      contentType: req.headers['content-type'],
    });

    // Get form data from req.body (multer should parse multipart/form-data)
    const firstName = req.body?.firstName?.trim() || '';
    const lastName = req.body?.lastName?.trim() || '';
    const email = req.body?.email?.trim() || '';
    const phone = req.body?.phone?.trim() || '';
    const telegramUsername = req.body?.telegramUsername?.trim()?.replace('@', '') || null;

    // Required field validation
    if (!firstName || !lastName || !email || !phone || !telegramUsername) {
      const missingFields = [];
      if (!firstName) missingFields.push('firstName');
      if (!lastName) missingFields.push('lastName');
      if (!email) missingFields.push('email');
      if (!phone) missingFields.push('phone');
      if (!telegramUsername) missingFields.push('telegramUsername');

      logger.warn('Registration validation failed — missing fields', { missingFields });
      return res.status(400).json({
        success: false,
        error: 'Ism, familiya, email, telefon raqami va Telegram username to\'ldirilishi shart',
        details: { missingFields },
      });
    }

    if (!TELEGRAM_USERNAME_RE.test(telegramUsername)) {
      return res.status(400).json({
        success: false,
        error: 'Telegram username 5–32 ta belgidan iborat bo\'lishi kerak (harflar, raqamlar, pastki chiziq)',
      });
    }

    // Check if certificate or passport file is provided
    if (!req.files || (!req.files.certificateFile && !req.files.passportFile)) {
      return res.status(400).json({
        error: 'Kamida bitta hujjat (guvohnoma yoki passport/ID karta) yuklanishi kerak',
      });
    }

    // Check if email already exists in users table
    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered',
      });
    }

    // Check if there's already a pending request with this email
    const existingRequest = await AdminRegistrationRequest.findOne({
      where: {
        email: email.toLowerCase().trim(),
        status: { [Op.in]: ['pending', 'approved'] },
      },
    });

    if (existingRequest) {
      return res.status(400).json({
        error: 'Registration request already exists for this email',
      });
    }

    // Upload files to storage
    let certificateFilePath = null;
    let passportFilePath = null;

    if (req.files.certificateFile && req.files.certificateFile[0]) {
      const certFile = req.files.certificateFile[0];
      const certBuffer = await fs.promises.readFile(certFile.path);
      const certUpload = await uploadFile(
        certBuffer,
        `admin-registration/certificate-${crypto.randomUUID()}`,
        certFile.mimetype
      );
      certificateFilePath = certUpload.url || certUpload.path;
      // Clean up temp file
      await fs.promises.unlink(certFile.path).catch(() => {});
    }

    if (req.files.passportFile && req.files.passportFile[0]) {
      const passFile = req.files.passportFile[0];
      const passBuffer = await fs.promises.readFile(passFile.path);
      const passUpload = await uploadFile(
        passBuffer,
        `admin-registration/passport-${crypto.randomUUID()}`,
        passFile.mimetype
      );
      passportFilePath = passUpload.url || passUpload.path;
      // Clean up temp file
      await fs.promises.unlink(passFile.path).catch(() => {});
    }

    // Create registration request
    const schoolId = req.body?.schoolId || null;
    const request = await AdminRegistrationRequest.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      telegramUsername: telegramUsername,
      certificateFile: certificateFilePath,
      passportFile: passportFilePath,
      schoolId: schoolId,
      status: 'pending',
    });

    logger.info('Admin registration request submitted', {
      requestId: request.id,
      email: request.email,
      hasCertificate: !!certificateFilePath,
      hasPassport: !!passportFilePath,
    });

    res.status(201).json({
      success: true,
      message: 'Registration request submitted successfully. Please wait for government approval.',
      data: request.toJSON(),
    });
  } catch (error) {
    logger.error('Submit admin registration request error', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });
    
    // Check if it's a Sequelize validation error (from database constraints)
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors?.map(e => e.message).join(', ') || error.message;
      return res.status(400).json({
        error: 'Ma\'lumotlarni to\'ldirishda xatolik',
        details: validationErrors,
      });
    }
    
    // Check if it's a database constraint error
    if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Ma\'lumotlarni saqlashda xatolik',
        details: error.message,
      });
    }
    
    res.status(500).json({
      error: 'Ro\'yxatdan o\'tishda xatolik yuz berdi',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all admin registration requests (for government)
 * GET /api/government/admin-registrations
 * Requires government authentication
 */
export const getRegistrationRequests = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};
    if (status) {
      where.status = status;
    }

    const { count, rows: requests } = await AdminRegistrationRequest.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: requests.map(r => r.toJSON()),
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get registration requests error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch registration requests' });
  }
};

/**
 * Get single registration request by ID
 * GET /api/government/admin-registrations/:id
 */
export const getRegistrationRequestById = async (req, res) => {
  try {
    const { id } = req.params;

    const request = await AdminRegistrationRequest.findByPk(id, {
      include: [
        {
          model: User,
          as: 'reviewer',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: User,
          as: 'approvedUser',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
      ],
    });

    if (!request) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    res.json({
      success: true,
      data: request.toJSON(),
    });
  } catch (error) {
    logger.error('Get registration request by id error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to fetch registration request' });
  }
};

/**
 * Approve admin registration request
 * POST /api/government/admin-registrations/:id/approve
 * Requires government authentication
 * 
 * Creates the admin user account after approval
 */
export const approveRegistrationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { password, schoolId } = req.body;

    // Generate cryptographically secure password if not provided
    const generatedPassword = password || generateSecurePassword(16);

    if (generatedPassword.length < 8) {
      return res.status(400).json({
        error: 'Password must be at least 8 characters',
      });
    }

    // Find the request
    const request = await AdminRegistrationRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Request is already ${request.status}`,
      });
    }

    // Check if email is already taken
    const existingUser = await User.findOne({
      where: { email: request.email },
    });

    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered',
      });
    }

    // Create admin user account with a random placeholder password.
    // The admin sets their real password via the set-password link below.
    const placeholderPassword = crypto.randomBytes(32).toString('hex');
    const adminUser = await User.create({
      email: request.email,
      password: placeholderPassword,
      firstName: request.firstName,
      lastName: request.lastName,
      phone: request.phone,
      role: 'admin',
      isVerified: true,
      documentsApproved: true,
      isActive: true,
      schoolId: schoolId || request.schoolId,
    });

    // Update request status
    request.status = 'approved';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.approvedUserId = adminUser.id;
    await request.save();

    // Generate a 24-hour set-password token so the admin never sees a plaintext password
    const setPasswordToken = generateSetPasswordToken(adminUser.id);
    const adminPanelUrl = process.env.ADMIN_PANEL_URL || 'http://localhost:5175';
    const setPasswordUrl = `${adminPanelUrl}/set-password?token=${setPasswordToken}`;

    logger.info('Admin registration request approved', {
      requestId: id,
      adminUserId: adminUser.id,
      reviewedBy: req.user.id,
      email: request.email,
      telegramUsername: request.telegramUsername,
    });

    res.json({
      success: true,
      message: 'Registration request approved. Share the set-password link with the admin (valid 24 hours).',
      data: {
        request: request.toJSON(),
        admin: adminUser.toJSON(),
        setPasswordUrl,
        telegramUsername: request.telegramUsername,
      },
    });
  } catch (error) {
    logger.error('Approve registration request error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to approve registration request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Reject admin registration request
 * POST /api/government/admin-registrations/:id/reject
 * Requires government authentication
 */
export const rejectRegistrationRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const request = await AdminRegistrationRequest.findByPk(id);

    if (!request) {
      return res.status(404).json({ error: 'Registration request not found' });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: `Request is already ${request.status}`,
      });
    }

    // Update request status
    request.status = 'rejected';
    request.reviewedBy = req.user.id;
    request.reviewedAt = new Date();
    request.rejectionReason = reason?.trim() || null;
    await request.save();

    logger.info('Admin registration request rejected', {
      requestId: id,
      reviewedBy: req.user.id,
      reason: reason,
    });

    res.json({
      success: true,
      message: 'Registration request rejected',
      data: request.toJSON(),
    });
  } catch (error) {
    logger.error('Reject registration request error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      error: 'Failed to reject registration request',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};
