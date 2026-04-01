import { Op, fn, col, QueryTypes } from 'sequelize';
import User from '../models/User.js';
import Document from '../models/Document.js';
import ParentActivity from '../models/ParentActivity.js';
import ParentMeal from '../models/ParentMeal.js';
import ParentMedia from '../models/ParentMedia.js';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import School from '../models/School.js';
import SchoolRating from '../models/SchoolRating.js';
import Payment from '../models/Payment.js';
import TherapyUsage from '../models/TherapyUsage.js';
import SuperAdminMessage from '../models/SuperAdminMessage.js';
import logger from '../utils/logger.js';

/**
 * Admin Controller
 * Handles Admin-specific operations:
 * - View Reception accounts pending verification
 * - View uploaded documents from Reception
 * - Approve/reject Reception documents
 * - Activate Reception accounts after approval
 */

/**
 * Get all Reception accounts with their verification status
 * GET /api/admin/receptions
 * 
 * Business Logic:
 * - Admin can view all Reception accounts
 * - Shows document upload status and approval status
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
 * 
 * Business Logic:
 * - Admin approves a document
 * - If all required documents are approved, Reception account is activated
 */
export const approveDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const document = await Document.findByPk(id, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email', 'role'],
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
        await reception.save();

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
 * 
 * Business Logic:
 * - Admin can manually activate a Reception account
 * - This allows Reception to log in even if documents aren't fully approved
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
 * 
 * Business Logic:
 * - Admin can create Reception accounts
 * - Reception must upload documents after creation
 * - Reception cannot log in until documents are approved
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
 * 
 * Business Logic:
 * - Admin can edit Reception account details
 */
export const updateReception = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, firstName, lastName, phone, password } = req.body;

    const receptionWhere = { id, role: 'reception' };
    if (req.user.schoolId) receptionWhere.schoolId = req.user.schoolId;

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
          id: { [require('sequelize').Op.ne]: id }
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
 * 
 * Business Logic:
 * - Admin can delete Reception accounts
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

    await reception.destroy();

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

/**
 * Get all Teachers (read-only for Admin)
 * GET /api/admin/teachers
 * 
 * Business Logic:
 * - Admin can only view teachers, cannot create/edit/delete
 * - Admin can view teachers created by receptions they created
 */
