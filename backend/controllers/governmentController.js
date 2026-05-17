import GovernmentStats from '../models/GovernmentStats.js';
import School from '../models/School.js';
import SchoolRating from '../models/SchoolRating.js';
import User from '../models/User.js';
import Child from '../models/Child.js';
import _TherapyUsage from '../models/TherapyUsage.js';
import AIWarning from '../models/AIWarning.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { getGovernmentLevel, sortSchoolsByRating, computeRatingScore, computeAverageRating } from '../utils/governmentLevel.js';
import { parsePagination } from '../utils/pagination.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isValidUuid = (s) => UUID_RE.test(s);
const isValidDate = (s) => !isNaN(new Date(s).getTime());

const STAT_TYPES = new Set(['overview', 'schools', 'students', 'teachers', 'ratings', 'therapies', 'activities', 'complaints']);
const PERIODS = new Set(['daily', 'weekly', 'monthly', 'quarterly', 'yearly']);

/**
 * Get overview statistics
 * GET /api/government/overview
 */
export const getOverview = async (req, res) => {
  try {
    const { region, district, startDate: _startDate, endDate: _endDate } = req.query;

    const where = {};
    if (region) {
      where.region = region;
    }
    if (district) {
      where.district = district;
    }

    // Build school filter (government can optionally filter by region/school)
    const schoolWhere = { isActive: true, ...where };
    const schoolIdFilter = req.query.schoolId && isValidUuid(req.query.schoolId) ? { schoolId: req.query.schoolId } : {};

    // Get schools count
    let schoolsCount = 0;
    try {
      schoolsCount = await School.count({ where: schoolWhere });
    } catch (error) {
      logger.warn('Failed to count schools', { error: error.message });
    }

    // Get total students (filtered by school if specified)
    let studentsCount = 0;
    try {
      studentsCount = await Child.count({ where: schoolIdFilter });
    } catch (error) {
      logger.warn('Failed to count students', { error: error.message });
    }

    // Get total teachers (filtered by school if specified)
    let teachersCount = 0;
    try {
      teachersCount = await User.count({ where: { role: 'teacher', ...schoolIdFilter } });
    } catch (error) {
      logger.warn('Failed to count teachers', { error: error.message });
    }

    // Get total parents (filtered by school if specified)
    let parentsCount = 0;
    try {
      parentsCount = await User.count({ where: { role: 'parent', ...schoolIdFilter } });
    } catch (error) {
      logger.warn('Failed to count parents', { error: error.message });
    }

    // Get average school rating (supports both stars and evaluation formats)
    let avgRating = 0;
    try {
      const ratings = await SchoolRating.findAll({
        attributes: ['stars', 'evaluation'],
      });
      const result = computeAverageRating(ratings);
      avgRating = result.average;
    } catch (error) {
      logger.warn('Failed to calculate average rating', { error: error.message });
    }

    // Get active warnings
    let warningsCount = 0;
    try {
      warningsCount = await AIWarning.count({
        where: { isResolved: false },
      });
    } catch (error) {
      logger.warn('Failed to count warnings', { error: error.message });
    }

    res.json({
      success: true,
      data: {
        schools: schoolsCount,
        students: studentsCount,
        teachers: teachersCount,
        parents: parentsCount,
        averageRating: avgRating,
        activeWarnings: warningsCount,
      },
    });
  } catch (error) {
    logger.error('Get government overview error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ 
      error: 'Failed to fetch overview statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get schools statistics
 * GET /api/government/schools
 */
export const getSchoolsStats = async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    const where = { isActive: true };

    let schools;
    let includesLoaded = true;
    try {
      schools = await School.findAndCountAll({
        where,
        limit,
        offset,
        distinct: true,
        include: [
          {
            model: SchoolRating,
            as: 'ratings',
            attributes: ['stars', 'evaluation'],
            required: false,
          },
          {
            model: Child,
            as: 'schoolChildren',
            attributes: ['id'],
            required: false,
          },
        ],
        order: [['name', 'ASC']],
      });
    } catch (includeError) {
      logger.warn('School include failed, using fallback', { error: includeError.message });
      includesLoaded = false;
      schools = await School.findAndCountAll({
        where,
        limit,
        offset,
        order: [['name', 'ASC']],
      });
    }

    // Batch-load stats for fallback path to avoid N+1 queries
    const ratingsBySchool = {};
    const childCountBySchool = {};
    if (!includesLoaded) {
      const schoolIds = schools.rows.map(s => s.id);
      try {
        const [allRatings, allChildren] = await Promise.all([
          SchoolRating.findAll({
            where: { schoolId: { [Op.in]: schoolIds } },
            attributes: ['schoolId', 'stars', 'evaluation'],
          }),
          Child.findAll({
            where: { schoolId: { [Op.in]: schoolIds } },
            attributes: ['schoolId'],
          }),
        ]);
        for (const r of allRatings) {
          if (!ratingsBySchool[r.schoolId]) ratingsBySchool[r.schoolId] = [];
          ratingsBySchool[r.schoolId].push(r);
        }
        for (const c of allChildren) {
          childCountBySchool[c.schoolId] = (childCountBySchool[c.schoolId] || 0) + 1;
        }
      } catch (batchError) {
        logger.error('Batch stats fallback failed', { error: batchError.message });
      }
    }

    const schoolsWithStats = schools.rows.map((school) => {
      let ratings;
      let studentsCount;

      // If includes loaded, use eager-loaded data; otherwise use pre-fetched batch
      if (includesLoaded && school.ratings !== undefined) {
        ratings = school.ratings || [];
        studentsCount = (school.schoolChildren || []).length;
      } else {
        ratings = ratingsBySchool[school.id] || [];
        studentsCount = childCountBySchool[school.id] || 0;
      }

      const ratingResult = computeAverageRating(ratings);
      const ratingsCount = ratingResult.count;
      const avgRating = ratingResult.average;

      const { id, name, type, address, phone, email, description, isActive, createdAt } = school.toJSON();

      return {
        id, name, type, address, phone, email, description, isActive, createdAt,
        averageRating: avgRating,
        ratingsCount,
        studentsCount,
        governmentLevel: getGovernmentLevel(avgRating, ratingsCount),
      };
    });

    // Global stats (weighted average by review count)
    let totalReviews = 0;
    let weightedSum = 0;
    schoolsWithStats.forEach((s) => {
      totalReviews += s.ratingsCount;
      weightedSum += s.averageRating * s.ratingsCount;
    });
    const globalAverageRating = totalReviews > 0
      ? parseFloat((weightedSum / totalReviews).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        schools: schoolsWithStats,
        total: schools.count,
        totalReviews,
        globalAverageRating,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get schools stats error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({
      error: 'Failed to fetch schools statistics',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get a single school with stats
 * GET /api/government/schools/:id
 */
export const getSchoolById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isValidUuid(id)) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }

    const school = await School.findOne({ where: { id, isActive: true } });
    if (!school) {
      return res.status(404).json({ error: 'School not found' });
    }

    const [studentsCount, teachersCount, ratings] = await Promise.all([
      Child.count({ where: { schoolId: id } }).catch(() => 0),
      User.count({ where: { role: 'teacher', schoolId: id } }).catch(() => 0),
      SchoolRating.findAll({ where: { schoolId: id }, attributes: ['stars', 'evaluation'] }).catch(() => []),
    ]);

    const ratingResult = computeAverageRating(ratings);

    res.json({
      success: true,
      data: {
        ...school.toJSON(),
        studentsCount,
        teachersCount,
        ratingsCount: ratingResult.count,
        averageRating: ratingResult.average,
        governmentLevel: getGovernmentLevel(ratingResult.average, ratingResult.count),
      },
    });
  } catch (error) {
    logger.error('Get school by id error', { error: error.message, stack: error.stack, schoolId: req.params.id });
    res.status(500).json({ error: 'Failed to fetch school details' });
  }
};

/**
 * Get students statistics and list (for government panel)
 * GET /api/government/students
 */
export const getStudentsStats = async (req, res) => {
  try {
    const { schoolId, limit = 500, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 500, 1000);
    const offsetNum = parseInt(offset, 10) || 0;

    const where = {};
    if (schoolId) {
      if (!isValidUuid(schoolId)) {
        return res.status(400).json({ error: 'Invalid schoolId format' });
      }
      where.schoolId = schoolId;
    }

    const { count, rows: students } = await Child.findAndCountAll({
      where,
      limit: limitNum,
      offset: offsetNum,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: School,
          as: 'childSchool',
          required: false,
          attributes: ['id', 'name'],
        },
        {
          model: User,
          as: 'parent',
          required: false,
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        total: count,
        students: students.map(s => {
          const j = s.toJSON();
          j.schoolName = s.childSchool?.name || s.school || '—';
          j.parentName = s.parent ? `${s.parent.firstName} ${s.parent.lastName}` : '—';
          return j;
        }),
      },
    });
  } catch (error) {
    logger.error('Get students stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch students statistics' });
  }
};

