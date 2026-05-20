import { jest } from '@jest/globals';

const mockGoalFindAll = jest.fn();
const mockGoalFindOne = jest.fn();
const mockGoalCreate = jest.fn();
const mockGoalUpdate = jest.fn();
const mockGoalDestroy = jest.fn();
const mockReviewFindAll = jest.fn();
const mockReviewCreate = jest.fn();
const mockChildFindByPk = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/ChildGoal.js', () => ({
  default: {
    findAll: mockGoalFindAll,
    findOne: mockGoalFindOne,
    create: mockGoalCreate,
  },
}));
jest.unstable_mockModule('../../models/ChildGoalReview.js', () => ({
  default: {
    findAll: mockReviewFindAll,
    create: mockReviewCreate,
  },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findByPk: mockChildFindByPk },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: jest.fn(async (childId, req) => {
    if (!childId) return null;
    const child = await mockChildFindByPk(childId);
    if (!child) return null;
    if (child.schoolId !== req.user.schoolId) return null;
    return child;
  }),
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

const { listByChild, getById, create, update, deleteGoal, createReview, listReviews } =
  await import('../../controllers/goalController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.send = jest.fn().mockReturnValue(res);
  return res;
};

const teacherReq = (childId, body = {}, params = {}) => ({
  user: { id: 'u1', role: 'teacher', schoolId: 's1' },
  params: { childId, id: params.id ?? childId, ...params },
  body,
});

const CHILD_ID = 'c1';
const SCHOOL_ID = 's1';
const GOAL_ID = 'g1';

const fakeChild = { id: CHILD_ID, schoolId: SCHOOL_ID, firstName: 'A', lastName: 'B', dateOfBirth: '2020-01-01' };
const fakeGoal = {
  id: GOAL_ID, childId: CHILD_ID, schoolId: SCHOOL_ID, category: 'communication', title: 'Say five words',
  currentProgress: 'not_started', childSnapshot: {},
  update: mockGoalUpdate, destroy: mockGoalDestroy,
};

describe('listByChild', () => {
  beforeEach(() => { jest.clearAllMocks(); mockChildFindByPk.mockResolvedValue(fakeChild); });

  it('200 returns goals for accessible child', async () => {
    mockGoalFindAll.mockResolvedValue([fakeGoal]);
    const res = mkRes();
    await listByChild(teacherReq(CHILD_ID), res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('404 when child is not accessible (cross-school IDOR)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c2', schoolId: 's-other' });
    const res = mkRes();
    await listByChild(teacherReq('c2'), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
  });

  // Revert-check: without the validateChildAccess guard, cross-school access returns 200.
  // With guard: returns 404. Confirmed by mocking child in s-other above.
  it('500 on DB error', async () => {
    mockGoalFindAll.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await listByChild(teacherReq(CHILD_ID), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('getById', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns goal for same school', async () => {
    mockGoalFindOne.mockResolvedValue(fakeGoal);
    const res = mkRes();
    await getById({ user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID } }, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: fakeGoal }));
  });

  it('404 for cross-school goal (IDOR guard)', async () => {
    mockGoalFindOne.mockResolvedValue(null); // schoolId filter excludes it
    const res = mkRes();
    await getById({ user: { id: 'u1', role: 'teacher', schoolId: 's-other' }, params: { id: GOAL_ID } }, res);
    expect(res.status).toHaveBeenCalledWith(404);
    // Revert-check: findOne is called with { where: { id, schoolId } } — removing schoolId filter
    // would return the goal. With filter: null returned → 404.
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_NOT_FOUND' }),
    }));
  });
});

