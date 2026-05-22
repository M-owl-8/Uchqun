/**
 * Admin teacher detail endpoint tests (Admin S7 Phase 1, Commit 4)
 *
 * Covers:
 *   1. Returns teacher with groups for own-school teacher
 *   2. [REVERT-TEST isolation] teacher NOT in admin's reception chain → 404
 *   3. Nonexistent teacher → 404
 *   4. Teacher with no groups → returns empty groups array
 */
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

const ADMIN_ID = 'admin-00000000-0000-0000-0000-000000000001';
const RECEPTION_ID = 'recep-0000-0000-0000-0000-000000000001';
const TEACHER_ID = 'teach-0000-0000-0000-0000-000000000001';
const TEACHER_ID_B = 'teach-0000-0000-0000-0000-000000000002'; // cross-school teacher

const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockGroupFindAll = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findAll: mockUserFindAll,
    findOne: mockUserFindOne,
    hasMany: jest.fn(),
  },
}));

jest.unstable_mockModule('../../models/Group.js', () => ({
  default: {
    findAll: mockGroupFindAll,
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
  },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { getTeacherById } = await import('../../controllers/admin/adminTeacherController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminReq = (teacherId) => ({
  user: { id: ADMIN_ID, role: 'admin', schoolId: 'school-a' },
  params: { id: teacherId },
});

const makeTeacher = (id = TEACHER_ID) => ({
  id,
  role: 'teacher',
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@school.com',
  schoolId: 'school-a',
  createdBy: RECEPTION_ID,
  toJSON() { return { id: this.id, role: this.role, firstName: this.firstName, lastName: this.lastName }; },
});

const makeGroup = (id, name) => ({ id, name, ageRange: '3-5', capacity: 20 });

describe('getTeacherById', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── TEST 1: returns teacher with groups ───────────────────────────────────────
  it('returns teacher with groups array for own-school teacher', async () => {
    mockUserFindAll.mockResolvedValue([{ id: RECEPTION_ID }]);
    mockUserFindOne.mockResolvedValue(makeTeacher(TEACHER_ID));
    mockGroupFindAll.mockResolvedValue([
      makeGroup('g1', 'Group A'),
      makeGroup('g2', 'Group B'),
    ]);

    const res = mkRes();
    await getTeacherById(adminReq(TEACHER_ID), res);

    // Verify scope: receptionsIds used in teacher lookup
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: TEACHER_ID,
          role: 'teacher',
          createdBy: expect.objectContaining({ [Op.in]: [RECEPTION_ID] }),
        }),
      })
    );

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({
        groups: expect.arrayContaining([
          expect.objectContaining({ name: 'Group A' }),
          expect.objectContaining({ name: 'Group B' }),
        ]),
      }),
    }));
  });

  // ── TEST 2: REVERT-TEST isolation ───────────────���─────────────────────────────
  //
  // SECURITY: the school isolation is enforced via the createdBy chain.
  //   Teacher TEACHER_ID_B (school B) was created by a reception in school B,
  //   NOT by any reception under admin A.
  //
  // BUG (hypothetical): if createdBy: { [Op.in]: receptionIds } were removed,
  //   admin A could fetch teacher TEACHER_ID_B from school B by guessing their UUID.
  //
  // FIXED: User.findOne checks createdBy: { [Op.in]: receptionIds } where
  //   receptionIds only contains receptions created by admin A.
  //   Cross-school teacher → findOne returns null → 404.

  it('[REVERT-TEST isolation] teacher not in admin reception chain → 404', async () => {
    // Admin A has one reception (RECEPTION_ID)
    mockUserFindAll.mockResolvedValue([{ id: RECEPTION_ID }]);
    // Cross-school teacher TEACHER_ID_B not found under admin A's receptions
    mockUserFindOne.mockResolvedValue(null);

    const res = mkRes();
    await getTeacherById(adminReq(TEACHER_ID_B), res);

    // The lookup was attempted with the reception chain
    expect(mockUserFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: TEACHER_ID_B,
          createdBy: expect.objectContaining({ [Op.in]: [RECEPTION_ID] }),
        }),
      })
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'TEACHER_NOT_FOUND' }),
    }));
    // Groups should not have been queried for a 404
    expect(mockGroupFindAll).not.toHaveBeenCalled();
  });

  // ── TEST 3: nonexistent teacher → 404 ─────────────────��──────────────────────
  it('nonexistent teacher id → 404 TEACHER_NOT_FOUND', async () => {
    mockUserFindAll.mockResolvedValue([{ id: RECEPTION_ID }]);
    mockUserFindOne.mockResolvedValue(null);

    const res = mkRes();
    await getTeacherById(adminReq('nonexistent-id'), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'TEACHER_NOT_FOUND' }),
    }));
  });

  // ── TEST 4: teacher with no groups → empty array ────────��───────────────────��─
  it('teacher with no groups → returns empty groups array', async () => {
    mockUserFindAll.mockResolvedValue([{ id: RECEPTION_ID }]);
    mockUserFindOne.mockResolvedValue(makeTeacher(TEACHER_ID));
    mockGroupFindAll.mockResolvedValue([]); // no groups

    const res = mkRes();
    await getTeacherById(adminReq(TEACHER_ID), res);

    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ groups: [] }),
    }));
  });
});
