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

  it('returns child when child has no schoolId', async () => {
    mockFindByPk.mockResolvedValue({ id: 'c1', schoolId: null });
    const result = await validateChildAccess('c1', { user: { schoolId: 's1' } });
    expect(result).toEqual({ id: 'c1', schoolId: null });
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
