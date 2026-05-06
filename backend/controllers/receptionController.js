import User from '../models/User.js';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import Document from '../models/Document.js';
import TeacherRating from '../models/TeacherRating.js';
import SuperAdminMessage from '../models/SuperAdminMessage.js';
import School from '../models/School.js';
import TherapyUsage from '../models/TherapyUsage.js';
import Activity from '../models/Activity.js';
import Media from '../models/Media.js';
import Meal from '../models/Meal.js';
import Progress from '../models/Progress.js';
import logger from '../utils/logger.js';
import bcrypt from 'bcryptjs';
import { Op, fn, col } from 'sequelize';
import { uploadFile, deleteFile } from '../config/storage.js';
import fs from 'fs';

/**
 * Reception Controller
 * Handles Reception-specific operations:
 * - Upload required documents for verification
 * - View own documents and verification status
 * - Create login credentials for Teachers and Parents
 * - Manage Teacher and Parent accounts
 */

/**
 * Upload a document for verification
 * POST /api/reception/documents
 * 
 * Business Logic:
 * - Reception must upload required documents after installation
 * - Documents are visible to Admin for review
 * - Reception cannot log in until documents are approved
 */
export const uploadDocument = async (req, res) => {
  try {
    const { documentType } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'File is required' });
    }

    if (!documentType) {
      return res.status(400).json({ error: 'Document type is required' });
    }

    const document = await Document.create({
      userId: req.user.id,
      documentType,
      fileName: file.originalname,
      filePath: file.path,
      fileSize: file.size,
      mimeType: file.mimetype,
      status: 'pending',
    });

    // Mark user as having uploaded documents
    await req.user.update({ isVerified: true });

    logger.info('Document uploaded by Reception', {
      documentId: document.id,
      userId: req.user.id,
      documentType,
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: document,
    });
  } catch (error) {
    logger.error('Upload document error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to upload document' });
  }
};

/**
 * Get own documents
 * GET /api/reception/documents
 */
export const getMyDocuments = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    logger.error('Get my documents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
};

/**
 * Get verification status
 * GET /api/reception/verification-status
 */
export const getVerificationStatus = async (req, res) => {
  try {
    const documents = await Document.findAll({
      where: { userId: req.user.id },
    });

    const status = {
      isVerified: req.user.isVerified,
      documentsApproved: req.user.documentsApproved,
      isActive: req.user.isActive,
      documentsCount: documents.length,
      pendingCount: documents.filter(d => d.status === 'pending').length,
      approvedCount: documents.filter(d => d.status === 'approved').length,
      rejectedCount: documents.filter(d => d.status === 'rejected').length,
    };

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Get verification status error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch verification status' });
  }
};

/**
 * Create a Teacher account with credentials
 * POST /api/reception/teachers
 * 
 * Business Logic:
 * - Reception provides login credentials (email & password) to Teachers
 * - Reception cannot access Activity, Meals, Media, News, or Children modules
 */
export const createTeacher = async (req, res) => {
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

    const teacher = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: 'teacher',
      isActive: true,
      createdBy: req.user.id,
      schoolId: req.user.schoolId, // Inherit school from reception
    });

    logger.info('Teacher created by Reception', {
      teacherId: teacher.id,
      email: teacher.email,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Teacher account created successfully',
      data: teacher.toJSON(),
    });
  } catch (error) {
    logger.error('Create teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create teacher account' });
  }
};

/**
 * Get teacher rating summary and recent feedback
 * GET /api/reception/teachers/:id/ratings
 */
