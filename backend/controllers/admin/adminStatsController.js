import { Op, QueryTypes } from 'sequelize';
import User from '../../models/User.js';
import Child from '../../models/Child.js';
import Group from '../../models/Group.js';
import School from '../../models/School.js';
import SchoolRating from '../../models/SchoolRating.js';
import Document from '../../models/Document.js';
import ParentActivity from '../../models/ParentActivity.js';
import ParentMeal from '../../models/ParentMeal.js';
import ParentMedia from '../../models/ParentMedia.js';
import TherapyUsage from '../../models/TherapyUsage.js';
import logger from '../../utils/logger.js';

/**
 * Get dashboard statistics for Admin
 * GET /api/admin/statistics
 */
export const getStatistics = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    logger.info('Getting statistics for admin', { adminId: req.user.id, role: req.user.role });

    // Get counts for all roles
    // First get reception IDs created by this admin
    let adminReceptions = [];
    try {
      adminReceptions = await User.findAll({
        where: { role: 'reception', createdBy: req.user.id },
        attributes: ['id'],
      });
    } catch (error) {
      logger.error('Error fetching admin receptions', { error: error.message, adminId: req.user.id });
      adminReceptions = [];
    }
    const receptionIds = adminReceptions.map(r => r.id);

    logger.info('Admin receptions found', { count: receptionIds.length, adminId: req.user.id });

    // Get teachers created by these receptions
    let teacherIds = [];
    if (receptionIds.length > 0) {
      try {
        const adminTeachers = await User.findAll({
          where: {
            role: 'teacher',
            createdBy: { [Op.in]: receptionIds },
          },
          attributes: ['id'],
        });
        teacherIds = adminTeachers.map(t => t.id);
      } catch (error) {
        logger.error('Error fetching admin teachers', { error: error.message, adminId: req.user.id });
        teacherIds = [];
      }
    }

    const [receptions, teachers, parents, groups] = await Promise.all([
      User.count({ where: { role: 'reception', createdBy: req.user.id } }).catch(() => 0),
      receptionIds.length > 0
        ? User.count({ where: { role: 'teacher', createdBy: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? User.count({ where: { role: 'parent', createdBy: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      teacherIds.length > 0
        ? Group.count({ where: { teacherId: { [Op.in]: teacherIds } } }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    logger.info('Statistics calculated', {
      adminId: req.user.id,
      receptions,
      teachers,
      parents,
      groups,
      receptionIds: receptionIds.length,
      teacherIds: teacherIds.length,
    });

    // Get active vs inactive receptions
    const [activeReceptions, inactiveReceptions, pendingReceptions] = await Promise.all([
      User.count({
        where: {
          role: 'reception',
          createdBy: req.user.id,
          isActive: true,
          documentsApproved: true,
        }
      }).catch(() => 0),
      User.count({
        where: {
          role: 'reception',
          createdBy: req.user.id,
          isActive: false,
        }
      }).catch(() => 0),
      User.count({
        where: {
          role: 'reception',
          createdBy: req.user.id,
          documentsApproved: false,
        }
      }).catch(() => 0),
    ]);

    // Get document statistics
    const [pendingDocuments, approvedDocuments, rejectedDocuments] = await Promise.all([
      receptionIds.length > 0
        ? Document.count({ where: { status: 'pending', userId: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? Document.count({ where: { status: 'approved', userId: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? Document.count({ where: { status: 'rejected', userId: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get parent data statistics (only for parents created by admin's receptions)
    // Get parent IDs created by admin's receptions
    let parentIds = [];
    if (receptionIds.length > 0) {
      try {
        const adminParents = await User.findAll({
          where: {
            role: 'parent',
            createdBy: { [Op.in]: receptionIds },
          },
          attributes: ['id'],
        });
        parentIds = adminParents.map(p => p.id);
      } catch (error) {
        logger.error('Error fetching admin parents', { error: error.message, adminId: req.user.id });
        parentIds = [];
      }
    }

    // Get children count (children of parents created by admin's receptions)
    let childrenCount = 0;
    try {
      if (parentIds.length > 0) {
        childrenCount = await Child.count({
          where: { parentId: { [Op.in]: parentIds } }
        });
        logger.info('Children count calculated', {
          childrenCount,
          parentIdsCount: parentIds.length,
          adminId: req.user.id
        });
      } else {
        logger.info('No parent IDs found, children count will be 0', {
          adminId: req.user.id,
          receptionIdsCount: receptionIds.length
        });
        childrenCount = 0;
      }
    } catch (error) {
      logger.error('Error fetching children count', {
        error: error.message,
        adminId: req.user.id,
        parentIdsCount: parentIds.length,
        stack: error.stack
      });
      childrenCount = 0;
    }

    const [totalActivities, totalMeals, totalMedia] = await Promise.all([
      parentIds.length > 0
        ? ParentActivity.count({ where: { parentId: { [Op.in]: parentIds } } }).catch(() => 0)
        : Promise.resolve(0),
      parentIds.length > 0
        ? ParentMeal.count({ where: { parentId: { [Op.in]: parentIds } } }).catch(() => 0)
        : Promise.resolve(0),
      parentIds.length > 0
        ? ParentMedia.count({ where: { parentId: { [Op.in]: parentIds } } }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentReceptions, recentParents, recentTeachers] = await Promise.all([
      User.count({
        where: {
          role: 'reception',
          createdBy: req.user.id,
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }).catch(() => 0),
      receptionIds.length > 0
        ? User.count({
            where: {
              role: 'parent',
              createdBy: { [Op.in]: receptionIds },
              createdAt: { [Op.gte]: thirtyDaysAgo },
            },
          }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? User.count({
            where: {
              role: 'teacher',
              createdBy: { [Op.in]: receptionIds },
              createdAt: { [Op.gte]: thirtyDaysAgo },
            },
          }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get additional statistics: schools (with ratings via eager load), therapy usages
    const [schoolsWithRatings, therapyUsages] = await Promise.all([
      School.findAll({
        where: { isActive: true },
        include: [{ model: SchoolRating, as: 'ratings', attributes: ['stars'], required: false }],
        attributes: ['id'],
      }).catch(() => []),
      TherapyUsage.count().catch(() => 0),
    ]);

    const totalSchools = schoolsWithRatings.length;
    const allStars = schoolsWithRatings.flatMap(s => (s.ratings || []).map(r => r.stars));
    const averageSchoolRating = allStars.length > 0
      ? parseFloat((allStars.reduce((sum, s) => sum + s, 0) / allStars.length).toFixed(1))
      : 0;

    const totalUsers = receptions + teachers + parents;

    res.json({
      success: true,
      data: {
        // Frontend expected format
        receptions,
        teachers,
        parents,
        children: childrenCount,
        groups: groups,
        // Detailed format (for backward compatibility)
        users: {
          receptions,
          teachers,
          parents,
          total: totalUsers,
        },
        receptionsDetail: {
          total: receptions,
          active: activeReceptions,
          inactive: inactiveReceptions,
          pending: pendingReceptions,
        },
        documents: {
          pending: pendingDocuments,
          approved: approvedDocuments,
          rejected: rejectedDocuments,
          total: pendingDocuments + approvedDocuments + rejectedDocuments,
        },
        content: {
          activities: totalActivities,
          meals: totalMeals,
          media: totalMedia,
          total: totalActivities + totalMeals + totalMedia,
        },
        groupsDetail: {
          total: groups,
        },
        schools: {
          total: totalSchools,
          averageRating: averageSchoolRating,
        },
        recentActivity: {
          receptions: recentReceptions,
          parents: recentParents,
          teachers: recentTeachers,
        },
      },
    });
  } catch (error) {
    logger.error('Get statistics error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
      errorName: error.name,
      errorCode: error.code,
      errorTable: error.table,
      errorColumn: error.column
    });
    // Return more detailed error in development
    const errorResponse = {
      error: 'Failed to fetch statistics',
      message: error.message
    };

    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      errorResponse.details = error.stack?.substring(0, 500);
      errorResponse.errorName = error.name;
      errorResponse.errorCode = error.code;
    }

    res.status(500).json(errorResponse);
  }
};

/**
 * Get school ratings (admin can view all school ratings)
 * GET /api/admin/school-ratings
 */
export const getSchoolRatings = async (req, res) => {
  try {
    // Get all school ratings (admin can see all ratings)
    // Use raw query directly to avoid association issues
    let ratings = [];

    try {
      const sequelize = SchoolRating.sequelize;

      const rawRatings = await sequelize.query(`
        SELECT
          sr.id,
          sr."schoolId",
          sr."parentId",
          sr.stars,
          sr.comment,
          sr.evaluation,
          sr."createdAt",
          sr."updatedAt",
          s.id as "school_id",
          s.name as "school_name",
          s.type as "school_type",
          s.address as "school_address",
          u.id as "parent_id",
          u."firstName" as "parent_firstName",
          u."lastName" as "parent_lastName",
          u.email as "parent_email"
        FROM school_ratings sr
        LEFT JOIN schools s ON sr."schoolId" = s.id
        LEFT JOIN users u ON sr."parentId" = u.id
        ORDER BY sr."updatedAt" DESC
      `, {
        type: QueryTypes.SELECT,
      });

      // Transform raw results to match expected format
      ratings = Array.isArray(rawRatings) ? rawRatings.map(row => ({
        id: row.id,
        schoolId: row.schoolId || row.school_id,
        parentId: row.parentId || row.parent_id,
        stars: row.stars,
        comment: row.comment || null,
        evaluation: row.evaluation || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        school_id: row.school_id,
        school_name: row.school_name,
        school_type: row.school_type,
        school_address: row.school_address,
        parent_id: row.parent_id,
        parent_firstName: row.parent_firstName,
        parent_lastName: row.parent_lastName,
        parent_email: row.parent_email,
      })) : [];

      logger.info('Successfully fetched school ratings using raw query', {
        count: ratings.length,
      });
    } catch (queryError) {
      logger.error('Error querying school ratings', {
        error: queryError.message,
        stack: queryError.stack,
        adminId: req.user?.id,
      });
      // Return empty array if query fails
      return res.json({
        success: true,
        data: [],
      });
    }

    // Ensure ratings is an array
    if (!Array.isArray(ratings)) {
      logger.warn('Ratings is not an array', { ratings: typeof ratings });
      return res.json({
        success: true,
        data: [],
      });
    }

    // If no ratings, try to get all schools (even without ratings)
    if (ratings.length === 0) {
      logger.info('No ratings found, fetching all schools');
      try {
        const sequelize = SchoolRating.sequelize;

        // Try to get all schools, even if isActive column doesn't exist
        let allSchools = [];
        try {
          allSchools = await sequelize.query(`
            SELECT
              s.id,
              s.name,
              s.type,
              s.address
            FROM schools s
            WHERE s."isActive" = true
            ORDER BY s.name ASC
          `, {
            type: QueryTypes.SELECT,
          });
        } catch (activeError) {
          // If isActive column doesn't exist, try without it
          logger.warn('Error with isActive filter, trying without it', {
            error: activeError.message,
          });
          try {
            allSchools = await sequelize.query(`
              SELECT
                s.id,
                s.name,
                s.type,
                s.address
              FROM schools s
              ORDER BY s.name ASC
            `, {
              type: QueryTypes.SELECT,
            });
          } catch (allError) {
            logger.error('Error fetching all schools', {
              error: allError.message,
            });
            allSchools = [];
          }
        }

        logger.info('Fetched schools from database', {
          schoolsCount: Array.isArray(allSchools) ? allSchools.length : 0,
          firstSchool: Array.isArray(allSchools) && allSchools.length > 0 ? allSchools[0] : null,
        });

        const schoolsWithNoRatings = Array.isArray(allSchools) && allSchools.length > 0 ? allSchools.map(school => ({
          school: {
            id: school.id,
            name: school.name || 'Unknown School',
            type: school.type || 'both',
            address: school.address || null,
          },
          ratings: [],
          average: 0,
          count: 0,
        })) : [];

        logger.info('No ratings found, returning all schools', {
          schoolsCount: schoolsWithNoRatings.length,
        });

        return res.json({
          success: true,
          data: schoolsWithNoRatings,
        });
      } catch (schoolsError) {
        logger.error('Error fetching schools', {
          error: schoolsError.message,
          stack: schoolsError.stack,
        });
        return res.json({
          success: true,
          data: [],
        });
      }
    }

    // Group by school and calculate averages
    const schoolMap = new Map();

    for (const rating of ratings) {
      try {
        // Skip if school is missing
        const schoolId = rating.schoolId || rating.school_id;
        if (!schoolId) {
          continue;
        }

        // Get school data from raw query result
        const school = rating.school_id ? {
          id: rating.school_id,
          name: rating.school_name || null,
          type: rating.school_type || null,
          address: rating.school_address || null,
        } : null;

        // Get parent data from raw query result
        const ratingParent = rating.parent_id ? {
          id: rating.parent_id,
          firstName: rating.parent_firstName || null,
          lastName: rating.parent_lastName || null,
          email: rating.parent_email || null,
        } : null;

        if (!schoolMap.has(schoolId)) {
          const schoolData = {
            school: school || null,
            ratings: [],
            average: 0,
            count: 0,
          };
          schoolMap.set(schoolId, schoolData);
        }

        const schoolData = schoolMap.get(schoolId);

        // Add rating data - safely handle dates
        let createdAt = null;
        let updatedAt = null;
        try {
          if (rating.createdAt) {
            createdAt = rating.createdAt instanceof Date
              ? rating.createdAt.toISOString()
              : (typeof rating.createdAt === 'string' ? rating.createdAt : new Date(rating.createdAt).toISOString());
          }
          if (rating.updatedAt) {
            updatedAt = rating.updatedAt instanceof Date
              ? rating.updatedAt.toISOString()
              : (typeof rating.updatedAt === 'string' ? rating.updatedAt : new Date(rating.updatedAt).toISOString());
          }
        } catch (dateError) {
          logger.warn('Error parsing dates', { error: dateError.message });
        }

        const ratingData = {
          id: rating.id,
          stars: rating.stars || null,
          comment: rating.comment || null,
          evaluation: rating.evaluation || null,
          createdAt,
          updatedAt,
          parentName: ratingParent
            ? `${ratingParent.firstName || ''} ${ratingParent.lastName || ''}`.trim() || null
            : null,
          parentEmail: ratingParent?.email || null,
        };

        schoolData.ratings.push(ratingData);
      } catch (itemError) {
        logger.warn('Error processing rating item', {
          error: itemError.message,
          ratingId: rating?.id,
        });
        // Continue with next rating
      }
    }

    // Calculate averages
    const result = [];
    for (const [schoolId, schoolData] of schoolMap.entries()) {
      try {
        if (!schoolData.ratings || schoolData.ratings.length === 0) {
          result.push({
            ...schoolData,
            average: 0,
            count: 0,
          });
          continue;
        }

        const stars = schoolData.ratings
          .map(r => r.stars)
          .filter(s => s != null && !isNaN(s) && s >= 1 && s <= 5);

        const average = stars.length > 0
          ? parseFloat((stars.reduce((sum, s) => sum + s, 0) / stars.length).toFixed(1))
          : 0;

        result.push({
          ...schoolData,
          average,
          count: stars.length,
        });
      } catch (calcError) {
        logger.warn('Error calculating average', {
          error: calcError.message,
          schoolId,
        });
        result.push({
          ...schoolData,
          average: 0,
          count: 0,
        });
      }
    }

    logger.info('Get school ratings success', {
      adminId: req.user?.id,
      totalRatings: ratings.length,
      schoolsCount: result.length,
    });

    // Ensure we always return valid data
    const finalResult = Array.isArray(result) ? result : [];

    res.json({
      success: true,
      data: finalResult,
    });
  } catch (error) {
    logger.error('Get school ratings error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
    });

    // Always return success with empty array on error to prevent 500
    res.json({
      success: true,
      data: [],
    });
  }
};

/**
 * Get all schools with average ratings (Super Admin view)
 * GET /api/government/schools
 */
export const getAllSchools = async (req, res) => {
  try {
    const schools = await School.findAll({
      where: { isActive: true },
      include: [
        {
          model: SchoolRating,
          as: 'ratings',
          attributes: ['stars'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    // Calculate average ratings for each school
    const schoolsWithRatings = schools.map((school) => {
      const ratings = school.ratings || [];
      const stars = ratings.map(r => r.stars);
      const average = stars.length > 0
        ? (stars.reduce((sum, s) => sum + s, 0) / stars.length).toFixed(1)
        : 0;
      const count = stars.length;

      return {
        ...school.toJSON(),
        summary: {
          average: parseFloat(average),
          count,
        },
      };
    });

    res.json({
      success: true,
      data: schoolsWithRatings,
    });
  } catch (error) {
    logger.error('Get all schools error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};