export const getTeachers = async (req, res) => {
  try {
    // First, get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });

    const receptionIds = receptions.map(r => r.id);

    logger.info('Admin getTeachers', {
      adminId: req.user.id,
      receptionsFound: receptions.length,
      receptionIds: receptionIds,
    });

    // If admin has no receptions, return empty array
    if (receptionIds.length === 0) {
      logger.info('Admin has no receptions, returning empty teachers list');
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get teachers created by these receptions
    const teachers = await User.findAll({
      where: { 
        role: 'teacher',
        createdBy: { [Op.in]: receptionIds }
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    logger.info('Teachers found', {
      count: teachers.length,
      teacherIds: teachers.map(t => t.id),
    });

    res.json({
      success: true,
      data: teachers,
    });
  } catch (error) {
    logger.error('Get teachers error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teachers' });
  }
};

/**
 * Get all Parents (read-only for Admin)
 * GET /api/admin/parents
 * 
 * Business Logic:
 * - Admin can only view parents, cannot create/edit/delete
 * - Admin can view parents created by receptions they created
 */
export const getParents = async (req, res) => {
  try {
    // First, get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });

    const receptionIds = receptions.map(r => r.id);

    logger.info('Admin getParents', {
      adminId: req.user.id,
      receptionsFound: receptions.length,
      receptionIds: receptionIds,
    });

    // If admin has no receptions, return empty array
    if (receptionIds.length === 0) {
      logger.info('Admin has no receptions, returning empty parents list');
      return res.json({
        success: true,
        data: [],
      });
    }

    // Get parents created by these receptions
    const parents = await User.findAll({
      where: { 
        role: 'parent',
        createdBy: { [Op.in]: receptionIds }
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    logger.info('Parents found', {
      count: parents.length,
      parentRoles: parents.map(p => ({ id: p.id, role: p.role, email: p.email })),
    });

    // Double-check: filter out any non-parent roles (safety check)
    const filteredParents = parents.filter(p => p.role === 'parent');

    res.json({
      success: true,
      data: filteredParents,
    });
  } catch (error) {
    logger.error('Get parents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
};

/**
 * Get all Admin accounts (Super Admin view)
 * GET /api/super-admin/admins
 */
export const getAdmins = async (req, res) => {
  try {
    const admins = await User.findAll({
      where: { role: 'admin' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: admins,
    });
  } catch (error) {
    logger.error('Get admins error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to fetch admin accounts' });
  }
};

/**
 * Update an Admin account (Super Admin only)
 * PUT /api/super-admin/admins/:id
 */
export const updateAdminBySuper = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, password } = req.body;

    const admin = await User.findOne({ where: { id, role: 'admin' } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    if (email && email.toLowerCase() !== admin.email) {
      const existing = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      admin.email = email.toLowerCase();
    }

    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;
    if (phone !== undefined) admin.phone = phone;
    if (password) admin.password = password; // hashed by model hook

    await admin.save();

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: admin.toJSON(),
    });
  } catch (error) {
    logger.error('Update admin error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update admin account' });
  }
};

/**
 * Delete an Admin account (Super Admin only)
 * DELETE /api/super-admin/admins/:id
 */
export const deleteAdminBySuper = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({ where: { id, role: 'admin' } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Prevent deleting self
    if (req.user?.id === admin.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    // Check if this admin has created other users (receptions/teachers/parents/admins)
    const dependentUsers = await User.count({ where: { createdBy: id } });
    if (dependentUsers > 0) {
      return res.status(409).json({ error: 'Cannot delete admin with dependent users. Please reassign or delete dependent accounts first.' });
    }

    await admin.destroy();

    res.json({
      success: true,
      message: 'Admin deleted successfully',
    });
  } catch (error) {
    logger.error('Delete admin error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete admin account' });
  }
};

/**
 * Get a specific Parent with their data (read-only for Admin)
 * GET /api/admin/parents/:id
 */
export const getParentById = async (req, res) => {
  try {
    const { id } = req.params;

    // First, get all receptions created by this admin
    const receptions = await User.findAll({
      where: { role: 'reception', createdBy: req.user.id },
      attributes: ['id'],
    });

    const receptionIds = receptions.map(r => r.id);

    const parent = await User.findOne({
      where: { 
        id, 
        role: 'parent',
        createdBy: { [Op.in]: receptionIds }
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Child,
          as: 'children',
          required: false,
        },
      ],
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Get parent's activities, meals, and media
    const [activities, meals, media] = await Promise.all([
      ParentActivity.findAll({
        where: { parentId: id },
        order: [['activityDate', 'DESC']],
        limit: 10,
      }),
      ParentMeal.findAll({
        where: { parentId: id },
        order: [['mealDate', 'DESC']],
        limit: 10,
      }),
      ParentMedia.findAll({
        where: { parentId: id },
        order: [['uploadDate', 'DESC']],
        limit: 10,
      }),
    ]);

    res.json({
      success: true,
      data: {
        parent: parent.toJSON(),
        children: parent.children || [],
        activities,
        meals,
        media,
      },
    });
  } catch (error) {
    logger.error('Get parent by id error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parent' });
  }
};

/**
 * Get dashboard statistics for Admin
 * GET /api/admin/statistics
 * 
 * Business Logic:
 * - Admin can view all system statistics
 */
export const getStatistics = async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    logger.info('Getting statistics for admin', { adminId: req.user.id });
    console.log('Statistics request:', { adminId: req.user.id, role: req.user.role });

    // Get counts for all roles
    // First get reception IDs created by this admin
    let adminReceptions = [];
    try {
      adminReceptions = await User.findAll({
        where: { role: 'reception', createdBy: req.user.id },
        attributes: ['id'],
      });
    } catch (error) {
      logger.error('Error fetching admin receptions', { error: error.message, adminId: req.user.id });
      adminReceptions = [];
    }
    const receptionIds = adminReceptions.map(r => r.id);
    
    logger.info('Admin receptions found', { count: receptionIds.length, adminId: req.user.id });

    // Get teachers created by these receptions
    let teacherIds = [];
    if (receptionIds.length > 0) {
      try {
        const adminTeachers = await User.findAll({
          where: { 
            role: 'teacher', 
            createdBy: { [Op.in]: receptionIds },
          },
          attributes: ['id'],
        });
        teacherIds = adminTeachers.map(t => t.id);
      } catch (error) {
        logger.error('Error fetching admin teachers', { error: error.message, adminId: req.user.id });
        teacherIds = [];
      }
    }

    const [receptions, teachers, parents, groups] = await Promise.all([
      User.count({ where: { role: 'reception', createdBy: req.user.id } }).catch(() => 0),
      receptionIds.length > 0 
        ? User.count({ where: { role: 'teacher', createdBy: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? User.count({ where: { role: 'parent', createdBy: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      teacherIds.length > 0
        ? Group.count({ where: { teacherId: { [Op.in]: teacherIds } } }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    logger.info('Statistics calculated', {
      adminId: req.user.id,
      receptions,
      teachers,
      parents,
      groups,
      receptionIds: receptionIds.length,
      teacherIds: teacherIds.length,
    });

    // Get active vs inactive receptions
    const [activeReceptions, inactiveReceptions, pendingReceptions] = await Promise.all([
      User.count({ 
        where: { 
          role: 'reception',
          createdBy: req.user.id,
          isActive: true,
          documentsApproved: true,
        } 
      }).catch(() => 0),
      User.count({ 
        where: { 
          role: 'reception',
          createdBy: req.user.id,
          isActive: false,
        } 
      }).catch(() => 0),
      User.count({ 
        where: { 
          role: 'reception',
          createdBy: req.user.id,
          documentsApproved: false,
        } 
      }).catch(() => 0),
    ]);

    // Get document statistics
    const [pendingDocuments, approvedDocuments, rejectedDocuments] = await Promise.all([
      receptionIds.length > 0
        ? Document.count({ where: { status: 'pending', userId: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? Document.count({ where: { status: 'approved', userId: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? Document.count({ where: { status: 'rejected', userId: { [Op.in]: receptionIds } } }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get parent data statistics (only for parents created by admin's receptions)
    // Get parent IDs created by admin's receptions
    let parentIds = [];
    if (receptionIds.length > 0) {
      try {
        const adminParents = await User.findAll({
          where: { 
            role: 'parent', 
            createdBy: { [Op.in]: receptionIds },
          },
          attributes: ['id'],
        });
        parentIds = adminParents.map(p => p.id);
      } catch (error) {
        logger.error('Error fetching admin parents', { error: error.message, adminId: req.user.id });
        parentIds = [];
      }
    }

    // Get children count (children of parents created by admin's receptions)
    let childrenCount = 0;
    try {
      if (parentIds.length > 0) {
        childrenCount = await Child.count({
          where: { parentId: { [Op.in]: parentIds } }
        });
        logger.info('Children count calculated', { 
          childrenCount, 
          parentIdsCount: parentIds.length,
          adminId: req.user.id 
        });
      } else {
        logger.info('No parent IDs found, children count will be 0', { 
          adminId: req.user.id,
          receptionIdsCount: receptionIds.length
        });
        childrenCount = 0;
      }
    } catch (error) {
      logger.error('Error fetching children count', { 
        error: error.message, 
        adminId: req.user.id,
        parentIdsCount: parentIds.length,
        stack: error.stack 
      });
      childrenCount = 0;
    }

    const [totalActivities, totalMeals, totalMedia] = await Promise.all([
      parentIds.length > 0
        ? ParentActivity.count({ where: { parentId: { [Op.in]: parentIds } } }).catch(() => 0)
        : Promise.resolve(0),
      parentIds.length > 0
        ? ParentMeal.count({ where: { parentId: { [Op.in]: parentIds } } }).catch(() => 0)
        : Promise.resolve(0),
      parentIds.length > 0
        ? ParentMedia.count({ where: { parentId: { [Op.in]: parentIds } } }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [recentReceptions, recentParents, recentTeachers] = await Promise.all([
      User.count({
        where: {
          role: 'reception',
          createdBy: req.user.id,
          createdAt: { [Op.gte]: thirtyDaysAgo },
        },
      }).catch(() => 0),
      receptionIds.length > 0
        ? User.count({
            where: {
              role: 'parent',
              createdBy: { [Op.in]: receptionIds },
              createdAt: { [Op.gte]: thirtyDaysAgo },
            },
          }).catch(() => 0)
        : Promise.resolve(0),
      receptionIds.length > 0
        ? User.count({
            where: {
              role: 'teacher',
              createdBy: { [Op.in]: receptionIds },
              createdAt: { [Op.gte]: thirtyDaysAgo },
            },
          }).catch(() => 0)
        : Promise.resolve(0),
    ]);

    // Get additional statistics: schools, revenue, therapy usages
    const [totalSchools, totalRevenue, therapyUsages] = await Promise.all([
      School.count({ where: { isActive: true } }).catch(() => 0),
      Payment.findAll({ 
        where: { status: 'completed' },
        attributes: ['amount']
      }).then(payments => {
        return payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
      }).catch(() => 0),
      TherapyUsage.count().catch(() => 0),
    ]);

    const totalUsers = receptions + teachers + parents;

    res.json({
      success: true,
      data: {
        // Frontend expected format
        receptions,
        teachers,
        parents,
        children: childrenCount,
        groups: groups,
        // Detailed format (for backward compatibility)
        users: {
          receptions,
          teachers,
          parents,
          total: totalUsers,
        },
        receptionsDetail: {
          total: receptions,
          active: activeReceptions,
          inactive: inactiveReceptions,
          pending: pendingReceptions,
        },
        documents: {
          pending: pendingDocuments,
          approved: approvedDocuments,
          rejected: rejectedDocuments,
          total: pendingDocuments + approvedDocuments + rejectedDocuments,
        },
        content: {
          activities: totalActivities,
          meals: totalMeals,
          media: totalMedia,
          total: totalActivities + totalMeals + totalMedia,
        },
        groupsDetail: {
          total: groups,
        },
        recentActivity: {
          receptions: recentReceptions,
          parents: recentParents,
          teachers: recentTeachers,
        },
      },
    });
  } catch (error) {
    logger.error('Get statistics error', { 
      error: error.message, 
      stack: error.stack,
      adminId: req.user?.id,
      errorName: error.name,
      errorCode: error.code,
      errorTable: error.table,
      errorColumn: error.column
    });
    console.error('Statistics error details:', {
      message: error.message,
      name: error.name,
      code: error.code,
      table: error.table,
      column: error.column,
      stack: error.stack?.substring(0, 500) // Limit stack trace
    });
    
    // Return more detailed error in development
    const errorResponse = {
      error: 'Failed to fetch statistics',
      message: error.message
    };
    
    if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production') {
      errorResponse.details = error.stack?.substring(0, 500);
      errorResponse.errorName = error.name;
      errorResponse.errorCode = error.code;
    }
    
    res.status(500).json(errorResponse);
  }
};

/**
 * Create an Admin account
 * POST /api/admin/admins
 * 
 * Business Logic:
 * - Super admin can create Admin accounts
 * - If role is 'superAdmin', can be created without token
 * - Only email and password are required
 * - firstName and lastName are set to default values
 */
/**
 * Get school ratings (admin can view all school ratings)
 * GET /api/admin/school-ratings
 * 
 * Business Logic:
 * - Admin can view all school ratings (not just from their receptions)
 * - Groups ratings by school and calculates averages
 */
export const getSchoolRatings = async (req, res) => {
  try {
    // Get all school ratings (admin can see all ratings)
    // Use raw query directly to avoid association issues
    let ratings = [];
    
    try {
      const sequelize = SchoolRating.sequelize;
      
      const rawRatings = await sequelize.query(`
        SELECT 
          sr.id,
          sr."schoolId",
          sr."parentId",
          sr.stars,
          sr.comment,
          sr.evaluation,
          sr."createdAt",
          sr."updatedAt",
          s.id as "school_id",
          s.name as "school_name",
          s.type as "school_type",
          s.address as "school_address",
          u.id as "parent_id",
          u."firstName" as "parent_firstName",
          u."lastName" as "parent_lastName",
          u.email as "parent_email"
        FROM school_ratings sr
        LEFT JOIN schools s ON sr."schoolId" = s.id
        LEFT JOIN users u ON sr."parentId" = u.id
        ORDER BY sr."updatedAt" DESC
      `, {
        type: QueryTypes.SELECT,
      });
      
      // Transform raw results to match expected format
      ratings = Array.isArray(rawRatings) ? rawRatings.map(row => ({
        id: row.id,
        schoolId: row.schoolId || row.school_id,
        parentId: row.parentId || row.parent_id,
        stars: row.stars,
        comment: row.comment || null,
        evaluation: row.evaluation || null,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        school_id: row.school_id,
        school_name: row.school_name,
        school_type: row.school_type,
        school_address: row.school_address,
        parent_id: row.parent_id,
        parent_firstName: row.parent_firstName,
        parent_lastName: row.parent_lastName,
        parent_email: row.parent_email,
      })) : [];
      
      logger.info('Successfully fetched school ratings using raw query', {
        count: ratings.length,
      });
    } catch (queryError) {
      logger.error('Error querying school ratings', {
        error: queryError.message,
        stack: queryError.stack,
        adminId: req.user?.id,
      });
      // Return empty array if query fails
      return res.json({
        success: true,
        data: [],
      });
    }

    // Ensure ratings is an array
    if (!Array.isArray(ratings)) {
      logger.warn('Ratings is not an array', { ratings: typeof ratings });
      return res.json({
        success: true,
        data: [],
      });
    }

    // If no ratings, try to get all schools (even without ratings)
    if (ratings.length === 0) {
      logger.info('No ratings found, fetching all schools');
      try {
        const sequelize = SchoolRating.sequelize;
        
        // Try to get all schools, even if isActive column doesn't exist
        let allSchools = [];
        try {
          allSchools = await sequelize.query(`
            SELECT 
              s.id,
              s.name,
              s.type,
              s.address
            FROM schools s
            WHERE s."isActive" = true
            ORDER BY s.name ASC
          `, {
            type: QueryTypes.SELECT,
          });
        } catch (activeError) {
          // If isActive column doesn't exist, try without it
          logger.warn('Error with isActive filter, trying without it', {
            error: activeError.message,
          });
          try {
            allSchools = await sequelize.query(`
              SELECT 
                s.id,
                s.name,
                s.type,
                s.address
              FROM schools s
              ORDER BY s.name ASC
            `, {
              type: QueryTypes.SELECT,
            });
          } catch (allError) {
            logger.error('Error fetching all schools', {
              error: allError.message,
            });
            allSchools = [];
          }
        }
        
        logger.info('Fetched schools from database', {
          schoolsCount: Array.isArray(allSchools) ? allSchools.length : 0,
          firstSchool: Array.isArray(allSchools) && allSchools.length > 0 ? allSchools[0] : null,
        });
        
        const schoolsWithNoRatings = Array.isArray(allSchools) && allSchools.length > 0 ? allSchools.map(school => ({
          school: {
            id: school.id,
            name: school.name || 'Unknown School',
            type: school.type || 'both',
            address: school.address || null,
          },
          ratings: [],
          average: 0,
          count: 0,
        })) : [];
        
        logger.info('No ratings found, returning all schools', {
          schoolsCount: schoolsWithNoRatings.length,
        });
        
        return res.json({
          success: true,
          data: schoolsWithNoRatings,
        });
      } catch (schoolsError) {
        logger.error('Error fetching schools', {
          error: schoolsError.message,
          stack: schoolsError.stack,
        });
        return res.json({
          success: true,
          data: [],
        });
      }
    }

    // Group by school and calculate averages
    const schoolMap = new Map();
    
    for (const rating of ratings) {
      try {
        // Skip if school is missing
        const schoolId = rating.schoolId || rating.school_id;
        if (!schoolId) {
          continue;
        }

        // Get school data from raw query result
        const school = rating.school_id ? {
          id: rating.school_id,
          name: rating.school_name || null,
          type: rating.school_type || null,
          address: rating.school_address || null,
        } : null;
        
        // Get parent data from raw query result
        const ratingParent = rating.parent_id ? {
          id: rating.parent_id,
          firstName: rating.parent_firstName || null,
          lastName: rating.parent_lastName || null,
          email: rating.parent_email || null,
        } : null;
        
        if (!schoolMap.has(schoolId)) {
          const schoolData = {
            school: school || null,
            ratings: [],
            average: 0,
            count: 0,
          };
          schoolMap.set(schoolId, schoolData);
        }
        
        const schoolData = schoolMap.get(schoolId);
        
        // Add rating data - safely handle dates
        let createdAt = null;
        let updatedAt = null;
        try {
          if (rating.createdAt) {
            createdAt = rating.createdAt instanceof Date 
              ? rating.createdAt.toISOString() 
              : (typeof rating.createdAt === 'string' ? rating.createdAt : new Date(rating.createdAt).toISOString());
          }
          if (rating.updatedAt) {
            updatedAt = rating.updatedAt instanceof Date 
              ? rating.updatedAt.toISOString() 
              : (typeof rating.updatedAt === 'string' ? rating.updatedAt : new Date(rating.updatedAt).toISOString());
          }
        } catch (dateError) {
          logger.warn('Error parsing dates', { error: dateError.message });
        }
        
        const ratingData = {
          id: rating.id,
          stars: rating.stars || null,
          comment: rating.comment || null,
          evaluation: rating.evaluation || null,
          createdAt,
          updatedAt,
          parentName: ratingParent
            ? `${ratingParent.firstName || ''} ${ratingParent.lastName || ''}`.trim() || null
            : null,
          parentEmail: ratingParent?.email || null,
        };
        
        schoolData.ratings.push(ratingData);
      } catch (itemError) {
        logger.warn('Error processing rating item', {
          error: itemError.message,
          ratingId: rating?.id,
        });
        // Continue with next rating
      }
    }

    // Calculate averages
    const result = [];
    for (const [schoolId, schoolData] of schoolMap.entries()) {
      try {
        if (!schoolData.ratings || schoolData.ratings.length === 0) {
          result.push({
            ...schoolData,
            average: 0,
            count: 0,
          });
          continue;
        }

        const stars = schoolData.ratings
          .map(r => r.stars)
          .filter(s => s != null && !isNaN(s) && s >= 1 && s <= 5);
        
        const average = stars.length > 0
          ? parseFloat((stars.reduce((sum, s) => sum + s, 0) / stars.length).toFixed(1))
          : 0;
        
        result.push({
          ...schoolData,
          average,
          count: stars.length,
        });
      } catch (calcError) {
        logger.warn('Error calculating average', {
          error: calcError.message,
          schoolId,
        });
        result.push({
          ...schoolData,
          average: 0,
          count: 0,
        });
      }
    }

    logger.info('Get school ratings success', {
      adminId: req.user?.id,
      totalRatings: ratings.length,
      schoolsCount: result.length,
    });

    // Ensure we always return valid data
    const finalResult = Array.isArray(result) ? result : [];
    
    res.json({
      success: true,
      data: finalResult,
    });
  } catch (error) {
    logger.error('Get school ratings error', {
      error: error.message,
      stack: error.stack,
      adminId: req.user?.id,
    });
    
    // Always return success with empty array on error to prevent 500
    res.json({
      success: true,
      data: [],
    });
  }
};

/**
 * Get all schools with average ratings (Super Admin view)
 * GET /api/super-admin/schools
 */
export const getAllSchools = async (req, res) => {
  try {
    const schools = await School.findAll({
      where: { isActive: true },
      include: [
        {
          model: SchoolRating,
          as: 'ratings',
          attributes: ['stars'],
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    // Calculate average ratings for each school
    const schoolsWithRatings = schools.map((school) => {
      const ratings = school.ratings || [];
      const stars = ratings.map(r => r.stars);
      const average = stars.length > 0
        ? (stars.reduce((sum, s) => sum + s, 0) / stars.length).toFixed(1)
        : 0;
      const count = stars.length;

      return {
        ...school.toJSON(),
        summary: {
          average: parseFloat(average),
          count,
        },
      };
    });

    res.json({
      success: true,
      data: schoolsWithRatings,
    });
  } catch (error) {
    logger.error('Get all schools error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch schools' });
  }
};

export const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        error: 'First name, last name, email and password are required' 
      });
    }

    // If role is 'superAdmin', allow creation without authentication
    const isSuperAdmin = role === 'superAdmin';
    
    // For regular admin creation, require authentication
    if (!isSuperAdmin && !req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create admin with provided firstName and lastName
    // If role is 'superAdmin', create as 'admin' role (since User model only has 'admin' role)
    const admin = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: 'admin', // User model only supports 'admin', 'reception', 'teacher', 'parent'
    });

    logger.info('Admin account created', {
      adminId: admin.id,
      email: admin.email,
      isSuperAdmin,
      createdBy: req.user?.id || (isSuperAdmin ? 'direct-creation' : 'unknown'),
    });

    res.status(201).json({
      success: true,
      message: isSuperAdmin ? 'Super admin account created successfully' : 'Admin account created successfully',
      data: admin.toJSON(),
    });
  } catch (error) {
    logger.error('Create admin error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create admin account' });
  }
};

/**
 * Create government user (Super Admin only)
 * POST /api/super-admin/government
 */
export const createGovernment = async (req, res) => {
  try {
    const { firstName, lastName, email, password } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({ 
        error: 'First name, last name, email and password are required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase().trim() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Create government user
    const government = await User.create({
      email: email.toLowerCase().trim(),
      password: password.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'government',
      isActive: true,
    });

    // Remove password from response
    const governmentData = government.toJSON();
    delete governmentData.password;

    logger.info('Government account created', {
      governmentId: government.id,
      email: government.email,
      createdBy: req.user?.id || 'unknown',
    });

    res.status(201).json({
      success: true,
      message: 'Government account created successfully',
      data: governmentData,
    });
  } catch (error) {
    logger.error('Create government error', { 
      error: error.message, 
      stack: error.stack,
      body: req.body,
      userId: req.user?.id,
    });
    
    // Provide more specific error messages
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors?.map(e => e.message) || [error.message];
      return res.status(400).json({
        error: validationErrors.join(', ') || 'Validation error',
        details: validationErrors,
      });
    }
    
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        error: 'Bu email bilan foydalanuvchi allaqachon mavjud',
      });
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      logger.error('Database error creating government', {
        error: error.message,
        original: error.original?.message,
      });
      return res.status(400).json({
        error: 'Ma\'lumotlar bazasi xatosi',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      });
    }

    res.status(500).json({ 
      error: 'Government foydalanuvchisini yaratishda xatolik',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Get all government accounts
 * GET /api/super-admin/government
 */
export const getGovernments = async (req, res) => {
  try {
    const governments = await User.findAll({
      where: { role: 'government' },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    logger.info('Government accounts fetched', {
      count: governments.length,
      userId: req.user?.id,
    });

    res.json({
      success: true,
      data: governments.map(g => g.toJSON()),
      count: governments.length,
    });
  } catch (error) {
    logger.error('Get governments error', { 
      error: error.message, 
      stack: error.stack,
      userId: req.user?.id,
    });
    res.status(500).json({ 
      error: 'Failed to fetch government accounts',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * Update a Government account (Super Admin only)
 * PUT /api/super-admin/government/:id
 */
export const updateGovernmentBySuper = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password } = req.body;

    const government = await User.findOne({ where: { id, role: 'government' } });
    if (!government) {
      return res.status(404).json({ error: 'Government user not found' });
    }

    if (email && email.toLowerCase() !== government.email) {
      const existing = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
      government.email = email.toLowerCase();
    }

    if (firstName) government.firstName = firstName.trim();
    if (lastName) government.lastName = lastName.trim();
    if (password) government.password = password.trim(); // hashed by model hook

    await government.save();

    const governmentData = government.toJSON();
    delete governmentData.password;

    logger.info('Government account updated', {
      governmentId: government.id,
      updatedBy: req.user?.id,
    });

    res.json({
      success: true,
      message: 'Government account updated successfully',
      data: governmentData,
    });
  } catch (error) {
    logger.error('Update government error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to update government account' });
  }
};

/**
 * Delete a Government account (Super Admin only)
 * DELETE /api/super-admin/government/:id
 */
export const deleteGovernmentBySuper = async (req, res) => {
  try {
    const { id } = req.params;

    const government = await User.findOne({ where: { id, role: 'government' } });
    if (!government) {
      return res.status(404).json({ error: 'Government user not found' });
    }

    // Prevent deleting self
    if (req.user?.id === government.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' });
    }

    await government.destroy();

    logger.info('Government account deleted', {
      governmentId: id,
      deletedBy: req.user?.id,
    });

    res.json({
      success: true,
      message: 'Government account deleted successfully',
    });
  } catch (error) {
    logger.error('Delete government error', { error: error.message, stack: error.stack, userId: req.user?.id });
    res.status(500).json({ error: 'Failed to delete government account' });
  }
};

/**
 * Get admin's messages to super-admin
 * GET /api/admin/messages
 * 
 * Business Logic:
 * - Admin can view their own messages sent to super-admin
 * - Includes replies from super-admin
 */
export const getMyMessages = async (req, res) => {
  try {
    const messages = await SuperAdminMessage.findAll({
      where: { senderId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: messages.map(m => m.toJSON()),
    });
  } catch (error) {
    logger.error('Get my messages error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
};

