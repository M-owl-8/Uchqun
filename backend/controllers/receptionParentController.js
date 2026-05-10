import User from '../models/User.js';
import Child from '../models/Child.js';
import Group from '../models/Group.js';
import School from '../models/School.js';
import TherapyUsage from '../models/TherapyUsage.js';
import Activity from '../models/Activity.js';
import Media from '../models/Media.js';
import Meal from '../models/Meal.js';
import Progress from '../models/Progress.js';
import logger from '../utils/logger.js';
import { Op } from 'sequelize';
import sequelize from '../config/database.js';
import { uploadFile, deleteFile } from '../config/storage.js';
import fs from 'fs';

export const createParent = async (req, res) => {
  try {
    logger.info('Create parent request', {
      bodyKeys: Object.keys(req.body),
      hasFiles: !!req.files,
      filesKeys: req.files ? Object.keys(req.files) : [],
    });

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
        school: req.body['child[school]'] || req.body.child?.school || '',
        photo: null,
      };
    }

    const email = req.body.email;
    const password = req.body.password;
    const firstName = req.body.firstName;
    const lastName = req.body.lastName;
    const phone = req.body.phone || null;
    const teacherId = req.body.teacherId || null;
    const groupId = req.body.groupId || null;

    if (!email || !password || !firstName || !lastName) {
      logger.warn('Create parent validation failed', {
        email: !!email, password: !!password, firstName: !!firstName, lastName: !!lastName,
        bodyKeys: Object.keys(req.body),
      });
      return res.status(400).json({ error: 'Email, password, first name, and last name are required' });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) return res.status(400).json({ error: 'User with this email already exists' });

    if (teacherId) {
      const teacherWhere = { id: teacherId, role: 'teacher', createdBy: req.user.id };
      if (req.user.schoolId) teacherWhere.schoolId = req.user.schoolId;
      const teacher = await User.findOne({ where: teacherWhere });
      if (!teacher) return res.status(400).json({ error: 'Invalid teacher selected or you do not have permission to assign this teacher' });
    }

    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) return res.status(400).json({ error: 'Invalid group selected' });
      if (teacherId && group.teacherId !== teacherId) return res.status(400).json({ error: 'Group does not belong to the selected teacher' });
      if (!teacherId) req.body.teacherId = group.teacherId;
    }

    const parent = await User.create({
      email: email.toLowerCase(), password, firstName, lastName, phone,
      role: 'parent', isActive: true,
      teacherId: teacherId || (groupId ? (await Group.findByPk(groupId)).teacherId : null),
      groupId: groupId || null,
      createdBy: req.user.id, schoolId: req.user.schoolId,
    });

    if (child && child.firstName && child.lastName) {
      let photoUrl = null;

      if (req.files && req.files['child[photo]'] && req.files['child[photo]'][0]) {
        const photoFile = req.files['child[photo]'][0];
        try {
          const fileBuffer = fs.readFileSync(photoFile.path);
          const uploadResult = await uploadFile(fileBuffer, photoFile.filename, photoFile.mimetype);
          photoUrl = uploadResult.url;
          try { fs.unlinkSync(photoFile.path); } catch (e) { logger.warn('Error deleting local photo file after upload', { error: e.message }); }
        } catch (error) {
          logger.error('Error uploading child photo', { error: error.message });
        }
      } else if (child.photo && typeof child.photo === 'string') {
        photoUrl = child.photo;
      }

      let schoolId = null;
      if (child.school) {
        try {
          let foundSchool = await School.findOne({ where: { name: { [Op.iLike]: child.school } } });
          if (!foundSchool) foundSchool = await School.findOne({ where: { name: { [Op.iLike]: `%${child.school}%` } } });
          if (foundSchool) {
            schoolId = foundSchool.id;
            logger.info('School found for child', { childSchool: child.school, schoolId: foundSchool.id, schoolName: foundSchool.name });
          } else {
            logger.warn('School not found for child', { childSchool: child.school });
          }
        } catch (error) {
          logger.error('Error finding school for child', { error: error.message, childSchool: child.school });
        }
      }

      if (req.user.schoolId) schoolId = req.user.schoolId;

      await Child.create({
        parentId: parent.id, firstName: child.firstName, lastName: child.lastName,
        dateOfBirth: child.dateOfBirth, gender: child.gender, disabilityType: child.disabilityType,
        medicalDiagnosis: child.medicalDiagnosis || null, specialNeeds: child.specialNeeds || null,
        photo: photoUrl, school: child.school, schoolId,
        class: child.class || '', teacher: child.teacher || '',
        groupId: null, emergencyContact: {},
      });
    }

    const parentWithRelations = await User.findByPk(parent.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Group, as: 'group', attributes: ['id', 'name', 'description'], required: false },
        { model: Child, as: 'children', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'medicalDiagnosis', 'specialNeeds', 'school', 'class', 'teacher', 'photo'], required: false },
      ],
    });

    logger.info('Parent created by Reception', { parentId: parent.id, email: parent.email, teacherId: parent.teacherId, groupId: parent.groupId, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Parent account created successfully', data: parentWithRelations.toJSON() });
  } catch (error) {
    logger.error('Create parent error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create parent account' });
  }
};

