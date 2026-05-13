import { jest } from '@jest/globals';

const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockUserFindAll = jest.fn();
const mockChildDestroy = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: mockUserFindOne, create: mockUserCreate, findAll: mockUserFindAll },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { destroy: mockChildDestroy, findAll: jest.fn(), findOne: jest.fn() },
}));
jest.unstable_mockModule('../models/Document.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/TeacherRating.js', () => ({ default: { findOne: jest.fn(), findAll: jest.fn() } }));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/Activity.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../models/Media.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../models/Meal.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../models/Progress.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../models/TherapyUsage.js', () => ({ default: { destroy: jest.fn() } }));
jest.unstable_mockModule('../models/Group.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/School.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({ validateChildAccess: jest.fn() }));
jest.unstable_mockModule('../config/database.js', () => ({
  default: { transaction: mockTransaction, fn: jest.fn(), col: jest.fn(), literal: jest.fn() },
}));
jest.unstable_mockModule('../config/storage.js', () => ({
  uploadFile: jest.fn(), deleteFile: jest.fn(),
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { createTeacher, getTeachers, updateTeacher, deleteTeacher } = await import('../controllers/receptionTeacherController.js');
const { getParents, deleteParent } = await import('../controllers/receptionParentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('receptionController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTeacher', () => {
    it('403 when reception has no schoolId', async () => {
      const req = { user: { id: 'r1' }, body: {} };
      const res = mkRes();
      await createTeacher(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('400 when fields missing (with schoolId)', async () => {
      const req = { user: { id: 'r1', schoolId: 's1' }, body: {} };
      const res = mkRes();
      await createTeacher(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when email already exists', async () => {
      mockUserFindOne.mockResolvedValue({ id: 'existing' });
      const req = {
        user: { id: 'r1', schoolId: 's1' },
        body: { email: 'a@x.com', password: 'p', firstName: 'A', lastName: 'B' },
      };
      const res = mkRes();
      await createTeacher(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('inherits schoolId and createdBy from reception', async () => {
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ id: 't1', toJSON: () => ({ id: 't1' }) });
      const req = {
        user: { id: 'r1', schoolId: 's1' },
        body: { email: 'a@x.com', password: 'p', firstName: 'A', lastName: 'B' },
      };
      const res = mkRes();
      await createTeacher(req, res);
      expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({
        role: 'teacher', isActive: true, createdBy: 'r1', schoolId: 's1',
      }));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('deleteParent', () => {
    it('404 when parent not in same school as reception', async () => {
      mockUserFindOne.mockResolvedValue(null);
      const req = { user: { id: 'r1', schoolId: 's1' }, params: { id: 'p1' } };
      const res = mkRes();
      await deleteParent(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('wraps child destroy + parent destroy in a transaction', async () => {
      const destroy = jest.fn().mockResolvedValue();
      mockUserFindOne.mockResolvedValue({ id: 'p1', destroy });
      let calledFn;
      mockTransaction.mockImplementation(async (fn) => { calledFn = fn; await fn({ id: 't' }); });
      const req = { user: { id: 'r1' }, params: { id: 'p1' } };
      const res = mkRes();
      await deleteParent(req, res);
      expect(mockTransaction).toHaveBeenCalled();
      expect(calledFn).toBeDefined();
      expect(destroy).toHaveBeenCalledWith({ transaction: { id: 't' } });
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('500 if transaction throws', async () => {
      mockUserFindOne.mockResolvedValue({ id: 'p1', destroy: jest.fn() });
      mockTransaction.mockRejectedValue(new Error('rollback'));
      const req = { user: { id: 'r1', schoolId: 's1' }, params: { id: 'p1' } };
      const res = mkRes();
      await deleteParent(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});

describe('reception school isolation (H2V-02)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getTeachers scopes by schoolId not createdBy', async () => {
    mockUserFindAll.mockResolvedValue([]);
    const req = { user: { id: 'r1', schoolId: 's1' }, query: {} };
    const res = mkRes();
    await getTeachers(req, res);
    expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: 's1' }),
    }));
    expect(mockUserFindAll.mock.calls[0][0].where).not.toHaveProperty('createdBy');
  });

  it('updateTeacher scopes by schoolId not createdBy', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { id: 'r1', schoolId: 's1' }, params: { id: 't1' }, body: {} };
    const res = mkRes();
    await updateTeacher(req, res);
    expect(mockUserFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: 's1' }),
    }));
    expect(mockUserFindOne.mock.calls[0][0].where).not.toHaveProperty('createdBy');
  });

  it('deleteTeacher scopes by schoolId not createdBy', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { id: 'r1', schoolId: 's1' }, params: { id: 't1' } };
    const res = mkRes();
    await deleteTeacher(req, res);
    expect(mockUserFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: 's1' }),
    }));
    expect(mockUserFindOne.mock.calls[0][0].where).not.toHaveProperty('createdBy');
  });

  it('getParents scopes by schoolId not createdBy', async () => {
    mockUserFindAll.mockResolvedValue([]);
    const req = { user: { id: 'r1', schoolId: 's1' } };
    const res = mkRes();
    await getParents(req, res);
    expect(mockUserFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: 's1' }),
    }));
    expect(mockUserFindAll.mock.calls[0][0].where).not.toHaveProperty('createdBy');
  });

  it('deleteParent 404 when not in same school', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { id: 'r1', schoolId: 's1' }, params: { id: 'p1' } };
    const res = mkRes();
    await deleteParent(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockUserFindOne).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ schoolId: 's1' }),
    }));
  });
});