export const getTeacherRatings = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({ where: { id, role: 'teacher' } });
    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const summaryRaw = await TeacherRating.findOne({
      where: { teacherId: id },
      attributes: [
        [fn('AVG', col('stars')), 'averageStars'],
        [fn('COUNT', col('id')), 'totalRatings'],
      ],
      raw: true,
    });

    const ratings = await TeacherRating.findAll({
      where: { teacherId: id },
      order: [['updatedAt', 'DESC']],
      limit: 20,
      include: [
        {
          model: User,
          as: 'ratingParent',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
      ],
    });

    const average = summaryRaw?.averageStars
      ? Number(parseFloat(summaryRaw.averageStars).toFixed(2))
      : 0;
    const count = summaryRaw?.totalRatings ? Number(summaryRaw.totalRatings) : 0;

    res.json({
      success: true,
      data: {
        teacher: teacher.toJSON(),
        summary: { average, count },
        ratings: ratings.map((r) => ({
          ...r.toJSON(),
          parentName: r.ratingParent
            ? `${r.ratingParent.firstName || ''} ${r.ratingParent.lastName || ''}`.trim()
            : null,
        })),
      },
    });
  } catch (error) {
    logger.error('Get teacher ratings error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch teacher ratings' });
  }
};

/**
 * Create a Parent account with credentials
 * POST /api/reception/parents
 * 
 * Business Logic:
 * - Reception provides login credentials (email & password) to Parents
 * - Parents only see data related to their own account
 */