export const getParents = async (req, res) => {
  try {
    const parents = await User.findAll({
      where: { role: 'parent', createdBy: req.user.id },
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Group, as: 'group', attributes: ['id', 'name', 'description'], required: false },
        { model: Child, as: 'children', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'medicalDiagnosis', 'specialNeeds', 'school', 'class', 'teacher', 'photo'], required: false },
      ],
      order: [['createdAt', 'DESC']],
    });
    res.json({ success: true, data: parents });
  } catch (error) {
    logger.error('Get parents error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to fetch parents' });
  }
};

export const updateParent = async (req, res) => {
  try {
    const { id } = req.params;
    let { email, password, firstName, lastName, phone, teacherId, groupId } = req.body;

    const teacherIdProvided = teacherId !== undefined;
    const groupIdProvided = groupId !== undefined;
    teacherId = (teacherId === '') ? null : teacherId;
    groupId = (groupId === '') ? null : groupId;
    phone = (phone === '') ? null : phone;

    const parent = await User.findOne({ where: { id, role: 'parent', createdBy: req.user.id } });
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    if (teacherId) {
      const teacherWhere = { id: teacherId, role: 'teacher', createdBy: req.user.id };
      if (req.user.schoolId) teacherWhere.schoolId = req.user.schoolId;
      const teacher = await User.findOne({ where: teacherWhere });
      if (!teacher) return res.status(400).json({ error: 'Invalid teacher selected or you do not have permission to assign this teacher' });
    }

    if (groupId) {
      const group = await Group.findByPk(groupId);
      if (!group) return res.status(400).json({ error: 'Invalid group selected' });
      const finalTeacherId = teacherIdProvided && teacherId !== null ? teacherId : parent.teacherId;
      if (finalTeacherId && group.teacherId !== finalTeacherId) return res.status(400).json({ error: 'Group does not belong to the selected teacher' });
    }

    const updateData = {};
    if (email) updateData.email = email.toLowerCase();
    if (password) updateData.password = password;
    if (firstName) updateData.firstName = firstName;
    if (lastName) updateData.lastName = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (teacherIdProvided) updateData.teacherId = teacherId;
    if (groupIdProvided) updateData.groupId = groupId;

    await parent.update(updateData);

    const parentWithRelations = await User.findByPk(parent.id, {
      attributes: { exclude: ['password'] },
      include: [
        { model: User, as: 'assignedTeacher', attributes: ['id', 'firstName', 'lastName', 'email'], required: false },
        { model: Group, as: 'group', attributes: ['id', 'name', 'description'], required: false },
        { model: Child, as: 'children', attributes: ['id', 'firstName', 'lastName', 'dateOfBirth', 'gender', 'disabilityType', 'medicalDiagnosis', 'specialNeeds', 'school', 'class', 'teacher', 'photo'], required: false },
      ],
    });

    logger.info('Parent updated by Reception', { parentId: parent.id, updatedBy: req.user.id });
    res.json({ success: true, message: 'Parent updated successfully', data: parentWithRelations.toJSON() });
  } catch (error) {
    logger.error('Update parent error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update parent' });
  }
};

export const deleteParent = async (req, res) => {
  try {
    const { id } = req.params;
    const parent = await User.findOne({ where: { id, role: 'parent', createdBy: req.user.id } });
    if (!parent) return res.status(404).json({ error: 'Parent not found' });

    await sequelize.transaction(async (t) => {
      await Child.destroy({ where: { parentId: id }, transaction: t });
      await parent.destroy({ transaction: t });
    });

    logger.info('Parent deleted by Reception', { parentId: id, deletedBy: req.user.id });
    res.json({ success: true, message: 'Parent deleted successfully' });
  } catch (error) {
    logger.error('Delete parent error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete parent' });
  }
};

