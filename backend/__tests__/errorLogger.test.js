// refs #11-001 #02-008 — errorLogger defined but never registered in server.js
import { jest } from '@jest/globals';

const mockLogError = jest.fn();

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: mockLogError, info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { errorLogger } = await import('../middleware/requestLogger.js');

describe('errorLogger middleware', () => {
  afterEach(() => jest.clearAllMocks());

  test('#02-008 errorLogger is exported from requestLogger.js', () => {
    expect(typeof errorLogger).toBe('function');
    // Must be an Express error middleware (4 params: err, req, res, next)
    expect(errorLogger.length).toBe(4);
  });

  test('#11-001 errorLogger logs error with correlationId', () => {
    const err = new Error('test error');
    const req = {
      correlationId: 'test-corr-id',
      method: 'GET',
      url: '/api/test',
      user: { id: '1', role: 'admin' },
    };
    const next = jest.fn();

    errorLogger(err, req, {}, next);

    expect(mockLogError).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ correlationId: 'test-corr-id' })
    );
    expect(next).toHaveBeenCalledWith(err);
  });

  test('#11-001 errorLogger calls next(err) so errorHandler can send the response', () => {
    const err = new Error('pass-through');
    const req = { correlationId: 'cid', method: 'POST', url: '/api/x', user: null };
    const next = jest.fn();

    errorLogger(err, req, {}, next);

    expect(next).toHaveBeenCalledWith(err);
    // Must NOT call next() without an error argument
    expect(next).not.toHaveBeenCalledWith();
  });
});
