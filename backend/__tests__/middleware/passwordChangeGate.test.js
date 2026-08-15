/**
 * Forced-password-change gate (CP-021, Commit 3)
 *
 * Tests the mustChangePassword gate inside `authenticate`:
 *   - 403 PASSWORD_CHANGE_REQUIRED for all endpoints when flag is true
 *   - /api/v1/user/password allowed (the change-password route)
 *   - /api/v1/auth/logout allowed
 *   - Existing accounts (mustChangePassword null/false/undefined) are NOT blocked
 *
 * Revert-test pair proves the gate is load-bearing:
 *   [REVERT-TEST: BUG]   without the gate, blocked users reach next()
 *   [REVERT-TEST: FIXED] with the gate, blocked users get 403
 */
import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const mockFindByPk = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findByPk: mockFindByPk },
}));

const { authenticate } = await import('../../middleware/auth.js');

const JWT_SECRET = 'test-secret-that-is-at-least-32-chars';

const mkReq = (userId, overrides = {}) => {
  const token = jwt.sign({ userId }, JWT_SECRET);
  return {
    headers: {},
    cookies: { accessToken: token },
    originalUrl: '/api/v1/some/endpoint',
    path: '/some/endpoint',
    ...overrides,
  };
};

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('mustChangePassword gate in authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = JWT_SECRET;
  });

  // ── Core gate behaviour ───────────────────────────────────────────────────

  it('403 PASSWORD_CHANGE_REQUIRED when mustChangePassword=true and endpoint is not allowed', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'u1', role: 'government', isActive: true, mustChangePassword: true,
    });
    const req = mkReq('u1', { originalUrl: '/api/v1/government/users' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }),
      mustChangePassword: true,
    }));
  });

  it('allows /api/v1/user/password when mustChangePassword=true', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'u1', role: 'government', isActive: true, mustChangePassword: true,
    });
    const req = mkReq('u1', { originalUrl: '/api/v1/user/password' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows /api/v1/auth/logout when mustChangePassword=true', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'u1', role: 'government', isActive: true, mustChangePassword: true,
    });
    const req = mkReq('u1', { originalUrl: '/api/v1/auth/logout' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── No-surprise-lockout: existing accounts must not be blocked ────────────
  //
  // All pre-existing users have mustChangePassword=null/false/undefined.
  // This test proves they are NOT affected by the gate.

  it('[NO-SURPRISE-LOCKOUT] mustChangePassword=false → next() called, no 403', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'legacy', role: 'admin', isActive: true, mustChangePassword: false,
    });
    const req = mkReq('legacy', { originalUrl: '/api/v1/government/some-route' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('[NO-SURPRISE-LOCKOUT] mustChangePassword=null → next() called, no 403', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'legacy', role: 'teacher', isActive: true, mustChangePassword: null,
    });
    const req = mkReq('legacy', { originalUrl: '/api/v1/teacher/children' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('[NO-SURPRISE-LOCKOUT] mustChangePassword=undefined (field absent) → next() called, no 403', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'legacy', role: 'parent', isActive: true,
      // mustChangePassword not in object at all
    });
    const req = mkReq('legacy', { originalUrl: '/api/v1/parent/journal' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  // ── REVERT-TEST: password change gate ────────────────────────────────────
  //
  // BUG: remove the mustChangePassword gate entirely from authenticate.
  //   A provisioned account (mustChangePassword=true) can reach any endpoint.
  //   With bug: next() called even for arbitrary endpoints.
  //   With fix: 403 PASSWORD_CHANGE_REQUIRED.
  //
// Historical bug, documented rather than asserted (P4.6):
//   without gate, mustChangePassword account reaches next()
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with gate, mustChangePassword account gets 403', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'u1', role: 'government', isActive: true, mustChangePassword: true,
    });
    const req = mkReq('u1', { originalUrl: '/api/v1/government/secrets' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'PASSWORD_CHANGE_REQUIRED' }),
    }));
  });

  it('strips query string before path comparison', async () => {
    mockFindByPk.mockResolvedValue({
      id: 'u1', role: 'government', isActive: true, mustChangePassword: true,
    });
    const req = mkReq('u1', { originalUrl: '/api/v1/user/password?foo=bar' });
    const res = mkRes();
    const next = jest.fn();
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled(); // query string stripped → allowed path
  });
});
