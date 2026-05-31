/**
 * Behavioral tests for login rate limiting.
 *
 * Three properties verified against real (in-memory) lockout logic:
 *   1. Threshold: 20 failed attempts → 429 on attempt 21, not before.
 *   2. Cross-user isolation: user1 hitting 429 does NOT affect user2 (same IP).
 *   3. Cross-portal isolation: locking email-A doesn't block email-B.
 *
 * loginRateLimitStore (in-memory Map, no Redis in test env) is exercised for real.
 * loginLimiter / loginIpLimiter are real middleware instances.
 *
 * The login handler is a minimal stub that replicates the lockout check + failed-attempt
 * recording from authController — this exercises the real lockout layer without
 * requiring a database connection.
 */

import { jest } from '@jest/globals';

// Suppress logger noise from redisClient / loginRateLimitStore
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

import express from 'express';
import request from 'supertest';

// Import real lockout functions and real rate-limit middleware
const { isLockedOut, recordFailedAttempt } = await import('../../utils/loginRateLimitStore.js');
const { loginLimiter, loginIpLimiter } = await import('../../middleware/rateLimiter.js');

// Minimal login handler that mirrors authController's lockout behavior exactly,
// without touching the database.
async function stubLoginHandler(req, res) {
  try {
    const email = (req.body?.email || '').toLowerCase().trim();
    const password = req.body?.password || '';

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }

    if (await isLockedOut(email)) {
      return res.status(429).json({
        success: false,
        error: { code: 'LOGIN_RATE_LIMITED', detail: 'Too many failed login attempts.' },
      });
    }

    // Always treat as wrong credentials in the stub — record the failure and return 401
    await recordFailedAttempt(email);
    return res.status(401).json({ success: false, error: 'Invalid email or password' });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Login failed' });
  }
}

// Build a minimal app with the REAL rate-limit middleware + stub handler
function buildApp() {
  const app = express();
  app.use(express.json());
  app.post('/api/v1/auth/login', loginIpLimiter, loginLimiter, stubLoginHandler);
  return app;
}

// Unique-per-run prefix prevents stale Map entries from a previous Jest run in the same process
const RUN = String(Date.now());

async function tryLogin(app, email, password = 'WrongPassword1') {
  return request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });
}

// ─── Test 1: Threshold — 20 attempts allowed; attempt 21 is blocked ──────────

describe('loginRateLimit — threshold', () => {
  const app = buildApp();
  const email = `threshold-${RUN}@example.com`;

  test('attempts 1-20 each return 401; attempt 21 returns 429', async () => {
    for (let i = 1; i <= 20; i++) {
      const res = await tryLogin(app, email);
      expect(res.status).toBe(401);
    }

    const blocked = await tryLogin(app, email);
    expect(blocked.status).toBe(429);
    expect(blocked.body).toMatchObject({
      success: false,
      error: { code: 'LOGIN_RATE_LIMITED' },
    });
  });
});

// ─── Test 2: Cross-user isolation — emailA lockout does NOT block emailB ─────

describe('loginRateLimit — cross-user isolation', () => {
  const app = buildApp();
  const emailA = `xuser-a-${RUN}@example.com`;
  const emailB = `xuser-b-${RUN}@example.com`;

  test('emailA locked out does not affect emailB from the same IP', async () => {
    // Exhaust emailA's bucket
    for (let i = 1; i <= 20; i++) {
      await tryLogin(app, emailA);
    }
    const lockA = await tryLogin(app, emailA);
    expect(lockA.status).toBe(429);

    // emailB has its own independent counter — must still get 401, not 429
    const resB = await tryLogin(app, emailB);
    expect(resB.status).toBe(401);
  });
});

// ─── Test 3: Cross-portal isolation — locking one email doesn't block another ─

describe('loginRateLimit — cross-portal isolation', () => {
  const app = buildApp();
  const parentEmail    = `cp-parent-${RUN}@example.com`;
  const receptionEmail = `cp-reception-${RUN}@example.com`;

  test('reception email unaffected after parent email is locked out', async () => {
    // Exhaust the parent email's bucket
    for (let i = 1; i <= 20; i++) {
      await tryLogin(app, parentEmail);
    }
    const lockParent = await tryLogin(app, parentEmail);
    expect(lockParent.status).toBe(429);

    // A different email (different portal role) must have its own independent counter
    const resReception = await tryLogin(app, receptionEmail);
    expect(resReception.status).toBe(401);
  });
});
