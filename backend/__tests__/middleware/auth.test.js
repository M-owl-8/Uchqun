import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

// Mock User model
const mockFindByPk = jest.fn();
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findByPk: mockFindByPk },
}));

const { authenticate, requireRole } = await import('../../middleware/auth.js');

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
