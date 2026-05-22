/**
 * Admin soft-delete list tests (Admin S7 Phase 1, Commit 5)
 *
 * include_deleted=true returns only soft-deleted own-school records.
 * School B's deleted records are not accessible to admin A.
 *
 * Covers:
 *   1. include_deleted=true returns soft-deleted own-school parents
 *   2. [REVERT-TEST isolation] soft-deleted records from school B not returned
 *   3. Without include_deleted, behavior unchanged (soft-deleted don't appear)
 *   4. Combined: normal + deleted lists give full picture
 */
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const ADMIN_ID = 'admin-00000000-0000-0000-0000-000000000001';
const RECEPTION_ID = 'recep-0000-0000-0000-0000-000000000001';
const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';

const mockUserFindAll = jest.fn();
const mockDocFindAll = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: mockUserFindAll },
}));

jest.unstable_mockModule('../../models/Document.js', () => ({
  default: { findAll: mockDocFindAll },
}));

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findByPk: jest.fn().mockResolvedValue(null) },
}));

jest.unstable_mockModule('../../models/ParentActivity.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.unstable_mockModule('../../models/ParentMeal.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.unstable_mockModule('../../models/ParentMedia.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));

jest.unstable_mockModule('../../middleware/auth.js', () => ({
  invalidateUserCache: jest.fn(),
  authenticate: jest.fn(),
  requireAdmin: jest.fn(),
}));

const { getParents } = await import('../../controllers/admin/adminParentController.js');
const { getReceptions } = await import('../../controllers/admin/adminReceptionController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminReq = (query = {}) => ({
  user: { id: ADMIN_ID, role: 'admin', schoolId: SCHOOL_A },
  query,
});

const makeDeletedParent = (id, schoolId = SCHOOL_A) => ({
  id,
  role: 'parent',
  email: `parent-${id}@school.com`,
  schoolId,
  createdBy: RECEPTION_ID,
  deletedAt: new Date('2026-05-01'),
});

describe('getParents — include_deleted support', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── TEST 1: include_deleted=true returns soft-deleted parents ──────────────────
  it('include_deleted=true — queries with paranoid:false and deletedAt not null', async () => {
    // First findAll: admin's receptions
    mockUserFindAll
      .mockResolvedValueOnce([{ id: RECEPTION_ID }])  // receptions
      .mockResolvedValueOnce([makeDeletedParent('p1')]);  // deleted parents

    const res = mkRes();
    await getParents(adminReq({ include_deleted: 'true' }), res);

    const parentsCallArg = mockUserFindAll.mock.calls[1][0];
    // Must use paranoid: false to include soft-deleted rows
    expect(parentsCallArg.paranoid).toBe(false);
    // Must have deletedAt filter to return ONLY deleted rows
    expect(parentsCallArg.where.deletedAt).toBeDefined();
    expect(parentsCallArg.where.deletedAt[Op.ne]).toBeNull();

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.arrayContaining([expect.objectContaining({ id: 'p1' })]),
    }));
  });

  // ── TEST 2: REVERT-TEST — school B deleted records not accessible ──────────────
  //
  // SECURITY: the school isolation comes from the reception chain.
  //   createdBy: { [Op.in]: receptionIds } ensures only parents created by
  //   admin A's receptions are returned — regardless of include_deleted flag.
  //
  // BUG (hypothetical): if createdBy restriction were removed, admin A could see
  //   soft-deleted parents from school B.
  //
  // FIXED: createdBy filter is present in both normal and include_deleted paths.

  it('[REVERT-TEST isolation] include_deleted=true still scoped to own receptions', async () => {
    // Admin A has reception RECEPTION_ID
    mockUserFindAll
      .mockResolvedValueOnce([{ id: RECEPTION_ID }])
      .mockResolvedValueOnce([makeDeletedParent('p1', SCHOOL_A)]);

    const res = mkRes();
    await getParents(adminReq({ include_deleted: 'true' }), res);

    // The query MUST have createdBy: { [Op.in]: [RECEPTION_ID] }
    const parentsCallArg = mockUserFindAll.mock.calls[1][0];
    expect(parentsCallArg.where.createdBy[Op.in]).toEqual([RECEPTION_ID]);

    // SCHOOL_B parents created by a different reception would not be in this list
    // because RECEPTION_ID is from SCHOOL_A only.
    // The createdBy filter is the isolation boundary.
    expect(parentsCallArg.where.createdBy[Op.in]).not.toContain('reception-school-b');
  });

  // ── TEST 3: without include_deleted, behavior unchanged ───────────────────────
  it('without include_deleted, no paranoid:false and no deletedAt filter', async () => {
    mockUserFindAll
      .mockResolvedValueOnce([{ id: RECEPTION_ID }])
      .mockResolvedValueOnce([]);

    const res = mkRes();
    await getParents(adminReq({}), res);

    const parentsCallArg = mockUserFindAll.mock.calls[1][0];
    // Normal call: paranoid defaults to true (no override)
    expect(parentsCallArg.paranoid).toBeUndefined();
    // No deletedAt filter (soft-deleted rows are naturally excluded)
    expect(parentsCallArg.where.deletedAt).toBeUndefined();
  });

  // ── TEST 4: combined lists ─────────────────────────────────────────────────────
  it('normal list and deleted list together give full picture', async () => {
    const activeParent = { id: 'p-active', role: 'parent', deletedAt: null };
    const deletedParent = { id: 'p-deleted', role: 'parent', deletedAt: new Date() };

    // Call 1: normal list (no include_deleted)
    mockUserFindAll
      .mockResolvedValueOnce([{ id: RECEPTION_ID }])
      .mockResolvedValueOnce([activeParent]);

    const res1 = mkRes();
    await getParents(adminReq({}), res1);
    const normalData = res1.json.mock.calls[0][0].data;
    expect(normalData).toHaveLength(1);
    expect(normalData[0].id).toBe('p-active');

    jest.clearAllMocks();

    // Call 2: deleted list (include_deleted=true)
    mockUserFindAll
      .mockResolvedValueOnce([{ id: RECEPTION_ID }])
      .mockResolvedValueOnce([deletedParent]);

    const res2 = mkRes();
    await getParents(adminReq({ include_deleted: 'true' }), res2);
    const deletedData = res2.json.mock.calls[0][0].data;
    expect(deletedData).toHaveLength(1);
    expect(deletedData[0].id).toBe('p-deleted');

    // Together: both IDs form the complete picture
    const allIds = new Set([...normalData.map(p => p.id), ...deletedData.map(p => p.id)]);
    expect(allIds.has('p-active')).toBe(true);
    expect(allIds.has('p-deleted')).toBe(true);
  });
});

describe('getReceptions — include_deleted support', () => {
  beforeEach(() => jest.clearAllMocks());

  it('include_deleted=true — queries with paranoid:false and deletedAt not null', async () => {
    mockUserFindAll.mockResolvedValue([{
      id: 'rec-deleted',
      role: 'reception',
      email: 'rec@deleted.com',
      deletedAt: new Date('2026-04-01'),
      createdBy: ADMIN_ID,
    }]);

    const res = mkRes();
    await getReceptions(adminReq({ include_deleted: 'true' }), res);

    const callArg = mockUserFindAll.mock.calls[0][0];
    expect(callArg.paranoid).toBe(false);
    expect(callArg.where.deletedAt[Op.ne]).toBeNull();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('without include_deleted, no paranoid:false override', async () => {
    mockUserFindAll.mockResolvedValue([]);

    const res = mkRes();
    await getReceptions(adminReq({}), res);

    const callArg = mockUserFindAll.mock.calls[0][0];
    expect(callArg.paranoid).toBeUndefined();
    expect(callArg.where.deletedAt).toBeUndefined();
  });
});
