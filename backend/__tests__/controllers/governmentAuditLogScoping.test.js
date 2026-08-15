/**
 * Audit log region-scoping tests (CP-021 Sprint C, Commit 3)
 *
 * The hardest scoping case: audit_log has no regionId column.
 * For region accounts, only school lifecycle events where entityId resolves to a
 * school in their region are returned. Non-school events (admin_registrations,
 * admins, government_users) are excluded — those are republic-level governance.
 *
 * Revert-test pair (mandatory per sprint prompt):
 *   [REVERT-TEST: BUG]   without the region filter, region-A account sees region-B events
 *   [REVERT-TEST: FIXED] with the filter, only region-A school IDs are passed to the query
 */
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const REGION_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const REGION_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const SCHOOL_A1 = 'sch-a-0001-0000-0000-000000000001';
const SCHOOL_A2 = 'sch-a-0002-0000-0000-000000000002';
const SCHOOL_B1 = 'sch-b-0001-0000-0000-000000000003';

const mockAuditFindAndCountAll = jest.fn();
const mockSchoolFindAll = jest.fn();

jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: {
    findAndCountAll: mockAuditFindAndCountAll,
    belongsTo: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    findOne: jest.fn(),
    findByPk: jest.fn(),
    findAll: mockSchoolFindAll,
  },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0), findAll: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    count: jest.fn().mockResolvedValue(0),
    findAll: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    hasMany: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({
  default: { create: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn(),
  sortSchoolsByRating: jest.fn(),
  computeRatingScore: jest.fn(),
  computeAverageRating: jest.fn().mockReturnValue({ average: 0, count: 0 }),
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));
jest.unstable_mockModule('../../services/schoolRatingService.js', () => ({
  getSchoolRatingAggregated: jest.fn().mockResolvedValue({
    parent: { avg: null, count: 0 },
    government: null,
    cumulative: { avg: null, isPartial: false },
  }),
  getSchoolRatingsBatch: jest.fn().mockResolvedValue({}),
}));

const { getAuditLog } = await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const republicReq = (query = {}) => ({
  user: { id: 'rep1', role: 'government', govLevel: 'republic' },
  isGlobalAccess: true,
  govType: 'main',
  query,
});

const regionAReq = (query = {}) => ({
  user: { id: 'reg-a', role: 'government', govLevel: 'region', govRegionId: REGION_A },
  isGlobalAccess: false,
  regionScope: REGION_A,
  govType: 'main',
  query,
});

const makeEntry = (action, entity, entityId = null) => ({
  id: 1, action, entity, entityId,
  actorId: 'g1', actorRole: 'government',
  meta: null,
  occurredAt: new Date('2026-05-21T10:00:00Z'),
  toJSON() { return { id: this.id, action, entity, entityId }; },
});

describe('getAuditLog — region scoping (CP-021 Sprint C)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── Republic sees all allowlisted events ─────────────────────────────────

  it('republic account: School.findAll not called, no entityId filter injected', async () => {
    mockAuditFindAndCountAll.mockResolvedValue({
      count: 2,
      rows: [
        makeEntry('archive', 'schools', SCHOOL_A1),
        makeEntry('create', 'government_users', 'some-gov-id'),
      ],
    });

    const res = mkRes();
    await getAuditLog(republicReq(), res);

    expect(mockSchoolFindAll).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    // No entityId restriction injected for republic
    expect(callArg.where.entityId).toBeUndefined();
    expect(callArg.where.entity).toBeUndefined();
  });

  // ── Region account: only school events for own region ────────────────────

  it('region account: School.findAll called with own regionId', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockAuditFindAndCountAll.mockResolvedValue({ count: 1, rows: [makeEntry('archive', 'schools', SCHOOL_A1)] });

    const res = mkRes();
    await getAuditLog(regionAReq(), res);

    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: entity="schools" filter injected into DB query', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockAuditFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getAuditLog(regionAReq(), res);

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    expect(callArg.where.entity).toBe('schools');
  });

  it('region account: entityId IN filter contains only region-A school IDs', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockAuditFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getAuditLog(regionAReq(), res);

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    const entityIdFilter = callArg.where.entityId[Op.in];
    expect(entityIdFilter).toEqual(expect.arrayContaining([SCHOOL_A1, SCHOOL_A2]));
    expect(entityIdFilter).not.toContain(SCHOOL_B1);
  });

  it('region account with no schools: returns empty result (no panic on empty IN list)', async () => {
    mockSchoolFindAll.mockResolvedValue([]);
    mockAuditFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getAuditLog(regionAReq(), res);

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    expect(callArg.where.entityId[Op.in]).toEqual([]);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region account: non-school events do NOT appear (entity="schools" gate excludes them)', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }]);
    // DB returns a schools event for region-A (correct) — non-school events
    // would not be returned because entity='schools' filter excludes them
    mockAuditFindAndCountAll.mockResolvedValue({
      count: 1,
      rows: [makeEntry('archive', 'schools', SCHOOL_A1)],
    });

    const res = mkRes();
    await getAuditLog(regionAReq(), res);

    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    // The entity='schools' constraint prevents government_users / admin_registrations / admins
    expect(callArg.where.entity).toBe('schools');
    const entries = res.json.mock.calls[0][0].data.entries;
    const hasNonSchoolEvent = entries.some(e => e.entity !== 'schools');
    expect(hasNonSchoolEvent).toBe(false);
  });

  // ── REVERT-TEST: audit log region isolation ───────────────────────────────
  //
  // BUG: remove the !req.isGlobalAccess scoping block from getAuditLog.
  //   Without it, a region-A account can see region-B school events because
  //   no entityId IN filter is applied. The DB query lacks entity and entityId
  //   constraints.
  //
  // With fix: School.findAll is called with regionId=REGION_A, and the DB
  //   query has entity='schools' and entityId IN (region-A school IDs only).

// Historical bug, documented rather than asserted (P4.6):
//   without region filter, region-A account query has no entityId restriction
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with region filter, region-A query has entity=schools and entityId IN (region-A schools)', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A1 }, { id: SCHOOL_A2 }]);
    mockAuditFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });

    const res = mkRes();
    await getAuditLog(regionAReq(), res);

    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
    const callArg = mockAuditFindAndCountAll.mock.calls[0][0];
    expect(callArg.where.entity).toBe('schools');
    const ids = callArg.where.entityId[Op.in];
    expect(ids).toContain(SCHOOL_A1);
    expect(ids).toContain(SCHOOL_A2);
    expect(ids).not.toContain(SCHOOL_B1);
  });
});
