import { jest } from '@jest/globals';

// ─── Stable test UUIDs ────────────────────────────────────────────────────────
const REGION_A = '00000000-0000-0000-0000-000000000001';
const REGION_B = '00000000-0000-0000-0000-000000000002';
const SUPER_ADMIN_ID = 'super-admin-uuid';
const REGION_MAIN_A_ID = 'region-main-a-uuid';

// ─── Mocks ────────────────────────────────────────────────────────────────────
const mockUserFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockRegionFindByPk = jest.fn();
const mockRevokeJti = jest.fn();

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findAll: mockUserFindAll,
    findOne: mockUserFindOne,
    findByPk: jest.fn(),
    create: mockUserCreate,
  },
}));
jest.unstable_mockModule('../../models/Region.js', () => ({
  default: { findByPk: mockRegionFindByPk },
}));
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  revokeJti: mockRevokeJti,
  invalidateUserCache: jest.fn(),
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({
  logAudit: jest.fn(),
}));

const {
  createGovernment,
  getGovernments,
  deleteGovernmentUser,
  resetGovernmentPassword,
} = await import('../../controllers/admin/adminUserController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Actor helpers
const republicMain = (id = SUPER_ADMIN_ID) => ({ id, govLevel: 'republic', govType: 'main' });
const republicSecondary = (id = 'rep-sec-uuid') => ({ id, govLevel: 'republic', govType: 'secondary' });
const regionMainA = (id = REGION_MAIN_A_ID) => ({ id, govLevel: 'region', govType: 'main', govRegionId: REGION_A });
const regionSecondaryA = (id = 'reg-sec-a-uuid') => ({ id, govLevel: 'region', govType: 'secondary', govRegionId: REGION_A });

beforeEach(() => jest.clearAllMocks());

// ─── createGovernment ─────────────────────────────────────────────────────────

describe('createGovernment', () => {
  describe('authorization gatekeeping', () => {
    it('secondary account cannot provision → 403 PROVISION_FORBIDDEN', async () => {
      const req = { user: republicSecondary(), body: { firstName: 'X', lastName: 'Y', password: 'Pass@2026', govLevel: 'region', govType: 'main' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_FORBIDDEN' }) })
      );
    });

    it('region-secondary cannot provision → 403', async () => {
      const req = { user: regionSecondaryA(), body: { firstName: 'X', lastName: 'Y', password: 'Pass@2026', govLevel: 'region', govType: 'main' } };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('republic-main CANNOT create a second republic-main → 409 REPUBLIC_MAIN_EXISTS', async () => {
      const req = {
        user: republicMain(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'republic', govType: 'main' },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'REPUBLIC_MAIN_EXISTS' }) })
      );
    });

    // ── REVERT-TEST: republic-main guard ──────────────────────────────────────
    //
    // BUG: remove the REPUBLIC_MAIN_EXISTS check. Republic-main can create another
    // republic-main, breaking the single-super-admin invariant.
    // With bug: a second republic-main can be created (mockCreate called with govType='main').
    // With fix: 409 returned, mockCreate never called.
    //
    it('[REVERT-TEST: BUG] without republic-main guard, second super-admin creation succeeds', async () => {
      // Simulate buggy controller that skips the REPUBLIC_MAIN_EXISTS check
      const buggyCreate = async (req, res) => {
        const { govLevel, govType, govRegionId } = req.body;
        // BUG: no republic-main guard
        if (!req.body.firstName || !govLevel || !govType) return res.status(400).json({});
        if (govLevel === 'region' && !govRegionId) return res.status(400).json({});
        mockRegionFindByPk.mockResolvedValueOnce({ id: REGION_A, code: 'R01' });
        mockUserFindOne.mockResolvedValueOnce(null);
        mockUserCreate.mockResolvedValueOnce({ id: 'new', email: 'ali@respublika', toJSON: () => ({ id: 'new' }) });
        return res.status(201).json({ success: true });
      };
      const req = {
        user: republicMain(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'republic', govType: 'main' },
      };
      const res = mkRes();
      await buggyCreate(req, res);
      // With the bug, 201 is returned — a second super-admin is created
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('[REVERT-TEST: FIXED] republic-main guard blocks second super-admin → 409', async () => {
      const req = {
        user: republicMain(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'republic', govType: 'main' },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it('region-main cannot create republic-level account → 403 PROVISION_FORBIDDEN', async () => {
      const req = {
        user: regionMainA(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'republic', govType: 'secondary' },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_FORBIDDEN' }) })
      );
    });

    // ── REVERT-TEST: region-main cross-region creation ────────────────────────
    //
    // BUG: remove the PROVISION_REGION_OUT_OF_SCOPE check. Region-main can create
    // accounts in other regions, breaking the region isolation invariant.
    // With bug: region-main creates account in region B (out of scope).
    // With fix: 403 PROVISION_REGION_OUT_OF_SCOPE returned.
    //
    it('[REVERT-TEST: BUG] without region scope guard, region-main creates account in other region', async () => {
      const buggyCreate = async (req, res) => {
        // BUG: no region scope check on govRegionId
        const { govLevel, govType, govRegionId } = req.body;
        if (!req.body.firstName || !govLevel || !govType || !govRegionId) return res.status(400).json({});
        mockRegionFindByPk.mockResolvedValueOnce({ id: REGION_B, code: 'R02' });
        mockUserFindOne.mockResolvedValueOnce(null);
        mockUserCreate.mockResolvedValueOnce({ id: 'new', toJSON: () => ({}) });
        return res.status(201).json({ success: true });
      };
      const req = {
        user: regionMainA(), // actor is region A
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'main', govRegionId: REGION_B },
      };
      const res = mkRes();
      await buggyCreate(req, res);
      // With bug: account created in region B by region-A actor
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('[REVERT-TEST: FIXED] region-main creating account in other region → 403 PROVISION_REGION_OUT_OF_SCOPE', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_B, code: 'R02' });
      const req = {
        user: regionMainA(), // actor is region A
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'main', govRegionId: REGION_B },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_REGION_OUT_OF_SCOPE' }) })
      );
      expect(mockUserCreate).not.toHaveBeenCalled();
    });
  });

  describe('grant validation', () => {
    it('secondary creation without govAccessGrants → 400 PROVISION_GRANTS_REQUIRED', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_A, code: 'R01' });
      const req = {
        user: republicMain(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'secondary', govRegionId: REGION_A },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_GRANTS_REQUIRED' }) })
      );
    });

    it('grants with unknown capability key → 400 PROVISION_INVALID_GRANTS', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_A, code: 'R01' });
      const req = {
        user: republicMain(),
        body: {
          firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026',
          govLevel: 'region', govType: 'secondary', govRegionId: REGION_A,
          govAccessGrants: { canFly: true },
        },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_INVALID_GRANTS' }) })
      );
    });

    it('secondary creation with valid grants → 201, mustChangePassword=true', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_A, code: 'R01' });
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({
        id: 'sec1', email: 'ali@r01',
        toJSON: () => ({ id: 'sec1', govType: 'secondary', govAccessGrants: { canViewSchools: true } }),
      });
      const req = {
        user: republicMain(),
        body: {
          firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026',
          govLevel: 'region', govType: 'secondary', govRegionId: REGION_A,
          govAccessGrants: { canViewSchools: true },
        },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({ govType: 'secondary', govAccessGrants: { canViewSchools: true }, mustChangePassword: true })
      );
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('credential generation', () => {
    it('region account gets email = firstName@regioncode', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_A, code: 'R01' });
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ id: 'g2', email: 'ali@r01', toJSON: () => ({}) });
      const req = {
        user: republicMain(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'main', govRegionId: REGION_A },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ email: 'ali@r01' }));
    });

    it('republic-secondary account gets email = firstName@respublika', async () => {
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ id: 'g3', email: 'sarvar@respublika', toJSON: () => ({}) });
      const req = {
        user: republicMain(),
        body: {
          firstName: 'Sarvar', lastName: 'Yo', password: 'Pass@2026',
          govLevel: 'republic', govType: 'secondary',
          govAccessGrants: { canViewSchools: true },
        },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ email: 'sarvar@respublika' }));
    });

    it('409 PROVISION_CREDENTIAL_TAKEN when generated email already in use', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_A, code: 'R01' });
      mockUserFindOne.mockResolvedValue({ id: 'existing', email: 'ali@r01' });
      const req = {
        user: republicMain(),
        body: { firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026', govLevel: 'region', govType: 'main', govRegionId: REGION_A },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ error: expect.objectContaining({ code: 'PROVISION_CREDENTIAL_TAKEN' }) })
      );
    });
  });

  describe('region-main creates account in own region', () => {
    it('region-main creates region-secondary in own region → 201', async () => {
      mockRegionFindByPk.mockResolvedValue({ id: REGION_A, code: 'R01' });
      mockUserFindOne.mockResolvedValue(null);
      mockUserCreate.mockResolvedValue({ id: 'new', email: 'ali@r01', toJSON: () => ({}) });
      const req = {
        user: regionMainA(),
        body: {
          firstName: 'Ali', lastName: 'Yo', password: 'Pass@2026',
          govLevel: 'region', govType: 'secondary', govRegionId: REGION_A,
          govAccessGrants: {},
        },
      };
      const res = mkRes();
      await createGovernment(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});

// ─── getGovernments ───────────────────────────────────────────────────────────

describe('getGovernments', () => {
  it('republic account: fetches ALL government users (no region filter)', async () => {
    mockUserFindAll.mockResolvedValue([]);
    const req = { user: republicMain() };
    const res = mkRes();
    await getGovernments(req, res);
    const opts = mockUserFindAll.mock.calls[0][0];
    expect(opts.where).toEqual({ role: 'government' });
  });

  it('region account: fetches only users in own region', async () => {
    mockUserFindAll.mockResolvedValue([]);
    const req = { user: regionMainA() };
    const res = mkRes();
    await getGovernments(req, res);
    const opts = mockUserFindAll.mock.calls[0][0];
    expect(opts.where).toEqual({ role: 'government', govRegionId: REGION_A });
  });
});

// ─── deleteGovernmentUser ─────────────────────────────────────────────────────

describe('deleteGovernmentUser', () => {
  it('secondary cannot delete → 403 DELETE_FORBIDDEN', async () => {
    const req = { user: republicSecondary(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DELETE_FORBIDDEN' }) })
    );
  });

  it('republic-main cannot delete LAST republic-main → 403 DELETE_LAST_REPUBLIC_MAIN', async () => {
    mockUserFindOne.mockResolvedValue({ id: 'target', role: 'government', govLevel: 'republic', govType: 'main' });
    const req = { user: republicMain(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DELETE_LAST_REPUBLIC_MAIN' }) })
    );
  });

  // ── REVERT-TEST: delete-last-republic-main guard ─────────────────────────────
  //
  // BUG: remove the DELETE_LAST_REPUBLIC_MAIN check. Republic-main account can
  // be deleted, orphaning all region accounts with no root administrator.
  // With bug: destroy is called on the republic-main.
  // With fix: 403 returned, destroy never called.
  //
  it('[REVERT-TEST: BUG] without guard, republic-main account can be deleted', async () => {
    const destroy = jest.fn().mockResolvedValue();
    const buggyDelete = async (req, res) => {
      const target = { id: req.params.id, role: 'government', govLevel: 'republic', govType: 'main', destroy };
      if (req.user.id === target.id) return res.status(400).json({});
      // BUG: no DELETE_LAST_REPUBLIC_MAIN guard
      await target.destroy();
      return res.json({ success: true });
    };
    const req = { user: republicMain(), params: { id: 'other-super-admin' } };
    const res = mkRes();
    await buggyDelete(req, res);
    expect(destroy).toHaveBeenCalled(); // root account deleted — data loss
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('[REVERT-TEST: FIXED] delete-last-republic-main guard prevents deletion', async () => {
    mockUserFindOne.mockResolvedValue({ id: 'target', role: 'government', govLevel: 'republic', govType: 'main' });
    const req = { user: republicMain(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DELETE_LAST_REPUBLIC_MAIN' }) })
    );
  });

  it('republic-main can delete region-main → 200', async () => {
    const destroy = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'region', govType: 'main',
      govRegionId: REGION_A, email: 'target@r01', destroy,
    });
    const req = { user: republicMain(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ── REVERT-TEST: region-main cross-region delete ─────────────────────────────
  //
  // BUG: remove the govRegionId scope check. Region-main can delete accounts
  // in other regions, breaking isolation.
  // With bug: region-A main deletes region-B account successfully.
  // With fix: 403 DELETE_FORBIDDEN.
  //
  it('[REVERT-TEST: BUG] without region scope check, region-main deletes other-region account', async () => {
    const destroy = jest.fn().mockResolvedValue();
    const buggyDelete = async (req, res) => {
      const target = { id: req.params.id, role: 'government', govLevel: 'region', govType: 'main', govRegionId: REGION_B, destroy };
      if (req.user.govType === 'secondary') return res.status(403).json({});
      if (target.govLevel === 'republic' && target.govType === 'main') return res.status(403).json({});
      // BUG: no region scope check
      await target.destroy();
      return res.json({ success: true });
    };
    const req = { user: regionMainA(), params: { id: 'region-b-account' } };
    const res = mkRes();
    await buggyDelete(req, res);
    expect(destroy).toHaveBeenCalled(); // cross-region deletion succeeds
  });

  it('[REVERT-TEST: FIXED] region-main cannot delete account in other region → 403 DELETE_FORBIDDEN', async () => {
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'region', govType: 'main', govRegionId: REGION_B, email: 'x@r02',
    });
    const req = { user: regionMainA(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'DELETE_FORBIDDEN' }) })
    );
  });

  it('region-main cannot delete republic account → 403 DELETE_FORBIDDEN', async () => {
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'republic', govType: 'secondary', govRegionId: null,
    });
    const req = { user: regionMainA(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('region-main can delete account in own region → 200', async () => {
    const destroy = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'region', govType: 'secondary',
      govRegionId: REGION_A, email: 'x@r01', destroy,
    });
    const req = { user: regionMainA(), params: { id: 'target' } };
    const res = mkRes();
    await deleteGovernmentUser(req, res);
    expect(destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});

// ─── resetGovernmentPassword ──────────────────────────────────────────────────

describe('resetGovernmentPassword', () => {
  it('secondary cannot reset → 403 RESET_FORBIDDEN', async () => {
    const req = { user: republicSecondary(), params: { id: 'target' }, body: { newPassword: 'Pass@2026' } };
    const res = mkRes();
    await resetGovernmentPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RESET_FORBIDDEN' }) })
    );
  });

  it('republic-main can reset any government account → 200, mustChangePassword=true', async () => {
    const save = jest.fn().mockResolvedValue();
    const target = { id: 'target', role: 'government', govLevel: 'region', govType: 'main', govRegionId: REGION_A, save };
    mockUserFindOne.mockResolvedValue(target);
    const req = { user: republicMain(), params: { id: 'target' }, body: { newPassword: 'NewPass@2026' } };
    const res = mkRes();
    await resetGovernmentPassword(req, res);
    expect(save).toHaveBeenCalled();
    expect(target.mustChangePassword).toBe(true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  // ── REVERT-TEST: region scope on password reset ────────────────────────────
  //
  // BUG: remove the RESET_OUT_OF_SCOPE check. Region-main resets passwords for
  // accounts in other regions, breaking the delegation chain boundary.
  // With bug: region-A main resets region-B account password.
  // With fix: 403 RESET_OUT_OF_SCOPE.
  //
  it('[REVERT-TEST: BUG] without scope check, region-main resets other-region password', async () => {
    const save = jest.fn().mockResolvedValue();
    const buggyReset = async (req, res) => {
      if (req.user.govType === 'secondary') return res.status(403).json({});
      if (!req.body.newPassword) return res.status(400).json({});
      // BUG: no scope check
      const target = { id: req.params.id, role: 'government', govLevel: 'region', govType: 'main', govRegionId: REGION_B, save };
      target.mustChangePassword = true;
      await target.save();
      return res.json({ success: true });
    };
    const req = { user: regionMainA(), params: { id: 'region-b-account' }, body: { newPassword: 'Pass@2026' } };
    const res = mkRes();
    await buggyReset(req, res);
    expect(save).toHaveBeenCalled(); // cross-region reset succeeds
  });

  it('[REVERT-TEST: FIXED] region-main cannot reset other-region account → 403 RESET_OUT_OF_SCOPE', async () => {
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'region', govType: 'main', govRegionId: REGION_B,
    });
    const req = { user: regionMainA(), params: { id: 'target' }, body: { newPassword: 'NewPass@2026' } };
    const res = mkRes();
    await resetGovernmentPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RESET_OUT_OF_SCOPE' }) })
    );
  });

  it('region-main can reset own-region account → 200, mustChangePassword=true', async () => {
    const save = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'region', govType: 'secondary', govRegionId: REGION_A, save,
    });
    const req = { user: regionMainA(), params: { id: 'target' }, body: { newPassword: 'NewPass@2026' } };
    const res = mkRes();
    await resetGovernmentPassword(req, res);
    expect(save).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('region-main cannot reset republic account → 403 RESET_OUT_OF_SCOPE', async () => {
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'republic', govType: 'secondary', govRegionId: null,
    });
    const req = { user: regionMainA(), params: { id: 'target' }, body: { newPassword: 'NewPass@2026' } };
    const res = mkRes();
    await resetGovernmentPassword(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'RESET_OUT_OF_SCOPE' }) })
    );
  });

  it('reset_password appears in audit log after successful reset', async () => {
    const { logAudit } = await import('../../utils/auditLogger.js');
    const save = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({
      id: 'target', role: 'government', govLevel: 'region', govType: 'main', govRegionId: REGION_A, save,
    });
    const req = { user: republicMain(), params: { id: 'target' }, body: { newPassword: 'NewPass@2026' } };
    const res = mkRes();
    await resetGovernmentPassword(req, res);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'reset_password', entity: 'government_users' })
    );
  });
});
