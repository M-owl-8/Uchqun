import User from '../../models/User.js';
import TeacherRating from '../../models/TeacherRating.js';
import logger from '../../utils/logger.js';
import { fn, col } from 'sequelize';

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
    if (!parent || !parent.teacherId) {
      return res.status(400).json({ error: 'Assigned teacher not found' });
    }

    const [rating, created] = await TeacherRating.findOrCreate({
      where: { teacherId: parent.teacherId, parentId: req.user.id },
      defaults: { teacherId: parent.teacherId, parentId: req.user.id, stars: starsNum, comment: comment || null },
    });

    if (!created) {
      rating.stars = starsNum;
      rating.comment = comment || null;
      await rating.save();
    }

    try {
      const allRatings = await TeacherRating.findAll({ where: { teacherId: parent.teacherId }, attributes: ['stars'] });
      const totalRatings = allRatings.length;
      const averageRating = totalRatings > 0 ? allRatings.reduce((sum, r) => sum + (r.stars || 0), 0) / totalRatings : 0;
      await User.update(
        { rating: parseFloat(averageRating.toFixed(2)), totalRatings },
        { where: { id: parent.teacherId } }
      );
      logger.info('Updated teacher rating', { teacherId: parent.teacherId, averageRating: parseFloat(averageRating.toFixed(2)), totalRatings });
    } catch (updateError) {
      logger.error('Error updating teacher rating', { error: updateError.message, teacherId: parent.teacherId });
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

    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    if (!parent.teacherId) {
      return res.status(400).json({ error: 'Assigned teacher not found', data: { rating: null, summary: { average: 0, count: 0 }, allRatings: [] } });
    }

    const rating = await TeacherRating.findOne({ where: { teacherId: parent.teacherId, parentId: req.user.id } });

    let average = 0;
    let count = 0;
    try {
      const summaryRaw = await TeacherRating.findOne({
        where: { teacherId: parent.teacherId },
        attributes: [[fn('AVG', col('stars')), 'averageStars'], [fn('COUNT', col('id')), 'totalRatings']],
        raw: true,
      });
      average = summaryRaw?.averageStars ? Number(parseFloat(summaryRaw.averageStars).toFixed(2)) : 0;
      count = summaryRaw?.totalRatings ? Number(summaryRaw.totalRatings) : 0;
    } catch (summaryError) {
      logger.warn('Error calculating rating summary', { error: summaryError.message, teacherId: parent.teacherId });
    }

    let formattedRatings = [];
    try {
      const allRatings = await TeacherRating.findAll({
        where: { teacherId: parent.teacherId },
        include: [{ model: User, as: 'ratingParent', attributes: ['id', 'firstName', 'lastName', 'email'], required: false }],
        order: [['updatedAt', 'DESC']],
      });
      formattedRatings = allRatings.map((r) => ({
        ...r.toJSON(),
        parentName: r.ratingParent ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim() : null,
        parentEmail: r.ratingParent?.email || null,
      }));
    } catch (ratingsError) {
      logger.warn('Error fetching all ratings', { error: ratingsError.message, teacherId: parent.teacherId });
    }

    res.json({ success: true, data: { rating: rating ? rating.toJSON() : null, summary: { average, count }, allRatings: formattedRatings } });
  } catch (error) {
    logger.error('Get rating error', { error: error.message, stack: error.stack, parentId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch rating', details: process.env.NODE_ENV === 'development' ? error.message : undefined });
  }
};
