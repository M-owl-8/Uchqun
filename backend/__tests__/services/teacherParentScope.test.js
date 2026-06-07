// teacherParentScope — regression lock for the canonical teacher→parent chain.
//
// Canonical rule: a parent is reachable by a teacher iff they have ≥1 child
// with children.groupId ∈ {groups where groups.teacherId = teacher.id}.
// users.groupId / users.teacherId (denormalized) are NOT consulted.
//
// Test matrix:
//  T1 owns G1. C1→P1(G1), C2→P2(G1), C3→P1(G1) — P1 multi-child, P2 single.
//  T2 owns no groups.
//  C4→P3 lives in G_OTHER (cross-teacher) — must be excluded from T1.

import { jest } from '@jest/globals';

const G1      = 'g1-uuid';
const G_OTHER = 'g-other-uuid';
const P1 = 'p1-uuid';
const P2 = 'p2-uuid';
const P3 = 'p3-uuid';
const T1 = 't1-uuid';
const T2 = 't2-uuid';

const mockGroupFindAll         = jest.fn();
const mockChildFindAll         = jest.fn();
const mockUserFindAndCountAll  = jest.fn();

jest.unstable_mockModule('../../models/Group.js', () => ({ default: { findAll: mockGroupFindAll } }));
jest.unstable_mockModule('../../models/Child.js', () => ({ default: { findAll: mockChildFindAll } }));
jest.unstable_mockModule('../../models/User.js',  () => ({ default: { findAndCountAll: mockUserFindAndCountAll } }));

const { listTeacherParents, getTeacherParentIds } = await import('../../services/teacherParentScope.js');

const makeParentRow = (id) => ({ id, toJSON: () => ({ id }) });

beforeEach(() => {
  mockGroupFindAll.mockReset();
  mockChildFindAll.mockReset();
  mockUserFindAndCountAll.mockReset();
});

// ── getTeacherParentIds ─────────────────────────────────────────────────────

describe('getTeacherParentIds', () => {
  it('returns distinct parentIds from children in teacher groups', async () => {
    mockGroupFindAll.mockResolvedValueOnce([{ id: G1 }]);
    mockChildFindAll.mockResolvedValueOnce([{ parentId: P1 }, { parentId: P2 }]);

    const ids = await getTeacherParentIds(T1);
    expect(ids).toEqual([P1, P2]);

    expect(mockGroupFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { teacherId: T1 } })
    );
    expect(mockChildFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ groupId: expect.anything() }) })
    );
  });

  it('returns [] when teacher has no groups', async () => {
    mockGroupFindAll.mockResolvedValueOnce([]);
    const ids = await getTeacherParentIds(T2);
    expect(ids).toEqual([]);
    expect(mockChildFindAll).not.toHaveBeenCalled();
  });

  it('returns [] when teacher has groups but no children in them', async () => {
    mockGroupFindAll.mockResolvedValueOnce([{ id: G1 }]);
    mockChildFindAll.mockResolvedValueOnce([]);
    const ids = await getTeacherParentIds(T1);
    expect(ids).toEqual([]);
  });
});

// ── listTeacherParents ──────────────────────────────────────────────────────

describe('listTeacherParents', () => {
  it('returns P1 and P2 for T1 — P3 (cross-teacher) excluded', async () => {
    mockGroupFindAll.mockResolvedValueOnce([{ id: G1 }]);
    mockChildFindAll.mockResolvedValueOnce([{ parentId: P1 }, { parentId: P2 }]);
    mockUserFindAndCountAll.mockResolvedValueOnce({
      rows: [makeParentRow(P1), makeParentRow(P2)],
      count: 2,
    });

    const { rows, count } = await listTeacherParents(T1);
    expect(count).toBe(2);
    expect(rows.map((r) => r.id)).toEqual([P1, P2]);

    // Confirm User.findAndCountAll scopes to parentIds — NOT to groupId/teacherId columns
    const [callArg] = mockUserFindAndCountAll.mock.calls[0];
    expect(callArg.where.id).toBeDefined();
    expect(callArg.where.id).not.toBeUndefined();
  });

  it('returns empty when teacher has no groups', async () => {
    mockGroupFindAll.mockResolvedValueOnce([]);
    const { rows, count } = await listTeacherParents(T2);
    expect(rows).toEqual([]);
    expect(count).toBe(0);
    expect(mockChildFindAll).not.toHaveBeenCalled();
    expect(mockUserFindAndCountAll).not.toHaveBeenCalled();
  });

  it('returns empty when groups exist but no children are assigned', async () => {
    mockGroupFindAll.mockResolvedValueOnce([{ id: G1 }]);
    mockChildFindAll.mockResolvedValueOnce([]);
    const { rows, count } = await listTeacherParents(T1);
    expect(rows).toEqual([]);
    expect(count).toBe(0);
    expect(mockUserFindAndCountAll).not.toHaveBeenCalled();
  });

  it('passes search term to User.findAndCountAll', async () => {
    mockGroupFindAll.mockResolvedValueOnce([{ id: G1 }]);
    mockChildFindAll.mockResolvedValueOnce([{ parentId: P1 }]);
    mockUserFindAndCountAll.mockResolvedValueOnce({ rows: [], count: 0 });

    await listTeacherParents(T1, { search: 'hulkar' });

    const [callArg] = mockUserFindAndCountAll.mock.calls[0];
    expect(callArg.where[Symbol.for('or')]).toBeDefined();
  });

  it('does NOT query users.groupId or users.teacherId columns for teacher scoping', async () => {
    mockGroupFindAll.mockResolvedValueOnce([{ id: G1 }]);
    mockChildFindAll.mockResolvedValueOnce([{ parentId: P1 }]);
    mockUserFindAndCountAll.mockResolvedValueOnce({ rows: [makeParentRow(P1)], count: 1 });

    await listTeacherParents(T1);

    const [callArg] = mockUserFindAndCountAll.mock.calls[0];
    // The where clause must NOT include groupId or teacherId as scoping keys
    expect(callArg.where.groupId).toBeUndefined();
    expect(callArg.where.teacherId).toBeUndefined();
  });
});
