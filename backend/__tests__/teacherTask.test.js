import { jest } from '@jest/globals';

const mockResponsibilityFindAll = jest.fn();
const mockResponsibilityFindOne = jest.fn();
const mockTaskFindAll = jest.fn();
const mockTaskFindOne = jest.fn();

jest.unstable_mockModule('../models/TeacherResponsibility.js', () => ({
  default: { findAll: mockResponsibilityFindAll, findOne: mockResponsibilityFindOne },
}));
jest.unstable_mockModule('../models/TeacherTask.js', () => ({
  default: { findAll: mockTaskFindAll, findOne: mockTaskFindOne },
}));
jest.unstable_mockModule('../models/TeacherWorkHistory.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMyResponsibilities, getResponsibilityById, getMyTasks, getTaskById, updateTaskStatus } = await import('../controllers/teacherTaskController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('teacherTaskController.getMyResponsibilities', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of responsibilities', async () => {
    mockResponsibilityFindAll.mockResolvedValue([{ id: 'r1' }]);
    const req = { query: {}, user: { id: 't1' } };
    const res = mkRes();
    await getMyResponsibilities(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(1);
  });

  it('500 on DB error', async () => {
    mockResponsibilityFindAll.mockRejectedValue(new Error('db fail'));
    const req = { query: {}, user: { id: 't1' } };
    const res = mkRes();
    await getMyResponsibilities(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teacherTaskController.getResponsibilityById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404 when not found', async () => {
    mockResponsibilityFindOne.mockResolvedValue(null);
    const req = { params: { id: 'r1' }, user: { id: 't1' } };
    const res = mkRes();
    await getResponsibilityById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns responsibility when found', async () => {
    mockResponsibilityFindOne.mockResolvedValue({ id: 'r1' });
    const req = { params: { id: 'r1' }, user: { id: 't1' } };
    const res = mkRes();
    await getResponsibilityById(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });
});

describe('teacherTaskController.getMyTasks', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns list of tasks', async () => {
    mockTaskFindAll.mockResolvedValue([{ id: 'task1' }, { id: 'task2' }]);
    const req = { query: {}, user: { id: 't1' } };
    const res = mkRes();
    await getMyTasks(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
    expect(payload.data).toHaveLength(2);
  });

  it('filters by startDate when provided', async () => {
    mockTaskFindAll.mockResolvedValue([]);
    const req = { query: { startDate: '2026-01-01' }, user: { id: 't1' } };
    const res = mkRes();
    await getMyTasks(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });

  it('500 on DB error', async () => {
    mockTaskFindAll.mockRejectedValue(new Error('db fail'));
    const req = { query: {}, user: { id: 't1' } };
    const res = mkRes();
    await getMyTasks(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('teacherTaskController.getTaskById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('404 when not found', async () => {
    mockTaskFindOne.mockResolvedValue(null);
    const req = { params: { id: 'task1' }, user: { id: 't1' } };
    const res = mkRes();
    await getTaskById(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns task when found', async () => {
    mockTaskFindOne.mockResolvedValue({ id: 'task1' });
    const req = { params: { id: 'task1' }, user: { id: 't1' } };
    const res = mkRes();
    await getTaskById(req, res);
    expect(res.json).toHaveBeenCalled();
    const payload = res.json.mock.calls[0][0];
    expect(payload.success).toBe(true);
  });
});

describe('teacherTaskController.updateTaskStatus', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when status is missing', async () => {
    const req = { params: { id: 'task1' }, body: {}, user: { id: 't1' } };
    const res = mkRes();
    await updateTaskStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when status is invalid', async () => {
    const req = { params: { id: 'task1' }, body: { status: 'invalid' }, user: { id: 't1' } };
    const res = mkRes();
    await updateTaskStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('404 when task not found', async () => {
    mockTaskFindOne.mockResolvedValue(null);
    const req = { params: { id: 'task1' }, body: { status: 'completed' }, user: { id: 't1' } };
    const res = mkRes();
    await updateTaskStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});
