import EmotionalMonitoring from '../models/EmotionalMonitoring.js';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';

/**
 * Emotional Monitoring Controller
 * Handles weekly emotional monitoring journal entries
 * - Teachers can create/update monitoring records
 * - Parents can view monitoring records for their children
 */

/**
 * Create or update emotional monitoring record
 * POST /api/teacher/emotional-monitoring
 * PUT /api/teacher/emotional-monitoring/:id
 */
export const createOrUpdateMonitoring = async (req, res) => {
  try {
    const { childId, date, emotionalState, notes, teacherSignature } = req.body;
    const teacherId = req.user.id;
    const recordId = req.params.id; // For PUT requests

    // If PUT request with ID, update existing record
    if (req.method === 'PUT' && recordId) {
      const existingRecord = await EmotionalMonitoring.findByPk(recordId);
      
      if (!existingRecord) {
        return res.status(404).json({ error: 'Monitoring record not found' });
      }

      // Check authorization
      if (existingRecord.teacherId !== teacherId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'You do not have permission to update this record' });
      }

      // Update fields
      if (emotionalState !== undefined) existingRecord.emotionalState = emotionalState;
      if (notes !== undefined) existingRecord.notes = notes;
      if (teacherSignature !== undefined) existingRecord.teacherSignature = teacherSignature;
      if (date) existingRecord.date = date;
      
      await existingRecord.save();

      // Fetch with relations
      const recordWithRelations = await EmotionalMonitoring.findByPk(existingRecord.id, {
        include: [
          {
            model: Child,
            as: 'child',
            attributes: ['id', 'firstName', 'lastName'],
          },
          {
            model: User,
            as: 'teacher',
            attributes: ['id', 'firstName', 'lastName'],
          },
        ],
      });

      logger.info('Emotional monitoring record updated', {
        recordId: existingRecord.id,
        teacherId,
      });

      return res.json({
        success: true,
        message: 'Monitoring record updated successfully',
        data: recordWithRelations,
      });
    }

    // Validation for POST requests
    if (!childId || !date) {
      return res.status(400).json({ error: 'Child ID and date are required' });
    }

    // Check if child exists and teacher has access
    const child = await Child.findByPk(childId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Check if teacher has access to this child:
    //   • legacy direct parent.teacherId assignment, OR
    //   • the child's group is taught by this teacher (modern assignment)
    if (req.user.role !== 'admin' && req.user.role !== 'government') {
      const parent = await User.findOne({ where: { id: child.parentId, teacherId } });
      let allowed = !!parent;
      if (!allowed && child.groupId) {
        const group = await Group.findOne({ where: { id: child.groupId, teacherId } });
        allowed = !!group;
      }
      if (!allowed) {
        return res.status(403).json({ error: 'You do not have access to this child' });
      }
    }

    // Check if record exists for this date
    const existingRecord = await EmotionalMonitoring.findOne({
      where: {
        childId,
        date,
      },
    });

    let record;
    if (existingRecord) {
      // Update existing record
      existingRecord.emotionalState = emotionalState || existingRecord.emotionalState;
      existingRecord.notes = notes !== undefined ? notes : existingRecord.notes;
      existingRecord.teacherSignature = teacherSignature || existingRecord.teacherSignature;
      existingRecord.teacherId = teacherId;
      await existingRecord.save();
      record = existingRecord;
    } else {
      // Create new record
      record = await EmotionalMonitoring.create({
        childId,
        teacherId,
        date,
        emotionalState: emotionalState || {
          stable: false,
          positiveEmotions: false,
          noAnxiety: false,
          noHostility: false,
          calmResponse: false,
          showsEmpathy: false,
          quickRecovery: false,
          stableMood: false,
          trustingRelationship: false,
        },
        notes,
        teacherSignature,
      });
    }

    // Fetch with relations
    const recordWithRelations = await EmotionalMonitoring.findByPk(record.id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    logger.info('Emotional monitoring record created/updated', {
      recordId: record.id,
      childId,
      teacherId,
      date,
    });

    res.json({
      success: true,
      message: existingRecord ? 'Monitoring record updated successfully' : 'Monitoring record created successfully',
      data: recordWithRelations,
    });
  } catch (error) {
    logger.error('Create/update emotional monitoring error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create/update monitoring record' });
  }
};

