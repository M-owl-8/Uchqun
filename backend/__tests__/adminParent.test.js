import { jest } from '@jest/globals';

const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockPAFindAll = jest.fn();
const mockPMFindAll = jest.fn();
const mockPMedFindAll = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: mockUserFindAll, findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/ParentActivity.js', () => ({
  default: { findAll: mockPAFindAll },
}));
jest.unstable_mockModule('../models/ParentMeal.js', () => ({
  default: { findAll: mockPMFindAll },
}));
jest.unstable_mockModule('../models/ParentMedia.js', () => ({
  default: { findAll: mockPMedFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getParents, getParentById } = await import('../controllers/admin/adminParentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminParentController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getParents', () => {
    it('returns empty when admin has no receptions', async () => {
      mockUserFindAll.mockResolvedValueOnce([]);
      const req = { user: { id: 'a1' } };
      const res = mkRes();
      await getParents(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: [] }));
    });

    it('returns parents created by admin receptions', async () => {
      mockUserFindAll
        .mockResolvedValueOnce([{ id: 'r1' }])
        .mockResolvedValueOnce([{ id: 'p1', role: 'parent', email: 'p@x.com' }]);
      const req = { user: { id: 'a1' } };
      const res = mkRes();
      await getParents(req, res);
      const data = res.json.mock.calls[0][0].data;
      expect(data).toHaveLength(1);
      expect(data[0].id).toBe('p1');
    });

    it('filters out non-parent roles defensively', async () => {
      mockUserFindAll
        .mockResolvedValueOnce([{ id: 'r1' }])
        .mockResolvedValueOnce([
          { id: 'p1', role: 'parent' },
          { id: 'x1', role: 'teacher' },
        ]);
      const req = { user: { id: 'a1' } };
      const res = mkRes();
      await getParents(req, res);
      const data = res.json.mock.calls[0][0].data;
      expect(data).toHaveLength(1);
      expect(data[0].role).toBe('parent');
    });
  });

  describe('getParentById', () => {
    it('404 when parent not under admin scope', async () => {
      mockUserFindAll.mockResolvedValueOnce([{ id: 'r1' }]);
      mockUserFindOne.mockResolvedValue(null);
      const req = { user: { id: 'a1' }, params: { id: 'p1' } };
      const res = mkRes();
      await getParentById(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns parent with activities/meals/media when in scope', async () => {
      mockUserFindAll.mockResolvedValueOnce([{ id: 'r1' }]);
      mockUserFindOne.mockResolvedValue({
        id: 'p1', toJSON: () => ({ id: 'p1' }),
        children: [{ id: 'c1' }],
      });
      mockPAFindAll.mockResolvedValue([{ id: 'a1' }]);
      mockPMFindAll.mockResolvedValue([{ id: 'm1' }]);
      mockPMedFindAll.mockResolvedValue([{ id: 'med1' }]);
      const req = { user: { id: 'a1' }, params: { id: 'p1' } };
      const res = mkRes();
      await getParentById(req, res);
      const payload = res.json.mock.calls[0][0];
      expect(payload.data.activities).toHaveLength(1);
      expect(payload.data.meals).toHaveLength(1);
      expect(payload.data.media).toHaveLength(1);
    });
  });
});
