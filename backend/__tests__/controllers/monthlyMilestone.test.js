// IRR-MONTHLY-MILESTONES (Option B) — controller tests.
//
// Covers: role gate, school-scope, teacher-assignment, upsert behaviour,
// month range validation, status validation, bulk replace semantics.

import { jest } from '@jest/globals';

const mockIRRFindByPk = jest.fn();
const mockLTGFindByPk = jest.fn();
const mockMMFindAll = jest.fn();
const mockMMFindOne = jest.fn();
const mockMMFindByPk = jest.fn();
const mockMMCreate = jest.fn();
const mockChildFindByPk = jest.fn();
const mockIsTeacherAssignedToChild = jest.fn();

jest.unstable_mockModule('../../models/IRR.js',                () => ({ default: { findByPk: mockIRRFindByPk } }));
jest.unstable_mockModule('../../models/LongTermGoal.js',       () => ({ default: { findByPk: mockLTGFindByPk } }));
jest.unstable_mockModule('../../models/MonthlyMilestone.js',   () => ({ default: { findAll: mockMMFindAll, findOne: mockMMFindOne, findByPk: mockMMFindByPk, create: mockMMCreate } }));
jest.unstable_mockModule('../../models/Child.js',              () => ({ default: { findByPk: mockChildFindByPk } }));
jest.unstable_mockModule('../../utils/schoolValidation.js',    () => ({ isTeacherAssignedToChild: mockIsTeacherAssignedToChild }));
jest.unstable_mockModule('../../utils/logger.js',              () => ({ default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() } }));

const { listByIRR, listByLTG, create, replaceAll, update, remove } = await import(
  '../../controllers/teacher/monthlyMilestoneController.js'
);

const VALID_UUID = '00000000-0000-4000-8000-000000000001';
const ANOTHER_UUID = '00000000-0000-4000-8000-000000000002';

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json   = jest.fn().mockReturnValue(res);
  return res;
};

const teacherReq = (overrides = {}) => ({
  user: { id: 't1', role: 'teacher', schoolId: 'school-A' },
  params: {},
  body: {},
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockIsTeacherAssignedToChild.mockResolvedValue(true);
});

// ── listByIRR ────────────────────────────────────────────────────────────────

describe('listByIRR', () => {
  it('404 when irrId is not a UUID', async () => {
    const res = mkRes();
    await listByIRR(teacherReq({ params: { irrId: 'not-a-uuid' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockIRRFindByPk).not.toHaveBeenCalled();
  });

  it('404 when IRR is in a different school', async () => {
    mockIRRFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-OTHER', childId: null });
    const res = mkRes();
    await listByIRR(teacherReq({ params: { irrId: VALID_UUID } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockMMFindAll).not.toHaveBeenCalled();
  });

  it('200 returns milestones ordered by LTG then month', async () => {
    mockIRRFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', childId: null });
    mockMMFindAll.mockResolvedValue([{ id: 'm1', monthNumber: 1 }]);
    const res = mkRes();
    await listByIRR(teacherReq({ params: { irrId: VALID_UUID } }), res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'm1', monthNumber: 1 }] });
    expect(mockMMFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { irrId: VALID_UUID },
      order: [['longTermGoalId', 'ASC'], ['monthNumber', 'ASC']],
    }));
  });
});

// ── create ──────────────────────────────────────────────────────────────────

describe('create', () => {
  it('403 when role is not teacher', async () => {
    const res = mkRes();
    await create({ user: { role: 'admin' }, params: {}, body: {} }, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('404 when LTG is in a different school', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-OTHER', childId: null });
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 1, targetText: 'goal' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockMMCreate).not.toHaveBeenCalled();
  });

  it('400 when monthNumber is out of range', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 13, targetText: 'goal' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'MONTHLY_MILESTONE_INVALID_MONTH' }),
    }));
  });

  it('400 when targetText is missing', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 3 } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'MONTHLY_MILESTONE_TARGET_REQUIRED' }),
    }));
  });

  it('400 when status is invalid', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 3, targetText: 'goal', status: 'unknown' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('201 creates a new milestone when one does not exist', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: 'child-1' });
    mockMMFindOne.mockResolvedValue(null);
    mockMMCreate.mockResolvedValue({ id: 'new-mm', monthNumber: 3 });
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 3, targetText: '  goal text  ' } }), res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockMMCreate).toHaveBeenCalledWith(expect.objectContaining({
      irrId: 'irr-1',
      longTermGoalId: VALID_UUID,
      childId: 'child-1',
      schoolId: 'school-A',
      monthNumber: 3,
      targetText: 'goal text',
      status: 'planned',
      assessedBy: null,
    }));
  });

  it('200 upserts when (longTermGoalId, monthNumber) already exists', async () => {
    const updateFn = jest.fn().mockResolvedValue();
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    mockMMFindOne.mockResolvedValue({ id: 'old-mm', monthNumber: 3, status: 'planned', update: updateFn });
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 3, targetText: 'updated' } }), res);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({ targetText: 'updated' }));
    expect(mockMMCreate).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(500);
  });

  it('sets assessedBy when status transitions away from "planned"', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    mockMMFindOne.mockResolvedValue(null);
    mockMMCreate.mockResolvedValue({});
    const res = mkRes();
    await create(teacherReq({ params: { ltgId: VALID_UUID }, body: { monthNumber: 3, targetText: 'g', status: 'achieved' } }), res);
    expect(mockMMCreate).toHaveBeenCalledWith(expect.objectContaining({ assessedBy: 't1', status: 'achieved' }));
  });
});

