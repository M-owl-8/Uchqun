import { jest } from '@jest/globals';

const mockFindAndCount = jest.fn();
const mockFindByPk = jest.fn();

jest.unstable_mockModule('../models/AIWarning.js', () => ({
  default: { findAndCountAll: mockFindAndCount, findByPk: mockFindByPk, create: jest.fn() },
}));
jest.unstable_mockModule('../models/User.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/School.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/Child.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('sequelize', () => ({ Op: { in: Symbol('in') } }));

const { getWarnings, resolveWarning } = await import('../controllers/aiWarningController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('aiWarningController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getWarnings', () => {
    it('parent: scopes by parentId automatically', async () => {
      mockFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'p1', role: 'parent' }, query: {} };
      const res = mkRes();
      await getWarnings(req, res);
      const where = mockFindAndCount.mock.calls[0][0].where;
      expect(where.parentId).toBe('p1');
    });

    it('admin/government can filter by schoolId from query', async () => {
      mockFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'a1', role: 'admin' }, query: { schoolId: 's1' } };
      const res = mkRes();
      await getWarnings(req, res);
      const where = mockFindAndCount.mock.calls[0][0].where;
      expect(where.schoolId).toBe('s1');
      expect(where.parentId).toBeUndefined();
    });

    it('isResolved filter parses string', async () => {
      mockFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'admin' }, query: { isResolved: 'false' } };
      const res = mkRes();
      await getWarnings(req, res);
      const where = mockFindAndCount.mock.calls[0][0].where;
      expect(where.isResolved).toBe(false);
    });
  });

  describe('resolveWarning', () => {
    it('404 when not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      const req = { user: { id: 'u1' }, params: { id: 'w1' }, body: {} };
      const res = mkRes();
      await resolveWarning(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('marks warning resolved with notes', async () => {
      const update = jest.fn().mockResolvedValue();
      mockFindByPk.mockResolvedValue({ id: 'w1', update });
      const req = { user: { id: 'u1' }, params: { id: 'w1' }, body: { resolutionNotes: 'fixed' } };
      const res = mkRes();
      await resolveWarning(req, res);
      expect(update).toHaveBeenCalledWith(expect.objectContaining({
        isResolved: true, resolvedBy: 'u1', resolutionNotes: 'fixed',
      }));
    });
  });
});
