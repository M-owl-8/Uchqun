import { jest } from '@jest/globals';

const mockRedis = {
  incr: jest.fn(),
  expire: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
};

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));

jest.unstable_mockModule('../../utils/redisClient.js', () => ({
  getRedisClient: jest.fn(() => mockRedis),
  _resetClientForTest: jest.fn(),
}));

const { recordFailedAttempt, clearAttempts, isLockedOut } =
  await import('../../utils/loginRateLimitStore.js');

beforeEach(() => {
  jest.clearAllMocks();
  mockRedis.incr.mockResolvedValue(1);
  mockRedis.expire.mockResolvedValue(1);
  mockRedis.set.mockResolvedValue('OK');
  mockRedis.del.mockResolvedValue(1);
  mockRedis.exists.mockResolvedValue(0);
});

describe('loginRateLimitStore — Redis path', () => {
  test('isLockedOut returns false when key does not exist', async () => {
    expect(await isLockedOut('user@test.com')).toBe(false);
    expect(mockRedis.exists).toHaveBeenCalledWith('lockout:locked:user@test.com');
  });

  test('isLockedOut returns true when locked key exists', async () => {
    mockRedis.exists.mockResolvedValue(1);
    expect(await isLockedOut('user@test.com')).toBe(true);
  });

  test('recordFailedAttempt increments counter and sets TTL on first attempt', async () => {
    mockRedis.incr.mockResolvedValue(1);
    await recordFailedAttempt('user@test.com');
    expect(mockRedis.incr).toHaveBeenCalledWith('lockout:attempts:user@test.com');
    expect(mockRedis.expire).toHaveBeenCalledWith('lockout:attempts:user@test.com', 900);
    expect(mockRedis.set).not.toHaveBeenCalled();
  });

  test('recordFailedAttempt sets locked key on MAX_ATTEMPTS (5)', async () => {
    mockRedis.incr.mockResolvedValue(5);
    await recordFailedAttempt('user@test.com');
    expect(mockRedis.set).toHaveBeenCalledWith(
      'lockout:locked:user@test.com',
      '1',
      'EX',
      900
    );
  });

  test('clearAttempts deletes both counter and locked key', async () => {
    await clearAttempts('user@test.com');
    expect(mockRedis.del).toHaveBeenCalledWith(
      'lockout:attempts:user@test.com',
      'lockout:locked:user@test.com'
    );
  });

  test('isLockedOut fails closed on Redis error', async () => {
    mockRedis.exists.mockRejectedValue(new Error('ECONNREFUSED'));
    expect(await isLockedOut('user@test.com')).toBe(true);
  });

  test('recordFailedAttempt swallows Redis errors without throwing', async () => {
    mockRedis.incr.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(recordFailedAttempt('user@test.com')).resolves.toBeUndefined();
  });

  test('clearAttempts swallows Redis errors without throwing', async () => {
    mockRedis.del.mockRejectedValue(new Error('ECONNREFUSED'));
    await expect(clearAttempts('user@test.com')).resolves.toBeUndefined();
  });
});
