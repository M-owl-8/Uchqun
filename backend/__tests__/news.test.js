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

describe('newsController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getNews', () => {
    it('non-admin gets only published news', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'parent' }, query: {} };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      expect(where.published).toBe(true);
    });

    it('admin can request unpublished via query', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'admin' }, query: { published: 'false' } };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      expect(where.published).toBe(false);
    });

    it('audience filter includes "all" via OR', async () => {
      mockFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { role: 'parent' }, query: { targetAudience: 'parents' } };
      const res = mkRes();
      await getNews(req, res);
      const where = mockFindAndCountAll.mock.calls[0][0].where;
      const orKey = Object.getOwnPropertySymbols(where).find(s => s.toString() === 'Symbol(or)');
      expect(orKey).toBeDefined();
    });
  });

  describe('getNewsItem', () => {
    it('404 when not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { role: 'parent' }, params: { id: 'n1' } };
      const res = mkRes();
      await getNewsItem(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('non-admin scoped to published', async () => {
      mockFindOne.mockResolvedValue({ id: 'n1' });
      const req = { user: { role: 'parent' }, params: { id: 'n1' } };
      const res = mkRes();
      await getNewsItem(req, res);
      const where = mockFindOne.mock.calls[0][0].where;
      expect(where.published).toBe(true);
    });
  });

  describe('createNews', () => {
    it('uses createdById from req.user.id', async () => {
      const reload = jest.fn().mockResolvedValue();
      mockCreate.mockResolvedValue({ id: 'n1', reload });
      const req = {
        user: { id: 'a1', role: 'admin' },
        body: { title: 'T', content: 'C' },
      };
      const res = mkRes();
      await createNews(req, res);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        title: 'T', content: 'C', createdById: 'a1',
      }));
    });

    it('defaults published to false and audience to all', async () => {
      const reload = jest.fn().mockResolvedValue();
      mockCreate.mockResolvedValue({ id: 'n1', reload });
      const req = {
        user: { id: 'a1', role: 'admin' },
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
