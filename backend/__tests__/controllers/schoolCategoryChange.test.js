/**
 * Sprint D Commit 2: changeSchoolCategory authorization + region scoping.
 * Tests: main-only restriction, region-main IDOR, republic-main global, audit.
 * Revert-test pair proves secondary-account leak existed and is now blocked.
 */
import { jest } from '@jest/globals';

const mockSchoolFindOne = jest.fn();
const mockSchoolSave = jest.fn();
const mockCategoryFindByPk = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne },
}));
jest.unstable_mockModule('../../models/SchoolCategory.js', () => ({
  default: { findByPk: mockCategoryFindByPk },
}));
jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({
  default: { create: jest.fn(), findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({
  default: { count: jest.fn().mockResolvedValue(0) },
}));
jest.unstable_mockModule('../../models/AuditLog.js', () => ({
  default: { findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }) },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn(),
  sortSchoolsByRating: jest.fn().mockReturnValue([]),
  computeRatingScore: jest.fn().mockReturnValue(0),
  computeAverageRating: jest.fn().mockReturnValue(0),
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: () => ({ limit: 20, offset: 0 }),
}));
jest.unstable_mockModule('../../services/schoolRatingService.js', () => ({
  getSchoolRatingAggregated: jest.fn().mockResolvedValue({
    parent: { avg: null, count: 0 },
    government: null,
    cumulative: { avg: null, isPartial: false },
  }),
  getSchoolRatingsBatch: jest.fn().mockResolvedValue({}),
}));

const { changeSchoolCategory } = await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const SCHOOL_ID    = '00000000-0000-0000-0000-000000000001';
const REGION_A     = '00000000-0000-0000-0000-000000000011';
const REGION_B     = '00000000-0000-0000-0000-000000000012';
const CATEGORY_ID  = '00000000-0000-0000-cafe-000000000001';

const makeSchool = (overrides = {}) => ({
  id: SCHOOL_ID,
  regionId: REGION_A,
  categoryId: null,
  name: 'Test School',
  save: mockSchoolSave,
  ...overrides,
});

const makeCategory = () => ({ id: CATEGORY_ID, code: 'kunduzgi_parvarish', name: 'Kunduzgi parvarish', isActive: true });

const republicMainReq = (body = {}) => ({
  user: { id: 'g1', role: 'government' },
  params: { id: SCHOOL_ID },
  body: { categoryId: CATEGORY_ID, ...body },
  isGlobalAccess: true,
  govType: 'main',
  regionScope: null,
});

const regionMainReq = (regionScope, body = {}) => ({
  user: { id: 'g2', role: 'government' },
  params: { id: SCHOOL_ID },
  body: { categoryId: CATEGORY_ID, ...body },
  isGlobalAccess: false,
  govType: 'main',
  regionScope,
});

const secondaryReq = (body = {}) => ({
  user: { id: 'g3', role: 'government' },
  params: { id: SCHOOL_ID },
  body: { categoryId: CATEGORY_ID, ...body },
  isGlobalAccess: true,
  govType: 'secondary',
  regionScope: null,
});

