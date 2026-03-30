import { Op } from 'sequelize';
import Media from '../models/Media.js';
import Child from '../models/Child.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { uploadFile, deleteFile } from '../config/storage.js';
import { createNotification } from './notificationController.js';
import { emitToUser } from '../config/socket.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';
import axios from 'axios';

// sharp is loaded dynamically to avoid startup crashes in containers
let sharpModule = null;
async function getSharp() {
  if (!sharpModule) {
    try {
      sharpModule = (await import('sharp')).default;
    } catch (error) {
      console.warn('Sharp module not available, thumbnails will be skipped:', error.message);
      return null;
    }
  }
  return sharpModule;
}

// Normalize media output: keep URL as-is, drop thumbnail
function sanitizeMediaUrls(media) {
  const data = media.toJSON ? media.toJSON() : media;
  return {
    ...data,
    thumbnail: null,
  };
}

export const getMedia = async (req, res) => {
  try {
    const { type, limit, offset, date, childId } = req.query;
    const limitNum = limit ? parseInt(limit) : undefined;
    const offsetNum = offset ? parseInt(offset) : 0;

    const where = {};
    
    // If user is teacher, show only media for children of assigned parents
    if (req.user.role === 'teacher') {
      // Get all parents assigned to this teacher
      const assignedParents = await User.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      
      if (assignedParents.length === 0) {
        return res.json([]);
      }
      
      const parentIds = assignedParents.map(p => p.id);
      
      // Get all children of assigned parents
      const children = await Child.findAll({
        where: { parentId: { [Op.in]: parentIds } },
        attributes: ['id'],
      });
      
      if (children.length === 0) {
        return res.json([]);
      }
      
      const childIds = children.map(c => c.id);
      
      if (childId) {
        // If childId is specified, verify it belongs to assigned parents
        if (!childIds.includes(childId)) {
          return res.status(403).json({ error: 'Access denied to this child' });
        }
        where.childId = childId;
      } else {
        // Show media for all assigned children
        where.childId = { [Op.in]: childIds };
      }
    } else if (req.user.role === 'admin') {
      // Admin can see all media
      if (childId) {
        where.childId = childId;
      }
      // If no childId, show all media
    } else {
      // For parents, show media for all their children or filter by childId
      const children = await Child.findAll({
        where: { parentId: req.user.id },
        attributes: ['id'],
      });

      if (children.length === 0) {
        return res.json([]);
      }

      const childIds = children.map(c => c.id);
      
      if (childId) {
        // If childId is specified, verify it belongs to the parent
        if (!childIds.includes(childId)) {
          return res.status(403).json({ error: 'Access denied to this child' });
        }
        where.childId = childId;
      } else {
        // Show media for all children
        where.childId = { [Op.in]: childIds };
      }
    }
    
    if (type) {
      where.type = type;
    }

    if (date) {
      where.date = date;
    }

    const media = await Media.findAll({
      where,
      order: [['date', 'DESC'], ['createdAt', 'DESC']],
      limit: limitNum,
      offset: offsetNum,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'date'],
        },
      ],
    });

    const sanitized = Array.isArray(media) ? media.map(sanitizeMediaUrls) : [];
    res.json(sanitized);
  } catch (error) {
    logger.error('Get media error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to get media' });
  }
};

