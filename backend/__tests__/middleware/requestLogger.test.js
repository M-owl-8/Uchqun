import { jest } from '@jest/globals';

const mockInfo = jest.fn();
const mockError = jest.fn();

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: mockInfo, error: mockError, warn: jest.fn(), debug: jest.fn() },
}));

const { requestLogger, errorLogger } = await import('../../middleware/requestLogger.js');

const mkRes = () => {
  const handlers = {};
  return {
    setHeader: jest.fn(),
    on: jest.fn((event, fn) => { handlers[event] = fn; }),
    statusCode: 200,
    _trigger: (event) => handlers[event] && handlers[event](),
  };
};

describe('requestLogger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('reuses incoming X-Correlation-ID header', () => {
    const req = {
      headers: { 'x-correlation-id': 'abc-123' },
      method: 'GET', url: '/x', ip: '1.1.1.1',
      get: jest.fn().mockReturnValue('Mozilla'),
    };
    const res = mkRes();
    const next = jest.fn();
    requestLogger(req, res, next);
    expect(req.correlationId).toBe('abc-123');
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', 'abc-123');
    expect(next).toHaveBeenCalled();
  });

  it('generates a UUID v4 correlation ID when missing', () => {
    const req = {
      headers: {},
      method: 'GET', url: '/x', ip: '1.1.1.1',
      get: jest.fn().mockReturnValue('agent'),
    };
    const res = mkRes();
    requestLogger(req, res, jest.fn());
    expect(req.correlationId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('logs request and completion (finish event)', () => {
    const req = {
      headers: {}, method: 'POST', url: '/api/x',
      ip: '1.1.1.1', get: jest.fn().mockReturnValue('a'),
      user: { id: 'u1', role: 'parent' },
    };
    const res = mkRes();
    res.statusCode = 201;
    requestLogger(req, res, jest.fn());
    expect(mockInfo).toHaveBeenCalledWith('Incoming request', expect.objectContaining({
      method: 'POST', url: '/api/x', userId: 'u1', role: 'parent',
    }));
    res._trigger('finish');
    expect(mockInfo).toHaveBeenCalledWith('Request completed', expect.objectContaining({
      method: 'POST', statusCode: 201, userId: 'u1',
    }));
  });

  it('logs req.ip from Express (trust proxy respected)', () => {
    const req = {
      headers: {}, method: 'GET', url: '/x',
      ip: '5.5.5.5',
      get: jest.fn().mockReturnValue('a'),
    };
    requestLogger(req, mkRes(), jest.fn());
    const args = mockInfo.mock.calls[0][1];
    expect(args.ip).toBe('5.5.5.5');
  });
});

describe('errorLogger', () => {
  beforeEach(() => jest.clearAllMocks());

  it('logs error with correlationId and forwards via next(err)', () => {
    const err = Object.assign(new Error('boom'), { name: 'BoomError', status: 500 });
    const req = { correlationId: 'cid-1', method: 'GET', url: '/x', user: { id: 'u1' } };
    const next = jest.fn();
    errorLogger(err, req, {}, next);
    expect(mockError).toHaveBeenCalledWith('Request error', expect.objectContaining({
      correlationId: 'cid-1',
      error: expect.objectContaining({ message: 'boom', name: 'BoomError', status: 500 }),
    }));
    expect(next).toHaveBeenCalledWith(err);
  });
});
