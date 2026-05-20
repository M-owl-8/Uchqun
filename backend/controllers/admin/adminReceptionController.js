import { Op } from 'sequelize';
import User from '../../models/User.js';
import Document from '../../models/Document.js';
import logger from '../../utils/logger.js';
import { invalidateUserCache } from '../../middleware/auth.js';

/**
 * Get all Reception accounts with their verification status
 * GET /api/admin/receptions
 */
export const getReceptions = async (req, res) => {
  try {
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Document,
          as: 'documents',
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: receptions,
    });
  } catch (error) {
    logger.error('Get receptions error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch reception accounts' });
  }
};

/**
 * Get a specific Reception account with documents
 * GET /api/admin/receptions/:id
 */
export const getReceptionById = async (req, res) => {
  try {
    const { id } = req.params;

    const reception = await User.findOne({
      where: { id, role: 'reception', createdBy: req.user.id },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Document,
          as: 'documents',
          required: false,
        },
      ],
    });

    if (!reception) {
      return res.status(404).json({ error: 'Reception account not found' });
    }

    res.json({
      success: true,
      data: reception,
    });
  } catch (error) {
    logger.error('Get reception by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch reception account' });
  }
};

const VALID_DOCUMENT_STATUSES = ['pending', 'approved', 'rejected'];

/**
 * Get documents with optional status filter
 * GET /api/admin/documents?status=pending|approved|rejected
 */
export const getDocuments = async (req, res) => {
  try {
    const { status } = req.query;
    if (status && !VALID_DOCUMENT_STATUSES.includes(status)) {
      return res.status(400).json({ success: false, error: `status must be one of: ${VALID_DOCUMENT_STATUSES.join(', ')}` });
    }

    const documentWhere = {};
    if (status) documentWhere.status = status;

    const documents = await Document.findAll({
      where: documentWhere,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          where: { createdBy: req.user.id },
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    return res.json({ success: true, data: documents });
  } catch (error) {
    logger.error('Get documents error', { error: error.message, stack: error.stack });
    return res.status(500).json({ success: false, error: 'Failed to fetch documents' });
  }
};

/**
 * Get all documents pending review
 * GET /api/admin/documents/pending
 */
export const getPendingDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { status: 'pending' },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
          where: { createdBy: req.user.id },
        },
      ],
      order: [['createdAt', 'ASC']],
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Get pending documents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch pending documents' });
  }
};

/**
 * Get all documents for a specific Reception account
 * GET /api/admin/receptions/:id/documents
 */
export const getReceptionDocuments = async (req, res) => {
  try {
    const { id } = req.params;

    // Verify the user is a Reception account
    const reception = await User.findOne({
      where: { id, role: 'reception', createdBy: req.user.id },
    });

    if (!reception) {
      return res.status(404).json({ error: 'Reception account not found' });
    }

    const documents = await Document.findAll({
      where: { userId: id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Get reception documents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

/**
 * Approve a document
 * PUT /api/admin/documents/:id/approve
 */
export const approveDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'createdBy'],
        },
      ],
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Ensure this document belongs to a reception created by the current admin
    if (!document.user || document.user.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    if (document.status !== 'pending') {
      return res.status(400).json({ error: 'Document is not pending approval' });
    }

    // Update document status
    document.status = 'approved';
    document.reviewedBy = req.user.id;
    document.reviewedAt = new Date();
    await document.save();

    // Check if all documents for this Reception are approved
    const allDocuments = await Document.findAll({
      where: { userId: document.userId },
    });

    const allApproved = allDocuments.every(doc => doc.status === 'approved');
    const hasRequiredDocuments = allDocuments.length > 0;

    // If all documents are approved and there are documents, activate the Reception account
    if (allApproved && hasRequiredDocuments) {
      const reception = await User.findByPk(document.userId);
      if (reception) {
        reception.documentsApproved = true;
        reception.isActive = true;
        reception.isVerified = true;
        await reception.save();
        invalidateUserCache(reception.id);

        logger.info('Reception account activated', {
          receptionId: reception.id,
          email: reception.email,
          approvedBy: req.user.id,
        });
      }
    }

    // Reload document without reviewer details to avoid exposing other admin information
    const documentResponse = await Document.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        },
      ],
      attributes: { exclude: [] }, // Exclude password if any
    });

    res.json({
      success: true,
      message: 'Document approved successfully',
      data: documentResponse,
    });
  } catch (error) {
    logger.error('Approve document error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to approve document' });
  }
};

/**
 * Reject a document
 * PUT /api/admin/documents/:id/reject
 */
