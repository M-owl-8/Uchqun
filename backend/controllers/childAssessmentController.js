import ChildAssessment from '../models/ChildAssessment.js';
import User from '../models/User.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

const VALID_CATEGORIES = ['cognitive', 'motor', 'speech', 'behavior', 'social', 'self_care'];

/**
 * Get assessments for a child
 * GET /api/assessments?childId=xxx&category=xxx&limit=xxx
 */
export const getAssessments = async (req, res) => {
  try {
    const { childId, category, limit = 50 } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const where = { childId };

    if (category) {
      if (!VALID_CATEGORIES.includes(category)) {
        return res.status(400).json({ error: 'Invalid category' });
      }
      where.category = category;
    }

    const assessments = await ChildAssessment.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: Math.min(parseInt(limit) || 50, 200),
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.json({ data: assessments });
  } catch (error) {
    logger.error('Error getting assessments:', { error: error.message });
    res.status(500).json({ error: 'Failed to get assessments' });
  }
};

/**
 * Get latest assessment per category for a child
 * GET /api/assessments/latest?childId=xxx
 */
export const getLatestAssessments = async (req, res) => {
  try {
    const { childId } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    // Get the latest assessment for each category
    const assessments = await ChildAssessment.findAll({
      where: {
        childId,
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT ca.id FROM child_assessments ca
            INNER JOIN (
              SELECT child_id, category, MAX(date) as max_date
              FROM child_assessments
              WHERE child_id = '${childId}'
              GROUP BY child_id, category
            ) latest ON ca.child_id = latest.child_id
              AND ca.category = latest.category
              AND ca.date = latest.max_date
          )`),
        },
      },
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['category', 'ASC']],
    });

    res.json({ data: assessments });
  } catch (error) {
    logger.error('Error getting latest assessments:', { error: error.message });
    res.status(500).json({ error: 'Failed to get latest assessments' });
  }
};

/**
 * Create a new assessment
 * POST /api/assessments
 */
export const createAssessment = async (req, res) => {
  try {
    const { childId, category, score, notes, date } = req.body;

    if (!childId || !category || score === undefined) {
      return res.status(400).json({ error: 'childId, category, and score are required' });
    }

    if (!VALID_CATEGORIES.includes(category)) {
      return res.status(400).json({ error: 'Invalid category' });
    }

    const scoreNum = parseInt(score);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
      return res.status(400).json({ error: 'Score must be between 1 and 5' });
    }

    // Verify child exists and belongs to same school
    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    const assessmentDate = date || new Date().toISOString().split('T')[0];

    // Check for existing assessment (same child, category, date) - upsert
    const existing = await ChildAssessment.findOne({
      where: { childId, category, date: assessmentDate },
    });

    if (existing) {
      // Update existing
      existing.score = scoreNum;
      existing.notes = notes || existing.notes;
      existing.teacherId = req.user.id;
      await existing.save();

      const updated = await ChildAssessment.findByPk(existing.id, {
        include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }],
      });

      return res.json({ data: updated, message: 'Assessment updated' });
    }

    const assessment = await ChildAssessment.create({
      childId,
      teacherId: req.user.id,
      category,
      score: scoreNum,
      notes: notes || null,
      date: assessmentDate,
    });

    const created = await ChildAssessment.findByPk(assessment.id, {
      include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }],
    });

    res.status(201).json({ data: created, message: 'Assessment created' });
  } catch (error) {
    logger.error('Error creating assessment:', { error: error.message });
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ error: 'Assessment already exists for this child, category, and date' });
    }
    res.status(500).json({ error: 'Failed to create assessment' });
  }
};

/**
 * Update an assessment
 * PUT /api/assessments/:id
 */
export const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;
    const { score, notes } = req.body;

    const assessment = await ChildAssessment.findByPk(id);
    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    // Only the teacher who created it or an admin can update
    if (assessment.teacherId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only update your own assessments' });
    }

    if (score !== undefined) {
      const scoreNum = parseInt(score);
      if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
        return res.status(400).json({ error: 'Score must be between 1 and 5' });
      }
      assessment.score = scoreNum;
    }

    if (notes !== undefined) {
      assessment.notes = notes;
    }

    await assessment.save();

    const updated = await ChildAssessment.findByPk(id, {
      include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }],
    });

    res.json({ data: updated, message: 'Assessment updated' });
  } catch (error) {
    logger.error('Error updating assessment:', { error: error.message });
    res.status(500).json({ error: 'Failed to update assessment' });
  }
};
