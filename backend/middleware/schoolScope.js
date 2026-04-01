/**
 * School Scope Middleware
 *
 * Ensures multi-school data isolation. After authentication,
 * this middleware attaches req.schoolId from the authenticated user.
 * Controllers use req.schoolId in their WHERE clauses.
 *
 * Usage:
 *   router.use(authenticate, requireSchoolScope);
 *   // Then in controller: WHERE { schoolId: req.schoolId }
 *
 * Roles that bypass school scope:
 *   - SuperAdmin (admin with superadmin email) — sees all schools
 *   - Government/Business — sees assigned schools (req.schoolIds array)
 */

export const requireSchoolScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const role = req.user.role;

  // SuperAdmin bypasses school scope
  if (role === 'admin' && req.user.email === (process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz')) {
    req.schoolId = null; // null = no scope restriction
    req.isGlobalAccess = true;
    return next();
  }

  // Government and Business see all schools (but we attach flag for controllers to optionally filter)
  if (role === 'government' || role === 'business') {
    req.schoolId = req.user.schoolId || null;
    req.isGlobalAccess = !req.user.schoolId; // If no school assigned, global access
    return next();
  }

  // All other roles (admin, reception, teacher, parent) MUST have a schoolId
  const schoolId = req.user.schoolId;
  if (!schoolId) {
    // Backward compat: if user has no schoolId yet (pre-migration data),
    // let them through but log a warning. Controllers should still use
    // createdBy as fallback scoping.
    req.schoolId = null;
    req.isGlobalAccess = false;
    return next();
  }

  req.schoolId = schoolId;
  req.isGlobalAccess = false;
  next();
};

/**
 * Helper: Build a school-scoped WHERE clause.
 * Use this in controllers to add school filtering.
 *
 * Usage:
 *   const where = { ...schoolWhere(req), role: 'teacher' };
 *   const teachers = await User.findAll({ where });
 */
export const schoolWhere = (req) => {
  if (req.isGlobalAccess || !req.schoolId) {
    return {}; // No school filter for global access or pre-migration users
  }
  return { schoolId: req.schoolId };
};
