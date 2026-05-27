import { apiLimiter, authLimiter, loginLimiter, passwordResetLimiter } from '../../middleware/rateLimiter.js';

describe('Rate Limiters', () => {
  it('apiLimiter is a function (middleware)', () => {
    expect(typeof apiLimiter).toBe('function');
  });

  it('authLimiter is a function (middleware)', () => {
    expect(typeof authLimiter).toBe('function');
  });

  it('loginLimiter is a function (middleware)', () => {
    expect(typeof loginLimiter).toBe('function');
  });

  it('passwordResetLimiter is a function (middleware)', () => {
    expect(typeof passwordResetLimiter).toBe('function');
  });
});