export const createChildForParent = async (req, res) => {
  try {
    logger.info('Create child for parent request', {
      bodyKeys: Object.keys(req.body), bodyValues: req.body,
      hasFiles: !!req.files, filesKeys: req.files ? Object.keys(req.files) : [],
    });

    const parentId = req.params.id || req.body.parentId;
    if (!parentId) {
      logger.warn('Create child: parentId missing', { params: req.params, bodyKeys: Object.keys(req.body) });
      return res.status(400).json({ error: 'Parent ID is required' });
    }

    const parent = await User.findOne({ where: { id: parentId, role: 'parent', createdBy: req.user.id } });
    if (!parent) {
      logger.warn('Create child: parent not found', { parentId, receptionUserId: req.user.id });
      return res.status(404).json({ error: 'Parent not found or you do not have permission to add children to this parent' });
    }

    const firstName = req.body['child[firstName]'] || req.body['child.firstName'] || req.body.firstName || req.body.child?.firstName;
    const lastName = req.body['child[lastName]'] || req.body['child.lastName'] || req.body.lastName || req.body.child?.lastName;
    const dateOfBirth = req.body['child[dateOfBirth]'] || req.body['child.dateOfBirth'] || req.body.dateOfBirth || req.body.child?.dateOfBirth;
    const gender = req.body['child[gender]'] || req.body['child.gender'] || req.body.gender || req.body.child?.gender || 'Male';
    const disabilityType = req.body['child[disabilityType]'] || req.body['child.disabilityType'] || req.body.disabilityType || req.body.child?.disabilityType;
    const medicalDiagnosis = req.body['child[medicalDiagnosis]'] || req.body['child.medicalDiagnosis'] || req.body.medicalDiagnosis || req.body.child?.medicalDiagnosis || null;
    const specialNeeds = req.body['child[specialNeeds]'] || req.body['child.specialNeeds'] || req.body.specialNeeds || req.body.child?.specialNeeds || null;
    const school = req.body['child[school]'] || req.body['child.school'] || req.body.school || req.body.child?.school || '';

    logger.info('Create child: parsed values', { parentId, firstName: !!firstName, lastName: !!lastName, dateOfBirth: !!dateOfBirth, gender, disabilityType: !!disabilityType, school: !!school });

    if (!firstName || !lastName || !dateOfBirth || !gender || !disabilityType || !school) {
      logger.warn('Create child: validation failed', { firstName: !!firstName, lastName: !!lastName, dateOfBirth: !!dateOfBirth, gender, disabilityType: !!disabilityType, school: !!school });
      return res.status(400).json({
        error: 'First name, last name, date of birth, gender, disability type, and school are required',
        missing: { firstName: !firstName, lastName: !lastName, dateOfBirth: !dateOfBirth, gender: !gender, disabilityType: !disabilityType, school: !school },
      });
    }

    let photoUrl = null;
    if (req.files && req.files['child[photo]'] && req.files['child[photo]'][0]) {
      const photoFile = req.files['child[photo]'][0];
      try {
        const fileBuffer = fs.readFileSync(photoFile.path);
        const uploadResult = await uploadFile(fileBuffer, photoFile.filename, photoFile.mimetype);
        photoUrl = uploadResult.url;
        try { fs.unlinkSync(photoFile.path); } catch (e) { logger.warn('Error deleting local photo file after upload', { error: e.message }); }
      } catch (error) {
        logger.error('Error uploading child photo', { error: error.message });
      }
    } else if (req.body['child[photo]'] && typeof req.body['child[photo]'] === 'string') {
      photoUrl = req.body['child[photo]'];
    }

    let schoolId = null;
    if (school) {
      try {
        let foundSchool = await School.findOne({ where: { name: { [Op.iLike]: school } } });
        if (!foundSchool) foundSchool = await School.findOne({ where: { name: { [Op.iLike]: `%${school}%` } } });
        if (foundSchool) {
          schoolId = foundSchool.id;
          logger.info('School found for child', { childSchool: school, schoolId: foundSchool.id, schoolName: foundSchool.name });
        } else {
          logger.warn('School not found for child', { childSchool: school });
        }
      } catch (error) {
        logger.error('Error finding school for child', { error: error.message, childSchool: school });
      }
    }

    const child = await Child.create({
      parentId: parent.id, firstName, lastName, dateOfBirth, gender, disabilityType,
      medicalDiagnosis, specialNeeds, photo: photoUrl, school, schoolId,
      class: '', teacher: '', groupId: null, emergencyContact: {},
    });

    logger.info('Child created by Reception', { childId: child.id, parentId: parent.id, createdBy: req.user.id });
    res.status(201).json({ success: true, message: 'Child created successfully', data: child.toJSON() });
  } catch (error) {
    logger.error('Create child error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create child' });
  }
};

