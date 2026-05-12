import rateLimit from 'express-rate-limit';

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// General API rate limiter — override with RATE_LIMIT_API_MAX / RATE_LIMIT_WINDOW_MS
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: Number(process.env.RATE_LIMIT_API_MAX) || (process.env.NODE_ENV === 'production' ? 100 : 1000),
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Stricter rate limiter for authentication endpoints
// Override with RATE_LIMIT_AUTH_MAX / RATE_LIMIT_WINDOW_MS (AUTH_LIMIT_MAX still accepted)
export const authLimiter = rateLimit({
  windowMs: Number(process.env.AUTH_LIMIT_WINDOW_MS) || WINDOW_MS,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || Number(process.env.AUTH_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 50 : 5000),
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true, // Don't count successful requests
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfterSec = req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime / 1000) : undefined;
    res.status(429).json({
      error: 'Too many login attempts',
      message: 'Too many login attempts from this IP, please try again later.',
      retryAfter: retryAfterSec,
    });
  },
});

// Very strict rate limiter for password reset endpoints (3 requests per hour)
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 requests per hour
  message: 'Too many password reset attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many password reset attempts',
      message: 'Too many password reset attempts from this IP, please try again after 1 hour.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Per-user rate limiter for AI chat endpoints (20 requests per minute per authenticated user)
export const aiChatLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'production' ? 20 : 200,
  keyGenerator: (req) => req.user?.id || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'AI rate limit exceeded',
      message: 'Too many AI requests. Please wait before trying again.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});

// Rate limiter for file uploads
// Override with RATE_LIMIT_UPLOAD_MAX / RATE_LIMIT_WINDOW_MS (UPLOAD_LIMIT_MAX still accepted)
export const uploadLimiter = rateLimit({
  windowMs: Number(process.env.UPLOAD_LIMIT_WINDOW_MS) || WINDOW_MS,
  max: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || Number(process.env.UPLOAD_LIMIT_MAX) || (process.env.NODE_ENV === 'production' ? 50 : 200),
  message: 'Too many file uploads, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many file uploads',
      message: 'Too many file uploads from this IP, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000),
    });
  },
});


