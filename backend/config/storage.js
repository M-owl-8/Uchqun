import path from 'path';
import fs from 'fs';
import { Client as AppwriteClient, Storage as AppwriteStorage, ID } from 'node-appwrite';
import { InputFile } from 'node-appwrite/file';
import logger from '../utils/logger.js';

let appwriteClient;
let appwriteStorage;
let appwriteBucketId;
let appwriteProjectId;
const fileBaseUrl = (process.env.FILE_BASE_URL || process.env.PUBLIC_API_URL || '').replace(/\/+$/, '');
const localUploadsRoot = process.env.LOCAL_UPLOADS_DIR || path.join(process.cwd(), 'uploads');
const fallbackEnabled = process.env.LOCAL_STORAGE_FALLBACK === 'true' && process.env.NODE_ENV !== 'production';
const localMediaDir = path.join(localUploadsRoot, 'media');

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Always ensure local folders exist for fallback/local dev usage
ensureDir(localMediaDir);
const appwriteConfigured = Boolean(
  process.env.APPWRITE_ENDPOINT &&
  process.env.APPWRITE_PROJECT_ID &&
  process.env.APPWRITE_API_KEY &&
  process.env.APPWRITE_BUCKET_ID
);

// Initialize Appwrite Storage if configured
if (appwriteConfigured) {
  try {
    appwriteClient = new AppwriteClient()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    appwriteStorage = new AppwriteStorage(appwriteClient);
    appwriteBucketId = process.env.APPWRITE_BUCKET_ID;
    appwriteProjectId = process.env.APPWRITE_PROJECT_ID;
    logger.info('Appwrite Storage initialized', {
      endpoint: process.env.APPWRITE_ENDPOINT,
      projectId: process.env.APPWRITE_PROJECT_ID,
      bucketId: appwriteBucketId,
    });
  } catch (error) {
    logger.warn('Failed to initialize Appwrite Storage', { message: error.message });
    logger.warn('Falling back to other storage options');
  }
} else {
  logger.warn('Appwrite Storage not configured. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY, and APPWRITE_BUCKET_ID');
}

/**
 * Upload file to storage (Appwrite preferred, local fallback)
 * @param {Buffer|Stream} file - File buffer or stream
 * @param {string} filename - Destination filename
 * @param {string} mimetype - File MIME type
 * @returns {Promise<{url: string, path: string}>}
 */