export const getMediaItem = async (req, res) => {
  try {
    const { id } = req.params;

    const where = { id };
    
    // If user is teacher, only show media for children of assigned parents
    if (req.user.role === 'teacher') {
      // Get all parents assigned to this teacher
      const assignedParents = await User.findAll({
        where: { teacherId: req.user.id },
        attributes: ['id'],
      });
      
      if (assignedParents.length === 0) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
      const parentIds = assignedParents.map(p => p.id);
      
      // Get all children of assigned parents
      const children = await Child.findAll({
        where: { parentId: { [Op.in]: parentIds } },
        attributes: ['id'],
      });
      
      if (children.length === 0) {
        return res.status(404).json({ error: 'Media not found' });
      }
      
      const childIds = children.map(c => c.id);
      where.childId = { [Op.in]: childIds };
    } else if (req.user.role === 'admin') {
      // Admin can see all media - no filter needed
    } else {
      const children = await Child.findAll({
        where: { parentId: req.user.id },
        attributes: ['id'],
      });

      if (children.length === 0) {
        return res.status(404).json({ error: 'Child not found' });
      }

      const childIds = children.map(c => c.id);
      where.childId = { [Op.in]: childIds };
    }

    const mediaItem = await Media.findOne({
      where,
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'date', 'description'],
        },
      ],
    });

    if (!mediaItem) {
      return res.status(404).json({ error: 'Media not found' });
    }

    res.json(sanitizeMediaUrls(mediaItem));
  } catch (error) {
    logger.error('Get media item error', { error: error.message, stack: error.stack, mediaId: req.params.id });
    res.status(500).json({ error: 'Failed to get media item' });
  }
};

