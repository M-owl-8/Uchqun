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

  // Q3: business is school-scoped (least-privilege default; flip isGlobalAccess in schoolScope.js if product requires otherwise)
  it('business with schoolId is school-scoped', () => {
    const req = { user: { role: 'business', schoolId: 's2' } };
    const next = jest.fn();
    requireSchoolScope(req, mkRes(), next);
    expect(req.schoolId).toBe('s2');
    expect(req.isGlobalAccess).toBe(false);
    expect(next).toHaveBeenCalled();
  });

  it('business without schoolId is rejected with 403', () => {
    const req = { user: { role: 'business' } };
    const res = mkRes();
    const next = jest.fn();
    requireSchoolScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
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

  // Q3: business is school-scoped — schoolWhere returns { schoolId } for business users
  it('returns schoolId filter for business with schoolId (Q3)', () => {
    expect(schoolWhere({ user: { role: 'business', schoolId: 's3' } })).toEqual({ schoolId: 's3' });
  });

  it('empty object for business without schoolId (no school assigned)', () => {
    expect(schoolWhere({ user: { role: 'business', schoolId: null } })).toEqual({});
  });

  // V5-CRIT-03: schoolWhere must throw — not return {} — for non-government users
  // with no schoolId. The comment on the function already documents "throws", but
  // the implementation returned {} (global access), breaking the contract.
  it('throws for non-government user with null schoolId (V5-CRIT-03)', () => {
    expect(() => schoolWhere({ user: { role: 'admin', schoolId: null } })).toThrow();
    expect(() => schoolWhere({ user: { role: 'teacher', schoolId: null } })).toThrow();
    expect(() => schoolWhere({ user: { role: 'reception', schoolId: null } })).toThrow();
    expect(() => schoolWhere({ user: { role: 'parent', schoolId: null } })).toThrow();
    expect(() => schoolWhere({ user: { role: 'business', schoolId: null } })).toThrow();
  });

  it('business user from school A cannot read child in school B via schoolWhere', () => {
    // A business user assigned to school A should never get an empty where clause
    // (which would expose children from school B) — only gets their own schoolId.
    const whereA = schoolWhere({ user: { role: 'business', schoolId: 'school-A' } });
    const whereB = schoolWhere({ user: { role: 'business', schoolId: 'school-B' } });
    expect(whereA).toEqual({ schoolId: 'school-A' });
    expect(whereB).toEqual({ schoolId: 'school-B' });
    expect(whereA).not.toEqual(whereB);
    // Neither is empty (which would be the cross-school exposure vector)
    expect(Object.keys(whereA).length).toBeGreaterThan(0);
  });

  it('empty object when user has no schoolId', () => {
    expect(schoolWhere({ user: { role: 'admin', schoolId: null } })).toEqual({});
  });

  it('returns schoolId filter for scoped user without requiring middleware call', () => {
    // key: req has no .schoolId or .isGlobalAccess — reads from req.user only
    expect(schoolWhere({ user: { role: 'teacher', schoolId: 's1' } })).toEqual({ schoolId: 's1' });
  });
});