/**
 * Get all teachers list (for government panel)
 * GET /api/government/teachers
 */
export const getTeachersList = async (req, res) => {
  try {
    const { limit = 500, offset = 0 } = req.query;
    const limitNum = Math.min(parseInt(limit, 10) || 500, 1000);
    const offsetNum = parseInt(offset, 10) || 0;

    const { count, rows: teachers } = await User.findAndCountAll({
      where: { role: 'teacher' },
      attributes: { exclude: ['password'] },
      limit: limitNum,
      offset: offsetNum,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        total: count,
        teachers: teachers.map(t => t.toJSON()),
      },
    });
  } catch (error) {
    logger.error('Get teachers list error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teachers list' });
  }
};

/**
 * Get all parents list (for government panel)
 * GET /api/government/parents
 */
export const getParentsList = async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query, { limit: 20 });

    const { count, rows: parents } = await User.findAndCountAll({
      where: { role: 'parent' },
      attributes: { exclude: ['password'] },
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        total: count,
        limit,
        offset,
        parents: parents.map(p => p.toJSON()),
      },
    });
  } catch (error) {
    logger.error('Get parents list error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents list' });
  }
};

/**
 * Get ratings statistics - schools ranked by average rating
 * GET /api/government/ratings
 */
export const getRatingsStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (startDate && !isValidDate(startDate)) {
      return res.status(400).json({ error: 'Invalid startDate format' });
    }
    if (endDate && !isValidDate(endDate)) {
      return res.status(400).json({ error: 'Invalid endDate format' });
    }

    const ratingWhere = {};
    if (startDate || endDate) {
      ratingWhere.createdAt = {};
      if (startDate) {
        ratingWhere.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        ratingWhere.createdAt[Op.lte] = new Date(endDate);
      }
    }

    // Get all active schools with their ratings
    let schools;
    let ratingsIncluded = true;
    try {
      const includeOptions = {
        model: SchoolRating,
        as: 'ratings',
        attributes: ['stars', 'evaluation'],
        required: false,
      };
      if (Object.keys(ratingWhere).length > 0) {
        includeOptions.where = ratingWhere;
      }
      schools = await School.findAll({
        where: { isActive: true },
        include: [includeOptions],
      });
    } catch (includeError) {
      logger.warn('Ratings include failed, using fallback', { error: includeError.message });
      ratingsIncluded = false;
      schools = await School.findAll({
        where: { isActive: true },
      });
    }

    // Aggregate and rank schools by average rating (supports both stars and evaluation)
    const mappedSchools = (await Promise.allSettled(schools.map(async (school) => {
      let ratings;
      if (ratingsIncluded && school.ratings !== undefined) {
        ratings = school.ratings || [];
      } else {
        try {
          const ratingQuery = { schoolId: school.id };
          if (Object.keys(ratingWhere).length > 0) {
            Object.assign(ratingQuery, ratingWhere);
          }
          ratings = await SchoolRating.findAll({
            where: ratingQuery,
            attributes: ['stars', 'evaluation'],
          });
        } catch (fallbackError) {
          logger.error('Per-school ratings fallback failed', {
            schoolId: school.id,
            error: fallbackError.message,
          });
          ratings = [];
        }
      }
      const ratingResult = computeAverageRating(ratings);

      // Build distribution by mapping each rating to its effective star bucket
      const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
      ratings.forEach(r => {
        const score = computeRatingScore(r);
        if (score !== null) {
          const bucket = Math.min(5, Math.max(1, Math.round(score)));
          distribution[bucket]++;
        }
      });

      return {
        id: school.id,
        name: school.name,
        address: school.address,
        averageRating: ratingResult.average,
        ratingsCount: ratingResult.count,
        distribution,
        governmentLevel: getGovernmentLevel(ratingResult.average, ratingResult.count),
      };
    }))).filter(r => r.status === 'fulfilled').map(r => r.value);

    const rankedSchools = sortSchoolsByRating(mappedSchools);

    // Overall stats — recompute from mapped data to avoid stale include data
    let totalRatingsCount = 0;
    let weightedSum = 0;
    mappedSchools.forEach((s) => {
      totalRatingsCount += s.ratingsCount;
      weightedSum += s.averageRating * s.ratingsCount;
    });
    const overallAverage = totalRatingsCount > 0
      ? parseFloat((weightedSum / totalRatingsCount).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        total: totalRatingsCount,
        average: overallAverage,
        schools: rankedSchools,
      },
    });
  } catch (error) {
    logger.error('Get ratings stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch ratings statistics' });
  }
};