// Generate thumbnail for image
async function generateThumbnail(filePath, filename) {
  try {
    const sharp = await getSharp();
    if (!sharp) {
      logger.warn('Sharp not available, skipping thumbnail generation', { filename });
      return null;
    }

    const thumbnailName = `thumb_${filename}`;
    const thumbnailPath = path.join(path.dirname(filePath), thumbnailName);

    await sharp(filePath)
      .resize(300, 300, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFile(thumbnailPath);

    // Upload thumbnail to storage
    const thumbnailBuffer = fs.readFileSync(thumbnailPath);
    const thumbnailResult = await uploadFile(thumbnailBuffer, thumbnailName, 'image/jpeg');

    // Delete local thumbnail file
    fs.unlinkSync(thumbnailPath);

    return thumbnailResult.url;
  } catch (error) {
    logger.warn('Error generating thumbnail', { error: error.message, filename });
    return null;
  }
}

// Upload media file (teachers only)
// Helper to clean temp file safely
function safeCleanup(filePath) {
  if (!filePath) return;
  try {
    fs.unlinkSync(filePath);
  } catch (e) {
    logger.warn('Error cleaning up temp file', { error: e.message, path: filePath });
  }
}

export const uploadMedia = async (req, res) => {
  try {
    const appwriteConfigured = Boolean(
      process.env.APPWRITE_ENDPOINT &&
      process.env.APPWRITE_PROJECT_ID &&
      process.env.APPWRITE_API_KEY &&
      process.env.APPWRITE_BUCKET_ID
    );

    // In production, require Appwrite or GCS (not local storage)
    if (process.env.NODE_ENV === 'production' && !appwriteConfigured && !process.env.GCS_BUCKET_NAME) {
      logger.error('Media upload attempted without storage configuration in production', {
        hasAppwrite: !!appwriteConfigured,
        hasGCS: !!process.env.GCS_BUCKET_NAME,
      });
      return res.status(503).json({
        error: 'Storage not configured',
        message: 'Appwrite or Google Cloud Storage is required for media uploads in production. Please configure APPWRITE_* or GCP_* environment variables.',
      });
    }

    // In development, warn but allow local storage fallback
    if (!appwriteConfigured && process.env.NODE_ENV !== 'production') {
      logger.warn('Appwrite not configured, will use local storage fallback (files may not persist)');
    }

    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can upload media' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { childId, activityId, title, description, date } = req.body;

    // Validate required fields
    if (!childId) {
      // Clean up uploaded file
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.warn('Error deleting file during cleanup', { error: e.message, path: req.file?.path });
        }
      }
      return res.status(400).json({ error: 'Child ID is required' });
    }

    if (!title) {
      // Clean up uploaded file
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.warn('Error deleting file during cleanup', { error: e.message, path: req.file?.path });
        }
      }
      return res.status(400).json({ error: 'Title is required' });
    }

    // Determine media type from mimetype
    const isImage = req.file.mimetype.startsWith('image/');
    const isVideo = req.file.mimetype.startsWith('video/');
    const mediaType = isImage ? 'photo' : isVideo ? 'video' : null;

    if (!mediaType) {
      // Clean up uploaded file
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.warn('Error deleting file during cleanup', { error: e.message, path: req.file?.path });
        }
      }
      return res.status(400).json({ error: 'Invalid file type. Only images and videos are allowed.' });
    }

    // Verify child exists
    const child = await Child.findByPk(childId);
    if (!child) {
      // Clean up uploaded file
      if (req.file.path) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (e) {
          logger.warn('Error deleting file during cleanup', { error: e.message, path: req.file?.path });
        }
      }
      return res.status(404).json({ error: 'Child not found' });
    }

    // Validate activity if provided
    if (activityId) {
      const activity = await Activity.findByPk(activityId);
      if (!activity) {
        // Clean up uploaded file
        if (req.file.path) {
          try {
            fs.unlinkSync(req.file.path);
          } catch (e) {
            console.error('Error deleting file:', e);
          }
        }
        return res.status(404).json({ error: 'Activity not found' });
      }
    }

    // Upload file to Appwrite storage (single URL persisted)
    const fileBuffer = fs.readFileSync(req.file.path);
    let uploadResult;
    try {
      logger.info('Uploading file to Appwrite', {
        filename: req.file.filename,
        mimetype: req.file.mimetype,
        size: fileBuffer.length,
      });
      uploadResult = await uploadFile(fileBuffer, req.file.filename, req.file.mimetype);
      logger.info('File uploaded successfully to Appwrite', {
        url: uploadResult.url,
        path: uploadResult.path,
      });
    } catch (err) {
      safeCleanup(req.file.path);
      logger.error('Storage upload failed', { 
        error: err.message, 
        stack: err.stack,
        filename: req.file.filename,
        mimetype: req.file.mimetype,
      });
      return res.status(502).json({
        error: 'Storage upload failed',
        message: 'Failed to upload file to Appwrite storage. Check Appwrite credentials, bucket permissions, and endpoint connectivity.',
        details: err.message,
      });
    }

    // Always cleanup temp file after upload regardless of storage target
    safeCleanup(req.file.path);

    // Create media record
    // Store the Appwrite URL in the database - proxy endpoint will use it to extract file ID
    // Frontend will convert it to proxy URL using getProxyUrl helper
    const media = await Media.create({
      childId,
      activityId: activityId || null,
      type: mediaType,
      url: uploadResult.url,   // Store Appwrite URL (needed for proxy endpoint to extract file ID)
      thumbnail: null,         // no thumbnails persisted
      title,
      description: description || '',
      date: date || new Date().toISOString().split('T')[0],
    });

    logger.info('Media record created', {
      mediaId: media.id,
      url: media.url,
      type: mediaType,
      childId,
    });

    const createdMedia = await Media.findByPk(media.id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'date'],
        },
      ],
    });

    // Create notification for parent
    if (child.parentId) {
      const mediaTypeText = mediaType === 'photo' ? 'rasm' : 'video';
      await createNotification(
        child.parentId,
        childId,
        'media',
        `Yangi ${mediaTypeText} qo'shildi`,
        `${child.firstName} uchun "${title}" ${mediaTypeText} qo'shildi`,
        media.id,
        'media'
      );
    }

    // Frontend expects the full media object with url field
    const sanitized = sanitizeMediaUrls(createdMedia);
    res.status(201).json(sanitized);
  } catch (error) {
    logger.error('Upload media error', { error: error.message, stack: error.stack, userId: req.user?.id });
    
    // Clean up uploaded file if it exists
    if (req.file && req.file.path) {
      safeCleanup(req.file.path);
    }
    
    res.status(500).json({ error: 'Failed to upload media' });
  }
};

