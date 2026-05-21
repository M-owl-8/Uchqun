import User from '../../models/User.js';
import School from '../../models/School.js';
import Region from '../../models/Region.js';
import logger from '../../utils/logger.js';
import { logAudit } from '../../utils/auditLogger.js';
import { isValidGrantSet, unknownGrantKeys } from '../../config/govCapabilities.js';
import { revokeJti } from '../../middleware/auth.js';

/**
 * Get all Admin accounts (Government view)
 * GET /api/government/admins
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
 * Update an Admin account (Government only)
 * PUT /api/government/admins/:id
 */
export const updateAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, password } = req.body;

    const admin = await User.findOne({ where: { id, role: 'admin' } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Region accounts may only update admins whose school belongs to their region.
    if (!req.isGlobalAccess) {
      if (!admin.schoolId) return res.status(404).json({ error: 'Admin not found' });
      const school = await School.findOne({ where: { id: admin.schoolId, regionId: req.regionScope } });
      if (!school) return res.status(404).json({ error: 'Admin not found' });
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

    logAudit({
      actorId: req.user?.id, actorRole: req.user?.role,
      action: 'update', entity: 'admins', entityId: admin.id,
      meta: { email: admin.email },
    });

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
 * Delete an Admin account (Government only)
 * DELETE /api/government/admins/:id
 */
export const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({ where: { id, role: 'admin' } });
    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Region accounts may only delete admins whose school belongs to their region.
    if (!req.isGlobalAccess) {
      if (!admin.schoolId) return res.status(404).json({ error: 'Admin not found' });
      const school = await School.findOne({ where: { id: admin.schoolId, regionId: req.regionScope } });
      if (!school) return res.status(404).json({ error: 'Admin not found' });
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

    logAudit({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'delete', entity: 'admins', entityId: admin.id,
      meta: { email: admin.email },
    });

    await admin.destroy({ actorId: req.user.id, actorRole: req.user.role, reason: 'admin_delete' });

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
 * Create an Admin account (Government only)
 * POST /api/government/admins
 */
export const createAdmin = async (req, res) => {
  try {
    const { firstName, lastName, email, password, schoolId, role: _role } = req.body;

    if (!firstName || !lastName || !email || !password) {
      return res.status(400).json({
        error: 'First name, last name, email and password are required'
      });
    }

    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({ error: 'Password must be at least 8 characters and contain uppercase, lowercase, and a digit' });
    }

    // Region accounts may only assign admins to schools within their region.
    if (!req.isGlobalAccess && schoolId) {
      const school = await School.findOne({ where: { id: schoolId, regionId: req.regionScope } });
      if (!school) return res.status(404).json({ error: 'School not found in your region' });
    }

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const admin = await User.create({
      email: email.toLowerCase(),
      password,
      firstName,
      lastName,
      role: 'admin',
      ...(schoolId && { schoolId }),
    });

    logAudit({
      actorId: req.user.id, actorRole: req.user.role,
      action: 'create', entity: 'admins', entityId: admin.id,
      meta: { email: admin.email },
    });

    logger.info('Admin account created', {
      adminId: admin.id,
      email: admin.email,
      createdBy: req.user.id,
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: admin.toJSON(),
    });
  } catch (error) {
    logger.error('Create admin error', { error: error.message, stack: error.stack });
    res.status(500).json({ error: 'Failed to create admin account' });
  }
};

// ─── Government account provisioning (CP-021) ─────────────────────────────────

/**
 * Create government user (hierarchical provisioning — CP-021)
 * POST /api/government/users
 *
 * Authorization matrix:
 *   republic-main  → can create republic-secondary OR region-main/secondary (any region)
 *   region-main    → can create region-main/secondary IN THEIR OWN REGION ONLY
 *   secondary      → cannot provision (403 PROVISION_FORBIDDEN)
 *
 * republic-main cannot create a SECOND republic-main (403 REPUBLIC_MAIN_EXISTS).
 *
 * Body: { firstName, lastName, password, govLevel, govType, govRegionId?, govAccessGrants? }
 * Email is generated automatically: name@regioncode (region) or name@respublika (republic).
 */
export const createGovernment = async (req, res) => {
  try {
    const actor = req.user;

    // ── Authorization: who can provision? ──────────────────────────────────
    if (actor.govType === 'secondary') {
      return res.status(403).json({
        success: false,
        error: { code: 'PROVISION_FORBIDDEN', detail: 'secondary accounts cannot create government users' },
      });
    }

    const { firstName, lastName, password, govLevel, govType, govRegionId, govAccessGrants } = req.body;

    if (!firstName || !lastName || !password || !govLevel || !govType) {
      return res.status(400).json({
        success: false,
        error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: 'firstName, lastName, password, govLevel, govType are required' },
      });
    }

    if (!['republic', 'region'].includes(govLevel) || !['main', 'secondary'].includes(govType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: 'govLevel must be republic|region; govType must be main|secondary' },
      });
    }

    // ── Block second republic-main ──────────────────────────────────────────
    if (govLevel === 'republic' && govType === 'main') {
      return res.status(409).json({
        success: false,
        error: { code: 'REPUBLIC_MAIN_EXISTS', detail: 'a republic-main account already exists; only one super-admin is allowed' },
      });
    }

    // ── Region-level constraints ────────────────────────────────────────────
    if (govLevel === 'region') {
      if (!govRegionId) {
        return res.status(400).json({
          success: false,
          error: { code: 'PROVISION_REGION_REQUIRED', detail: 'govRegionId is required for region-level accounts' },
        });
      }
      // Region-main can only create accounts in their own region
      if (actor.govLevel === 'region' && govRegionId !== actor.govRegionId) {
        return res.status(403).json({
          success: false,
          error: { code: 'PROVISION_REGION_OUT_OF_SCOPE', detail: 'region-main can only create accounts in their own region' },
        });
      }
      // Republic-main creating a region account — ensure the target region exists
      const region = await Region.findByPk(govRegionId);
      if (!region) {
        return res.status(400).json({
          success: false,
          error: { code: 'PROVISION_REGION_REQUIRED', detail: 'govRegionId does not match a known region' },
        });
      }
    }

    // ── Republic account: region-main cannot create republic accounts ───────
    if (govLevel === 'republic' && actor.govLevel === 'region') {
      return res.status(403).json({
        success: false,
        error: { code: 'PROVISION_FORBIDDEN', detail: 'region-main cannot create republic-level accounts' },
      });
    }

    // ── Grant validation for secondary accounts ─────────────────────────────
    let resolvedGrants = null;
    if (govType === 'secondary') {
      if (govAccessGrants === undefined || govAccessGrants === null) {
        return res.status(400).json({
          success: false,
          error: { code: 'PROVISION_GRANTS_REQUIRED', detail: 'govAccessGrants is required for secondary accounts (use {} for zero access)' },
        });
      }
      if (!isValidGrantSet(govAccessGrants)) {
        const bad = unknownGrantKeys(govAccessGrants);
        return res.status(400).json({
          success: false,
          error: { code: 'PROVISION_INVALID_GRANTS', detail: bad.length ? `unknown keys: ${bad.join(', ')}` : 'grant values must be boolean' },
        });
      }
      resolvedGrants = govAccessGrants;
    }

    // ── Password strength ───────────────────────────────────────────────────
    if (password.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return res.status(400).json({
        success: false,
        error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: 'password must be at least 8 characters with uppercase, lowercase, and digit' },
      });
    }

    // ── Build credential email ──────────────────────────────────────────────
    let emailSuffix;
    if (govLevel === 'republic') {
      emailSuffix = 'respublika';
    } else {
      const region = await Region.findByPk(govRegionId);
      emailSuffix = region.code.toLowerCase();
    }
    const baseSlug = firstName.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
    const candidateEmail = `${baseSlug}@${emailSuffix}`;

    const existingUser = await User.findOne({ where: { email: candidateEmail } });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: { code: 'PROVISION_CREDENTIAL_TAKEN', detail: `credential ${candidateEmail} is already in use; choose a different first name or contact super-admin` },
      });
    }

    // ── Create account ──────────────────────────────────────────────────────
    const government = await User.create({
      email: candidateEmail,
      password: password.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      role: 'government',
      isActive: true,
      govLevel,
      govType,
      govRegionId: govLevel === 'region' ? govRegionId : null,
      govAccessGrants: resolvedGrants,
      mustChangePassword: true,
    });

    logAudit({
      actorId: actor.id, actorRole: actor.role,
      action: 'create', entity: 'government_users', entityId: government.id,
      meta: { email: government.email, govLevel, govType, govRegionId: govRegionId || null },
    });

    logger.info('Government account provisioned', {
      governmentId: government.id, email: government.email,
      govLevel, govType, createdBy: actor.id,
    });

    return res.status(201).json({
      success: true,
      data: government.toJSON(),
    });
  } catch (error) {
    logger.error('Create government error', { error: error.message, stack: error.stack, userId: req.user?.id });
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ success: false, error: { code: 'PROVISION_CREDENTIAL_TAKEN' } });
    }
    return res.status(500).json({ success: false, error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: error.message } });
  }
};

