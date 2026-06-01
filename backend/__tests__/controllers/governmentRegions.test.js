import { jest } from '@jest/globals';

const REGION_A = '00000000-0000-0000-0000-000000000001';
const REGION_B = '00000000-0000-0000-0000-000000000002';

const mockRegionFindAll = jest.fn();

jest.unstable_mockModule('../../models/GovernmentStats.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/Region.js', () => ({
  default: { findAll: mockRegionFindAll },
}));
jest.unstable_mockModule('../../models/School.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/SchoolCategory.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/SchoolRating.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/User.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/Child.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/AIWarning.js', () => ({ default: {} }));
jest.unstable_mockModule('../../models/AuditLog.js', () => ({ default: {} }));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../utils/governmentLevel.js', () => ({
  getGovernmentLevel: jest.fn(), sortSchoolsByRating: jest.fn(),
  computeRatingScore: jest.fn(), computeAverageRating: jest.fn(),
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({ parsePagination: jest.fn() }));
jest.unstable_mockModule('../../middleware/regionScope.js', () => ({
  requireRegionScope: jest.fn(), requireGovAccess: jest.fn(),
  regionWhere: jest.fn(() => ({})),
}));
jest.unstable_mockModule('sequelize', () => ({ Op: { or: Symbol('or'), in: Symbol('in'), gte: Symbol('gte'), lte: Symbol('lte') } }));

const { getRegions } = await import('../../controllers/governmentController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const allRegions = [
  { id: REGION_A, code: 'r01', name: 'Toshkent shahri',   nameRu: 'Город Ташкент',          nameCyrl: 'Тошкент шаҳри',    isRepublic: false, toJSON() { return this; } },
  { id: REGION_B, code: 'r02', name: 'Samarqand viloyati', nameRu: 'Самаркандская область', nameCyrl: 'Самарқанд вилояти', isRepublic: false, toJSON() { return this; } },
];

beforeEach(() => jest.clearAllMocks());

describe('getRegions', () => {
  it('republic account sees all regions', async () => {
    mockRegionFindAll.mockResolvedValueOnce(allRegions);
    const req = { user: { govLevel: 'republic', govType: 'main' } };
    const res = mkRes();
    await getRegions(req, res);

    expect(mockRegionFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, data: expect.arrayContaining([expect.objectContaining({ id: REGION_A }), expect.objectContaining({ id: REGION_B })]), count: 2 })
    );
  });

  it('region account sees only its own region', async () => {
    const regionAOnly = [allRegions[0]];
    mockRegionFindAll.mockResolvedValueOnce(regionAOnly);
    const req = { user: { govLevel: 'region', govType: 'main', govRegionId: REGION_A } };
    const res = mkRes();
    await getRegions(req, res);

    expect(mockRegionFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: REGION_A } })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: true, count: 1 })
    );
  });

  it('DB error → 500 REGIONS_FETCH_ERROR', async () => {
    mockRegionFindAll.mockRejectedValueOnce(new Error('DB down'));
    const req = { user: { govLevel: 'republic', govType: 'main', id: 'u1' } };
    const res = mkRes();
    await getRegions(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'REGIONS_FETCH_ERROR' }) })
    );
  });
});
