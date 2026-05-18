export const requireSchoolScope = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const { role, schoolId } = req.user;

  if (role === 'government') {
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

// schoolWhere returns { schoolId } for school-scoped roles, {} for government
// (global access), or throws if the caller has no schoolId assigned yet.
// Callers must handle the thrown error — or use requireSchoolScope middleware
// as a route-level guard (which already returns 403 before this is called).
export const schoolWhere = (req) => {
  if (!req.user) return {};
  const { role, schoolId } = req.user;
  if (role === 'government') return {};
  if (!schoolId) throw new Error('schoolId not assigned — use requireSchoolScope as a route guard');
  return { schoolId };
};
