import { jest } from '@jest/globals';

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockFindByPk = jest.fn();
const mockValidateChildAccess = jest.fn();

jest.unstable_mockModule('../models/ChildAssessment.js', () => ({
  default: { findOne: mockFindOne, create: mockCreate, findByPk: mockFindByPk, findAll: jest.fn() },
}));
jest.unstable_mockModule('../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../config/database.js', () => ({
  default: { fn: jest.fn(), col: jest.fn(), literal: jest.fn() },
}));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { createAssessment } = await import('../controllers/childAssessmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('childAssessmentController.createAssessment', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when fields missing', async () => {
    const req = { user: { id: 't1' }, body: {} };
    const res = mkRes();
    await createAssessment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when category invalid', async () => {
    const req = { user: { id: 't1' }, body: { childId: 'c1', category: 'invalid', score: 3 } };
    const res = mkRes();
    await createAssessment(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when score out of range (0 or 6)', async () => {
    for (const score of [0, 6, -1, 100]) {
      const req = { user: { id: 't1' }, body: { childId: 'c1', category: 'cognitive', score } };
      const res = mkRes();
      await createAssessment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    }
  });

  it('404 when child access denied', async () => {
    mockValidateChildAccess.mockResolvedValue(null);
    const req = { user: { id: 't1' }, body: { childId: 'c1', category: 'cognitive', score: 3 } };
    const res = mkRes();
    await createAssessment(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('upserts when same child+category+date exists', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
    const save = jest.fn().mockResolvedValue();
    const existing = { id: 'a1', save };
    mockFindOne.mockResolvedValue(existing);
    mockFindByPk.mockResolvedValue({ id: 'a1' });
    const req = {
      user: { id: 't1' },
      body: { childId: 'c1', category: 'cognitive', score: 4, notes: 'good', date: '2026-05-06' },
    };
    const res = mkRes();
    await createAssessment(req, res);
    expect(existing.score).toBe(4);
    expect(existing.notes).toBe('good');
    expect(existing.teacherId).toBe('t1');
    expect(save).toHaveBeenCalled();
  });

  it('creates new assessment when none exists', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
    mockFindOne.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'a2' });
    mockFindByPk.mockResolvedValue({ id: 'a2' });
    const req = {
      user: { id: 't1' },
      body: { childId: 'c1', category: 'social', score: 5 },
    };
    const res = mkRes();
    await createAssessment(req, res);
    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      childId: 'c1', teacherId: 't1', category: 'social', score: 5,
    }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('409 on unique constraint error', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: 'c1' });
    mockFindOne.mockResolvedValue(null);
    const err = new Error('unique');
    err.name = 'SequelizeUniqueConstraintError';
    mockCreate.mockRejectedValue(err);
    const req = {
      user: { id: 't1' },
      body: { childId: 'c1', category: 'social', score: 5 },
    };
    const res = mkRes();
    await createAssessment(req, res);
    expect(res.status).toHaveBeenCalledWith(409);
  });
});
