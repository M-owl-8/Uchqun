import { jest } from '@jest/globals';

const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockChildDestroy = jest.fn();
const mockTransaction = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: mockUserFindOne, create: mockUserCreate, findAll: jest.fn() },
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

const { createTeacher, deleteParent } = await import('../controllers/receptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('receptionController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('createTeacher', () => {
    it('400 when fields missing', async () => {
      const req = { user: { id: 'r1' }, body: {} };
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
    it('404 when parent not found or not created by this reception', async () => {
      mockUserFindOne.mockResolvedValue(null);
      const req = { user: { id: 'r1' }, params: { id: 'p1' } };
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
      const req = { user: { id: 'r1' }, params: { id: 'p1' } };
      const res = mkRes();
      await deleteParent(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });
  });
});
