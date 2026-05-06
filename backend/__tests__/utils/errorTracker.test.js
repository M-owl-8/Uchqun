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
});
