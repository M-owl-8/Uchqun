import logger from '../utils/logger.js';
import { captureException } from '../utils/errorTracker.js';

const isProduction = process.env.NODE_ENV === 'production';

export const errorHandler = (err, req, res, next) => {
  logger.error('Request error', {
    correlationId: req.correlationId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      status: err.status,
    },
    url: req.url,
    method: req.method,
    ip: req.ip,
    userId: req.user?.id,
    role: req.user?.role,
  });

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation error',
      details: isProduction
        ? ['One or more validation errors occurred']
        : err.errors.map(e => e.message),
    });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      error: 'Duplicate entry',
      message: isProduction
        ? 'A record with this information already exists'
        : err.errors.map(e => e.message).join(', '),
    });
  }

  if (err.name === 'SequelizeDatabaseError') {
    captureException(err, { url: req.url, userId: req.user?.id });
    return res.status(500).json({
      success: false,
      error: 'Database error',
      message: isProduction
        ? 'An error occurred while processing your request'
        : err.message,
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication error',
      message: 'Invalid or expired token',
    });
  }

  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests',
      message: err.message || 'Too many requests from this IP, please try again later',
    });
  }

  if (err.status && err.status >= 400 && err.status < 500) {
    return res.status(err.status).json({
      success: false,
      error: err.message || 'Bad request',
      ...(isProduction ? {} : { details: err.details }),
    });
  }

  const status = err.status || 500;
  captureException(err, { url: req.url, method: req.method, userId: req.user?.id });
  return res.status(status).json({
    success: false,
    error: isProduction
      ? 'An unexpected error occurred'
      : err.message || 'Internal server error',
    ...(isProduction ? {} : {
      details: err.details,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    }),
  });
};

export const notFound = (req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' });
};
