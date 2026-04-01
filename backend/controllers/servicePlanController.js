import ServicePlan from '../models/ServicePlan.js';
import Child from '../models/Child.js';
import logger from '../utils/logger.js';
import { validateChildAccess } from '../utils/schoolValidation.js';

const VALID_SERVICE_TYPES = ['logoped', 'defektolog', 'self_care', 'ipotherapy', 'music', 'labor', 'tmc', 'physiotherapy'];
const VALID_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

const DEFAULT_MONTHS = Object.fromEntries(VALID_MONTHS.map(m => [m, false]));

function validateMonths(months) {
  if (!months || typeof months !== 'object') return false;
  for (const key of Object.keys(months)) {
    if (!VALID_MONTHS.includes(key)) return false;
    if (typeof months[key] !== 'boolean') return false;
  }
  return true;
}

/**
 * Get service plans for a child/year
 * GET /api/service-plans?childId=xxx&year=2025
 */
export const getServicePlans = async (req, res) => {
  try {
    const { childId, year } = req.query;

    if (!childId) {
      return res.status(400).json({ error: 'childId is required' });
    }

    const planYear = parseInt(year) || new Date().getFullYear();

    const plans = await ServicePlan.findAll({
      where: { childId, year: planYear },
      order: [['serviceType', 'ASC']],
    });

    // Return all 8 service types, filling in defaults for missing ones
    const planMap = {};
    plans.forEach(p => { planMap[p.serviceType] = p; });

    const fullPlans = VALID_SERVICE_TYPES.map(serviceType => {
      if (planMap[serviceType]) {
        return planMap[serviceType];
      }
      return {
        id: null,
        childId,
        year: planYear,
        serviceType,
        months: { ...DEFAULT_MONTHS },
        createdBy: null,
        createdAt: null,
        updatedAt: null,
      };
    });

    res.json({ data: fullPlans });
  } catch (error) {
    logger.error('Error getting service plans:', { error: error.message });
    res.status(500).json({ error: 'Failed to get service plans' });
  }
};

/**
 * Upsert a single service plan
 * POST /api/service-plans
 */
export const upsertServicePlan = async (req, res) => {
  try {
    const { childId, year, serviceType, months } = req.body;

    if (!childId || !year || !serviceType) {
      return res.status(400).json({ error: 'childId, year, and serviceType are required' });
    }

    if (!VALID_SERVICE_TYPES.includes(serviceType)) {
      return res.status(400).json({ error: 'Invalid serviceType' });
    }

    if (!validateMonths(months)) {
      return res.status(400).json({ error: 'Invalid months object. Must contain boolean values for month keys.' });
    }

    // Verify child exists and belongs to same school
    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    const mergedMonths = { ...DEFAULT_MONTHS, ...months };

    const [plan, created] = await ServicePlan.findOrCreate({
      where: { childId, year: parseInt(year), serviceType },
      defaults: {
        months: mergedMonths,
        createdBy: req.user.id,
      },
    });

    if (!created) {
      plan.months = mergedMonths;
      plan.createdBy = req.user.id;
      await plan.save();
    }

    res.status(created ? 201 : 200).json({
      data: plan,
      message: created ? 'Service plan created' : 'Service plan updated',
    });
  } catch (error) {
    logger.error('Error upserting service plan:', { error: error.message });
    res.status(500).json({ error: 'Failed to save service plan' });
  }
};

/**
 * Bulk upsert service plans
 * POST /api/service-plans/bulk
 */
export const bulkUpsertServicePlans = async (req, res) => {
  try {
    const { childId, year, plans } = req.body;

    if (!childId || !year || !Array.isArray(plans)) {
      return res.status(400).json({ error: 'childId, year, and plans array are required' });
    }

    // Verify child exists and belongs to same school
    const child = await validateChildAccess(childId, req);
    if (!child) {
      return res.status(404).json({ error: 'Child not found or access denied' });
    }

    // Validate all plans
    for (const plan of plans) {
      if (!VALID_SERVICE_TYPES.includes(plan.serviceType)) {
        return res.status(400).json({ error: `Invalid serviceType: ${plan.serviceType}` });
      }
      if (!validateMonths(plan.months)) {
        return res.status(400).json({ error: `Invalid months for ${plan.serviceType}` });
      }
    }

    const results = [];
    for (const plan of plans) {
      const mergedMonths = { ...DEFAULT_MONTHS, ...plan.months };

      const [record, created] = await ServicePlan.findOrCreate({
        where: { childId, year: parseInt(year), serviceType: plan.serviceType },
        defaults: {
          months: mergedMonths,
          createdBy: req.user.id,
        },
      });

      if (!created) {
        record.months = mergedMonths;
        record.createdBy = req.user.id;
        await record.save();
      }

      results.push(record);
    }

    res.json({ data: results, message: 'Service plans saved' });
  } catch (error) {
    logger.error('Error bulk upserting service plans:', { error: error.message });
    res.status(500).json({ error: 'Failed to save service plans' });
  }
};
