import { jest } from '@jest/globals';

const { enforceHTTPS, securityHeaders } = await import('../../middleware/security.js');

const mkRes = () => {
  const res = {};
  res.redirect = jest.fn();
  return res;
};

describe('enforceHTTPS', () => {
  beforeEach(() => { delete process.env.NODE_ENV; });
  afterEach(() => { delete process.env.NODE_ENV; });

  it('passes through in non-production', () => {
    process.env.NODE_ENV = 'development';
    const next = jest.fn();
    const req = { path: '/api/foo', secure: false, headers: {} };
    enforceHTTPS(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('skips redirect for /health even in production over HTTP', () => {
    process.env.NODE_ENV = 'production';
    const next = jest.fn();
    const req = { path: '/health', secure: false, headers: {} };
    enforceHTTPS(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('redirects HTTP to HTTPS in production', () => {
    process.env.NODE_ENV = 'production';
    const res = mkRes();
    const next = jest.fn();
    const req = { path: '/api/foo', secure: false, headers: { host: 'example.com' }, url: '/api/foo' };
    enforceHTTPS(req, res, next);
    expect(res.redirect).toHaveBeenCalledWith(301, 'https://example.com/api/foo');
    expect(next).not.toHaveBeenCalled();
  });

  it('passes through when req.secure is true', () => {
    process.env.NODE_ENV = 'production';
    const next = jest.fn();
    const req = { path: '/api/foo', secure: true, headers: {} };
    enforceHTTPS(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('passes through when X-Forwarded-Proto is https (proxy case)', () => {
    process.env.NODE_ENV = 'production';
    const next = jest.fn();
    const req = { path: '/api/foo', secure: false, headers: { 'x-forwarded-proto': 'https' } };
    enforceHTTPS(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });
});

describe('securityHeaders (helmet)', () => {
  it('exports a middleware function', () => {
    expect(typeof securityHeaders).toBe('function');
  });
});