/**
 * Get government accounts (scoped by caller's level — CP-021)
 * GET /api/government/users
 *
 * republic accounts → see all government users
 * region accounts   → see only government users in their own region
 */
export const getGovernments = async (req, res) => {
  try {
    const where = { role: 'government' };
    if (req.user.govLevel === 'region') {
      where.govRegionId = req.user.govRegionId;
    }

    const governments = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      data: governments.map(g => g.toJSON()),
      count: governments.length,
    });
  } catch (error) {
    logger.error('Get governments error', { error: error.message, stack: error.stack, userId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: 'Failed to fetch government accounts' } });
  }
};

/**
 * Update a Government account (Government only)
 * PUT /api/government/users/:id
 */
export const updateGovernmentUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, password } = req.body;

    const government = await User.findOne({ where: { id, role: 'government' } });
    if (!government) {
      return res.status(404).json({ error: 'Government user not found' });
    }

    // Region scope enforcement: mirrors deleteGovernmentUser — region accounts can only
    // update accounts within their own region.
    if (req.user.govLevel === 'region') {
      if (government.govLevel === 'republic') {
        return res.status(403).json({ success: false, error: { code: 'UPDATE_FORBIDDEN', detail: 'region accounts cannot update republic accounts' } });
      }
      if (government.govRegionId !== req.user.govRegionId) {
        return res.status(403).json({ success: false, error: { code: 'UPDATE_FORBIDDEN', detail: 'region accounts can only update accounts in their own region' } });
      }
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

    logAudit({
      actorId: req.user?.id, actorRole: req.user?.role,
      action: 'update', entity: 'government_users', entityId: government.id,
      meta: { email: government.email },
    });

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
 * Delete a Government account (hierarchical auth chain — CP-021)
 * DELETE /api/government/users/:id
 *
 * republic-main → can delete any government user EXCEPT the last republic-main
 * region-main   → can delete government users in their own region only; cannot delete republic accounts
 * secondary     → cannot delete (403 DELETE_FORBIDDEN)
 *
 * The last republic-main cannot be deleted by anyone (single super-admin invariant, Q2).
 * Orphan rule (Q5): deleted main's secondaries remain active; republic-main manages them.
 */
export const deleteGovernmentUser = async (req, res) => {
  try {
    const actor = req.user;
    const { id } = req.params;

    if (actor.govType === 'secondary') {
      return res.status(403).json({ success: false, error: { code: 'DELETE_FORBIDDEN' } });
    }

    const target = await User.findOne({ where: { id, role: 'government' } });
    if (!target) {
      return res.status(404).json({ success: false, error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: 'Government user not found' } });
    }

    if (actor.id === target.id) {
      return res.status(400).json({ success: false, error: { code: 'DELETE_FORBIDDEN', detail: 'cannot delete your own account' } });
    }

    // Block deletion of the single super-admin (last republic-main guard)
    if (target.govLevel === 'republic' && target.govType === 'main') {
      return res.status(403).json({ success: false, error: { code: 'DELETE_LAST_REPUBLIC_MAIN' } });
    }

    // Region-main scope enforcement
    if (actor.govLevel === 'region') {
      // Cannot delete republic-level accounts
      if (target.govLevel === 'republic') {
        return res.status(403).json({ success: false, error: { code: 'DELETE_FORBIDDEN', detail: 'region-main cannot delete republic accounts' } });
      }
      // Cannot delete accounts in other regions
      if (target.govRegionId !== actor.govRegionId) {
        return res.status(403).json({ success: false, error: { code: 'DELETE_FORBIDDEN', detail: 'region-main can only delete accounts in their own region' } });
      }
    }

    logAudit({
      actorId: actor.id, actorRole: actor.role,
      action: 'delete', entity: 'government_users', entityId: target.id,
      meta: { email: target.email, govLevel: target.govLevel, govType: target.govType },
    });

    await target.destroy({ actorId: actor.id, actorRole: actor.role, reason: 'gov_provision_delete' });

    return res.json({ success: true });
  } catch (error) {
    logger.error('Delete government error', { error: error.message, stack: error.stack, userId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'PROVISION_INVALID_LEVEL_TYPE', detail: 'Failed to delete government account' } });
  }
};

