import BusinessStats from '../models/BusinessStats.js';
import User from '../models/User.js';
import School from '../models/School.js';
import TherapyUsage from '../models/TherapyUsage.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

/**
 * Get overview statistics for business
 * GET /api/business/overview
 */
export const getOverview = async (req, res) => {
  try {
    // Get total users
    const totalUsers = await User.count({
      where: {
        role: { [Op.in]: ['parent', 'teacher', 'reception'] },
      },
    });

    // Get total schools
    const totalSchools = await School.count({
      where: { isActive: true },
    });

    // Get therapy usage
    const therapyUsages = await TherapyUsage.count();

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSchools,
        therapyUsages,
      },
    });
  } catch (error) {
    logger.error('Get business overview error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch overview statistics' });
  }
};

/**
 * Get users statistics
 * GET /api/business/users
 */
export const getUsersStats = async (req, res) => {
  try {
    const { role, startDate, endDate } = req.query;

    const where = {};
    if (role) {
      where.role = role;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.createdAt[Op.lte] = new Date(endDate);
      }
    }

    const users = await User.findAndCountAll({
      where,
      attributes: ['id', 'role', 'createdAt'],
    });

    // Group by role
    const byRole = {};
    users.rows.forEach(user => {
      const role = user.role;
      if (!byRole[role]) {
        byRole[role] = 0;
      }
      byRole[role]++;
    });

    res.json({
      success: true,
      data: {
        total: users.count,
        byRole,
        users: users.rows.slice(0, 100), // Limit response size
      },
    });
  } catch (error) {
    logger.error('Get users stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch users statistics' });
  }
};

/**
 * Get usage statistics
 * GET /api/business/usage
 */
export const getUsageStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) {
        where.startTime[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.startTime[Op.lte] = new Date(endDate);
      }
    }

    const usages = await TherapyUsage.findAll({ where });

    // Group by therapy type
    const byTherapy = {};
    usages.forEach(usage => {
      const therapyId = usage.therapyId;
      if (!byTherapy[therapyId]) {
        byTherapy[therapyId] = 0;
      }
      byTherapy[therapyId]++;
    });

    res.json({
      success: true,
      data: {
        totalUsages: usages.length,
        byTherapy,
      },
    });
  } catch (error) {
    logger.error('Get usage stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch usage statistics' });
  }
};

/**
 * Generate and save statistics
 * POST /api/business/stats/generate
 */
export const generateStats = async (req, res) => {
  try {
    const {
      statType,
      period,
      periodStart,
      periodEnd,
    } = req.body;

    if (!statType || !period || !periodStart || !periodEnd) {
      return res.status(400).json({ error: 'Stat type, period, and dates are required' });
    }

    let data = {};

    switch (statType) {
      case 'overview': {
        const overview = await getOverviewData(periodStart, periodEnd);
        data = overview;
        break;
      }
      case 'users': {
        const users = await getUsersData(periodStart, periodEnd);
        data = users;
        break;
      }
      case 'usage': {
        const usage = await getUsageData(periodStart, periodEnd);
        data = usage;
        break;
      }
      default:
        return res.status(400).json({ error: 'Invalid stat type' });
    }

    const stats = await BusinessStats.create({
      businessId: req.user.id,
      statType,
      period,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      data,
    });

    res.status(201).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('Generate business stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to generate statistics' });
  }
};

/**
 * Get saved statistics
 * GET /api/business/stats
 */
export const getSavedStats = async (req, res) => {
  try {
    const {
      statType,
      period,
      isPublic,
      limit = 20,
      offset = 0,
    } = req.query;

    const where = { businessId: req.user.id };
    if (statType) {
      where.statType = statType;
    }
    if (period) {
      where.period = period;
    }
    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }

    const stats = await BusinessStats.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['generatedAt', 'DESC']],
    });

    res.json({
      success: true,
      data: {
        stats: stats.rows,
        total: stats.count,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error) {
    logger.error('Get saved business stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch saved statistics' });
  }
};

// Helper functions
async function getOverviewData(_startDate, _endDate) {
  const totalUsers = await User.count({
    where: { role: { [Op.in]: ['parent', 'teacher', 'reception'] } },
  });
  const totalSchools = await School.count({ where: { isActive: true } });
  return { totalUsers, totalSchools };
}

async function getUsersData(startDate, endDate) {
  const where = {};
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt[Op.gte] = new Date(startDate);
    if (endDate) where.createdAt[Op.lte] = new Date(endDate);
  }
  const users = await User.findAll({ where });
  return { users: users.length, data: users };
}

async function getUsageData(startDate, endDate) {
  const where = {};
  if (startDate || endDate) {
    where.startTime = {};
    if (startDate) where.startTime[Op.gte] = new Date(startDate);
    if (endDate) where.startTime[Op.lte] = new Date(endDate);
  }
  const usages = await TherapyUsage.findAll({ where });
  return { usages: usages.length };
}
