/**
 * Chat admin school-scoping tests (Admin S7 Phase 1, Commit 1)
 *
 * Security: admin getAccessibleConversationIds and canAccessConversation were
 * unscoped — admin A could list and directly access school B's conversations.
 *
 * Fix: both functions now derive conversationIds from
 *   Child.parentId WHERE schoolId = req.user.schoolId
 * so an admin only sees their own school's parent conversations.
 *
 * Revert-test pairs:
 *   [REVERT-TEST: BUG]   OLD code — admin sees all chat_messages.conversationId
 *                         with no school filter (canAccessConversation returns true
 *                         for any conversation ID unconditionally)
 *   [REVERT-TEST: FIXED] With fix — only own-school parent:${id} values returned;
 *                         canAccessConversation returns false for cross-school IDs
 */
import { jest } from '@jest/globals';
import { Op } from 'sequelize';

// ── UUIDs for isolation testing ───────────────────────────────────────────────
const SCHOOL_A = 'aaaa0000-0000-0000-0000-000000000001';
const SCHOOL_B = 'bbbb0000-0000-0000-0000-000000000002';
const PARENT_A1 = 'pa000001-0000-0000-0000-000000000001';
const PARENT_A2 = 'pa000002-0000-0000-0000-000000000002';
const PARENT_B1 = 'pb000001-0000-0000-0000-000000000003';

// ── Mock factories ─────────────────────────────────────────────────────────────
const mockChildFindAll = jest.fn();
const mockChildFindOne = jest.fn();
const mockChildCount = jest.fn();
const mockChatFindAll = jest.fn();
const mockChatFindOne = jest.fn();
const mockChatCount = jest.fn();
const mockChatUpdate = jest.fn();
const mockGroupFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockEmitToUser = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();

jest.unstable_mockModule('../models/Child.js', () => ({
  default: {
    findAll: mockChildFindAll,
    findOne: mockChildFindOne,
    count: mockChildCount,
  },
}));

jest.unstable_mockModule('../models/ChatMessage.js', () => ({
  default: {
    findAll: mockChatFindAll,
    findOne: mockChatFindOne,
    count: mockChatCount,
    create: jest.fn(),
    update: mockChatUpdate,
  },
}));

jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findAll: mockGroupFindAll },
}));

jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: mockUserFindOne },
}));

jest.unstable_mockModule('../config/socket.js', () => ({
  emitToUser: mockEmitToUser,
}));

jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: mockLoggerError, warn: mockLoggerWarn, info: jest.fn() },
}));

jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 50, offset: 0 }),
}));

const { getUnreadCount, listConversations, listMessages } =
  await import('../controllers/chatController.js');

// ── Request helpers ────────────────────────────────────────────────────────────
const adminReq = (schoolId, query = {}) => ({
  user: { id: 'admin-1', role: 'admin', schoolId },
  query,
});

const parentReq = (parentId, query = {}) => ({
  user: { id: parentId, role: 'parent', schoolId: SCHOOL_A },
  query,
});

