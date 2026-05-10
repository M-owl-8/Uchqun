export const requireSchoolScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role, schoolId } = req.user;

  if (role === 'government' || role === 'business') {
    req.schoolId = schoolId || null;
    req.isGlobalAccess = true;
    return next();
  }

  if (!schoolId) {
    return res.status(403).json({ error: 'Account not fully configured. School assignment required.' });
  }

  req.schoolId = schoolId;
  req.isGlobalAccess = false;
  next();
};

// schoolWhere reads from req.user directly so it works with or without
// requireSchoolScope being mounted — controllers can call it safely.
export const schoolWhere = (req) => {
  if (!req.user) return {};
  const { role, schoolId } = req.user;
  if (role === 'government' || role === 'business' || !schoolId) return {};
  return { schoolId };
};
