import { Op } from 'sequelize';
import Meal from '../models/Meal.js';
import Child from '../models/Child.js';
import User from '../models/User.js';
import { createNotification } from './notificationController.js';
import { emitToUser } from '../config/socket.js';
import { validateChildAccess } from '../utils/schoolValidation.js';
import logger from '../utils/logger.js';

export const getMeals = async (req, res) => {
  try {
    const { date, mealType, limit, offset, childId } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const where = {};
    
    // If user is teacher, show only meals for children of assigned parents
    if (req.user.role === 'teacher') {
      // Get all parents assigned to this teacher
      const assignedParents = await User.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      
      if (assignedParents.length === 0) {
        return res.json([]);
      }
      
      const parentIds = assignedParents.map(p => p.id);
      
      // Get all children of assigned parents
      const children = await Child.findAll({
        where: { parentId: { [Op.in]: parentIds } },
        attributes: ['id'],
      });
      
      if (children.length === 0) {
        return res.json([]);
      }
      
      const childIds = children.map(c => c.id);
      
      if (childId) {
        // If childId is specified, verify it belongs to assigned parents
        if (!childIds.includes(childId)) {
          return res.status(403).json({ error: 'Access denied to this child' });
        }
        where.childId = childId;
      } else {
        // Show meals for all assigned children
        where.childId = { [Op.in]: childIds };
      }
    } else if (req.user.role === 'admin') {
      // Admin can see all meals
      if (childId) {
        where.childId = childId;
      }
      // If no childId, show all meals
    } else {
      // For parents, show meals for all their children or filter by childId
      const children = await Child.findAll({
        where: { parentId: req.user.id },
        attributes: ['id'],
      });

      if (children.length === 0) {
        return res.json([]);
      }

      const childIds = children.map(c => c.id);
      
      if (childId) {
        // If childId is specified, verify it belongs to the parent
        if (!childIds.includes(childId)) {
          return res.status(403).json({ error: 'Access denied to this child' });
        }
        where.childId = childId;
      } else {
        // Show meals for all children
        where.childId = { [Op.in]: childIds };
      }
    }
    
    if (date) {
      where.date = date;
    }

    if (mealType) {
      where.mealType = mealType;
    }

    const meals = await Meal.findAll({
      where,
      order: [['date', 'DESC'], ['time', 'DESC']],
      limit: limitNum,
      offset: offsetNum,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.json(Array.isArray(meals) ? meals : []);
  } catch (error) {
    logger.error('Get meals error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get meals' });
  }
};

export const getMeal = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };
    
    // If user is teacher, only show meals for children of assigned parents
    if (req.user.role === 'teacher') {
      // Get all parents assigned to this teacher
      const assignedParents = await User.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      
      if (assignedParents.length === 0) {
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      const parentIds = assignedParents.map(p => p.id);
      
      // Get all children of assigned parents
      const children = await Child.findAll({
        where: { parentId: { [Op.in]: parentIds } },
        attributes: ['id'],
      });
      
      if (children.length === 0) {
        return res.status(404).json({ error: 'Meal not found' });
      }
      
      const childIds = children.map(c => c.id);
      where.childId = { [Op.in]: childIds };
    } else if (req.user.role === 'admin') {
      // Admin can see all meals - no filter needed
    } else {
      const child = await Child.findOne({
        where: { parentId: req.user.id },
      });

      if (!child) {
        return res.status(404).json({ error: 'Child not found' });
      }
      where.childId = child.id;
    }

    const meal = await Meal.findOne({
      where,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json(meal);
  } catch (error) {
    logger.error('Get meal error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get meal' });
  }
};

// Create meal (teachers only)
export const createMeal = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers can create meals' });
    }

    const { childId, mealName, description, mealType, quantity, specialNotes, time, eaten, date } = req.body;

    if (!childId || !mealName || !description || !mealType || !date) {
      return res.status(400).json({ error: 'childId, mealName, description, mealType, and date are required' });
    }

    // Verify child exists and belongs to same school
    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    const meal = await Meal.create({
      childId,
      mealName,
      description,
      mealType,
      quantity: quantity || 'Full portion',
      specialNotes: specialNotes || '',
      time: time || '12:00',
      eaten: eaten !== undefined ? eaten : true,
      date,
    });

    const createdMeal = await Meal.findByPk(meal.id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    // Create notification for parent
    if (child.parentId) {
      await createNotification(
        child.parentId,
        childId,
        'meal',
        'Yangi taom qo\'shildi',
        `${child.firstName} uchun "${mealName}" taomi qo'shildi`,
        meal.id,
        'meal'
      );

      // Emit real-time update to parent
      emitToUser(child.parentId, 'meal:created', {
        meal: createdMeal.toJSON(),
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(createdMeal);
  } catch (error) {
    logger.error('Create meal error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create meal' });
  }
};

// Update meal (teachers only)
export const updateMeal = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers can update meals' });
    }

    const { id } = req.params;
    const meal = await Meal.findByPk(id);

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Get child for parent notification
    const child = await Child.findByPk(meal.childId);

    await meal.update(req.body);

    const updatedMeal = await Meal.findByPk(id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    // Emit real-time update to parent
    if (child && child.parentId) {
      emitToUser(child.parentId, 'meal:updated', {
        meal: updatedMeal.toJSON(),
        timestamp: new Date().toISOString(),
      });
    }

    res.json(updatedMeal);
  } catch (error) {
    logger.error('Update meal error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update meal' });
  }
};

// Delete meal (teachers only)
export const deleteMeal = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only teachers can delete meals' });
    }

    const { id } = req.params;
    const meal = await Meal.findByPk(id);

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Get child for parent notification before destroying
    const child = await Child.findByPk(meal.childId);
    const mealId = meal.id;

    await meal.destroy();

    // Emit real-time update to parent
    if (child && child.parentId) {
      emitToUser(child.parentId, 'meal:deleted', {
        mealId,
        childId: child.id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Meal deleted successfully' });
  } catch (error) {
    logger.error('Delete meal error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete meal' });
  }
};