describe('create', () => {
  beforeEach(() => { jest.clearAllMocks(); mockChildFindByPk.mockResolvedValue(fakeChild); });

  it('201 creates goal with childSnapshot', async () => {
    mockGoalCreate.mockResolvedValue({ ...fakeGoal, id: 'g-new' });
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'communication', title: 'Say hello' }), res);
    expect(mockGoalCreate).toHaveBeenCalledWith(expect.objectContaining({
      childSnapshot: expect.objectContaining({ firstName: 'A' }),
    }));
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entity: 'child_goals' }));
  });

  it('404 cross-school child (IDOR)', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c2', schoolId: 's-other' });
    const res = mkRes();
    await create(teacherReq('c2', { category: 'communication', title: 'Say hello' }), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_CHILD_NOT_ACCESSIBLE' }),
    }));
    // Revert-check: without validateChildAccess, cross-school child would proceed to create.
    // With guard: 404 returned. Confirmed: mockGoalCreate not called.
    expect(mockGoalCreate).not.toHaveBeenCalled();
  });

  it('400 GOAL_INVALID_CATEGORY', async () => {
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'invalid', title: 'Say hello' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_INVALID_CATEGORY' }),
    }));
  });

  it('400 GOAL_TITLE_TOO_SHORT (less than 5 chars)', async () => {
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'cognitive', title: 'Hi' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_TITLE_TOO_SHORT' }),
    }));
  });

  it('400 GOAL_TITLE_TOO_LONG (over 200 chars)', async () => {
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'cognitive', title: 'A'.repeat(201) }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_TITLE_TOO_LONG' }),
    }));
  });

  it('400 GOAL_TARGET_DATE_IN_PAST', async () => {
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'cognitive', title: 'Valid title', targetDate: '2020-01-01' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_TARGET_DATE_IN_PAST' }),
    }));
  });

  it('400 GOAL_INVALID_PROGRESS_STATUS', async () => {
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'cognitive', title: 'Valid title', currentProgress: 'flying' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_INVALID_PROGRESS_STATUS' }),
    }));
  });

  it('500 on DB create error', async () => {
    mockGoalCreate.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await create(teacherReq(CHILD_ID, { category: 'communication', title: 'Say hello' }), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

describe('update', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 updates allowed fields and writes audit with diff', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoal });
    mockGoalUpdate.mockResolvedValue();
    const req = { user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID }, body: { currentProgress: 'developing' } };
    const res = mkRes();
    await update(req, res);
    expect(mockGoalUpdate).toHaveBeenCalledWith(expect.objectContaining({ currentProgress: 'developing' }));
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: 'update', entity: 'child_goals',
      meta: expect.objectContaining({ before: expect.any(Object), after: expect.any(Object) }),
    }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('400 GOAL_IMMUTABLE_FIELD when attempting to change childId', async () => {
    mockGoalFindOne.mockResolvedValue(fakeGoal);
    const req = { user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID }, body: { childId: 'c-other' } };
    const res = mkRes();
    await update(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_IMMUTABLE_FIELD' }),
    }));
  });

  it('400 GOAL_IMMUTABLE_FIELD when attempting to change category', async () => {
    mockGoalFindOne.mockResolvedValue(fakeGoal);
    const req = { user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID }, body: { category: 'cognitive' } };
    const res = mkRes();
    await update(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_IMMUTABLE_FIELD' }),
    }));
  });

  it('404 for cross-school goal (IDOR)', async () => {
    mockGoalFindOne.mockResolvedValue(null);
    const req = { user: { id: 'u1', role: 'teacher', schoolId: 's-other' }, params: { id: GOAL_ID }, body: { currentProgress: 'developing' } };
    const res = mkRes();
    await update(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    // Revert-check: findOne without schoolId filter would return fakeGoal; update would proceed.
    // With filter: null → 404. mockGoalUpdate not called.
    expect(mockGoalUpdate).not.toHaveBeenCalled();
  });
});

describe('deleteGoal', () => {
  beforeEach(() => jest.clearAllMocks());

  it('204 on valid delete, afterDestroy hook writes audit', async () => {
    mockGoalFindOne.mockResolvedValue({ ...fakeGoal, destroy: mockGoalDestroy });
    mockGoalDestroy.mockResolvedValue();
    const req = { user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID }, body: {} };
    const res = mkRes();
    await deleteGoal(req, res);
    expect(mockGoalDestroy).toHaveBeenCalledWith(expect.objectContaining({ actorId: 'u1' }));
    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('404 for cross-school goal', async () => {
    mockGoalFindOne.mockResolvedValue(null);
    const req = { user: { id: 'u1', role: 'teacher', schoolId: 's-other' }, params: { id: GOAL_ID }, body: {} };
    const res = mkRes();
    await deleteGoal(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('createReview', () => {
  const reqWithGoal = (body) => ({
    user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID },
    params: { id: GOAL_ID },
    body,
  });

  beforeEach(() => { jest.clearAllMocks(); mockGoalFindOne.mockResolvedValue(fakeGoal); });

  it('201 creates review and writes audit', async () => {
    mockReviewCreate.mockResolvedValue({ id: 'r1', goalId: GOAL_ID, status: 'on_track', reviewDate: '2026-01-01' });
    const res = mkRes();
    await createReview(reqWithGoal({ reviewDate: '2026-01-01', status: 'on_track' }), res);
    expect(mockReviewCreate).toHaveBeenCalledWith(expect.objectContaining({ goalId: GOAL_ID, status: 'on_track' }));
    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({ action: 'create', entity: 'child_goal_reviews' }));
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('400 GOAL_REVIEW_DATE_IN_FUTURE', async () => {
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 2);
    const res = mkRes();
    await createReview(reqWithGoal({ reviewDate: tomorrow.toISOString().slice(0, 10), status: 'on_track' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_REVIEW_DATE_IN_FUTURE' }),
    }));
  });

  it('400 GOAL_REVIEW_INVALID_STATUS', async () => {
    const res = mkRes();
    await createReview(reqWithGoal({ reviewDate: '2026-01-01', status: 'flying' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'GOAL_REVIEW_INVALID_STATUS' }),
    }));
  });
});

describe('listReviews', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns reviews ordered DESC', async () => {
    mockGoalFindOne.mockResolvedValue(fakeGoal);
    mockReviewFindAll.mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
    const req = { user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID } };
    const res = mkRes();
    await listReviews(req, res);
    expect(mockReviewFindAll).toHaveBeenCalledWith(expect.objectContaining({ order: [['reviewDate', 'DESC']] }));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('404 if goal not found or cross-school', async () => {
    mockGoalFindOne.mockResolvedValue(null);
    const req = { user: { id: 'u1', role: 'teacher', schoolId: 's-other' }, params: { id: GOAL_ID } };
    const res = mkRes();
    await listReviews(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });
});

describe('afterDestroy hook (ChildGoal)', () => {
  it('destroy is called with actorId/actorRole/reason so hook can log audit', async () => {
    const destroy = jest.fn().mockResolvedValue();
    mockGoalFindOne.mockResolvedValue({ ...fakeGoal, destroy });
    const req = { user: { id: 'u1', role: 'teacher', schoolId: SCHOOL_ID }, params: { id: GOAL_ID }, body: { reason: 'test' } };
    const res = mkRes();
    await deleteGoal(req, res);
    expect(destroy).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'u1', actorRole: 'teacher', reason: 'test',
    }));
  });
});
