import AIWarning from '../models/AIWarning.js';
import SchoolRating from '../models/SchoolRating.js';
import School from '../models/School.js';
import User from '../models/User.js';
import Child from '../models/Child.js';
import Notification from '../models/Notification.js';
import { Op } from 'sequelize';
import logger from '../utils/logger.js';
import { parsePagination } from '../utils/pagination.js';

// #03-009 — targetId is a polymorphic FK; validate the target exists before insert
const TARGET_MODEL = { school: School, parent: User, teacher: User, child: Child };
async function validateTargetExists(targetType, targetId) {
  const Model = TARGET_MODEL[targetType];
  if (!Model) return false;
  return !!(await Model.findByPk(targetId, { attributes: ['id'] }));
}

/**
 * Analyze ratings and generate warnings
 * POST /api/ai-warnings/analyze
 */
export const analyzeRatings = async (req, res) => {
  try {
    const { schoolId, parentId: _parentId } = req.body;

    const warnings = [];

    // Analyze school ratings
    if (schoolId) {
      const school = await School.findByPk(schoolId);
      if (school) {
        const ratings = await SchoolRating.findAll({
          where: { schoolId },
        });

        if (ratings.length > 0) {
          const avgRating = ratings.reduce((sum, r) => sum + r.stars, 0) / ratings.length;
          const recentRatings = ratings.filter(r => {
            const daysAgo = (new Date() - new Date(r.createdAt)) / (1000 * 60 * 60 * 24);
            return daysAgo <= 30;
          });

          // Low rating warning
          if (avgRating < 2.5) {
            warnings.push({
              warningType: 'low_rating',
              severity: avgRating < 1.5 ? 'critical' : avgRating < 2 ? 'high' : 'medium',
              targetType: 'school',
              targetId: schoolId,
              schoolId,
              title: `Past reyting: ${school.name}`,
              message: `Maktab o'rtacha reytingi ${avgRating.toFixed(1)}/5.0. Bu juda past ko'rsatkich.`,
              aiAnalysis: `Maktab ${ratings.length} ta reytingga ega. O'rtacha reyting ${avgRating.toFixed(1)}/5.0. ${recentRatings.length} ta so'nggi 30 kun ichida reyting berilgan.`,
              ratingData: {
                average: avgRating,
                count: ratings.length,
                recentCount: recentRatings.length,
              },
            });
          }

          // Declining rating warning
          if (recentRatings.length >= 5) {
            const oldRatings = ratings.filter(r => {
              const daysAgo = (new Date() - new Date(r.createdAt)) / (1000 * 60 * 60 * 24);
              return daysAgo > 30 && daysAgo <= 60;
            });

            if (oldRatings.length > 0) {
              const oldAvg = oldRatings.reduce((sum, r) => sum + r.stars, 0) / oldRatings.length;
              const recentAvg = recentRatings.reduce((sum, r) => sum + r.stars, 0) / recentRatings.length;

              if (recentAvg < oldAvg - 0.5) {
                warnings.push({
                  warningType: 'declining_rating',
                  severity: recentAvg < oldAvg - 1 ? 'high' : 'medium',
                  targetType: 'school',
                  targetId: schoolId,
                  schoolId,
                  title: `Reyting pasaymoqda: ${school.name}`,
                  message: `Maktab reytingi so'nggi oyda ${oldAvg.toFixed(1)} dan ${recentAvg.toFixed(1)} ga tushdi.`,
                  aiAnalysis: `Reyting pasayish tendentsiyasi kuzatilmoqda. Oldingi oy: ${oldAvg.toFixed(1)}, Hozirgi oy: ${recentAvg.toFixed(1)}.`,
                  ratingData: {
                    oldAverage: oldAvg,
                    recentAverage: recentAvg,
                    decline: oldAvg - recentAvg,
                  },
                });
              }
            }
          }

          // Negative feedback warning
          const negativeRatings = ratings.filter(r => r.stars <= 2 && r.comment);
          if (negativeRatings.length >= 3) {
            warnings.push({
              warningType: 'negative_feedback',
              severity: negativeRatings.length >= 5 ? 'high' : 'medium',
              targetType: 'school',
              targetId: schoolId,
              schoolId,
              title: `Ko'p salbiy fikrlar: ${school.name}`,
              message: `${negativeRatings.length} ta past reyting va salbiy fikrlar mavjud.`,
              aiAnalysis: `Maktab ${negativeRatings.length} ta past reyting (2 yoki undan past) va salbiy fikrlarga ega.`,
              ratingData: {
                negativeCount: negativeRatings.length,
                totalRatings: ratings.length,
              },
            });
          }
        }
      }
    }

    // Create warnings in database
    const createdWarnings = [];
    for (const warning of warnings) {
      const existing = await AIWarning.findOne({
        where: {
          warningType: warning.warningType,
          targetType: warning.targetType,
          targetId: warning.targetId,
          isResolved: false,
        },
      });

      if (!existing && await validateTargetExists(warning.targetType, warning.targetId)) {
        const created = await AIWarning.create(warning);
        createdWarnings.push(created);

        // Automatically send push notifications for new warnings
        await sendWarningNotifications(created);
      }
    }

    res.json({
      success: true,
      data: {
        warnings: createdWarnings,
        total: createdWarnings.length,
      },
    });
  } catch (error) {
    logger.error('Analyze ratings error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to analyze ratings' });
  }
};