/**
 * Reset a government account's password (delegation chain — CP-021)
 * PUT /api/government/users/:id/reset-password
 *
 * republic-main → can reset any government account's password
 * region-main   → can reset government accounts in their own region only
 * secondary     → cannot reset (403 RESET_FORBIDDEN)
 *
 * On success: new password is hashed, mustChangePassword=true set on target,
 * target's active JTI is revoked (forces re-login with new password).
 */
export const resetGovernmentPassword = async (req, res) => {
  try {
    const actor = req.user;
    const { id } = req.params;
    const { newPassword } = req.body;

    if (actor.govType === 'secondary') {
      return res.status(403).json({ success: false, error: { code: 'RESET_FORBIDDEN' } });
    }

    if (!newPassword) {
      return res.status(400).json({ success: false, error: { code: 'RESET_FORBIDDEN', detail: 'newPassword is required' } });
    }

    if (newPassword.length < 8 || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      return res.status(400).json({
        success: false,
        error: { code: 'RESET_FORBIDDEN', detail: 'password must be at least 8 characters with uppercase, lowercase, and digit' },
      });
    }

    const target = await User.findOne({ where: { id, role: 'government' } });
    if (!target) {
      return res.status(404).json({ success: false, error: { code: 'RESET_OUT_OF_SCOPE', detail: 'Government user not found' } });
    }

    // Region-main scope enforcement
    if (actor.govLevel === 'region') {
      if (target.govLevel === 'republic') {
        return res.status(403).json({ success: false, error: { code: 'RESET_OUT_OF_SCOPE', detail: 'region-main cannot reset republic accounts' } });
      }
      if (target.govRegionId !== actor.govRegionId) {
        return res.status(403).json({ success: false, error: { code: 'RESET_OUT_OF_SCOPE', detail: 'region-main can only reset accounts in their own region' } });
      }
    }

    target.password = newPassword;
    target.mustChangePassword = true;
    await target.save();

    // Revoke the target's active token to force re-login with new password
    if (target.lastJti) {
      await revokeJti(target.lastJti, Date.now() + 15 * 60 * 1000);
    }

    logAudit({
      actorId: actor.id, actorRole: actor.role,
      action: 'reset_password', entity: 'government_users', entityId: target.id,
      meta: { govLevel: target.govLevel, govType: target.govType },
    });

    return res.json({ success: true });
  } catch (error) {
    logger.error('Reset government password error', { error: error.message, stack: error.stack, userId: req.user?.id });
    return res.status(500).json({ success: false, error: { code: 'RESET_FORBIDDEN', detail: 'Failed to reset password' } });
  }
};
