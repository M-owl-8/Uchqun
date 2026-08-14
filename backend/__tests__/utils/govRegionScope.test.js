// D-54 regression test — validateChildAccess ignores government region scope.
//
// Found by the rebuilt isolation suite (Campaign II P3) after the D-53 fix
// closed admin and reception: a REGION-scoped government account
// (gov.toshkent, govRegionId …0001) could still read the service plans and
// therapy usage of a child at a school in Andijon (region …0003).
//
// schoolValidation.js:27 reads
//     if (req.user.schoolId && child.schoolId !== req.user.schoolId) return null;
// Government users have no schoolId — they are scoped by govRegionId — so the
// guard is skipped entirely and every government account is admitted to every
// child. Campaign I P6 proved region scoping IS enforced on the /government/*
// endpoints; it is simply absent from the shared child-scoped path.
//
// FAIL-FIRST: fails against the pre-fix validateChildAccess.

import { jest } from '@jest/globals';

const mockChildFindByPk = jest.fn();
const mockSchoolFindByPk = jest.fn();

jest.unstable_mockModule('../../models/Child.js', () => ({ default: { findByPk: mockChildFindByPk } }));
jest.unstable_mockModule('../../models/Group.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../models/User.js', () => ({ default: { findOne: jest.fn() } }));
jest.unstable_mockModule('../../models/School.js', () => ({ default: { findByPk: mockSchoolFindByPk } }));

const { validateChildAccess } = await import('../../utils/schoolValidation.js');

const TOSHKENT = '00000000-0000-0000-0000-000000000001';
const ANDIJON = '00000000-0000-0000-0000-000000000003';
const FOREIGN_SCHOOL = 'school-in-andijon';
const CHILD = { id: 'c1', schoolId: FOREIGN_SCHOOL, parentId: 'p1' };

beforeEach(() => {
  jest.clearAllMocks();
  mockChildFindByPk.mockResolvedValue(CHILD);
  mockSchoolFindByPk.mockResolvedValue({ id: FOREIGN_SCHOOL, regionId: ANDIJON });
});

describe('D-54 — government region scope on child access', () => {
  test('a region-scoped government account is refused a child in another region', async () => {
    const req = { user: { id: 'g1', role: 'government', govLevel: 'region', govRegionId: TOSHKENT } };
    await expect(validateChildAccess('c1', req)).resolves.toBeNull();
  });

  test('a region-scoped government account is allowed a child in its OWN region', async () => {
    mockSchoolFindByPk.mockResolvedValue({ id: FOREIGN_SCHOOL, regionId: TOSHKENT });
    const req = { user: { id: 'g1', role: 'government', govLevel: 'region', govRegionId: TOSHKENT } };
    await expect(validateChildAccess('c1', req)).resolves.toEqual(CHILD);
  });

  test('a republic-level government account is allowed any child', async () => {
    const req = { user: { id: 'g2', role: 'government', govLevel: 'republic', govRegionId: null } };
    await expect(validateChildAccess('c1', req)).resolves.toEqual(CHILD);
  });

  test('a school-scoped user is still refused another school (unchanged)', async () => {
    const req = { user: { id: 'a1', role: 'admin', schoolId: 'school-in-toshkent' } };
    await expect(validateChildAccess('c1', req)).resolves.toBeNull();
  });

  test('an intake child (schoolId null) is still reachable by government', async () => {
    mockChildFindByPk.mockResolvedValue({ id: 'c2', schoolId: null, parentId: 'p1' });
    const req = { user: { id: 'g1', role: 'government', govLevel: 'region', govRegionId: TOSHKENT } };
    await expect(validateChildAccess('c2', req)).resolves.not.toBeNull();
  });
});
