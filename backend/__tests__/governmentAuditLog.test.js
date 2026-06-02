/**
 * BC-02: GET /government/audit-log
 *
 * CRITICAL test: the allowlist revert-test proves the privacy boundary is real
 * and server-side — not frontend-hidden. Temporarily removing the allowlist
 * must cause out-of-scope events (bulk_import, parent suspension, restore) to
 * appear in the response, causing this test to fail. With the allowlist in
 * place, they must be absent.
 */
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const mockAuditFindAndCountAll = jest.fn();
const mockUserFindByPk = jest.fn();

jest.unstable_mockModule('../models/AuditLog.js', () => ({
  default: {
    findAndCountAll: mockAuditFindAndCountAll,
    belongsTo: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/School.js', () => ({
  default: { findOne: jest.fn(), findByPk: jest.fn(), findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0), findAll: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: {
    count: jest.fn().mockResolvedValue(0),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn(),
    findByPk: mockUserFindByPk,
    hasMany: jest.fn(),
  },
}));
jest.unstable_mockModule('../models/SchoolRating.js', () => ({ default: { findAll: jest.fn().mockResolvedValue([]) } }));
jest.unstable_mockModule('../models/GovernmentStats.js', () => ({ default: { create: jest.fn(), findAndCountAll: jest.fn() } }));
jest.unstable_mockModule('../models/AIWarning.js', () => ({ default: { count: jest.fn().mockResolvedValue(0) } }));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));
jest.unstable_mockModule('../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn(),
  sortSchoolsByRating: jest.fn(),
  computeRatingScore: jest.fn(),
  computeAverageRating: jest.fn().mockReturnValue({ average: 0, count: 0 }),
}));
jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));
jest.unstable_mockModule('../services/schoolRatingService.js', () => ({
  getSchoolRatingAggregated: jest.fn().mockResolvedValue({
    parent: { avg: null, count: 0 },
    government: null,
    cumulative: { avg: null, isPartial: false },
  }),
  getSchoolRatingsBatch: jest.fn().mockResolvedValue({}),
}));

const { getAuditLog } = await import('../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const govReq = (query = {}) => ({
  user: { id: 'g1', role: 'government' },
  isGlobalAccess: true,
  govType: 'main',
  query,
});

const makeEntry = (action, entity) => ({
  id: 1, action, entity, actorId: 'g1', actorRole: 'government',
  entityId: null, schoolId: null, meta: null,
  occurredAt: new Date('2026-05-21T10:00:00Z'),
  toJSON() { return { id: this.id, action, entity }; },
});

describe('governmentController.getAuditLog — BC-02', () => {
  beforeEach(() => jest.clearAllMocks());

  it('PRIVACY BOUNDARY: only allowlisted events returned — out-of-scope events absent', async () => {
    // Simulate DB returning a mix: one in-scope + three out-of-scope events.
    // The allowlist WHERE clause means the DB should only return in-scope entries.
    // We test that the mock is called with a where clause that excludes out-of-scope events.
    const inScope = makeEntry('archive', 'schools');
    mockAuditFindAndCountAll.mockResolvedValue({ count: 1, rows: [inScope] });

    const res = mkRes();
    await getAuditLog(govReq(), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const { entries } = res.json.mock.calls[0][0].data;
    expect(entries).toHaveLength(1);
    expect(entries[0].action).toBe('archive');

    // Verify the where clause passed to DB contains the Op.or allowlist
    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    expect(callArg.where).toBeTruthy();
    const orClause = callArg.where[Op.or];
    expect(Array.isArray(orClause)).toBe(true);
    expect(orClause.length).toBe(12); // 12 allowlisted (action, entity) pairs (added change_category:schools in Sprint D)
    // restore events are NOT in the allowlist
    const hasRestoreEntry = orClause.some(pair =>
      pair.entity === 'children' || pair.entity === 'users' ||
      pair.entity === 'child_observations' || pair.entity === 'child_attendance'
    );
    expect(hasRestoreEntry).toBe(false);
  });

  it('returns paginated entries with total and totalPages', async () => {
    mockAuditFindAndCountAll.mockResolvedValue({
      count: 45,
      rows: Array.from({ length: 20 }, (_, i) => makeEntry('archive', 'schools')),
    });

    const res = mkRes();
    await getAuditLog(govReq({ page: '2', limit: '20' }), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    const data = res.json.mock.calls[0][0].data;
    expect(data.total).toBe(45);
    expect(data.page).toBe(2);
    expect(data.limit).toBe(20);
    expect(data.totalPages).toBe(3);

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    expect(callArg.offset).toBe(20);
    expect(callArg.limit).toBe(20);
  });

  it('400 for out-of-allowlist action filter', async () => {
    const res = mkRes();
    await getAuditLog(govReq({ action: 'bulk_import' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'AUDIT_LOG_INVALID_FILTER' }),
    }));
    expect(mockAuditFindAndCountAll).not.toHaveBeenCalled();
  });

  it('400 for out-of-allowlist entity filter', async () => {
    const res = mkRes();
    await getAuditLog(govReq({ entity: 'children' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'AUDIT_LOG_INVALID_FILTER' }),
    }));
    expect(mockAuditFindAndCountAll).not.toHaveBeenCalled();
  });

  it('400 for invalid startDate', async () => {
    const res = mkRes();
    await getAuditLog(govReq({ startDate: 'not-a-date' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(mockAuditFindAndCountAll).not.toHaveBeenCalled();
  });

  it('passes date filters through to DB query', async () => {
    mockAuditFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
    const res = mkRes();
    await getAuditLog(govReq({ startDate: '2026-05-01', endDate: '2026-05-31' }), res);

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    expect(callArg.where.occurredAt).toBeDefined();
  });

  it('500 on unexpected DB error', async () => {
    mockAuditFindAndCountAll.mockRejectedValue(new Error('db down'));
    const res = mkRes();
    await getAuditLog(govReq(), res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'AUDIT_LOG_FETCH_FAILED' }),
    }));
  });

  it('entity=children rejected — restore/children is excluded from scope', async () => {
    const res = mkRes();
    await getAuditLog(govReq({ entity: 'children' }), res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('AUDIT_LOG_INVALID_FILTER');
  });
});
