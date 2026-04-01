import { Op } from 'sequelize';
import MealPlan from '../models/MealPlan.js';
import Child from '../models/Child.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

const VALID_MEAL_TYPES = ['breakfast', 'lunch', 'snack', 'dinner'];

/**
 * Get meal plans for a child within a date range
 * GET /api/meal-plans?childId=xxx&startDate=2026-04-01&endDate=2026-04-07
 */
export const getMealPlans = async (req, res) => {
  try {
    const { childId, startDate, endDate } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const where = { childId };

    if (startDate && endDate) {
      where.date = { [Op.between]: [startDate, endDate] };
    } else if (startDate) {
      where.date = { [Op.gte]: startDate };
    } else if (endDate) {
      where.date = { [Op.lte]: endDate };
    }

    const plans = await MealPlan.findAll({
      where,
      include: [{ model: Child, as: 'child', attributes: ['id', 'firstName', 'lastName'] }],
      order: [['date', 'ASC'], ['mealType', 'ASC']],
    });

    res.json({ data: plans });
  } catch (error) {
    logger.error('Error getting meal plans:', { error: error.message });
    res.status(500).json({ error: 'Failed to get meal plans' });
  }
};

/**
 * Create a single meal plan for one child
 * POST /api/meal-plans
 */
export const createMealPlan = async (req, res) => {
  try {
    const { childId, date, mealType, plannedMenu, notes } = req.body;

    if (!childId || !date || !mealType || !plannedMenu) {
      return res.status(400).json({ error: 'childId, date, mealType, and plannedMenu are required' });
    }

    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({ error: `Invalid mealType. Must be one of: ${VALID_MEAL_TYPES.join(', ')}` });
    }

    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Upsert: update if exists for same child+date+mealType
    const [plan, created] = await MealPlan.findOrCreate({
      where: { childId, date, mealType },
      defaults: {
        plannedMenu,
        notes: notes || null,
        createdBy: req.user.id,
      },
    });

    if (!created) {
      plan.plannedMenu = plannedMenu;
      plan.notes = notes || null;
      plan.createdBy = req.user.id;
      await plan.save();
    }

    res.status(created ? 201 : 200).json({
      data: plan,
      message: created ? 'Meal plan created' : 'Meal plan updated',
    });
  } catch (error) {
    logger.error('Error creating meal plan:', { error: error.message });
    res.status(500).json({ error: 'Failed to create meal plan' });
  }
};

/**
 * Bulk create meal plans for multiple children
 * POST /api/meal-plans/bulk
 * Body: { childIds: [uuid], date, mealType, plannedMenu, notes }
 */
export const bulkCreateMealPlans = async (req, res) => {
  try {
    const { childIds, date, mealType, plannedMenu, notes } = req.body;

    if (!Array.isArray(childIds) || childIds.length === 0) {
      return res.status(400).json({ error: 'childIds array is required and must not be empty' });
    }

    if (!date || !mealType || !plannedMenu) {
      return res.status(400).json({ error: 'date, mealType, and plannedMenu are required' });
    }

    if (!VALID_MEAL_TYPES.includes(mealType)) {
      return res.status(400).json({ error: `Invalid mealType. Must be one of: ${VALID_MEAL_TYPES.join(', ')}` });
    }

    // Verify all children exist and belong to same school
    for (const childId of childIds) {
      const child = await validateChildAccess(childId, req);
      if (!child) {
        return res.status(403).json({ error: `Access denied to child ${childId}` });
      }
    }

    const results = [];
    for (const childId of childIds) {
      const [plan, created] = await MealPlan.findOrCreate({
        where: { childId, date, mealType },
        defaults: {
          plannedMenu,
          notes: notes || null,
          createdBy: req.user.id,
        },
      });

      if (!created) {
        plan.plannedMenu = plannedMenu;
        plan.notes = notes || null;
        plan.createdBy = req.user.id;
        await plan.save();
      }

      results.push(plan);
    }

    res.json({
      data: results,
      message: `Meal plan saved for ${results.length} children`,
    });
  } catch (error) {
    logger.error('Error bulk creating meal plans:', { error: error.message });
    res.status(500).json({ error: 'Failed to create meal plans' });
  }
};

/**
 * Update a single meal plan
 * PUT /api/meal-plans/:id
 */
export const updateMealPlan = async (req, res) => {
  try {
    const { id } = req.params;
    const { plannedMenu, notes, date, mealType } = req.body;

    const plan = await MealPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    if (plannedMenu !== undefined) plan.plannedMenu = plannedMenu;
    if (notes !== undefined) plan.notes = notes;
    if (date !== undefined) plan.date = date;
    if (mealType !== undefined) {
      if (!VALID_MEAL_TYPES.includes(mealType)) {
        return res.status(400).json({ error: `Invalid mealType. Must be one of: ${VALID_MEAL_TYPES.join(', ')}` });
      }
      plan.mealType = mealType;
    }

    await plan.save();

    res.json({ data: plan, message: 'Meal plan updated' });
  } catch (error) {
    logger.error('Error updating meal plan:', { error: error.message });
    res.status(500).json({ error: 'Failed to update meal plan' });
  }
};

/**
 * Delete a single meal plan
 * DELETE /api/meal-plans/:id
 */
export const deleteMealPlan = async (req, res) => {
  try {
    const { id } = req.params;

    const plan = await MealPlan.findByPk(id);
    if (!plan) {
      return res.status(404).json({ error: 'Meal plan not found' });
    }

    await plan.destroy();

    res.json({ message: 'Meal plan deleted' });
  } catch (error) {
    logger.error('Error deleting meal plan:', { error: error.message });
    res.status(500).json({ error: 'Failed to delete meal plan' });
  }
};
