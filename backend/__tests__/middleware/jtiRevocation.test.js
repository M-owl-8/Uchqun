import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';

const mockRedis = {
  set: jest.fn(),
  exists: jest.fn(),
};

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.unstable_mockModule('../../utils/redisClient.js', () => ({
  getRedisClient: jest.fn(() => mockRedis),
  _resetClientForTest: jest.fn(),
}));

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findByPk: jest.fn().mockResolvedValue({
      id: 'user-1',
      role: 'admin',
      isActive: true,
      documentsApproved: true,
    }),
  },
}));

const { revokeJti, authenticate } = await import('../../middleware/auth.js');

const JWT_SECRET = 'test-secret-that-is-at-least-32-chars';
process.env.JWT_SECRET = JWT_SECRET;

function makeReqRes(token) {
  const req = { headers: {}, cookies: { accessToken: token } };
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  const next = jest.fn();
  return { req, res, next };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.exists.mockResolvedValue(0);
});

describe('revokeJti — Redis path', () => {
  test('stores revoked JTI in Redis with TTL', async () => {
    const expiresAtMs = Date.now() + 10_000;
    await revokeJti('test-jti-123', expiresAtMs);
    expect(mockRedis.set).toHaveBeenCalledWith(
      'revoked:jti:test-jti-123',
      '1',
      'EX',
      expect.any(Number)
    );
    const ttl = mockRedis.set.mock.calls[0][3];
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10);
  });

  test('does nothing when jti is falsy', async () => {
    await revokeJti(null, Date.now() + 10_000);
    await revokeJti(undefined, Date.now() + 10_000);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  test('falls back to in-memory on Redis error', async () => {
    mockRedis.set.mockRejectedValue(new Error('ECONNREFUSED'));
    // Should not throw
    await expect(revokeJti('jti-fallback', Date.now() + 10_000)).resolves.toBeUndefined();
  });
});

describe('authenticate — JTI revocation check', () => {
  test('rejects request when JTI is revoked in Redis', async () => {
    const jti = 'revoked-jti-abc';
    const token = jwt.sign({ userId: 'user-1', jti }, JWT_SECRET, { expiresIn: '15m' });
    mockRedis.exists.mockResolvedValue(1); // JTI is revoked

    const { req, res, next } = makeReqRes(token);
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Token has been revoked' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('allows request when JTI is not revoked', async () => {
    const jti = 'valid-jti-xyz';
    const token = jwt.sign({ userId: 'user-1', jti }, JWT_SECRET, { expiresIn: '15m' });
    mockRedis.exists.mockResolvedValue(0); // JTI is not revoked

    const { req, res, next } = makeReqRes(token);
    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  test('fails closed (rejects) when Redis errors during JTI check', async () => {
    const jti = 'unknown-jti';
    const token = jwt.sign({ userId: 'user-1', jti }, JWT_SECRET, { expiresIn: '15m' });
    mockRedis.exists.mockRejectedValue(new Error('ECONNREFUSED'));

    const { req, res, next } = makeReqRes(token);
    await authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
