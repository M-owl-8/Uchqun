import { jest } from '@jest/globals';

const mockFindByPk = jest.fn();

jest.unstable_mockModule('../../models/Child.js', () => ({
  default: { findByPk: mockFindByPk },
}));

const { validateChildAccess } = await import('../../utils/schoolValidation.js');

describe('validateChildAccess', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns null when childId missing', async () => {
    expect(await validateChildAccess(null, { user: {} })).toBeNull();
    expect(await validateChildAccess(undefined, { user: {} })).toBeNull();
    expect(await validateChildAccess('', { user: {} })).toBeNull();
  });

  it('returns null when child not found', async () => {
    mockFindByPk.mockResolvedValue(null);
    const result = await validateChildAccess('c1', { user: { schoolId: 's1' } });
    expect(result).toBeNull();
  });

  it('returns child when user has no schoolId (global access)', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: 's2' });
    const result = await validateChildAccess('c1', { user: {} });
    expect(result).toEqual({ id: 'c1', schoolId: 's2' });
  });

  // Q4: intake children (schoolId=null) — access rules
  it('returns null when scoped user (admin) accesses intake child', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: null, parentId: 'p99' });
    const result = await validateChildAccess('c1', { user: { id: 'admin1', role: 'admin', schoolId: 's1' } });
    expect(result).toBeNull();
  });

  it("returns child when parent accesses their own intake child", async () => {
    const child = { id: 'c1', schoolId: null, parentId: 'parent1' };
    mockFindByPk.mockResolvedValue(child);
    const result = await validateChildAccess('c1', { user: { id: 'parent1', role: 'parent' } });
    expect(result).toEqual(child);
  });

  it('returns null when a different parent accesses an intake child', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: null, parentId: 'parent1' });
    const result = await validateChildAccess('c1', { user: { id: 'parent2', role: 'parent' } });
    expect(result).toBeNull();
  });

  it('government can access intake child', async () => {
    const child = { id: 'c1', schoolId: null, parentId: 'p1' };
    mockFindByPk.mockResolvedValue(child);
    const result = await validateChildAccess('c1', { user: { id: 'g1', role: 'government' } });
    expect(result).toEqual(child);
  });

  it('returns null when scoped user accesses child with no schoolId', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: null, parentId: 'p99' });
    const result = await validateChildAccess('c1', { user: { schoolId: 's1', id: 'u1' } });
    expect(result).toBeNull();
  });

  it('returns child when school IDs match', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: 's1' });
    const result = await validateChildAccess('c1', { user: { schoolId: 's1' } });
    expect(result).toEqual({ id: 'c1', schoolId: 's1' });
  });

  it('returns null on cross-school access', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: 'OTHER' });
    const result = await validateChildAccess('c1', { user: { schoolId: 's1' } });
    expect(result).toBeNull();
  });
});
