import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock User model
const mockFindByPk = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findByPk: mockFindByPk },
}));

const { authenticate, requireRole, invalidateUserCache } = await import('../../middleware/auth.js');

describe('authenticate middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = { headers: {}, cookies: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
    process.env.JWT_SECRET = 'test-secret-that-is-at-least-32-chars';
  });

  afterEach(() => jest.clearAllMocks());

  it('returns 401 when no token provided', async () => {
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('reads token from cookie', async () => {
    const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET);
    req.cookies = { accessToken: token };
    mockFindByPk.mockResolvedValue({ id: 'user-1', role: 'admin', isActive: true });

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toEqual({ id: 'user-1', role: 'admin', isActive: true });
  });

  it('reads token from Authorization header', async () => {
    const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${token}`;
    mockFindByPk.mockResolvedValue({ id: 'user-1', role: 'teacher', isActive: true });

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('returns 401 for invalid token', async () => {
    req.headers.authorization = 'Bearer invalid-token';
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('returns 401 when user not found', async () => {
    const token = jwt.sign({ userId: 'user-1' }, process.env.JWT_SECRET);
    req.headers.authorization = `Bearer ${token}`;
    mockFindByPk.mockResolvedValue(null);

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // T2-2: status-based suspension gate
  it('returns 401 with ACCOUNT_NOT_ACTIVE when parent status is suspended', async () => {
    const token = jwt.sign({ userId: 'p1' }, process.env.JWT_SECRET);
    req.cookies = { accessToken: token };
    mockFindByPk.mockResolvedValue({ id: 'p1', role: 'parent', isActive: true, status: 'suspended' });

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: expect.objectContaining({ code: 'ACCOUNT_NOT_ACTIVE' }),
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 with ACCOUNT_NOT_ACTIVE when admin status is archived', async () => {
    const token = jwt.sign({ userId: 'a1' }, process.env.JWT_SECRET);
    req.cookies = { accessToken: token };
    mockFindByPk.mockResolvedValue({ id: 'a1', role: 'admin', isActive: true, status: 'archived' });

    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'ACCOUNT_NOT_ACTIVE' }),
    }));
  });

  it('allows government user even when status is suspended', async () => {
    const token = jwt.sign({ userId: 'g1' }, process.env.JWT_SECRET);
    req.cookies = { accessToken: token };
    mockFindByPk.mockResolvedValue({ id: 'g1', role: 'government', isActive: true, status: 'suspended' });

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through when status is active', async () => {
    const token = jwt.sign({ userId: 't1' }, process.env.JWT_SECRET);
    req.cookies = { accessToken: token };
    mockFindByPk.mockResolvedValue({ id: 't1', role: 'teacher', isActive: true, status: 'active' });

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through when status is undefined (legacy records without status)', async () => {
    const token = jwt.sign({ userId: 'old1' }, process.env.JWT_SECRET);
    req.cookies = { accessToken: token };
    mockFindByPk.mockResolvedValue({ id: 'old1', role: 'admin', isActive: true, status: undefined });

    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
  });
});

describe('requireRole middleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it('allows matching role', () => {
    req.user = { role: 'admin' };
    requireRole('admin')(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('rejects non-matching role', () => {
    req.user = { role: 'teacher' };
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('returns 401 when no user', () => {
    requireRole('admin')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('invalidateUserCache', () => {
  it('removes the cached entry so the next authenticate hits the DB', async () => {
    process.env.NODE_ENV = 'production'; // enable cache
    const user = { id: 'u1', role: 'reception', isActive: true, documentsApproved: true };
    mockFindByPk.mockResolvedValue(user);

    // Warm the cache by authenticating once
    const token = jwt.sign({ userId: 'u1', jti: 'j1' }, process.env.JWT_SECRET || 'test-secret-that-is-at-least-32-chars', { expiresIn: '15m' });
    const req1 = { cookies: { accessToken: token }, headers: {} };
    const res1 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await authenticate(req1, res1, jest.fn());
    expect(mockFindByPk).toHaveBeenCalledTimes(1);

    // Second auth hits the cache — DB not called again
    const req2 = { cookies: { accessToken: token }, headers: {} };
    const res2 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await authenticate(req2, res2, jest.fn());
    expect(mockFindByPk).toHaveBeenCalledTimes(1); // still 1 — from cache

    // Invalidate and authenticate again — DB must be called
    invalidateUserCache('u1');
    const req3 = { cookies: { accessToken: token }, headers: {} };
    const res3 = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    await authenticate(req3, res3, jest.fn());
    expect(mockFindByPk).toHaveBeenCalledTimes(2); // cache was cleared

    process.env.NODE_ENV = 'test'; // restore
  });
});