export async function uploadFile(file, filename, mimetype) {
  // Prefer Appwrite if configured
  if (appwriteConfigured) {
    try {
      if (!appwriteStorage || !appwriteBucketId) {
        const error = new Error('Appwrite storage not initialized');
        logger.error('Appwrite storage check failed', {
          hasStorage: !!appwriteStorage,
          hasBucketId: !!appwriteBucketId,
          bucketId: appwriteBucketId,
        });
        throw error;
      }

      logger.info('Starting Appwrite upload', {
        filename,
        mimetype,
        bucketId: appwriteBucketId,
        projectId: appwriteProjectId,
        endpoint: process.env.APPWRITE_ENDPOINT,
      });

      const buffer = Buffer.isBuffer(file) ? file : await streamToBuffer(file);
      const fileId = ID.unique();
      
      logger.info('Creating file in Appwrite', {
        fileId,
        filename,
        size: buffer.length,
        bucketId: appwriteBucketId,
      });

      // Use bucket's default permissions — avoids needing permission-management scope on the API key
      const createdFile = await appwriteStorage.createFile(
        appwriteBucketId,
        fileId,
        InputFile.fromBuffer(buffer, filename)
      );

      logger.info('Appwrite file created', {
        fileId: createdFile.$id,
        name: createdFile.name,
        sizeOriginal: createdFile.sizeOriginal,
        mimeType: createdFile.mimeType,
        uploadedMimeType: mimetype,
      });

      const baseEndpoint = process.env.APPWRITE_ENDPOINT.replace(/\/+$/, '');
      // Store the original Appwrite URL (will be updated to proxy URL after media record is created)
      const appwriteUrl = `${baseEndpoint}/storage/buckets/${appwriteBucketId}/files/${createdFile.$id}/view?project=${appwriteProjectId}`;
      
      logger.info('Generated Appwrite URL', {
        appwriteUrl,
        fileId: createdFile.$id,
        isVideo: mimetype.startsWith('video/'),
        isImage: mimetype.startsWith('image/'),
        mimetype,
      });

      logger.info('Appwrite file uploaded successfully', {
        fileId: createdFile.$id,
        filename,
        appwriteUrl,
        size: buffer.length,
      });

      return {
        url: appwriteUrl, // Return original Appwrite URL, will be updated to proxy URL in controller
        path: createdFile.$id, // Appwrite file ID
        appwriteFileId: createdFile.$id, // Also return Appwrite file ID for reference
      };
    } catch (err) {
      // Log detailed error information
      logger.error('Appwrite upload error', {
        message: err.message,
        code: err.code,
        type: err.type,
        response: err.response ? {
          status: err.response.status,
          statusText: err.response.statusText,
          data: err.response.data,
        } : null,
        stack: err.stack,
        filename,
        mimetype,
        bucketId: appwriteBucketId,
        projectId: appwriteProjectId,
        endpoint: process.env.APPWRITE_ENDPOINT,
      });

      // Allow local fallback when explicitly enabled (LOCAL_STORAGE_FALLBACK=true, non-production).
      // In production fallback is always disabled to prevent silent data loss.
      if (!fallbackEnabled) {
        const errorMessage = err.response?.data?.message || err.message || 'Unknown error';
        const errorCode = err.code || err.response?.status || 'UNKNOWN';
        const detailedError = new Error(`Appwrite upload failed (${errorCode}): ${errorMessage}. Check Appwrite credentials, bucket permissions, and endpoint connectivity.`);
        detailedError.code = errorCode;
        detailedError.originalError = err;
        throw detailedError;
      }
      logger.warn('Appwrite upload failed, falling back to local storage', { message: err.message });
    }
  }

  // Local disk fallback. Writing to the container filesystem on Railway is
  // ephemeral (files are lost on restart), but it keeps uploads working in
  // local dev. Set LOCAL_STORAGE_FALLBACK=true (non-production only) to enable.
  if (process.env.NODE_ENV === 'production' && !appwriteConfigured) {
    if (!fallbackEnabled) {
      throw new Error(
        'Storage not configured for production. Please configure Appwrite (APPWRITE_*) environment variables.'
      );
    }
    logger.warn('No cloud storage configured; using ephemeral local disk -- files lost on restart. Configure APPWRITE_* env vars.');
  }

  try {
    const buffer = Buffer.isBuffer(file) ? file : await streamToBuffer(file);
    const safeName = filename || `upload-${Date.now()}`;
    const destination = path.join(localMediaDir, safeName);
    
    // Ensure directory exists
    ensureDir(localMediaDir);
    await fs.promises.writeFile(destination, buffer);

    // URL is served statically from Express (/uploads)
    const urlPath = `/uploads/media/${safeName}`;
    const absoluteUrl = fileBaseUrl ? `${fileBaseUrl}${urlPath}` : urlPath;

    // Log warning in production if using local storage
    if (process.env.NODE_ENV === 'production') {
      logger.warn('Using local storage in production -- files lost on restart. Configure Appwrite for persistent storage.');
    }

    return {
      url: absoluteUrl,
      path: destination,
    };
  } catch (localError) {
    logger.error('Local storage write error', {
      error: localError.message,
      stack: localError.stack,
      filename,
      mimetype,
      localMediaDir,
      hasFile: !!file
    });
    throw new Error(`Local storage write failed: ${localError.message}`);
  }
}

/**
 * Delete file from storage
 * @param {string} filepath - File path or filename
 * @returns {Promise<void>}
 */
export async function deleteFile(filepath) {
  if (appwriteConfigured) {
    try {
      if (!appwriteStorage || !appwriteBucketId) {
        throw new Error('Appwrite storage not initialized');
      }
      let fileId = filepath;
      // If a full Appwrite URL was provided, extract the file id from it
      try {
        if (fileId.startsWith('http')) {
          const url = new URL(fileId);
          // URL pattern: /storage/buckets/{bucketId}/files/{fileId}/view
          const match = url.pathname.match(/\/files\/([^/]+)\//);
          if (match && match[1]) {
            fileId = match[1];
          }
        }
      } catch {
        // Ignore URL parsing errors and fall back to the provided value
      }

      await appwriteStorage.deleteFile(appwriteBucketId, fileId);
      return;
    } catch (err) {
      if (fallbackEnabled) {
        logger.warn('Appwrite delete failed, falling back to local delete', { message: err.message });
      } else {
        throw err;
      }
    }
  }

  // Local fallback deletion
  try {
    let localPath = filepath;
    if (filepath.startsWith('http')) {
      try {
        const urlObj = new URL(filepath);
        localPath = urlObj.pathname.replace('/uploads', 'uploads');
      } catch {
        // fallback to raw filepath
      }
    }
    if (localPath.startsWith('/uploads')) {
      localPath = path.join(process.cwd(), localPath.replace('/uploads', 'uploads'));
    }
    await fs.promises.unlink(localPath);
  } catch {
    // Ignore if already deleted or path invalid
  }
}

/**
 * Generate signed URL for private file access (if needed)
 * @param {string} filename - File filename
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<string>}
 */
export async function getSignedUrl(filename, _expiresIn = 3600) {
  if (appwriteConfigured) {
    if (!appwriteStorage || !appwriteBucketId) {
      throw new Error('Appwrite storage not initialized');
    }
    const baseEndpoint = process.env.APPWRITE_ENDPOINT.replace(/\/+$/, '');
    return `${baseEndpoint}/storage/buckets/${appwriteBucketId}/files/${filename}/view?project=${appwriteProjectId}`;
  }

  throw new Error('No storage configured. Please set Appwrite credentials (APPWRITE_*).');
}

async function streamToBuffer(stream) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

