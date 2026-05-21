import { jest } from '@jest/globals';
import { GOV_CAPABILITIES, isValidGrantSet, unknownGrantKeys } from '../../config/govCapabilities.js';
import { requireGovAccess } from '../../middleware/regionScope.js';

// ─── GOV_CAPABILITIES ────────────────────────────────────────────────────────

describe('GOV_CAPABILITIES', () => {
  it('is a non-empty array of strings', () => {
    expect(Array.isArray(GOV_CAPABILITIES)).toBe(true);
    expect(GOV_CAPABILITIES.length).toBeGreaterThan(0);
    GOV_CAPABILITIES.forEach((k) => expect(typeof k).toBe('string'));
  });

  it('contains the expected Sprint B baseline keys (design doc §1.4 names)', () => {
    const expected = [
      'canViewSchools', 'canArchiveSchools', 'canViewRatings', 'canViewAuditLog',
      'canViewStudents', 'canViewTeachers', 'canViewParents',
      'canManageAdmins', 'canManageGovernmentUsers', 'canViewMessages', 'canManageRegistrations',
    ];
    expected.forEach((k) => expect(GOV_CAPABILITIES).toContain(k));
  });

  it('has no duplicate keys', () => {
    expect(new Set(GOV_CAPABILITIES).size).toBe(GOV_CAPABILITIES.length);
  });
});

// ─── isValidGrantSet ──────────────────────────────────────────────────────────

describe('isValidGrantSet', () => {
  it('empty object {} is valid (zero access, deny-by-default)', () => {
    expect(isValidGrantSet({})).toBe(true);
  });

  it('all-known keys with boolean values passes', () => {
    expect(isValidGrantSet({ canViewSchools: true, canArchiveSchools: false })).toBe(true);
  });

  it('unknown key fails', () => {
    expect(isValidGrantSet({ viewSchools: true, canFly: true })).toBe(false);
  });

  it('non-boolean value fails', () => {
    expect(isValidGrantSet({ viewSchools: 'yes' })).toBe(false);
    expect(isValidGrantSet({ viewSchools: 1 })).toBe(false);
    expect(isValidGrantSet({ viewSchools: null })).toBe(false);
  });

  it('null is rejected (null is reserved for main accounts, never passed here)', () => {
    expect(isValidGrantSet(null)).toBe(false);
  });

  it('array is rejected', () => {
    expect(isValidGrantSet([])).toBe(false);
  });
});

// ─── unknownGrantKeys ─────────────────────────────────────────────────────────

describe('unknownGrantKeys', () => {
  it('returns empty array for known keys', () => {
    expect(unknownGrantKeys({ canViewSchools: true })).toEqual([]);
  });

  it('returns unknown keys', () => {
    expect(unknownGrantKeys({ viewSchools: true, canFly: true, canTeleport: false }))
      .toEqual(expect.arrayContaining(['canFly', 'canTeleport']));
  });
});

// ─── requireGovAccess — capability guard ──────────────────────────────────────

describe('requireGovAccess — capability guard', () => {
  it('throws at route-definition time for an unknown capability key', () => {
    expect(() => requireGovAccess('canFly')).toThrow(/unknown capability key.*canFly/);
  });

  it('does NOT throw for a known key', () => {
    expect(() => requireGovAccess('canViewSchools')).not.toThrow();
  });

  it('main account passes any known key unconditionally', () => {
    const mw = requireGovAccess('canViewSchools');
    const req = { govType: 'main', govAccessGrants: null };
    const next = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('secondary with grant=true passes', () => {
    const mw = requireGovAccess('canArchiveSchools');
    const req = { govType: 'secondary', govAccessGrants: { canArchiveSchools: true } };
    const next = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    mw(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('secondary without the grant is denied → 403 GOV_ACCESS_DENIED', () => {
    const mw = requireGovAccess('canViewAuditLog');
    const req = { govType: 'secondary', govAccessGrants: { canViewSchools: true } };
    const next = jest.fn();
    const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() };
    mw(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'GOV_ACCESS_DENIED' } })
    );
    expect(next).not.toHaveBeenCalled();
  });
});
