import { jest } from '@jest/globals';

/**
 * PUT /child/:id/avatar took `req.body.photo` — an arbitrary client string —
 * and wrote it straight to `children.photo` with no type, size, or content
 * validation. Every portal renders that value into an <img src>.
 *
 * These tests drive the real controller with real image bytes; the magic-byte
 * check cannot be satisfied by a mock.
 */

const mockFindOne = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: jest.fn(), findOne: mockFindOne, create: jest.fn() },
}));
jest.unstable_mockModule('../models/User.js', () => ({ default: { findByPk: jest.fn() } }));
jest.unstable_mockModule('../models/Group.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/School.js', () => ({ default: { findByPk: jest.fn() } }));
jest.unstable_mockModule('../models/AuditLog.js', () => ({ default: {} }));
jest.unstable_mockModule('../config/storage.js', () => ({ uploadFile: jest.fn(), deleteFile: jest.fn() }));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

const { updateChildAvatar } = await import('../controllers/childController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);
const PNG_URI = `data:image/png;base64,${PNG.toString('base64')}`;

const mkChild = () => ({
  id: 'c1',
  update: jest.fn().mockResolvedValue(undefined),
  reload: jest.fn().mockResolvedValue(undefined),
  toJSON: () => ({ id: 'c1' }),
  getAge: () => 5,
});

const call = async (photo) => {
  const child = mkChild();
  mockFindOne.mockResolvedValue(child);
  const res = mkRes();
  await updateChildAvatar({ params: { id: 'c1' }, body: { photo }, user: { id: 'p1' } }, res);
  return { child, res };
};

describe('updateChildAvatar — photo validation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('accepts a real base64 PNG data URI', async () => {
    const { child, res } = await call(PNG_URI);
    expect(child.update).toHaveBeenCalled();
    expect(child.update.mock.calls[0][0].photo).toMatch(/^data:image\/png;base64,/);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('accepts a bundled portal avatar path', async () => {
    const { child } = await call('/avatars/avatar1.jfif');
    expect(child.update).toHaveBeenCalledWith(
      expect.objectContaining({ photo: '/avatars/avatar1.jfif' }),
    );
  });

  it('rejects an arbitrary string — the original defect', async () => {
    const { child, res } = await call('totally-arbitrary-value');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(child.update).not.toHaveBeenCalled();
  });

  it('rejects an external URL (no SSRF-ish or offsite image references)', async () => {
    const { child, res } = await call('https://evil.example/tracker.png');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(child.update).not.toHaveBeenCalled();
  });

  it('rejects a non-image data URI that the old regex accepted', async () => {
    // The updateChild regex was /^data:(.+);base64,(.+)$/ — text/html passed.
    const html = `data:text/html;base64,${Buffer.from('<script>alert(1)</script>').toString('base64')}`;
    const { child, res } = await call(html);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(child.update).not.toHaveBeenCalled();
  });

  it('rejects an image/png data URI whose bytes are not an image', async () => {
    const fake = `data:image/png;base64,${Buffer.from('hello there').toString('base64')}`;
    const { child, res } = await call(fake);
    expect(res.status).toHaveBeenCalledWith(415);
    expect(child.update).not.toHaveBeenCalled();
  });

  it('rejects a path-traversal attempt in the avatar path', async () => {
    const { child, res } = await call('/avatars/../../etc/passwd');
    expect(res.status).toHaveBeenCalledWith(400);
    expect(child.update).not.toHaveBeenCalled();
  });

  it('rejects an oversized photo with 413', async () => {
    const big = Buffer.alloc(2 * 1024 * 1024, 0);
    PNG.copy(big, 0); // keep valid magic bytes so size is what trips
    const { child, res } = await call(`data:image/png;base64,${big.toString('base64')}`);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(child.update).not.toHaveBeenCalled();
  });

  it('normalises the stored type to the detected one', async () => {
    // Real PNG bytes declared as JPEG.
    const { child } = await call(`data:image/jpeg;base64,${PNG.toString('base64')}`);
    expect(child.update.mock.calls[0][0].photo).toMatch(/^data:image\/png;base64,/);
  });

  it('treats empty/null as an explicit removal', async () => {
    const { child } = await call(null);
    expect(child.update).toHaveBeenCalledWith(expect.objectContaining({ photo: null }));
  });

  it('still 404s for a child the parent does not own', async () => {
    mockFindOne.mockResolvedValue(null);
    const res = mkRes();
    await updateChildAvatar({ params: { id: 'c1' }, body: { photo: PNG_URI }, user: { id: 'p1' } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