export const createParent = async (req, res) => {
  try {
    // Debug: Log request body and files
    logger.info('Create parent request', {
      bodyKeys: Object.keys(req.body),
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
    });
    
    // Parse nested FormData fields (child[fieldName] -> child.fieldName)
    let child = null;
    const childFirstName = req.body['child[firstName]'] || req.body.child?.firstName;
    if (childFirstName) {
      child = {
        firstName: childFirstName,
        lastName: req.body['child[lastName]'] || req.body.child?.lastName || '',
        dateOfBirth: req.body['child[dateOfBirth]'] || req.body.child?.dateOfBirth || '',
        gender: req.body['child[gender]'] || req.body.child?.gender || 'Male',
        disabilityType: req.body['child[disabilityType]'] || req.body.child?.disabilityType || '',
        medicalDiagnosis: req.body['child[medicalDiagnosis]'] || req.body.child?.medicalDiagnosis || null,
        specialNeeds: req.body['child[specialNeeds]'] || req.body.child?.specialNeeds || null,
        school: req.body['child[school]'] || req.body.child?.school || 'Uchqun School',
        photo: null, // Will be handled from req.files
      };
    }
    
    // Get parent data from FormData or regular body
    const email = req.body.email;
    const password = req.body.password;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phone = req.body.phone || null;
    const teacherId = req.body.teacherId || null;
    const groupId = req.body.groupId || null;

    if (!email || !password || !firstName || !lastName) {
      logger.warn('Create parent validation failed', {
        email: !!email,
        password: !!password,
        firstName: !!firstName,
        lastName: !!lastName,
        bodyKeys: Object.keys(req.body),
      });
      return res.status(400).json({ 
        error: 'Email, password, first name, and last name are required' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Validate teacher exists, was created by this reception user, and belongs to same school
    if (teacherId) {
      const teacherWhere = { id: teacherId, role: 'teacher', createdBy: req.user.id };
      if (req.user.schoolId) {
        teacherWhere.schoolId = req.user.schoolId;
      }
      const teacher = await User.findOne({ where: teacherWhere });
      if (!teacher) {
        return res.status(400).json({ error: 'Invalid teacher selected or you do not have permission to assign this teacher' });
      }
    }

    // Validate group exists and belongs to teacher if both are provided
    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(400).json({ error: 'Invalid group selected' });
      }
      if (teacherId && group.teacherId !== teacherId) {
        return res.status(400).json({ error: 'Group does not belong to the selected teacher' });
      }
      // If groupId is provided but no teacherId, use the group's teacherId
      if (!teacherId) {
        req.body.teacherId = group.teacherId;
      }
    }

    const parent = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      phone,
      role: 'parent',
      isActive: true,
      teacherId: teacherId || (groupId ? (await Group.findByPk(groupId)).teacherId : null),
      groupId: groupId || null,
      createdBy: req.user.id,
      schoolId: req.user.schoolId, // Inherit school from reception
    });

    // Create child if child data is provided
    if (child && child.firstName && child.lastName) {
      let childClassName = '';
      let childTeacherName = '';
      let photoUrl = null;
      
      // Handle photo file upload if provided
      if (req.files && req.files['child[photo]'] && req.files['child[photo]'][0]) {
        const photoFile = req.files['child[photo]'][0];
        try {
          const fileBuffer = fs.readFileSync(photoFile.path);
          const uploadResult = await uploadFile(fileBuffer, photoFile.filename, photoFile.mimetype);
          photoUrl = uploadResult.url;
          
          // Delete local file after upload
          try {
            fs.unlinkSync(photoFile.path);
          } catch (e) {
            logger.warn('Error deleting local photo file after upload', { error: e.message });
          }
        } catch (error) {
          logger.error('Error uploading child photo', { error: error.message });
          // Continue without photo if upload fails
        }
      } else if (child.photo && typeof child.photo === 'string') {
        // If photo is a URL string (legacy support)
        photoUrl = child.photo;
      }
      
      // Find school by name if school name is provided
      let schoolId = null;
      if (child.school) {
        try {
          // Try exact match first (case-insensitive)
          let foundSchool = await School.findOne({
            where: {
              name: {
                [Op.iLike]: child.school,
              },
            },
          });
          
          // If not found, try partial match
          if (!foundSchool) {
            foundSchool = await School.findOne({
              where: {
                name: {
                  [Op.iLike]: `%${child.school}%`,
                },
              },
            });
          }
          
          if (foundSchool) {
            schoolId = foundSchool.id;
            logger.info('School found for child', {
              childSchool: child.school,
              schoolId: foundSchool.id,
              schoolName: foundSchool.name,
            });
          } else {
            logger.warn('School not found for child', {
              childSchool: child.school,
            });
          }
        } catch (error) {
          logger.error('Error finding school for child', {
            error: error.message,
            childSchool: child.school,
          });
          // Continue without schoolId if lookup fails
        }
      }

      // Force reception's school to ensure child is assigned to correct school
      if (req.user.schoolId) {
        schoolId = req.user.schoolId;
      }

      await Child.create({
        parentId: parent.id,
        firstName: child.firstName,
        lastName: child.lastName,
        dateOfBirth: child.dateOfBirth,
        gender: child.gender,
        disabilityType: child.disabilityType,
        medicalDiagnosis: child.medicalDiagnosis || null,
        specialNeeds: child.specialNeeds || null,
        photo: photoUrl,
        school: child.school,
        schoolId: schoolId,
        class: childClassName || child.class || '',
        teacher: childTeacherName || child.teacher || '',
        groupId: null, // Removed groupId from child
        emergencyContact: {}, // Removed emergency contact
      });
    }

    // Fetch parent with relationships to return complete data
    const parentWithRelations = await User.findByPk(parent.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: User,
          as: 'assignedTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'description'],
          required: false,
        },
        {
          model: Child,
          as: 'children',
          attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'medicalDiagnosis', 'specialNeeds', 'school', 'class', 'teacher', 'photo'],
          required: false,
        },
      ],
    });

    logger.info('Parent created by Reception', {
      parentId: parent.id,
      email: parent.email,
      teacherId: parent.teacherId,
      groupId: parent.groupId,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Parent account created successfully',
      data: parentWithRelations.toJSON(),
    });
  } catch (error) {
    logger.error('Create parent error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create parent account' });
  }
};

/**
 * Get all Teachers
 * GET /api/reception/teachers
 */