export const rejectDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    const document = await Document.findByPk(id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Ensure this document belongs to a reception created by the current admin
    const docOwner = await User.findByPk(document.userId);
    if (!docOwner || docOwner.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'Access denied to this document' });
    }

    if (document.status !== 'pending') {
      return res.status(400).json({ error: 'Document is not pending approval' });
    }

    // Update document status
    document.status = 'rejected';
    document.reviewedBy = req.user.id;
    document.reviewedAt = new Date();
    document.rejectionReason = rejectionReason;
    await document.save();

    // Deactivate Reception account if document is rejected
    const reception = await User.findByPk(document.userId);
    if (reception) {
      reception.documentsApproved = false;
      reception.isActive = false;
      await reception.save();
      invalidateUserCache(reception.id);
    }

    // Reload document without reviewer details to avoid exposing other admin information
    const documentResponse = await Document.findByPk(document.id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
        },
      ],
      attributes: { exclude: [] }, // Exclude password if any
    });

    res.json({
      success: true,
      message: 'Document rejected',
      data: documentResponse,
    });
  } catch (error) {
    logger.error('Reject document error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to reject document' });
  }
};

/**
 * Activate a Reception account manually
 * PUT /api/admin/receptions/:id/activate
 */
export const activateReception = async (req, res) => {
  try {
    const { id } = req.params;

    const reception = await User.findOne({
      where: { id, role: 'reception', createdBy: req.user.id },
    });

    if (!reception) {
      return res.status(404).json({ error: 'Reception account not found' });
    }

    reception.isActive = true;
    reception.documentsApproved = true;
    await reception.save();
    invalidateUserCache(reception.id);

    logger.info('Reception account manually activated', {
      receptionId: reception.id,
      email: reception.email,
      activatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Reception account activated successfully',
      data: reception.toJSON(),
    });
  } catch (error) {
    logger.error('Activate reception error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to activate reception account' });
  }
};

/**
 * Deactivate a Reception account
 * PUT /api/admin/receptions/:id/deactivate
 */
export const deactivateReception = async (req, res) => {
  try {
    const { id } = req.params;

    const reception = await User.findOne({
      where: { id, role: 'reception', createdBy: req.user.id },
    });

    if (!reception) {
      return res.status(404).json({ error: 'Reception account not found' });
    }

    reception.isActive = false;
    await reception.save();
    invalidateUserCache(reception.id);

    logger.info('Reception account deactivated', {
      receptionId: reception.id,
      email: reception.email,
      deactivatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Reception account deactivated successfully',
      data: reception.toJSON(),
    });
  } catch (error) {
    logger.error('Deactivate reception error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to deactivate reception account' });
  }
};

/**
 * Create a Reception account
 * POST /api/admin/receptions
 */
export const createReception = async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Email, password, first name, and last name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const reception = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: 'reception',
      isVerified: false,
      documentsApproved: false,
      isActive: false,
      createdBy: req.user.id,
      schoolId: req.user.schoolId, // Inherit school from admin
    });

    logger.info('Reception account created by Admin', {
      receptionId: reception.id,
      email: reception.email,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Reception account created successfully',
      data: reception.toJSON(),
    });
  } catch (error) {
    logger.error('Create reception error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create reception account' });
  }
};

/**
 * Update a Reception account
 * PUT /api/admin/receptions/:id
 */
export const updateReception = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, phone, password } = req.body;

    const receptionWhere = { id, role: 'reception', createdBy: req.user.id };

    const reception = await User.findOne({
      where: receptionWhere,
    });

    if (!reception) {
      return res.status(404).json({ error: 'Reception account not found' });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== reception.email) {
      const existingUser = await User.findOne({
        where: {
          email: email.toLowerCase(),
          id: { [Op.ne]: id }
        }
      });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      reception.email = email.toLowerCase();
    }

    if (firstName) reception.firstName = firstName;
    if (lastName) reception.lastName = lastName;
    if (phone !== undefined) reception.phone = phone;
    if (password) reception.password = password; // Will be hashed by model hook

    await reception.save();

    logger.info('Reception account updated by Admin', {
      receptionId: reception.id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Reception account updated successfully',
      data: reception.toJSON(),
    });
  } catch (error) {
    logger.error('Update reception error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update reception account' });
  }
};

/**
 * Delete a Reception account
 * DELETE /api/admin/receptions/:id
 */
export const deleteReception = async (req, res) => {
  try {
    const { id } = req.params;

    const deleteWhere = { id, role: 'reception' };
    if (req.user.schoolId) deleteWhere.schoolId = req.user.schoolId;

    const reception = await User.findOne({ where: deleteWhere });

    if (!reception) {
      return res.status(404).json({ error: 'Reception account not found' });
    }

    await reception.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'admin_delete' });

    logger.info('Reception account deleted by Admin', {
      receptionId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Reception account deleted successfully',
    });
  } catch (error) {
    logger.error('Delete reception error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete reception account' });
  }
};