// Create media (teachers only) - URL-based (legacy support)
export const createMedia = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can create media' });
    }

    const { childId, activityId, type, url, title, description, date } = req.body;

    // Validate required fields
    if (!childId) {
      return res.status(400).json({ error: 'Child ID is required' });
    }
    if (!type || (type !== 'photo' && type !== 'video')) {
      return res.status(400).json({ error: 'Type must be "photo" or "video"' });
    }
    if (!url) {
      return res.status(400).json({ error: 'Media URL is required' });
    }
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    // Verify child exists
    const child = await Child.findByPk(childId);
    if (!child) {
      return res.status(404).json({ error: 'Child not found. Please select a valid child.' });
    }

    // Validate activity if provided
    if (activityId) {
      const activity = await Activity.findByPk(activityId);
      if (!activity) {
        return res.status(404).json({ error: 'Activity not found' });
      }
    }

    const media = await Media.create({
      childId,
      activityId: activityId || null,
      type,
      url,
      thumbnail: null,
      title,
      description: description || '',
      date,
    });

    const createdMedia = await Media.findByPk(media.id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'date'],
        },
      ],
    });

    // Create notification for parent
    if (child.parentId) {
      const mediaTypeText = type === 'photo' ? 'rasm' : 'video';
      await createNotification(
        child.parentId,
        childId,
        'media',
        `Yangi ${mediaTypeText} qo'shildi`,
        `${child.firstName} uchun "${title}" ${mediaTypeText} qo'shildi`,
        media.id,
        'media'
      );

      // Emit real-time update to parent
      emitToUser(child.parentId, 'media:created', {
        media: createdMedia.toJSON(),
        timestamp: new Date().toISOString(),
      });
    }

    res.status(201).json(createdMedia);
  } catch (error) {
    logger.error('Create media error', { error: error.message, stack: error.stack });
    
    // Provide more specific error messages
    if (error.name === 'SequelizeValidationError') {
      return res.status(400).json({ 
        error: 'Validation error',
        details: error.errors.map(e => e.message),
      });
    }
    
    if (error.name === 'SequelizeForeignKeyConstraintError') {
      return res.status(400).json({ 
        error: 'Invalid child ID. Please select a valid child.',
      });
    }

    const errorMessage = error.message || 'Failed to create media';
    res.status(500).json({ error: errorMessage });
  }
};

// Update media (teachers only)
export const updateMedia = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can update media' });
    }

    const { id } = req.params;
    const media = await Media.findByPk(id);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Get child for parent notification
    const child = await Child.findByPk(media.childId);

    const allowedFields = ['title', 'description', 'caption', 'tags'];
    const payload = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) payload[field] = req.body[field];
    }
    await media.update(payload);

    const updatedMedia = await Media.findByPk(id, {
      include: [
        {
          model: Child,
          as: 'child',
          attributes: ['id', 'firstName', 'lastName'],
        },
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'date'],
        },
      ],
    });

    // Emit real-time update to parent
    if (child && child.parentId) {
      emitToUser(child.parentId, 'media:updated', {
        media: updatedMedia.toJSON(),
        timestamp: new Date().toISOString(),
      });
    }

    res.json(updatedMedia);
  } catch (error) {
    logger.error('Update media error', { error: error.message, stack: error.stack, mediaId: req.params.id });
    res.status(500).json({ error: 'Failed to update media' });
  }
};

// Delete media (teachers only)
// Helper function to return transparent PNG for errors
const returnTransparentPng = (res, statusCode = 404) => {
  const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'no-cache');
  return res.status(statusCode).send(transparentPng);
};