export const getTeachers = async (req, res) => {
  try {
    // Reception users can only see teachers they created
    const teachers = await User.findAll({
      where: { 
        role: 'teacher',
        createdBy: req.user.id, // Only show teachers created by this reception user
      },
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
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
 * Get all Parents
 * GET /api/reception/parents
 */
export const getParents = async (req, res) => {
  try {
    // Reception users can only see parents they created
    const parents = await User.findAll({
      where: { 
        role: 'parent',
        createdBy: req.user.id, // Only show parents created by this reception user
      },
      attributes: { exclude: ['password'] },
      include: [
        {
          model: User,
          as: 'assignedTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'description'],
          required: false,
        },
        {
          model: Child,
          as: 'children',
          attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'medicalDiagnosis', 'specialNeeds', 'school', 'class', 'teacher', 'photo'],
          required: false,
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    res.json({
      success: true,
      data: parents,
    });
  } catch (error) {
    logger.error('Get parents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
};

/**
 * Update Teacher credentials
 * PUT /api/reception/teachers/:id
 */
export const updateTeacher = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, firstName, lastName, phone } = req.body;

    const teacher = await User.findOne({
      where: { id, role: 'teacher', createdBy: req.user.id }, // Only allow updating teachers created by this reception user
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = password;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone === '' ? null : phone;

    await teacher.update(updateData);

    // Reload teacher to get updated data
    await teacher.reload();

    logger.info('Teacher updated by Reception', {
      teacherId: teacher.id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Teacher updated successfully',
      data: teacher.toJSON(),
    });
  } catch (error) {
    logger.error('Update teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update teacher' });
  }
};

/**
 * Update Parent credentials
 * PUT /api/reception/parents/:id
 */
export const updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    let { email, password, firstName, lastName, phone, teacherId, groupId } = req.body;

    // Normalize empty strings to null (only if the field was provided)
    const teacherIdProvided = teacherId !== undefined;
    const groupIdProvided = groupId !== undefined;
    teacherId = (teacherId === '') ? null : teacherId;
    groupId = (groupId === '') ? null : groupId;
    phone = (phone === '') ? null : phone;

    const parent = await User.findOne({
      where: { id, role: 'parent', createdBy: req.user.id }, // Only allow updating parents created by this reception user
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Validate teacher exists, was created by this reception user, and belongs to same school
    if (teacherId) {
      const teacherWhere = { id: teacherId, role: 'teacher', createdBy: req.user.id };
      if (req.user.schoolId) {
        teacherWhere.schoolId = req.user.schoolId;
      }
      const teacher = await User.findOne({ where: teacherWhere });
      if (!teacher) {
        return res.status(400).json({ error: 'Invalid teacher selected or you do not have permission to assign this teacher' });
      }
    }

    // Validate group exists and belongs to teacher if both are provided
    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) {
        return res.status(400).json({ error: 'Invalid group selected' });
      }
      const finalTeacherId = teacherIdProvided && teacherId !== null ? teacherId : parent.teacherId;
      if (finalTeacherId && group.teacherId !== finalTeacherId) {
        return res.status(400).json({ error: 'Group does not belong to the selected teacher' });
      }
    }

    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = password;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    // Include teacherId and groupId only if explicitly provided (to allow clearing assignments)
    if (teacherIdProvided) updateData.teacherId = teacherId;
    if (groupIdProvided) updateData.groupId = groupId;

    await parent.update(updateData);

    // Fetch parent with relationships to return complete data
    const parentWithRelations = await User.findByPk(parent.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: User,
          as: 'assignedTeacher',
          attributes: ['id', 'firstName', 'lastName', 'email'],
          required: false,
        },
        {
          model: Group,
          as: 'group',
          attributes: ['id', 'name', 'description'],
          required: false,
        },
        {
          model: Child,
          as: 'children',
          attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'medicalDiagnosis', 'specialNeeds', 'school', 'class', 'teacher', 'photo'],
          required: false,
        },
      ],
    });

    logger.info('Parent updated by Reception', {
      parentId: parent.id,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Parent updated successfully',
      data: parentWithRelations.toJSON(),
    });
  } catch (error) {
    logger.error('Update parent error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update parent' });
  }
};

/**
 * Delete Teacher account
 * DELETE /api/reception/teachers/:id
 */
export const deleteTeacher = async (req, res) => {
  try {
    const { id } = req.params;

    const teacher = await User.findOne({
      where: { id, role: 'teacher', createdBy: req.user.id }, // Only allow deleting teachers created by this reception user
    });

    if (!teacher) {
      return res.status(404).json({ error: 'Teacher not found' });
    }

    await teacher.destroy();

    logger.info('Teacher deleted by Reception', {
      teacherId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Teacher deleted successfully',
    });
  } catch (error) {
    logger.error('Delete teacher error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete teacher' });
  }
};

