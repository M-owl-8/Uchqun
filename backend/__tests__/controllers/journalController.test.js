import { jest } from '@jest/globals';

const mockJournalFindAll = jest.fn();
const mockJournalCreate = jest.fn();
const mockChildFindOne = jest.fn();
const mockValidateChildAccess = jest.fn();
const mockAuditCreate = jest.fn();

// Capture the ChildJournalEntry afterDestroy hook registered via models/index.js
let capturedJournalHook = null;
const mockJournalAfterDestroy = jest.fn((fn) => { capturedJournalHook = fn; });

jest.unstable_mockModule('../../models/ChildJournalEntry.js', () => ({
  default: {
    findAll: mockJournalFindAll,
    create: mockJournalCreate,
    afterDestroy: mockJournalAfterDestroy,
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: {
    findOne: mockChildFindOne,
    findAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    afterDestroy: jest.fn(),
    addScope: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
    hasOne: jest.fn(),
    afterDestroy: jest.fn(),
  },
}));
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

// Additional model mocks needed by models/index.js for hook registration
jest.unstable_mockModule('../../models/Document.js', () => ({ default: { belongsTo: jest.fn(), findAll: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/ParentActivity.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/ParentMeal.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/ParentMedia.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherResponsibility.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherTask.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherWorkHistory.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/Progress.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Group.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn() } }));
jest.unstable_mockModule('../../models/Activity.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), addScope: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Media.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), addScope: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Meal.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), addScope: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Notification.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherRating.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/ChatMessage.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/School.js', () => ({ default: { hasMany: jest.fn(), belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/GovernmentMessage.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/AdminRegistrationRequest.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/EmotionalMonitoring.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/Therapy.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/TherapyUsage.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/BusinessStats.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/RefreshToken.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/ChildAssessment.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/ServicePlan.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/MealPlan.js', () => ({ default: { belongsTo: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherResource.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/ParentEvaluation.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/News.js', () => ({ default: { belongsTo: jest.fn() } }));
jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: {
    update: () => { throw new Error('audit_log is immutable'); },
    destroy: () => { throw new Error('audit_log is immutable'); },
    create: mockAuditCreate,
  },
}));
jest.unstable_mockModule('../../models/ChildAttendance.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/ChildObservation.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/TeacherReflection.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../models/ImportJob.js', () => ({ default: { belongsTo: jest.fn(), hasMany: jest.fn(), afterDestroy: jest.fn() } }));
jest.unstable_mockModule('../../config/database.js', () => ({
  default: { authenticate: jest.fn(), sync: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: jest.fn(async (entry) => { await mockAuditCreate(entry); }),
}));

// Load index.js to register afterDestroy hooks (including ChildJournalEntry)
await import('../../models/index.js');

const { create, listByChild, getChildJournal } = await import('../../controllers/journalController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const TODAY = new Date().toISOString().split('T')[0];
const FUTURE = '2099-01-01';
const VALID_CHILD_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

const baseCreateReq = () => ({
  user: { id: 'teacher-1', schoolId: 'school-1', role: 'teacher' },
  body: {
    childId: VALID_CHILD_ID,
    date: TODAY,
    content: 'This is a valid journal entry with enough characters.',
  },
  params: {},
});

// ─── create ───────────────────────────────────────────────────────────────────

describe('journalController — create', () => {
  beforeEach(() => jest.clearAllMocks());

  it('201 valid payload with childSnapshot populated', async () => {
    const child = { id: VALID_CHILD_ID, firstName: 'Ali', lastName: 'B', schoolId: 'school-1', dateOfBirth: '2019-05-01' };
    mockValidateChildAccess.mockResolvedValue(child);
    mockJournalCreate.mockResolvedValue({ id: 'jrn-1', ...baseCreateReq().body });
    const res = mkRes();
    await create(baseCreateReq(), res);
    expect(res.status).toHaveBeenCalledWith(201);
    const arg = mockJournalCreate.mock.calls[0][0];
    expect(arg.childSnapshot).toEqual({ firstName: 'Ali', lastName: 'B', schoolId: 'school-1', dateOfBirth: '2019-05-01' });
  });

  it('404 JOURNAL_CHILD_NOT_ACCESSIBLE when child belongs to different school (IDOR guard)', async () => {
    // Revert-test baseline: without validateChildAccess, any childId would be accepted.
    // Pre-fix (validateChildAccess removed): mockJournalCreate called → 201.
    // Post-fix: validateChildAccess returns null → 404.
    mockValidateChildAccess.mockResolvedValue(null);
    const res = mkRes();
    await create(baseCreateReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockJournalCreate).not.toHaveBeenCalled();
  });

  it('201 isVisibleToParent defaults to true when not specified', async () => {
    const child = { id: VALID_CHILD_ID, firstName: 'X', lastName: 'Y', schoolId: 'school-1', dateOfBirth: null };
    mockValidateChildAccess.mockResolvedValue(child);
    mockJournalCreate.mockResolvedValue({ id: 'jrn-2', isVisibleToParent: true });
    const res = mkRes();
    await create(baseCreateReq(), res);
    expect(mockJournalCreate.mock.calls[0][0].isVisibleToParent).toBe(true);
  });

  it('201 isVisibleToParent is false when explicitly set to false (draft mode)', async () => {
    const child = { id: VALID_CHILD_ID, firstName: 'X', lastName: 'Y', schoolId: 'school-1', dateOfBirth: null };
    mockValidateChildAccess.mockResolvedValue(child);
    mockJournalCreate.mockResolvedValue({ id: 'jrn-3', isVisibleToParent: false });
    const req = { ...baseCreateReq(), body: { ...baseCreateReq().body, isVisibleToParent: false } };
    const res = mkRes();
    await create(req, res);
    expect(mockJournalCreate.mock.calls[0][0].isVisibleToParent).toBe(false);
  });

  it('400 JOURNAL_CONTENT_TOO_SHORT when content < 10 chars', async () => {
    const req = { ...baseCreateReq(), body: { ...baseCreateReq().body, content: 'short' } };
    const res = mkRes();
    await create(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('JOURNAL_CONTENT_TOO_SHORT');
  });

  it('500 when DB throws', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: VALID_CHILD_ID, firstName: 'X', lastName: 'Y', schoolId: 'school-1', dateOfBirth: null });
    mockJournalCreate.mockRejectedValue(new Error('DB down'));
    const res = mkRes();
    await create(baseCreateReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── listByChild (teacher) ────────────────────────────────────────────────────

describe('journalController — listByChild (teacher)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 returns journal entries for valid child', async () => {
    mockValidateChildAccess.mockResolvedValue({ id: 'child-1', schoolId: 'school-1' });
    mockJournalFindAll.mockResolvedValue([{ id: 'jrn-new' }, { id: 'jrn-old' }]);
    const req = { user: { id: 't1', schoolId: 'school-1' }, params: { childId: 'child-1' } };
    const res = mkRes();
    await listByChild(req, res);
    expect(res.json).toHaveBeenCalledWith({ success: true, data: expect.any(Array) });
  });
});

// ─── getChildJournal (parent) ─────────────────────────────────────────────────

describe('journalController — getChildJournal (parent)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('200 parent sees own child journal with only visible entries', async () => {
    // Revert-test: without isVisibleToParent: true filter, draft entries leak to parents.
    // Pre-fix: findAll called without isVisibleToParent filter → 200 with drafts exposed.
    // Post-fix: findAll called with isVisibleToParent: true → drafts excluded.
    mockChildFindOne.mockResolvedValue({ id: 'child-1', parentId: 'parent-1' });
    mockJournalFindAll.mockResolvedValue([
      { id: 'jrn-vis', date: TODAY, content: 'Visible', author: { firstName: 'T', lastName: 'K' } },
    ]);
    const req = { user: { id: 'parent-1', role: 'parent' }, params: { id: 'child-1' } };
    const res = mkRes();
    await getChildJournal(req, res);
    const call = mockJournalFindAll.mock.calls[0][0];
    expect(call.where.isVisibleToParent).toBe(true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('404 JOURNAL_NOT_FOUND_FOR_PARENT when child belongs to different parent (IDOR guard)', async () => {
    // Revert-test baseline: without parentId check in Child.findOne, any parent could
    // access any child's journal.
    // Pre-fix (parentId check removed): findOne returns a child → journal is returned.
    // Post-fix: findOne with { parentId: req.user.id } returns null → 404.
    mockChildFindOne.mockResolvedValue(null);
    const req = { user: { id: 'parent-2', role: 'parent' }, params: { id: 'child-1' } };
    const res = mkRes();
    await getChildJournal(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].error.code).toBe('JOURNAL_NOT_FOUND_FOR_PARENT');
    expect(mockJournalFindAll).not.toHaveBeenCalled();
  });

  it('200 isVisibleToParent=false entries are excluded from parent response', async () => {
    // Critical visibility test: removing the isVisibleToParent: true filter exposes drafts.
    // Verified via revert-test: without filter, findAll would be called without isVisibleToParent.
    mockChildFindOne.mockResolvedValue({ id: 'child-1', parentId: 'parent-1' });
    mockJournalFindAll.mockResolvedValue([]);
    const req = { user: { id: 'parent-1', role: 'parent' }, params: { id: 'child-1' } };
    const res = mkRes();
    await getChildJournal(req, res);
    const call = mockJournalFindAll.mock.calls[0][0];
    expect(call.where.isVisibleToParent).toBe(true);
    // Draft entries are NOT in the query — they are filtered at DB level
    expect(call.where).not.toHaveProperty('isVisibleToParent', false);
  });

  it('200 response shape excludes teacherId UUID — only firstName/lastName exposed', async () => {
    mockChildFindOne.mockResolvedValue({ id: 'child-1', parentId: 'parent-1' });
    mockJournalFindAll.mockResolvedValue([
      { id: 'jrn-1', date: TODAY, content: 'Note text', author: { firstName: 'Ahmad', lastName: 'N' } },
    ]);
    const req = { user: { id: 'parent-1', role: 'parent' }, params: { id: 'child-1' } };
    const res = mkRes();
    await getChildJournal(req, res);
    const responseData = res.json.mock.calls[0][0].data;
    expect(responseData).toHaveLength(1);
    expect(responseData[0]).toHaveProperty('teacherFirstName', 'Ahmad');
    expect(responseData[0]).toHaveProperty('teacherLastName', 'N');
    expect(responseData[0]).not.toHaveProperty('teacherId');
  });

  it('500 when DB throws', async () => {
    mockChildFindOne.mockRejectedValue(new Error('DB down'));
    const req = { user: { id: 'parent-1', role: 'parent' }, params: { id: 'child-1' } };
    const res = mkRes();
    await getChildJournal(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});

// ─── ChildJournalEntry afterDestroy hook ──────────────────────────────────────

describe('ChildJournalEntry afterDestroy hook', () => {
  beforeEach(() => jest.clearAllMocks());

  it('hook is registered on ChildJournalEntry', () => {
    expect(capturedJournalHook).not.toBeNull();
    expect(typeof capturedJournalHook).toBe('function');
  });

  it('writes audit_log with action=delete and meta.isVisibleToParent', async () => {
    mockAuditCreate.mockResolvedValue({ id: 20 });
    const instance = { id: 'jrn-uuid', schoolId: 'school-uuid', childId: 'child-uuid', isVisibleToParent: true };
    const options = { actorId: 'teacher-uuid', actorRole: 'teacher', reason: 'error correction' };
    await capturedJournalHook(instance, options);
    expect(mockAuditCreate).toHaveBeenCalledTimes(1);
    const entry = mockAuditCreate.mock.calls[0][0];
    expect(entry.action).toBe('delete');
    expect(entry.entity).toBe('child_journal_entries');
    expect(entry.entityId).toBe('jrn-uuid');
    expect(entry.meta).toMatchObject({ childId: 'child-uuid', isVisibleToParent: true });
  });
});