/**
 * Get monitoring records for a child
 * GET /api/teacher/emotional-monitoring/child/:childId
 * GET /api/parent/emotional-monitoring/child/:childId
 */
export const getMonitoringByChild = async (req, res) => {
  try {
    const { childId } = req.params;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    // Check if child exists
    const child = await Child.findByPk(childId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    // Authorization check
    if (req.user.role === 'parent') {
      // Parent can only see their own children
      if (child.parentId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this child' });
      }
    } else if (req.user.role === 'teacher') {
      // Teacher can only see children of their assigned parents
      const parent = await User.findOne({
        where: { id: child.parentId, teacherId: req.user.id },
      });
      if (!parent) {
        return res.status(403).json({ error: 'You do not have access to this child' });
      }
    }

    const where = { childId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const { count, rows: records } = await EmotionalMonitoring.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: records,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Get monitoring by child error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch monitoring records' });
  }
};

/**
 * Get all monitoring records (for teacher dashboard)
 * GET /api/teacher/emotional-monitoring
 */
export const getAllMonitoring = async (req, res) => {
  try {
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    // Get all children assigned to this teacher
    const parents = await User.findAll({
      where: { teacherId: req.user.id, role: 'parent' },
      attributes: ['id'],
    });

    const parentIds = parents.map(p => p.id);
    
    const children = await Child.findAll({
      where: { parentId: { [Op.in]: parentIds } },
      attributes: ['id'],
    });

    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      return res.json({
        success: true,
        data: [],
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      });
    }

    const where = { childId: { [Op.in]: childIds } };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date[Op.gte] = startDate;
      if (endDate) where.date[Op.lte] = endDate;
    }

    const { count, rows: records } = await EmotionalMonitoring.findAndCountAll({
      where,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
      order: [['date', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      success: true,
      data: records,
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    logger.error('Get all monitoring error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch monitoring records' });
  }
};

/**
 * Get a single monitoring record
 * GET /api/teacher/emotional-monitoring/:id
 * GET /api/parent/emotional-monitoring/:id
 */
export const getMonitoringById = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await EmotionalMonitoring.findByPk(id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName', 'parentId'],
        },
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    if (!record) {
      return res.status(404).json({ error: 'Monitoring record not found' });
    }

    // Authorization check
    if (req.user.role === 'parent') {
      if (record.child.parentId !== req.user.id) {
        return res.status(403).json({ error: 'You do not have access to this record' });
      }
    } else if (req.user.role === 'teacher') {
      const parent = await User.findOne({
        where: { id: record.child.parentId, teacherId: req.user.id },
      });
      if (!parent) {
        return res.status(403).json({ error: 'You do not have access to this record' });
      }
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    logger.error('Get monitoring by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch monitoring record' });
  }
};

/**
 * Delete monitoring record
 * DELETE /api/teacher/emotional-monitoring/:id
 */
export const deleteMonitoring = async (req, res) => {
  try {
    const { id } = req.params;

    const record = await EmotionalMonitoring.findByPk(id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['parentId'],
        },
      ],
    });

    if (!record) {
      return res.status(404).json({ error: 'Monitoring record not found' });
    }

    // Check authorization
    if (record.teacherId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You do not have permission to delete this record' });
    }

    await record.destroy();

    logger.info('Emotional monitoring record deleted', {
      recordId: id,
      teacherId: req.user.id,
    });

    res.json({
      success: true,
      message: 'Monitoring record deleted successfully',
    });
  } catch (error) {
    logger.error('Delete monitoring error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete monitoring record' });
  }
};