/**
 * Delete Parent account
 * DELETE /api/reception/parents/:id
 */
export const deleteParent = async (req, res) => {
  try {
    const { id } = req.params;

    const parent = await User.findOne({
      where: { id, role: 'parent', createdBy: req.user.id }, // Only allow deleting parents created by this reception user
    });

    if (!parent) {
      return res.status(404).json({ error: 'Parent not found' });
    }

    // Delete children first (cascade delete)
    await Child.destroy({
      where: { parentId: id },
    });

    await parent.destroy();

    logger.info('Parent deleted by Reception', {
      parentId: id,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Parent deleted successfully',
    });
  } catch (error) {
    logger.error('Delete parent error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete parent' });
  }
};

/**
 * Create a Child for an existing Parent
 * POST /api/reception/parents/:parentId/children
 * 
 * Business Logic:
 * - Reception can add children to parents they created
 * - Supports file upload for child photo
 */
export const createChildForParent = async (req, res) => {
  try {
    // Debug: Log request body and files
    logger.info('Create child for parent request', {
      bodyKeys: Object.keys(req.body),
      bodyValues: req.body,
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
    });
    
    // Get parentId from params or body
    const parentId = req.params.id || req.body.parentId;
    
    if (!parentId) {
      logger.warn('Create child: parentId missing', {
        params: req.params,
        bodyKeys: Object.keys(req.body),
      });
      return res.status(400).json({ error: 'Parent ID is required' });
    }
    
    // Verify parent exists and was created by this reception user
    const parent = await User.findOne({
      where: { id: parentId, role: 'parent', createdBy: req.user.id },
    });

    if (!parent) {
      logger.warn('Create child: parent not found', {
        parentId,
        receptionUserId: req.user.id,
      });
      return res.status(404).json({ error: 'Parent not found or you do not have permission to add children to this parent' });
    }

    // Parse FormData fields - try multiple formats
    // Multer might parse nested fields differently
    const firstName = req.body['child[firstName]'] || req.body['child.firstName'] || req.body.firstName || req.body.child?.firstName;
    const lastName = req.body['child[lastName]'] || req.body['child.lastName'] || req.body.lastName || req.body.child?.lastName;
    const dateOfBirth = req.body['child[dateOfBirth]'] || req.body['child.dateOfBirth'] || req.body.dateOfBirth || req.body.child?.dateOfBirth;
    const gender = req.body['child[gender]'] || req.body['child.gender'] || req.body.gender || req.body.child?.gender || 'Male';
    const disabilityType = req.body['child[disabilityType]'] || req.body['child.disabilityType'] || req.body.disabilityType || req.body.child?.disabilityType;
    const medicalDiagnosis = req.body['child[medicalDiagnosis]'] || req.body['child.medicalDiagnosis'] || req.body.medicalDiagnosis || req.body.child?.medicalDiagnosis || null;
    const specialNeeds = req.body['child[specialNeeds]'] || req.body['child.specialNeeds'] || req.body.specialNeeds || req.body.child?.specialNeeds || null;
    const school = req.body['child[school]'] || req.body['child.school'] || req.body.school || req.body.child?.school || 'Uchqun School';

    // Debug: Log parsed values
    logger.info('Create child: parsed values', {
      parentId,
      firstName: !!firstName,
      lastName: !!lastName,
      dateOfBirth: !!dateOfBirth,
      gender,
      disabilityType: !!disabilityType,
      school: !!school,
    });

    if (!firstName || !lastName || !dateOfBirth || !gender || !disabilityType || !school) {
      logger.warn('Create child: validation failed', {
        firstName: !!firstName,
        lastName: !!lastName,
        dateOfBirth: !!dateOfBirth,
        gender,
        disabilityType: !!disabilityType,
        school: !!school,
      });
      return res.status(400).json({ 
        error: 'First name, last name, date of birth, gender, disability type, and school are required',
        missing: {
          firstName: !firstName,
          lastName: !lastName,
          dateOfBirth: !dateOfBirth,
          gender: !gender,
          disabilityType: !disabilityType,
          school: !school,
        }
      });
    }

    let photoUrl = null;
    
    // Handle photo file upload if provided
    if (req.files && req.files['child[photo]'] && req.files['child[photo]'][0]) {
      const photoFile = req.files['child[photo]'][0];
      try {
        const fileBuffer = fs.readFileSync(photoFile.path);
        const uploadResult = await uploadFile(fileBuffer, photoFile.filename, photoFile.mimetype);
        photoUrl = uploadResult.url;
        
        // Delete local file after upload
        try {
          fs.unlinkSync(photoFile.path);
        } catch (e) {
          logger.warn('Error deleting local photo file after upload', { error: e.message });
        }
      } catch (error) {
        logger.error('Error uploading child photo', { error: error.message });
        // Continue without photo if upload fails
      }
    } else if (req.body['child[photo]'] && typeof req.body['child[photo]'] === 'string') {
      // If photo is a URL string (legacy support)
      photoUrl = req.body['child[photo]'];
    }

    // Find school by name if school name is provided
    let schoolId = null;
    if (school) {
      try {
        // Try exact match first (case-insensitive)
        let foundSchool = await School.findOne({
          where: {
            name: {
              [Op.iLike]: school,
            },
          },
        });
        
        // If not found, try partial match
        if (!foundSchool) {
          foundSchool = await School.findOne({
            where: {
              name: {
                [Op.iLike]: `%${school}%`,
              },
            },
          });
        }
        
        if (foundSchool) {
          schoolId = foundSchool.id;
          logger.info('School found for child', {
            childSchool: school,
            schoolId: foundSchool.id,
            schoolName: foundSchool.name,
          });
        } else {
          logger.warn('School not found for child', {
            childSchool: school,
          });
        }
      } catch (error) {
        logger.error('Error finding school for child', {
          error: error.message,
          childSchool: school,
        });
        // Continue without schoolId if lookup fails
      }
    }

    // Create child
    const child = await Child.create({
      parentId: parent.id,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      disabilityType,
      medicalDiagnosis,
      specialNeeds,
      photo: photoUrl,
      school,
      schoolId: schoolId,
      class: '', // Will be set from group if needed
      teacher: '', // Will be set from group if needed
      groupId: null,
      emergencyContact: {},
    });

    logger.info('Child created by Reception', {
      childId: child.id,
      parentId: parent.id,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Child created successfully',
      data: child.toJSON(),
    });
  } catch (error) {
    logger.error('Create child error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create child' });
  }
};

