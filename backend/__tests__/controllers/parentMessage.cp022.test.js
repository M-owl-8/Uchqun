/**
 * CP-022 behavioral tests — parentSendMessage controller.
 * Isolation axes covered:
 *   1. Role restriction: non-parent → 403 MESSAGE_SEND_FORBIDDEN
 *   2. recipientLevel missing → 400 MESSAGE_RECIPIENT_LEVEL_INVALID
 *   3. recipientLevel invalid → 400 MESSAGE_RECIPIENT_LEVEL_INVALID
 *   4. escalatedFromId not found → 400 MESSAGE_ESCALATE_NOT_FOUND
 *   5. escalatedFromId owned by another user → 403 MESSAGE_ESCALATE_NOT_OWN
 *   6. escalatedFromId owned by this parent → 201 with escalatedFromId set
 *   7. republic-level send: creates with recipientLevel='republic'
 *   8. region-level send: creates with recipientLevel='region'
 *   9. owner-level send: creates with recipientLevel='owner'
 *  10. getAllMessages level=region filter: passes recipientLevel='region' to WHERE
 *  11. getAllMessages no level: backward-compatible (no recipientLevel in WHERE)
 *  12. getAllMessages invalid level: 400 MESSAGE_RECIPIENT_LEVEL_INVALID
 */

import { jest } from '@jest/globals';

const mockMsgCreate = jest.fn();
const mockMsgFindByPk = jest.fn();
const mockMsgFindAll = jest.fn();
const mockMsgFindAndCountAll = jest.fn();
const mockUserFindAll = jest.fn();
const mockSchoolFindAll = jest.fn();

