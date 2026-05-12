import { v4 as uuidv4 } from 'uuid';
import logger from '../utils/logger.js';

/**
 * Request logging middleware
 * Adds correlation ID to requests and logs all HTTP requests
 */
export const requestLogger = (req, res, next) => {
  // Generate correlation ID for request tracing
  const correlationId = req.headers['x-correlation-id'] || uuidv4();
  req.correlationId = correlationId;
  
  // Add correlation ID to response headers
  res.setHeader('X-Correlation-ID', correlationId);

  // Log request start
  const startTime = Date.now();

  // Log request details
  logger.info('Incoming request', {
    correlationId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('user-agent'),
    userId: req.user?.id,
    role: req.user?.role,
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    logger.info('Request completed', {
      correlationId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: req.user?.id,
      role: req.user?.role,
    });
  });

  next();
};

/**
 * Error logging middleware
 * Should be used after error handler to log errors with correlation ID
 */
export const errorLogger = (err, req, res, next) => {
  logger.error('Request error', {
    correlationId: req.correlationId,
    error: {
      message: err.message,
      stack: err.stack,
      name: err.name,
      status: err.status,
    },
    method: req.method,
    url: req.url,
    userId: req.user?.id,
    role: req.user?.role,
  });

  next(err);
};



