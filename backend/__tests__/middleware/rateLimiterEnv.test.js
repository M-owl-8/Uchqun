import { jest } from '@jest/globals';

const capturedOpts = [];
const mockRateLimit = jest.fn((opts) => {
  capturedOpts.push(opts);
  return jest.fn();
});

jest.unstable_mockModule('express-rate-limit', () => ({ default: mockRateLimit }));

describe('rateLimiter ENV overrides', () => {
  beforeAll(async () => {
    process.env.RATE_LIMIT_API_MAX = '42';
    process.env.RATE_LIMIT_AUTH_MAX = '77';
    process.env.RATE_LIMIT_UPLOAD_MAX = '99';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    await import('../../middleware/rateLimiter.js');
  });

  afterAll(() => {
    delete process.env.RATE_LIMIT_API_MAX;
    delete process.env.RATE_LIMIT_AUTH_MAX;
    delete process.env.RATE_LIMIT_UPLOAD_MAX;
    delete process.env.RATE_LIMIT_WINDOW_MS;
  });

  // order: apiLimiter(0), authLimiter(1), passwordResetLimiter(2), aiChatLimiter(3), uploadLimiter(4)

  it('uses RATE_LIMIT_WINDOW_MS for apiLimiter windowMs', () => {
    expect(capturedOpts[0].windowMs).toBe(60000);
  });

  it('uses RATE_LIMIT_API_MAX for apiLimiter max', () => {
    expect(capturedOpts[0].max).toBe(42);
  });

  it('uses RATE_LIMIT_AUTH_MAX for authLimiter max', () => {
    expect(capturedOpts[1].max).toBe(77);
  });

  it('uses RATE_LIMIT_UPLOAD_MAX for uploadLimiter max', () => {
    expect(capturedOpts[4].max).toBe(99);
  });
});