// Proxy Appwrite file through backend to avoid CORS issues
export const proxyMediaFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return returnTransparentPng(res, 400);
    }

    // Get media record by ID (database UUID)
    const media = await Media.findByPk(fileId);
    
    if (!media) {
      logger.error('Media not found for proxy', {
        fileId,
      });
      return returnTransparentPng(res, 404);
    }

    // Check if URL is from Appwrite
    if (!media.url) {
      return returnTransparentPng(res, 400);
    }
    
    // Extract Appwrite file ID from URL
    // URL format: https://fra.cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/view?project={projectId}
    // or: https://fra.cloud.appwrite.io/v1/storage/buckets/{bucketId}/files/{fileId}/preview?project={projectId}
    // OR: old proxy URL format (should not happen, but handle it)
    let appwriteFileId = null;
    
    // Check if URL is an Appwrite URL
    if (media.url.includes('appwrite.io') && media.url.includes('/files/')) {
      // Extract Appwrite file ID from URL
      const match = media.url.match(/\/files\/([^/?]+)/);
      if (match && match[1]) {
        appwriteFileId = match[1];
      }
    } else if (media.url.includes('/api/media/proxy/')) {
      // This is an old proxy URL - we can't extract Appwrite file ID from it
      // This shouldn't happen with new records, but handle it gracefully
      logger.error('Media URL is already a proxy URL - cannot extract Appwrite file ID', {
        mediaId: fileId,
        mediaUrl: media.url,
      });
      return returnTransparentPng(res, 400);
    }

    if (!appwriteFileId) {
      logger.error('Could not extract Appwrite file ID from media URL', {
        mediaId: fileId,
        mediaUrl: media.url,
        urlType: media.url.includes('appwrite.io') ? 'appwrite' : media.url.includes('/api/media/proxy/') ? 'proxy' : 'unknown',
        urlLength: media.url?.length,
        urlSubstring: media.url?.substring(0, 200), // First 200 chars for debugging
        hasAppwriteIo: media.url.includes('appwrite.io'),
        hasFiles: media.url.includes('/files/'),
        matchResult: media.url.match(/\/files\/([^/?]+)/),
      });
      
      return returnTransparentPng(res, 400);
    }

    // Get Appwrite configuration
    const appwriteEndpoint = process.env.APPWRITE_ENDPOINT?.replace(/\/+$/, '');
    const appwriteBucketId = process.env.APPWRITE_BUCKET_ID;
    const appwriteProjectId = process.env.APPWRITE_PROJECT_ID;
    const appwriteApiKey = process.env.APPWRITE_API_KEY;

    if (!appwriteEndpoint || !appwriteBucketId || !appwriteProjectId || !appwriteApiKey) {
      logger.error('Appwrite not configured for proxy', {
        hasEndpoint: !!appwriteEndpoint,
        hasBucketId: !!appwriteBucketId,
        hasProjectId: !!appwriteProjectId,
        hasApiKey: !!appwriteApiKey,
      });
      return returnTransparentPng(res, 503);
    }

    // Construct Appwrite file URL (use view endpoint)
    // Try view endpoint first, if it fails, try preview endpoint
    const appwriteUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${appwriteFileId}/view?project=${appwriteProjectId}`;

    logger.info('Proxying Appwrite file', {
      mediaId: fileId,
      appwriteFileId,
      appwriteUrl,
      mediaType: media.type,
      originalUrl: media.url,
      urlIncludesAppwrite: media.url.includes('appwrite.io'),
      urlIncludesFiles: media.url.includes('/files/'),
      urlLength: media.url?.length,
      urlSubstring: media.url?.substring(0, 100), // First 100 chars for debugging
    });

    // Fetch file from Appwrite
    let response;
    try {
      response = await axios.get(appwriteUrl, {
        headers: {
          'X-Appwrite-Project': appwriteProjectId,
          'X-Appwrite-Key': appwriteApiKey,
        },
        responseType: 'stream',
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status < 500, // Don't throw on 4xx errors
      });

      // If view endpoint returns 404 or 403, try preview endpoint
      if (response.status === 404 || response.status === 403) {
        logger.warn('View endpoint failed, trying preview endpoint', {
          status: response.status,
          mediaId: fileId,
        });
        const previewUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${appwriteFileId}/preview?project=${appwriteProjectId}`;
        response = await axios.get(previewUrl, {
          headers: {
            'X-Appwrite-Project': appwriteProjectId,
            'X-Appwrite-Key': appwriteApiKey,
          },
          responseType: 'stream',
          timeout: 30000,
        });
      }
    } catch (axiosError) {
      // If view endpoint fails, try preview endpoint
      if (axiosError.response?.status === 404 || axiosError.response?.status === 403) {
        logger.warn('View endpoint failed, trying preview endpoint', {
          status: axiosError.response?.status,
          mediaId: fileId,
        });
        const previewUrl = `${appwriteEndpoint}/storage/buckets/${appwriteBucketId}/files/${appwriteFileId}/preview?project=${appwriteProjectId}`;
        response = await axios.get(previewUrl, {
          headers: {
            'X-Appwrite-Project': appwriteProjectId,
            'X-Appwrite-Key': appwriteApiKey,
          },
          responseType: 'stream',
          timeout: 30000,
        });
      } else {
        throw axiosError;
      }
    }

    // Check if response is successful BEFORE setting headers
    if (response.status >= 400) {
      logger.error('Appwrite returned error status', {
        status: response.status,
        mediaId: fileId,
        appwriteFileId,
        appwriteUrl,
        responseHeaders: response.headers,
      });
      
      // If headers already sent, we can't send error response
      if (!res.headersSent) {
        return returnTransparentPng(res, response.status);
      }
      return;
    }

    // Set appropriate headers BEFORE piping
    const contentType = response.headers['content-type'] || 
                       (media.type === 'video' ? 'video/mp4' : 'image/jpeg');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow CORS
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'); // Allow cross-origin usage
    if (response.headers['content-length']) {
      res.setHeader('Content-Length', response.headers['content-length']);
    }

    // Pipe the file stream to response
    response.data.pipe(res);
    
    // Handle stream errors
    response.data.on('error', (streamError) => {
      logger.error('Error streaming file from Appwrite', {
        error: streamError.message,
        stack: streamError.stack,
        mediaId: fileId,
        appwriteFileId,
      });
      // Don't try to send response if headers already sent
      if (!res.headersSent) {
        return returnTransparentPng(res, 500);
      }
    });
    
    // Handle successful stream completion
    response.data.on('end', () => {
      logger.info('Successfully proxied Appwrite file', {
        mediaId: fileId,
        appwriteFileId,
        contentType,
      });
    });
  } catch (error) {
    logger.error('Proxy media file error', { 
      error: error.message, 
      stack: error.stack,
      fileId: req.params.fileId,
      responseStatus: error.response?.status,
      responseStatusText: error.response?.statusText,
      responseData: error.response?.data,
      responseHeaders: error.response?.headers,
      axiosError: error.isAxiosError,
      code: error.code,
    });
    
    // Don't try to send response if headers already sent
    if (res.headersSent) {
      logger.warn('Headers already sent, cannot send error response', {
        fileId: req.params.fileId,
      });
      return;
    }
    
    // Return transparent PNG for all errors
    return returnTransparentPng(res, error.response?.status || 500);
  }
};

export const deleteMedia = async (req, res) => {
  try {
    if (req.user.role !== 'teacher' && req.user.role !== 'admin' && req.user.role !== 'reception') {
      return res.status(403).json({ error: 'Only teachers, admins, and reception can delete media' });
    }

    const { id } = req.params;
    const media = await Media.findByPk(id);

    if (!media) {
      return res.status(404).json({ error: 'Media not found' });
    }

    // Get child for parent notification before destroying
    const child = await Child.findByPk(media.childId);
    const mediaId = media.id;

    // Delete file from storage
    try {
      await deleteFile(media.url);

      // Also delete thumbnail if it exists
      if (media.thumbnail && media.thumbnail !== media.url) {
        await deleteFile(media.thumbnail);
      }
    } catch (error) {
      logger.warn('Error deleting file from storage', { error: error.message, mediaId: id });
      // Continue with database deletion even if file deletion fails
    }

    await media.destroy();

    // Emit real-time update to parent
    if (child && child.parentId) {
      emitToUser(child.parentId, 'media:deleted', {
        mediaId,
        childId: child.id,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    logger.error('Delete media error', { error: error.message, stack: error.stack, mediaId: req.params.id });
    res.status(500).json({ error: 'Failed to delete media' });
  }
};
