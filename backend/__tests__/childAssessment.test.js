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
  default: { fn: jest.fn(), col: jest.fn(), literal: jest.fn(), escape: (v) => `'${v}'` },
}));
jest.unstable_mockModule('../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { createAssessment, getAssessments, getLatestAssessments } = await import('../controllers/childAssessmentController.js');

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

describe('childAssessmentController.getAssessments — UUID validation (C2V-02)', () => {
  const VALID_UUID = 'cc69745a-fae0-4555-b2c7-23dc7f479cd4';

  beforeEach(() => jest.clearAllMocks());

  it('400 when childId missing', async () => {
    const req = { user: { id: 't1' }, query: {} };
    const res = mkRes();
    await getAssessments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when childId is not a UUID', async () => {
    const req = { user: { id: 't1' }, query: { childId: "' OR 1=1 --" } };
    const res = mkRes();
    await getAssessments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when childId is numeric string', async () => {
    const req = { user: { id: 't1' }, query: { childId: '12345' } };
    const res = mkRes();
    await getAssessments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('200 with valid UUID childId', async () => {
    const { default: ChildAssessment } = await import('../models/ChildAssessment.js');
    ChildAssessment.findAll.mockResolvedValue([]);
    const req = { user: { id: 't1' }, query: { childId: VALID_UUID } };
    const res = mkRes();
    await getAssessments(req, res);
    expect(res.json).toHaveBeenCalledWith({ data: [] });
  });
});

describe('childAssessmentController.getLatestAssessments — UUID validation (C2V-02)', () => {
  const VALID_UUID = 'cc69745a-fae0-4555-b2c7-23dc7f479cd4';

  beforeEach(() => jest.clearAllMocks());

  it('400 when childId missing', async () => {
    const req = { user: { id: 't1' }, query: {} };
    const res = mkRes();
    await getLatestAssessments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when childId contains SQL injection payload', async () => {
    const req = { user: { id: 't1' }, query: { childId: "1'; SELECT pg_sleep(5)--" } };
    const res = mkRes();
    await getLatestAssessments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('400 when childId is not a UUID', async () => {
    const req = { user: { id: 't1' }, query: { childId: 'not-a-uuid' } };
    const res = mkRes();
    await getLatestAssessments(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('uses sequelize.escape for childId in literal subquery', async () => {
    const { default: ChildAssessment } = await import('../models/ChildAssessment.js');
    const { default: db } = await import('../config/database.js');
    ChildAssessment.findAll.mockResolvedValue([]);
    const req = { user: { id: 't1' }, query: { childId: VALID_UUID } };
    const res = mkRes();
    await getLatestAssessments(req, res);
    // literal should be called with a string containing the escaped UUID, not raw interpolation
    const literalCall = db.literal.mock.calls[0][0];
    expect(literalCall).toContain(`'${VALID_UUID}'`);
    expect(literalCall).not.toContain(`\${`);
  });
});
