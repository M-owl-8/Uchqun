const SUPER_ADMIN_EMAIL = process.env.SUPER_ADMIN_EMAIL || 'superadmin@uchqun.uz';

export const requireSchoolScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role, email, schoolId } = req.user;

  if (role === 'admin' && email === SUPER_ADMIN_EMAIL) {
    req.schoolId = null;
    req.isGlobalAccess = true;
    return next();
  }

  if (role === 'government' || role === 'business') {
    req.schoolId = schoolId || null;
    req.isGlobalAccess = !schoolId;
    return next();
  }

  if (!schoolId) {
    return res.status(403).json({ error: 'Account not fully configured. School assignment required.' });
  }

  req.schoolId = schoolId;
  req.isGlobalAccess = false;
  next();
};

export const schoolWhere = (req) => {
  if (req.isGlobalAccess || !req.schoolId) return {};
  return { schoolId: req.schoolId };
};
