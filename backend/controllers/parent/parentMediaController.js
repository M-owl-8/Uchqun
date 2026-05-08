import { getParentGroupId } from '../../utils/parentDataSource.js';
import ParentMedia from '../../models/ParentMedia.js';
import Child from '../../models/Child.js';
import Media from '../../models/Media.js';
import logger from '../../utils/logger.js';
import { parsePagination } from '../../utils/pagination.js';

/**
 * Get parent's media (from their group)
 * GET /api/parent/media
 *
 * Business Logic:
 * - Parents see ALL media from their group (any child in same group)
 * - Queries teacher-created media linked to children via groupId
 */
export const getMyMedia = async (req, res) => {
  try {
    const { fileType } = req.query;
    const { limit, offset } = parsePagination(req.query, { limit: 50 });

    const groupId = await getParentGroupId(req.user.id);

    if (!groupId) {
      // Fallback to legacy parent_media if no group assigned
      const where = { parentId: req.user.id };

      if (fileType) {
        where.fileType = fileType;
      }

      const media = await ParentMedia.findAndCountAll({
        where,
        limit: limit,
        offset: offset,
        order: [['uploadDate', 'DESC']],
      });

      return res.json({
        success: true,
        data: media.rows,
        total: media.count,
        limit: limit,
        offset: offset,
      });
    }

    const whereMedia = {};

    if (fileType) {
      whereMedia.type = fileType;
    }

    const media = await Media.findAndCountAll({
      where: whereMedia,
      include: [{
        model: Child,
        as: 'child',
        where: { groupId },
        attributes: ['id', 'firstName', 'lastName', 'photo'],
        required: true,
      }],
      limit: limit,
      offset: offset,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: media.rows,
      total: media.count,
      limit: limit,
      offset: offset,
    });
  } catch (error) {
    logger.error('Get my media error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};

/**
 * Get a specific media file
 * GET /api/parent/media/:id
 */
export const getMediaById = async (req, res) => {
  try {
    const { id } = req.params;
    const groupId = await getParentGroupId(req.user.id);

    if (groupId) {
      const media = await Media.findOne({
        where: { id },
        include: [{
          model: Child,
          as: 'child',
          where: { groupId },
          attributes: ['id', 'firstName', 'lastName', 'photo'],
          required: true,
        }],
      });
      if (!media) return res.status(404).json({ error: 'Media not found' });
      return res.json({ success: true, data: media });
    }

    const media = await ParentMedia.findOne({
      where: { id, parentId: req.user.id },
    });
    if (!media) return res.status(404).json({ error: 'Media not found' });
    res.json({ success: true, data: media });
  } catch (error) {
    logger.error('Get media by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch media' });
  }
};
