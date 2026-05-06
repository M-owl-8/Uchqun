import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockPMediaFindAndCount = jest.fn();
const mockPMediaFindOne = jest.fn();
const mockMediaFindAndCount = jest.fn();
const mockMediaFindOne = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../models/ParentMedia.js', () => ({
  default: { findAndCountAll: mockPMediaFindAndCount, findOne: mockPMediaFindOne },
}));
jest.unstable_mockModule('../models/Media.js', () => ({
  default: { findAndCountAll: mockMediaFindAndCount, findOne: mockMediaFindOne },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: () => ({ limit: 50, offset: 0 }),
}));

const { getMyMedia, getMediaById } = await import('../controllers/parent/parentMediaController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('parentMediaController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMyMedia', () => {
    it('parent without group: queries legacy ParentMedia', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: null });
      mockPMediaFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyMedia(req, res);
      expect(mockPMediaFindAndCount).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ parentId: 'p1' }),
      }));
    });

    it('parent with group: queries Media via Child group', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockMediaFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyMedia(req, res);
      const opts = mockMediaFindAndCount.mock.calls[0][0];
      expect(opts.include[0].where).toEqual({ groupId: 'g1' });
    });
  });

  describe('getMediaById', () => {
    it('group-assigned parent gets 404 when media outside group', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockMediaFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMediaById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('group-assigned parent: query scoped to group children', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: 'g1' });
      mockMediaFindOne.mockResolvedValue({ id: 'm1' });
      const req = { user: { id: 'p1' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMediaById(req, res);
      const opts = mockMediaFindOne.mock.calls[0][0];
      expect(opts.include[0].where).toEqual({ groupId: 'g1' });
    });

    it('legacy parent (no group): queries ParentMedia by id+parentId', async () => {
      mockUserFindByPk.mockResolvedValue({ groupId: null });
      mockPMediaFindOne.mockResolvedValue({ id: 'm1' });
      const req = { user: { id: 'p1' }, params: { id: 'm1' } };
      const res = mkRes();
      await getMediaById(req, res);
      expect(mockPMediaFindOne).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 'm1', parentId: 'p1' },
      }));
    });
  });
});
