import { jest } from '@jest/globals';

const mockCaptureException = jest.fn();
const mockInit = jest.fn();

jest.unstable_mockModule('@sentry/node', () => ({
  init: mockInit,
  captureException: mockCaptureException,
}));

describe('errorTracker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
  });

  it('does not initialize Sentry when SENTRY_DSN unset', async () => {
    delete process.env.SENTRY_DSN;
    await import('../../utils/errorTracker.js');
    expect(mockInit).not.toHaveBeenCalled();
  });

  it('captureException is a no-op when SENTRY_DSN unset', async () => {
    delete process.env.SENTRY_DSN;
    const { captureException } = await import('../../utils/errorTracker.js');
    captureException(new Error('boom'), { url: '/x' });
    expect(mockCaptureException).not.toHaveBeenCalled();
  });

  it('initializes Sentry when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://fake@o0.ingest.sentry.io/0';
    await import('../../utils/errorTracker.js');
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://fake@o0.ingest.sentry.io/0',
    }));
    delete process.env.SENTRY_DSN;
  });

  it('captureException calls Sentry when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://fake@o0.ingest.sentry.io/0';
    const { captureException } = await import('../../utils/errorTracker.js');
    const err = new Error('production error');
    captureException(err, { url: '/api/v1/child' });
    expect(mockCaptureException).toHaveBeenCalledWith(err, { extra: { url: '/api/v1/child' } });
    delete process.env.SENTRY_DSN;
  });
});
