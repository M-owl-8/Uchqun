import User from '../../models/User.js';
import Child from '../../models/Child.js';
import Group from '../../models/Group.js';
import TeacherRating from '../../models/TeacherRating.js';
import logger from '../../utils/logger.js';
import { fn, col } from 'sequelize';

/**
 * D-11: resolve the teacher a parent may rate.
 *
 * users.teacherId is a denormalised convenience column that nothing populates on
 * the normal enrolment path — every parent in production had it NULL, so the
 * "Fikr bildirish" page 400'd for every parent and no teacher could ever be rated.
 * The authoritative link is the same chain the rest of the platform uses:
 * child → group → group.teacherId. Fall back to it when the column is empty.
 *
 * @returns {Promise<string|null>} teacher user id, or null when the child has no group
 */
async function resolveTeacherId(parent) {
  if (parent?.teacherId) return parent.teacherId;
  const child = await Child.findOne({
    where: { parentId: parent.id },
    attributes: ['id', 'groupId'],
    order: [['createdAt', 'ASC']],
  });
  if (!child?.groupId) return null;
  const group = await Group.findByPk(child.groupId, { attributes: ['id', 'teacherId'] });
  return group?.teacherId ?? null;
}

export const rateMyTeacher = async (req, res) => {
  try {
    const { stars, comment } = req.body;

    if (!stars || Number.isNaN(Number(stars))) {
      return res.status(400).json({ error: 'Stars is required' });
    }
    const starsNum = Number(stars);
    if (starsNum < 1 || starsNum > 5) {
      return res.status(400).json({ error: 'Stars must be between 1 and 5' });
    }

    const parent = await User.findByPk(req.user.id);
    if (!parent) return res.status(404).json({ success: false, error: { code: 'PARENT_NOT_FOUND' } });
    const teacherId = await resolveTeacherId(parent);
    if (!teacherId) {
      // D-11: no group assignment yet — a legitimate empty state, not a client error.
      return res.status(409).json({ success: false, error: { code: 'RATING_NO_ASSIGNED_TEACHER' } });
    }

    const [rating, created] = await TeacherRating.findOrCreate({
      where: { teacherId, parentId: req.user.id },
      defaults: { teacherId, parentId: req.user.id, stars: starsNum, comment: comment || null },
    });

    if (!created) {
      rating.stars = starsNum;
      rating.comment = comment || null;
      await rating.save();
    }

    try {
      const allRatings = await TeacherRating.findAll({ where: { teacherId }, attributes: ['stars'] });
      const totalRatings = allRatings.length;
      const averageRating = totalRatings > 0 ? allRatings.reduce((sum, r) => sum + (r.stars || 0), 0) / totalRatings : 0;
      await User.update(
        { rating: parseFloat(averageRating.toFixed(2)), totalRatings },
        { where: { id: teacherId } }
      );
      logger.info('Updated teacher rating', { teacherId, averageRating: parseFloat(averageRating.toFixed(2)), totalRatings });
    } catch (updateError) {
      logger.error('Error updating teacher rating', { error: updateError.message, teacherId });
    }

    res.json({ success: true, message: 'Teacher rating saved successfully', data: rating.toJSON() });
  } catch (error) {
    logger.error('Rate teacher error', { error: error.message, stack: error.stack, parentId: req.user?.id });
    res.status(500).json({
      error: 'Failed to rate teacher',
      message: 'An error occurred while saving the rating. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

export const getMyRating = async (req, res) => {
  try {
    const parent = await User.findByPk(req.user.id);

    if (!parent) return res.status(404).json({ success: false, error: { code: 'PARENT_NOT_FOUND' } });

    const teacherId = await resolveTeacherId(parent);
    if (!teacherId) {
      // D-11: 'this parent has no assigned teacher yet' is an empty state, not a
      // client error. Returning 400 made every parent's rating page log a console
      // error and render a dead card. 200 + an explicit null teacher instead.
      return res.json({
        success: true,
        data: { teacher: null, rating: null, summary: { average: 0, count: 0 }, allRatings: [] },
      });
    }

    const rating = await TeacherRating.findOne({ where: { teacherId, parentId: req.user.id } });

    let average = 0;
    let count = 0;
    try {
      const summaryRaw = await TeacherRating.findOne({
        where: { teacherId },
        attributes: [[fn('AVG', col('stars')), 'averageStars'], [fn('COUNT', col('id')), 'totalRatings']],
        raw: true,
      });
      average = summaryRaw?.averageStars ? Number(parseFloat(summaryRaw.averageStars).toFixed(2)) : 0;
      count = summaryRaw?.totalRatings ? Number(summaryRaw.totalRatings) : 0;
    } catch (summaryError) {
      logger.warn('Error calculating rating summary', { error: summaryError.message, teacherId });
    }

    let formattedRatings = [];
    try {
      const allRatings = await TeacherRating.findAll({
        where: { teacherId },
        include: [{ model: User, as: 'ratingParent', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }],
        order: [['updatedAt', 'DESC']],
      });
      formattedRatings = allRatings.map((r) => ({
        ...r.toJSON(),
        parentName: r.ratingParent ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim() : null,
        parentEmail: r.ratingParent?.email || null,
      }));
    } catch (ratingsError) {
      logger.warn('Error fetching all ratings', { error: ratingsError.message, teacherId });
    }

    res.json({ success: true, data: { rating: rating ? rating.toJSON() : null, summary: { average, count }, allRatings: formattedRatings } });
  } catch (error) {
    logger.error('Get rating error', { error: error.message, stack: error.stack, parentId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch rating', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
