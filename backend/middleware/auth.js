import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 * 
 * Business Logic:
 * - Validates JWT token from Authorization header
 * - For Reception role: checks if documents are approved and account is active
 * - For all roles: ensures user exists and is authenticated
 */
export const authenticate = async (req, res, next) => {
  try {
    // Read token from cookie first, fall back to Authorization header (for mobile)
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

    // Reception-specific check: must have approved documents and active account
    if (user.role === 'reception') {
      if (!user.documentsApproved || !user.isActive) {
        return res.status(403).json({ 
          error: 'Account not approved. Please wait for Admin approval.',
          requiresApproval: true 
        });
      }
    }

    // Note: Parent role doesn't need isActive check - they can always access their own children
    // The updateChild controller already checks parentId: req.user.id

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

/**
 * Role-based Authorization Middleware
 * Ensures user has one of the required roles
 * 
 * @param {...string} roles - Allowed roles (admin, reception, teacher, parent)
 */
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
      });
    }
    next();
  };
};

/**
 * Admin-only Middleware
 * Ensures only Admin role can access
 */
export const requireAdmin = requireRole('admin');

/**
 * Reception-only Middleware
 * Ensures only Reception role can access
 */
export const requireReception = requireRole('reception');

/**
 * Teacher-only Middleware
 * Ensures only Teacher role can access
 * Note: Reception role can also access teacher routes (they manage teachers)
 */
export const requireTeacher = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  // Allow both teacher and reception roles
  if (req.user.role === 'teacher' || req.user.role === 'reception' || req.user.role === 'admin') {
    return next();
  }
  return res.status(403).json({ error: 'Insufficient permissions. Teacher, Reception, or Admin role required.' });
};

/**
 * Parent-only Middleware
 * Ensures only Parent role can access
 */
export const requireParent = requireRole('parent');

/**
 * Admin or Reception Middleware
 * Allows both Admin and Reception roles
 */
export const requireAdminOrReception = requireRole('admin', 'reception');

/**
 * Government-only Middleware
 * Ensures only Government role can access
 */
export const requireGovernment = requireRole('government');/**
 * Business-only Middleware
 * Ensures only Business role can access
 */
export const requireBusiness = requireRole('business');
