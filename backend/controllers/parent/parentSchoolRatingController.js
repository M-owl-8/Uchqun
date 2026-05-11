import User from '../../models/User.js';
import Child from '../../models/Child.js';
import School from '../../models/School.js';
import SchoolRating from '../../models/SchoolRating.js';
import logger from '../../utils/logger.js';
import { Op } from 'sequelize';
import { computeAverageRating } from '../../utils/governmentLevel.js';

export const rateSchool = async (req, res) => {
  logger.info('Rate school request received', {
    hasBody: !!req.body,
    bodyKeys: req.body ? Object.keys(req.body) : [],
    hasUser: !!req.user,
    userId: req.user?.id,
    userRole: req.user?.role,
  });

  try {
    if (!req.body || typeof req.body !== 'object') {
      logger.warn('Invalid request body shape', { bodyType: typeof req.body });
      return res.status(400).json({ error: 'Invalid request', message: 'Request body is required and must be a valid JSON object' });
    }

    const { schoolId, schoolName, stars, comment, evaluation } = req.body;
    const parentId = req.user?.id;

    if (!parentId) {
      logger.warn('Unauthenticated request to rate school');
      return res.status(401).json({ error: 'Authentication required', message: 'You must be logged in to rate a school' });
    }

    if (req.user?.role !== 'parent') {
      logger.warn('Non-parent user attempted to rate school', { userId: parentId, role: req.user?.role });
      return res.status(403).json({ error: 'Forbidden', message: 'Only parents can rate schools' });
    }

    if (stars === undefined || stars === null || stars === '') {
      logger.warn('Missing stars rating', { hasStars: false });
      return res.status(400).json({ error: 'Stars rating required', message: 'Please provide a star rating from 1 to 5' });
    }

    const starsNum = Number(stars);
    if (isNaN(starsNum)) return res.status(400).json({ error: 'Invalid stars rating', message: 'Stars rating must be a number' });
    if (!Number.isInteger(starsNum)) return res.status(400).json({ error: 'Invalid stars rating', message: 'Stars rating must be an integer' });
    if (starsNum < 1 || starsNum > 5) return res.status(400).json({ error: 'Invalid stars rating', message: 'Stars rating must be between 1 and 5' });

    let commentValue = null;
    if (comment !== undefined && comment !== null) {
      if (typeof comment !== 'string') return res.status(400).json({ error: 'Invalid comment', message: 'Comment must be a string' });
      commentValue = comment.trim() || null;
    }

    if (!schoolId && (!schoolName || typeof schoolName !== 'string' || schoolName.trim().length === 0)) {
      return res.status(400).json({ error: 'School identifier required', message: 'Either schoolId or schoolName must be provided' });
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (schoolId && !uuidRegex.test(schoolId)) {
      return res.status(400).json({ error: 'Invalid school ID format', message: 'School ID must be a valid UUID' });
    }

    let school = null;
    let finalSchoolId = schoolId;

    if (schoolId) {
      try {
        school = await School.findByPk(schoolId);
        if (!school) return res.status(404).json({ error: 'School not found', message: `No school found with ID: ${schoolId}` });
        finalSchoolId = school.id;
        if (req.user.schoolId && req.user.schoolId !== finalSchoolId) {
          return res.status(403).json({ error: 'You can only rate your own school' });
        }
      } catch (schoolError) {
        logger.error('Database error finding school by ID', { error: schoolError.message, stack: schoolError.stack, schoolId, parentId });
        return res.status(500).json({ error: 'Database error', message: 'Failed to find school. Please try again.' });
      }
    } else {
      const trimmedName = schoolName.trim();
      try {
        school = await School.findOne({ where: { name: { [Op.iLike]: trimmedName } } });
        if (!school) school = await School.findOne({ where: { name: { [Op.iLike]: `%${trimmedName}%` } } });

        if (school) {
          finalSchoolId = school.id;
        } else {
          try {
            school = await School.create({ name: trimmedName, type: 'both' });
            finalSchoolId = school.id;
          } catch (createError) {
            logger.error('Database error creating school', { error: createError.message, stack: createError.stack, schoolName: trimmedName, parentId });
            return res.status(500).json({ error: 'Database error', message: 'Failed to create school. Please try again.' });
          }
        }
      } catch (findError) {
        logger.error('Database error finding school by name', { error: findError.message, stack: findError.stack, schoolName: trimmedName, parentId });
        return res.status(500).json({ error: 'Database error', message: 'Failed to find or create school. Please try again.' });
      }
    }

    if (!finalSchoolId || !uuidRegex.test(finalSchoolId)) {
      logger.error('Invalid finalSchoolId after processing', { finalSchoolId, schoolId, schoolName, hasSchool: !!school });
      return res.status(500).json({ error: 'Internal error', message: 'Unable to identify school. Please try again.' });
    }

    try {
      const parent = await User.findByPk(parentId);
      if (!parent) return res.status(404).json({ error: 'User not found', message: 'Your account was not found. Please contact support.' });
    } catch (parentError) {
      logger.error('Database error verifying parent', { error: parentError.message, parentId });
      return res.status(500).json({ error: 'Database error', message: 'Failed to verify your account. Please try again.' });
    }

    let rating;
    try {
      rating = await SchoolRating.findOne({ where: { schoolId: finalSchoolId, parentId } });
      const evaluationValue = evaluation && typeof evaluation === 'object' ? evaluation : null;

      if (rating) {
        const updateData = { stars: starsNum, comment: commentValue };
        if (evaluationValue) updateData.evaluation = evaluationValue;
        await rating.update(updateData);
      } else {
        const createData = { schoolId: finalSchoolId, parentId, stars: starsNum, comment: commentValue };
        if (evaluationValue) createData.evaluation = evaluationValue;
        rating = await SchoolRating.create(createData);
      }
    } catch (ratingError) {
      if (ratingError.name === 'SequelizeUniqueConstraintError') {
        try {
          rating = await SchoolRating.findOne({ where: { schoolId: finalSchoolId, parentId } });
          if (rating) {
            rating.stars = starsNum;
            rating.comment = commentValue;
            await rating.save();
          } else {
            throw ratingError;
          }
        } catch (retryError) {
          logger.error('Failed to retry after constraint violation', { error: retryError.message });
          return res.status(409).json({ error: 'Conflict', message: 'A rating already exists for this school. Please try again.' });
        }
      } else if (ratingError.name === 'SequelizeForeignKeyConstraintError') {
        return res.status(400).json({ error: 'Invalid reference', message: 'School or parent reference is invalid.' });
      } else if (ratingError.name === 'SequelizeValidationError') {
        const msg = ratingError.errors?.map(e => e.message).join(', ') || ratingError.message;
        return res.status(400).json({ error: 'Validation error', message: msg });
      } else {
        logger.error('Database error saving rating', { error: ratingError.message, stack: ratingError.stack, errorName: ratingError.name });
        throw ratingError;
      }
    }

    try {
      const ratingData = rating.toJSON ? rating.toJSON() : rating.get({ plain: true });
      res.json({ success: true, message: 'School rating saved successfully', data: ratingData });
    } catch (jsonError) {
      logger.error('Error serializing rating', { error: jsonError.message, ratingId: rating?.id });
      res.json({ success: true, message: 'School rating saved successfully', data: { id: rating.id, schoolId: rating.schoolId, parentId: rating.parentId, stars: rating.stars } });
    }
  } catch (error) {
    logger.error('Unexpected error in rateSchool', {
      error: error.message, stack: error.stack, errorName: error.name, parentId: req.user?.id,
      originalError: error.original?.message, errors: error.errors?.map(e => ({ message: e.message, path: e.path })),
    });
    res.status(500).json({
      error: 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      ...(process.env.NODE_ENV === 'development' && { details: { message: error.message, name: error.name, originalError: error.original?.message } }),
    });
  }
};

export const getMySchoolRating = async (req, res) => {
  try {
    const parentId = req.user.id;
    const { childId } = req.query;
    let child = null;

    if (childId) {
      child = await Child.findOne({ where: { id: childId, parentId }, include: [{ model: School, as: 'childSchool', required: false }] });
      if (!child) return res.status(404).json({ success: false, error: 'Child not found or does not belong to you' });
    } else {
      const children = await Child.findAll({ where: { parentId }, include: [{ model: School, as: 'childSchool', required: false }] });
      if (children.length === 0) return res.json({ success: true, data: { rating: null, school: null, summary: { average: 0, count: 0 } } });
      child = children[0];
    }

    let school = null;
    let schoolId = null;

    if (child.schoolId) {
      schoolId = child.schoolId;
      school = child.childSchool;
    }

    if (!schoolId) {
      return res.json({ success: true, data: { rating: null, school: null, summary: { average: 0, count: 0 }, allRatings: [] } });
    }

    let rating = null;
    try {
      rating = await SchoolRating.findOne({ where: { schoolId, parentId } });
    } catch (ratingError) {
      logger.error('Error fetching parent school rating', { error: ratingError.message, schoolId, parentId });
    }

    let allRatings = [];
    try {
      allRatings = await SchoolRating.findAll({
        where: { schoolId },
        include: [{ model: User, as: 'ratingParent', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }],
        order: [['updatedAt', 'DESC']],
      });
    } catch (ratingsError) {
      logger.error('Error fetching school ratings', { error: ratingsError.message, schoolId });
    }

    let average = 0;
    let count = 0;
    if (allRatings.length > 0) {
      try {
        const ratingResult = computeAverageRating(allRatings);
        average = ratingResult.average;
        count = ratingResult.count;
      } catch (calcError) {
        logger.error('Error calculating school rating average', { error: calcError.message, schoolId });
      }
    }

    const formattedRatings = allRatings.map((r) => {
      try {
        return { ...r.toJSON(), parentName: r.ratingParent ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim() : null, parentEmail: r.ratingParent?.email || null };
      } catch { return r.toJSON(); }
    });

    res.json({ success: true, data: { rating: rating ? rating.toJSON() : null, school: school ? school.toJSON() : null, summary: { average: isNaN(average) ? 0 : Number(average), count }, allRatings: formattedRatings } });
  } catch (error) {
    logger.error('Get school rating error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch school rating' });
  }
};

export const getSchools = async (req, res) => {
  try {
    const schools = await School.findAll({ where: { isActive: true }, order: [['name', 'ASC']] });
    res.json({ success: true, data: schools.map(s => s.toJSON()) });
  } catch (error) {
    logger.error('Get schools error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};
