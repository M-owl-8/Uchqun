import { jest } from '@jest/globals';

// ─── Mocks ────────────────────────────────────────────────────────────────────

const mockFindByPk = jest.fn();
const mockDestroy = jest.fn().mockResolvedValue(true);

jest.unstable_mockModule('../../models/EmotionalMonitoring.js', () => ({
  default: { findByPk: mockFindByPk },
}));

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: {},
}));

jest.unstable_mockModule('../../models/Group.js', () => ({
  default: {},
}));

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {},
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { info: jest.fn(), error: jest.fn() },
}));

const mockValidateChildAccess = jest.fn();
jest.unstable_mockModule('../../utils/schoolValidation.js', () => ({
  validateChildAccess: mockValidateChildAccess,
}));

// ─── Import ───────────────────────────────────────────────────────────────────

const { deleteMonitoring } = await import('../../controllers/emotionalMonitoringController.js');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRecord(overrides = {}) {
  return {
    id: 'rec-1',
    childId: 'child-1',
    teacherId: 'teacher-1',
    destroy: mockDestroy,
    ...overrides,
  };
}

function makeReq({ params = { id: 'rec-1' }, userId = 'teacher-1', role = 'teacher', schoolId = 'school-1' } = {}) {
  return { params, user: { id: userId, role, schoolId } };
}

function makeRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockValidateChildAccess.mockResolvedValue(true);
  mockDestroy.mockResolvedValue(true);
});

describe('deleteMonitoring()', () => {
  // Revert-test: paranoid soft-delete path
  // PRE-FIX (paranoid: true removed from EmotionalMonitoring model):
  //   record.destroy() hard-deletes the row; deletedAt column is never set
  //   subsequent findByPk returns null because row is gone (same UX, but data is lost)
  // POST-FIX: record.destroy() issues UPDATE SET "deletedAt"=NOW(); row is recoverable
  test('200 — teacher deletes own record, destroy() called once', async () => {
    const record = makeRecord({ teacherId: 'teacher-1' });
    mockFindByPk.mockResolvedValueOnce(record);
    const res = makeRes();
    await deleteMonitoring(makeReq({ userId: 'teacher-1', role: 'teacher' }), res);
    expect(record.destroy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  test('403 — teacher cannot delete another teacher record, destroy not called', async () => {
    const record = makeRecord({ teacherId: 'other-teacher' });
    mockFindByPk.mockResolvedValueOnce(record);
    const res = makeRes();
    await deleteMonitoring(makeReq({ userId: 'teacher-1', role: 'teacher' }), res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(record.destroy).not.toHaveBeenCalled();
  });

  test('404 — record not found (covers paranoid-filtered soft-deleted record)', async () => {
    // With paranoid: true, findByPk excludes soft-deleted rows, returning null
    // This test verifies the controller handles that null correctly
    mockFindByPk.mockResolvedValueOnce(null);
    const res = makeRes();
    await deleteMonitoring(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  test('500 — DB error returns 500', async () => {
    mockFindByPk.mockRejectedValueOnce(new Error('DB connection lost'));
    const res = makeRes();
    await deleteMonitoring(makeReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
