import User from '../../models/User.js';
import ParentMeal from '../../models/ParentMeal.js';
import Child from '../../models/Child.js';
import Meal from '../../models/Meal.js';
import logger from '../../utils/logger.js';
import { parsePagination } from '../../utils/pagination.js';
import { Op } from 'sequelize';

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
