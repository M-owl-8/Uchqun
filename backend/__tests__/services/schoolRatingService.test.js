/**
 * schoolRatingService — three-rating aggregation
 *
 * Tests cover all 7 edge cases documented in GOV-RATING-CUMULATIVE.
 * Mocks the two Sequelize models; the arithmetic is pure.
 */
import { jest } from '@jest/globals';

const mockSchoolRatingFindAll = jest.fn();
const mockGovRatingFindOne = jest.fn();

jest.unstable_mockModule('../../models/SchoolRating.js', () => ({
  default: { findAll: mockSchoolRatingFindAll },
}));
jest.unstable_mockModule('../../models/GovernmentSchoolRating.js', () => ({
  default: { findOne: mockGovRatingFindOne },
}));
// Batch service also uses findAll on GovernmentSchoolRating
jest.unstable_mockModule('sequelize', () => ({
  Op: { in: Symbol('in') },
  literal: (sql) => ({ val: sql }),
}));

const { getSchoolRatingAggregated } = await import('../../services/schoolRatingService.js');

const SCHOOL = 'school-001';

beforeEach(() => jest.clearAllMocks());

describe('getSchoolRatingAggregated — single school', () => {
  // ── 1. Both ratings present ──────────────────────────────────────────────────
  test('both ratings present → 50/50 cumulative', async () => {
    // 4 parent ratings averaging 4.0
    mockSchoolRatingFindAll.mockResolvedValue([
      { stars: 4 }, { stars: 4 }, { stars: 4 }, { stars: 4 },
    ]);
    // Government: all 5 indicators = 3 (deriveStars = 3)
    mockGovRatingFindOne.mockResolvedValue({ stars: 3, period: 'Q2-2026' });

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.parent.avg).toBe(4.0);
    expect(result.parent.count).toBe(4);
    expect(result.government.avg).toBe(3);
    expect(result.government.period).toBe('Q2-2026');
    expect(result.cumulative.avg).toBe(3.5);
    expect(result.cumulative.isPartial).toBe(false);
  });

  // ── 2. Only parent ratings ───────────────────────────────────────────────────
  test('only parent ratings → cumulative = parentAvg, isPartial = true', async () => {
    mockSchoolRatingFindAll.mockResolvedValue([
      { stars: 5 }, { stars: 4 }, { stars: 4 }, { stars: 4 }, { stars: 4 },
    ]);
    mockGovRatingFindOne.mockResolvedValue(null);

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.parent.avg).toBe(4.2);
    expect(result.government).toBeNull();
    expect(result.cumulative.avg).toBe(4.2);
    expect(result.cumulative.isPartial).toBe(true);
  });

  // ── 3. Only government rating ────────────────────────────────────────────────
  test('only government rating → cumulative = govAvg, isPartial = true', async () => {
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockGovRatingFindOne.mockResolvedValue({ stars: 5, period: 'Q1-2026' });

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.parent.avg).toBeNull();
    expect(result.parent.count).toBe(0);
    expect(result.government.avg).toBe(5);
    expect(result.cumulative.avg).toBe(5);
    expect(result.cumulative.isPartial).toBe(true);
  });

  // ── 4. Neither rating ────────────────────────────────────────────────────────
  test('no ratings of any type → cumulative = null', async () => {
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockGovRatingFindOne.mockResolvedValue(null);

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.parent.avg).toBeNull();
    expect(result.government).toBeNull();
    expect(result.cumulative.avg).toBeNull();
    expect(result.cumulative.isPartial).toBe(false);
  });

  // ── 5. Latest quarter selected (DEF-014: chronological, not lexicographic) ──
  test('findOne orders by parsed year then quarter, not raw period string', async () => {
    mockSchoolRatingFindAll.mockResolvedValue([{ stars: 3 }]);
    mockGovRatingFindOne.mockResolvedValue({ stars: 4, period: 'Q3-2026' });

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.government.period).toBe('Q3-2026');
    expect(result.government.avg).toBe(4);
    // DEF-014: plain ORDER BY period DESC is lexicographic ('Q4-2025' would
    // outrank 'Q2-2026'). The order must parse year first, then quarter,
    // with createdAt as the final tie-breaker.
    const call = mockGovRatingFindOne.mock.calls[0][0];
    expect(call.order[0].val).toMatch(/SPLIT_PART\("period", '-', 2\) AS INT\) DESC/); // year
    expect(call.order[1].val).toMatch(/SUBSTRING\(SPLIT_PART\("period", '-', 1\) FROM 2\) AS INT\) DESC/); // quarter
    expect(call.order[2]).toEqual(['createdAt', 'DESC']);
  });

  // ── 6. Parent count exactly 0 → avg = null, not 0.0 ─────────────────────────
  test('parent count 0 → parent.avg is null (not 0)', async () => {
    mockSchoolRatingFindAll.mockResolvedValue([]);
    mockGovRatingFindOne.mockResolvedValue(null);

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.parent.avg).toBeNull();
    expect(result.parent.avg).not.toBe(0);
  });

  // ── 7. Indicator avg: all 5 indicators = 5 → government.avg = 5.0 ───────────
  test('all indicators = 5 → government.avg = 5', async () => {
    mockSchoolRatingFindAll.mockResolvedValue([{ stars: 3 }]);
    // deriveStars({i1:5,i2:5,i3:5,i4:5,i5:5}) = 5; stars field is the pre-computed value
    mockGovRatingFindOne.mockResolvedValue({ stars: 5, period: 'Q2-2026' });

    const result = await getSchoolRatingAggregated(SCHOOL);

    expect(result.government.avg).toBe(5);
  });

  // ── 8. Cumulative rounds correctly ──────────────────────────────────────────
  test('cumulative = (3.3 + 4.1) / 2 rounds to 3.7', async () => {
    // 3 ratings: 3, 3, 4 → avg = 10/3 ≈ 3.3
    mockSchoolRatingFindAll.mockResolvedValue([{ stars: 3 }, { stars: 3 }, { stars: 4 }]);
    mockGovRatingFindOne.mockResolvedValue({ stars: 4, period: 'Q1-2026' });

    const result = await getSchoolRatingAggregated(SCHOOL);

    // parentAvg = round(10/3 * 10) / 10 = round(33.33...) / 10 = 3.3
    expect(result.parent.avg).toBe(3.3);
    // cumulative = (3.3 * 0.5) + (4 * 0.5) = 1.65 + 2.0 = 3.65 → rounded = 3.7 (? let's check)
    // 3.3 * 0.5 = 1.65, 4 * 0.5 = 2.0, total = 3.65 * 10 = 36.5, round = 37, /10 = 3.7
    expect(result.cumulative.avg).toBe(3.7);
  });
});
