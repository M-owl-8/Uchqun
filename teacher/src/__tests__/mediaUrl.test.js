import { describe, it, expect } from 'vitest';
import { getProxyUrl, isAppwriteUrl, normalizeApiBase } from '@shared/utils/mediaUrl';

const APPWRITE =
  'https://fra.cloud.appwrite.io/v1/storage/buckets/6a029fc00003d99be01d/files/6a280b1900312f05fca2/view?project=6a029377003425ddbe82';
const ID = '484a4fe7-c776-49f7-9fe4-60f89c896c30';

describe('getProxyUrl', () => {
  // The shipped bundle built `${"/api/v1".replace("/api","")}/api/media/proxy/ID`
  // => "/v1/api/media/proxy/ID", a portal-relative path swallowed by the SPA's
  // /* -> index.html rewrite, so every <img> got HTML instead of an image.
  it('builds a valid proxy path from a relative /api/v1 base', () => {
    expect(getProxyUrl(APPWRITE, ID, '/api/v1')).toBe(`/api/v1/media/proxy/${ID}`);
  });

  it('never produces the old broken /v1/api shape', () => {
    const out = getProxyUrl(APPWRITE, ID, '/api/v1');
    expect(out).not.toContain('/v1/api/');
    expect(out.startsWith('/api/v1/')).toBe(true);
  });

  it('upgrades a version-less /api base to /api/v1 (route is mounted there)', () => {
    expect(getProxyUrl(APPWRITE, ID, '/api')).toBe(`/api/v1/media/proxy/${ID}`);
  });

  it('handles an absolute API base', () => {
    expect(getProxyUrl(APPWRITE, ID, 'https://api.test/api/v1'))
      .toBe(`https://api.test/api/v1/media/proxy/${ID}`);
  });

  it('upgrades an absolute version-less base too', () => {
    expect(getProxyUrl(APPWRITE, ID, 'https://api.test/api'))
      .toBe(`https://api.test/api/v1/media/proxy/${ID}`);
  });

  it('tolerates a trailing slash', () => {
    expect(getProxyUrl(APPWRITE, ID, '/api/v1/')).toBe(`/api/v1/media/proxy/${ID}`);
  });

  it('keys the proxy on the media row id, not the Appwrite file id', () => {
    const out = getProxyUrl(APPWRITE, ID, '/api/v1');
    expect(out).toContain(ID);
    expect(out).not.toContain('6a280b1900312f05fca2');
  });

  it('leaves non-Appwrite URLs untouched (seed rows, external hosts)', () => {
    const ext = 'https://images.pexels.com/photos/1438081/pexels-photo-1438081.jpeg';
    expect(getProxyUrl(ext, ID, '/api/v1')).toBe(ext);
    const vid = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
    expect(getProxyUrl(vid, ID, '/api/v1')).toBe(vid);
  });

  it('returns the input when url or mediaId is missing', () => {
    expect(getProxyUrl('', ID, '/api/v1')).toBe('');
    expect(getProxyUrl(APPWRITE, undefined, '/api/v1')).toBe(APPWRITE);
    expect(getProxyUrl(null, ID, '/api/v1')).toBeNull();
  });
});

describe('isAppwriteUrl', () => {
  it('detects Appwrite storage URLs', () => {
    expect(isAppwriteUrl(APPWRITE)).toBe(true);
  });
  it('rejects other hosts and non-strings', () => {
    expect(isAppwriteUrl('https://images.pexels.com/a.jpg')).toBe(false);
    expect(isAppwriteUrl(undefined)).toBe(false);
    expect(isAppwriteUrl(123)).toBe(false);
  });
});

describe('normalizeApiBase', () => {
  it('defaults to /api/v1 when empty', () => {
    expect(normalizeApiBase('')).toBe('/api/v1');
    expect(normalizeApiBase(undefined)).toBe('/api/v1');
  });
  it('leaves an already-versioned base alone', () => {
    expect(normalizeApiBase('/api/v1')).toBe('/api/v1');
    expect(normalizeApiBase('https://a.test/api/v2')).toBe('https://a.test/api/v2');
  });
});