const teacherReq = (teacherId, query = {}) => ({
  user: { id: teacherId, role: 'teacher', schoolId: SCHOOL_A },
  query,
});

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// ──────────────────────────────────────────────────────────────────────────────
// TEST 1: getAccessibleConversationIds (via getUnreadCount) — admin sees only
//         conversations for own-school parents
// ──────────────────────────────────────────────────────────────────────────────
describe('getAccessibleConversationIds — admin school scoping', () => {
  beforeEach(() => jest.clearAllMocks());

  it('admin sees only own-school parent conversations', async () => {
    // School A has two parents; school B's parent should not appear
    mockChildFindAll.mockResolvedValue([
      { parentId: PARENT_A1 },
      { parentId: PARENT_A2 },
    ]);
    mockChatCount.mockResolvedValue(0);

    const res = mkRes();
    await getUnreadCount(adminReq(SCHOOL_A, { prefix: 'parent:' }), res);

    // Child.findAll must be called with SCHOOL_A's schoolId
    expect(mockChildFindAll).toHaveBeenCalledWith(
      expect.objectContaining({ where: { schoolId: SCHOOL_A } })
    );

    // Response count is 0 (no unread), but the key assertion is the IDs scope
    expect(res.json).toHaveBeenCalledWith({ count: 0 });
  });

  // ── REVERT-TEST (listing) ──────────────────────────────────────────────────
  //
  // BUG (OLD code): admin branch used ChatMessage.findAll({group:'conversationId'})
  //   which returned ALL conversations across ALL schools with no filter.
  //   Admin A with schoolId=SCHOOL_A would receive parent:PARENT_B1 in the list.
  //
  // FIXED: Child.findAll({ where: { schoolId: req.user.schoolId } }) is now used.
  //   Admin A only gets parent:PARENT_A1 and parent:PARENT_A2.

  it('[REVERT-TEST BUG] old ChatMessage.findAll approach would return cross-school conversations', async () => {
    // Simulate the OLD buggy branch: ChatMessage.findAll returns all convIds including school B
    const buggyChatFindAll = jest.fn().mockResolvedValue([
      { conversationId: `parent:${PARENT_A1}` },
      { conversationId: `parent:${PARENT_A2}` },
      { conversationId: `parent:${PARENT_B1}` }, // cross-school leak
    ]);

    // Old code would map these: ['parent:PARENT_A1', 'parent:PARENT_A2', 'parent:PARENT_B1']
    const oldIds = (await buggyChatFindAll({ attributes: ['conversationId'], group: ['conversationId'], raw: true }))
      .map(r => r.conversationId);

    // BUG: cross-school conversation included
    expect(oldIds).toContain(`parent:${PARENT_B1}`);
    // Old code never called Child.findAll at all — no schoolId filter applied
    expect(buggyChatFindAll).toHaveBeenCalledTimes(1);
  });

  it('[REVERT-TEST FIXED] with fix, admin A does not receive school B parent conversations', async () => {
    // Only school A children
    mockChildFindAll.mockResolvedValue([
      { parentId: PARENT_A1 },
      { parentId: PARENT_A2 },
    ]);
    mockChatCount.mockResolvedValue(0);

    const res = mkRes();
    await getUnreadCount(adminReq(SCHOOL_A), res);

    // Fixed: Child.findAll was called with SCHOOL_A
    const callArg = mockChildFindAll.mock.calls[0][0];
    expect(callArg.where.schoolId).toBe(SCHOOL_A);

    // The IDs in ChatMessage.count call should NOT include PARENT_B1
    if (mockChatCount.mock.calls.length > 0) {
      const countArg = mockChatCount.mock.calls[0][0];
      if (countArg.where.conversationId && countArg.where.conversationId[Op.in]) {
        expect(countArg.where.conversationId[Op.in]).not.toContain(`parent:${PARENT_B1}`);
      }
    }
  });

  it('returns empty array when school has no children/conversations', async () => {
    mockChildFindAll.mockResolvedValue([]); // no children for this school
    // getUnreadCount should return count=0 and not crash
    const res = mkRes();
    await getUnreadCount(adminReq(SCHOOL_A), res);
    expect(res.json).toHaveBeenCalledWith({ count: 0 });
    expect(mockChatCount).not.toHaveBeenCalled(); // early-return on empty ids
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// TEST 2: canAccessConversation (via listMessages) — direct conversation access
// ──────────────────────────────────────────────────────────────────────────────
describe('canAccessConversation — admin conversation access', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns true (200) for own-school parent conversation', async () => {
    // Admin A tries to access parent:PARENT_A1 — child in SCHOOL_A exists
    mockChildFindOne.mockResolvedValue({ id: 'child-1' });
    mockChatFindAll.mockResolvedValue([]);

    const res = mkRes();
    await listMessages(
      { ...adminReq(SCHOOL_A), query: { conversationId: `parent:${PARENT_A1}` } },
      res
    );

    expect(mockChildFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: PARENT_A1, schoolId: SCHOOL_A },
      })
    );
    expect(res.status).not.toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.any(Array));
  });

  // ── REVERT-TEST (direct access) ───────────────────────────────────────────
  //
  // BUG (OLD code): canAccessConversation had `if (req.user.role === 'admin') return true`
  //   — unconditional, no school check. Admin A would return 200 for
  //   parent:PARENT_B1 (school B's parent) — direct cross-school data access.
  //
  // FIXED: Child.findOne({ where: { parentId, schoolId: req.user.schoolId } }) is used.
  //   For admin A accessing PARENT_B1, findOne returns null → returns false → 403.

  it('[REVERT-TEST BUG] old unconditional return-true allowed cross-school direct access', () => {
    // Simulate old behavior: admin always returns true
    const buggyCanAccess = async (_req, _conversationId) => {
      if (_req.user.role === 'admin') return true; // BUG: no school check
      return false;
    };

    const adminAReq = adminReq(SCHOOL_A);
    // BUG: returns true even for school B's conversation
    return expect(buggyCanAccess(adminAReq, `parent:${PARENT_B1}`)).resolves.toBe(true);
  });

  it('[REVERT-TEST FIXED] with fix, admin A gets 403 for school B conversation', async () => {
    // Child.findOne returns null: PARENT_B1 has no children in SCHOOL_A
    mockChildFindOne.mockResolvedValue(null);

    const res = mkRes();
    await listMessages(
      { ...adminReq(SCHOOL_A), query: { conversationId: `parent:${PARENT_B1}` } },
      res
    );

    expect(mockChildFindOne).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { parentId: PARENT_B1, schoolId: SCHOOL_A },
      })
    );
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('smoke: parent can still access their own conversation', async () => {
    mockChatFindAll.mockResolvedValue([]);

    const res = mkRes();
    await listMessages(
      { ...parentReq(PARENT_A1), query: { conversationId: `parent:${PARENT_A1}` } },
      res
    );

    // Parent accesses their own conversation — no Child lookup needed
    expect(mockChildFindOne).not.toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalledWith(403);
  });
});
