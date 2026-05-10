import { jest } from '@jest/globals';

// No mocks — testing the real implementation
const { requireSchoolScope, schoolWhere } = await import('../middleware/schoolScope.js');

const mkNext = () => jest.fn();
const mkRes = () => {
  const r = {};
  r.status = jest.fn().mockReturnValue(r);
  r.json = jest.fn().mockReturnValue(r);
  return r;
};

describe('#03-018 schoolScope middleware', () => {
  describe('requireSchoolScope', () => {
    it('401 when no req.user', () => {
      const req = { user: null };
      const res = mkRes();
      requireSchoolScope(req, res, mkNext());
      expect(res.status).toHaveBeenCalledWith(401);
    });

    it('sets isGlobalAccess=true for government (not false)', () => {
      const next = mkNext();
      const req = { user: { role: 'government', schoolId: null } };
      requireSchoolScope(req, mkRes(), next);
      expect(next).toHaveBeenCalled();
      expect(req.isGlobalAccess).toBe(true);
    });

    it('sets isGlobalAccess=true for business', () => {
      const next = mkNext();
      const req = { user: { role: 'business', schoolId: 'school-1' } };
      requireSchoolScope(req, mkRes(), next);
      expect(next).toHaveBeenCalled();
      expect(req.isGlobalAccess).toBe(true);
    });

    it('403 when non-global user has no schoolId', () => {
      const req = { user: { role: 'admin', schoolId: null } };
      const res = mkRes();
      requireSchoolScope(req, res, mkNext());
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('sets schoolId and isGlobalAccess=false for scoped user', () => {
      const next = mkNext();
      const req = { user: { role: 'admin', schoolId: 'school-1' } };
      requireSchoolScope(req, mkRes(), next);
      expect(next).toHaveBeenCalled();
      expect(req.schoolId).toBe('school-1');
      expect(req.isGlobalAccess).toBe(false);
    });
  });

  describe('schoolWhere — reads req.user directly (no middleware dependency)', () => {
    it('returns {} when no req.user', () => {
      expect(schoolWhere({ user: null })).toEqual({});
      expect(schoolWhere({})).toEqual({});
    });

    it('returns {} for government regardless of schoolId', () => {
      expect(schoolWhere({ user: { role: 'government', schoolId: null } })).toEqual({});
      expect(schoolWhere({ user: { role: 'government', schoolId: 'school-1' } })).toEqual({});
    });

    it('returns {} for business regardless of schoolId', () => {
      expect(schoolWhere({ user: { role: 'business', schoolId: null } })).toEqual({});
    });

    it('returns {} when user has no schoolId', () => {
      expect(schoolWhere({ user: { role: 'admin', schoolId: null } })).toEqual({});
    });

    it('returns { schoolId } for scoped user without requireSchoolScope being called', () => {
      // key test: req has no .schoolId set by middleware, only req.user
      const req = { user: { role: 'teacher', schoolId: 'school-abc' } };
      expect(schoolWhere(req)).toEqual({ schoolId: 'school-abc' });
    });
  });
});
