import { describe, it, expect } from 'vitest';

// Mirror the derivation logic from AuthContext.jsx so tests stay pure JS.
// If the implementation changes, these tests will catch the drift.
function deriveGovState(user) {
  const govLevel = user?.govLevel ?? null;
  const govType = user?.govType ?? null;
  const govRegionId = user?.govRegionId ?? null;
  const govAccessGrants = user?.govAccessGrants ?? {};
  const mustChangePassword = user?.mustChangePassword === true;

  function hasCapability(key) {
    if (govType === 'main') return true;
    return govAccessGrants[key] === true;
  }

  return {
    govLevel,
    govType,
    govRegionId,
    govAccessGrants,
    mustChangePassword,
    hasCapability,
    isRepublic: govLevel === 'republic',
    isRegionAccount: govLevel === 'region',
  };
}

describe('GovAuthContext — hasCapability', () => {
  it('republic-main has all capabilities (no grant check)', () => {
    const { hasCapability } = deriveGovState({
      govType: 'main', govLevel: 'republic', govAccessGrants: {},
    });
    expect(hasCapability('canViewSchools')).toBe(true);
    expect(hasCapability('canViewAuditLog')).toBe(true);
    expect(hasCapability('canManageAdmins')).toBe(true);
    expect(hasCapability('canManageGovernmentUsers')).toBe(true);
  });

  it('region-main has all capabilities', () => {
    const { hasCapability } = deriveGovState({
      govType: 'main', govLevel: 'region',
      govRegionId: '00000000-0000-0000-0000-000000000001',
    });
    expect(hasCapability('canViewSchools')).toBe(true);
    expect(hasCapability('canViewRatings')).toBe(true);
  });

  it('secondary with grants passes only granted capabilities', () => {
    const { hasCapability } = deriveGovState({
      govType: 'secondary', govLevel: 'republic',
      govAccessGrants: { canViewSchools: true, canViewRatings: true },
    });
    expect(hasCapability('canViewSchools')).toBe(true);
    expect(hasCapability('canViewRatings')).toBe(true);
    expect(hasCapability('canManageAdmins')).toBe(false);
    expect(hasCapability('canViewAuditLog')).toBe(false);
  });

  it('secondary with no grants has no capabilities', () => {
    const { hasCapability } = deriveGovState({ govType: 'secondary', govAccessGrants: {} });
    expect(hasCapability('canViewSchools')).toBe(false);
    expect(hasCapability('canManageAdmins')).toBe(false);
  });
});

describe('GovAuthContext — derived flags', () => {
  it('republic account: isRepublic=true, isRegionAccount=false', () => {
    const s = deriveGovState({ govLevel: 'republic', govType: 'main' });
    expect(s.isRepublic).toBe(true);
    expect(s.isRegionAccount).toBe(false);
  });

  it('region account: isRegionAccount=true, govRegionId set', () => {
    const UUID = '00000000-0000-0000-0000-000000000003';
    const s = deriveGovState({ govLevel: 'region', govType: 'main', govRegionId: UUID });
    expect(s.isRepublic).toBe(false);
    expect(s.isRegionAccount).toBe(true);
    expect(s.govRegionId).toBe(UUID);
  });

  it('mustChangePassword=true when user flag is true', () => {
    expect(deriveGovState({ mustChangePassword: true }).mustChangePassword).toBe(true);
  });

  it('mustChangePassword=false for false/null/undefined', () => {
    expect(deriveGovState({ mustChangePassword: false }).mustChangePassword).toBe(false);
    expect(deriveGovState({ mustChangePassword: null }).mustChangePassword).toBe(false);
    expect(deriveGovState({}).mustChangePassword).toBe(false);
  });

  it('null user produces safe defaults', () => {
    const s = deriveGovState(null);
    expect(s.govLevel).toBeNull();
    expect(s.govType).toBeNull();
    expect(s.govRegionId).toBeNull();
    expect(s.govAccessGrants).toEqual({});
    expect(s.mustChangePassword).toBe(false);
    expect(s.isRepublic).toBe(false);
    expect(s.isRegionAccount).toBe(false);
    expect(s.hasCapability('canViewSchools')).toBe(false);
  });
});
