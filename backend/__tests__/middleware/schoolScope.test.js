import { jest } from '@jest/globals';
import { requireSchoolScope, schoolWhere } from '../../middleware/schoolScope.js';

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('requireSchoolScope', () => {
  it('401 when no req.user', () => {
    const req = {};
    const res = mkRes();
    const next = jest.fn();
    requireSchoolScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  // #03-018: government ALWAYS gets isGlobalAccess=true regardless of schoolId
  it('government with schoolId still has global access', () => {
    const req = { user: { role: 'government', schoolId: 's1' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBe('s1');
    expect(req.isGlobalAccess).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('government without schoolId has global access', () => {
    const req = { user: { role: 'government' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBeNull();
    expect(req.isGlobalAccess).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  // #03-018: business ALWAYS gets isGlobalAccess=true regardless of schoolId
  it('business with schoolId still has global access', () => {
    const req = { user: { role: 'business', schoolId: 's2' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBe('s2');
    expect(req.isGlobalAccess).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('business without schoolId has global access', () => {
    const req = { user: { role: 'business' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.isGlobalAccess).toBe(true);
    expect(next).toHaveBeenCalled();
  });

  it('admin without schoolId is rejected with 403', () => {
    const req = { user: { role: 'admin' } };
    const res = mkRes();
    const next = jest.fn();
    requireSchoolScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('admin with schoolId is scoped', () => {
    const req = { user: { role: 'admin', schoolId: 's1' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBe('s1');
    expect(req.isGlobalAccess).toBe(false);
  });

  it('teacher without schoolId is rejected', () => {
    const req = { user: { role: 'teacher' } };
    const res = mkRes();
    const next = jest.fn();
    requireSchoolScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('parent without schoolId is rejected', () => {
    const req = { user: { role: 'parent' } };
    const res = mkRes();
    const next = jest.fn();
    requireSchoolScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});

// #03-018: schoolWhere reads from req.user directly — no requireSchoolScope dependency
describe('schoolWhere', () => {
  it('empty object when no req.user', () => {
    expect(schoolWhere({})).toEqual({});
    expect(schoolWhere({ user: null })).toEqual({});
  });

  it('empty object for government regardless of schoolId', () => {
    expect(schoolWhere({ user: { role: 'government', schoolId: null } })).toEqual({});
    expect(schoolWhere({ user: { role: 'government', schoolId: 's1' } })).toEqual({});
  });

  it('empty object for business regardless of schoolId', () => {
    expect(schoolWhere({ user: { role: 'business', schoolId: null } })).toEqual({});
  });

  it('empty object when user has no schoolId', () => {
    expect(schoolWhere({ user: { role: 'admin', schoolId: null } })).toEqual({});
  });

  it('returns schoolId filter for scoped user without requiring middleware call', () => {
    // key: req has no .schoolId or .isGlobalAccess — reads from req.user only
    expect(schoolWhere({ user: { role: 'teacher', schoolId: 's1' } })).toEqual({ schoolId: 's1' });
  });
});