/**
 * Update a child (reception can update children of parents they created)
 * PUT /api/reception/children/:id
 */
export const updateChildForReception = async (req, res) => {
  try {
    const { id: childId } = req.params;

    const child = await Child.findByPk(childId, {
      include: [{ model: User, as: 'parent', attributes: ['id', 'createdBy'] }],
    });
    if (!child || !child.parent) {
      return res.status(404).json({ error: 'Child not found' });
    }
    if (child.parent.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'You can only update children of parents you created' });
    }

    const firstName = req.body['child[firstName]'] ?? req.body.child?.firstName ?? child.firstName;
    const lastName = req.body['child[lastName]'] ?? req.body.child?.lastName ?? child.lastName;
    const dateOfBirth = req.body['child[dateOfBirth]'] ?? req.body.child?.dateOfBirth ?? child.dateOfBirth;
    const gender = req.body['child[gender]'] ?? req.body.child?.gender ?? child.gender;
    const disabilityType = req.body['child[disabilityType]'] ?? req.body.child?.disabilityType ?? child.disabilityType;
    const medicalDiagnosis = req.body['child[medicalDiagnosis]'] !== undefined
      ? (req.body['child[medicalDiagnosis]'] ?? req.body.child?.medicalDiagnosis ?? null)
      : child.medicalDiagnosis;
    const specialNeeds = req.body['child[specialNeeds]'] !== undefined ? (req.body['child[specialNeeds]'] ?? req.body.child?.specialNeeds ?? null) : child.specialNeeds;
    const school = req.body['child[school]'] ?? req.body.child?.school ?? child.school;

    if (!firstName || !lastName || !dateOfBirth || !gender || !disabilityType || !school) {
      return res.status(400).json({
        error: 'First name, last name, date of birth, gender, disability type, and school are required',
      });
    }

    let photoUrl = child.photo;
    if (req.files && req.files['child[photo]'] && req.files['child[photo]'][0]) {
      const photoFile = req.files['child[photo]'][0];
      try {
        if (child.photo) {
          try {
            await deleteFile(child.photo);
          } catch (e) {
            logger.warn('Error deleting old child photo', { error: e.message });
          }
        }
        const fileBuffer = fs.readFileSync(photoFile.path);
        const uploadResult = await uploadFile(fileBuffer, photoFile.filename, photoFile.mimetype);
        photoUrl = uploadResult?.url || child.photo;
        try {
          fs.unlinkSync(photoFile.path);
        } catch (e) {
          logger.warn('Error deleting local photo file', { error: e.message });
        }
      } catch (error) {
        logger.error('Error uploading child photo', { error: error.message });
      }
    } else if (req.body['child[photo]'] && typeof req.body['child[photo]'] === 'string') {
      photoUrl = req.body['child[photo]'];
    }

    let schoolId = child.schoolId;
    if (school) {
      try {
        let foundSchool = await School.findOne({
          where: { name: { [Op.iLike]: school } },
        });
        if (!foundSchool) {
          foundSchool = await School.findOne({
            where: { name: { [Op.iLike]: `%${school}%` } },
          });
        }
        if (foundSchool) schoolId = foundSchool.id;
      } catch (e) {
        logger.warn('School lookup failed for child update', { error: e.message });
      }
    }

    await child.update({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      dateOfBirth,
      gender,
      disabilityType: disabilityType.trim(),
      medicalDiagnosis: medicalDiagnosis === '' ? null : (medicalDiagnosis && String(medicalDiagnosis).trim()) || null,
      specialNeeds: specialNeeds === '' ? null : (specialNeeds && specialNeeds.trim()) || null,
      school: school.trim(),
      schoolId: schoolId ?? child.schoolId,
      photo: photoUrl,
    });

    logger.info('Child updated by Reception', {
      childId: child.id,
      parentId: child.parentId,
      updatedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Child updated successfully',
      data: child.toJSON(),
    });
  } catch (error) {
    logger.error('Update child (reception) error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update child' });
  }
};

