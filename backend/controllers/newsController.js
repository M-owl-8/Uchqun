import { Op } from 'sequelize';
import News from '../models/News.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

export const getNews = async (req, res) => {
  try {
    const { published, targetAudience, limit, offset } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const andConditions = [];

    // If not admin, only show published news
    if (req.user.role !== 'admin') {
      andConditions.push({ published: true });
    } else if (published !== undefined) {
      andConditions.push({ published: published === 'true' });
    }

    // School isolation: non-government users see only their school's news (or global)
    if (req.user.role !== 'government') {
      andConditions.push({
        [Op.or]: [{ schoolId: req.user.schoolId }, { schoolId: null }],
      });
    }

    if (targetAudience) {
      andConditions.push({
        [Op.or]: [{ targetAudience }, { targetAudience: 'all' }],
      });
    }

    const where = andConditions.length > 0 ? { [Op.and]: andConditions } : {};

    const news = await News.findAndCountAll({
      where,
      limit: limitNum,
      offset: offsetNum,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.json({
      news: news.rows,
      total: news.count,
      limit: limitNum,
      offset: offsetNum,
    });
  } catch (error) {
    logger.error('Get news error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get news' });
  }
};

export const getNewsItem = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };

    // If not admin, only show published news
    if (req.user.role !== 'admin') {
      where.published = true;
    }

    // School isolation: non-government users can only access their school's news (or global)
    if (req.user.role !== 'government') {
      where[Op.or] = [{ schoolId: req.user.schoolId }, { schoolId: null }];
    }

    const newsItem = await News.findOne({
      where,
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    if (!newsItem) {
      return res.status(404).json({ error: 'News item not found' });
    }

    res.json(newsItem);
  } catch (error) {
    logger.error('Get news item error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get news item' });
  }
};

export const createNews = async (req, res) => {
  try {
    const { title, content, published, targetAudience } = req.body;

    const newsItem = await News.create({
      title,
      content,
      published: published || false,
      targetAudience: targetAudience || 'all',
      createdById: req.user.id,
      schoolId: req.user.schoolId || null,
    });

    await newsItem.reload({
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.status(201).json(newsItem);
  } catch (error) {
    logger.error('Create news error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to create news' });
  }
};

export const updateNews = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, published, targetAudience } = req.body;

    const newsItem = await News.findByPk(id);
    if (!newsItem) {
      return res.status(404).json({ error: 'News item not found' });
    }

    if (newsItem.schoolId && req.user.schoolId && newsItem.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this news item' });
    }

    await newsItem.update({
      title,
      content,
      published,
      targetAudience,
    });

    await newsItem.reload({
      include: [
        {
          model: User,
          as: 'createdBy',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    res.json(newsItem);
  } catch (error) {
    logger.error('Update news error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update news' });
  }
};

export const deleteNews = async (req, res) => {
  try {
    const { id } = req.params;

    const newsItem = await News.findByPk(id);
    if (!newsItem) {
      return res.status(404).json({ error: 'News item not found' });
    }

    if (newsItem.schoolId && req.user.schoolId && newsItem.schoolId !== req.user.schoolId) {
      return res.status(403).json({ error: 'Access denied to this news item' });
    }

    await newsItem.destroy();

    res.json({ message: 'News item deleted successfully' });
  } catch (error) {
    logger.error('Delete news error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete news item' });
  }
};



