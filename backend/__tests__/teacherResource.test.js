import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindByPk = jest.fn();
const mockCreate = jest.fn();

jest.unstable_mockModule('../models/TeacherResource.js', () => ({
  default: { findAll: mockFindAll, findByPk: mockFindByPk, create: mockCreate },
}));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getResources, createResource, deleteResource } = await import('../controllers/teacherResourceController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('teacherResourceController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getResources', () => {
    it('400 on invalid type', async () => {
      const req = { user: { id: 't1' }, query: { type: 'bogus' } };
      const res = mkRes();
      await getResources(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('scopes to schoolId when user has one', async () => {
      mockFindAll.mockResolvedValue([]);
      const req = { user: { id: 't1', schoolId: 's1' }, query: {} };
      const res = mkRes();
      await getResources(req, res);
      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.schoolId).toBe('s1');
      expect(where.isActive).toBe(true);
    });

    it('filters by valid type', async () => {
      mockFindAll.mockResolvedValue([]);
      const req = { user: { id: 't1', schoolId: 's1' }, query: { type: 'music' } };
      const res = mkRes();
      await getResources(req, res);
      const where = mockFindAll.mock.calls[0][0].where;
      expect(where.type).toBe('music');
    });
  });

  describe('createResource', () => {
    it('400 when type/title missing', async () => {
      const req = { user: { id: 't1' }, body: {} };
      const res = mkRes();
      await createResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when type invalid', async () => {
      const req = { user: { id: 't1' }, body: { type: 'spam', title: 'x' } };
      const res = mkRes();
      await createResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when title too long', async () => {
      const req = { user: { id: 't1' }, body: { type: 'music', title: 'x'.repeat(501) } };
      const res = mkRes();
      await createResource(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('normalizes protocol-relative URL', async () => {
      mockCreate.mockResolvedValue({ id: 'r1' });
      mockFindByPk.mockResolvedValue({ id: 'r1' });
      const req = {
        user: { id: 't1', schoolId: 's1' },
        body: { type: 'music', title: 'song', url: '//cdn.example.com/x.mp3' },
      };
      const res = mkRes();
      await createResource(req, res);
      const passed = mockCreate.mock.calls[0][0];
      expect(passed.url).toBe('https://cdn.example.com/x.mp3');
    });

    it('normalizes bare-host URL to https', async () => {
      mockCreate.mockResolvedValue({ id: 'r1' });
      mockFindByPk.mockResolvedValue({ id: 'r1' });
      const req = {
        user: { id: 't1', schoolId: 's1' },
        body: { type: 'video', title: 'clip', url: 'youtube.com/abc' },
      };
      const res = mkRes();
      await createResource(req, res);
      const passed = mockCreate.mock.calls[0][0];
      expect(passed.url).toBe('https://youtube.com/abc');
    });

    it('preserves full URL', async () => {
      mockCreate.mockResolvedValue({ id: 'r1' });
      mockFindByPk.mockResolvedValue({ id: 'r1' });
      const req = {
        user: { id: 't1', schoolId: 's1' },
        body: { type: 'music', title: 'song', url: 'https://example.com/x' },
      };
      const res = mkRes();
      await createResource(req, res);
      const passed = mockCreate.mock.calls[0][0];
      expect(passed.url).toBe('https://example.com/x');
    });
  });

  describe('deleteResource', () => {
    it('404 when not found', async () => {
      mockFindByPk.mockResolvedValue(null);
      const req = { user: { id: 't1', role: 'teacher' }, params: { id: 'r1' } };
      const res = mkRes();
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('teacher: 403 when deleting another teachers resource', async () => {
      mockFindByPk.mockResolvedValue({ id: 'r1', teacherId: 'OTHER', destroy: jest.fn() });
      const req = { user: { id: 't1', role: 'teacher' }, params: { id: 'r1' } };
      const res = mkRes();
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('admin can delete any resource (no schoolId set)', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindByPk.mockResolvedValue({ id: 'r1', teacherId: 'OTHER', schoolId: 'SCHOOL_B', destroy });
      const req = { user: { id: 'a1', role: 'admin' }, params: { id: 'r1' } };
      const res = mkRes();
      await deleteResource(req, res);
      expect(destroy).toHaveBeenCalled();
    });

    it('admin: 404 when deleting resource from different school (BACKEND-040)', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindByPk.mockResolvedValue({ id: 'r1', teacherId: 'OTHER', schoolId: 'SCHOOL_B', destroy });
      const req = { user: { id: 'a1', role: 'admin', schoolId: 'SCHOOL_A' }, params: { id: 'r1' } };
      const res = mkRes();
      await deleteResource(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(destroy).not.toHaveBeenCalled();
    });
  });
});
