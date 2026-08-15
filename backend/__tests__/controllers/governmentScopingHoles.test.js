/**
 * Region scoping — closing the 3 yellow holes (CP-021 Sprint C fix) + 1 closeout hole
 *
 * Hole 1: Admin mutations (POST/PUT/DELETE /admins) — no region check before mutation
 * Hole 2: Registration approve/reject — no region check on target request
 * Hole 3: Messages — no region filter on list or per-message actions
 * Hole 4 (CLOSEOUT): updateGovernmentUser — no region check; region-main could update any gov user
 * Hole 3: Messages — no region filter on list or per-message actions
 *
 * Each hole has a revert-test pair:
 *   [REVERT-TEST: BUG]   removing the guard lets out-of-region mutations through
 *   [REVERT-TEST: FIXED] the guard blocks out-of-region mutations with 404
 */
import { jest } from '@jest/globals';

const REGION_A = 'aaaaaaaa-0000-0000-0000-000000000001';
const REGION_B = 'bbbbbbbb-0000-0000-0000-000000000002';
const SCHOOL_A = 'aa000001-0000-0000-0000-000000000001';
const SCHOOL_B = 'bb000001-0000-0000-0000-000000000002';
const ADMIN_B_ID = 'bb010001-0000-0000-0000-000000000001';
const REG_REQ_ID = 'cc010001-0000-0000-0000-000000000001';
const MSG_ID = 'dd010001-0000-0000-0000-000000000001';
const SENDER_B_ID = 'ee010001-0000-0000-0000-000000000001';

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockUserFindOne = jest.fn();
const mockUserCreate = jest.fn();
const mockUserCount = jest.fn();
const mockUserFindByPk = jest.fn();
const mockSchoolFindOne = jest.fn();
const mockSchoolFindAll = jest.fn();
const mockRegReqFindByPk = jest.fn();
const mockMsgFindByPk = jest.fn();
const mockMsgCreate = jest.fn();
const mockMsgFindAndCountAll = jest.fn();
const mockUserFindAll = jest.fn();
const mockResolveEmailDomain = jest.fn().mockResolvedValue('test.uz');

