import { jest } from '@jest/globals';

const mockUserFindByPk = jest.fn();
const mockUserFindAll = jest.fn();
const mockUserFindAndCount = jest.fn();
const mockTaskFindOne = jest.fn();
const mockGroupFindAll = jest.fn();

jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    findByPk: mockUserFindByPk,
    findAll: mockUserFindAll,
    findAndCountAll: mockUserFindAndCount,
  },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: { findAll: jest.fn() } }));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findAll: mockGroupFindAll },
}));
jest.unstable_mockModule('../models/TeacherResponsibility.js', () => ({
  default: { findAll: jest.fn() },
}));
jest.unstable_mockModule('../models/TeacherTask.js', () => ({
  default: { findOne: mockTaskFindOne, findAll: jest.fn(), count: jest.fn() },
}));
jest.unstable_mockModule('../models/TeacherWorkHistory.js', () => ({
  default: { findAll: jest.fn(), findOne: jest.fn(), count: jest.fn() },
}));
jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({
  default: { findAll: jest.fn() },
}));
jest.unstable_mockModule('../models/EmotionalMonitoring.js', () => ({
  default: { findAll: jest.fn(), findOne: jest.fn(), findByPk: jest.fn(), create: jest.fn() },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMyProfile, getParents } = await import('../controllers/teacherController.js');
const { updateTaskStatus } = await import('../controllers/teacherTaskController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('teacherController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('getMyProfile', () => {
    it('500 when user lookup throws', async () => {
      mockUserFindByPk.mockRejectedValue(new Error('boom'));
      const req = { user: { id: 't1' } };
      const res = mkRes();
      await getMyProfile(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
    });

    it('returns user data', async () => {
      mockUserFindByPk.mockResolvedValue({ id: 't1', toJSON: () => ({ id: 't1' }) });
      const req = { user: { id: 't1' } };
      const res = mkRes();
      await getMyProfile(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        success: true,
      }));
    });
  });

  describe('updateTaskStatus', () => {
    it('400 when status missing', async () => {
      const req = { user: { id: 't1' }, params: { id: 'task1' }, body: {} };
      const res = mkRes();
      await updateTaskStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when status invalid', async () => {
      const req = { user: { id: 't1' }, params: { id: 'task1' }, body: { status: 'invalid' } };
      const res = mkRes();
      await updateTaskStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when task not owned by teacher', async () => {
      mockTaskFindOne.mockResolvedValue(null);
      const req = { user: { id: 't1' }, params: { id: 'task1' }, body: { status: 'completed' } };
      const res = mkRes();
      await updateTaskStatus(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
    });

    it('sets completedAt when status=completed', async () => {
      const save = jest.fn().mockResolvedValue();
      const task = { id: 'task1', status: 'pending', save };
      mockTaskFindOne.mockResolvedValue(task);
      const req = { user: { id: 't1' }, params: { id: 'task1' }, body: { status: 'completed' } };
      const res = mkRes();
      await updateTaskStatus(req, res);
      expect(task.status).toBe('completed');
      expect(task.completedAt).toBeInstanceOf(Date);
      expect(save).toHaveBeenCalled();
    });
  });

  describe('getParents', () => {
    it('admin: scoped by req.user.schoolId', async () => {
      mockUserFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'a1', role: 'admin', schoolId: 's1' }, query: {} };
      const res = mkRes();
      await getParents(req, res);
      const where = mockUserFindAndCount.mock.calls[0][0].where;
      expect(where.role).toBe('parent');
      expect(where.schoolId).toBe('s1');
    });

    it('reception: scoped by req.user.schoolId', async () => {
      mockUserFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 'r1', role: 'reception', schoolId: 's2' }, query: {} };
      const res = mkRes();
      await getParents(req, res);
      const where = mockUserFindAndCount.mock.calls[0][0].where;
      expect(where.schoolId).toBe('s2');
    });

    it('teacher: empty result when no groups and no direct assignments', async () => {
      mockGroupFindAll.mockResolvedValue([]);
      mockUserFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 't1', role: 'teacher' }, query: {} };
      const res = mkRes();
      await getParents(req, res);
      const where = mockUserFindAndCount.mock.calls[0][0].where;
      expect(where.teacherId).toBe('t1');
    });

    it('teacher: filters by groups and direct teacherId via OR', async () => {
      mockGroupFindAll.mockResolvedValue([{ id: 'g1' }, { id: 'g2' }]);
      mockUserFindAndCount.mockResolvedValue({ rows: [], count: 0 });
      const req = { user: { id: 't1', role: 'teacher' }, query: {} };
      const res = mkRes();
      await getParents(req, res);
      const where = mockUserFindAndCount.mock.calls[0][0].where;
      const orKey = Object.getOwnPropertySymbols(where).find(s => s.toString() === 'Symbol(or)');
      expect(orKey).toBeDefined();
    });
  });
});
