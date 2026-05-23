import { jest } from '@jest/globals';

const mockFindAll = jest.fn();
const mockFindOne = jest.fn();
const mockUserFindByPk = jest.fn();
const mockCreate = jest.fn();
const mockEmitToUser = jest.fn();
const mockDeleteFile = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockFindAll, findOne: mockFindOne, create: mockCreate },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findByPk: mockUserFindByPk },
}));
jest.unstable_mockModule('../models/Group.js', () => ({ default: {} }));
jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: jest.fn(),
  deleteFile: mockDeleteFile,
}));
jest.unstable_mockModule('../config/socket.js', () => ({
  emitToUser: mockEmitToUser,
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../models/AuditLog.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/School.js', () => ({ default: { findByPk: jest.fn() } }));

const { getChildren, getChild, deleteChild, updateChild, checkChildAccess } = await import('../controllers/childController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.headersSent = false;
  return res;
};

describe('childController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getChildren', () => {
    it('returns parents own children with computed age', async () => {
      const fakeChild = { toJSON: () => ({ id: 'c1', firstName: 'A' }), getAge: () => 5 };
      mockFindAll.mockResolvedValue([fakeChild]);
      const req = { user: { id: 'p1' } };
      const res = mkRes();
      await getChildren(req, res);
      expect(mockFindAll).toHaveBeenCalledWith(expect.objectContaining({
        where: { parentId: 'p1' },
      }));
      expect(res.json).toHaveBeenCalledWith([{ id: 'c1', firstName: 'A', age: 5 }]);
    });

    it('500 on DB error', async () => {
      mockFindAll.mockRejectedValue(new Error('boom'));
      const req = { user: { id: 'p1' } };
      const res = mkRes();
      await getChildren(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });

  describe('getChild', () => {
    it('404 when child not found', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1' }, params: { id: 'c1' } };
      const res = mkRes();
      await getChild(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('returns child data with age', async () => {
      mockFindOne.mockResolvedValue({
        toJSON: () => ({ id: 'c1', firstName: 'A' }),
        getAge: () => 6,
      });
      const req = { user: { id: 'p1' }, params: { id: 'c1' } };
      const res = mkRes();
      await getChild(req, res);
      expect(res.json).toHaveBeenCalledWith({ id: 'c1', firstName: 'A', age: 6 });
    });

    it('scopes find query to parentId from req.user', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1' }, params: { id: 'c1' } };
      const res = mkRes();
      await getChild(req, res);
      expect(mockFindOne).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ id: 'c1', parentId: 'p1' }),
      }));
    });
  });

  describe('deleteChild', () => {
    it('404 when child not owned by parent', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1' }, params: { id: 'c1' } };
      const res = mkRes();
      await deleteChild(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('deletes child and emits socket event', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockFindOne.mockResolvedValue({ id: 'c1', parentId: 'p1', photo: null, destroy });
      const req = { user: { id: 'p1' }, params: { id: 'c1' } };
      const res = mkRes();
      await deleteChild(req, res);
      expect(destroy).toHaveBeenCalled();
      expect(mockEmitToUser).toHaveBeenCalledWith('p1', 'child:deleted', expect.any(Object));
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('continues delete even if photo deletion throws', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockDeleteFile.mockRejectedValue(new Error('S3 down'));
      mockFindOne.mockResolvedValue({ id: 'c1', parentId: 'p1', photo: '/x.jpg', destroy });
      const req = { user: { id: 'p1' }, params: { id: 'c1' } };
      const res = mkRes();
      await deleteChild(req, res);
      expect(destroy).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });
  });

  describe('updateChild', () => {
    it('404 when child not found and req.child not preset', async () => {
      mockFindOne.mockResolvedValue(null);
      const req = { user: { id: 'p1', role: 'parent' }, params: { id: 'c1' }, body: {} };
      const res = mkRes();
      await updateChild(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('rejects blank required field on partial update', async () => {
      const update = jest.fn();
      const reload = jest.fn();
      const child = { id: 'c1', parentId: 'p1', toJSON: () => ({}), getAge: () => 5, update, reload };
      const req = {
        user: { id: 'p1', role: 'parent' },
        params: { id: 'c1' },
        body: { firstName: '' },
        child,
      };
      const res = mkRes();
      await updateChild(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(update).not.toHaveBeenCalled();
    });

    it('rejects oversized base64 photo', async () => {
      const update = jest.fn();
      const child = { id: 'c1', parentId: 'p1', photo: null, toJSON: () => ({}), getAge: () => 5, update, reload: jest.fn() };
      // base64 length L → decoded ~3L/4 bytes; need > 1.5 MB
      const huge = 'A'.repeat(3 * 1024 * 1024);
      const req = {
        user: { id: 'p1', role: 'parent' },
        params: { id: 'c1' },
        body: { photoBase64: `data:image/jpeg;base64,${huge}` },
        child,
      };
      const res = mkRes();
      await updateChild(req, res);
      expect(res.status).toHaveBeenCalledWith(413);
    });

    it('rejects malformed base64 string', async () => {
      const child = { id: 'c1', parentId: 'p1', photo: null, toJSON: () => ({}), getAge: () => 5, update: jest.fn(), reload: jest.fn() };
      const req = {
        user: { id: 'p1', role: 'parent' },
        params: { id: 'c1' },
        body: { photoBase64: 'NOT_A_VALID_DATA_URI' },
        child,
      };
      const res = mkRes();
      await updateChild(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  // S4-NEW-01: checkChildAccess null-schoolId bypass (PUT /children/:id)
  // Pre-fix: `parent?.schoolId && parent.schoolId !== req.user.schoolId`
  //   null parent.schoolId → false && ... = false → guard skipped → next() (IDOR)
  // Post-fix: `!parent?.schoolId || parent.schoolId !== req.user.schoolId`
  //   null parent.schoolId → !null = true → 403 (closed)
  describe('checkChildAccess', () => {
    const mkNext = () => jest.fn();
    const SCHOOL_A = 'aaaa-0000-school-a';
    const SCHOOL_B = 'bbbb-0000-school-b';

    it('[REVERT-TEST] null-parent-schoolId returns 403 for cross-school reception (S4-NEW-01)', async () => {
      mockFindOne.mockResolvedValue({ id: 'c1', parentId: 'p1' });
      mockUserFindByPk.mockResolvedValue({ id: 'p1', schoolId: null });
      const req = { params: { id: 'c1' }, user: { id: 'r1', role: 'reception', schoolId: SCHOOL_A } };
      const res = mkRes();
      const next = mkNext();
      await checkChildAccess(req, res, next);
      // Pre-fix: next() was called (bypass). Post-fix: 403 closes the IDOR.
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('blocks reception when parent has a different (non-null) schoolId', async () => {
      mockFindOne.mockResolvedValue({ id: 'c1', parentId: 'p1' });
      mockUserFindByPk.mockResolvedValue({ id: 'p1', schoolId: SCHOOL_B });
      const req = { params: { id: 'c1' }, user: { id: 'r1', role: 'reception', schoolId: SCHOOL_A } };
      const res = mkRes();
      const next = mkNext();
      await checkChildAccess(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('allows reception when parent schoolId matches', async () => {
      mockFindOne.mockResolvedValue({ id: 'c1', parentId: 'p1' });
      mockUserFindByPk.mockResolvedValue({ id: 'p1', schoolId: SCHOOL_A });
      const req = { params: { id: 'c1' }, user: { id: 'r1', role: 'reception', schoolId: SCHOOL_A } };
      const res = mkRes();
      const next = mkNext();
      await checkChildAccess(req, res, next);
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalledWith(403);
    });
  });

});
