/**
 * Unified three-rating aggregation service.
 *
 * Parent rating: average of all SchoolRating.stars for the school.
 * Government rating: latest GovernmentSchoolRating.stars (derived from indicators).
 * Cumulative: (parentAvg × 0.5) + (govAvg × 0.5) with edge case handling.
 *
 * Computed on read — never stored — guarantees correctness without sync complexity.
 */

import { Op, literal } from 'sequelize';
import SchoolRating from '../models/SchoolRating.js';
import GovernmentSchoolRating from '../models/GovernmentSchoolRating.js';

// DEF-014: period stores strings like 'Q2-2026'. Plain ORDER BY period DESC is
// lexicographic — 'Q4-2025' would outrank 'Q2-2026'. Sort chronologically by
// parsed year, then quarter number, then createdAt as the tie-breaker.
const PERIOD_CHRONO_DESC = [
  literal(`CAST(SPLIT_PART("period", '-', 2) AS INT) DESC`),
  literal(`CAST(SUBSTRING(SPLIT_PART("period", '-', 1) FROM 2) AS INT) DESC`),
  ['createdAt', 'DESC'],
];

/**
 * Compute cumulative from parent and gov averages.
 * Edge cases:
 *   both present → 50/50 weighted average
 *   only parent → cumulative = parentAvg, isPartial = true
 *   only gov    → cumulative = govAvg, isPartial = true
 *   neither     → cumulative = null, isPartial = false
 */
function computeCumulative(parentAvg, govAvg) {
  if (parentAvg !== null && govAvg !== null) {
    return { avg: Math.round(((parentAvg * 0.5) + (govAvg * 0.5)) * 10) / 10, isPartial: false };
  }
  if (parentAvg !== null) return { avg: parentAvg, isPartial: true };
  if (govAvg !== null) return { avg: govAvg, isPartial: true };
  return { avg: null, isPartial: false };
}

/**
 * Aggregate ratings for a single school.
 * @returns {{ parent, government, cumulative }}
 */
export async function getSchoolRatingAggregated(schoolId) {
  const [parentRatings, latestGovRating] = await Promise.all([
    SchoolRating.findAll({ where: { schoolId }, attributes: ['stars'] }),
    GovernmentSchoolRating.findOne({
      where: { schoolId },
      order: PERIOD_CHRONO_DESC,
    }),
  ]);

  const parentCount = parentRatings.length;
  const parentAvg = parentCount > 0
    ? Math.round((parentRatings.reduce((s, r) => s + r.stars, 0) / parentCount) * 10) / 10
    : null;

  const govAvg = latestGovRating ? latestGovRating.stars : null;
  const govPeriod = latestGovRating ? latestGovRating.period : null;

  return {
    parent: { avg: parentAvg, count: parentCount },
    government: govAvg !== null ? { avg: govAvg, period: govPeriod } : null,
    cumulative: computeCumulative(parentAvg, govAvg),
  };
}

/**
 * Batch-aggregate ratings for multiple schools in 2 queries (no N+1).
 * @param {string[]} schoolIds
 * @returns {Record<string, { parent, government, cumulative }>}
 */
export async function getSchoolRatingsBatch(schoolIds) {
  if (!schoolIds.length) return {};

  const [allParent, allGov] = await Promise.all([
    SchoolRating.findAll({
      where: { schoolId: { [Op.in]: schoolIds } },
      attributes: ['schoolId', 'stars'],
    }),
    GovernmentSchoolRating.findAll({
      where: { schoolId: { [Op.in]: schoolIds } },
      attributes: ['schoolId', 'stars', 'period', 'createdAt'],
      order: PERIOD_CHRONO_DESC,
    }),
  ]);

  // Group parent stars by school
  const parentBySchool = {};
  for (const r of allParent) {
    if (!parentBySchool[r.schoolId]) parentBySchool[r.schoolId] = [];
    parentBySchool[r.schoolId].push(r.stars);
  }

  // Pick latest gov rating per school (already sorted DESC, first seen = latest)
  const govBySchool = {};
  for (const r of allGov) {
    if (!govBySchool[r.schoolId]) {
      govBySchool[r.schoolId] = { stars: r.stars, period: r.period };
    }
  }

  const result = {};
  for (const schoolId of schoolIds) {
    const stars = parentBySchool[schoolId] || [];
    const parentCount = stars.length;
    const parentAvg = parentCount > 0
      ? Math.round((stars.reduce((s, v) => s + v, 0) / parentCount) * 10) / 10
      : null;

    const govData = govBySchool[schoolId] || null;
    const govAvg = govData ? govData.stars : null;
    const govPeriod = govData ? govData.period : null;

    result[schoolId] = {
      parent: { avg: parentAvg, count: parentCount },
      government: govAvg !== null ? { avg: govAvg, period: govPeriod } : null,
      cumulative: computeCumulative(parentAvg, govAvg),
    };
  }

  return result;
}
