import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const _userCache = new Map();
const USER_CACHE_TTL = 30_000;

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

    const user = await getCachedUser(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isParent = user.role === 'parent';
    const isGovernment = user.role === 'government';

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
    return res.status(500).json({ error: 'Authentication error' });
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