export const updateChildForReception = async (req, res) => {
  try {
    const { id: childId } = req.params;

    const child = await Child.findByPk(childId, {
      include: [{ model: User, as: 'parent', attributes: ['id', 'createdBy'] }],
    });
    if (!child || !child.parent) return res.status(404).json({ error: 'Child not found' });
    if (child.parent.createdBy !== req.user.id) return res.status(403).json({ error: 'You can only update children of parents you created' });

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
      return res.status(400).json({ error: 'First name, last name, date of birth, gender, disability type, and school are required' });
    }

    let photoUrl = child.photo;
    if (req.files && req.files['child[photo]'] && req.files['child[photo]'][0]) {
      const photoFile = req.files['child[photo]'][0];
      try {
        if (child.photo) {
          try { await deleteFile(child.photo); } catch (e) { logger.warn('Error deleting old child photo', { error: e.message }); }
        }
        const fileBuffer = fs.readFileSync(photoFile.path);
        const uploadResult = await uploadFile(fileBuffer, photoFile.filename, photoFile.mimetype);
        photoUrl = uploadResult?.url || child.photo;
        try { fs.unlinkSync(photoFile.path); } catch (e) { logger.warn('Error deleting local photo file', { error: e.message }); }
      } catch (error) {
        logger.error('Error uploading child photo', { error: error.message });
      }
    } else if (req.body['child[photo]'] && typeof req.body['child[photo]'] === 'string') {
      photoUrl = req.body['child[photo]'];
    }

    let schoolId = child.schoolId;
    if (school) {
      try {
        let foundSchool = await School.findOne({ where: { name: { [Op.iLike]: school } } });
        if (!foundSchool) foundSchool = await School.findOne({ where: { name: { [Op.iLike]: `%${school}%` } } });
        if (foundSchool) schoolId = foundSchool.id;
      } catch (e) {
        logger.warn('School lookup failed for child update', { error: e.message });
      }
    }

    await child.update({
      firstName: firstName.trim(), lastName: lastName.trim(), dateOfBirth, gender,
      disabilityType: disabilityType.trim(),
      medicalDiagnosis: medicalDiagnosis === '' ? null : (medicalDiagnosis && String(medicalDiagnosis).trim()) || null,
      specialNeeds: specialNeeds === '' ? null : (specialNeeds && specialNeeds.trim()) || null,
      school: school.trim(), schoolId: schoolId ?? child.schoolId, photo: photoUrl,
    });

    logger.info('Child updated by Reception', { childId: child.id, parentId: child.parentId, updatedBy: req.user.id });
    res.json({ success: true, message: 'Child updated successfully', data: child.toJSON() });
  } catch (error) {
    logger.error('Update child (reception) error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to update child' });
  }
};

export const deleteChildForReception = async (req, res) => {
  try {
    const { id: childId } = req.params;

    const child = await Child.findByPk(childId, {
      include: [{ model: User, as: 'parent', attributes: ['id', 'createdBy'] }],
    });
    if (!child || !child.parent) return res.status(404).json({ error: 'Child not found' });
    if (child.parent.createdBy !== req.user.id) return res.status(403).json({ error: 'You can only delete children of parents you created' });

    if (child.photo) {
      try { await deleteFile(child.photo); } catch (e) { logger.warn('Failed to delete child photo from storage', { childId, error: e.message }); }
    }

    await sequelize.transaction(async (t) => {
      await TherapyUsage.destroy({ where: { childId }, transaction: t });
      await Activity.destroy({ where: { childId }, transaction: t });
      await Media.destroy({ where: { childId }, transaction: t });
      await Meal.destroy({ where: { childId }, transaction: t });
      await Progress.destroy({ where: { childId }, transaction: t });
      await child.destroy({ transaction: t });
    });

    logger.info('Child deleted by Reception', { childId, parentId: child.parentId, deletedBy: req.user.id });
    res.json({ success: true, message: 'Child deleted successfully' });
  } catch (error) {
    logger.error('Delete child (reception) error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to delete child' });
  }
};
