import { jest } from '@jest/globals';

const mockChatFindAll = jest.fn();
const mockChildCount = jest.fn();
const mockGroupFindAll = jest.fn();
const mockUserFindOne = jest.fn();
const mockGetTeacherParentIds = jest.fn();

jest.unstable_mockModule('../models/ChatMessage.js', () => ({
  default: { findAll: mockChatFindAll, create: jest.fn(), findByPk: jest.fn() },
}));
jest.unstable_mockModule('../models/Child.js', () => ({
  default: { count: mockChildCount, findAll: jest.fn().mockResolvedValue([]) },
}));
jest.unstable_mockModule('../models/Group.js', () => ({
  default: { findAll: mockGroupFindAll },
}));
jest.unstable_mockModule('../models/User.js', () => ({
  default: { findOne: mockUserFindOne, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../services/teacherParentScope.js', () => ({
  getTeacherParentIds: mockGetTeacherParentIds,
  getTeacherGroupIds: jest.fn().mockResolvedValue([]),
  listTeacherParents: jest.fn().mockResolvedValue({ rows: [], count: 0 }),
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../utils/pagination.js', () => ({
  parsePagination: () => ({ limit: 50, offset: 0 }),
}));
jest.unstable_mockModule('../config/socket.js', () => ({
  emitToUser: jest.fn(),
}));

const { listMessages } = await import('../controllers/chatController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('chatController.listMessages — canAccessConversation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('400 when conversationId missing', async () => {
    const req = { user: { id: 'u', role: 'parent' }, query: {} };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('parent can access only their own conversation', async () => {
    const req = { user: { id: 'p1', role: 'parent' }, query: { conversationId: 'parent:p1' } };
    const res = mkRes();
    mockChatFindAll.mockResolvedValue([]);
    await listMessages(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('parent denied access to another parent conversation', async () => {
    const req = { user: { id: 'p1', role: 'parent' }, query: { conversationId: 'parent:OTHER' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('government has access to any conversation', async () => {
    const req = { user: { id: 'g1', role: 'government' }, query: { conversationId: 'parent:any' } };
    const res = mkRes();
    mockChatFindAll.mockResolvedValue([]);
    await listMessages(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('admin has access to any conversation', async () => {
    const req = { user: { id: 'a1', role: 'admin' }, query: { conversationId: 'parent:any' } };
    const res = mkRes();
    mockChatFindAll.mockResolvedValue([]);
    await listMessages(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('teacher denied when service returns no parent IDs', async () => {
    mockGetTeacherParentIds.mockResolvedValue([]);
    const req = { user: { id: 't1', role: 'teacher' }, query: { conversationId: 'parent:p1' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('teacher allowed when service includes parent in accessible list', async () => {
    mockGetTeacherParentIds.mockResolvedValue(['p1', 'p2']);
    mockChatFindAll.mockResolvedValue([]);
    const req = { user: { id: 't1', role: 'teacher' }, query: { conversationId: 'parent:p1' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('teacher denied when parent not in service result', async () => {
    mockGetTeacherParentIds.mockResolvedValue(['OTHER_PARENT']);
    const req = { user: { id: 't1', role: 'teacher' }, query: { conversationId: 'parent:p1' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('reception allowed when they created the parent', async () => {
    mockUserFindOne.mockResolvedValue({ id: 'p1', role: 'parent', createdBy: 'r1' });
    mockChatFindAll.mockResolvedValue([]);
    const req = { user: { id: 'r1', role: 'reception' }, query: { conversationId: 'parent:p1' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  it('reception denied when they did not create the parent', async () => {
    mockUserFindOne.mockResolvedValue(null);
    const req = { user: { id: 'r1', role: 'reception' }, query: { conversationId: 'parent:OTHER' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('business role denied (no chat access)', async () => {
    const req = { user: { id: 'b1', role: 'business' }, query: { conversationId: 'parent:p1' } };
    const res = mkRes();
    await listMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
  });
});
