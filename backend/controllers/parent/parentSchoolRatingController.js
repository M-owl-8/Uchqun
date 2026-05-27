import Child from '../../models/Child.js';
import School from '../../models/School.js';
import SchoolRating from '../../models/SchoolRating.js';
import logger from '../../utils/logger.js';
import { PARENT_INDICATORS } from '../../config/ratingIndicators.js';

const INDICATOR_KEYS = PARENT_INDICATORS.map(i => i.key);

function deriveStars(indicators) {
  const sum = INDICATOR_KEYS.reduce((acc, k) => acc + indicators[k], 0);
  return Math.min(5, Math.max(1, Math.round(sum / INDICATOR_KEYS.length)));
}

export const rateSchool = async (req, res) => {
  try {
    // Defense-in-depth role check (route middleware is requireParent, but we double-check).
    if (req.user?.role !== 'parent') {
      return res.status(403).json({
        success: false,
        error: { code: 'RATING_FORBIDDEN' },
      });
    }

    const parentId = req.user.id;
    const parentSchoolId = req.user.schoolId;
    const { schoolId, indicators, comment } = req.body;

    // Mandatory comment
    if (!comment || typeof comment !== 'string' || comment.trim() === '') {
      return res.status(400).json({
        success: false,
        error: { code: 'RATING_COMMENT_REQUIRED' },
      });
    }
    const commentTrimmed = comment.trim();

    // schoolId required — deny-on-null (TP-05 2-part fix)
    if (!schoolId) {
      return res.status(400).json({
        success: false,
        error: { code: 'RATING_SCHOOL_ID_REQUIRED' },
      });
    }

    // Indicator validation: all 5 keys present, each 1–5 integer
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

    // School existence check
    const school = await School.findByPk(schoolId);
    if (!school) {
      return res.status(404).json({
        success: false,
        error: { code: 'RATING_SCHOOL_NOT_FOUND' },
      });
    }

    // TP-05 2-part deny-on-null: !parentSchoolId OR mismatch → 403
    if (!parentSchoolId || parentSchoolId !== school.id) {
      return res.status(403).json({
        success: false,
        error: { code: 'RATING_SCHOOL_FORBIDDEN' },
      });
    }

    const stars = deriveStars(indicators);

    // Upsert: find existing or create
    let rating = await SchoolRating.findOne({ where: { schoolId: school.id, parentId } });
    if (rating) {
      await rating.update({ stars, indicators, comment: commentTrimmed });
    } else {
      rating = await SchoolRating.create({ schoolId: school.id, parentId, stars, indicators, comment: commentTrimmed });
    }

    return res.json({ success: true, data: rating.toJSON() });
  } catch (error) {
    logger.error('rateSchool error', { error: error.message, parentId: req.user?.id });
    return res.status(500).json({
      success: false,
      error: { code: 'RATING_CREATE_FAILED' },
    });
  }
};

export const getMySchoolRating = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.query;

    let child;
    if (childId) {
      child = await Child.findOne({ where: { id: childId, parentId } });
      if (!child) {
        return res.status(404).json({
          success: false,
          error: { code: 'RATING_CHILD_NOT_FOUND' },
        });
      }
    } else {
      const children = await Child.findAll({ where: { parentId } });
      if (children.length === 0) {
        return res.json({ success: true, data: { rating: null, schoolId: null } });
      }
      child = children[0];
    }

    if (!child.schoolId) {
      return res.json({ success: true, data: { rating: null, schoolId: null } });
    }

    const school = await School.findByPk(child.schoolId);
    const rating = await SchoolRating.findOne({ where: { schoolId: child.schoolId, parentId } });

    return res.json({
      success: true,
      data: {
        rating: rating ? rating.toJSON() : null,
        schoolId: child.schoolId,
        schoolName: school?.name ?? null,
      },
    });
  } catch (error) {
    logger.error('getMySchoolRating error', { error: error.message, parentId: req.user?.id });
    return res.status(500).json({
      success: false,
      error: { code: 'RATING_FETCH_FAILED' },
    });
  }
};

export const getSchools = async (req, res) => {
  try {
    const schools = await School.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    return res.json({ success: true, data: schools.map(s => s.toJSON()) });
  } catch (error) {
    logger.error('getSchools error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: { code: 'RATING_FETCH_FAILED' },
    });
  }
};
