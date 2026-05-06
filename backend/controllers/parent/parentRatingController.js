import User from '../../models/User.js';
import Child from '../../models/Child.js';
import TeacherRating from '../../models/TeacherRating.js';
import School from '../../models/School.js';
import SchoolRating from '../../models/SchoolRating.js';
import logger from '../../utils/logger.js';
import { Op, fn, col } from 'sequelize';
import { computeAverageRating } from '../../utils/governmentLevel.js';

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

    const { schoolId, schoolName, stars, comment, evaluation } = req.body;

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

      const evaluationValue = evaluation && typeof evaluation === 'object' ? evaluation : null;

      if (rating) {
        // Update existing rating - only update fields that exist
        const updateData = {
          stars: starsNum,
          comment: commentValue,
        };
        if (evaluationValue) updateData.evaluation = evaluationValue;
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
        if (evaluationValue) createData.evaluation = evaluationValue;
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