jest.unstable_mockModule('../../models/GovernmentMessage.js', () => ({
  default: {
    create: mockMsgCreate,
    findByPk: mockMsgFindByPk,
    findAll: mockMsgFindAll,
    findAndCountAll: mockMsgFindAndCountAll,
  },
}));
jest.unstable_mockModule('../../models/User.js', () => ({
  default: { findAll: mockUserFindAll, findByPk: jest.fn() },
}));
jest.unstable_mockModule('../../models/School.js', () => ({
  default: { findAll: mockSchoolFindAll },
}));
jest.unstable_mockModule('../../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));
jest.unstable_mockModule('../../utils/pagination.js', () => ({
  parsePagination: jest.fn().mockReturnValue({ limit: 20, offset: 0 }),
}));

const { parentSendMessage, getMyMessages } = await import('../../controllers/parent/parentMessageController.js');
const { getAllMessages } = await import('../../controllers/governmentMessageController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

const PARENT_ID = 'parent-uuid-0001';
const OTHER_PARENT_ID = 'parent-uuid-0002';
const MSG_ID = 'msg-uuid-0001';

const parentUser = { id: PARENT_ID, role: 'parent', schoolId: 'school-uuid-01' };

const validBody = {
  subject: 'Test subject',
  message: 'Test message body',
  recipientLevel: 'republic',
};

describe('parentSendMessage — CP-022 behavioral tests', () => {
  beforeEach(() => jest.clearAllMocks());

  it('403 when role is not parent', async () => {
    const req = { user: { id: PARENT_ID, role: 'admin' }, body: validBody };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_SEND_FORBIDDEN');
    expect(mockMsgCreate).not.toHaveBeenCalled();
  });

  it('400 when recipientLevel is missing', async () => {
    const req = { user: parentUser, body: { subject: 'S', message: 'M' } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_RECIPIENT_LEVEL_INVALID');
  });

  it('400 when recipientLevel is invalid', async () => {
    const req = { user: parentUser, body: { ...validBody, recipientLevel: 'district' } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_RECIPIENT_LEVEL_INVALID');
  });

  it('400 when escalatedFromId not found in DB', async () => {
    mockMsgFindByPk.mockResolvedValue(null);
    const req = { user: parentUser, body: { ...validBody, escalatedFromId: MSG_ID } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_ESCALATE_NOT_FOUND');
    expect(mockMsgCreate).not.toHaveBeenCalled();
  });

  it('403 when escalatedFromId belongs to another user', async () => {
    mockMsgFindByPk.mockResolvedValue({ id: MSG_ID, senderId: OTHER_PARENT_ID });
    const req = { user: parentUser, body: { ...validBody, escalatedFromId: MSG_ID } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_ESCALATE_NOT_OWN');
    expect(mockMsgCreate).not.toHaveBeenCalled();
  });

  it('201 when escalatedFromId belongs to this parent — creates with escalation chain', async () => {
    mockMsgFindByPk.mockResolvedValue({ id: MSG_ID, senderId: PARENT_ID });
    const created = { id: 'new-msg', toJSON: () => ({ id: 'new-msg', recipientLevel: 'region', escalatedFromId: MSG_ID }) };
    mockMsgCreate.mockResolvedValue(created);
    const req = { user: parentUser, body: { ...validBody, recipientLevel: 'region', escalatedFromId: MSG_ID } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockMsgCreate).toHaveBeenCalledWith(expect.objectContaining({
      recipientLevel: 'region',
      escalatedFromId: MSG_ID,
      senderId: PARENT_ID,
    }));
  });

  it('201 republic-level send: creates with recipientLevel=republic', async () => {
    const created = { id: 'msg-r', toJSON: () => ({ recipientLevel: 'republic' }) };
    mockMsgCreate.mockResolvedValue(created);
    const req = { user: parentUser, body: validBody };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockMsgCreate).toHaveBeenCalledWith(expect.objectContaining({
      recipientLevel: 'republic',
      escalatedFromId: null,
    }));
  });

  it('201 region-level send: creates with recipientLevel=region', async () => {
    const created = { id: 'msg-rg', toJSON: () => ({ recipientLevel: 'region' }) };
    mockMsgCreate.mockResolvedValue(created);
    const req = { user: parentUser, body: { ...validBody, recipientLevel: 'region' } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockMsgCreate).toHaveBeenCalledWith(expect.objectContaining({ recipientLevel: 'region' }));
  });

  it('201 owner-level send: creates with recipientLevel=owner', async () => {
    const created = { id: 'msg-ow', toJSON: () => ({ recipientLevel: 'owner' }) };
    mockMsgCreate.mockResolvedValue(created);
    const req = { user: parentUser, body: { ...validBody, recipientLevel: 'owner' } };
    const res = mkRes();
    await parentSendMessage(req, res);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(mockMsgCreate).toHaveBeenCalledWith(expect.objectContaining({ recipientLevel: 'owner' }));
  });
});

describe('getAllMessages level filter — CP-022 additive filter', () => {
  const govReq = (level) => ({
    query: { level },
    isGlobalAccess: true,
    regionScope: null,
    user: { id: 'gov-user' },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockMsgFindAndCountAll.mockResolvedValue({ count: 0, rows: [] });
  });

  it('no level param: no recipientLevel in WHERE (backward-compatible)', async () => {
    const req = govReq(undefined);
    const res = mkRes();
    await getAllMessages(req, res);
    const [call] = mockMsgFindAndCountAll.mock.calls;
    expect(call[0].where).not.toHaveProperty('recipientLevel');
  });

  it('level=region: adds recipientLevel=region to WHERE', async () => {
    const req = govReq('region');
    const res = mkRes();
    await getAllMessages(req, res);
    const [call] = mockMsgFindAndCountAll.mock.calls;
    expect(call[0].where.recipientLevel).toBe('region');
  });

  it('level=owner: adds recipientLevel=owner to WHERE', async () => {
    const req = govReq('owner');
    const res = mkRes();
    await getAllMessages(req, res);
    const [call] = mockMsgFindAndCountAll.mock.calls;
    expect(call[0].where.recipientLevel).toBe('owner');
  });

  it('400 when level param is invalid', async () => {
    const req = govReq('district');
    const res = mkRes();
    await getAllMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json.mock.calls[0][0].error.code).toBe('MESSAGE_RECIPIENT_LEVEL_INVALID');
    expect(mockMsgFindAndCountAll).not.toHaveBeenCalled();
  });
});
