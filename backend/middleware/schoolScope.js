export const requireSchoolScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role, schoolId } = req.user;

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
