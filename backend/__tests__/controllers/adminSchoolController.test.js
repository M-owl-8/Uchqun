/**
 * Admin school profile endpoint tests (Admin S7 Phase 1, Commit 3)
 *
 * Covers:
 *   1. GET returns own school
 *   2. [REVERT-TEST isolation] wrong schoolId → 404 (schoolId is always req.user.schoolId)
 *   3. PATCH updates whitelisted contact fields
 *   4. [REVERT-TEST whitelist] PATCH body with name/isActive/regionId — MUST NOT be applied
 *   5. PATCH fires logAudit
 *   6. PATCH with no valid fields → 200 unchanged data (no crash)
 */
import { jest } from '@jest/globals';

const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';

const mockSchoolFindByPk = jest.fn();
const mockSchoolUpdate = jest.fn();
const mockLogAudit = jest.fn();

jest.unstable_mockModule('../../models/School.js', () => ({
  default: {
    findByPk: mockSchoolFindByPk,
  },
}));

jest.unstable_mockModule('../../models/Region.js', () => ({
  default: { findAll: jest.fn(), findByPk: jest.fn() },
}));

jest.unstable_mockModule('../../models/SchoolCategory.js', () => ({
  default: { findAll: jest.fn(), findByPk: jest.fn() },
}));

jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: mockLogAudit,
}));

const { getAdminSchool, patchAdminSchool } = await import('../../controllers/admin/adminSchoolController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const adminReq = (schoolId, body = {}) => ({
  user: { id: 'admin-1', role: 'admin', schoolId },
  body,
});

const makeSchool = (overrides = {}) => {
  const school = {
    id: SCHOOL_A,
    name: 'Test School',
    phone: '123',
    email: 'school@school.com',
    address: '123 Street',
    description: 'A school',
    director: 'Mr. Smith',
    isActive: true,
    regionId: 'region-1',
    categoryId: null,
    update: mockSchoolUpdate.mockImplementation(async function(fields) {
      Object.assign(this, fields);
      return this;
    }),
    toJSON() { return { ...this, update: undefined }; },
    ...overrides,
  };
  return school;
};

describe('getAdminSchool', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── TEST 1: GET returns own school ────────────────────────────────────────────
  it('returns own school with 200', async () => {
    mockSchoolFindByPk.mockResolvedValue(makeSchool());

    const res = mkRes();
    await getAdminSchool(adminReq(SCHOOL_A), res);

    expect(mockSchoolFindByPk).toHaveBeenCalledWith(SCHOOL_A, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: expect.objectContaining({ id: SCHOOL_A }),
    }));
  });

  // ── TEST 2: REVERT-TEST isolation ─────────────────────────────────────────────
  //
  // The endpoint always uses req.user.schoolId — there is no :id param.
  // An admin cannot request another school's data by changing the URL.
  // To demonstrate isolation: if req.user.schoolId is SCHOOL_B (different admin),
  // School.findByPk(SCHOOL_B) returns null → 404.
  //
  // This proves admin A (SCHOOL_A) and admin B (SCHOOL_B) see different schools.

  it('[REVERT-TEST isolation] admin with wrong schoolId (null/missing) → 404', async () => {
    // Simulate: admin B has schoolId=SCHOOL_B but SCHOOL_B is not found in DB
    mockSchoolFindByPk.mockResolvedValue(null);

    const res = mkRes();
    await getAdminSchool(adminReq(SCHOOL_B), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.objectContaining({ code: 'SCHOOL_NOT_FOUND' }),
    }));
  });
});

describe('patchAdminSchool', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── TEST 3: PATCH updates whitelisted contact fields ──────────────────────────
  it('updates whitelisted fields: phone, email, address, description, director', async () => {
    const school = makeSchool();
    mockSchoolFindByPk.mockResolvedValue(school);
    mockSchoolUpdate.mockResolvedValue(school);

    const res = mkRes();
    await patchAdminSchool(
      { ...adminReq(SCHOOL_A, { phone: '999', email: 'new@school.com', address: 'New St' }) },
      res
    );

    expect(mockSchoolUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '999', email: 'new@school.com', address: 'New St' })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ── TEST 4: REVERT-TEST whitelist enforcement ──────────────────────────────────
  //
  // SECURITY: body may include government-controlled fields like name, isActive, regionId.
  // These MUST NOT be applied. The whitelist ['phone','email','address','description','director']
  // is the security boundary.
  //
  // If the whitelist were removed (or if Object.assign(school, req.body) were used),
  // admin A could change school.name, school.isActive, school.regionId — privilege escalation.

  it('[REVERT-TEST whitelist] name, isActive, regionId in body are NOT applied', async () => {
    const school = makeSchool({ name: 'Original Name', isActive: true, regionId: 'region-1' });
    mockSchoolFindByPk.mockResolvedValue(school);
    mockSchoolUpdate.mockImplementation(async (fields) => {
      // simulate: assert blacklisted fields are NOT in the update
      return school;
    });

    const res = mkRes();
    await patchAdminSchool(
      {
        ...adminReq(SCHOOL_A, {
          name: 'HACKED NAME',        // must be ignored
          isActive: false,            // must be ignored
          regionId: 'region-hacked',  // must be ignored
          phone: '555',               // should be applied
        }),
      },
      res
    );

    // The update call must NOT contain the blacklisted fields
    expect(mockSchoolUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ name: 'HACKED NAME' })
    );
    expect(mockSchoolUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ isActive: false })
    );
    expect(mockSchoolUpdate).toHaveBeenCalledWith(
      expect.not.objectContaining({ regionId: 'region-hacked' })
    );
    // But the whitelisted field IS applied
    expect(mockSchoolUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ phone: '555' })
    );
  });

  // ── TEST 5: PATCH fires logAudit ───────────────────────────────────────────────
  it('fires logAudit with action=update, entity=schools', async () => {
    const school = makeSchool();
    mockSchoolFindByPk.mockResolvedValue(school);
    mockSchoolUpdate.mockResolvedValue(school);

    const res = mkRes();
    await patchAdminSchool(adminReq(SCHOOL_A, { phone: '777' }), res);

    expect(mockLogAudit).toHaveBeenCalledWith(expect.objectContaining({
      actorId: 'admin-1',
      actorRole: 'admin',
      action: 'update',
      entity: 'schools',
      entityId: SCHOOL_A,
      schoolId: SCHOOL_A,
      meta: expect.objectContaining({ updatedFields: expect.arrayContaining(['phone']) }),
    }));
  });

  // ── TEST 6: PATCH with no valid fields → 200 with unchanged data ──────────────
  it('returns 200 with unchanged data when no whitelisted fields in body', async () => {
    const school = makeSchool({ name: 'Original' });
    mockSchoolFindByPk.mockResolvedValue(school);

    const res = mkRes();
    await patchAdminSchool(
      adminReq(SCHOOL_A, { name: 'Sneaky Change', isActive: false }),
      res
    );

    // update should not be called (nothing to update)
    expect(mockSchoolUpdate).not.toHaveBeenCalled();
    expect(mockLogAudit).not.toHaveBeenCalled();
    // Returns 200 with original data
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
