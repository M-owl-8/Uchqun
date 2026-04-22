import TeacherResource from '../models/TeacherResource.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const VALID_TYPES = ['music', 'video', 'recommendation'];

/**
 * Get resources
 * GET /api/resources?type=xxx
 */
export const getResources = async (req, res) => {
  try {
    const { type } = req.query;

    const where = { isActive: true };

    if (type) {
      if (!VALID_TYPES.includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be music, video, or recommendation' });
      }
      where.type = type;
    }

    // Scope to school for all roles that have a schoolId (teacher, parent, etc.)
    if (req.user.schoolId) {
      where.schoolId = req.user.schoolId;
    }

    const resources = await TeacherResource.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: User,
          as: 'teacher',
          attributes: ['id', 'firstName', 'lastName'],
        },
      ],
    });

    res.json({ data: resources });
  } catch (error) {
    logger.error('Error getting teacher resources:', { error: error.message });
    res.status(500).json({ error: 'Failed to get resources' });
  }
};

/**
 * Create a resource
 * POST /api/resources
 */
export const createResource = async (req, res) => {
  try {
    const { type, title, description, url } = req.body;

    if (!type || !title) {
      return res.status(400).json({ error: 'type and title are required' });
    }

    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid type. Must be music, video, or recommendation' });
    }

    if (title.length > 500) {
      return res.status(400).json({ error: 'title must be 500 characters or fewer' });
    }

    // Normalize URL: accept "//host/..." (protocol-relative), "host/..." (bare host), or full URL.
    // If a file was uploaded via multer, use its storage URL instead.
    let finalUrl = null;
    if (req.file) {
      const base = (process.env.API_URL || '').replace(/\/api\/?$/, '');
      finalUrl = `${base}/uploads/${req.file.filename}`;
    } else if (url && typeof url === 'string' && url.trim()) {
      const trimmed = url.trim();
      if (/^https?:\/\//i.test(trimmed)) {
        finalUrl = trimmed;
      } else if (trimmed.startsWith('//')) {
        finalUrl = `https:${trimmed}`;
      } else if (/^[\w.-]+\.[\w.-]+/.test(trimmed)) {
        finalUrl = `https://${trimmed}`;
      } else {
        finalUrl = trimmed;
      }
      if (finalUrl.length > 1000) {
        return res.status(400).json({ error: 'URL is too long' });
      }
    }

    const resource = await TeacherResource.create({
      teacherId: req.user.id,
      schoolId: req.user.schoolId || null,
      type,
      title,
      description: description || null,
      url: finalUrl,
      isActive: true,
    });

    const created = await TeacherResource.findByPk(resource.id, {
      include: [{ model: User, as: 'teacher', attributes: ['id', 'firstName', 'lastName'] }],
    });

    res.status(201).json({ data: created });
  } catch (error) {
    logger.error('Error creating teacher resource:', { error: error.message });
    res.status(500).json({ error: 'Failed to create resource' });
  }
};

/**
 * Delete a resource
 * DELETE /api/resources/:id
 */
export const deleteResource = async (req, res) => {
  try {
    const { id } = req.params;

    const resource = await TeacherResource.findByPk(id);
    if (!resource) {
      return res.status(404).json({ error: 'Resource not found' });
    }

    // Teacher can only delete their own resources; admin can delete any
    if (req.user.role !== 'admin' && resource.teacherId !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own resources' });
    }

    await resource.destroy();

    res.json({ message: 'Resource deleted successfully' });
  } catch (error) {
    logger.error('Error deleting teacher resource:', { error: error.message });
    res.status(500).json({ error: 'Failed to delete resource' });
  }
};
