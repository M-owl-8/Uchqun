import Document from '../models/Document.js';
import SuperAdminMessage from '../models/SuperAdminMessage.js';
import logger from '../utils/logger.js';
import { uploadFile } from '../config/storage.js';
import fs from 'fs';

export const uploadDocument = async (req, res) => {
  let tempPath = null;
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'File is required' });
    if (!documentType) return res.status(400).json({ error: 'Document type is required' });

    tempPath = file.path;
    const buffer = await fs.promises.readFile(tempPath);
    const { url: persistentUrl } = await uploadFile(buffer, file.filename, file.mimetype);

    const document = await Document.create({
      userId: req.user.id,
      documentType,
      fileName: file.originalname,
      filePath: persistentUrl,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'pending',
    });

    await req.user.update({ isVerified: true });

    logger.info('Document uploaded by Reception', { documentId: document.id, userId: req.user.id, documentType, storageUrl: persistentUrl });
    res.status(201).json({ success: true, message: 'Document uploaded successfully', data: document });
  } catch (error) {
    logger.error('Upload document error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to upload document' });
  } finally {
    if (tempPath) fs.promises.unlink(tempPath).catch(() => {});
  }
};

export const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({ where: { userId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Get my documents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

export const getVerificationStatus = async (req, res) => {
  try {
    const documents = await Document.findAll({ where: { userId: req.user.id } });
    res.json({
      success: true,
      data: {
        isVerified: req.user.isVerified,
        documentsApproved: req.user.documentsApproved,
        isActive: req.user.isActive,
        documentsCount: documents.length,
        pendingCount: documents.filter(d => d.status === 'pending').length,
        approvedCount: documents.filter(d => d.status === 'approved').length,
        rejectedCount: documents.filter(d => d.status === 'rejected').length,
      },
    });
  } catch (error) {
    logger.error('Get verification status error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
};

export const getMyMessages = async (req, res) => {
  try {
    const messages = await SuperAdminMessage.findAll({ where: { senderId: req.user.id }, order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: messages.map(m => m.toJSON()) });
  } catch (error) {
    logger.error('Get my messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};
