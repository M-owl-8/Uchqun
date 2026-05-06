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

  it('government with schoolId is scoped', () => {
    const req = { user: { role: 'government', schoolId: 's1' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBe('s1');
    expect(req.isGlobalAccess).toBe(false);
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

  it('business with schoolId is scoped', () => {
    const req = { user: { role: 'business', schoolId: 's2' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBe('s2');
    expect(req.isGlobalAccess).toBe(false);
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

describe('schoolWhere', () => {
  it('empty object on global access', () => {
    expect(schoolWhere({ isGlobalAccess: true })).toEqual({});
  });

  it('empty object when no schoolId', () => {
    expect(schoolWhere({ isGlobalAccess: false, schoolId: null })).toEqual({});
  });

  it('returns schoolId filter for scoped user', () => {
    expect(schoolWhere({ isGlobalAccess: false, schoolId: 's1' })).toEqual({ schoolId: 's1' });
  });
});
