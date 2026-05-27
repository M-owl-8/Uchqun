import School from '../../models/School.js';
import GovernmentSchoolRating from '../../models/GovernmentSchoolRating.js';
import SchoolRating from '../../models/SchoolRating.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';
import { regionWhere } from '../../middleware/regionScope.js';
import { GOV_INDICATORS } from '../../../shared/config/ratingIndicators.js';

const INDICATOR_KEYS = GOV_INDICATORS.map(i => i.key);
const PERIOD_RE = /^Q[1-4]-\d{4}$/;

function deriveStars(indicators) {
  const sum = INDICATOR_KEYS.reduce((acc, k) => acc + indicators[k], 0);
  return Math.min(5, Math.max(1, Math.round(sum / INDICATOR_KEYS.length)));
}

/**
 * POST /government/schools/:id/rate
 * Government rates a school within their region scope.
 * One rating per gov user per school per quarter period (upsert).
 */
export const rateSchoolAsGov = async (req, res) => {
  try {
    const govUserId = req.user.id;
    const { id: schoolId } = req.params;
    const { period, indicators, comment } = req.body;

    // Mandatory comment
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'RATING_COMMENT_REQUIRED' },
      });
    }
    const commentTrimmed = comment.trim();

    // Period validation (Q1-YYYY format)
    if (!period || !PERIOD_RE.test(period)) {
      return res.status(400).json({
        success: false,
        error: { code: 'RATING_PERIOD_INVALID', detail: 'period must be Q1-YYYY, Q2-YYYY, Q3-YYYY, or Q4-YYYY' },
      });
    }

    // Indicator validation
    if (!indicators || typeof indicators !== 'object' || Array.isArray(indicators)) {
      return res.status(400).json({
        success: false,
        error: { code: 'RATING_INDICATORS_REQUIRED' },
      });
    }
    for (const key of INDICATOR_KEYS) {
      const val = Number(indicators[key]);
      if (!Number.isInteger(val) || val < 1 || val > 5) {
        return res.status(400).json({
          success: false,
          error: { code: 'RATING_INDICATOR_INVALID', detail: `${key} must be an integer 1–5` },
        });
      }
    }

    // Region-scoped school existence check
    const school = await School.findOne({ where: { id: schoolId, ...regionWhere(req) } });
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { code: 'RATING_SCHOOL_NOT_FOUND' },
      });
    }

    const stars = deriveStars(indicators);

    // Upsert: find active rating for this gov user, school, period
    let rating = await GovernmentSchoolRating.findOne({
      where: { schoolId: school.id, govUserId, period },
    });
    if (rating) {
      await rating.update({ stars, indicators, comment: commentTrimmed });
    } else {
      rating = await GovernmentSchoolRating.create({
        schoolId: school.id,
        govUserId,
        period,
        stars,
        indicators,
        comment: commentTrimmed,
      });
    }

    return res.json({ success: true, data: rating.toJSON() });
  } catch (error) {
    logger.error('rateSchoolAsGov error', { error: error.message, govUserId: req.user?.id });
    return res.status(500).json({
      success: false,
      error: { code: 'RATING_CREATE_FAILED' },
    });
  }
};

/**
 * GET /government/schools/:id/ratings/gov
 * Government-direction ratings for a specific school, region-scoped.
 */
export const getGovRatingsForSchool = async (req, res) => {
  try {
    const { id: schoolId } = req.params;

    const school = await School.findOne({ where: { id: schoolId, ...regionWhere(req) } });
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { code: 'RATING_SCHOOL_NOT_FOUND' },
      });
    }

    const { period } = req.query;
    const where = { schoolId: school.id };
    if (period) {
      if (!PERIOD_RE.test(period)) {
        return res.status(400).json({
          success: false,
          error: { code: 'RATING_PERIOD_INVALID' },
        });
      }
      where.period = period;
    }

    const ratings = await GovernmentSchoolRating.findAll({
      where,
      include: [{ model: User, as: 'ratingGovUser', attributes: ['id', 'firstName', 'lastName', 'govLevel'], required: false }],
      order: [['createdAt', 'DESC']],
    });

    const totalStars = ratings.reduce((sum, r) => sum + r.stars, 0);
    const averageStars = ratings.length > 0 ? Math.round((totalStars / ratings.length) * 10) / 10 : 0;

    return res.json({
      success: true,
      data: {
        ratings: ratings.map(r => ({
          id: r.id,
          period: r.period,
          stars: r.stars,
          indicators: r.indicators,
          comment: r.comment,
          govUserName: r.ratingGovUser
            ? `${r.ratingGovUser.firstName ?? ''} ${(r.ratingGovUser.lastName ?? '').charAt(0)}.`.trim()
            : null,
          govLevel: r.ratingGovUser?.govLevel ?? null,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
        })),
        summary: { count: ratings.length, averageStars },
      },
    });
  } catch (error) {
    logger.error('getGovRatingsForSchool error', { error: error.message, schoolId: req.params.id });
    return res.status(500).json({
      success: false,
      error: { code: 'RATING_FETCH_FAILED' },
    });
  }
};