/**
 * Get warnings
 * GET /api/ai-warnings
 */
export const getWarnings = async (req, res) => {
  try {
    const {
      warningType,
      severity,
      targetType,
      targetId,
      isResolved,
      schoolId,
    } = req.query;
    const { limit, offset } = parsePagination(req.query);

    const where = {};

    if (warningType) {
      where.warningType = warningType;
    }

    if (severity) {
      where.severity = severity;
    }

    if (targetType) {
      where.targetType = targetType;
    }

    if (targetId) {
      where.targetId = targetId;
    }

    if (isResolved !== undefined) {
      where.isResolved = isResolved === 'true';
    }

    if (schoolId) {
      where.schoolId = schoolId;
    }

    // Role-based filtering
    if (req.user.role === 'parent') {
      where.parentId = req.user.id;
    }

    const warnings = await AIWarning.findAndCountAll({
      where,
      limit,
      offset,
      order: [['severity', 'DESC'], ['createdAt', 'DESC']],
      include: [
        {
          model: School,
          as: 'school',
          required: false,
          attributes: ['id', 'name'],
        },
        {
          model: User,
          as: 'parent',
          required: false,
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: User,
          as: 'resolver',
          required: false,
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.json({
      success: true,
      data: {
        warnings: warnings.rows,
        total: warnings.count,
        limit,
        offset,
      },
    });
  } catch (error) {
    logger.error('Get warnings error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch warnings' });
  }
};

/**
 * Resolve warning
 * PUT /api/ai-warnings/:id/resolve
 */
export const resolveWarning = async (req, res) => {
  try {
    const { id } = req.params;
    const { resolutionNotes } = req.body;

    const warning = await AIWarning.findByPk(id);
    if (!warning) {
      return res.status(404).json({ error: 'Warning not found' });
    }

    await warning.update({
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy: req.user.id,
      resolutionNotes,
    });

    res.json({
      success: true,
      data: warning,
    });
  } catch (error) {
    logger.error('Resolve warning error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to resolve warning' });
  }
};

/**
 * Notify users about warning
 * POST /api/ai-warnings/:id/notify
 */
export const notifyUsers = async (req, res) => {
  try {
    const { id } = req.params;
    const { userIds } = req.body;

    const warning = await AIWarning.findByPk(id);
    if (!warning) {
      return res.status(404).json({ error: 'Warning not found' });
    }

    const notifiedUsers = [...(warning.notifiedUsers || []), ...userIds];
    await warning.update({
      notifiedUsers: [...new Set(notifiedUsers)],
    });

    // Send push notifications to specified users
    await sendWarningNotifications(warning, userIds);

    res.json({
      success: true,
      message: 'Users notified',
    });
  } catch (error) {
    logger.error('Notify users error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to notify users' });
  }
};

/**
 * Helper function to send push notifications for warnings
 * @param {AIWarning} warning - The warning to send notifications for
 * @param {Array} specificUserIds - Optional array of specific user IDs to notify
 */
async function sendWarningNotifications(warning, specificUserIds = null) {
  try {
    let targetUsers = [];

    if (specificUserIds && specificUserIds.length > 0) {
      // Notify specific users
      targetUsers = await User.findAll({
        where: { id: { [Op.in]: specificUserIds } },
      });
    } else {
      // Auto-detect users to notify based on warning type
      if (warning.targetType === 'school' && warning.schoolId) {
        // Notify parents whose children attend this school
        const children = await Child.findAll({
          where: { schoolId: warning.schoolId },
          include: [
            {
              model: User,
              as: 'parent',
              required: true,
            },
          ],
        });

        targetUsers = children
          .map(child => child.parent)
          .filter(parent => parent !== null);
      } else if (warning.targetType === 'parent' && warning.parentId) {
        // Notify the specific parent
        const parent = await User.findByPk(warning.parentId);
        if (parent) {
          targetUsers = [parent];
        }
      }
    }

    if (targetUsers.length > 0) {
      await Notification.bulkCreate(
        targetUsers.map((user) => ({
          userId: user.id,
          type: 'general',
          title: `AI Warning: ${warning.severity || 'info'}`,
          message: warning.message || 'A new AI warning has been issued.',
          relatedId: warning.id,
        })),
        { validate: true, ignoreDuplicates: false }
      );
    }

    logger.info('Warning notifications sent', {
      warningId: warning.id,
      usersNotified: targetUsers.length,
    });
  } catch (error) {
    logger.error('Send warning notifications error', {
      error: error.message,
      warningId: warning.id,
    });
    // Don't throw error, just log it
  }
}
