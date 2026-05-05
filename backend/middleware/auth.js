import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz';

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

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    const isParent = user.role === 'parent';
    const isSuperAdmin = user.role === 'admin' && user.email === SUPER_ADMIN_EMAIL;

    if (!isParent && !isSuperAdmin && !user.isActive) {
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
