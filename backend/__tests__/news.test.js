import { jest } from '@jest/globals';

const mockFindAndCountAll = jest.fn();
const mockFindOne = jest.fn();
const mockCreate = jest.fn();

jest.unstable_mockModule('../models/News.js', () => ({
  default: {
    findAndCountAll: mockFindAndCountAll,
    findOne: mockFindOne,
    create: mockCreate,
  },
}));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getNews, getNewsItem, createNews } = await import('../controllers/newsController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Helper: extract all conditions from Op.and array
const { Op } = await import('sequelize');

const getAndConditions = (where) => where[Op.and] || [];
const findInAnd = (where, key) => getAndConditions(where).find(c => key in c)?.[key];

describe('newsController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getNews', () => {
    it('non-admin gets only published news (in Op.and)', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'parent', schoolId: 's1' }, query: {} };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      expect(findInAnd(where, 'published')).toBe(true);
    });

    it('admin can request unpublished via query', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'admin', schoolId: 's1' }, query: { published: 'false' } };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      expect(findInAnd(where, 'published')).toBe(false);
    });

    it('non-government user gets school-scoped news (schoolId or null)', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'parent', schoolId: 's1' }, query: {} };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      const conditions = getAndConditions(where);
      const schoolFilter = conditions.find(c => Op.or in c)?.[Op.or];
      expect(schoolFilter).toBeDefined();
      expect(schoolFilter).toEqual(expect.arrayContaining([
        { schoolId: 's1' }, { schoolId: null },
      ]));
    });

    it('government user sees all schools news (no school filter in Op.and)', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'government', schoolId: null }, query: {} };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      const conditions = getAndConditions(where);
      // No school-scoped Op.or condition: government sees all schools
      const hasSchoolFilter = conditions.some(c => {
        const orCond = c[Op.or];
        return Array.isArray(orCond) && orCond.some(o => 'schoolId' in o);
      });
      expect(hasSchoolFilter).toBe(false);
    });

    it('audience filter includes "all" in Op.and', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'parent', schoolId: 's1' }, query: { targetAudience: 'parents' } };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      const conditions = getAndConditions(where);
      // Should have an Op.or with targetAudience filter
      const audienceFilter = conditions.flatMap(c => c[Op.or] || []).filter(c => 'targetAudience' in c);
      expect(audienceFilter.some(c => c.targetAudience === 'parents')).toBe(true);
      expect(audienceFilter.some(c => c.targetAudience === 'all')).toBe(true);
    });
  });

  describe('getNewsItem', () => {
    it('404 when not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { role: 'parent', schoolId: 's1' }, params: { id: 'n1' } };
      const res = mkRes();
      await getNewsItem(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('non-admin scoped to published and school', async () => {
      mockFindOne.mockResolvedValue({ id: 'n1' });
      const req = { user: { role: 'parent', schoolId: 's1' }, params: { id: 'n1' } };
      const res = mkRes();
      await getNewsItem(req, res);
      const where = mockFindOne.mock.calls[0][0].where;
      expect(where.published).toBe(true);
      // school isolation via Op.or
      const orKey = Object.getOwnPropertySymbols(where).find(s => s.description === 'or');
      expect(orKey).toBeDefined();
    });
  });

  describe('createNews', () => {
    it('sets schoolId from req.user.schoolId', async () => {
      const reload = jest.fn().mockResolvedValue();
      mockCreate.mockResolvedValue({ id: 'n1', reload });
      const req = {
        user: { id: 'a1', role: 'admin', schoolId: 's1' },
        body: { title: 'T', content: 'C' },
      };
      const res = mkRes();
      await createNews(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        title: 'T', content: 'C', createdById: 'a1', schoolId: 's1',
      }));
    });

    it('defaults published to false and audience to all', async () => {
      const reload = jest.fn().mockResolvedValue();
      mockCreate.mockResolvedValue({ id: 'n1', reload });
      const req = {
        user: { id: 'a1', role: 'admin', schoolId: 's1' },
        body: { title: 'T', content: 'C' },
      };
      const res = mkRes();
      await createNews(req, res);
      const passed = mockCreate.mock.calls[0][0];
      expect(passed.published).toBe(false);
      expect(passed.targetAudience).toBe('all');
    });
  });
});
