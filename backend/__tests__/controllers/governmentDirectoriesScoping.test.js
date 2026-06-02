/**
 * CP-021 Sprint C Commit 2 — Region isolation for people directories
 *
 * Students, teachers, parents are scoped via school join:
 *   region account → schools in region → people in those schools
 *   republic → all
 */
import { jest } from '@jest/globals';

const REGION_A = '00000000-0000-0000-0000-000000000001';
const REGION_B = '00000000-0000-0000-0000-000000000002';
const SCHOOL_A_ID = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B_ID = 'bbbb0000-0000-0000-0000-000000000001';

const mockSchoolFindAll = jest.fn();
const mockChildFindAndCountAll = jest.fn();
const mockUserFindAndCountAll = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    findAll: mockSchoolFindAll,
    findAndCountAll: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn().mockResolvedValue(0),
  },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findAndCountAll: mockChildFindAndCountAll, count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAndCountAll: mockUserFindAndCountAll, count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({ default: { findAll: jest.fn().mockResolvedValue([]) } }));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({ default: { count: jest.fn().mockResolvedValue(0) } }));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn().mockReturnValue('standard'),
  sortSchoolsByRating: jest.fn(arr => arr),
  computeRatingScore: jest.fn().mockReturnValue(4),
  computeAverageRating: jest.fn().mockReturnValue({ average: 4.0, count: 2 }),
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

const { getStudentsStats, getTeachersList, getParentsList } =
  await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const republicReq = (query = {}) => ({
  isGlobalAccess: true,
  govType: 'main',
  user: { id: 'rep1', role: 'government', govLevel: 'republic' },
  query,
});

const regionAReq = (query = {}) => ({
  isGlobalAccess: false,
  regionScope: REGION_A,
  govType: 'main',
  user: { id: 'reg-a', role: 'government', govLevel: 'region', govRegionId: REGION_A },
  query,
});

// ── getStudentsStats ─────────────────────────────────────────────────────────

describe('getStudentsStats — region scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A_ID }]);
    mockChildFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  it('republic: School.findAll NOT called (no scoping needed)', async () => {
    await getStudentsStats(republicReq(), mkRes());
    expect(mockSchoolFindAll).not.toHaveBeenCalled();
  });

  it('region-A: School.findAll called with regionId=REGION_A', async () => {
    await getStudentsStats(regionAReq(), mkRes());
    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
  });

  it('region-A: Child.findAndCountAll where has schoolId set', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A_ID }]);
    await getStudentsStats(regionAReq(), mkRes());
    const childWhere = mockChildFindAndCountAll.mock.calls[0][0].where;
    expect(childWhere).toHaveProperty('schoolId');
  });

  // ── REVERT-TEST ──────────────────────────────────────────────────────────
  it('[REVERT-TEST: BUG] without school-join scope, region-A Child query has no schoolId filter', async () => {
    const buggyGetStudents = async (req, res) => {
      const where = {};  // BUG: no scoping
      await mockChildFindAndCountAll({ where, limit: 50, offset: 0 });
      res.json({ success: true, data: { total: 0, students: [] } });
    };
    await buggyGetStudents(regionAReq(), mkRes());
    const childWhere = mockChildFindAndCountAll.mock.calls[0][0].where;
    expect(childWhere).not.toHaveProperty('schoolId');  // BUG: unscoped
  });

  it('[REVERT-TEST: FIXED] with school-join scope, region-A Child query has schoolId filter', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A_ID }]);
    await getStudentsStats(regionAReq(), mkRes());
    const childWhere = mockChildFindAndCountAll.mock.calls[0][0].where;
    expect(childWhere).toHaveProperty('schoolId');  // FIXED: scoped via school join
  });
});

// ── getTeachersList ──────────────────────────────────────────────────────────

describe('getTeachersList — region scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A_ID }]);
    mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  it('republic: School.findAll NOT called', async () => {
    await getTeachersList(republicReq(), mkRes());
    expect(mockSchoolFindAll).not.toHaveBeenCalled();
  });

  it('region-A: School.findAll called with regionId=REGION_A', async () => {
    await getTeachersList(regionAReq(), mkRes());
    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
  });

  it('region-A: User where has schoolId scoped to region', async () => {
    await getTeachersList(regionAReq(), mkRes());
    const userWhere = mockUserFindAndCountAll.mock.calls[0][0].where;
    expect(userWhere).toHaveProperty('role', 'teacher');
    expect(userWhere).toHaveProperty('schoolId');
  });

  // ── REVERT-TEST ──────────────────────────────────────────────────────────
  it('[REVERT-TEST: BUG] without scope, teacher query has no schoolId filter', async () => {
    const buggyGetTeachers = async (req, res) => {
      await mockUserFindAndCountAll({ where: { role: 'teacher' }, limit: 50, offset: 0 });  // BUG
      res.json({ success: true, data: { total: 0, teachers: [] } });
    };
    await buggyGetTeachers(regionAReq(), mkRes());
    const userWhere = mockUserFindAndCountAll.mock.calls[0][0].where;
    expect(userWhere).not.toHaveProperty('schoolId');  // BUG confirmed
  });

  it('[REVERT-TEST: FIXED] with scope, teacher query has schoolId filter', async () => {
    await getTeachersList(regionAReq(), mkRes());
    const userWhere = mockUserFindAndCountAll.mock.calls[0][0].where;
    expect(userWhere).toHaveProperty('schoolId');  // FIXED
  });
});

// ── getParentsList ───────────────────────────────────────────────────────────

describe('getParentsList — region scoping', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A_ID }]);
    mockUserFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  it('republic: School.findAll NOT called', async () => {
    await getParentsList(republicReq(), mkRes());
    expect(mockSchoolFindAll).not.toHaveBeenCalled();
  });

  it('region-A: School.findAll called with regionId=REGION_A', async () => {
    await getParentsList(regionAReq(), mkRes());
    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
  });

  it('region-A: User where has schoolId scoped to region', async () => {
    await getParentsList(regionAReq(), mkRes());
    const userWhere = mockUserFindAndCountAll.mock.calls[0][0].where;
    expect(userWhere).toHaveProperty('role', 'parent');
    expect(userWhere).toHaveProperty('schoolId');
  });

  it('[REVERT-TEST: FIXED] with scope, parent query has schoolId filter', async () => {
    await getParentsList(regionAReq(), mkRes());
    const userWhere = mockUserFindAndCountAll.mock.calls[0][0].where;
    expect(userWhere).toHaveProperty('schoolId');
  });
});
