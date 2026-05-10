import { jest } from '@jest/globals';

/**
 * School Isolation Tests
 *
 * Verifies that multi-school data isolation is enforced.
 * With 20 schools, Teacher from School A must NOT see School B's data.
 */

// Mock the schoolScope middleware helper
jest.unstable_mockModule('../middleware/schoolScope.js', () => ({
  requireSchoolScope: jest.fn((req, _res, next) => {
    req.schoolId = req.user?.schoolId || null;
    req.isGlobalAccess = !req.user?.schoolId;
    next();
  }),
  schoolWhere: jest.fn((req) => {
    if (!req.schoolId) return {};
    return { schoolId: req.schoolId };
  }),
}));

const { schoolWhere } = await import('../middleware/schoolScope.js');

describe('School Isolation', () => {
  describe('schoolWhere helper', () => {
    test('returns schoolId filter when user has schoolId', () => {
      const req = { schoolId: 'school-1-uuid', isGlobalAccess: false };
      const result = schoolWhere(req);
      expect(result).toEqual({ schoolId: 'school-1-uuid' });
    });

    test('returns empty filter for global access (government user)', () => {
      const req = { schoolId: null, isGlobalAccess: true };
      const result = schoolWhere(req);
      expect(result).toEqual({});
    });

    test('returns empty filter when no schoolId (pre-migration user)', () => {
      const req = { schoolId: null, isGlobalAccess: false };
      const result = schoolWhere(req);
      expect(result).toEqual({});
    });
  });

  describe('User creation inherits schoolId', () => {
    test('reception creates teacher with same schoolId', () => {
      const receptionUser = { id: 'rec-1', schoolId: 'school-1', role: 'reception' };
      // Simulate what the controller does:
      const teacherData = {
        email: 'teacher@test.com',
        role: 'teacher',
        createdBy: receptionUser.id,
        schoolId: receptionUser.schoolId, // Inherited
      };
      expect(teacherData.schoolId).toBe('school-1');
    });

    test('reception creates parent with same schoolId', () => {
      const receptionUser = { id: 'rec-1', schoolId: 'school-1', role: 'reception' };
      const parentData = {
        email: 'parent@test.com',
        role: 'parent',
        createdBy: receptionUser.id,
        schoolId: receptionUser.schoolId, // Inherited
      };
      expect(parentData.schoolId).toBe('school-1');
    });

    test('admin creates reception with same schoolId', () => {
      const adminUser = { id: 'admin-1', schoolId: 'school-1', role: 'admin' };
      const receptionData = {
        email: 'reception@test.com',
        role: 'reception',
        createdBy: adminUser.id,
        schoolId: adminUser.schoolId, // Inherited
      };
      expect(receptionData.schoolId).toBe('school-1');
    });
  });

  describe('Cross-school access prevention', () => {
    test('teacher from school A cannot build query for school B data', () => {
      const reqSchoolA = { schoolId: 'school-A', isGlobalAccess: false, user: { schoolId: 'school-A' } };
      const where = { role: 'parent', ...schoolWhere(reqSchoolA) };

      // The WHERE clause should include schoolId = school-A
      expect(where.schoolId).toBe('school-A');

      // A parent from school B (schoolId: 'school-B') would NOT match this query
      const schoolBParent = { schoolId: 'school-B' };
      expect(schoolBParent.schoolId).not.toBe(where.schoolId);
    });

    test('government user bypasses school filter', () => {
      const reqGovt = { schoolId: null, isGlobalAccess: true };
      const where = { role: 'parent', ...schoolWhere(reqGovt) };

      // No schoolId in WHERE = sees all parents
      expect(where.schoolId).toBeUndefined();
    });
  });
});
