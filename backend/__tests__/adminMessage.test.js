import { jest } from '@jest/globals';

const mockFindAll = jest.fn();

jest.unstable_mockModule('../models/GovernmentMessage.js', () => ({
  default: { findAll: mockFindAll },
}));
jest.unstable_mockModule('../utils/logger.js', () => ({
  default: { error: jest.fn(), info: jest.fn(), warn: jest.fn(), debug: jest.fn() },
}));

const { getMyMessages } = await import('../controllers/admin/adminMessageController.js');

const mkRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('admin/adminMessageController.getMyMessages', () => {
  beforeEach(() => jest.clearAllMocks());

  // D-04: the school that sent a message must receive the government's reply.
  // Replies are child rows (parentMessageId), so this query must be top-level-only
  // and must eager-load `replies`. Before the fix it returned bare parent rows and
  // the school's inbox showed "Kutilmoqda" forever.
  it('scopes to senderId, top-level only, and eager-loads replies', async () => {
    mockFindAll.mockResolvedValue([{ toJSON: () => ({ id: 'm1' }) }]);
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    const opts = mockFindAll.mock.calls[0][0];
    expect(opts.where).toEqual({ senderId: 'a1', parentMessageId: null });
    expect(opts.include.some(i => i.as === 'replies')).toBe(true);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      success: true,
      data: [{ id: 'm1' }],
    }));
  });

  it('500 on DB error', async () => {
    mockFindAll.mockRejectedValue(new Error('boom'));
    const req = { user: { id: 'a1' } };
    const res = mkRes();
    await getMyMessages(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
