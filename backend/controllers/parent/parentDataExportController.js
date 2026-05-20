import { Op } from 'sequelize';
import User from '../../models/User.js';
import Child from '../../models/Child.js';
import ChildAttendance from '../../models/ChildAttendance.js';
import ChildObservation from '../../models/ChildObservation.js';
import ChildJournalEntry from '../../models/ChildJournalEntry.js';
import ChildGoal from '../../models/ChildGoal.js';
import ChildGoalReview from '../../models/ChildGoalReview.js';
import Activity from '../../models/Activity.js';
import Meal from '../../models/Meal.js';
import Media from '../../models/Media.js';
import SchoolRating from '../../models/SchoolRating.js';
import TeacherRating from '../../models/TeacherRating.js';
import EmotionalMonitoring from '../../models/EmotionalMonitoring.js';
import logger from '../../utils/logger.js';
import { logAudit } from '../../utils/auditLogger.js';

const TWO_YEARS_AGO = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 2);
  return d;
};

export const exportMyData = async (req, res) => {
  if (req.user.role !== 'parent') {
    return res.status(403).json({ success: false, error: { code: 'DATA_EXPORT_FORBIDDEN' } });
  }

  try {
    const parentId = req.user.id;
    const windowFrom = TWO_YEARS_AGO();
    const windowTo = new Date();

    // Parent record — explicitly exclude password and internal fields
    const parentRecord = await User.findByPk(parentId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'status',
        'telegramUsername', 'createdAt'],
    });

    // Linked children
    const children = await Child.findAll({
      where: { parentId },
      attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'schoolId', 'createdAt'],
    });
    const childIds = children.map(c => c.id);

    if (childIds.length === 0) {
      const payload = buildPayload(parentRecord, children, {}, windowFrom, windowTo);
      return sendExport(res, parentId, payload, logAudit, req.user);
    }

    const twoYearsAgo = windowFrom;
    const childWhere = { childId: { [Op.in]: childIds } };
    const childWhereWindowed = { ...childWhere, createdAt: { [Op.gte]: twoYearsAgo } };

    // Attendance — all within 2 years
    const attendance = await ChildAttendance.findAll({
      where: { ...childWhere, date: { [Op.gte]: twoYearsAgo } },
    }).catch(() => []);

    // Observations — routine only (concerns/urgent are clinical and stay with staff)
    const observations = await ChildObservation.findAll({
      where: { ...childWhere, severity: 'routine', observationDate: { [Op.gte]: twoYearsAgo } },
    }).catch(() => []);

    // Journal entries — only entries visible to parents
    const journalEntries = await ChildJournalEntry.findAll({
      where: { ...childWhere, isVisibleToParent: true },
      attributes: { exclude: ['teacherId'] },
    }).catch(() => []);

    // Goals (visible to parents per T2-3 design) + their reviews
    const goals = await ChildGoal.findAll({ where: childWhere }).catch(() => []);
    const goalIds = goals.map(g => g.id);
    const goalReviews = goalIds.length > 0
      ? await ChildGoalReview.findAll({ where: { goalId: { [Op.in]: goalIds } } }).catch(() => [])
      : [];

    // Activities / Meals / Media within 2-year window
    const activities = await Activity.findAll({ where: childWhereWindowed }).catch(() => []);
    const meals = await Meal.findAll({ where: childWhereWindowed }).catch(() => []);
    const media = await Media.findAll({ where: childWhereWindowed }).catch(() => []);

    // Parent's own ratings
    const schoolRatings = await SchoolRating.findAll({ where: { parentId } }).catch(() => []);
    const teacherRatings = await TeacherRating.findAll({ where: { parentId } }).catch(() => []);

    // Emotional monitoring — aggregate summary only (raw entries excluded per DEC-8)
    const emRaw = await EmotionalMonitoring.findAll({ where: childWhere }).catch(() => []);
    const emSummary = buildEmSummary(emRaw);

    const childData = {};
    for (const child of children) {
      childData[child.id] = {
        attendance: attendance.filter(a => a.childId === child.id),
        observations: observations.filter(o => o.childId === child.id),
        journalEntries: journalEntries.filter(j => j.childId === child.id),
        goals: goals.filter(g => g.childId === child.id).map(goal => ({
          ...goal.toJSON(),
          reviews: goalReviews.filter(r => r.goalId === goal.id),
        })),
        activities: activities.filter(a => a.childId === child.id),
        meals: meals.filter(m => m.childId === child.id),
        media: media.filter(m => m.childId === child.id),
        emotionalMonitoringSummary: emSummary[child.id] ?? { totalEntries: 0, byEmotion: {} },
      };
    }

    const payload = {
      meta: {
        generatedAt: windowTo.toISOString(),
        parentId,
        dataWindowFrom: windowFrom.toISOString(),
        dataWindowTo: windowTo.toISOString(),
        version: '1.0',
      },
      parent: parentRecord,
      children: children.map(child => ({
        ...child.toJSON(),
        ...childData[child.id],
      })),
      schoolRatings,
      teacherRatings,
    };

    return sendExport(res, parentId, payload, logAudit, req.user);
  } catch (error) {
    logger.error('exportMyData error', { error: error.message, parentId: req.user.id });
    return res.status(500).json({ success: false, error: { code: 'DATA_EXPORT_FAILED' } });
  }
};

function buildEmSummary(records) {
  const summary = {};
  for (const r of records) {
    if (!summary[r.childId]) summary[r.childId] = { totalEntries: 0, byEmotion: {} };
    summary[r.childId].totalEntries++;
    if (r.emotion) {
      summary[r.childId].byEmotion[r.emotion] = (summary[r.childId].byEmotion[r.emotion] ?? 0) + 1;
    }
  }
  return summary;
}

function sendExport(res, parentId, payload, logAudit, user) {
  const json = JSON.stringify(payload, null, 2);
  const byteSize = Buffer.byteLength(json, 'utf8');
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `uchqun-data-export-${parentId}-${date}.json`;

  logAudit({
    actorId: user.id, actorRole: user.role,
    action: 'data_export', entity: 'users', entityId: user.id,
    meta: { dataWindowDays: 730, byteSize },
  });

  res.set('Content-Type', 'application/json');
  res.set('Content-Disposition', `attachment; filename="${filename}"`);
  return res.send(json);
}

function buildPayload(parentRecord, children, childData, windowFrom, windowTo) {
  const parentId = parentRecord?.id;
  return {
    meta: {
      generatedAt: windowTo.toISOString(),
      parentId,
      dataWindowFrom: windowFrom.toISOString(),
      dataWindowTo: windowTo.toISOString(),
      version: '1.0',
    },
    parent: parentRecord,
    children: children.map(child => ({ ...child.toJSON(), ...(childData[child.id] ?? {}) })),
    schoolRatings: [],
    teacherRatings: [],
  };
}
