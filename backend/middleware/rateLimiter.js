import rateLimit from 'express-rate-limit';
import { makeRedisStore } from '../utils/redisRateLimitStore.js';

const WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

// General API rate limiter — override with RATE_LIMIT_API_MAX / RATE_LIMIT_WINDOW_MS
export const apiLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: Number(process.env.RATE_LIMIT_API_MAX) || 500,
  store: makeRedisStore(WINDOW_MS, 'api'),
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
const AUTH_WINDOW = Number(process.env.AUTH_LIMIT_WINDOW_MS) || WINDOW_MS;
export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || Number(process.env.AUTH_LIMIT_MAX) || 50,
  store: makeRedisStore(AUTH_WINDOW, 'auth'),
  message: 'Too many login attempts, please try again later.',
  skipSuccessfulRequests: true,
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

// Rate limiter for the logged-in change-password endpoint.
// Counts only failed attempts (skipSuccessfulRequests) to allow normal use
// while still blocking brute-force attempts against the current password.
const CHGPWD_WINDOW = 15 * 60 * 1000;
export const changePasswordLimiter = rateLimit({
  windowMs: CHGPWD_WINDOW,
  max: 10,
  store: makeRedisStore(CHGPWD_WINDOW, 'chgpwd'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many password change attempts',
      message: 'Too many failed attempts. Please try again later.',
    });
  },
});

// Very strict rate limiter for password reset / set-password endpoints (3 requests per hour)
const RESET_WINDOW = 60 * 60 * 1000;
export const passwordResetLimiter = rateLimit({
  windowMs: RESET_WINDOW,
  max: 3,
  store: makeRedisStore(RESET_WINDOW, 'pwdreset'),
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
const AI_WINDOW = 60 * 1000;
export const aiChatLimiter = rateLimit({
  windowMs: AI_WINDOW,
  max: Number(process.env.RATE_LIMIT_AI_MAX) || 20,
  keyGenerator: (req) => req.user?.id || req.ip,
  store: makeRedisStore(AI_WINDOW, 'aichat'),
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
const UPLOAD_WINDOW = Number(process.env.UPLOAD_LIMIT_WINDOW_MS) || WINDOW_MS;
export const uploadLimiter = rateLimit({
  windowMs: UPLOAD_WINDOW,
  max: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || Number(process.env.UPLOAD_LIMIT_MAX) || 100,
  store: makeRedisStore(UPLOAD_WINDOW, 'upload'),
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
