import { jest } from '@jest/globals';
import { Op } from 'sequelize';

/**
 * WP1 — the teacher authorisation model had forked.
 *
 * getMedia/getMediaItem/getMeal/getActivities/getActivity and the emotional
 * monitoring reads resolved a teacher's children ONLY through users.teacherId,
 * while the write and retrieval paths (uploadMedia, proxyMediaFile, createMeal)
 * gate on isTeacherAssignedToChild, which accepts group ownership OR that legacy
 * link. Six teachers in production have a group and no legacy link: authorised
 * to upload, blind on every list.
 *
 * The invariant these tests pin: getTeacherScopedChildIds(req) admits exactly
 * the children isTeacherAssignedToChild(child, req) admits. If the two ever
 * disagree again, the last describe block fails.
 *
 * Models are mocked; the functions under test are the REAL ones.
 */

const mockGroupFindAll = jest.fn();
const mockGroupFindOne = jest.fn();
const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockChildFindAll = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: { findAll: mockChildFindAll, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findAll: mockGroupFindAll, findOne: mockGroupFindOne },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findAll: mockUserFindAll, findOne: mockUserFindOne },
}));
jest.unstable_mockModule('../models/School.js', () => ({ default: { findByPk: jest.fn() } }));

const { getTeacherScopedChildIds, isTeacherAssignedToChild } = await import('../utils/schoolValidation.js');

const TEACHER = { user: { id: 'T1', role: 'teacher', schoolId: 'S1' } };

/** Wire the DB so that `groups` belong to T1 and `parents` are legacy-linked to T1. */
const wire = ({ groups = [], parents = [], children = [] }) => {
  mockGroupFindAll.mockResolvedValue(groups.map((id) => ({ id })));
  mockUserFindAll.mockResolvedValue(parents.map((id) => ({ id })));
  mockChildFindAll.mockResolvedValue(children.map((id) => ({ id })));
};

describe('getTeacherScopedChildIds', () => {
  beforeEach(() => jest.clearAllMocks());

  it('a teacher wired ONLY via a group sees their children (the production regression)', async () => {
    wire({ groups: ['G1'], parents: [], children: ['C1', 'C2'] });
    const ids = await getTeacherScopedChildIds(TEACHER);
    expect(ids).toEqual(['C1', 'C2']);

    // and the query really did include the group branch (Op.* are symbols, so
    // read them directly — JSON.stringify silently drops them)
    const or = mockChildFindAll.mock.calls[0][0].where[Op.or];
    expect(or).toHaveLength(1);
    expect(or[0].groupId[Op.in]).toEqual(['G1']);
    expect(or[0].parentId).toBeUndefined();
  });

  it('a teacher wired ONLY via the legacy link still sees their children', async () => {
    wire({ groups: [], parents: ['P1'], children: ['C9'] });
    expect(await getTeacherScopedChildIds(TEACHER)).toEqual(['C9']);
  });

  it('queries BOTH branches when both links exist', async () => {
    wire({ groups: ['G1'], parents: ['P1'], children: ['C1'] });
    await getTeacherScopedChildIds(TEACHER);
    const or = mockChildFindAll.mock.calls[0][0].where[Op.or];
    expect(or).toHaveLength(2);
    expect(or[0].groupId[Op.in]).toEqual(['G1']);
    expect(or[1].parentId[Op.in]).toEqual(['P1']);
  });

  it('fails CLOSED with neither link — empty, and never an unscoped query', async () => {
    wire({ groups: [], parents: [], children: ['SHOULD-NOT-APPEAR'] });
    expect(await getTeacherScopedChildIds(TEACHER)).toEqual([]);
    expect(mockChildFindAll).not.toHaveBeenCalled();
  });

  it('only counts parents (role filter) on the legacy branch', async () => {
    wire({ groups: [], parents: ['P1'], children: ['C1'] });
    await getTeacherScopedChildIds(TEACHER);
    expect(mockUserFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ teacherId: 'T1', role: 'parent' }) }),
    );
  });

  it('scopes the group branch to THIS teacher, not all groups', async () => {
    wire({ groups: ['G1'], parents: [], children: ['C1'] });
    await getTeacherScopedChildIds(TEACHER);
    expect(mockGroupFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: 'T1' } }),
    );
  });

  it('returns null for non-teacher roles (their own scoping applies)', async () => {
    for (const role of ['admin', 'reception', 'government', 'parent']) {
      expect(await getTeacherScopedChildIds({ user: { id: 'X', role } })).toBeNull();
    }
    expect(await getTeacherScopedChildIds({})).toBeNull();
  });
});

describe('the list scope and the write gate must agree', () => {
  beforeEach(() => jest.clearAllMocks());

  // A teacher moved off a group but whose stale legacy link survives: BOTH
  // functions must reach the same verdict. They currently both say "allowed" —
  // that is the documented LQ-TEACHERLINK hazard, not an inconsistency.
  it('stale legacy link: list and write gate agree (both admit)', async () => {
    wire({ groups: [], parents: ['P1'], children: ['C1'] });
    const listed = await getTeacherScopedChildIds(TEACHER);

    mockGroupFindOne.mockResolvedValue(null);  // no longer in the group
    mockUserFindOne.mockResolvedValue({ id: 'P1' }); // stale legacy link remains
    const gated = await isTeacherAssignedToChild({ id: 'C1', groupId: 'G-OLD', parentId: 'P1' }, TEACHER);

    expect(listed).toContain('C1');
    expect(gated).toBe(true);
  });

  it('no group and no legacy link: list and write gate agree (both deny)', async () => {
    wire({ groups: [], parents: [], children: [] });
    const listed = await getTeacherScopedChildIds(TEACHER);

    mockGroupFindOne.mockResolvedValue(null);
    mockUserFindOne.mockResolvedValue(null);
    const gated = await isTeacherAssignedToChild({ id: 'C1', groupId: 'G1', parentId: 'P1' }, TEACHER);

    expect(listed).toEqual([]);
    expect(gated).toBe(false);
  });

  it('group-only teacher: list and write gate agree (both admit) — was the fork', async () => {
    wire({ groups: ['G1'], parents: [], children: ['C1'] });
    const listed = await getTeacherScopedChildIds(TEACHER);

    mockGroupFindOne.mockResolvedValue({ id: 'G1' });
    const gated = await isTeacherAssignedToChild({ id: 'C1', groupId: 'G1', parentId: 'P1' }, TEACHER);

    expect(listed).toContain('C1');
    expect(gated).toBe(true);
  });
});
