/**
 * Group endpoint scoping tests — U-2 (RE-12 + RE-13)
 *
 * Revert-test pairs:
 *   [REVERT-TEST RE-12 update] null-schoolId group → 403 (old three-part guard skipped when null)
 *   [REVERT-TEST RE-12 delete] null-schoolId group → 403
 *   [REVERT-TEST RE-13 create] cross-school teacher → 404 (old findByPk accepted any teacher)
 *   [REVERT-TEST RE-13 update] cross-school teacher → 404
 */
import { jest } from '@jest/globals';

const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';
const GROUP_ID = 'gggg0000-0000-0000-0000-000000000001';
const TEACHER_A = 'tttt0000-0000-0000-0000-000000000001';
const TEACHER_B = 'tttt0000-0000-0000-0000-000000000002';

const mockGroupFindByPk = jest.fn();
const mockGroupCreate = jest.fn();
const mockGroupUpdate = jest.fn();
const mockGroupDestroy = jest.fn();
const mockGroupReload = jest.fn();
const mockUserFindByPk = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserFindAll = jest.fn();

jest.unstable_mockModule('../../models/Group.js', () => ({
  default: {
    findByPk: mockGroupFindByPk,
    findAndCountAll: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
    create: mockGroupCreate,
  },
}));

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findByPk: mockUserFindByPk,
    findOne: mockUserFindOne,
    findAll: mockUserFindAll.mockResolvedValue([]),
  },
}));

jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findAll: jest.fn() },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

const { createGroup, updateGroup, deleteGroup } = await import('../../controllers/groupController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const recReq = (schoolId, body = {}, params = {}) => ({
  user: { id: 'r-1', role: 'reception', schoolId },
  body,
  params,
  query: {},
});

const makeGroup = (schoolId) => ({
  id: GROUP_ID,
  schoolId,
  name: 'Group A',
  teacherId: TEACHER_A,
  update: mockGroupUpdate.mockResolvedValue(true),
  destroy: mockGroupDestroy.mockResolvedValue(true),
  reload: mockGroupReload.mockResolvedValue(true),
  toJSON: () => ({ id: GROUP_ID }),
});

const makeTeacher = (schoolId) => ({ id: TEACHER_A, role: 'teacher', schoolId });

beforeEach(() => jest.clearAllMocks());

// ─── RE-12: null-schoolId bypass closed ──────────────────────────────────────

describe('updateGroup (RE-12)', () => {
  it('[REVERT-TEST RE-12 update] null-schoolId group returns 403', async () => {
    // Pre-fix: `if (req.user.schoolId && group.schoolId && ...)` — null schoolId → false → 200
    // Post-fix: `if (!group.schoolId || ...)` — null → true → 403
    mockGroupFindByPk.mockResolvedValue(makeGroup(null));

    const req = recReq(SCHOOL_B, { name: 'Hack' }, { id: GROUP_ID });
    const res = mkRes();

    await updateGroup(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockGroupUpdate).not.toHaveBeenCalled();
  });

  it('update: own-school group succeeds', async () => {
    const group = makeGroup(SCHOOL_A);
    mockGroupFindByPk.mockResolvedValue(group);

    const req = recReq(SCHOOL_A, { name: 'Updated' }, { id: GROUP_ID });
    const res = mkRes();

    await updateGroup(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockGroupUpdate).toHaveBeenCalled();
  });
});

describe('deleteGroup (RE-12)', () => {
  it('[REVERT-TEST RE-12 delete] null-schoolId group returns 403', async () => {
    mockGroupFindByPk.mockResolvedValue(makeGroup(null));

    const req = recReq(SCHOOL_B, {}, { id: GROUP_ID });
    const res = mkRes();

    await deleteGroup(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockGroupDestroy).not.toHaveBeenCalled();
  });

  it('delete: own-school group succeeds', async () => {
    mockGroupFindByPk.mockResolvedValue(makeGroup(SCHOOL_A));

    const req = recReq(SCHOOL_A, {}, { id: GROUP_ID });
    const res = mkRes();

    await deleteGroup(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(mockGroupDestroy).toHaveBeenCalled();
  });
});

// ─── RE-13: cross-school teacher rejected ────────────────────────────────────

describe('createGroup (RE-13)', () => {
  it('[REVERT-TEST RE-13 create] cross-school teacher returns 404', async () => {
    // Pre-fix: findByPk(teacherId) — school B teacher found and accepted
    // Post-fix: findOne({ id, role, schoolId: req.user.schoolId }) — school B teacher not found → 404
    mockUserFindOne.mockResolvedValue(null); // teacher not at school A

    const req = recReq(SCHOOL_A, { name: 'G1', teacherId: TEACHER_B });
    const res = mkRes();

    await createGroup(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockGroupCreate).not.toHaveBeenCalled();
  });

  it('create: own-school teacher succeeds', async () => {
    mockUserFindOne.mockResolvedValue(makeTeacher(SCHOOL_A));
    const created = { ...makeGroup(SCHOOL_A), reload: mockGroupReload };
    mockGroupCreate.mockResolvedValue(created);

    const req = recReq(SCHOOL_A, { name: 'G1', teacherId: TEACHER_A });
    const res = mkRes();

    await createGroup(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockGroupCreate).toHaveBeenCalled();
  });
});

describe('updateGroup (RE-13)', () => {
  it('[REVERT-TEST RE-13 update] cross-school teacher returns 404', async () => {
    mockGroupFindByPk.mockResolvedValue(makeGroup(SCHOOL_A));
    mockUserFindOne.mockResolvedValue(null); // school B teacher not in school A

    const req = recReq(SCHOOL_A, { teacherId: TEACHER_B }, { id: GROUP_ID });
    const res = mkRes();

    await updateGroup(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockGroupUpdate).not.toHaveBeenCalled();
  });
});
