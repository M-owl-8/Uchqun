import { jest } from '@jest/globals';

const mockProgressFindOne = jest.fn();
const mockProgressCreate = jest.fn();
const mockProgressFindByPk = jest.fn();
const mockChildFindOne = jest.fn();
const mockChildFindAll = jest.fn();

const fakeUpdate = jest.fn();

jest.unstable_mockModule('../models/Progress.js', () => ({
  default: {
    findOne: mockProgressFindOne,
    create: mockProgressCreate,
    findByPk: mockProgressFindByPk,
  },
}));

jest.unstable_mockModule('../models/Child.js', () => ({
  default: {
    findOne: mockChildFindOne,
    findAll: mockChildFindAll,
  },
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getProgress, updateProgress } = await import('../controllers/progressController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('progressController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    fakeUpdate.mockReset();
  });

  describe('getProgress', () => {
    it('400 when parent has multiple children and no childId provided', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'a' }, { id: 'b' }]);
      const req = { user: { id: 'p1' }, query: {}, body: {} };
      const res = mkRes();
      await getProgress(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('returns existing progress for a single-child parent', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      mockProgressFindOne.mockResolvedValue({ id: 'pr1', childId: 'c1' });
      const req = { user: { id: 'p1' }, query: {}, body: {} };
      const res = mkRes();
      await getProgress(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'pr1' }));
    });

    it('uses provided childId when parent has multiple children', async () => {
      mockChildFindOne.mockResolvedValue({ id: 'c2' });
      mockProgressFindOne.mockResolvedValue({ id: 'pr2', childId: 'c2' });
      const req = { user: { id: 'p1' }, query: { childId: 'c2' }, body: {} };
      const res = mkRes();
      await getProgress(req, res);
      expect(mockChildFindOne).toHaveBeenCalledWith({ where: { id: 'c2', parentId: 'p1' } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'pr2' }));
    });
  });

  describe('updateProgress (mass-assignment protection)', () => {
    it('strips disallowed fields (childId, schoolId)', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      const progress = { id: 'pr1', childId: 'c1', update: fakeUpdate };
      mockProgressFindOne.mockResolvedValue(progress);
      mockProgressFindByPk.mockResolvedValue({ id: 'pr1' });
      const req = {
        user: { id: 'p1' },
        query: {},
        body: {
          academic: { score: 5 },
          childId: 'INJECTED',
          schoolId: 'INJECTED',
          parentId: 'INJECTED',
        },
      };
      const res = mkRes();
      await updateProgress(req, res);
      const passed = fakeUpdate.mock.calls[0][0];
      expect(passed).toHaveProperty('academic');
      expect(passed).not.toHaveProperty('childId');
      expect(passed).not.toHaveProperty('schoolId');
      expect(passed).not.toHaveProperty('parentId');
    });

    it('creates progress row with whitelisted fields only', async () => {
      mockChildFindAll.mockResolvedValue([{ id: 'c1' }]);
      mockProgressFindOne.mockResolvedValue(null);
      mockProgressCreate.mockResolvedValue({ id: 'pr1' });
      mockProgressFindByPk.mockResolvedValue({ id: 'pr1' });
      const req = {
        user: { id: 'p1' },
        query: {},
        body: { social: { z: 1 }, schoolId: 'X' },
      };
      const res = mkRes();
      await updateProgress(req, res);
      const passed = mockProgressCreate.mock.calls[0][0];
      expect(passed.childId).toBe('c1');
      expect(passed.social).toEqual({ z: 1 });
      expect(passed).not.toHaveProperty('schoolId');
    });
  });
});
