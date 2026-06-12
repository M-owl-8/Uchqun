import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { scrubEvent, scrubBreadcrumb } from '@shared/utils/piiScrub';

const mocks = vi.hoisted(() => ({ init: vi.fn() }));
vi.mock('@sentry/browser', () => ({ init: mocks.init, captureException: vi.fn() }));

describe('initSentry (shared layer)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.Sentry;
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('is a complete no-op when VITE_SENTRY_DSN is unset', async () => {
    const { initSentry } = await import('@shared/services/sentry');
    const result = await initSentry();
    expect(result).toBeNull();
    expect(mocks.init).not.toHaveBeenCalled();
    expect(window.Sentry).toBeUndefined();
  });

  it('initializes with DSN and wires PII scrubbers + tags', async () => {
    vi.stubEnv('VITE_SENTRY_DSN', 'https://fake@o0.ingest.sentry.io/0');
    const { initSentry } = await import('@shared/services/sentry');
    const result = await initSentry();
    expect(mocks.init).toHaveBeenCalledWith(expect.objectContaining({
      dsn: 'https://fake@o0.ingest.sentry.io/0',
      sendDefaultPii: false,
      beforeSend: scrubEvent,
      beforeBreadcrumb: scrubBreadcrumb,
    }));
    expect(mocks.init.mock.calls[0][0].environment).toBeTruthy();
    // ErrorBoundary reports via window.Sentry — must be set after init.
    expect(window.Sentry).toBe(result);
  });
});

describe('piiScrub (shared layer)', () => {
  it('redacts sensitive keys and masks emails/JWTs in strings', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.sflKxwRJSMeKKF2QT4fwpMeJf36POk6yJVadQssw5c';
    const event = scrubEvent({
      request: {
        url: `https://api.example.com/reset?email=parent1@uchqun.uz`,
        headers: { authorization: 'Bearer x', 'user-agent': 'vitest' },
        data: { firstName: 'Bobur', password: 'x', safe: 'keep-me' },
      },
      exception: { values: [{ value: `auth failed for parent1@uchqun.uz ${jwt}` }] },
      user: { id: 'uuid-1', email: 'parent1@uchqun.uz', ip_address: '1.2.3.4' },
    });
    expect(event.request.url).toBe('https://api.example.com/reset?email=[email]');
    expect(event.request.headers.authorization).toBeUndefined();
    expect(event.request.headers['user-agent']).toBe('vitest');
    expect(event.request.data.firstName).toBe('[Filtered]');
    expect(event.request.data.password).toBe('[Filtered]');
    expect(event.request.data.safe).toBe('keep-me');
    expect(event.exception.values[0].value).toBe('auth failed for [email] [token]');
    expect(event.user).toEqual({ id: 'uuid-1' });
  });

  it('scrubs breadcrumbs via scrubBreadcrumb', () => {
    const crumb = scrubBreadcrumb({
      message: 'POST login parent1@uchqun.uz',
      data: { email: 'parent1@uchqun.uz', url: '/api/v1/auth/login' },
    });
    expect(crumb.message).toBe('POST login [email]');
    expect(crumb.data.email).toBe('[Filtered]');
    expect(crumb.data.url).toBe('/api/v1/auth/login');
  });
});
