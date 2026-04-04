import BusinessStats from '../models/BusinessStats.js';
import User from '../models/User.js';
import School from '../models/School.js';
import Payment from '../models/Payment.js';
import TherapyUsage from '../models/TherapyUsage.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';

/**
 * Get overview statistics for business
 * GET /api/business/overview
 */
export const getOverview = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const businessId = req.user.id;

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

    // Get revenue (from payments)
    const paymentsWhere = { status: 'completed' };
    if (startDate) {
      paymentsWhere.paidAt = { [Op.gte]: new Date(startDate) };
    }
    if (endDate) {
      paymentsWhere.paidAt = { ...paymentsWhere.paidAt, [Op.lte]: new Date(endDate) };
    }

    const payments = await Payment.findAll({ where: paymentsWhere });
    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Get therapy usage
    const therapyUsages = await TherapyUsage.count();

    // Get active subscriptions (if implemented)
    const activeSubscriptions = 0; // TODO: Implement subscription model

    res.json({
      success: true,
      data: {
        totalUsers,
        totalSchools,
        totalRevenue,
        therapyUsages,
        activeSubscriptions,
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
 * Get revenue statistics
 * GET /api/business/revenue
 */
export const getRevenueStats = async (req, res) => {
  try {
    const { startDate, endDate, paymentType } = req.query;

    const where = { status: 'completed' };
    if (paymentType) {
      where.paymentType = paymentType;
    }
    if (startDate || endDate) {
      where.paidAt = {};
      if (startDate) {
        where.paidAt[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.paidAt[Op.lte] = new Date(endDate);
      }
    }

    const payments = await Payment.findAll({ where });

    const totalRevenue = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

    // Group by payment type
    const byType = {};
    payments.forEach(p => {
      const type = p.paymentType;
      if (!byType[type]) {
        byType[type] = { count: 0, amount: 0 };
      }
      byType[type].count++;
      byType[type].amount += parseFloat(p.amount || 0);
    });

    // Group by month
    const byMonth = {};
    payments.forEach(p => {
      if (p.paidAt) {
        const month = new Date(p.paidAt).toISOString().substring(0, 7);
        if (!byMonth[month]) {
          byMonth[month] = { count: 0, amount: 0 };
        }
        byMonth[month].count++;
        byMonth[month].amount += parseFloat(p.amount || 0);
      }
    });

    res.json({
      success: true,
      data: {
        totalRevenue,
        totalPayments: payments.length,
        byType,
        byMonth,
      },
    });
  } catch (error) {
    logger.error('Get revenue stats error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch revenue statistics' });
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
      case 'revenue': {
        const revenue = await getRevenueData(periodStart, periodEnd);
        data = revenue;
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
async function getOverviewData(startDate, endDate) {
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

async function getRevenueData(startDate, endDate) {
  const where = { status: 'completed' };
  if (startDate || endDate) {
    where.paidAt = {};
    if (startDate) where.paidAt[Op.gte] = new Date(startDate);
    if (endDate) where.paidAt[Op.lte] = new Date(endDate);
  }
  const payments = await Payment.findAll({ where });
  const total = payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
  return { totalRevenue: total, payments: payments.length };
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