/**
 * Delete a child (reception can delete children of parents they created)
 * DELETE /api/reception/children/:id
 */
export const deleteChildForReception = async (req, res) => {
  try {
    const { id: childId } = req.params;

    const child = await Child.findByPk(childId, {
      include: [{ model: User, as: 'parent', attributes: ['id', 'createdBy'] }],
    });
    if (!child || !child.parent) {
      return res.status(404).json({ error: 'Child not found' });
    }
    if (child.parent.createdBy !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete children of parents you created' });
    }

    if (child.photo) {
      try {
        await deleteFile(child.photo);
      } catch (e) {
        logger.warn('Failed to delete child photo from storage', { childId, error: e.message });
      }
    }

    // Remove dependent records so FK does not block child.destroy()
    await TherapyUsage.destroy({ where: { childId } });
    await Activity.destroy({ where: { childId } });
    await Media.destroy({ where: { childId } });
    await Meal.destroy({ where: { childId } });
    await Progress.destroy({ where: { childId } });

    await child.destroy();

    logger.info('Child deleted by Reception', {
      childId,
      parentId: child.parentId,
      deletedBy: req.user.id,
    });

    res.json({
      success: true,
      message: 'Child deleted successfully',
    });
  } catch (error) {
    logger.error('Delete child (reception) error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete child' });
  }
};

/**
 * Get reception's messages to super-admin
 * GET /api/reception/messages
 * 
 * Business Logic:
 * - Reception can view their own messages sent to super-admin
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


