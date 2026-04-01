import User from '../models/User.js';
import Group from '../models/Group.js';
import ParentActivity from '../models/ParentActivity.js';
import ParentMeal from '../models/ParentMeal.js';
import ParentMedia from '../models/ParentMedia.js';
import Child from '../models/Child.js';
import TeacherRating from '../models/TeacherRating.js';
import School from '../models/School.js';
import SchoolRating from '../models/SchoolRating.js';
import SuperAdminMessage from '../models/SuperAdminMessage.js';
// Teacher-created data tables (linked to childId)
import Activity from '../models/Activity.js';
import Meal from '../models/Meal.js';
import Media from '../models/Media.js';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';
import { Op, fn, col } from 'sequelize';
import sequelize from '../config/database.js';
import { computeAverageRating } from '../utils/governmentLevel.js';

/**
 * Parent Controller
 * Handles Parent-specific operations:
 * - View own activities, meals, and media
 * - Parents only see data related to their own account
 */

/**
 * Get parent's children
 * GET /api/parent/children
 * 
 * Business Logic:
 * - Parents can view their own children
 */
export const getMyChildren = async (req, res) => {
  try {
    const children = await Child.findAll({
      where: { parentId: req.user.id },
      order: [['firstName', 'ASC']],
    });

    res.json({
      success: true,
      data: children,
    });
  } catch (error) {
    logger.error('Get my children error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch children' });
  }
};

/**
 * Get parent's activities (from their group)
 * GET /api/parent/activities
 *
 * Business Logic:
 * - Parents see ALL activities from their group (any child in same group)
 * - Queries teacher-created activities linked to children via groupId
 */
