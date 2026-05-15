import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import RefreshToken from '../models/RefreshToken.js';
import logger from '../utils/logger.js';
import { recordFailedAttempt, clearAttempts, isLockedOut } from '../utils/loginRateLimitStore.js';
import { revokeJti } from '../middleware/auth.js';

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

const generateRefreshToken = async (userId) => {
  const rawToken = crypto.randomBytes(40).toString('hex');
  const tokenHash = RefreshToken.hashToken(rawToken);
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    tokenHash,
    userId,
    expiresAt,
  });

  return rawToken;
};

export const generateSetPasswordToken = (userId) => {
  return jwt.sign(
    { userId, purpose: 'set-password', jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    logger.info('Login attempt', {
      email: email ? email.substring(0, 3) + '***' : 'missing',
      hasPassword: !!password,
    });

    if (!email || !password) {
      logger.warn('Login attempt with missing credentials');
      return res.status(400).json({
        success: false,
        error: 'Email and password are required',
      });
    }

    const normalizedEmail = (email || '').toLowerCase().trim();

    if (await isLockedOut(normalizedEmail)) {
      logger.warn('Login blocked — account locked out', { email: normalizedEmail.substring(0, 3) + '***' });
      return res.status(429).json({
        success: false,
        error: 'Account temporarily locked',
        message: 'Too many failed login attempts. Please try again in 15 minutes.',
      });
    }

    let user = await User.findOne({ where: { email: normalizedEmail } });

    if (!user) {
      const { Op } = await import('sequelize');
      user = await User.findOne({
        where: { email: { [Op.iLike]: normalizedEmail } }
      });
    }

    if (!user) {
      await recordFailedAttempt(normalizedEmail);
      logger.warn('Login attempt with non-existent email');
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        message: 'The email address or password you entered is incorrect. Please check and try again.'
      });
    }

    if (!user.password) {
      logger.error('User found but password field is missing', { userId: user.id });
      return res.status(500).json({ success: false, error: 'User account error. Please contact support.' });
    }

    if (!user.password.startsWith('$2')) {
      logger.error('User password is not properly hashed', { userId: user.id });
      return res.status(500).json({ success: false, error: 'User account error. Password needs to be reset.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      await recordFailedAttempt(normalizedEmail);
      logger.warn('Login attempt with invalid password', { userId: user.id });
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password',
        message: 'The email address or password you entered is incorrect. Please check and try again.'
      });
    }

    // Reception cannot log in until documents are approved by Admin
    if (user.role === 'reception') {
      if (!user.documentsApproved || !user.isActive) {
        return res.status(403).json({
          success: false,
          error: 'Account not approved. Please wait for Admin approval.',
          requiresApproval: true,
          documentsApproved: user.documentsApproved,
          isActive: user.isActive,
        });
      }
    }

    // Admin must be active to log in
    if (user.role === 'admin' && !user.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Admin account is not active. Please contact government.',
        requiresApproval: true,
      });
    }

    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET not configured');
      return res.status(500).json({
        success: false,
        error: 'Server configuration error',
        message: 'Authentication service is not properly configured. Please contact support.'
      });
    }

    await clearAttempts(normalizedEmail);

    const accessToken = generateAccessToken(user.id);
    const refreshToken = await generateRefreshToken(user.id);

    logger.info('Successful login', { userId: user.id, role: user.role });

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };

    res.cookie('accessToken', accessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      expiresIn: ACCESS_TOKEN_EXPIRY,
      user: user.toJSON(),
    });
  } catch (error) {
    logger.error('Login error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ success: false, error: 'Login failed' });
  }
};

export const refresh = async (req, res) => {
  try {
    const rawToken = req.body.refreshToken || req.cookies?.refreshToken;

    if (!rawToken) {
      return res.status(401).json({ success: false, error: 'Refresh token is required' });
    }

    let userId;
    const accessTokenFromCookie = req.cookies?.accessToken;
    const authHeader = req.headers.authorization;
    const accessTokenRaw = accessTokenFromCookie || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null);

    if (accessTokenRaw) {
      try {
        const decoded = jwt.verify(accessTokenRaw, process.env.JWT_SECRET, { ignoreExpiration: true });
        userId = decoded.userId;
      } catch {
        // ignore — fall through to hash-only lookup
      }
    }

    const tokenHash = RefreshToken.hashToken(rawToken);
    const whereClause = { tokenHash, revoked: false };
    if (userId) whereClause.userId = userId;

    const storedToken = await RefreshToken.findOne({ where: whereClause });

    if (!storedToken) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    if (new Date() > storedToken.expiresAt) {
      await storedToken.update({ revoked: true, revokedAt: new Date() });
      return res.status(401).json({ success: false, error: 'Refresh token expired' });
    }

    await storedToken.update({ revoked: true, revokedAt: new Date() });

    const newAccessToken = generateAccessToken(storedToken.userId);
    const newRefreshToken = await generateRefreshToken(storedToken.userId);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };

    res.cookie('accessToken', newAccessToken, {
      ...cookieOptions,
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', newRefreshToken, {
      ...cookieOptions,
      maxAge: REFRESH_TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      expiresIn: ACCESS_TOKEN_EXPIRY,
    });
  } catch (error) {
    logger.error('Token refresh error', { error: error.message });
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
};

export const logout = async (req, res) => {
  try {
    if (req.user?.id) {
      await RefreshToken.update(
        { revoked: true, revokedAt: new Date() },
        { where: { userId: req.user.id, revoked: false } }
      );
    }
    // #02-003 — revoke the access token JTI so it can't be replayed until expiry
    if (req.jti) await revokeJti(req.jti, req.tokenExpiry);

    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ success: true, data: user.toJSON() });
  } catch (error) {
    logger.error('Get me error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
};

export const unlockAccount = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ success: false, error: 'email is required' });
    }
    const normalized = email.toLowerCase().trim();
    await clearAttempts(normalized);
    logger.info('Account lockout cleared by admin', { clearedBy: req.user.id, role: req.user.role });
    res.json({ success: true, message: 'Account lockout cleared' });
  } catch (error) {
    logger.error('unlockAccount error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to clear lockout' });
  }
};

export const setPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and password are required' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, error: 'Invalid or expired token' });
    }

    if (decoded.purpose !== 'set-password') {
      return res.status(400).json({ success: false, error: 'Invalid token' });
    }

    if (
      password.length < 8 ||
      !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters with uppercase, lowercase, and a number',
      });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    await user.update({ password });
    logger.info('Password set via token', { userId: user.id });

    res.json({ success: true, message: 'Password set successfully. You can now log in.' });
  } catch (error) {
    logger.error('Set password error', { error: error.message });
    res.status(500).json({ success: false, error: 'Failed to set password' });
  }
};
