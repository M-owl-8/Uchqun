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

// Per-IP limiter for auth endpoints that don't carry a user identifier in the body
// (set-password, admin-register). Override with RATE_LIMIT_AUTH_MAX / RATE_LIMIT_WINDOW_MS.
const AUTH_WINDOW = Number(process.env.AUTH_LIMIT_WINDOW_MS) || WINDOW_MS;
export const authLimiter = rateLimit({
  windowMs: AUTH_WINDOW,
  max: Number(process.env.RATE_LIMIT_AUTH_MAX) || Number(process.env.AUTH_LIMIT_MAX) || 50,
  store: makeRedisStore(AUTH_WINDOW, 'auth'),
  message: 'Too many requests, please try again later.',
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const retryAfterSec = req.rateLimit?.resetTime ? Math.ceil(req.rateLimit.resetTime / 1000) : undefined;
    res.status(429).json({
      error: 'Too many requests',
      message: 'Too many requests from this IP, please try again later.',
      retryAfter: retryAfterSec,
    });
  },
});

// Per-EMAIL limiter for the login endpoint only.
// Keying by email (not IP) means one user's failed attempts never block other users,
// even when multiple users share the same NAT/school IP across all portals.
// Falls back to IP when no email is present (unauthenticated probes).
// The per-email lockout in loginRateLimitStore is the primary brute-force guard;
// this adds a secondary layer without causing cross-user collateral damage.
export const loginLimiter = rateLimit({
  windowMs: AUTH_WINDOW,
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 20,
  keyGenerator: (req) => {
    const email = req.body?.email?.toLowerCase().trim();
    return email ? `email:${email}` : req.ip;
  },
  store: makeRedisStore(AUTH_WINDOW, 'login'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'LOGIN_RATE_LIMITED',
        detail: 'Too many failed login attempts for this account. Please try again later.',
      },
    });
  },
});

// Secondary IP-level limiter for the login endpoint.
// Defends against distributed brute-force across many different email accounts
// from a single IP. Generous (100/hour) so it only fires on genuine attacks,
// never on normal school-network usage.
const LOGIN_IP_WINDOW = 60 * 60 * 1000;
export const loginIpLimiter = rateLimit({
  windowMs: LOGIN_IP_WINDOW,
  max: Number(process.env.RATE_LIMIT_LOGIN_IP_MAX) || 100,
  store: makeRedisStore(LOGIN_IP_WINDOW, 'loginip'),
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'LOGIN_RATE_LIMITED',
        detail: 'Too many login attempts from this network. Please try again later.',
      },
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

// Per-user rate limiter for data export endpoint (1 request per 24 hours)
const EXPORT_WINDOW = 24 * 60 * 60 * 1000;
export const dataExportLimiter = rateLimit({
  windowMs: EXPORT_WINDOW,
  max: 1,
  keyGenerator: (req) => `data-export:${req.user?.id || req.ip}`,
  store: makeRedisStore(EXPORT_WINDOW, 'dataexport'),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'DATA_EXPORT_RATE_LIMITED' },
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