/**
 * Generate and save statistics
 * POST /api/government/stats/generate
 */
export const generateStats = async (req, res) => {
  try {
    const {
      statType,
      period,
      periodStart,
      periodEnd,
      region,
      district,
      schoolId,
    } = req.body;

    if (!req.user?.id) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    if (!statType || !period || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Stat type, period, and dates are required' });
    }
    if (!STAT_TYPES.has(statType)) {
      return res.status(400).json({ error: `Invalid statType. Must be one of: ${[...STAT_TYPES].join(', ')}` });
    }
    if (!PERIODS.has(period)) {
      return res.status(400).json({ error: `Invalid period. Must be one of: ${[...PERIODS].join(', ')}` });
    }
    if (!isValidDate(periodStart) || !isValidDate(periodEnd)) {
      return res.status(400).json({ error: 'Invalid periodStart or periodEnd date format' });
    }
    if (new Date(periodStart) > new Date(periodEnd)) {
      return res.status(400).json({ error: 'periodStart must be before periodEnd' });
    }

    let data = {};

    switch (statType) {
      case 'overview': {
        // Get overview data
        const overview = await getOverviewData(region, district, periodStart, periodEnd);
        data = overview;
        break;
      }
      case 'schools': {
        const schools = await getSchoolsData(region, district);
        data = schools;
        break;
      }
      case 'ratings': {
        const ratings = await getRatingsData(schoolId, periodStart, periodEnd);
        data = ratings;
        break;
      }
      default:
        return res.status(400).json({ error: 'Invalid stat type' });
    }

    const stats = await GovernmentStats.create({
      region: region || null,
      district: district || null,
      schoolId: schoolId || null,
      statType,
      period,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      data,
      generatedBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Generate stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
};

/**
 * Get saved statistics
 * GET /api/government/stats
 */
export const getSavedStats = async (req, res) => {
  try {
    const { statType, period, region, district, schoolId } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 20 });

    const where = {};
    if (statType) {
      if (!STAT_TYPES.has(statType)) {
        return res.status(400).json({ error: `Invalid statType. Must be one of: ${[...STAT_TYPES].join(', ')}` });
      }
      where.statType = statType;
    }
    if (period) {
      if (!PERIODS.has(period)) {
        return res.status(400).json({ error: `Invalid period. Must be one of: ${[...PERIODS].join(', ')}` });
      }
      where.period = period;
    }
    if (region) {
      where.region = region;
    }
    if (district) {
      where.district = district;
    }
    if (schoolId) {
      if (!isValidUuid(schoolId)) {
        return res.status(400).json({ error: 'Invalid schoolId format' });
      }
      where.schoolId = schoolId;
    }

    const stats = await GovernmentStats.findAndCountAll({
      where,
      limit,
      offset,
      order: [['generatedAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'generator',
          required: false,
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        stats: stats.rows,
        total: stats.count,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get saved stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch saved statistics' });
  }
};

/**
 * Get individual ratings for a specific school
 * GET /api/government/ratings/:schoolId
 */
export const getSchoolRatings = async (req, res) => {
  try {
    const { schoolId } = req.params;
    if (!isValidUuid(schoolId)) {
      return res.status(400).json({ error: 'Invalid school ID' });
    }
    const { limit, offset } = parsePagination(req.query, { limit: 10 });

    const { count, rows } = await SchoolRating.findAndCountAll({
      where: { schoolId },
      include: [
        {
          model: User,
          as: 'ratingParent',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    const ratings = rows.map((r) => {
      const score = computeRatingScore(r);
      return {
        id: r.id,
        score,
        comment: r.comment,
        parentName: r.ratingParent
          ? `${r.ratingParent.firstName || ''} ${(r.ratingParent.lastName || '').charAt(0)}.`.trim()
          : null,
        createdAt: r.createdAt,
      };
    });

    res.json({
      success: true,
      data: {
        ratings,
        total: count,
        limit,
        offset,
        totalPages: Math.ceil(count / limit),
      },
    });
  } catch (error) {
    logger.error('Get school ratings error', { error: error.message, stack: error.stack, schoolId: req.params.schoolId });
    res.status(500).json({ error: 'Failed to fetch school ratings' });
  }
};

// Helper functions
async function getOverviewData(_region, _district, _startDate, _endDate) {
  const schoolsCount = await School.count({ where: { isActive: true } });
  const studentsCount = await Child.count();
  const teachersCount = await User.count({ where: { role: 'teacher' } });
  const parentsCount = await User.count({ where: { role: 'parent' } });

  const ratings = await SchoolRating.findAll({ attributes: ['stars', 'evaluation'] });
  const ratingResult = computeAverageRating(ratings);

  return {
    schools: schoolsCount,
    students: studentsCount,
    teachers: teachersCount,
    parents: parentsCount,
    averageRating: ratingResult.average,
  };
}

async function getSchoolsData(_region, _district) {
  const schools = await School.findAll({ where: { isActive: true } });
  return { schools: schools.length, data: schools };
}

async function getRatingsData(schoolId, startDate, endDate) {
  const where = {};
  if (schoolId) where.schoolId = schoolId;
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }
  const ratings = await SchoolRating.findAll({ where });
  return { ratings: ratings.length, data: ratings };
}

/**
 * Get all Admin accounts (Government view)
 * GET /api/government/admins
 */
export const getAdmins = async (req, res) => {
  try {
    const { limit, offset } = parsePagination(req.query, { limit: 100 });

    const { count, rows: admins } = await User.findAndCountAll({
      where: { role: 'admin' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      limit,
      offset,
    });

    logger.info('Government fetched admins', {
      count: admins.length,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: admins.map(a => a.toJSON()),
      total: count,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('Get admins error (government)', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ 
      error: 'Failed to fetch admin accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get admin details with all related data
 * GET /api/government/admins/:id
 */
export const getAdminDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({
      where: { id, role: 'admin' },
      attributes: { exclude: ['password'] },
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: id },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    const receptionIds = receptions.map(r => r.id);

    // Fetch schools, teachers, and parents in parallel — all depend only on receptionIds
    const [schools, teachers, parents] = receptionIds.length > 0
      ? await Promise.all([
          School.findAll({ where: { createdBy: { [Op.in]: receptionIds } }, order: [['createdAt', 'DESC']] })
            .catch(err => { logger.warn('Failed to fetch schools for admin', { error: err.message, adminId: id }); return []; }),
          User.findAll({ where: { role: 'teacher', createdBy: { [Op.in]: receptionIds } }, attributes: { exclude: ['password'] }, order: [['createdAt', 'DESC']] })
            .catch(err => { logger.warn('Failed to fetch teachers for admin', { error: err.message, adminId: id }); return []; }),
          User.findAll({ where: { role: 'parent', createdBy: { [Op.in]: receptionIds } }, attributes: { exclude: ['password'] }, order: [['createdAt', 'DESC']] })
            .catch(err => { logger.warn('Failed to fetch parents for admin', { error: err.message, adminId: id }); return []; }),
        ])
      : [[], [], []];

    const parentIds = parents.map(p => p.id);
    const schoolIds = schools.map(s => s.id);

    // Fetch children and school ratings in parallel — each depends on the previous batch
    const [children, ratingsResult] = await Promise.all([
      parentIds.length > 0
        ? Child.findAll({ where: { parentId: { [Op.in]: parentIds } }, order: [['createdAt', 'DESC']] })
            .catch(err => { logger.warn('Failed to fetch children for admin', { error: err.message, adminId: id }); return []; })
        : Promise.resolve([]),
      schoolIds.length > 0
        ? SchoolRating.findAll({ where: { schoolId: { [Op.in]: schoolIds } }, attributes: ['stars', 'evaluation'] })
            .then(ratings => computeAverageRating(ratings))
            .catch(err => { logger.warn('Failed to fetch ratings for admin', { error: err.message, adminId: id }); return { average: 0, count: 0 }; })
        : Promise.resolve({ average: 0, count: 0 }),
    ]);

    const studentsCount = children.length;

    logger.info('Government fetched admin details', {
      adminId: id,
      receptionsCount: receptions.length,
      schoolsCount: schools.length,
      teachersCount: teachers.length,
      parentsCount: parents.length,
      studentsCount: studentsCount,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: {
        admin: admin.toJSON(),
        stats: {
          receptions: receptions.length,
          schools: schools.length,
          teachers: teachers.length,
          parents: parents.length,
          students: studentsCount,
          averageRating: ratingsResult.average,
          ratingsCount: ratingsResult.count,
        },
        receptions: receptions.map(r => r.toJSON()),
        schools: schools.map(s => s.toJSON()),
        teachers: teachers.map(t => t.toJSON()),
        parents: parents.map(p => p.toJSON()),
        children: children.map(c => c.toJSON()),
      },
    });
  } catch (error) {
    logger.error('Get admin details error (government)', { 
      error: error.message, 
      stack: error.stack,
      adminId: req.params.id,
      userId: req.user?.id,
    });
    res.status(500).json({ 
      error: 'Failed to fetch admin details',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};