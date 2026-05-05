import User from '../../models/User.js';
import logger from '../../utils/logger.js';

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
 * Create an Admin account
 * POST /api/admin/admins
 */
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