jest.unstable_mockModule('../../models/User.js', () => ({
  default: {
    findOne: mockUserFindOne,
    findAll: mockUserFindAll,
    findByPk: mockUserFindByPk,
    create: mockUserCreate,
    count: mockUserCount,
    hasMany: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findOne: mockSchoolFindOne, findAll: mockSchoolFindAll },
}));
jest.unstable_mockModule('../../models/AdminRegistrationRequest.js', () => ({
  default: { findByPk: mockRegReqFindByPk, findAndCountAll: jest.fn() },
}));
jest.unstable_mockModule('../../models/GovernmentMessage.js', () => ({
  default: {
    findByPk: mockMsgFindByPk,
    create: mockMsgCreate,
    findAndCountAll: mockMsgFindAndCountAll,
    hasMany: jest.fn(),
    belongsTo: jest.fn(),
  },
}));
jest.unstable_mockModule('../../models/Region.js', () => ({
  default: { findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/auditLogger.js', () => ({ logAudit: jest.fn() }));
jest.unstable_mockModule('../../middleware/auth.js', () => ({
  revokeJti: jest.fn(),
  invalidateUserCache: jest.fn(),
}));
jest.unstable_mockModule('../../config/govCapabilities.js', () => ({
  isValidGrantSet: jest.fn().mockReturnValue(true),
  unknownGrantKeys: jest.fn().mockReturnValue([]),
  GOV_CAPABILITIES: [],
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));
jest.unstable_mockModule('../../utils/accountDomain.js', () => ({
  resolveEmailDomain: mockResolveEmailDomain,
  isValidLocalPart: jest.fn().mockReturnValue(true),
  REPUBLIC_DOMAIN: 'davlat.uz',
}));

const { updateAdmin, deleteAdmin, createAdmin, updateGovernmentUser } = await import('../../controllers/admin/adminUserController.js');
const { approveRegistrationRequest, rejectRegistrationRequest } = await import('../../controllers/adminRegistrationController.js');
const { getAllMessages, replyToMessage, markMessageRead, deleteMessage } = await import('../../controllers/governmentMessageController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const republicReq = (overrides = {}) => ({
  user: { id: 'rep1', role: 'government', govLevel: 'republic', govType: 'main' },
  isGlobalAccess: true,
  govType: 'main',
  params: {},
  body: {},
  query: {},
  ...overrides,
});

const regionAReq = (overrides = {}) => ({
  user: { id: 'reg-a', role: 'government', govLevel: 'region', govRegionId: REGION_A },
  isGlobalAccess: false,
  regionScope: REGION_A,
  govType: 'main',
  params: {},
  body: {},
  query: {},
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// HOLE 1 — Admin mutations
// ═══════════════════════════════════════════════════════════════════════════

describe('Hole 1 — Admin mutation region scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── updateAdmin ──────────────────────────────────────────────────────────

  it('updateAdmin: region-A account cannot update region-B admin (404)', async () => {
    // Admin is in region B's school
    mockUserFindOne.mockResolvedValue({ id: ADMIN_B_ID, email: 'b@x.com', schoolId: SCHOOL_B });
    // School.findOne returns null because SCHOOL_B is not in REGION_A
    mockSchoolFindOne.mockResolvedValue(null);

    const res = mkRes();
    await updateAdmin(regionAReq({ params: { id: ADMIN_B_ID }, body: { firstName: 'Hack' } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json.mock.calls[0][0].error).toMatch(/not found/i);
  });

  it('updateAdmin: region-A account CAN update region-A admin (200)', async () => {
    const save = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValueOnce({ id: 'admin-a', email: 'a@x.com', schoolId: SCHOOL_A, save, toJSON: () => ({}) });
    // School.findOne returns a match because SCHOOL_A is in REGION_A
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A });

    const res = mkRes();
    await updateAdmin(regionAReq({ params: { id: 'admin-a' }, body: { firstName: 'Valid' } }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('updateAdmin: republic account can update any admin (no school check)', async () => {
    const save = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValueOnce({ id: ADMIN_B_ID, email: 'b@x.com', schoolId: SCHOOL_B, save, toJSON: () => ({}) });

    const res = mkRes();
    await updateAdmin(republicReq({ params: { id: ADMIN_B_ID }, body: { firstName: 'Valid' } }), res);

    expect(mockSchoolFindOne).not.toHaveBeenCalled(); // no region check for republic
    expect(save).toHaveBeenCalled();
  });

  // ── deleteAdmin ──────────────────────────────────────────────────────────

  it('deleteAdmin: region-A account cannot delete region-B admin (404)', async () => {
    mockUserFindOne.mockResolvedValue({ id: ADMIN_B_ID, schoolId: SCHOOL_B });
    mockSchoolFindOne.mockResolvedValue(null); // SCHOOL_B not in REGION_A

    const res = mkRes();
    await deleteAdmin(regionAReq({ params: { id: ADMIN_B_ID }, body: {} }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deleteAdmin: admin with no schoolId → 404 for region accounts', async () => {
    // An admin with no school assigned is republic-only
    mockUserFindOne.mockResolvedValue({ id: ADMIN_B_ID, schoolId: null });

    const res = mkRes();
    await deleteAdmin(regionAReq({ params: { id: ADMIN_B_ID } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deleteAdmin: region-A account CAN delete region-A admin (200)', async () => {
    const destroy = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({ id: 'admin-a', schoolId: SCHOOL_A, destroy });
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A });
    mockUserCount.mockResolvedValue(0); // no dependents

    const res = mkRes();
    await deleteAdmin(regionAReq({ params: { id: 'admin-a' }, user: { id: 'reg-a', role: 'government' } }), res);

    expect(res.status).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalled();
  });

  // ── createAdmin ──────────────────────────────────────────────────────────

  it('createAdmin: region-A account assigning out-of-region school → 403', async () => {
    mockResolveEmailDomain.mockRejectedValueOnce({ code: 'ACCOUNT_CREATE_FORBIDDEN_CROSS_SCOPE', detail: 'school not found in your region' });

    const res = mkRes();
    await createAdmin(regionAReq({
      body: { firstName: 'A', lastName: 'B', localPart: 'a', password: 'Pass@2026', schoolId: SCHOOL_B },
    }), res);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(mockUserCreate).not.toHaveBeenCalled();
  });

  it('createAdmin: region-A account assigning own-region school → 201', async () => {
    mockResolveEmailDomain.mockResolvedValueOnce('school-a.uz');
    mockUserFindOne.mockResolvedValue(null); // no existing user
    mockUserCreate.mockResolvedValue({ id: 'new-admin', email: 'a@school-a.uz', toJSON: () => ({ id: 'new-admin' }) });

    const res = mkRes();
    await createAdmin(regionAReq({
      user: { id: 'reg-a', role: 'government' },
      body: { firstName: 'A', lastName: 'B', localPart: 'a', password: 'Pass@2026', schoolId: SCHOOL_A },
    }), res);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockUserCreate).toHaveBeenCalledWith(expect.objectContaining({ schoolId: SCHOOL_A }));
  });

  // ── REVERT-TEST: updateAdmin isolation ───────────────────────────────────
// Historical bug, documented rather than asserted (P4.6):
//   without region check, region-A can update region-B admin
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with region check, region-A cannot update region-B admin', async () => {
    mockUserFindOne.mockResolvedValue({ id: ADMIN_B_ID, email: 'b@x.com', schoolId: SCHOOL_B });
    mockSchoolFindOne.mockResolvedValue(null); // SCHOOL_B not in REGION_A

    const res = mkRes();
    await updateAdmin(regionAReq({ params: { id: ADMIN_B_ID }, body: { firstName: 'Blocked' } }), res);

    expect(res.status).toHaveBeenCalledWith(404); // blocked
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HOLE 2 — Registration approve/reject
// ═══════════════════════════════════════════════════════════════════════════

describe('Hole 2 — Registration approve/reject region scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('rejectRegistrationRequest: region-A cannot reject region-B request (404)', async () => {
    mockRegReqFindByPk.mockResolvedValue({
      id: REG_REQ_ID, schoolId: SCHOOL_B, status: 'pending',
    });
    mockSchoolFindOne.mockResolvedValue(null); // SCHOOL_B not in REGION_A

    const res = mkRes();
    await rejectRegistrationRequest(
      regionAReq({ params: { id: REG_REQ_ID }, body: { reason: 'denied' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('rejectRegistrationRequest: region-A CAN reject region-A request (200)', async () => {
    const save = jest.fn().mockResolvedValue();
    mockRegReqFindByPk.mockResolvedValue({
      id: REG_REQ_ID, schoolId: SCHOOL_A, status: 'pending', save,
      toJSON: () => ({ id: REG_REQ_ID }),
    });
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A });

    const res = mkRes();
    await rejectRegistrationRequest(
      regionAReq({ user: { id: 'reg-a', role: 'government' }, params: { id: REG_REQ_ID }, body: {} }),
      res
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('rejectRegistrationRequest: request with no schoolId → 404 for region accounts', async () => {
    mockRegReqFindByPk.mockResolvedValue({ id: REG_REQ_ID, schoolId: null, status: 'pending' });

    const res = mkRes();
    await rejectRegistrationRequest(
      regionAReq({ params: { id: REG_REQ_ID }, body: {} }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSchoolFindOne).not.toHaveBeenCalled();
  });

  it('republic: approveRegistrationRequest has no region restriction', async () => {
    const save = jest.fn().mockResolvedValue();
    mockRegReqFindByPk.mockResolvedValue({
      id: REG_REQ_ID, email: 'admin@x.com', schoolId: SCHOOL_B, status: 'pending',
      save, toJSON: () => ({ id: REG_REQ_ID }),
    });
    mockUserFindOne.mockResolvedValue(null); // no existing user
    mockUserCreate.mockResolvedValue({ id: 'new-admin', toJSON: () => ({}) });

    const res = mkRes();
    await approveRegistrationRequest(
      republicReq({
        user: { id: 'rep1', role: 'government' },
        params: { id: REG_REQ_ID },
        body: { password: 'SecurePass@1' },
      }),
      res
    );

    // No region check for republic — should proceed
    expect(mockSchoolFindOne).not.toHaveBeenCalled();
  });

  // ── REVERT-TEST: rejectRegistrationRequest isolation ─────────────────────
// Historical bug, documented rather than asserted (P4.6):
//   without region check, region-A can reject region-B request
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with region check, region-A cannot reject region-B request', async () => {
    mockRegReqFindByPk.mockResolvedValue({ id: REG_REQ_ID, schoolId: SCHOOL_B, status: 'pending' });
    mockSchoolFindOne.mockResolvedValue(null); // SCHOOL_B not in REGION_A

    const res = mkRes();
    await rejectRegistrationRequest(
      regionAReq({ params: { id: REG_REQ_ID }, body: {} }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404); // blocked
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HOLE 3 — Messages
// ═══════════════════════════════════════════════════════════════════════════

describe('Hole 3 — Message region scoping (3-hop join)', () => {
  beforeEach(() => jest.clearAllMocks());

  // ── getAllMessages list ───────────────────────────────────────────────────

  it('getAllMessages: republic sees all (School.findAll not called)', async () => {
    mockMsgFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });
    const res = mkRes();
    await getAllMessages(republicReq(), res);
    expect(mockSchoolFindAll).not.toHaveBeenCalled();
  });

  it('getAllMessages: region account calls School.findAll with own regionId', async () => {
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A }]);
    mockUserFindAll.mockResolvedValue([{ id: SENDER_B_ID }]);
    mockMsgFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const res = mkRes();
    await getAllMessages(regionAReq(), res);

    expect(mockSchoolFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { regionId: REGION_A } })
    );
  });

  it('getAllMessages: senderId IN filter contains only region-A sender IDs', async () => {
    const SENDER_A = 'aasend01-0000-0000-0000-000000000001';
    mockSchoolFindAll.mockResolvedValue([{ id: SCHOOL_A }]);
    mockUserFindAll.mockResolvedValue([{ id: SENDER_A }]);
    mockMsgFindAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    const res = mkRes();
    await getAllMessages(regionAReq(), res);

    const { Op } = await import('sequelize');
    const callArg = mockMsgFindAndCountAll.mock.calls[0][0];
    const senderFilter = callArg.where.senderId;
    expect(senderFilter).toBeDefined();
    expect(senderFilter[Op.in]).toContain(SENDER_A);
    expect(senderFilter[Op.in]).not.toContain(SENDER_B_ID);
  });

  // ── replyToMessage ───────────────────────────────────────────────────────

  it('replyToMessage: region-A cannot reply to message from region-B sender (404)', async () => {
    const parent = { id: MSG_ID, senderId: SENDER_B_ID, parentMessageId: null, subject: 'Q', isRead: false, save: jest.fn() };
    mockMsgFindByPk.mockResolvedValue(parent);
    // Sender has region-B school
    mockUserFindByPk.mockResolvedValue({ id: SENDER_B_ID, schoolId: SCHOOL_B });
    mockSchoolFindOne.mockResolvedValue(null); // SCHOOL_B not in REGION_A

    const res = mkRes();
    await replyToMessage(
      regionAReq({ user: { id: 'reg-a', role: 'government' }, params: { id: MSG_ID }, body: { reply: 'hello' } }),
      res
    );

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockMsgCreate).not.toHaveBeenCalled();
  });

  it('replyToMessage: region-A CAN reply to message from region-A sender (200)', async () => {
    const SENDER_A = 'aasend01-0000-0000-0000-000000000001';
    const save = jest.fn().mockResolvedValue();
    const parent = { id: MSG_ID, senderId: SENDER_A, parentMessageId: null, subject: 'Q', isRead: false, save };
    mockMsgFindByPk.mockResolvedValue(parent);
    mockUserFindByPk.mockResolvedValue({ id: SENDER_A, schoolId: SCHOOL_A });
    mockSchoolFindOne.mockResolvedValue({ id: SCHOOL_A });
    mockMsgCreate.mockResolvedValue({ id: 'reply-1', toJSON: () => ({}) });

    const res = mkRes();
    await replyToMessage(
      regionAReq({ user: { id: 'reg-a', role: 'government' }, params: { id: MSG_ID }, body: { reply: 'noted' } }),
      res
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(mockMsgCreate).toHaveBeenCalled();
  });

  // ── deleteMessage ─────────────────────────────────────────────────────────

  it('deleteMessage: region-A cannot delete region-B message (404)', async () => {
    const msg = { id: MSG_ID, senderId: SENDER_B_ID, parentMessageId: null };
    mockMsgFindByPk.mockResolvedValue(msg);
    mockUserFindByPk.mockResolvedValue({ id: SENDER_B_ID, schoolId: SCHOOL_B });
    mockSchoolFindOne.mockResolvedValue(null);

    const res = mkRes();
    await deleteMessage(regionAReq({ params: { id: MSG_ID } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('deleteMessage: sender with no schoolId → 404 for region accounts', async () => {
    // Government sender has no schoolId
    const msg = { id: MSG_ID, senderId: SENDER_B_ID, parentMessageId: null };
    mockMsgFindByPk.mockResolvedValue(msg);
    mockUserFindByPk.mockResolvedValue({ id: SENDER_B_ID, schoolId: null });

    const res = mkRes();
    await deleteMessage(regionAReq({ params: { id: MSG_ID } }), res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(mockSchoolFindOne).not.toHaveBeenCalled(); // short-circuits before school lookup
  });

  // ── REVERT-TEST: message region isolation ────────────────────────────────
// Historical bug, documented rather than asserted (P4.6):
//   without region check, region-A can delete region-B message
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with region check, region-A cannot delete region-B message', async () => {
    const destroy = jest.fn().mockResolvedValue();
    const msg = { id: MSG_ID, senderId: SENDER_B_ID, parentMessageId: null, destroy };
    mockMsgFindByPk.mockResolvedValue(msg);
    mockUserFindByPk.mockResolvedValue({ id: SENDER_B_ID, schoolId: SCHOOL_B });
    mockSchoolFindOne.mockResolvedValue(null); // SCHOOL_B not in REGION_A

    const res = mkRes();
    await deleteMessage(regionAReq({ params: { id: MSG_ID } }), res);

    expect(res.status).toHaveBeenCalledWith(404); // blocked
    expect(destroy).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// HOLE 4 — updateGovernmentUser missing region scope (CLOSEOUT)
// ═══════════════════════════════════════════════════════════════════════════

const GOV_REPUBLIC = 'rep00001-0000-0000-0000-000000000001';
const GOV_REGION_B = 'gov-b001-0000-0000-0000-000000000001';

describe('Hole 4 — updateGovernmentUser region scoping (CLOSEOUT)', () => {
  beforeEach(() => jest.clearAllMocks());

  it('region-A account cannot update a republic government user (403)', async () => {
    mockUserFindOne.mockResolvedValue({
      id: GOV_REPUBLIC,
      role: 'government',
      govLevel: 'republic',
      govRegionId: null,
      email: 'republic@respublika',
    });

    const res = mkRes();
    await updateGovernmentUser(
      regionAReq({ params: { id: GOV_REPUBLIC }, body: { firstName: 'Hack' } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0]).toMatchObject({ success: false, error: { code: 'UPDATE_FORBIDDEN' } });
  });

  it('region-A account cannot update region-B government user (403)', async () => {
    mockUserFindOne.mockResolvedValue({
      id: GOV_REGION_B,
      role: 'government',
      govLevel: 'region',
      govRegionId: REGION_B,
      email: 'b@region-b',
    });

    const res = mkRes();
    await updateGovernmentUser(
      regionAReq({ params: { id: GOV_REGION_B }, body: { firstName: 'Hack' } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('region-A account CAN update region-A government user (200)', async () => {
    const save = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({
      id: 'gov-a-001',
      role: 'government',
      govLevel: 'region',
      govRegionId: REGION_A,
      email: 'a@region-a',
      save,
      toJSON: () => ({}),
    });

    const res = mkRes();
    await updateGovernmentUser(
      regionAReq({ user: { id: 'reg-a', govLevel: 'region', govRegionId: REGION_A }, params: { id: 'gov-a-001' }, body: { firstName: 'Valid' } }),
      res,
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

  it('republic account can update any government user (no region check)', async () => {
    const save = jest.fn().mockResolvedValue();
    mockUserFindOne.mockResolvedValue({
      id: GOV_REGION_B,
      role: 'government',
      govLevel: 'region',
      govRegionId: REGION_B,
      email: 'b@region-b',
      save,
      toJSON: () => ({}),
    });

    const res = mkRes();
    await updateGovernmentUser(
      republicReq({ user: { id: 'rep1', govLevel: 'republic' }, params: { id: GOV_REGION_B }, body: { firstName: 'Valid' } }),
      res,
    );

    expect(res.status).not.toHaveBeenCalled();
    expect(save).toHaveBeenCalled();
  });

// Historical bug, documented rather than asserted (P4.6):
//   without region check, region-A can update republic gov user
// The former [REVERT-TEST: BUG] case here reimplemented the buggy code
// locally and asserted the bug, so it could not fail when the real
// controller regressed. The [REVERT-TEST: FIXED] case below exercises
// the real controller and is what actually guards this.

  it('[REVERT-TEST: FIXED] with region check, region-A cannot update republic gov user', async () => {
    mockUserFindOne.mockResolvedValue({
      id: GOV_REPUBLIC,
      role: 'government',
      govLevel: 'republic',
      govRegionId: null,
      email: 'republic@respublika',
    });

    const res = mkRes();
    await updateGovernmentUser(
      regionAReq({ params: { id: GOV_REPUBLIC }, body: { firstName: 'Blocked' } }),
      res,
    );

    expect(res.status).toHaveBeenCalledWith(403); // blocked
  });
});