export const getMyActivities = async (req, res) => {
  try {
    const { activityType, startDate, endDate, childId } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    // Get parent's groupId
    const parent = await User.findByPk(req.user.id, { attributes: ['groupId'] });

    if (!parent || !parent.groupId) {
      // Fallback to legacy parent_activities if no group assigned
      const where = { parentId: req.user.id };

      if (activityType) {
        where.activityType = activityType;
      }

      if (startDate || endDate) {
        where.activityDate = {};
        if (startDate) where.activityDate[Op.gte] = new Date(startDate);
        if (endDate) where.activityDate[Op.lte] = new Date(endDate);
      }

      const activities = await ParentActivity.findAndCountAll({
        where,
        limit: limit,
        offset: offset,
        order: [['activityDate', 'DESC']],
      });

      return res.json({
        success: true,
        data: activities.rows,
        total: activities.count,
        limit: limit,
        offset: offset,
      });
    }

    const myChildren = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['id'],
    });
    const myChildIds = myChildren.map((child) => child.id);

    if (myChildIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: limit,
        offset: offset,
      });
    }

    if (childId && !myChildIds.includes(childId)) {
      return res.status(403).json({ error: 'You do not have access to this child' });
    }

    // Query teacher-created activities only for this parent's child(ren)
    const whereActivity = {};

    if (activityType) {
      whereActivity.type = activityType;
    }

    if (startDate || endDate) {
      whereActivity.date = {};
      if (startDate) whereActivity.date[Op.gte] = new Date(startDate);
      if (endDate) whereActivity.date[Op.lte] = new Date(endDate);
    }

    const activities = await Activity.findAndCountAll({
      where: whereActivity,
      include: [{
        model: Child,
        as: 'child',
        where: {
          id: childId ? childId : { [Op.in]: myChildIds },
        },
        attributes: ['id', 'firstName', 'lastName', 'photo'],
        required: true,
      }],
      limit: limit,
      offset: offset,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: activities.rows,
      total: activities.count,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    logger.error('Get my activities error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
};

/**
 * Get a specific activity
 * GET /api/parent/activities/:id
 */
export const getActivityById = async (req, res) => {
  try {
    const { id } = req.params;

    const activity = await ParentActivity.findOne({
      where: { id, parentId: req.user.id },
    });

    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    res.json({
      success: true,
      data: activity,
    });
  } catch (error) {
    logger.error('Get activity by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
};

/**
 * Get parent's meals (from their group)
 * GET /api/parent/meals
 *
 * Business Logic:
 * - Parents see ALL meals from their group (any child in same group)
 * - Queries teacher-created meals linked to children via groupId
 */
export const getMyMeals = async (req, res) => {
  try {
    const { mealType, startDate, endDate, childId } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    // Get parent's groupId
    const parent = await User.findByPk(req.user.id, { attributes: ['groupId'] });

    if (!parent || !parent.groupId) {
      // Fallback to legacy parent_meals if no group assigned
      const where = { parentId: req.user.id };

      if (mealType) {
        where.mealType = mealType;
      }

      if (startDate || endDate) {
        where.mealDate = {};
        if (startDate) where.mealDate[Op.gte] = new Date(startDate);
        if (endDate) where.mealDate[Op.lte] = new Date(endDate);
      }

      const meals = await ParentMeal.findAndCountAll({
        where,
        limit: limit,
        offset: offset,
        order: [['mealDate', 'DESC']],
      });

      return res.json({
        success: true,
        data: meals.rows,
        total: meals.count,
        limit: limit,
        offset: offset,
      });
    }

    const myChildren = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['id'],
    });
    const myChildIds = myChildren.map((child) => child.id);

    if (myChildIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: limit,
        offset: offset,
      });
    }

    if (childId && !myChildIds.includes(childId)) {
      return res.status(403).json({ error: 'You do not have access to this child' });
    }

    // Query teacher-created meals only for this parent's child(ren)
    const whereMeal = {};

    if (mealType) {
      whereMeal.mealType = mealType;
    }

    if (startDate || endDate) {
      whereMeal.date = {};
      if (startDate) whereMeal.date[Op.gte] = new Date(startDate);
      if (endDate) whereMeal.date[Op.lte] = new Date(endDate);
    }

    const meals = await Meal.findAndCountAll({
      where: whereMeal,
      include: [{
        model: Child,
        as: 'child',
        where: {
          id: childId ? childId : { [Op.in]: myChildIds },
        },
        attributes: ['id', 'firstName', 'lastName', 'photo'],
        required: true,
      }],
      limit: limit,
      offset: offset,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: meals.rows,
      total: meals.count,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    logger.error('Get my meals error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
};

/**
 * Get a specific meal
 * GET /api/parent/meals/:id
 */
export const getMealById = async (req, res) => {
  try {
    const { id } = req.params;

    const meal = await ParentMeal.findOne({
      where: { id, parentId: req.user.id },
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json({
      success: true,
      data: meal,
    });
  } catch (error) {
    logger.error('Get meal by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch meal' });
  }
};

/**
 * Get parent's media (from their group)
 * GET /api/parent/media
 *
 * Business Logic:
 * - Parents see ALL media from their group (any child in same group)
 * - Queries teacher-created media linked to children via groupId
 */
export const getMyMedia = async (req, res) => {
  try {
    const { fileType } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    // Get parent's groupId
    const parent = await User.findByPk(req.user.id, { attributes: ['groupId'] });

    if (!parent || !parent.groupId) {
      // Fallback to legacy parent_media if no group assigned
      const where = { parentId: req.user.id };

      if (fileType) {
        where.fileType = fileType;
      }

      const media = await ParentMedia.findAndCountAll({
        where,
        limit: limit,
        offset: offset,
        order: [['uploadDate', 'DESC']],
      });

      return res.json({
        success: true,
        data: media.rows,
        total: media.count,
        limit: limit,
        offset: offset,
      });
    }

    // Query teacher-created media for all children in the parent's group
    const whereMedia = {};

    if (fileType) {
      whereMedia.type = fileType;
    }

    const media = await Media.findAndCountAll({
      where: whereMedia,
      include: [{
        model: Child,
        as: 'child',
        where: { groupId: parent.groupId },
        attributes: ['id', 'firstName', 'lastName', 'photo'],
        required: true,
      }],
      limit: limit,
      offset: offset,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: media.rows,
      total: media.count,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    logger.error('Get my media error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};

/**
 * Get a specific media file
 * GET /api/parent/media/:id
 */
export const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;

    const media = await ParentMedia.findOne({
      where: { id, parentId: req.user.id },
    });

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json({
      success: true,
      data: media,
    });
  } catch (error) {
    logger.error('Get media by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};

/**
 * Get parent profile with summary
 * GET /api/parent/profile
 */
export const getMyProfile = async (req, res) => {
  try {
    // Fetch user with relationships (assigned teacher and group)
    const userWithRelations = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: User,
          as: 'assignedTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
          required: false,
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'description'],
          required: false,
        },
      ],
    });

    const activitiesCount = await ParentActivity.count({
      where: { parentId: req.user.id },
    });

    const mealsCount = await ParentMeal.count({
      where: { parentId: req.user.id },
    });

    const mediaCount = await ParentMedia.count({
      where: { parentId: req.user.id },
    });

    res.json({
      success: true,
      data: {
        user: userWithRelations.toJSON(),
        summary: {
          activitiesCount,
          mealsCount,
          mediaCount,
        },
      },
    });
  } catch (error) {
    logger.error('Get my profile error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

/**
 * Get parent data for viewing (used when clicking on parent in list)
 * GET /api/parent/:parentId/data
 * 
 * Business Logic:
 * - When viewing the list of parents, clicking on a parent should display:
 *   - Activity
 *   - Meals
 *   - Media
 * - This endpoint can be accessed by Admin or Reception to view parent data
 */
export const getParentData = async (req, res) => {
  try {
    const { parentId } = req.params;

    // Verify the user is a parent AND belongs to the same school
    const where = { id: parentId, role: 'parent' };
    if (req.user.schoolId) {
      where.schoolId = req.user.schoolId;
    }

    const parent = await User.findOne({
      where,
      attributes: { exclude: ['password'] },
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Get all parent data
    const [activities, meals, media] = await Promise.all([
      ParentActivity.findAll({
        where: { parentId: parentId },
        order: [['activityDate', 'DESC']],
        limit: 10,
      }),
      ParentMeal.findAll({
        where: { parentId: parentId },
        order: [['mealDate', 'DESC']],
        limit: 10,
      }),
      ParentMedia.findAll({
        where: { parentId: parentId },
        order: [['uploadDate', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        parent: parent.toJSON(),
        activities,
        meals,
        media,
      },
    });
  } catch (error) {
    logger.error('Get parent data error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent data' });
  }
};

/**
 * Rate assigned teacher
 * POST /api/parent/ratings
 * Body: { stars: 1-5, comment?: string }
 */
export const rateMyTeacher = async (req, res) => {
  try {
    const { stars, comment } = req.body;

    if (!stars || Number.isNaN(Number(stars))) {
      return res.status(400).json({ error: 'Stars is required' });
    }
    const starsNum = Number(stars);
    if (starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: 'Stars must be between 1 and 5' });
    }

    // Ensure parent has assigned teacher
    const parent = await User.findByPk(req.user.id);
    if (!parent || !parent.teacherId) {
      return res.status(400).json({ error: 'Assigned teacher not found' });
    }

    // Upsert rating
    const [rating, created] = await TeacherRating.findOrCreate({
      where: { teacherId: parent.teacherId, parentId: req.user.id },
      defaults: {
        teacherId: parent.teacherId,
        parentId: req.user.id,
        stars: starsNum,
        comment: comment || null,
      },
    });

    if (!created) {
      rating.stars = starsNum;
      rating.comment = comment || null;
      await rating.save();
    }

    // Update teacher's rating and totalRatings
    try {
      const allRatings = await TeacherRating.findAll({
        where: { teacherId: parent.teacherId },
        attributes: ['stars'],
      });

      const totalRatings = allRatings.length;
      const averageRating = totalRatings > 0
        ? allRatings.reduce((sum, r) => sum + (r.stars || 0), 0) / totalRatings
        : 0;

      await User.update(
        {
          rating: parseFloat(averageRating.toFixed(2)),
          totalRatings: totalRatings,
        },
        {
          where: { id: parent.teacherId },
        }
      );

      logger.info('Updated teacher rating', {
        teacherId: parent.teacherId,
        averageRating: parseFloat(averageRating.toFixed(2)),
        totalRatings,
      });
    } catch (updateError) {
      logger.error('Error updating teacher rating', {
        error: updateError.message,
        teacherId: parent.teacherId,
      });
      // Don't fail the request if rating update fails
    }

    res.json({
      success: true,
      message: 'Teacher rating saved successfully',
      data: rating.toJSON(),
    });
  } catch (error) {
    logger.error('Rate teacher error', { 
      error: error.message, 
      stack: error.stack,
      parentId: req.user?.id,
      teacherId: req.user?.teacherId,
    });
    res.status(500).json({ 
      error: 'Failed to rate teacher',
      message: 'An error occurred while saving the rating. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get parent's current rating and teacher average
 * GET /api/parent/ratings
 * Also returns all ratings from other parents for the same teacher
 */
export const getMyRating = async (req, res) => {
  try {
    const parent = await User.findByPk(req.user.id);

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    if (!parent.teacherId) {
      return res.status(400).json({ 
        error: 'Assigned teacher not found',
        data: {
          rating: null,
          summary: { average: 0, count: 0 },
          allRatings: []
        }
      });
    }

    // Get parent's own rating
    const rating = await TeacherRating.findOne({
      where: { teacherId: parent.teacherId, parentId: req.user.id },
    });

    // Get summary (average and count) - use aggregate functions safely
    let average = 0;
    let count = 0;
    
    try {
      const summaryRaw = await TeacherRating.findOne({
        where: { teacherId: parent.teacherId },
        attributes: [
          [fn('AVG', col('stars')), 'averageStars'],
          [fn('COUNT', col('id')), 'totalRatings'],
        ],
        raw: true,
      });

      average = summaryRaw?.averageStars
        ? Number(parseFloat(summaryRaw.averageStars).toFixed(2))
        : 0;
      count = summaryRaw?.totalRatings ? Number(summaryRaw.totalRatings) : 0;
    } catch (summaryError) {
      logger.warn('Error calculating rating summary', { 
        error: summaryError.message,
        teacherId: parent.teacherId 
      });
      // Continue with default values
    }

    // Get all ratings for this teacher with parent information
    let allRatings = [];
    let formattedRatings = [];
    
    try {
      allRatings = await TeacherRating.findAll({
        where: { teacherId: parent.teacherId },
        include: [
          {
            model: User,
            as: 'ratingParent',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
        order: [['updatedAt', 'DESC']],
      });

      // Format ratings with parent names
      formattedRatings = allRatings.map((r) => ({
        ...r.toJSON(),
        parentName: r.ratingParent
          ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim()
          : null,
        parentEmail: r.ratingParent?.email || null,
      }));
    } catch (ratingsError) {
      logger.warn('Error fetching all ratings', { 
        error: ratingsError.message,
        teacherId: parent.teacherId 
      });
      // Continue with empty array
    }

    logger.info('Get my rating response', {
      parentId: req.user.id,
      teacherId: parent.teacherId,
      ratingsCount: allRatings.length,
      formattedRatingsCount: formattedRatings.length,
      summary: { average, count },
    });

    res.json({
      success: true,
      data: {
        rating: rating ? rating.toJSON() : null,
        summary: {
          average,
          count,
        },
        allRatings: formattedRatings, // All ratings from all parents
      },
    });
  } catch (error) {
    logger.error('Get rating error', { 
      error: error.message, 
      stack: error.stack,
      parentId: req.user?.id,
      teacherId: req.user?.teacherId 
    });
    res.status(500).json({ 
      error: 'Failed to fetch rating',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get AI advice for parents
 * POST /api/parent/ai/chat
 * 
 * Business Logic:
 * - Parents can ask AI for advice about caring for their child at home
 * - AI provides advice about caring for children with disabilities
 * - Uses OpenAI API or fallback to rule-based responses
 */
/**
 * Rate a school (maktab yoki bog'cha)
 * POST /api/parent/school-rating
 */
export const rateSchool = async (req, res) => {
  // Log incoming request for debugging
  logger.info('Rate school request received', {
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasUser: !!req.user,
    userId: req.user?.id,
    userRole: req.user?.role,
  });

  try {
    // 1. Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      logger.warn('Invalid request body', { body: req.body });
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Request body is required and must be a valid JSON object',
      });
    }

    const { schoolId, schoolName, stars, comment } = req.body;

    // 2. Validate authentication
    const parentId = req.user?.id;
    if (!parentId) {
      logger.warn('Unauthenticated request to rate school');
      return res.status(401).json({
        error: 'Authentication required',
        message: 'You must be logged in to rate a school',
      });
    }

    // 3. Validate user role
    if (req.user?.role !== 'parent') {
      logger.warn('Non-parent user attempted to rate school', {
        userId: parentId,
        role: req.user?.role,
      });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only parents can rate schools',
      });
    }

    // 4. Validate stars rating
    if (stars === undefined || stars === null || stars === '') {
      logger.warn('Missing stars rating', { body: req.body });
      return res.status(400).json({
        error: 'Stars rating required',
        message: 'Please provide a star rating from 1 to 5',
      });
    }

    const starsNum = Number(stars);
    if (isNaN(starsNum)) {
      logger.warn('Invalid stars format', { stars, starsType: typeof stars });
      return res.status(400).json({
        error: 'Invalid stars rating',
        message: 'Stars rating must be a number',
      });
    }

    if (!Number.isInteger(starsNum)) {
      logger.warn('Stars not an integer', { stars, starsNum });
      return res.status(400).json({
        error: 'Invalid stars rating',
        message: 'Stars rating must be an integer',
      });
    }

    if (starsNum < 1 || starsNum > 5) {
      logger.warn('Stars out of range', { starsNum });
      return res.status(400).json({
        error: 'Invalid stars rating',
        message: 'Stars rating must be between 1 and 5',
      });
    }

    // 5. Validate comment if provided
    let commentValue = null;
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') {
        logger.warn('Invalid comment type', { comment, commentType: typeof comment });
        return res.status(400).json({
          error: 'Invalid comment',
          message: 'Comment must be a string',
        });
      }
      commentValue = comment.trim() || null;
    }

    // 6. Validate schoolId or schoolName is provided
    if (!schoolId && (!schoolName || typeof schoolName !== 'string' || schoolName.trim().length === 0)) {
      logger.warn('Missing school identifier', { schoolId, schoolName });
      return res.status(400).json({
        error: 'School identifier required',
        message: 'Either schoolId or schoolName must be provided',
      });
    }

    // 7. Validate UUID format if schoolId is provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (schoolId && !uuidRegex.test(schoolId)) {
      logger.warn('Invalid schoolId format', { schoolId });
      return res.status(400).json({
        error: 'Invalid school ID format',
        message: 'School ID must be a valid UUID',
      });
    }

    // 8. Find or create school
    let school = null;
    let finalSchoolId = schoolId;

    if (schoolId) {
      // Find school by ID
      try {
        school = await School.findByPk(schoolId);
        if (!school) {
          logger.warn('School not found by ID', { schoolId, parentId });
          return res.status(404).json({
            error: 'School not found',
            message: `No school found with ID: ${schoolId}`,
          });
        }
        finalSchoolId = school.id;
        logger.info('School found by ID', { schoolId: finalSchoolId, schoolName: school.name });

        // Validate parent belongs to this school
        if (req.user.schoolId && req.user.schoolId !== finalSchoolId) {
          return res.status(403).json({ error: 'You can only rate your own school' });
        }
      } catch (schoolError) {
        logger.error('Database error finding school by ID', {
          error: schoolError.message,
          stack: schoolError.stack,
          schoolId,
          parentId,
          errorName: schoolError.name,
        });
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to find school. Please try again.',
        });
      }
    } else {
      // Find or create school by name
      const trimmedName = schoolName.trim();
      try {
        // Try exact match first
        school = await School.findOne({
          where: {
            name: {
              [Op.iLike]: trimmedName,
            },
          },
        });

        // Try partial match if exact match fails
        if (!school) {
          school = await School.findOne({
            where: {
              name: {
                [Op.iLike]: `%${trimmedName}%`,
              },
            },
          });
        }

        if (school) {
          finalSchoolId = school.id;
          logger.info('School found by name', { schoolId: finalSchoolId, schoolName: school.name });
        } else {
          // Create new school
          try {
            school = await School.create({
              name: trimmedName,
              type: 'both',
            });
            finalSchoolId = school.id;
            logger.info('School created during rating', {
              schoolId: finalSchoolId,
              schoolName: school.name,
              parentId,
            });
          } catch (createError) {
            logger.error('Database error creating school', {
              error: createError.message,
              stack: createError.stack,
              schoolName: trimmedName,
              parentId,
              errorName: createError.name,
            });
            return res.status(500).json({
              error: 'Database error',
              message: 'Failed to create school. Please try again.',
            });
          }
        }
      } catch (findError) {
        logger.error('Database error finding school by name', {
          error: findError.message,
          stack: findError.stack,
          schoolName: trimmedName,
          parentId,
          errorName: findError.name,
        });
        return res.status(500).json({
          error: 'Database error',
          message: 'Failed to find or create school. Please try again.',
        });
      }
    }

    // 9. Final validation - ensure we have a valid schoolId
    if (!finalSchoolId || !uuidRegex.test(finalSchoolId)) {
      logger.error('Invalid finalSchoolId after processing', {
        finalSchoolId,
        schoolId,
        schoolName,
        hasSchool: !!school,
      });
      return res.status(500).json({
        error: 'Internal error',
        message: 'Unable to identify school. Please try again.',
      });
    }

    // 10. Verify parent exists in database
    try {
      const parent = await User.findByPk(parentId);
      if (!parent) {
        logger.error('Parent not found in database', { parentId });
        return res.status(404).json({
          error: 'User not found',
          message: 'Your account was not found. Please contact support.',
        });
      }
    } catch (parentError) {
      logger.error('Database error verifying parent', {
        error: parentError.message,
        parentId,
      });
      return res.status(500).json({
        error: 'Database error',
        message: 'Failed to verify your account. Please try again.',
      });
    }

    // 11. Create or update rating (using findOne + create/update for reliability)
    let rating;
    let created;
    try {
      // First try to find existing rating
      rating = await SchoolRating.findOne({
        where: {
          schoolId: finalSchoolId,
          parentId,
        },
      });

      if (rating) {
        // Update existing rating - only update fields that exist
        const updateData = {
          stars: starsNum,
          comment: commentValue,
        };
        await rating.update(updateData);
        created = false;
        logger.info('School rating updated', {
          ratingId: rating.id,
          schoolId: finalSchoolId,
          parentId,
          stars: starsNum,
        });
      } else {
        // Create new rating - only include fields that exist in database
        const createData = {
          schoolId: finalSchoolId,
          parentId,
          stars: starsNum,
          comment: commentValue,
        };
        rating = await SchoolRating.create(createData);
        created = true;
        logger.info('School rating created', {
          ratingId: rating.id,
          schoolId: finalSchoolId,
          parentId,
          stars: starsNum,
        });
      }
    } catch (ratingError) {
      // Handle specific database errors
      if (ratingError.name === 'SequelizeUniqueConstraintError') {
        logger.error('Unique constraint violation', {
          error: ratingError.message,
          schoolId: finalSchoolId,
          parentId,
        });
        // Try to find and update existing rating
        try {
          rating = await SchoolRating.findOne({
            where: {
              schoolId: finalSchoolId,
              parentId,
            },
          });
          if (rating) {
            rating.stars = starsNum;
            rating.comment = commentValue;
            await rating.save();
            logger.info('School rating updated after constraint violation', {
              ratingId: rating.id,
            });
          } else {
            throw ratingError;
          }
        } catch (retryError) {
          logger.error('Failed to retry after constraint violation', {
            error: retryError.message,
          });
          return res.status(409).json({
            error: 'Conflict',
            message: 'A rating already exists for this school. Please try again.',
          });
        }
      } else if (ratingError.name === 'SequelizeForeignKeyConstraintError') {
        logger.error('Foreign key constraint error', {
          error: ratingError.message,
          originalMessage: ratingError.original?.message,
          schoolId: finalSchoolId,
          parentId,
        });
        return res.status(400).json({
          error: 'Invalid reference',
          message: 'School or parent reference is invalid. Please check your data.',
        });
      } else if (ratingError.name === 'SequelizeValidationError') {
        const validationMessages = ratingError.errors?.map(e => e.message).join(', ') || ratingError.message;
        logger.error('Validation error', {
          error: validationMessages,
          errors: ratingError.errors,
        });
        return res.status(400).json({
          error: 'Validation error',
          message: validationMessages,
        });
      } else {
        logger.error('Database error saving rating', {
          error: ratingError.message,
          stack: ratingError.stack,
          errorName: ratingError.name,
          schoolId: finalSchoolId,
          parentId,
        });
        throw ratingError; // Re-throw to be caught by outer catch
      }
    }

    // 12. Safely serialize and return response
    try {
      const ratingData = rating.toJSON ? rating.toJSON() : rating.get({ plain: true });
      
      res.json({
        success: true,
        message: 'School rating saved successfully',
        data: ratingData,
      });
    } catch (jsonError) {
      logger.error('Error serializing rating to JSON', {
        error: jsonError.message,
        ratingId: rating?.id,
      });
      // Still return success but without full data
      res.json({
        success: true,
        message: 'School rating saved successfully',
        data: {
          id: rating.id,
          schoolId: rating.schoolId,
          parentId: rating.parentId,
          stars: rating.stars,
        },
      });
    }
  } catch (error) {
    // Catch-all error handler - should never reach here if all cases are handled above
    logger.error('Unexpected error in rateSchool', {
      error: error.message,
      stack: error.stack,
      errorName: error.name,
      errorCode: error.code,
      parentId: req.user?.id,
      body: req.body,
      originalError: error.original?.message,
      originalCode: error.original?.code,
      errors: error.errors?.map(e => ({ message: e.message, path: e.path, value: e.value })),
      sql: error.sql,
      parameters: error.parameters,
    });

    // Return error response with details for debugging (always include in response for now)
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      // Always include error details for debugging (remove in production after fixing)
      details: {
        message: error.message,
        name: error.name,
        originalError: error.original?.message,
        originalCode: error.original?.code,
        errors: error.errors?.map(e => ({ message: e.message, path: e.path })),
      },
    });
  }
};

/**
 * Get my school rating
 * GET /api/parent/school-rating?childId=xxx
 */
export const getMySchoolRating = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.query;

    let child = null;

    // If childId is provided, get that specific child
    if (childId) {
      child = await Child.findOne({
        where: {
          id: childId,
          parentId, // Ensure child belongs to this parent
        },
        include: [
          {
            model: School,
            as: 'childSchool',
            required: false,
          },
        ],
      });

      if (!child) {
        return res.status(404).json({
          success: false,
          error: 'Child not found or does not belong to you',
        });
      }
    } else {
      // If no childId, get parent's children to find their schools
      const children = await Child.findAll({
        where: { parentId },
        include: [
          {
            model: School,
            as: 'childSchool',
            required: false,
          },
        ],
      });

      if (children.length === 0) {
        return res.json({
          success: true,
          data: {
            rating: null,
            school: null,
            summary: { average: 0, count: 0 },
          },
        });
      }

      // Get school from first child (fallback to first child if no childId)
      child = children[0];
    }
    let school = null;
    let schoolId = null;

    if (child.schoolId) {
      schoolId = child.schoolId;
      school = child.childSchool;
    } else if (child.school && typeof child.school === 'string' && child.school.trim().length > 0) {
      // Find school by name (case-insensitive search)
      school = await School.findOne({
        where: {
          name: {
            [Op.iLike]: child.school,
          },
        },
      });
      
      if (school) {
        schoolId = school.id;
        // Update child's schoolId for future use
        try {
          await child.update({ schoolId: school.id });
        } catch (err) {
          logger.warn('Failed to update child schoolId', { childId: child.id, schoolId: school.id, error: err.message });
        }
      } else {
        // If school not found by exact name, try partial match
        const partialMatch = await School.findOne({
          where: {
            name: {
              [Op.iLike]: `%${child.school}%`,
            },
          },
        });
        
        if (partialMatch) {
          school = partialMatch;
          schoolId = partialMatch.id;
          // Update child's schoolId
          try {
            await child.update({ schoolId: partialMatch.id });
          } catch (err) {
            logger.warn('Failed to update child schoolId', { childId: child.id, schoolId: partialMatch.id, error: err.message });
          }
        }
      }
    }

    // If school not found but child has school name, return school name for display
    if (!schoolId && child?.school && typeof child.school === 'string' && child.school.trim().length > 0) {
      logger.info('School not found in database, returning school name from child', {
        childId: child?.id,
        childSchool: child.school,
        parentId,
      });
      return res.json({
        success: true,
        data: {
          rating: null,
          school: {
            id: null,
            name: child.school,
            address: null,
            phone: null,
            email: null,
            type: null,
          },
          summary: { average: 0, count: 0 },
          allRatings: [],
        },
      });
    }

    if (!schoolId) {
      return res.json({
        success: true,
        data: {
          rating: null,
          school: null,
          summary: { average: 0, count: 0 },
          allRatings: [],
        },
      });
    }

    // Get parent's rating for this school
    let rating = null;
    try {
      rating = await SchoolRating.findOne({
        where: {
          schoolId,
          parentId,
        },
      });
    } catch (ratingError) {
      logger.error('Error fetching parent school rating', {
        error: ratingError.message,
        stack: ratingError.stack,
        schoolId,
        parentId,
      });
      rating = null; // Continue with null rating if fetch fails
    }

    // Get all ratings for this school with parent info
    let allRatings = [];
    try {
      allRatings = await SchoolRating.findAll({
        where: { schoolId },
        include: [
          {
            model: User,
            as: 'ratingParent',
            attributes: ['id', 'firstName', 'lastName', 'email'],
            required: false,
          },
        ],
        order: [['updatedAt', 'DESC']],
      });
    } catch (ratingsError) {
      logger.error('Error fetching school ratings', {
        error: ratingsError.message,
        stack: ratingsError.stack,
        schoolId,
      });
      allRatings = []; // Default to empty array if fetch fails
    }

    // Calculate average rating using the utility function
    let average = 0;
    let count = 0;
    
    if (allRatings.length > 0) {
      try {
        const ratingResult = computeAverageRating(allRatings);
        average = ratingResult.average;
        count = ratingResult.count;
      } catch (calcError) {
        logger.error('Error calculating school rating average', {
          error: calcError.message,
          stack: calcError.stack,
          schoolId,
          ratingsCount: count,
        });
        average = 0; // Default to 0 if calculation fails
      }
    }

    // Format ratings with parent names
    let formattedRatings = [];
    try {
      formattedRatings = allRatings.map((r) => {
        try {
          return {
            ...r.toJSON(),
            parentName: r.ratingParent
              ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim()
              : null,
            parentEmail: r.ratingParent?.email || null,
          };
        } catch (mapError) {
          logger.warn('Error formatting rating', {
            error: mapError.message,
            ratingId: r?.id,
          });
          return r.toJSON(); // Return basic rating if formatting fails
        }
      });
    } catch (formatError) {
      logger.error('Error formatting ratings', {
        error: formatError.message,
        stack: formatError.stack,
      });
      formattedRatings = allRatings.map(r => r.toJSON()); // Fallback to basic JSON
    }

    logger.info('Get school rating response', {
      parentId,
      childId: child?.id,
      schoolId,
      schoolName: school?.name || child?.school || 'Unknown',
      hasRating: !!rating,
      ratingsCount: count,
    });

    res.json({
      success: true,
      data: {
        rating: rating ? rating.toJSON() : null,
        school: school ? school.toJSON() : null,
        summary: {
          average: isNaN(average) ? 0 : Number(average),
          count,
        },
        allRatings: formattedRatings,
      },
    });
  } catch (error) {
    logger.error('Get school rating error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch school rating' });
  }
};

/**
 * Get all schools (for parent to select)
 * GET /api/parent/schools
 */
export const getSchools = async (req, res) => {
  try {
    const schools = await School.findAll({
      where: { isActive: true },
      order: [['name', 'ASC']],
    });

    res.json({
      success: true,
      data: schools.map(s => s.toJSON()),
    });
  } catch (error) {
    logger.error('Get schools error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

export const getAIAdvice = async (req, res) => {
  try {
    const { message, childInfo } = req.body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get parent's children info for context
    const children = await Child.findAll({
      where: { parentId: req.user.id },
      attributes: ['firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'specialNeeds'],
      limit: 1,
    });

    const child = children.length > 0 ? children[0] : null;

    // Prepare context for AI
    const context = {
      parentName: `${req.user.firstName} ${req.user.lastName}`,
      child: child ? {
        name: `${child.firstName} ${child.lastName}`,
        age: child.dateOfBirth ? Math.floor((new Date() - new Date(child.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
        gender: child.gender,
        disabilityType: child.disabilityType,
        specialNeeds: child.specialNeeds,
      } : null,
      message: message.trim(),
    };

    // Determine preferred language from headers (fallback to en)
    const acceptLanguage = req.headers['accept-language'] || '';
    const requestedLang = (req.body?.lang || '').toLowerCase();
    const langCode = (requestedLang || acceptLanguage.split(',')[0]?.split('-')[0] || 'en').toLowerCase();
    const languageName = {
      uz: 'Uzbek',
      ru: 'Russian',
      en: 'English',
    }[langCode] || 'English';

    // Build prompts once (used for primary call and free-model fallback)
    const systemPrompt = `You are a helpful, conversational AI assistant specialized in providing advice to parents of children with special needs and disabilities. 
You provide practical, empathetic, and evidence-based advice about:
- How to care for children with disabilities at home
- Daily routines and activities
- Nutrition and meal planning
- Communication strategies
- Behavioral support
- Emotional support for both children and parents
- Safety considerations
- Educational activities at home

Always respond in a warm, supportive, and professional manner. If the parent mentions their child's specific disability type or special needs, incorporate that into your advice.
Keep responses concise (2-4 sentences) in ${languageName}. You may ask one brief follow-up question if it helps clarify, but stay short. Do not switch languages. If ${languageName} is Russian, respond in Cyrillic Russian. If ${languageName} is Uzbek, respond in Uzbek. Never answer in English unless ${languageName} is English.`;

    const userPrompt = child
      ? `Parent: ${context.parentName}
Child: ${context.child.name} (${context.child.age} years old, ${context.child.gender})
Disability Type: ${context.child.disabilityType || 'Not specified'}
Special Needs: ${context.child.specialNeeds || 'None specified'}

Parent's Question: ${context.message}

Please provide helpful, practical advice.`
      : `Parent: ${context.parentName}

Parent's Question: ${context.message}

Please provide helpful, practical advice about caring for children with special needs.`;

    // Build chat history (if provided) to enable conversation
    const incomingMessages = Array.isArray(req.body?.messages) ? req.body.messages : null;
    const sanitizedHistory = (incomingMessages || [])
      .filter(m => m && m.role && m.content)
      .slice(-8) // keep last 8 exchanges
      .map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content).slice(0, 4000), // guard length
      }));

    const openaiMessages = [
      { role: 'system', content: systemPrompt },
      ...(sanitizedHistory.length
        ? sanitizedHistory
        : [{ role: 'user', content: userPrompt }]),
    ];

    // Try to use OpenAI/OpenRouter API if available
    let aiResponse;
    const hasOpenAIKey = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
    const isOpenRouter = process.env.OPENAI_BASE_URL && process.env.OPENAI_BASE_URL.includes('openrouter.ai');
    
    logger.info('AI chat request', {
      parentId: req.user.id,
      hasOpenAIKey,
      isOpenRouter,
      messageLength: message.trim().length,
    });
    
    if (hasOpenAIKey) {
      try {
        const OpenAI = (await import('openai')).default;
        const openaiConfig = {
          apiKey: process.env.OPENAI_API_KEY,
        };
        
        // If OpenRouter base URL is provided, use it
        if (isOpenRouter) {
          openaiConfig.baseURL = process.env.OPENAI_BASE_URL;
          // OpenRouter requires HTTP headers
          openaiConfig.defaultHeaders = {
            'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production.up.railway.app',
            'X-Title': 'Uchqun Parent Portal',
          };
        }
        
        const openai = new OpenAI(openaiConfig);

        // Determine model to use
        let modelToUse = process.env.OPENAI_MODEL;
        
        // If using OpenRouter and no specific model set, use a free model
        if (isOpenRouter && !modelToUse) {
          // Try free models available on OpenRouter
          modelToUse = 'qwen/qwen-2.5-7b-instruct:free';
        }

        const completion = await openai.chat.completions.create({
          model: modelToUse,
          messages: openaiMessages,
          temperature: 0.7,
          max_tokens: 500,
        });

        aiResponse = completion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
        
        logger.info('OpenAI API response generated successfully', {
          parentId: req.user.id,
          messageLength: context.message.length,
          responseLength: aiResponse.length,
          model: modelToUse,
        });
      } catch (openaiError) {
        logger.error('OpenAI API error', { 
          error: openaiError.message,
          stack: openaiError.stack,
          parentId: req.user.id,
          isOpenRouter,
        });
        
        // If OpenRouter and insufficient credits or model not found, try to get available models
        if (isOpenRouter && (openaiError.message.includes('402') || openaiError.message.includes('404') || openaiError.message.includes('credits'))) {
          // Try to fetch available models from OpenRouter API
          try {
            logger.info('Fetching available models from OpenRouter');
            const response = await fetch('https://openrouter.ai/api/v1/models', {
              headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production.up.railway.app',
                'X-Title': 'Uchqun Parent Portal',
              },
            });
            
            if (response.ok) {
              const modelsData = await response.json();
              const freeModels = modelsData.data
                ?.filter(model => model.pricing?.prompt === '0' || model.id.includes(':free'))
                ?.map(model => model.id)
                ?.slice(0, 5) || [];
              
              logger.info(`Found ${freeModels.length} free models on OpenRouter`, { models: freeModels });
              
              // Try free models
              for (const freeModel of freeModels) {
                try {
                  logger.info(`Trying free OpenRouter model: ${freeModel}`);
                  const OpenAI = (await import('openai')).default;
                  const openaiFree = new OpenAI({
                    apiKey: process.env.OPENAI_API_KEY,
                    baseURL: process.env.OPENAI_BASE_URL,
                    defaultHeaders: {
                      'HTTP-Referer': process.env.FRONTEND_URL?.split(',')[0] || 'https://uchqun-production.up.railway.app',
                      'X-Title': 'Uchqun Parent Portal',
                    },
                  });

                  const freeCompletion = await openaiFree.chat.completions.create({
                    model: freeModel,
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_tokens: 500,
                  });

                  aiResponse = freeCompletion.choices[0]?.message?.content || 'I apologize, but I could not generate a response. Please try again.';
                  
                  logger.info('Free OpenRouter model response generated successfully', {
                    parentId: req.user.id,
                    responseLength: aiResponse.length,
                    model: freeModel,
                  });
                  break; // Success, exit loop
                } catch (freeModelError) {
                  logger.warn(`Free model ${freeModel} failed`, { 
                    error: freeModelError.message,
                  });
                  // Continue to next model
                }
              }
              
              // If no free models worked, use fallback
              if (!aiResponse || aiResponse === 'I apologize, but I could not generate a response. Please try again.') {
                logger.warn('No free models worked, using fallback');
                aiResponse = generateFallbackResponse(context);
              }
            } else {
              logger.warn('Could not fetch OpenRouter models, using fallback');
              aiResponse = generateFallbackResponse(context);
            }
          } catch (fetchError) {
            logger.error('Error fetching OpenRouter models', { error: fetchError.message });
            // Fallback to rule-based response
            aiResponse = generateFallbackResponse(context);
          }
        } else {
          // Fallback to rule-based response
          aiResponse = generateFallbackResponse(context);
        }
      }
    } else {
      // Fallback to rule-based response if OpenAI is not configured
      aiResponse = generateFallbackResponse(context);
    }

    res.json({
      success: true,
      data: {
        message: context.message,
        response: aiResponse,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Get AI advice error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get AI advice' });
  }
};

/**
 * Generate fallback response when OpenAI is not available
 */
function generateFallbackResponse(context) {
  const message = context.message.toLowerCase();
  const child = context.child;

  // Basic keyword-based responses
  if (message.includes('uy') || message.includes('home') || message.includes('qanday qarash') || message.includes('care')) {
    return `Uyda bolangizni parvarish qilish uchun quyidagi maslahatlarni amalga oshirishingiz mumkin:

1. **Kun tartibi yarating**: Har kuni bir xil vaqtda uyg'onish, ovqatlanish va uxlash vaqtlarini belgilang. Bu bolangizga tushunish va kutilishni o'rgatadi.

2. **Xavfsiz muhit yarating**: Uy atrofida xavfsizlikni ta'minlang - burchaklar, o'tkir narsalar va xavfli materiallarni olib tashlang.

3. **Muloqotni rag'batlantiring**: Bolangiz bilan muntazam ravishda gaplashing, ertak o'qing va qo'shiq aytib bering. Bu til rivojlanishiga yordam beradi.

4. **Faol o'yinlar**: Bolangizning yoshiga va qobiliyatlariga mos o'yinlar va mashg'ulotlar tashkil qiling.

5. **Sabr va muhabbat**: Eng muhimi - bolangizga sabr va muhabbat bilan yondashing. Har bir kichik yutuqni nishonlang.

Agar bolangizning maxsus ehtiyojlari bo'lsa, ularni hisobga oling va tegishli mutaxassislar bilan maslahatlashing.`;
  }

  if (message.includes('nogiron') || message.includes('disability') || message.includes('maxsus')) {
    return `Nogironligi bor bolani parvarish qilishda quyidagilarni yodda tuting:

1. **Individual yondashuv**: Har bir bola boshqacha, shuning uchun bolangizning ehtiyojlariga mos yondashuvni toping.

2. **Professional yordam**: Mutaxassislar (logoped, psixolog, fizioterapevt) bilan muntazam aloqada bo'ling.

3. **Mashg'ulotlar**: Uyda professional tavsiyalar asosida mashg'ulotlar o'tkazing.

4. **Oilaviy qo'llab-quvvatlash**: Barcha oila a'zolari bolangizni qo'llab-quvvatlashda ishtirok etishi kerak.

5. **O'z-o'ziga g'amxo'rlik**: O'zingizga ham vaqt ajrating - dam oling va qo'llab-quvvatlovchi oila a'zolari yoki do'stlar bilan aloqada bo'ling.

6. **Muvaffaqiyatlarni nishonlash**: Kichik yutuqlarni ham katta muvaffaqiyat sifatida qabul qiling.

Agar aniq savollaringiz bo'lsa, mutaxassislar bilan maslahatlashing.`;
  }

  if (message.includes('ovqat') || message.includes('meal') || message.includes('nutrition') || message.includes('parvarish')) {
    return `Bolangizning ovqatlanishi uchun maslahatlar:

1. **Muntazam ovqatlanish**: Kuniga 3-4 marta muntazam ovqat berish bolangizning sog'lig'i uchun muhim.

2. **Balanslangan ovqat**: Meva, sabzavot, protein va karbohidratlarni muvozanatlashtiring.

3. **Maxsus ehtiyojlar**: Agar bolangizning allergiyasi yoki maxsus dietasi bo'lsa, uni qat'iy rioya qiling.

4. **Sabr**: Ba'zi bolalar ovqatlanishda qiyinchiliklarga duch kelishi mumkin. Sabr bilan yondashing.

5. **Ijodkorlik**: Ovqatni qiziqarli va jozibali qilib taqdim eting - rangli idishlar, qiziqarli shakllar.

Agar ovqatlanish bilan bog'liq muammolaringiz bo'lsa, dietolog yoki pediatr bilan maslahatlashing.`;
  }

  // Default response
  return `Rahmat, savolingizni qabul qildim. Bolangizni uyda parvarish qilish haqida quyidagi umumiy maslahatlarni berishim mumkin:

1. **Muntazam kun tartibi**: Har kuni bir xil vaqtda uyg'onish, ovqatlanish va uxlash vaqtlarini belgilang.

2. **Xavfsiz muhit**: Uy atrofida xavfsizlikni ta'minlang va bolangizning yoshiga mos o'yinchoqlar va materiallar tayyorlang.

3. **Muloqot va o'yin**: Bolangiz bilan muntazam ravishda gaplashing, ertak o'qing va o'yinlar o'tkazing.

4. **Professional yordam**: Mutaxassislar bilan muntazam aloqada bo'ling va ularning tavsiyalarini amalga oshiring.

5. **Sabr va muhabbat**: Eng muhimi - bolangizga sabr va muhabbat bilan yondashing.

Agar aniq savollaringiz bo'lsa, iltimos, batafsilroq yozing va men sizga yanada aniq maslahat beraman.`;
}

/**
 * Get parent's messages to super-admin
 * GET /api/parent/messages
 * 
 * Business Logic:
 * - Parents can view their own messages sent to super-admin
 * - Includes replies from super-admin
 */
export const getMyMessages = async (req, res) => {
  try {
    const messages = await SuperAdminMessage.findAll({
      where: { senderId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: messages.map(m => m.toJSON()),
    });
  } catch (error) {
    logger.error('Get my messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

