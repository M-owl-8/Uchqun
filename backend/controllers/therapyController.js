import Therapy from '../models/Therapy.js';
import TherapyUsage from '../models/TherapyUsage.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

/**
 * Get all therapies
 * GET /api/therapy
 */
export const getTherapies = async (req, res) => {
  try {
    const {
      therapyType,
      ageGroup,
      difficultyLevel,
      search,
      isActive,
    } = req.query;
    const { limit, offset } = parsePagination(req.query);

    const where = {};

    // Only filter by isActive if explicitly provided or default to true
    if (isActive !== undefined && isActive !== 'false') {
      where.isActive = isActive === 'true' || isActive === true;
    } else if (isActive === undefined) {
      // Default to active therapies if not specified
      where.isActive = true;
    }

    if (therapyType) {
      where.therapyType = therapyType;
    }

    if (ageGroup) {
      where.ageGroup = ageGroup;
    }

    if (difficultyLevel) {
      where.difficultyLevel = difficultyLevel;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const therapies = await Therapy.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      data: {
        therapies: therapies.rows || [],
        total: therapies.count || 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get therapies error', {
      error: error.message,
      stack: error.stack,
    });
    res.status(500).json({ error: 'Failed to get therapies' });
  }
};

/**
 * Get single therapy
 * GET /api/therapy/:id
 */
export const getTherapy = async (req, res) => {
  try {
    const { id } = req.params;

    const therapy = await Therapy.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'firstName', 'lastName'],
          required: false,
        },
      ],
    });

    if (!therapy) {
      return res.status(404).json({ error: 'Therapy not found' });
    }

    res.json({
      success: true,
      data: therapy,
    });
  } catch (error) {
    logger.error('Get therapy error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch therapy' });
  }
};

/**
 * Create therapy (Admin, Teacher)
 * POST /api/therapy
 */
export const createTherapy = async (req, res) => {
  try {
    const {
      title,
      description,
      therapyType,
      contentUrl,
      contentType,
      duration,
      ageGroup,
      difficultyLevel,
      tags,
      childId, // Optional: assign to child immediately
    } = req.body;

    if (!title || !therapyType) {
      return res.status(400).json({ error: 'Title and therapy type are required' });
    }

    // Safely process tags
    let processedTags = [];
    if (tags) {
      if (Array.isArray(tags)) {
        processedTags = tags;
      } else if (typeof tags === 'string') {
        processedTags = tags.split(',').map(t => t.trim()).filter(t => t);
      }
    }

    // Safely process duration
    let processedDuration = null;
    if (duration) {
      const parsed = parseInt(duration);
      if (!isNaN(parsed) && parsed > 0) {
        processedDuration = parsed;
      }
    }

    const therapy = await Therapy.create({
      title: title.trim(),
      description: description?.trim() || null,
      therapyType,
      contentUrl: contentUrl?.trim() || null,
      contentType: contentType || null,
      duration: processedDuration,
      ageGroup: ageGroup || 'all',
      difficultyLevel: difficultyLevel || 'all',
      tags: processedTags,
      createdBy: req.user.id,
    });

    // If childId is provided, automatically create therapy usage
    if (childId) {
      try {
        const child = await Child.findByPk(childId);
        if (child) {
          let parentId = child.parentId;
          let teacherId = null;

          if (req.user.role === 'teacher') {
            teacherId = req.user.id;
          }

          await TherapyUsage.create({
            therapyId: therapy.id,
            childId,
            parentId,
            teacherId,
            startTime: new Date(),
          });

          // Increment usage count
          await therapy.increment('usageCount');
        }
      } catch (usageError) {
        logger.warn('Failed to create therapy usage during therapy creation', {
          error: usageError.message,
          therapyId: therapy.id,
          childId,
        });
        // Don't fail the whole request if usage creation fails
      }
    }

    logger.info('Therapy created successfully', {
      therapyId: therapy.id,
      title: therapy.title,
      createdBy: req.user.id,
      childId: childId || null,
    });

    res.status(201).json({
      success: true,
      data: therapy,
    });
  } catch (error) {
    logger.error('Create therapy error', {
      error: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    
    // Provide more specific error messages
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        error: 'Validation error',
        details: error.errors?.map(e => e.message) || [error.message],
      });
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        error: 'Database error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    res.status(500).json({
      error: 'Failed to create therapy',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Start therapy session
 * POST /api/therapy/:id/start
 */
export const startTherapy = async (req, res) => {
  try {
    const { id } = req.params;
    const { childId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    const therapy = await Therapy.findByPk(id);
    if (!therapy) {
      return res.status(404).json({ error: 'Therapy not found' });
    }

    let parentId = null;
    let teacherId = null;

    // Verify child access based on user role
    if (childId) {
      const child = await Child.findByPk(childId);
      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }

      if (userRole === 'parent') {
        // Parent can only access their own children
        if (child.parentId !== userId) {
          return res.status(403).json({ error: 'Child not found or access denied' });
        }
        parentId = userId;
      } else if (userRole === 'teacher') {
        // Teacher can access children from their assigned parents
        const teacherGroups = await Group.findAll({
          where: { teacherId: userId },
          attributes: ['id'],
        });
        const groupIds = teacherGroups.map(g => g.id);
        
        const parent = await User.findOne({
          where: { 
            id: child.parentId,
            [Op.or]: [
              { teacherId: userId },
              ...(groupIds.length > 0 ? [{ groupId: { [Op.in]: groupIds } }] : [])
            ],
          },
        });
        
        if (!parent) {
          return res.status(403).json({ error: 'You do not have access to this child' });
        }
        teacherId = userId;
        parentId = child.parentId;
      } else if (userRole === 'admin') {
        // Admin can access any child
        parentId = child.parentId;
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      // No childId specified
      if (userRole === 'parent') {
        parentId = userId;
      } else if (userRole === 'teacher') {
        teacherId = userId;
      }
    }

    const usage = await TherapyUsage.create({
      therapyId: id,
      childId: childId || null,
      parentId,
      teacherId,
      startTime: new Date(),
    });

    // Update therapy usage count
    await therapy.increment('usageCount');

    res.status(201).json({
      success: true,
      data: usage,
    });
  } catch (error) {
    logger.error('Start therapy error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
      role: req.user?.role,
    });
    res.status(500).json({ error: 'Failed to start therapy' });
  }
};

/**
 * End therapy session
 * PUT /api/therapy/usage/:id/end
 */
export const endTherapy = async (req, res) => {
  try {
    const { id } = req.params;
    const { progress, notes, rating, feedback } = req.body;
    const userId = req.user.id;

    const usage = await TherapyUsage.findByPk(id);
    if (!usage) {
      return res.status(404).json({ error: 'Therapy usage not found' });
    }

    // Verify ownership
    if (usage.parentId !== userId && usage.teacherId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const endTime = new Date();
    const duration = Math.round((endTime - usage.startTime) / 1000 / 60); // minutes

    await usage.update({
      endTime,
      duration,
      progress,
      notes,
      rating,
      feedback,
    });

    // Update therapy rating if rating provided
    if (rating) {
      const therapy = await Therapy.findByPk(usage.therapyId);
      if (therapy) {
        const currentRating = parseFloat(therapy.rating) || 0;
        const currentCount = therapy.ratingCount || 0;
        const newCount = currentCount + 1;
        const newRating = ((currentRating * currentCount) + rating) / newCount;

        await therapy.update({
          rating: newRating.toFixed(2),
          ratingCount: newCount,
        });
      }
    }

    res.json({
      success: true,
      data: usage,
    });
  } catch (error) {
    logger.error('End therapy error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to end therapy' });
  }
};

/**
 * Update therapy (Admin, Teacher)
 * PUT /api/therapy/:id
 */
export const updateTherapy = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      therapyType,
      contentUrl,
      contentType,
      duration,
      ageGroup,
      difficultyLevel,
      tags,
      isActive,
    } = req.body;

    const therapy = await Therapy.findByPk(id);
    if (!therapy) {
      return res.status(404).json({ error: 'Therapy not found' });
    }

    // Verify ownership or admin role
    if (therapy.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await therapy.update({
      title: title || therapy.title,
      description: description !== undefined ? description : therapy.description,
      therapyType: therapyType || therapy.therapyType,
      contentUrl: contentUrl !== undefined ? contentUrl : therapy.contentUrl,
      contentType: contentType || therapy.contentType,
      duration: duration !== undefined ? parseInt(duration) : therapy.duration,
      ageGroup: ageGroup || therapy.ageGroup,
      difficultyLevel: difficultyLevel || therapy.difficultyLevel,
      tags: tags || therapy.tags,
      isActive: isActive !== undefined ? isActive : therapy.isActive,
    });

    res.json({
      success: true,
      data: therapy,
    });
  } catch (error) {
    logger.error('Update therapy error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update therapy' });
  }
};

