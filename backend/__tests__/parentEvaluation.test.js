import { jest } from '@jest/globals';

const mockCreate = jest.fn();
const mockFindAll = jest.fn();

jest.unstable_mockModule('../models/index.js', () => ({
  ParentEvaluation: { create: mockCreate, findAll: mockFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { submitParentEvaluation, getMyEvaluations } = await import('../controllers/parentEvaluationController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('parentEvaluationController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('submitParentEvaluation', () => {
    it('401 when no user', async () => {
      const res = mkRes();
      await submitParentEvaluation({ user: null, body: {} }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('400 when period invalid', async () => {
      const req = { user: { id: 'p1' }, body: { period: 'yearly', answers: {} } };
      const res = mkRes();
      await submitParentEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when answers missing', async () => {
      const req = { user: { id: 'p1' }, body: { period: 'daily' } };
      const res = mkRes();
      await submitParentEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when answers is not an object', async () => {
      const req = { user: { id: 'p1' }, body: { period: 'daily', answers: 'string' } };
      const res = mkRes();
      await submitParentEvaluation(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('persists evaluation with parent + school + period', async () => {
      mockCreate.mockResolvedValue({ id: 'e1' });
      const req = {
        user: { id: 'p1', schoolId: 's1' },
        body: { period: 'weekly', answers: { x: true } },
      };
      const res = mkRes();
      await submitParentEvaluation(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        parentId: 'p1', schoolId: 's1', period: 'weekly',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('getMyEvaluations', () => {
    it('401 when no user', async () => {
      const res = mkRes();
      await getMyEvaluations({ user: null, query: {} }, res);
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('scopes to parentId', async () => {
      mockFindAll.mockResolvedValue([]);
      const req = { user: { id: 'p1' }, query: {} };
      const res = mkRes();
      await getMyEvaluations(req, res);
      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.parentId).toBe('p1');
    });

    it('filters by period when valid', async () => {
      mockFindAll.mockResolvedValue([]);
      const req = { user: { id: 'p1' }, query: { period: 'monthly' } };
      const res = mkRes();
      await getMyEvaluations(req, res);
      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.period).toBe('monthly');
    });

    it('ignores invalid period query', async () => {
      mockFindAll.mockResolvedValue([]);
      const req = { user: { id: 'p1' }, query: { period: 'evil' } };
      const res = mkRes();
      await getMyEvaluations(req, res);
      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.period).toBeUndefined();
    });
  });
});
