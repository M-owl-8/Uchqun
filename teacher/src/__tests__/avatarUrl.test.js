import { describe, it, expect } from 'vitest';
import { resolveAvatarUrl, apiOriginFrom } from '@shared/utils/avatarUrl';

const API = 'https://api.example.com/api/v1';

describe('resolveAvatarUrl', () => {
  // The regression this helper exists for: every portal used
  // `avatar.startsWith('http')`, which is false for a base64 data URI, so the
  // API host got prepended and the image broke. Backend has stored avatars as
  // data URIs since migration 20260423000000-avatar-text-column.js.
  it('returns a base64 data URI untouched', () => {
    const uri = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUg==';
    expect(resolveAvatarUrl(uri, API)).toBe(uri);
  });

  it('never prepends a host to a data URI', () => {
    const out = resolveAvatarUrl('data:image/jpeg;base64,AAAA', API);
    expect(out.startsWith('data:')).toBe(true);
    expect(out).not.toContain('api.example.com');
  });

  it('passes through absolute http(s) URLs', () => {
    expect(resolveAvatarUrl('https://cdn.test/a.png', API)).toBe('https://cdn.test/a.png');
    expect(resolveAvatarUrl('http://cdn.test/a.png', API)).toBe('http://cdn.test/a.png');
  });

  it('passes through blob: previews and protocol-relative URLs', () => {
    expect(resolveAvatarUrl('blob:http://x/y', API)).toBe('blob:http://x/y');
    expect(resolveAvatarUrl('//cdn.test/a.png', API)).toBe('//cdn.test/a.png');
  });

  it('prefixes the API origin onto a server-relative path', () => {
    expect(resolveAvatarUrl('/uploads/media/a.jpg', API))
      .toBe('https://api.example.com/uploads/media/a.jpg');
  });

  it('inserts the missing slash on a bare relative path', () => {
    expect(resolveAvatarUrl('uploads/media/a.jpg', API))
      .toBe('https://api.example.com/uploads/media/a.jpg');
  });

  it('returns null for empty / nullish / non-string input', () => {
    expect(resolveAvatarUrl(null, API)).toBeNull();
    expect(resolveAvatarUrl(undefined, API)).toBeNull();
    expect(resolveAvatarUrl('', API)).toBeNull();
    expect(resolveAvatarUrl('   ', API)).toBeNull();
    expect(resolveAvatarUrl(42, API)).toBeNull();
  });
});

describe('apiOriginFrom', () => {
  it('strips a versioned /api/v1 suffix', () => {
    expect(apiOriginFrom('https://a.test/api/v1')).toBe('https://a.test');
  });

  it('strips a plain /api suffix, with or without trailing slash', () => {
    expect(apiOriginFrom('https://a.test/api')).toBe('https://a.test');
    expect(apiOriginFrom('https://a.test/api/')).toBe('https://a.test');
  });

  it('leaves a bare origin alone', () => {
    expect(apiOriginFrom('https://a.test')).toBe('https://a.test');
  });
});