/**
 * Delete therapy (Admin, Teacher)
 * DELETE /api/therapy/:id
 */
export const deleteTherapy = async (req, res) => {
  try {
    const { id } = req.params;

    const therapy = await Therapy.findByPk(id);
    if (!therapy) {
      return res.status(404).json({ error: 'Therapy not found' });
    }

    // Verify ownership or admin role
    if (therapy.createdBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    await therapy.destroy();

    res.json({
      success: true,
      message: 'Therapy deleted successfully',
    });
  } catch (error) {
    logger.error('Delete therapy error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete therapy' });
  }
};

/**
 * Get therapy usage history
 * GET /api/therapy/usage
 */
export const getTherapyUsage = async (req, res) => {
  try {
    const { childId, therapyId } = req.query;
    const { limit, offset } = parsePagination(req.query);
    const userId = req.user.id;

    const where = {};

    if (req.user.role === 'parent') {
      where.parentId = userId;
    } else if (req.user.role === 'teacher') {
      where.teacherId = userId;
    } else if (req.user.role === 'admin' && req.user.schoolId) {
      const schoolChildren = await Child.findAll({
        where: { schoolId: req.user.schoolId },
        attributes: ['id'],
      });
      where.childId = { [Op.in]: schoolChildren.map(c => c.id) };
    }

    if (childId) {
      where.childId = childId;
    }

    if (therapyId) {
      where.therapyId = therapyId;
    }

    const usages = await TherapyUsage.findAndCountAll({
      where,
      limit,
      offset,
      order: [['startTime', 'DESC']],
      include: [
        {
          model: Therapy,
          as: 'therapy',
          required: false,
        },
        {
          model: Child,
          as: 'child',
          required: false,
        },
      ],
    });

    res.json({
      success: true,
      data: {
        usages: usages.rows,
        total: usages.count,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get therapy usage error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch therapy usage' });
  }
};
