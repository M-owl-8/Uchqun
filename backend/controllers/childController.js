import Child from '../models/Child.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import { deleteFile } from '../config/storage.js';
import logger from '../utils/logger.js';
import { emitToUser } from '../config/socket.js';

// Get all children for the logged-in parent
export const getChildren = async (req, res) => {
  try {
    const children = await Child.findAll({
      where: { parentId: req.user.id },
      include: [
        {
          model: User,
          as: 'parent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Group,
          as: 'childGroup',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    const childrenData = children.map(child => {
      const data = child.toJSON();
      data.age = child.getAge();
      return data;
    });

    res.json(childrenData);
  } catch (error) {
    logger.error('Get children error', { error: error.message, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get children' });
  }
};

// Get a specific child by ID (for parents, only their own children)
export const getChild = async (req, res) => {
  try {
    const { id } = req.params;

    const child = await Child.findOne({
      where: {
        id,
        parentId: req.user.id
      },
      include: [
        {
          model: User,
          as: 'parent',
          attributes: ['id', 'firstName', 'lastName', 'email', 'phone'],
        },
        {
          model: Group,
          as: 'childGroup',
          attributes: ['id', 'name'],
          required: false,
        },
      ],
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const childData = child.toJSON();
    childData.age = child.getAge();

    res.json(childData);
  } catch (error) {
    logger.error('Get child error', { error: error.message, childId: req.params?.id, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to get child' });
  }
};

// Delete child
export const deleteChild = async (req, res) => {
  try {
    const { id } = req.params;

    const child = await Child.findOne({
      where: {
        id,
        parentId: req.user.id,
      },
    });

    if (!child) {
      return res.status(404).json({ error: 'Child not found or you do not have permission' });
    }

    // Delete photo from storage if exists
    if (child.photo) {
      try {
        await deleteFile(child.photo);
        logger.info('Child photo deleted', { childId: id, photoUrl: child.photo });
      } catch (deleteError) {
        logger.warn('Failed to delete child photo from storage', {
          childId: id,
          error: deleteError.message,
          photoUrl: child.photo,
        });
        // Continue deleting child even if photo deletion fails
      }
    }

    // Store parentId for socket emission before deletion
    const parentId = child.parentId;

    // Delete child from database
    await child.destroy();

    // Emit real-time delete notification to parent
    emitToUser(parentId, 'child:deleted', {
      childId: id,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Child deleted successfully',
    });
  } catch (error) {
    logger.error('Delete child error', {
      error: error.message,
      childId: req.params?.id,
      userId: req.user?.id,
    });
    res.status(500).json({ error: 'Failed to delete child' });
  }
};

// Update child
export const updateChild = async (req, res) => {
  try {
    const { id } = req.params;

    // The route middleware has already verified permission and attached req.child.
    // Fallback for direct controller calls: honor parent-only rule when role is parent.
    let child = req.child;
    if (!child) {
      const where = { id };
      if (req.user?.role === 'parent') {
        where.parentId = req.user.id;
      }
      child = await Child.findOne({ where });
    }

    if (!child) {
      return res.status(404).json({ error: 'Child not found' });
    }

    const updateData = { ...req.body };

    // Handle photo upload - store as base64 data URI in DB so the image
    // survives Railway container restarts (ephemeral disk wipes /uploads).
    const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // ~1.5 MB raw
    if (req.file) {
      try {
        if (req.file.buffer.length > MAX_PHOTO_BYTES) {
          return res.status(413).json({
            error: 'Photo too large',
            message: 'Please pick an image smaller than 1.5 MB.',
          });
        }
        const mimetype = req.file.mimetype || 'image/jpeg';
        updateData.photo = `data:${mimetype};base64,${req.file.buffer.toString('base64')}`;
        delete updateData.photoBase64;
      } catch (uploadError) {
        logger.error('Photo encode error (multipart)', {
          error: uploadError.message,
          childId: id,
        });
        return res.status(500).json({
          error: 'Failed to process photo',
          details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
        });
      }

    } else if (req.body.photoBase64 && req.body.photoBase64 !== child.photo) {
      // photoBase64 path — accept "data:image/...;base64,..." and persist as-is
      try {
        if (typeof req.body.photoBase64 !== 'string') {
          return res.status(400).json({ error: 'photoBase64 must be a string' });
        }

        const matches = req.body.photoBase64.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          return res.status(400).json({
            error: 'Invalid base64 photo format. Expected format: data:image/jpeg;base64,...'
          });
        }

        const base64Data = matches[2];
        if (!base64Data || base64Data.length === 0) {
          return res.status(400).json({ error: 'Empty base64 data' });
        }

        const decodedSize = Math.floor((base64Data.length * 3) / 4);
        if (decodedSize > MAX_PHOTO_BYTES) {
          return res.status(413).json({
            error: 'Photo too large',
            message: 'Please pick an image smaller than 1.5 MB.',
          });
        }

        updateData.photo = req.body.photoBase64;
        delete updateData.photoBase64;
        
      } catch (uploadError) {
        logger.error('Photo upload error (base64)', {
          error: uploadError.message,
          stack: uploadError.stack,
          childId: id,
          errorCode: uploadError.code,
        });
        
        if (res.headersSent) return;
        
        return res.status(500).json({
          error: 'Failed to upload photo',
          message: uploadError.message || 'Unknown upload error',
          code: uploadError.code || 'UNKNOWN',
        });
      }
    } else if (req.body.removePhoto === true || req.body.removePhoto === 'true') {
      // Handle photo removal
      if (child.photo) {
        try {
          await deleteFile(child.photo);
          logger.info('Child photo removed as requested', { childId: id, photoUrl: child.photo });
        } catch (deleteError) {
          logger.warn('Failed to delete child photo', {
            childId: id,
            error: deleteError.message,
            photoUrl: child.photo,
          });
        }
      }
      updateData.photo = null;
    }

    try {
      // Only validate required fields that are being EXPLICITLY set — skip if
      // the caller is doing a partial update (e.g. photo-only upload).
      const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'disabilityType'];
      const blankedRequired = requiredFields.filter(field =>
        Object.prototype.hasOwnProperty.call(updateData, field) &&
        (updateData[field] === null || updateData[field] === ''),
      );

      if (blankedRequired.length > 0) {
        return res.status(400).json({
          error: 'Required fields cannot be blank',
          missing: blankedRequired,
        });
      }

      // Update child with timestamp
      await child.update({
        ...updateData,
        updatedAt: new Date(),
      });
      
      await child.reload();
      
    } catch (updateError) {
      logger.error('Child update error', {
        error: updateError.message,
        stack: updateError.stack,
        childId: id,
      });
      
      return res.status(500).json({
        error: 'Failed to update child record',
        details: process.env.NODE_ENV === 'development' ? updateError.message : undefined,
      });
    }

    const childData = child.toJSON();
    childData.age = child.getAge();

    // Emit real-time update to parent
    emitToUser(child.parentId, 'child:updated', {
      child: childData,
      timestamp: new Date().toISOString(),
    });

    res.json({
      success: true,
      message: 'Child updated successfully',
      data: childData,
    });
    
  } catch (error) {
    logger.error('Update child error', {
      error: error.message,
      stack: error.stack,
      childId: req.params?.id,
      userId: req.user?.id,
    });
    
    if (res.headersSent) return;
    
    res.status(500).json({
      error: 'Failed to update child',
      message: error.message || 'Unknown error occurred',
    });
  }
};

