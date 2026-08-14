// D-48 regression test — the documented unlock reported success and did nothing.
//
// CLAUDE.md documents POST /api/v1/auth/unlock-account as the way to restore a
// locked-out user. It returns 200 "Account lockout cleared" and the very next
// login still returns 429. Reproduced four times across two campaigns.
//
// The mechanism was unknowable while D-08 hid the logs. With logging fixed in
// Campaign II P4, the unlock line reads clean — "Account lockout cleared by
// admin", 200, 11ms, no error — so clearAttempts succeeded. The block comes
// from somewhere else.
//
// There are THREE sources of LOGIN_RATE_LIMITED:
//   controllers/authController.js:67   the account lockout store (lockout:*)
//   middleware/rateLimiter.js:67       loginLimiter, per-email  (login:email:*)
//   middleware/rateLimiter.js:94       loginIpLimiter, per-IP   (loginip:*)
//
// unlockAccount cleared only the first. The observed detail — "Too many failed
// login attempts for this account" — is loginLimiter's message, so the caller
// stayed blocked by a per-email bucket the unlock endpoint never touched.
// rateLimiter.js:79 carries a note (RL-004) anticipating the IP case; it does
// not anticipate this one.
//
// FAIL-FIRST: fails against the pre-fix unlockAccount.

import { jest } from '@jest/globals';

const mockClearAttempts = jest.fn();
const mockResetKey = jest.fn();

jest.unstable_mockModule('../../utils/loginRateLimitStore.js', () => ({
  clearAttempts: mockClearAttempts,
  recordFailedAttempt: jest.fn(),
  isLockedOut: jest.fn().mockResolvedValue(false),
}));
jest.unstable_mockModule('../../middleware/rateLimiter.js', () => ({
  loginLimiter: { resetKey: mockResetKey },
  loginIpLimiter: { resetKey: jest.fn() },
  apiLimiter: {}, authLimiter: {}, changePasswordLimiter: {}, dataExportLimiter: {}, uploadLimiter: {},
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../models/User.js', () => ({ default: { findOne: jest.fn(), findByPk: jest.fn() } }));

const { unlockAccount } = await import('../../controllers/authController.js');

const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => jest.clearAllMocks());

describe('D-48 — unlock must clear every per-email bucket, not just one', () => {
  test('it clears the account lockout store', async () => {
    const req = { body: { email: 'Someone@TMM3.uz' }, user: { id: 'a1', role: 'admin' } };
    await unlockAccount(req, makeRes());
    expect(mockClearAttempts).toHaveBeenCalledWith('someone@tmm3.uz');
  });

  test('it ALSO resets the per-email login rate limiter', async () => {
    const req = { body: { email: 'Someone@TMM3.uz' }, user: { id: 'a1', role: 'admin' } };
    await unlockAccount(req, makeRes());
    expect(mockResetKey).toHaveBeenCalledWith('email:someone@tmm3.uz');
  });

  test('a limiter reset failure does not break the unlock response', async () => {
    mockResetKey.mockImplementation(() => { throw new Error('store unavailable'); });
    const req = { body: { email: 'x@y.uz' }, user: { id: 'a1', role: 'admin' } };
    const res = makeRes();
    await unlockAccount(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