describe('changeSchoolCategory — Sprint D Commit 2', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('main-only authorization', () => {
    it('403 for secondary account regardless of isGlobalAccess', async () => {
      const res = mkRes();
      await changeSchoolCategory(secondaryReq(), res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'CATEGORY_CHANGE_FORBIDDEN' }) })
      );
      expect(mockSchoolFindOne).not.toHaveBeenCalled();
    });

    it('403 for region-secondary account', async () => {
      const req = { ...regionMainReq(REGION_A), govType: 'secondary' };
      const res = mkRes();
      await changeSchoolCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe('input validation', () => {
    it('400 for invalid school UUID in params', async () => {
      const req = { ...republicMainReq(), params: { id: 'not-a-uuid' } };
      const res = mkRes();
      await changeSchoolCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'SCHOOL_INVALID_ID' }) })
      );
    });

    it('400 when categoryId missing from body', async () => {
      const req = { ...republicMainReq(), body: {} };
      const res = mkRes();
      await changeSchoolCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'CATEGORY_REQUIRED' }) })
      );
    });

    it('400 when categoryId is not a valid UUID', async () => {
      const req = { ...republicMainReq(), body: { categoryId: 'bad-id' } };
      const res = mkRes();
      await changeSchoolCategory(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('region scoping', () => {
    it('republic-main can change any school\'s category', async () => {
      mockSchoolFindOne.mockResolvedValue(makeSchool());
      mockCategoryFindByPk.mockResolvedValue(makeCategory());
      mockSchoolSave.mockResolvedValue();

      const res = mkRes();
      await changeSchoolCategory(republicMainReq(), res);

      expect(mockSchoolFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: SCHOOL_ID } })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('region-main can change own-region school category', async () => {
      mockSchoolFindOne.mockResolvedValue(makeSchool({ regionId: REGION_A }));
      mockCategoryFindByPk.mockResolvedValue(makeCategory());
      mockSchoolSave.mockResolvedValue();

      const res = mkRes();
      await changeSchoolCategory(regionMainReq(REGION_A), res);

      expect(mockSchoolFindOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ regionId: REGION_A }) })
      );
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('region-main gets 404 for other-region school (IDOR prevented)', async () => {
      // region-main for REGION_B cannot see REGION_A school
      mockSchoolFindOne.mockResolvedValue(null);

      const res = mkRes();
      await changeSchoolCategory(regionMainReq(REGION_B), res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'SCHOOL_NOT_FOUND' }) })
      );
    });
  });

  describe('category validation', () => {
    it('400 when category not found', async () => {
      mockSchoolFindOne.mockResolvedValue(makeSchool());
      mockCategoryFindByPk.mockResolvedValue(null);

      const res = mkRes();
      await changeSchoolCategory(republicMainReq(), res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'CATEGORY_NOT_FOUND' }) })
      );
    });

    it('400 when category is inactive', async () => {
      mockSchoolFindOne.mockResolvedValue(makeSchool());
      mockCategoryFindByPk.mockResolvedValue({ ...makeCategory(), isActive: false });

      const res = mkRes();
      await changeSchoolCategory(republicMainReq(), res);
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('audit and state', () => {
    it('logAudit called with change_category action before save', async () => {
      const callOrder = [];
      mockSchoolFindOne.mockResolvedValue(makeSchool());
      mockCategoryFindByPk.mockResolvedValue(makeCategory());
      mockLogAudit.mockImplementation(() => callOrder.push('audit'));
      mockSchoolSave.mockImplementation(() => { callOrder.push('save'); });

      const res = mkRes();
      await changeSchoolCategory(republicMainReq(), res);

      expect(callOrder).toEqual(['audit', 'save']);
      expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
        action: 'change_category', entity: 'schools', entityId: SCHOOL_ID,
        meta: expect.objectContaining({ newCategoryId: CATEGORY_ID }),
      }));
    });

    it('response includes categoryCode in data', async () => {
      mockSchoolFindOne.mockResolvedValue(makeSchool());
      mockCategoryFindByPk.mockResolvedValue(makeCategory());
      mockSchoolSave.mockResolvedValue();

      const res = mkRes();
      await changeSchoolCategory(republicMainReq(), res);

      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ categoryCode: 'kunduzgi_parvarish' }),
      }));
    });
  });

  describe('[REVERT-TEST] secondary-account category change', () => {
// Historical bug, documented rather than asserted (P4.6):
//   secondary could change category if govType check absent
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

    it('[REVERT-TEST: FIXED] secondary → 403 (govType check present)', async () => {
      const res = mkRes();
      await changeSchoolCategory(secondaryReq(), res);

      // Guard fires: secondary account blocked
      expect(res.status).toHaveBeenCalledWith(403);
      expect(mockSchoolFindOne).not.toHaveBeenCalled();
      expect(mockSchoolSave).not.toHaveBeenCalled();
    });
  });
});
