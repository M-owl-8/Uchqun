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

  it('init wires beforeSend to the PII scrubber and disables sendDefaultPii', async () => {
    process.env.SENTRY_DSN = 'https://fake@o0.ingest.sentry.io/0';
    const { scrubEvent } = await import('../../utils/errorTracker.js');
    expect(mockInit).toHaveBeenCalledWith(expect.objectContaining({
      beforeSend: scrubEvent,
      sendDefaultPii: false,
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

  describe('scrubEvent (PII scrubbing)', () => {
    let scrubEvent;
    beforeEach(async () => {
      delete process.env.SENTRY_DSN;
      ({ scrubEvent } = await import('../../utils/errorTracker.js'));
    });

    it('strips auth headers and cookies from request', () => {
      const event = scrubEvent({
        request: {
          cookies: { accessToken: 'abc' },
          headers: { authorization: 'Bearer x', cookie: 'a=b', 'x-migration-secret': 's', 'user-agent': 'jest' },
        },
      });
      expect(event.request.cookies).toBeUndefined();
      expect(event.request.headers.authorization).toBeUndefined();
      expect(event.request.headers.cookie).toBeUndefined();
      expect(event.request.headers['x-migration-secret']).toBeUndefined();
      expect(event.request.headers['user-agent']).toBe('jest');
    });

    it('redacts sensitive field names in request data, nested', () => {
      const event = scrubEvent({
        request: {
          data: {
            firstName: 'Bobur',
            child: { medicalDiagnosis: 'x', emergencyContact: { phone: '123' } },
            safe: 'keep-me',
          },
        },
      });
      expect(event.request.data.firstName).toBe('[Filtered]');
      expect(event.request.data.child.medicalDiagnosis).toBe('[Filtered]');
      expect(event.request.data.child.emergencyContact).toBe('[Filtered]');
      expect(event.request.data.safe).toBe('keep-me');
    });

    it('masks emails and JWTs inside exception messages and extra strings', () => {
      const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c';
      const event = scrubEvent({
        exception: { values: [{ value: `duplicate key parent1@uchqun.uz token ${jwt}` }] },
        extra: { detail: 'user parent1@uchqun.uz failed' },
      });
      expect(event.exception.values[0].value).toBe('duplicate key [email] token [token]');
      expect(event.extra.detail).toBe('user [email] failed');
    });

    it('reduces user to opaque id only', () => {
      const event = scrubEvent({
        user: { id: 'uuid-1', email: 'parent1@uchqun.uz', ip_address: '1.2.3.4', username: 'p1' },
      });
      expect(event.user).toEqual({ id: 'uuid-1' });
    });

    it('drops user entirely when there is no id', () => {
      const event = scrubEvent({ user: { email: 'parent1@uchqun.uz' } });
      expect(event.user).toBeUndefined();
    });

    it('scrubs breadcrumb messages and data', () => {
      const event = scrubEvent({
        breadcrumbs: [
          { message: 'login parent1@uchqun.uz', data: { email: 'parent1@uchqun.uz', path: '/api/v1/auth' } },
        ],
      });
      expect(event.breadcrumbs[0].message).toBe('login [email]');
      expect(event.breadcrumbs[0].data.email).toBe('[Filtered]');
      expect(event.breadcrumbs[0].data.path).toBe('/api/v1/auth');
    });

    it('passes through non-object events untouched', () => {
      expect(scrubEvent(null)).toBeNull();
      expect(scrubEvent(undefined)).toBeUndefined();
    });
  });
});