// ── replaceAll (bulk) ───────────────────────────────────────────────────────

describe('replaceAll', () => {
  it('400 when payload is not an array', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    const res = mkRes();
    await replaceAll(teacherReq({ params: { ltgId: VALID_UUID }, body: { milestones: 'not-array' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'MONTHLY_MILESTONE_INVALID_PAYLOAD' }),
    }));
  });

  it('400 when payload has a duplicate month', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    const res = mkRes();
    await replaceAll(teacherReq({
      params: { ltgId: VALID_UUID },
      body: { milestones: [{ monthNumber: 3, targetText: 'a' }, { monthNumber: 3, targetText: 'b' }] },
    }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'MONTHLY_MILESTONE_DUPLICATE_MONTH' }),
    }));
  });

  it('preserves evaluated milestones (status !== planned) when omitted from payload', async () => {
    const destroyEvaluated = jest.fn();
    const destroyPlanned = jest.fn();
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', irrId: 'irr-1', childId: null });
    mockMMFindAll.mockResolvedValue([
      { id: 'evaluated', monthNumber: 1, status: 'achieved', destroy: destroyEvaluated },
      { id: 'planned',   monthNumber: 2, status: 'planned',  destroy: destroyPlanned },
    ]);
    mockMMCreate.mockResolvedValue({ id: 'new', monthNumber: 5 });

    const res = mkRes();
    await replaceAll(teacherReq({
      params: { ltgId: VALID_UUID },
      body: { milestones: [{ monthNumber: 5, targetText: 'new goal' }] },
    }), res);

    expect(destroyEvaluated).not.toHaveBeenCalled(); // achieved row preserved
    expect(destroyPlanned).toHaveBeenCalled();        // planned-only orphan deleted
    expect(mockMMCreate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalled();
  });
});

// ── update ──────────────────────────────────────────────────────────────────

describe('update', () => {
  it('404 when milestone is in a different school', async () => {
    mockMMFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-OTHER', childId: null });
    const res = mkRes();
    await update(teacherReq({ params: { id: VALID_UUID }, body: { status: 'achieved' } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('400 when status is invalid', async () => {
    const updateFn = jest.fn();
    mockMMFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', childId: null, update: updateFn });
    const res = mkRes();
    await update(teacherReq({ params: { id: VALID_UUID }, body: { status: 'unknown' } }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(updateFn).not.toHaveBeenCalled();
  });

  it('200 updates fields and sets assessedBy when status leaves "planned"', async () => {
    const updateFn = jest.fn().mockResolvedValue();
    mockMMFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', childId: null, update: updateFn });
    const res = mkRes();
    await update(teacherReq({
      params: { id: VALID_UUID },
      body: { status: 'achieved', actualText: '  did it  ' },
    }), res);
    expect(updateFn).toHaveBeenCalledWith(expect.objectContaining({
      status: 'achieved',
      assessedBy: 't1',
      actualText: 'did it',
    }));
  });
});

// ── remove ──────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('404 when milestone is in a different school', async () => {
    mockMMFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-OTHER', childId: null });
    const res = mkRes();
    await remove(teacherReq({ params: { id: VALID_UUID } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('200 destroys with audit metadata', async () => {
    const destroyFn = jest.fn().mockResolvedValue();
    mockMMFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', childId: null, destroy: destroyFn });
    const res = mkRes();
    await remove(teacherReq({ params: { id: VALID_UUID } }), res);
    expect(destroyFn).toHaveBeenCalledWith({ actorId: 't1', actorRole: 'teacher' });
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});

// ── listByLTG ────────────────────────────────────────────────────────────────

describe('listByLTG', () => {
  it('404 when LTG is cross-school', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-OTHER', childId: null });
    const res = mkRes();
    await listByLTG(teacherReq({ params: { ltgId: VALID_UUID } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('200 returns milestones ordered by month', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', childId: null });
    mockMMFindAll.mockResolvedValue([{ id: 'm', monthNumber: 1 }]);
    const res = mkRes();
    await listByLTG(teacherReq({ params: { ltgId: VALID_UUID } }), res);
    expect(mockMMFindAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { longTermGoalId: VALID_UUID },
      order: [['monthNumber', 'ASC']],
    }));
    expect(res.json).toHaveBeenCalledWith({ success: true, data: [{ id: 'm', monthNumber: 1 }] });
  });

  it('404 when teacher is not assigned to the child even if school matches', async () => {
    mockLTGFindByPk.mockResolvedValue({ id: VALID_UUID, schoolId: 'school-A', childId: ANOTHER_UUID });
    mockChildFindByPk.mockResolvedValue({ id: ANOTHER_UUID, schoolId: 'school-A' });
    mockIsTeacherAssignedToChild.mockResolvedValue(false);
    const res = mkRes();
    await listByLTG(teacherReq({ params: { ltgId: VALID_UUID } }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockMMFindAll).not.toHaveBeenCalled();
  });
});
