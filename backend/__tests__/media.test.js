import { jest } from '@jest/globals';

const mockMediaFindAll = jest.fn();
const mockMediaFindOne = jest.fn();
const mockChildFindAll = jest.fn();
const mockUserFindAll = jest.fn();

jest.unstable_mockModule('../models/Media.js', () => ({
  default: { findAll: mockMediaFindAll, findOne: mockMediaFindOne, create: jest.fn(), findByPk: jest.fn() },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findOne: jest.fn() },
}));
jest.unstable_mockModule('../models/Activity.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: mockUserFindAll },
}));
jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: jest.fn(), deleteFile: jest.fn(),
}));
jest.unstable_mockModule('../controllers/notificationController.js', () => ({
  createNotification: jest.fn(),
}));
jest.unstable_mockModule('../config/socket.js', () => ({ emitToUser: jest.fn() }));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: jest.fn(),
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('axios', () => ({ default: { get: jest.fn() } }));

const { getMedia, getMediaItem } = await import('../controllers/mediaController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('mediaController.getMedia', () => {
  beforeEach(() => jest.clearAllMocks());

  it('parent: empty array when parent has no children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { user: { id: 'p1', role: 'parent' }, query: {} };
    const res = mkRes();
    await getMedia(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('parent: 403 when childId not owned', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
    const req = { user: { id: 'p1', role: 'parent' }, query: { childId: 'OTHER' } };
    const res = mkRes();
    await getMedia(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('parent: returns own children media when childId matches', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
    mockMediaFindAll.mockResolvedValue([{ id: 'm1' }]);
    const req = { user: { id: 'p1', role: 'parent' }, query: { childId: 'c1' } };
    const res = mkRes();
    await getMedia(req, res);
    expect(mockMediaFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ childId: 'c1' }),
    }));
  });

  it('teacher: empty array when no assigned parents', async () => {
    mockUserFindAll.mockResolvedValue([]);
    const req = { user: { id: 't1', role: 'teacher' }, query: {} };
    const res = mkRes();
    await getMedia(req, res);
    expect(res.json).toHaveBeenCalledWith([]);
  });

  it('admin with schoolId: scopes media to own school children', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    mockMediaFindAll.mockResolvedValue([]);
    const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, query: {} };
    const res = mkRes();
    await getMedia(req, res);
    expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { schoolId: 's1' },
    }));
    const where = mockMediaFindAll.mock.calls[0][0].where;
    expect(where.childId).toBeDefined();
  });

  it('admin with schoolId: 403 when childId not in school', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
    const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, query: { childId: 'OTHER' } };
    const res = mkRes();
    await getMedia(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('government: full access with no childId filter', async () => {
    mockMediaFindAll.mockResolvedValue([]);
    const req = { user: { id: 'g1', role: 'government' }, query: {} };
    const res = mkRes();
    await getMedia(req, res);
    const where = mockMediaFindAll.mock.calls[0][0].where;
    expect(where.childId).toBeUndefined();
  });

  it('applies type and date filters', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
    mockMediaFindAll.mockResolvedValue([]);
    const req = { user: { id: 'p1', role: 'parent' }, query: { type: 'photo', date: '2026-05-06' } };
    const res = mkRes();
    await getMedia(req, res);
    const where = mockMediaFindAll.mock.calls[0][0].where;
    expect(where.type).toBe('photo');
    expect(where.date).toBe('2026-05-06');
  });

  it('500 on DB error', async () => {
    mockChildFindAll.mockRejectedValue(new Error('boom'));
    const req = { user: { id: 'p1', role: 'parent' }, query: {} };
    const res = mkRes();
    await getMedia(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('mediaController.getMediaItem — school scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin with schoolId: scopes query to school children', async () => {
    mockChildFindAll.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);
    mockMediaFindOne.mockResolvedValue({ id: 'm1', toJSON: () => ({ id: 'm1' }), thumbnail: null });
    const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, params: { id: 'm1' } };
    const res = mkRes();
    await getMediaItem(req, res);
    expect(mockChildFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { schoolId: 's1' },
    }));
    const where = mockMediaFindOne.mock.calls[0][0].where;
    expect(where.childId).toBeDefined();
  });

  it('admin with schoolId: 404 when school has no children', async () => {
    mockChildFindAll.mockResolvedValue([]);
    const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, params: { id: 'm1' } };
    const res = mkRes();
    await getMediaItem(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('government: no childId filter — can access any media item', async () => {
    mockMediaFindOne.mockResolvedValue({ id: 'm1', toJSON: () => ({ id: 'm1' }), thumbnail: null });
    const req = { user: { id: 'g1', role: 'government' }, params: { id: 'm1' } };
    const res = mkRes();
    await getMediaItem(req, res);
    const where = mockMediaFindOne.mock.calls[0][0].where;
    expect(where.childId).toBeUndefined();
    expect(res.json).toHaveBeenCalled();
  });
});
