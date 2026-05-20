import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRedisClient } from '../utils/redisClient.js';
import logger from '../utils/logger.js';

// In-memory JTI store — used when REDIS_URL is not configured (single-instance only)
const _revokedJtis = new Map(); // jti → expiresAt (ms)

// Revokes a JTI in Redis (preferred) or in-memory fallback.
export const revokeJti = async (jti, expiresAtMs) => {
  if (!jti) return;
  const redis = getRedisClient();
  if (redis) {
    try {
      const ttlSecs = Math.max(1, Math.ceil((expiresAtMs - Date.now()) / 1000));
      await redis.set(`revoked:jti:${jti}`, '1', 'EX', ttlSecs);
    } catch (err) {
      logger.error('Redis revokeJti error — falling back to in-memory', { message: err.message });
      _revokedJtis.set(jti, expiresAtMs);
    }
    return;
  }
  _revokedJtis.set(jti, expiresAtMs);
};

// Returns true (revoked) on Redis error — fail-closed for security.
const _isJtiRevoked = async (jti) => {
  if (!jti) return false;
  const redis = getRedisClient();
  if (redis) {
    try {
      const exists = await redis.exists(`revoked:jti:${jti}`);
      return exists === 1;
    } catch (err) {
      logger.error('Redis _isJtiRevoked error — fail closed', { message: err.message });
      return true;
    }
  }
  return _revokedJtis.has(jti);
};

const _pruneRevokedJtis = () => {
  const now = Date.now();
  for (const [jti, exp] of _revokedJtis) {
    if (exp < now) _revokedJtis.delete(jti);
  }
};

const _userCache = new Map();
const USER_CACHE_TTL = 30_000;

export const invalidateUserCache = (userId) => {
  _userCache.delete(userId);
};

const getCachedUser = async (userId) => {
  if (process.env.NODE_ENV === 'test') return User.findByPk(userId);
  const cached = _userCache.get(userId);
  if (cached && Date.now() - cached.at < USER_CACHE_TTL) return cached.user;
  const user = await User.findByPk(userId);
  if (user) _userCache.set(userId, { user, at: Date.now() });
  return user;
};

export const authenticate = async (req, res, next) => {
  try {
    let token = req.cookies?.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
      }
      token = authHeader.substring(7);
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (await _isJtiRevoked(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    // Only prune in-memory store (no-op when Redis is active — Redis TTLs handle expiry)
    if (!getRedisClient() && _revokedJtis.size > 0) _pruneRevokedJtis();

    req.jti = decoded.jti;
    req.tokenExpiry = decoded.exp ? decoded.exp * 1000 : Date.now() + 15 * 60 * 1000;

    const user = await getCachedUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isGovernment = user.role === 'government';

    // T2-2: status is the canonical suspension gate; government users are exempt.
    if (!isGovernment && (user.status === 'suspended' || user.status === 'archived')) {
      return res.status(401).json({ success: false, error: { code: 'ACCOUNT_NOT_ACTIVE' } });
    }

    // Legacy isActive gate — applies to reception, teacher, admin (not parent, not government).
    const isParent = user.role === 'parent';
    if (!isParent && !isGovernment && !user.isActive) {
      return res.status(403).json({ error: 'Account is not active' });
    }

    if (user.role === 'reception' && (!user.documentsApproved || !user.isActive)) {
      return res.status(403).json({
        error: 'Account not approved. Please wait for Admin approval.',
        requiresApproval: true,
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireReception = requireRole('reception');

export const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  if (['teacher', 'reception', 'admin'].includes(req.user.role)) {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions' });
};

export const requireParent = requireRole('parent');
export const requireAdminOrReception = requireRole('admin', 'reception');
export const requireGovernment = requireRole('government');
export const requireBusiness = requireRole('business');