/**
 * GET /government/ratings?direction=parent|gov
 * Aggregated ratings across all schools in scope.
 * direction=parent (default): parent SchoolRating aggregates (existing behavior).
 * direction=gov: GovernmentSchoolRating aggregates.
 * Both are region-scoped.
 */
export const getRatingsAggregated = async (req, res) => {
  try {
    const direction = req.query.direction ?? 'parent';
    if (direction !== 'parent' && direction !== 'gov') {
      return res.status(400).json({
        success: false,
        error: { code: 'RATING_DIRECTION_INVALID', detail: "direction must be 'parent' or 'gov'" },
      });
    }

    const schools = await School.findAll({
      where: { isActive: true, ...regionWhere(req) },
    });

    if (direction === 'gov') {
      const { period } = req.query;
      const schoolIds = schools.map(s => s.id);

      const whereClause = { schoolId: schoolIds };
      if (period) {
        if (!PERIOD_RE.test(period)) {
          return res.status(400).json({
            success: false,
            error: { code: 'RATING_PERIOD_INVALID' },
          });
        }
        whereClause.period = period;
      }

      const allRatings = await GovernmentSchoolRating.findAll({
        where: whereClause,
        attributes: ['schoolId', 'stars', 'period'],
      });

      // Group by school
      const bySchool = {};
      for (const school of schools) {
        bySchool[school.id] = { id: school.id, name: school.name, ratings: [], averageStars: 0, count: 0 };
      }
      for (const r of allRatings) {
        if (bySchool[r.schoolId]) {
          bySchool[r.schoolId].ratings.push(r.stars);
        }
      }
      const ranked = Object.values(bySchool).map(s => {
        const count = s.ratings.length;
        const avg = count > 0 ? Math.round((s.ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
        return { id: s.id, name: s.name, averageStars: avg, count };
      }).sort((a, b) => b.averageStars - a.averageStars);

      const totalRatings = allRatings.length;
      const overallAvg = totalRatings > 0
        ? Math.round((allRatings.reduce((s, r) => s + r.stars, 0) / totalRatings) * 10) / 10
        : 0;

      return res.json({
        success: true,
        data: { direction: 'gov', schools: ranked, overall: { count: totalRatings, averageStars: overallAvg } },
      });
    }

    // direction=parent — delegate to existing controller behaviour by re-using SchoolRating
    const schoolIds = schools.map(s => s.id);
    const allRatings = await SchoolRating.findAll({
      where: { schoolId: schoolIds },
      attributes: ['schoolId', 'stars'],
    });

    const bySchool = {};
    for (const school of schools) {
      bySchool[school.id] = { id: school.id, name: school.name, ratings: [], averageStars: 0, count: 0 };
    }
    for (const r of allRatings) {
      if (bySchool[r.schoolId]) bySchool[r.schoolId].ratings.push(r.stars);
    }
    const ranked = Object.values(bySchool).map(s => {
      const count = s.ratings.length;
      const avg = count > 0 ? Math.round((s.ratings.reduce((a, b) => a + b, 0) / count) * 10) / 10 : 0;
      return { id: s.id, name: s.name, averageStars: avg, count };
    }).sort((a, b) => b.averageStars - a.averageStars);

    const totalRatings = allRatings.length;
    const overallAvg = totalRatings > 0
      ? Math.round((allRatings.reduce((s, r) => s + r.stars, 0) / totalRatings) * 10) / 10
      : 0;

    return res.json({
      success: true,
      data: { direction: 'parent', schools: ranked, overall: { count: totalRatings, averageStars: overallAvg } },
    });
  } catch (error) {
    logger.error('getRatingsAggregated error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'RATING_FETCH_FAILED' },
    });
  }
};
