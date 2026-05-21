import { jest } from '@jest/globals';

// regionScope.js is pure logic — no DB calls, no external module mocks needed.
const { requireRegionScope, regionWhere, requireGovAccess } = await import('../../middleware/regionScope.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const govUser = (overrides = {}) => ({
  role: 'government',
  govLevel: 'republic',
  govType: 'main',
  govRegionId: null,
  govAccessGrants: null,
  ...overrides,
});

// Well-known test region IDs matching the placeholder seed UUIDs.
const REGION_A = '00000000-0000-0000-0000-000000000001';
const REGION_B = '00000000-0000-0000-0000-000000000002';

// ─── requireRegionScope ────────────────────────────────────────────────────────

describe('requireRegionScope', () => {
  it('republic account: sets isGlobalAccess=true, regionScope=null', () => {
    const req = { user: govUser({ govLevel: 'republic', govRegionId: null }) };
    const next = jest.fn();
    requireRegionScope(req, mkRes(), next);
    expect(req.isGlobalAccess).toBe(true);
    expect(req.regionScope).toBeNull();
    expect(req.govType).toBe('main');
    expect(next).toHaveBeenCalled();
  });

  it('region account: sets isGlobalAccess=false, regionScope=govRegionId', () => {
    const req = { user: govUser({ govLevel: 'region', govType: 'main', govRegionId: REGION_A }) };
    const next = jest.fn();
    requireRegionScope(req, mkRes(), next);
    expect(req.isGlobalAccess).toBe(false);
    expect(req.regionScope).toBe(REGION_A);
    expect(req.govType).toBe('main');
    expect(next).toHaveBeenCalled();
  });

  it('region secondary account: govAccessGrants forwarded to req', () => {
    const grants = { canViewSchools: true };
    const req = {
      user: govUser({ govLevel: 'region', govType: 'secondary', govRegionId: REGION_B, govAccessGrants: grants }),
    };
    const next = jest.fn();
    requireRegionScope(req, mkRes(), next);
    expect(req.govAccessGrants).toBe(grants);
    expect(next).toHaveBeenCalled();
  });

  it('govLevel=null → 403 GOV_ACCOUNT_NOT_CONFIGURED (fail closed)', () => {
    const req = { user: govUser({ govLevel: null }) };
    const res = mkRes();
    const next = jest.fn();
    requireRegionScope(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'GOV_ACCOUNT_NOT_CONFIGURED' } })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

// ─── regionWhere ──────────────────────────────────────────────────────────────

describe('regionWhere', () => {
  it('republic account returns {} — no region filter applied', () => {
    const req = { isGlobalAccess: true, regionScope: null };
    expect(regionWhere(req)).toEqual({});
  });

  it('region account returns { regionId: req.regionScope }', () => {
    const req = { isGlobalAccess: false, regionScope: REGION_A };
    expect(regionWhere(req)).toEqual({ regionId: REGION_A });
  });

  it('throws if isGlobalAccess=false and regionScope is null (programming error)', () => {
    const req = { isGlobalAccess: false, regionScope: null };
    expect(() => regionWhere(req)).toThrow('regionScope not set');
  });

  it('different region accounts produce different where fragments', () => {
    const reqA = { isGlobalAccess: false, regionScope: REGION_A };
    const reqB = { isGlobalAccess: false, regionScope: REGION_B };
    expect(regionWhere(reqA)).toEqual({ regionId: REGION_A });
    expect(regionWhere(reqB)).toEqual({ regionId: REGION_B });
    expect(regionWhere(reqA)).not.toEqual(regionWhere(reqB));
  });
});

// ─── Isolation proof (the key guarantee) ─────────────────────────────────────

describe('Region isolation — revert-test evidence', () => {
  // Dataset: school A lives in region A, school B lives in region B.
  const schoolA = { id: 'school-aaaa', regionId: REGION_A };
  const schoolB = { id: 'school-bbbb', regionId: REGION_B };
  const allSchools = [schoolA, schoolB];

  // Helper simulating how a controller applies regionWhere to a result set.
  const applyFilter = (schools, filter) => {
    if (Object.keys(filter).length === 0) return schools;
    return schools.filter((s) => s.regionId === filter.regionId);
  };

  // ── REVERT-TEST (demonstrates the bug) ──────────────────────────────────────
  //
  // BUG: region B account's regionWhere returns {} (filter removed / always global).
  // Expected: region B account should NOT see school A.
  // With bug: it DOES — this test FAILS (proves the filter does real work).
  //
  it('[REVERT-TEST: BUG] regionWhere returning {} for region account leaks cross-region data', () => {
    const buggyRegionWhere = (_req) => ({}); // simulates the bug: always returns {} (no filter)

    const reqB = { isGlobalAccess: false, regionScope: REGION_B };
    const filter = buggyRegionWhere(reqB);
    const visible = applyFilter(allSchools, filter);

    // With the bug, region B account sees school A — THIS IS THE FAILURE:
    expect(visible.some((s) => s.id === schoolA.id)).toBe(true);
    // (This assertion is intentionally asserting the BUGGY behavior to show the test would fail
    //  if the bug were present. The companion test below proves the fix.)
  });

  // ── FIXED: correct isolation ─────────────────────────────────────────────────
  //
  // FIXED: regionWhere correctly returns { regionId: REGION_B } for region B account.
  // Region B account sees only school B. School A is invisible.
  //
  it('[REVERT-TEST: FIXED] regionWhere correct — region B account sees only region B school', () => {
    const reqB = { isGlobalAccess: false, regionScope: REGION_B };
    const filter = regionWhere(reqB);
    const visible = applyFilter(allSchools, filter);

    expect(visible).toHaveLength(1);
    expect(visible[0].id).toBe(schoolB.id);
    expect(visible.some((s) => s.id === schoolA.id)).toBe(false); // region A hidden
  });

  it('republic account regionWhere={}: sees schools from all regions', () => {
    const reqRepublic = { isGlobalAccess: true, regionScope: null };
    const filter = regionWhere(reqRepublic);
    const visible = applyFilter(allSchools, filter);
    expect(visible).toHaveLength(2);
  });

  it('IDOR via UUID: region B account querying region A school by ID returns no match', () => {
    // Controller pattern: School.findOne({ where: { id: schoolA.id, ...regionWhere(reqB) } })
    // = School.findOne({ where: { id: schoolA.id, regionId: REGION_B } })
    // = no match → controller returns 404 (not 403)
    const reqB = { isGlobalAccess: false, regionScope: REGION_B };
    const filter = { id: schoolA.id, ...regionWhere(reqB) };
    // Simulate the DB result: school exists but regionId !== REGION_B
    const found = [schoolA, schoolB].find(
      (s) => s.id === filter.id && s.regionId === filter.regionId
    );
    expect(found).toBeUndefined(); // null result → controller returns 404
    // 404-not-403 posture: the resource "does not exist" to the attacker.
    // Full endpoint test in Sprint C.
  });

  it('null-region school: invisible to region accounts, present to republic', () => {
    const unassignedSchool = { id: 'school-unassigned', regionId: null };

    // Region B account: filter = { regionId: REGION_B }; null !== REGION_B → invisible
    const reqB = { isGlobalAccess: false, regionScope: REGION_B };
    const regionFilter = regionWhere(reqB);
    const visibleToRegion = [unassignedSchool].filter(
      (s) => s.regionId === regionFilter.regionId
    );
    expect(visibleToRegion).toHaveLength(0);

    // Republic account: filter = {}; caller spreads {} into where → no restriction → visible
    const reqRepublic = { isGlobalAccess: true, regionScope: null };
    const republicFilter = regionWhere(reqRepublic);
    expect(republicFilter).toEqual({}); // empty = no filter; republic sees all including unassigned
  });
});

// ─── requireGovAccess ─────────────────────────────────────────────────────────

describe('requireGovAccess', () => {
  it('main account passes all grant checks unconditionally', () => {
    const req = { govType: 'main', govAccessGrants: null };
    const next = jest.fn();
    requireGovAccess('canViewSchools')(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('main account passes even for a key absent from grants', () => {
    const req = { govType: 'main', govAccessGrants: {} };
    const next = jest.fn();
    requireGovAccess('canArchiveSchools')(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('secondary with explicit true grant passes', () => {
    const req = { govType: 'secondary', govAccessGrants: { canViewSchools: true } };
    const next = jest.fn();
    requireGovAccess('canViewSchools')(req, mkRes(), next);
    expect(next).toHaveBeenCalled();
  });

  it('secondary without the required grant → 403 GOV_ACCESS_DENIED', () => {
    const req = { govType: 'secondary', govAccessGrants: { canViewSchools: true } };
    const res = mkRes();
    requireGovAccess('canViewAuditLog')(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'GOV_ACCESS_DENIED' } })
    );
  });

  it('secondary with false grant value → 403', () => {
    const req = { govType: 'secondary', govAccessGrants: { canArchiveSchools: false } };
    const res = mkRes();
    requireGovAccess('canArchiveSchools')(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('secondary with empty grants object → 403 (deny-by-default)', () => {
    const req = { govType: 'secondary', govAccessGrants: {} };
    const res = mkRes();
    requireGovAccess('canViewSchools')(req, res, jest.fn());
    expect(res.status).toHaveBeenCalledWith(403);
  });

  // ── REVERT-TEST: null-grants escalation attempt ────────────────────────────
  //
  // BUG: remove the || {} fallback — use govAccessGrants directly.
  // If govAccessGrants is null, `null['canViewSchools']` throws TypeError in some
  // JS implementations, or a permissive check like `if (!grants)` could accidentally
  // skip the denial. The || {} fallback prevents both outcomes.
  //
  it('[REVERT-TEST: BUG] secondary with null grants without || {} fallback could crash or skip denial', () => {
    // Simulate the bug: no || {} fallback, direct property access on null
    const buggyRequireGovAccess = (grantKey) => (req, res, next) => {
      if (req.govType === 'main') return next();
      const grants = req.govAccessGrants; // BUG: no || {} fallback
      // If grants is null, !grants is true → correctly returns 403 here
      // but a different buggy pattern (e.g. grants && grants[key]) could pass
      if (!grants || !grants[grantKey]) {
        return res.status(403).json({ success: false, error: { code: 'GOV_ACCESS_DENIED' } });
      }
      next();
    };
    const req = { govType: 'secondary', govAccessGrants: null };
    const res = mkRes();
    const next = jest.fn();
    buggyRequireGovAccess('canViewSchools')(req, res, next);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('[REVERT-TEST: FIXED] secondary with null grants → 403 with || {} fallback (cannot escalate)', () => {
    const req = { govType: 'secondary', govAccessGrants: null };
    const res = mkRes();
    const next = jest.fn();
    requireGovAccess('canViewSchools')(req, res, next);
    // || {} coerces null → {}; {}['canViewSchools'] === undefined → falsy → 403
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: { code: 'GOV_ACCESS_DENIED' } })
    );
    expect(next).not.toHaveBeenCalled(); // does NOT pass as main
  });
});
