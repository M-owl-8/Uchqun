import { jest } from '@jest/globals';

const mockCaptureException = jest.fn();
jest.unstable_mockModule('../../utils/errorTracker.js', () => ({
  captureException: mockCaptureException,
  initSentry: jest.fn(),
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { errorHandler, notFound } = await import('../../middleware/errorHandler.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('errorHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  it('SequelizeValidationError → 400 with list of messages in dev', async () => {
    const err = Object.assign(new Error('validation failed'), {
      name: 'SequelizeValidationError',
      errors: [{ message: 'firstName is required' }, { message: 'email is invalid' }],
    });
    const req = { url: '/x', method: 'POST', ip: '1.1.1.1' };
    const res = mkRes();
    await errorHandler(err, req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Validation error',
      details: ['firstName is required', 'email is invalid'],
    }));
  });

  it('SequelizeUniqueConstraintError → 409', async () => {
    const err = Object.assign(new Error('unique'), {
      name: 'SequelizeUniqueConstraintError',
      errors: [{ message: 'email must be unique' }],
    });
    const res = mkRes();
    await errorHandler(err, { url: '/x' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(409);
  });

  it('SequelizeDatabaseError → 500 + captureException called', async () => {
    const err = Object.assign(new Error('DB error'), {
      name: 'SequelizeDatabaseError',
    });
    const res = mkRes();
    await errorHandler(err, { url: '/x' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockCaptureException).toHaveBeenCalled();
  });

  it('JsonWebTokenError → 401', async () => {
    const err = Object.assign(new Error('jwt'), { name: 'JsonWebTokenError' });
    const res = mkRes();
    await errorHandler(err, { url: '/x' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('TokenExpiredError → 401', async () => {
    const err = Object.assign(new Error('expired'), { name: 'TokenExpiredError' });
    const res = mkRes();
    await errorHandler(err, { url: '/x' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('429 status passes through with message', async () => {
    const err = Object.assign(new Error('Too many'), { status: 429 });
    const res = mkRes();
    await errorHandler(err, { url: '/x' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it('4xx errors with custom status pass through', async () => {
    const err = Object.assign(new Error('Bad'), { status: 422 });
    const res = mkRes();
    await errorHandler(err, { url: '/x' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('5xx generic error returns 500 + captureException + dev message', async () => {
    const err = Object.assign(new Error('something exploded'), { status: 500 });
    const res = mkRes();
    await errorHandler(err, { url: '/x', method: 'GET' }, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(mockCaptureException).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.error).toBe('something exploded');
  });

  it('production hides details in 5xx response', async () => {
    process.env.NODE_ENV = 'production';
    // Re-import to pick up isProduction
    jest.resetModules();
    const { errorHandler: prodHandler } = await import('../../middleware/errorHandler.js');
    const err = Object.assign(new Error('secret leak'), { status: 500 });
    const res = mkRes();
    await prodHandler(err, { url: '/x' }, res, jest.fn());
    const payload = res.json.mock.calls[0][0];
    expect(payload.error).toBe('An unexpected error occurred');
    expect(payload).not.toHaveProperty('stack');
  });
});

describe('notFound', () => {
  it('404 with route-not-found error', () => {
    const res = mkRes();
    notFound({}, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: false,
      error: 'Route not found',
    }));
  });
});
