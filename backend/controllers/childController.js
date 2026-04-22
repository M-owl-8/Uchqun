import { Op } from 'sequelize';
import Child from '../models/Child.js';
import User from '../models/User.js';
import Group from '../models/Group.js';
import { uploadFile, deleteFile } from '../config/storage.js'; // deleteFile qo'shildi
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

    // Handle photo upload - supports both multipart (req.file) and base64 (req.body.photoBase64)
    if (req.file) {
      try {
        // Delete old photo if exists
        if (child.photo) {
          try {
            await deleteFile(child.photo);
            logger.info('Old child photo deleted', { childId: id, oldPhotoUrl: child.photo });
          } catch (deleteError) {
            logger.warn('Failed to delete old child photo', {
              childId: id,
              error: deleteError.message,
              oldPhotoUrl: child.photo,
            });
          }
        }

        const fileBuffer = req.file.buffer;
        let extension = req.file.originalname.substring(req.file.originalname.lastIndexOf('.') + 1) ||
                     req.file.mimetype.split('/')[1] || 'jpg';
        
        if (extension === 'jpeg') extension = 'jpg';
        
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!validExtensions.includes(extension.toLowerCase())) {
          extension = 'jpg';
        }
        
        const filename = `child-${id}-${Date.now()}.${extension.toLowerCase()}`;

        const uploadResult = await uploadFile(fileBuffer, filename, req.file.mimetype);
        
        if (!uploadResult?.url) {
          throw new Error('Upload succeeded but no URL returned');
        }
        
        updateData.photo = uploadResult.url;
        delete updateData.photoBase64;
        
      } catch (uploadError) {
        logger.error('Photo upload error (multipart)', { 
          error: uploadError.message,
          childId: id,
          stack: uploadError.stack,
        });
        return res.status(500).json({ 
          error: 'Failed to upload photo',
          details: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
        });
      }
      
    } else if (req.body.photoBase64 && req.body.photoBase64 !== child.photo) {
      // Only process if photoBase64 is provided AND it's different from current photo
      try {
        if (typeof req.body.photoBase64 !== 'string') {
          return res.status(400).json({ error: 'photoBase64 must be a string' });
        }

        const matches = req.body.photoBase64.match(/^data:(.+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          logger.warn('Invalid base64 format', {
            hasPrefix: req.body.photoBase64.startsWith('data:'),
            length: req.body.photoBase64.length,
          });
          return res.status(400).json({ 
            error: 'Invalid base64 photo format. Expected format: data:image/jpeg;base64,...' 
          });
        }

        const mimetype = matches[1];
        const base64Data = matches[2];
        
        if (!base64Data || base64Data.length === 0) {
          return res.status(400).json({ error: 'Empty base64 data' });
        }

        let fileBuffer;
        try {
          fileBuffer = Buffer.from(base64Data, 'base64');
          if (fileBuffer.length === 0) {
            return res.status(400).json({ error: 'Failed to decode base64 data' });
          }
        } catch (decodeError) {
          logger.error('Base64 decode error', { error: decodeError.message });
          return res.status(400).json({ error: 'Invalid base64 encoding' });
        }

        // Delete old photo if exists
        if (child.photo) {
          try {
            await deleteFile(child.photo);
            logger.info('Old child photo deleted', { childId: id, oldPhotoUrl: child.photo });
          } catch (deleteError) {
            logger.warn('Failed to delete old child photo', {
              childId: id,
              error: deleteError.message,
              oldPhotoUrl: child.photo,
            });
          }
        }

        // Normalize extension
        let extension = mimetype.split('/')[1] || 'jpg';
        if (extension === 'jpeg') extension = 'jpg';
        
        const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
        if (!validExtensions.includes(extension.toLowerCase())) {
          extension = 'jpg';
        }
        
        const filename = `child-${id}-${Date.now()}.${extension.toLowerCase()}`;

        logger.info('Uploading child photo', {
          childId: id,
          filename,
          mimetype,
          size: fileBuffer.length,
        });

        const uploadResult = await uploadFile(fileBuffer, filename, mimetype);
        
        logger.info('Upload file result:', {
          hasUrl: !!uploadResult?.url,
          url: uploadResult?.url?.substring(0, 100),
        });

        if (!uploadResult || !uploadResult.url) {
          logger.error('Upload result missing URL', { uploadResult, childId: id });
          return res.status(500).json({
            error: 'Upload succeeded but no URL returned',
            details: process.env.NODE_ENV === 'development' ? 'Upload result is missing URL field' : undefined,
          });
        }

        updateData.photo = uploadResult.url;
        delete updateData.photoBase64;
        
        logger.info('Child photo uploaded successfully', {
          childId: id,
          url: uploadResult.url.substring(0, 100),
        });
        
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

// Add child (if needed for direct child creation)
export const addChild = async (req, res) => {
  try {
    const { parentId, ...childData } = req.body;

    // Validate parent exists
    const parent = await User.findByPk(parentId);
    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Validate required fields
    const requiredFields = ['firstName', 'lastName', 'dateOfBirth', 'disabilityType'];
    const missingFields = requiredFields.filter(field => !childData[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        error: 'Missing required fields',
        missing: missingFields,
      });
    }

    // Create child
    const child = await Child.create({
      ...childData,
      parentId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const childResponse = child.toJSON();
    childResponse.age = child.getAge();

    // Emit real-time notification
    emitToUser(parentId, 'child:added', {
      child: childResponse,
      timestamp: new Date().toISOString(),
    });

    res.status(201).json({
      success: true,
      message: 'Child added successfully',
      data: childResponse,
    });
    
  } catch (error) {
    logger.error('Add child error', {
      error: error.message,
      stack: error.stack,
      parentId: req.body?.parentId,
    });
    
    res.status(500).json({
      error: 'Failed to add child',
      message: error.message || 'Unknown error occurred',
    });
  }
};